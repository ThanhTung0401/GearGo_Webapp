using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Integrations.Notifications;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ hàng chờ gửi thông báo và thử lại (W5-T8)
/// </summary>
public class GuiThongBaoService : IGuiThongBaoService
{
    private const int SoLanThuToiDa = 5;
    private readonly ApplicationDbContext _context;
    private readonly IEmailNotificationAdapter _emailAdapter;
    private readonly ILogger<GuiThongBaoService> _logger;

    public GuiThongBaoService(
        ApplicationDbContext context,
        IEmailNotificationAdapter emailAdapter,
        ILogger<GuiThongBaoService> logger)
    {
        _context = context;
        _emailAdapter = emailAdapter;
        _logger = logger;
    }

    public async Task<int> XuLyHangChoAsync(int batchSize = 20, CancellationToken ct = default)
    {
        batchSize = Math.Clamp(batchSize, 1, 100);
        var timeoutRecovery = DateTime.UtcNow.AddMinutes(-10);

        // 1. Tìm các bản ghi kênh Email đang chờ gửi hoặc bị kẹt dở do server crash (ChuaGui hoặc DangXuLy quá 10 phút)
        var pendingIds = await _context.ThongBaos
            .Where(t => t.KenhGui == "Email" &&
                        t.SoLanThuGui < SoLanThuToiDa &&
                        (t.TrangThaiGui == "ChuaGui" || (t.TrangThaiGui == "DangXuLy" && t.ThoiDiemTao < timeoutRecovery)))
            .OrderBy(t => t.ThoiDiemTao)
            .Take(batchSize)
            .Select(t => t.MaThongBao)
            .ToListAsync(ct);

        if (pendingIds.Count == 0) return 0;

        // 2. Claim nguyên tử bằng ExecuteUpdateAsync để chống 2 worker nhận trùng 1 bản ghi
        await _context.ThongBaos
            .Where(t => pendingIds.Contains(t.MaThongBao))
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.TrangThaiGui, "DangXuLy"), ct);

        // 3. Tải các bản ghi đã claim kèm tài khoản và đơn thuê để lấy địa chỉ email
        var danhSachGui = await _context.ThongBaos
            .Include(t => t.TaiKhoan)
            .Include(t => t.DonThue)
            .Where(t => pendingIds.Contains(t.MaThongBao))
            .ToListAsync(ct);

        int thanhCongCount = 0;

        foreach (var tb in danhSachGui)
        {
            // Lấy email: ưu tiên thông tin liên hệ của đơn thuê, fallback sang email của tài khoản
            var emailNhan = tb.DonThue?.EmailLienHe ?? tb.TaiKhoan?.Email;

            if (string.IsNullOrWhiteSpace(emailNhan))
            {
                tb.TrangThaiGui = "LoiGui";
                tb.LoiGuiGanNhat = "Không tìm thấy địa chỉ email người nhận.";
                tb.SoLanThuGui++;
                continue;
            }

            // Ghi audit log bắt đầu lần thử gửi vào nhật ký
            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = tb.MaTaiKhoan,
                HanhDong = "THU_GUI_EMAIL",
                LoaiDoiTuong = "THONG_BAO",
                MaDoiTuong = tb.MaThongBao.ToString(),
                LyDo = $"Lần thử {tb.SoLanThuGui + 1}/{SoLanThuToiDa}",
                ThoiDiem = DateTime.UtcNow
            });

            // Gọi Email Adapter ngoài (độc lập mạng, không giữ transaction SQL)
            var ketQua = await _emailAdapter.GuiEmailAsync(
                emailNhan, 
                tb.TieuDe ?? "Thông báo từ GearGo", 
                tb.NoiDung ?? "", 
                tb.MaSuKien, 
                ct);

            if (ketQua.ThanhCong)
            {
                tb.TrangThaiGui = "DaGui";
                tb.ThoiDiemGui = DateTime.UtcNow;
                tb.LoiGuiGanNhat = null;
                thanhCongCount++;
            }
            else
            {
                tb.SoLanThuGui++;
                tb.LoiGuiGanNhat = ketQua.ThongDiepLoi ?? "Gửi email thất bại";
                tb.TrangThaiGui = tb.SoLanThuGui >= SoLanThuToiDa ? "LoiGui" : "ChuaGui";
                _logger.LogWarning("[GuiThongBaoService] Gửi email tb#{Id} thất bại: {Loi}", tb.MaThongBao, tb.LoiGuiGanNhat);
            }
        }

        await _context.SaveChangesAsync(ct);
        return thanhCongCount;
    }

    public async Task<Result<ThongBaoAdminResponse>> ThuLaiAsync(long maThongBao, ThuLaiThongBaoRequest request, long maTaiKhoanAdmin, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoanAdmin, ct);

        var tb = await _context.ThongBaos.FirstOrDefaultAsync(t => t.MaThongBao == maThongBao, ct);
        if (tb == null)
        {
            return Result<ThongBaoAdminResponse>.Loi("THONG_BAO_NOT_FOUND", "Thông báo không tồn tại.");
        }

        if (tb.TrangThaiGui == "DangXuLy")
        {
            return Result<ThongBaoAdminResponse>.Loi("THONG_BAO_DANG_XU_LY", "Thông báo đang được worker xử lý gửi, không thể kích hoạt lại.");
        }

        // Đặt lại trạng thái để worker tiếp nhận trong chu kỳ tới
        tb.TrangThaiGui = "ChuaGui";
        tb.LoiGuiGanNhat = $"Quản trị viên yêu cầu thử lại: {request?.LyDo ?? "Thử lại thủ công"}";

        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoanAdmin,
            HanhDong = "THU_LAI_THONG_BAO",
            LoaiDoiTuong = "THONG_BAO",
            MaDoiTuong = maThongBao.ToString(),
            LyDo = request?.LyDo,
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);

        var res = MapToAdminResponse(tb);
        return Result<ThongBaoAdminResponse>.Ok(res);
    }

    public async Task<Result<PagedResult<ThongBaoAdminResponse>>> LayThongBaoGuiLoiAsync(int trang, int soMoiTrang, CancellationToken ct = default)
    {
        trang = trang < 1 ? 1 : trang;
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.ThongBaos
            .AsNoTracking()
            .Where(t => t.TrangThaiGui == "LoiGui" || t.SoLanThuGui >= SoLanThuToiDa)
            .OrderByDescending(t => t.ThoiDiemTao);

        var totalItems = await query.CountAsync(ct);
        var items = await query
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .ToListAsync(ct);

        var resItems = items.Select(MapToAdminResponse).ToList();

        return Result<PagedResult<ThongBaoAdminResponse>>.Ok(new PagedResult<ThongBaoAdminResponse>
        {
            Items = resItems,
            TotalItems = totalItems,
            CurrentPage = trang,
            PageSize = soMoiTrang
        });
    }

    private static ThongBaoAdminResponse MapToAdminResponse(ThongBao t)
    {
        return new ThongBaoAdminResponse(
            t.MaThongBao,
            t.MaTaiKhoan,
            t.MaDonThue,
            t.MaSuKien,
            t.LoaiSuKien,
            t.TieuDe,
            t.NoiDung,
            t.KenhGui,
            t.TrangThaiGui,
            t.SoLanThuGui,
            t.ThoiDiemTao,
            t.ThoiDiemGui,
            t.LoiGuiGanNhat
        );
    }
}
