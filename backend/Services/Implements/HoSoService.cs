using System.Text.RegularExpressions;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.HoSo;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class HoSoService : IHoSoService
{
    private static readonly Regex SoDienThoaiRegex = new(@"^(\+84|0)\d{9,10}$", RegexOptions.Compiled);

    private readonly ApplicationDbContext _context;
    private readonly ILichSuNghiepVuService _lichSu;

    public HoSoService(ApplicationDbContext context, ILichSuNghiepVuService lichSu)
    {
        _context = context;
        _lichSu = lichSu;
    }

    public async Task<HoSoResponse> LayHoSoCuaToiAsync(long maTaiKhoan)
    {
        await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        var kh = await _context.KhachHangs.AsNoTracking().Include(k => k.TaiKhoan)
            .FirstAsync(k => k.MaTaiKhoan == maTaiKhoan);
        return Map(kh);
    }

    public async Task<HoSoResponse> CapNhatHoSoCuaToiAsync(CapNhatHoSoRequest request, long maTaiKhoan)
    {
        // Quy ước PUT thay thế toàn bộ: diaChi/ngaySinh/anhDaiDien null hoặc rỗng = xóa giá trị.
        await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);

        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var sdt = request.SoDienThoai?.Trim() ?? "";
        var hoTen = request.HoTen?.Trim() ?? "";
        var diaChi = string.IsNullOrWhiteSpace(request.DiaChi) ? null : request.DiaChi.Trim();
        var anh = string.IsNullOrWhiteSpace(request.AnhDaiDien) ? null : request.AnhDaiDien.Trim();
        Validate(hoTen, email, sdt, request.NgaySinh, anh);

        await using var tx = await _context.Database.BeginTransactionAsync();

        var kh = await _context.KhachHangs.Include(k => k.TaiKhoan)
            .FirstAsync(k => k.MaTaiKhoan == maTaiKhoan);

        if (await _context.TaiKhoans.AnyAsync(t => t.MaTaiKhoan != maTaiKhoan && (t.Email == email || t.SoDienThoai == sdt)))
            throw new LienHeDaTonTaiException("Email hoặc số điện thoại đã thuộc tài khoản khác.");

        var truoc = new { kh.HoTen, kh.TaiKhoan.Email, kh.TaiKhoan.SoDienThoai, kh.DiaChi, kh.NgaySinh, kh.AnhDaiDien };

        kh.TaiKhoan.Email = email;
        kh.TaiKhoan.SoDienThoai = sdt;
        kh.TaiKhoan.NgayCapNhat = DateTime.UtcNow;
        kh.HoTen = hoTen;
        kh.DiaChi = diaChi;
        kh.NgaySinh = request.NgaySinh;
        kh.AnhDaiDien = anh;
        // Không đụng tới snapshot trên DON_THUE (ten_nguoi_nhan, so_dien_thoai_nguoi_nhan, email_lien_he).

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            maTaiKhoan, "CAP_NHAT_HO_SO", "KHACH_HANG", kh.MaKhachHang.ToString(),
            truoc, new { kh.HoTen, Email = email, SoDienThoai = sdt, kh.DiaChi, kh.NgaySinh, kh.AnhDaiDien }, null));

        try
        {
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex) when (LaViPhamUnique(ex))
        {
            // Unique index là chốt chặn cuối khi hai yêu cầu đổi sang cùng email/SĐT đồng thời.
            throw new LienHeDaTonTaiException("Email hoặc số điện thoại đã thuộc tài khoản khác.");
        }

        return Map(kh);
    }

    private static bool LaViPhamUnique(DbUpdateException ex)
        => ex.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true
           || ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true;

    private static void Validate(string hoTen, string email, string sdt, DateOnly? ngaySinh, string? anh)
    {
        var loi = new Dictionary<string, string>();
        if (hoTen.Length == 0 || hoTen.Length > 255) loi["hoTen"] = "Họ tên bắt buộc, tối đa 255 ký tự.";
        if (email.Length == 0 || email.Length > 255 || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            loi["email"] = "Email không hợp lệ.";
        if (!SoDienThoaiRegex.IsMatch(sdt)) loi["soDienThoai"] = "Số điện thoại không hợp lệ.";
        if (ngaySinh.HasValue && ngaySinh.Value > DateOnly.FromDateTime(DateTime.UtcNow))
            loi["ngaySinh"] = "Ngày sinh không được ở tương lai.";
        if (anh != null && (anh.Length > 500 || anh.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase)
                            || anh.StartsWith("data:", StringComparison.OrdinalIgnoreCase)))
            loi["anhDaiDien"] = "Ảnh đại diện phải là đường dẫn tệp hợp lệ (tải lên qua API tệp), tối đa 500 ký tự.";
        if (loi.Count > 0) throw new HoSoKhongHopLeException("Hồ sơ không hợp lệ.", loi);
    }

    private static HoSoResponse Map(KhachHang kh) => new(
        kh.MaKhachHang, kh.HoTen, kh.TaiKhoan.Email, kh.TaiKhoan.SoDienThoai, kh.DiaChi, kh.NgaySinh, kh.AnhDaiDien);
}
