using System.Security.Claims;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Common;
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
/// Tập trung toàn bộ các helper xác thực/tra cứu tác nhân (throwing guards và Result&lt;NhanVien&gt; extensions).
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
    /// Lấy hồ sơ nhân viên đang làm việc theo MaTaiKhoan; ném KhongCoQuyenException nếu chưa liên kết hoặc đã nghỉ việc.
    /// Dùng chung cho các service ném exception nghiệp vụ (ChuanBiDonService, PhieuNhapService).
    /// </summary>
    public static async Task<NhanVien> LayNhanVienDangLamViecAsync(
        ApplicationDbContext ctx, long maTaiKhoan, CancellationToken ct = default)
    {
        return await ctx.NhanViens
            .FirstOrDefaultAsync(nv => nv.MaTaiKhoan == maTaiKhoan && nv.TrangThaiLamViec == DomainConstants.StaffStatus.Working, ct)
            ?? throw new KhongCoQuyenException("Tài khoản không liên kết với nhân viên đang làm việc.");
    }

    /// <summary>
    /// Lấy thông tin nhân viên theo MaTaiKhoan hoặc MaNhanVien (hỗ trợ linh hoạt cả 2 định dạng id).
    /// </summary>
    public static Task<NhanVien?> LayNhanVienAsync(this ApplicationDbContext ctx, long actorId, CancellationToken ct = default)
        => TimNhanVienTheoActorIdAsync(ctx, actorId, kemTaiKhoan: false, ct);

    /// <summary>
    /// Kiểm tra và lấy thông tin nhân viên theo Actor ID dưới dạng Result&lt;NhanVien&gt;.
    /// Nếu không tìm thấy, trả về lỗi chuẩn NHAN_VIEN_NOT_FOUND.
    /// </summary>
    public static async Task<Result<NhanVien>> LayNhanVienHopLeAsync(
        this ApplicationDbContext context, long actorId, CancellationToken ct = default)
    {
        var nhanVien = await context.LayNhanVienAsync(actorId, ct);
        if (nhanVien == null)
        {
            return Result<NhanVien>.Loi(
                DomainConstants.Errors.StaffNotFound,
                "Không tìm thấy thông tin nhân viên thao tác.");
        }
        return Result<NhanVien>.Ok(nhanVien);
    }

    /// <summary>
    /// Kiểm tra và lấy nhân viên hợp lệ (còn làm việc và tài khoản còn hoạt động) dưới dạng Result&lt;NhanVien&gt;.
    /// </summary>
    public static async Task<Result<NhanVien>> LayNhanVienDangHoatDongAsync(
        this ApplicationDbContext context, long actorId, CancellationToken ct = default)
    {
        var nv = await TimNhanVienTheoActorIdAsync(context, actorId, kemTaiKhoan: true, ct);
        if (nv == null)
        {
            return Result<NhanVien>.Loi(
                DomainConstants.Errors.StaffNotFound,
                "Không tìm thấy hồ sơ nhân viên thực hiện.");
        }

        if (nv.TrangThaiLamViec != DomainConstants.StaffStatus.Working ||
            (nv.TaiKhoan != null && nv.TaiKhoan.TrangThai != DomainConstants.AccountStatus.Active))
        {
            return Result<NhanVien>.Loi(
                DomainConstants.Errors.StaffResigned,
                "Nhân viên đã nghỉ việc hoặc tài khoản đã bị tạm khóa.");
        }

        return Result<NhanVien>.Ok(nv);
    }

    // Truy vấn ưu tiên theo MaTaiKhoan (từ JWT) trước, chỉ fallback sang MaNhanVien để tránh khớp nhầm nhân viên khác (IDOR).
    private static async Task<NhanVien?> TimNhanVienTheoActorIdAsync(
        ApplicationDbContext ctx, long actorId, bool kemTaiKhoan, CancellationToken ct)
    {
        IQueryable<NhanVien> query = ctx.NhanViens;
        if (kemTaiKhoan)
            query = query.Include(n => n.TaiKhoan);

        return await query.FirstOrDefaultAsync(n => n.MaTaiKhoan == actorId, ct)
               ?? await query.FirstOrDefaultAsync(n => n.MaNhanVien == actorId, ct);
    }
}
