using System.Text.RegularExpressions;
using GearGo.Data;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Helpers;

/// <summary>Quy tắc dùng chung của W5-T1: bảo vệ quản trị viên cuối, validation liên hệ, tổng hợp việc cần bàn giao.</summary>
internal static class QuanTriNhanSuHelper
{
    public static readonly Regex SoDienThoaiRegex = new(@"^(\+84|0)\d{9,10}$", RegexOptions.Compiled);
    public static readonly string[] VaiTroNhanSu = { "NhanVien", "QuanTriVien" };
    public static readonly string[] TrangThaiBaoTriMo =
    {
        DomainConstants.Status.PendingProcessing,
        DomainConstants.Status.InProgress,
        DomainConstants.Status.PendingInspection
    };

    /// <summary>
    /// Khóa (UPDLOCK, HOLDLOCK) toàn bộ nhóm quản trị viên trong transaction hiện tại để hai yêu cầu
    /// đồng thời không cùng làm mất hết quản trị viên. Provider khác SQL Server (test) dựa vào transaction.
    /// </summary>
    public static async Task KhoaNhomQuanTriAsync(ApplicationDbContext ctx, CancellationToken ct)
    {
        if (!ctx.Database.IsSqlServer()) return;
        await ctx.Database.ExecuteSqlRawAsync(
            "SELECT ma_tai_khoan FROM TAI_KHOAN WITH (UPDLOCK, HOLDLOCK) WHERE vai_tro = {0}",
            new object[] { "QuanTriVien" }, ct);
    }

    /// <summary>Số quản trị viên hoạt động (tài khoản hoạt động, hồ sơ nếu có còn đang làm việc), trừ tài khoản loại ra.</summary>
    public static Task<int> DemQuanTriHoatDongKhacAsync(ApplicationDbContext ctx, long loaiTru, CancellationToken ct)
        => ctx.TaiKhoans.CountAsync(t =>
            t.MaTaiKhoan != loaiTru
            && t.VaiTro == "QuanTriVien"
            && t.TrangThai == DomainConstants.AccountStatus.Active
            && (t.NhanVien == null || t.NhanVien.TrangThaiLamViec == DomainConstants.StaffStatus.Working), ct);

    public static bool LaQuanTriHoatDong(TaiKhoan tk, NhanVien? nv)
        => tk.VaiTro == "QuanTriVien"
           && tk.TrangThai == DomainConstants.AccountStatus.Active
           && (nv == null || nv.TrangThaiLamViec == DomainConstants.StaffStatus.Working);

    public static bool LaViPhamUnique(DbUpdateException ex)
        => ex.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true
           || ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true;

    /// <summary>Trả lỗi theo trường; rỗng nếu hợp lệ.</summary>
    public static Dictionary<string, string> KiemTraHoSo(
        string hoTen, string email, string sdt, string? diaChi, DateOnly? ngayVaoLam)
    {
        var loi = new Dictionary<string, string>();
        if (hoTen.Length == 0 || hoTen.Length > 255) loi["hoTen"] = "Họ tên bắt buộc, tối đa 255 ký tự.";
        if (email.Length == 0 || email.Length > 255 ||
            !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            loi["email"] = "Email không hợp lệ.";
        if (!SoDienThoaiRegex.IsMatch(sdt)) loi["soDienThoai"] = "Số điện thoại không hợp lệ.";
        if (diaChi != null && diaChi.Length > 1000) loi["diaChi"] = "Địa chỉ tối đa 1000 ký tự.";
        if (ngayVaoLam.HasValue)
        {
            var homNay = DateOnly.FromDateTime(DateTime.UtcNow);
            if (ngayVaoLam.Value < new DateOnly(2000, 1, 1) || ngayVaoLam.Value > homNay.AddDays(90))
                loi["ngayVaoLam"] = "Ngày vào làm không hợp lệ.";
        }
        return loi;
    }
}
