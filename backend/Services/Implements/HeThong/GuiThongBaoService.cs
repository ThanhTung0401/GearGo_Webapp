using GearGo.Data;
using GearGo.Helpers;
using GearGo.Integrations.Notifications;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.HeThong;

/// <summary>
/// Triển khai dịch vụ hàng chờ gửi thông báo và thử lại.
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

        var pendingIds = await _context.ThongBaos
            .Where(t => t.KenhGui == "Email" && t.SoLanThuGui < SoLanThuToiDa &&
                        (t.TrangThaiGui == "ChuaGui" || (t.TrangThaiGui == "DangXuLy" && t.ThoiDiemTao < timeoutRecovery)))
            .OrderBy(t => t.ThoiDiemTao)
            .Take(batchSize)
            .Select(t => t.MaThongBao)
            .ToListAsync(ct);

        if (pendingIds.Count == 0) return 0;

        // Claim nguyên tử bằng ExecuteUpdateAsync để chống 2 worker nhận trùng 1 bản ghi
        await _context.ThongBaos
            .Where(t => pendingIds.Contains(t.MaThongBao))
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.TrangThaiGui, "DangXuLy"), ct);

        var danhSachGui = await _context.ThongBaos
            .Include(t => t.TaiKhoan).Include(t => t.DonThue)
            .Where(t => pendingIds.Contains(t.MaThongBao))
            .ToListAsync(ct);

        int thanhCongCount = 0;
        foreach (var tb in danhSachGui)
        {
            if (await XuLyMotThongBaoAsync(tb, ct))
                thanhCongCount++;
        }

        await _context.SaveChangesAsync(ct);
        return thanhCongCount;
    }

    private async Task<bool> XuLyMotThongBaoAsync(ThongBao tb, CancellationToken ct)
    {
        var emailNhan = tb.DonThue?.EmailLienHe ?? tb.TaiKhoan?.Email;
        if (string.IsNullOrWhiteSpace(emailNhan))
        {
            tb.TrangThaiGui = "LoiGui";
            tb.LoiGuiGanNhat = "Không tìm thấy địa chỉ email người nhận.";
            tb.SoLanThuGui++;
            return false;
        }

        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = tb.MaTaiKhoan, HanhDong = "THU_GUI_EMAIL", LoaiDoiTuong = "THONG_BAO",
            MaDoiTuong = tb.MaThongBao.ToString(), LyDo = $"Lần thử {tb.SoLanThuGui + 1}/{SoLanThuToiDa}",
            ThoiDiem = DateTime.UtcNow
        });

        var ketQua = await _emailAdapter.GuiEmailAsync(
            emailNhan, tb.TieuDe ?? "Thông báo từ GearGo", tb.NoiDung ?? "", tb.MaSuKien, ct);

        if (ketQua.ThanhCong)
        {
            tb.TrangThaiGui = "DaGui";
            tb.ThoiDiemGui = DateTime.UtcNow;
            tb.LoiGuiGanNhat = null;
            return true;
        }

        tb.SoLanThuGui++;
        tb.LoiGuiGanNhat = ketQua.ThongDiepLoi ?? "Gửi email thất bại";
        tb.TrangThaiGui = tb.SoLanThuGui >= SoLanThuToiDa ? "LoiGui" : "ChuaGui";
        _logger.LogWarning("[GuiThongBaoService] Gửi email tb#{Id} thất bại: {Loi}", tb.MaThongBao, tb.LoiGuiGanNhat);
        return false;
    }

    public async Task<Result<ThongBaoAdminResponse>> ThuLaiAsync(long maThongBao, ThuLaiThongBaoRequest request, long maTaiKhoanAdmin, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoanAdmin, ct);

        var tb = await _context.ThongBaos.FirstOrDefaultAsync(t => t.MaThongBao == maThongBao, ct);
        if (tb == null) return Result<ThongBaoAdminResponse>.Loi("THONG_BAO_NOT_FOUND", "Thông báo không tồn tại.");
        if (tb.TrangThaiGui == "DangXuLy")
            return Result<ThongBaoAdminResponse>.Loi("THONG_BAO_DANG_XU_LY", "Thông báo đang được worker xử lý gửi, không thể kích hoạt lại.");

        tb.TrangThaiGui = "ChuaGui";
        tb.LoiGuiGanNhat = $"Quản trị viên yêu cầu thử lại: {request?.LyDo ?? "Thử lại thủ công"}";
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoanAdmin, HanhDong = "THU_LAI_THONG_BAO", LoaiDoiTuong = "THONG_BAO",
            MaDoiTuong = maThongBao.ToString(), LyDo = request?.LyDo, ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        return Result<ThongBaoAdminResponse>.Ok(MapToAdminResponse(tb));
    }

    public async Task<Result<PagedResult<ThongBaoAdminResponse>>> LayThongBaoGuiLoiAsync(int trang, int soMoiTrang, CancellationToken ct = default)
    {
        trang = trang < 1 ? 1 : trang;
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.ThongBaos.AsNoTracking()
            .Where(t => t.TrangThaiGui == "LoiGui" || t.SoLanThuGui >= SoLanThuToiDa)
            .OrderByDescending(t => t.ThoiDiemTao);

        var totalItems = await query.CountAsync(ct);
        var items = await query.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToListAsync(ct);

        return Result<PagedResult<ThongBaoAdminResponse>>.Ok(new PagedResult<ThongBaoAdminResponse>
        {
            Items = items.Select(MapToAdminResponse).ToList(),
            TotalItems = totalItems, CurrentPage = trang, PageSize = soMoiTrang
        });
    }

    private static ThongBaoAdminResponse MapToAdminResponse(ThongBao t) => new(
        t.MaThongBao, t.MaTaiKhoan, t.MaDonThue, t.MaSuKien, t.LoaiSuKien,
        t.TieuDe, t.NoiDung, t.KenhGui, t.TrangThaiGui, t.SoLanThuGui,
        t.ThoiDiemTao, t.ThoiDiemGui, t.LoiGuiGanNhat);
}
