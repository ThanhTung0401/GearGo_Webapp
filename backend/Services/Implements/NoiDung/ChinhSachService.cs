using System.Data;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChinhSach;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

/// <summary>
/// Dịch vụ quản lý chính sách theo phiên bản (bất biến; sửa sai bằng bản mới).
/// </summary>
public class ChinhSachService : IChinhSachService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ChinhSachService> _logger;

    public ChinhSachService(ApplicationDbContext context, ILogger<ChinhSachService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<PagedResult<ChinhSachResponse>>> LayDanhSachAsync(int trang = 1, int kichThuoc = 20, CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        kichThuoc = Math.Clamp(kichThuoc, 1, DomainConstants.Policies.MaxPageSize);

        var query = _context.ChinhSachs.AsNoTracking()
            .OrderByDescending(c => c.ThoiDiemApDung).ThenByDescending(c => c.PhienBan);

        var tong = await query.CountAsync(ct);
        var rows = await query.Skip((trang - 1) * kichThuoc).Take(kichThuoc).ToListAsync(ct);

        return Result<PagedResult<ChinhSachResponse>>.Ok(new PagedResult<ChinhSachResponse>
        {
            Items = DungMapList(rows, DateTime.UtcNow),
            TotalItems = tong,
            CurrentPage = trang,
            PageSize = kichThuoc
        });
    }

    public async Task<Result<ChinhSachResponse>> LayChiTietAsync(long maChinhSach, CancellationToken ct = default)
    {
        var cs = await _context.ChinhSachs.AsNoTracking().FirstOrDefaultAsync(c => c.MaChinhSach == maChinhSach, ct);
        if (cs == null)
            return Result<ChinhSachResponse>.Loi("CHINH_SACH_NOT_FOUND", "Không tìm thấy chính sách.");

        return Result<ChinhSachResponse>.Ok(MapResponse(cs, await SuyRaHieuLucAsync(cs, DateTime.UtcNow, ct)));
    }

    public async Task<Result<ChinhSachResponse>> LayDangHieuLucAsync(DateTime mocThoiGian, CancellationToken ct = default)
    {
        var cs = await _context.ChinhSachs.AsNoTracking()
            .Where(c => c.ThoiDiemApDung <= mocThoiGian)
            .OrderByDescending(c => c.ThoiDiemApDung).ThenByDescending(c => c.PhienBan)
            .FirstOrDefaultAsync(ct);

        return cs == null
            ? Result<ChinhSachResponse>.Loi("CHUA_CO_CHINH_SACH_HIEU_LUC", "Chưa có chính sách hiệu lực tại thời điểm yêu cầu.")
            : Result<ChinhSachResponse>.Ok(MapResponse(cs, HieuLucChinhSach.HienHanh));
    }

    public async Task<Result<KiemTraChinhSachResponse>> KiemTraNoiDungAsync(TaoChinhSachRequest request, long actor, CancellationToken ct = default)
    {
        // [POLICY-04]: Controller đã khóa bằng [RequirePermission(ChinhSach_Quan)] → không cần
        // chặn cứng VaiTro == "QuanTriVien" nữa; cho phép NhanVien có quyền ChinhSach_Quan thao tác.
        await ActorGuard.EnsureVanHanhAsync(_context, actor, ct);

        var loi = ChinhSachValidator.KiemTra(request.NoiDung);
        var res = new KiemTraChinhSachResponse { LoiTheoDuongDan = loi, HopLe = loi.Count == 0 };

        if (request.NoiDung.MocNhac is null or { Count: 0 })
            res.CanhBao.Add("Chưa cấu hình mốc nhắc; hệ thống sẽ không chủ động nhắc khách.");

        var selector = await LayDangHieuLucAsync(request.ThoiDiemApDung, ct);
        if (selector.ThanhCong && selector.DuLieu is not null)
        {
            res.BanDuKienDuocChon = new PhienBanDuKien
            {
                MaChinhSach = selector.DuLieu.MaChinhSach,
                PhienBan = selector.DuLieu.PhienBan,
                ThoiDiemApDung = selector.DuLieu.ThoiDiemApDung,
                TenChinhSach = selector.DuLieu.TenChinhSach
            };
        }
        return Result<KiemTraChinhSachResponse>.Ok(res);
    }

    public async Task<Result<ChinhSachResponse>> TaoPhienBanAsync(TaoChinhSachRequest request, long actor, CancellationToken ct = default)
    {
        // [POLICY-04]: xem ghi chú ở KiemTraNoiDungAsync.
        await ActorGuard.EnsureVanHanhAsync(_context, actor, ct);

        var loi = ChinhSachValidator.KiemTra(request.NoiDung);
        if (loi.Count > 0)
            return Result<ChinhSachResponse>.Loi("NOI_DUNG_CHINH_SACH_KHONG_HOP_LE", "Nội dung chính sách không hợp lệ.", loi);

        var now = DateTime.UtcNow;
        // [POLICY-01]: cho phép dung sai 5 phút để FE có thể "ban hành có hiệu lực ngay lập tức"
        // (không bị chặn do lệch mili-giây giữa clock FE và BE).
        if (request.ThoiDiemApDung < now.AddMinutes(-5))
            return Result<ChinhSachResponse>.Loi("THOI_DIEM_AP_DUNG_HOI_TO", "Thời điểm áp dụng không được lùi về quá khứ.");

        var maNhanVien = await ActorGuard.LayMaNhanVienAsync(_context, actor, ct);
        if (maNhanVien is null)
            return Result<ChinhSachResponse>.Loi(DomainConstants.Errors.Forbidden, "Quản trị viên chưa có hồ sơ nhân viên để làm người tạo chính sách.");

        var json = ChinhSachValidator.VietJson(request.NoiDung);
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var maxPhienBan = await _context.ChinhSachs.OrderByDescending(c => c.PhienBan).Select(c => (int?)c.PhienBan).FirstOrDefaultAsync(ct) ?? 0;
            var cs = new ChinhSach
            {
                MaNguoiTao = maNhanVien.Value, TenChinhSach = request.TenChinhSach.Trim(),
                PhienBan = maxPhienBan + 1, ThoiDiemApDung = request.ThoiDiemApDung,
                NoiDungChinhSach = json, NgayTao = now
            };
            _context.ChinhSachs.Add(cs);
            // [AUDIT-02]: save trước để sinh cs.MaChinhSach, rồi gán MaDoiTuong vào NhatKyThaoTac.
            // Trước đây MaDoiTuong rỗng khiến bảng Audit Log hiển thị "CHINH_SACH: -".
            await _context.SaveChangesAsync(ct);
            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = actor, HanhDong = "TaoChinhSach", LoaiDoiTuong = "CHINH_SACH",
                MaDoiTuong = cs.MaChinhSach.ToString(),
                DuLieuSau = json, ThoiDiem = now,
                LyDo = $"Tạo phiên bản {cs.PhienBan} có hiệu lực từ {request.ThoiDiemApDung:O}"
            });

            var hieuLuc = request.ThoiDiemApDung <= now ? HieuLucChinhSach.HienHanh : HieuLucChinhSach.TuongLai;
            return Result<ChinhSachResponse>.Ok(MapResponse(cs, hieuLuc));
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<ChinhSachCuaDonResponse>> LayChinhSachCuaDonAsync(long maDonThue, long actor, CancellationToken ct = default)
    {
        await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actor, ct);

        var don = await _context.DonThues.AsNoTracking()
            .Include(d => d.ChinhSach).Include(d => d.KhachHang)
            .FirstOrDefaultAsync(d => d.MaDonThue == maDonThue, ct);
        if (don == null)
            return Result<ChinhSachCuaDonResponse>.Loi(DomainConstants.Errors.OrderRentalNotFound, "Không tìm thấy đơn thuê.");

        var tk = await _context.TaiKhoans.AsNoTracking().FirstAsync(t => t.MaTaiKhoan == actor, ct);
        bool coQuyen = tk.VaiTro == "KhachHang"
            ? don.KhachHang?.MaTaiKhoan == actor
            : tk.VaiTro is "NhanVien" or "QuanTriVien";
        if (!coQuyen)
            return Result<ChinhSachCuaDonResponse>.Loi(DomainConstants.Errors.Forbidden, "Không có quyền xem chính sách của đơn này.");

        var cs = don.ChinhSach;
        var noiDung = ChinhSachValidator.DocJson(cs?.NoiDungChinhSach);
        return Result<ChinhSachCuaDonResponse>.Ok(new ChinhSachCuaDonResponse
        {
            MaDonThue = don.MaDonThue, MaChinhSach = cs?.MaChinhSach ?? don.MaChinhSach,
            PhienBan = cs?.PhienBan ?? 0, TenChinhSach = cs?.TenChinhSach,
            ThoiDiemApDung = cs?.ThoiDiemApDung ?? DateTime.MinValue,
            DieuKhoanChoKhach = new DieuKhoanChoKhachDto
            {
                ThoiGianGiuChoPhut = noiDung?.ThoiGianGiuChoPhut, HeSoTre = noiDung?.HeSoTre,
                TyLeCocPhanTram = noiDung?.TyLeCocPhanTram, HuyDon = noiDung?.HuyDon,
                KhongDenNhan = noiDung?.KhongDenNhan, MocNhac = noiDung?.MocNhac
            }
        });
    }

    private async Task<string> SuyRaHieuLucAsync(ChinhSach cs, DateTime now, CancellationToken ct)
    {
        if (cs.ThoiDiemApDung > now) return HieuLucChinhSach.TuongLai;
        var coThayThe = await _context.ChinhSachs.AsNoTracking().AnyAsync(c =>
            c.MaChinhSach != cs.MaChinhSach && c.ThoiDiemApDung <= now &&
            (c.ThoiDiemApDung > cs.ThoiDiemApDung || (c.ThoiDiemApDung == cs.ThoiDiemApDung && c.PhienBan > cs.PhienBan)), ct);
        return coThayThe ? HieuLucChinhSach.DaThayThe : HieuLucChinhSach.HienHanh;
    }

    private static List<ChinhSachResponse> DungMapList(List<ChinhSach> rows, DateTime now)
    {
        var hienHanh = rows.Where(c => c.ThoiDiemApDung <= now)
            .OrderByDescending(c => c.ThoiDiemApDung).ThenByDescending(c => c.PhienBan).FirstOrDefault();

        return rows.Select(c => MapResponse(c,
            c.ThoiDiemApDung > now ? HieuLucChinhSach.TuongLai
            : hienHanh != null && c.MaChinhSach == hienHanh.MaChinhSach ? HieuLucChinhSach.HienHanh
            : HieuLucChinhSach.DaThayThe)).ToList();
    }

    private static ChinhSachResponse MapResponse(ChinhSach cs, string hieuLuc) => new()
    {
        MaChinhSach = cs.MaChinhSach, PhienBan = cs.PhienBan, TenChinhSach = cs.TenChinhSach,
        ThoiDiemApDung = cs.ThoiDiemApDung, NgayTao = cs.NgayTao, MaNguoiTao = cs.MaNguoiTao,
        HieuLuc = hieuLuc, NoiDung = ChinhSachValidator.DocJson(cs.NoiDungChinhSach),
        NoiDungJsonGoc = cs.NoiDungChinhSach
    };
}
