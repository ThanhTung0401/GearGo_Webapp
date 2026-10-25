using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class QuanTriTaiKhoanService : IQuanTriTaiKhoanService
{
    private readonly ApplicationDbContext _context;
    private readonly ILichSuNghiepVuService _lichSu;

    public QuanTriTaiKhoanService(ApplicationDbContext context, ILichSuNghiepVuService lichSu)
    {
        _context = context;
        _lichSu = lichSu;
    }

    public async Task<Result<PhanTrangResponse<TaiKhoanResponse>>> TimTaiKhoanAsync(
        TimTaiKhoanRequest request, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);

        var trang = Math.Max(1, request.Trang);
        var soMoiTrang = request.SoMoiTrang <= 0
            ? DomainConstants.Policies.DefaultPageSize
            : Math.Min(request.SoMoiTrang, DomainConstants.Policies.MaxPageSize);

        var query = _context.TaiKhoans.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(request.VaiTro)) query = query.Where(t => t.VaiTro == request.VaiTro);
        if (!string.IsNullOrWhiteSpace(request.TrangThai)) query = query.Where(t => t.TrangThai == request.TrangThai);
        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            var kw = request.TuKhoa.Trim();
            query = query.Where(t =>
                (t.Email != null && t.Email.Contains(kw)) ||
                (t.SoDienThoai != null && t.SoDienThoai.Contains(kw)) ||
                (t.NhanVien != null && t.NhanVien.HoTen != null && t.NhanVien.HoTen.Contains(kw)) ||
                (t.KhachHang != null && t.KhachHang.HoTen != null && t.KhachHang.HoTen.Contains(kw)));
        }

        var tongSo = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(t => t.MaTaiKhoan)
            .Skip((trang - 1) * soMoiTrang).Take(soMoiTrang)
            .Select(t => new TaiKhoanResponse(
                t.MaTaiKhoan, t.Email, t.SoDienThoai, t.VaiTro, t.TrangThai, t.LyDoKhoa,
                t.NhanVien != null ? t.NhanVien.HoTen : t.KhachHang != null ? t.KhachHang.HoTen : null,
                t.NhanVien != null ? t.NhanVien.MaNhanVien : (long?)null,
                t.KhachHang != null ? t.KhachHang.MaKhachHang : (long?)null,
                t.NgayTao, t.NgayCapNhat))
            .ToListAsync(ct);

        return Result<PhanTrangResponse<TaiKhoanResponse>>.Ok(new(rows, tongSo, trang, soMoiTrang));
    }

    public async Task<Result<TaiKhoanResponse>> LayTaiKhoanAsync(long maTaiKhoan, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);
        var tk = await TaiTaiKhoanAsync(maTaiKhoan, tracking: false, ct);
        return tk == null ? KhongThay() : Result<TaiKhoanResponse>.Ok(Map(tk));
    }

    public Task<Result<TaiKhoanResponse>> KhoaTaiKhoanAsync(
        long maTaiKhoan, KhoaTaiKhoanRequest request, long actorId, CancellationToken ct = default)
        => DoiTrangThaiAsync(maTaiKhoan, request.LyDo, khoa: true, actorId, ct);

    public Task<Result<TaiKhoanResponse>> MoKhoaTaiKhoanAsync(
        long maTaiKhoan, MoKhoaTaiKhoanRequest request, long actorId, CancellationToken ct = default)
        => DoiTrangThaiAsync(maTaiKhoan, request.LyDo, khoa: false, actorId, ct);

    private async Task<Result<TaiKhoanResponse>> DoiTrangThaiAsync(
        long maTaiKhoan, string? lyDoRaw, bool khoa, long actorId, CancellationToken ct)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);

        var lyDo = lyDoRaw?.Trim() ?? "";
        if (lyDo.Length == 0 || lyDo.Length > 1000)
            return Result<TaiKhoanResponse>.Loi(DomainConstants.Errors.InvalidData,
                "Lý do bắt buộc, tối đa 1000 ký tự.");

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        await QuanTriNhanSuHelper.KhoaNhomQuanTriAsync(_context, ct);

        var tk = await TaiTaiKhoanAsync(maTaiKhoan, tracking: true, ct);
        if (tk == null) return KhongThay();

        var truoc = new { tk.VaiTro, tk.TrangThai, tk.LyDoKhoa };

        if (khoa)
        {
            if (tk.TrangThai == DomainConstants.AccountStatus.Locked)
                return Result<TaiKhoanResponse>.Loi(DomainConstants.Errors.InvalidState, "Tài khoản đã bị khóa.");

            if (QuanTriNhanSuHelper.LaQuanTriHoatDong(tk, tk.NhanVien)
                && await QuanTriNhanSuHelper.DemQuanTriHoatDongKhacAsync(_context, tk.MaTaiKhoan, ct) == 0)
                return Result<TaiKhoanResponse>.Loi(DomainConstants.Errors.LastActiveAdmin,
                    "Không thể khóa quản trị viên hoạt động cuối cùng.");

            tk.TrangThai = DomainConstants.AccountStatus.Locked;
            tk.LyDoKhoa = lyDo;
        }
        else
        {
            if (tk.TrangThai != DomainConstants.AccountStatus.Locked)
                return Result<TaiKhoanResponse>.Loi(DomainConstants.Errors.InvalidState, "Tài khoản không bị khóa.");

            // Không tự mở quyền cho người đã nghỉ việc.
            if (tk.NhanVien?.TrangThaiLamViec == DomainConstants.StaffStatus.Resigned)
                return Result<TaiKhoanResponse>.Loi(DomainConstants.Errors.StaffResigned,
                    "Nhân viên đã nghỉ việc; không thể mở khóa tài khoản.");

            tk.TrangThai = DomainConstants.AccountStatus.Active;
            tk.LyDoKhoa = null;
        }

        tk.NgayCapNhat = DateTime.UtcNow;
        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            actorId, khoa ? "KHOA_TAI_KHOAN" : "MO_KHOA_TAI_KHOAN", "TAI_KHOAN", tk.MaTaiKhoan.ToString(),
            truoc, new { tk.VaiTro, tk.TrangThai, tk.LyDoKhoa }, lyDo));

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Result<TaiKhoanResponse>.Ok(Map(tk));
    }

    private Task<TaiKhoan?> TaiTaiKhoanAsync(long maTaiKhoan, bool tracking, CancellationToken ct)
    {
        var q = _context.TaiKhoans.Include(t => t.NhanVien).Include(t => t.KhachHang).AsQueryable();
        if (!tracking) q = q.AsNoTracking();
        return q.FirstOrDefaultAsync(t => t.MaTaiKhoan == maTaiKhoan, ct);
    }

    private static Result<TaiKhoanResponse> KhongThay()
        => Result<TaiKhoanResponse>.Loi(DomainConstants.Errors.AccountNotFound, "Không tìm thấy tài khoản.");

    internal static TaiKhoanResponse Map(TaiKhoan t) => new(
        t.MaTaiKhoan, t.Email, t.SoDienThoai, t.VaiTro, t.TrangThai, t.LyDoKhoa,
        t.NhanVien?.HoTen ?? t.KhachHang?.HoTen, t.NhanVien?.MaNhanVien, t.KhachHang?.MaKhachHang,
        t.NgayTao, t.NgayCapNhat);
}
