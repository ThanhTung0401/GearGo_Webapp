using System.Security.Claims;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Helpers;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Lấy MaTaiKhoan từ JWT. MaTaiKhoan khác MaNhanVien/MaKhachHang.</summary>
    public static long LayMaTaiKhoan(this ClaimsPrincipal user)
    {
        var raw = user.FindFirst("MaTaiKhoan")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!long.TryParse(raw, out var ma))
            throw new KhongCoQuyenException("Không xác định được tài khoản đăng nhập.");
        return ma;
    }
}

/// <summary>
/// Kiểm tra trạng thái/quyền HIỆN TẠI trong database, không tin vai trò trong JWT cũ.
/// </summary>
public static class ActorGuard
{
    public static async Task<TaiKhoan> LayTaiKhoanHoatDongAsync(ApplicationDbContext ctx, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await ctx.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == maTaiKhoan, ct)
                 ?? throw new KhongCoQuyenException("Tài khoản không tồn tại.");
        if (tk.TrangThai != "HoatDong")
            throw new TaiKhoanBiKhoaException("Tài khoản đang bị khóa.");
        return tk;
    }

    public static async Task<long> LayMaKhachHangAsync(ApplicationDbContext ctx, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await LayTaiKhoanHoatDongAsync(ctx, maTaiKhoan, ct);
        if (tk.VaiTro != "KhachHang")
            throw new KhongCoQuyenException("Chỉ khách hàng được dùng chức năng này.");
        var ma = await ctx.KhachHangs.Where(k => k.MaTaiKhoan == maTaiKhoan)
            .Select(k => (long?)k.MaKhachHang).FirstOrDefaultAsync(ct);
        return ma ?? throw new KhongCoQuyenException("Tài khoản chưa có hồ sơ khách hàng.");
    }

    /// <summary>Nhân viên/quản trị viên đang hoạt động; nếu có hồ sơ NHAN_VIEN thì phải còn đang làm việc.</summary>
    public static async Task EnsureVanHanhAsync(ApplicationDbContext ctx, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await LayTaiKhoanHoatDongAsync(ctx, maTaiKhoan, ct);
        if (tk.VaiTro != "NhanVien" && tk.VaiTro != "QuanTriVien")
            throw new KhongCoQuyenException("Chỉ nhân viên hoặc quản trị viên được dùng chức năng này.");
        var nv = await ctx.NhanViens.Where(n => n.MaTaiKhoan == maTaiKhoan)
            .Select(n => n.TrangThaiLamViec).FirstOrDefaultAsync(ct);
        if (nv != null && nv != "DangLamViec")
            throw new KhongCoQuyenException("Nhân viên đã ngừng làm việc.");
    }

    /// <summary>Chỉ quản trị viên đang hoạt động (kiểm tra vai trò hiện tại trong database).</summary>
    public static async Task<TaiKhoan> EnsureQuanTriVienAsync(ApplicationDbContext ctx, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await LayTaiKhoanHoatDongAsync(ctx, maTaiKhoan, ct);
        if (tk.VaiTro != "QuanTriVien")
            throw new KhongCoQuyenException("Chỉ quản trị viên được dùng chức năng này.");
        return tk;
    }

    /// <summary>
    /// MaNhanVien cho các FK chứng từ (vd. HOAN_TIEN.ma_nguoi_xu_ly, PHAN_CONG.ma_nguoi_huy_phan_cong).
    /// Quản trị viên chưa có hồ sơ NHAN_VIEN trả null; lịch sử vẫn ghi MaTaiKhoan.
    /// </summary>
    public static Task<long?> LayMaNhanVienAsync(ApplicationDbContext ctx, long maTaiKhoan, CancellationToken ct = default)
        => ctx.NhanViens.Where(n => n.MaTaiKhoan == maTaiKhoan)
            .Select(n => (long?)n.MaNhanVien).FirstOrDefaultAsync(ct);

    /// <summary>
    /// Lấy thông tin nhân viên theo MaTaiKhoan hoặc MaNhanVien (hỗ trợ linh hoạt cả 2 định dạng id)
    /// </summary>
    public static async Task<NhanVien?> LayNhanVienAsync(this ApplicationDbContext ctx, long actorId, CancellationToken ct = default)
    {
        return await ctx.NhanViens
            .FirstOrDefaultAsync(n => n.MaTaiKhoan == actorId || n.MaNhanVien == actorId, ct);
    }
}
