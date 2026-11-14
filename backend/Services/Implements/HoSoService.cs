using System.Security.Cryptography;
using System.Text.RegularExpressions;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Integrations.Notifications;
using GearGo.Models.DTOs.HoSo;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

public class HoSoService : IHoSoService
{
    private static readonly Regex SoDienThoaiRegex = new(@"^(\+84|0)\d{9,10}$", RegexOptions.Compiled);

    private readonly ApplicationDbContext _context;
    private readonly ILichSuNghiepVuService _lichSu;
    private readonly IMemoryCache? _cache;
    private readonly IEmailNotificationAdapter? _emailAdapter;
    private readonly ILogger<HoSoService>? _logger;

    public HoSoService(
        ApplicationDbContext context,
        ILichSuNghiepVuService lichSu,
        IMemoryCache? cache = null,
        IEmailNotificationAdapter? emailAdapter = null,
        ILogger<HoSoService>? logger = null)
    {
        _context = context;
        _lichSu = lichSu;
        _cache = cache;
        _emailAdapter = emailAdapter;
        _logger = logger;
    }

    public async Task<HoSoResponse> LayHoSoCuaToiAsync(long maTaiKhoan)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan);
        if (tk.VaiTro == "KhachHang")
        {
            await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
            var kh = await _context.KhachHangs.AsNoTracking().Include(k => k.TaiKhoan)
                .FirstAsync(k => k.MaTaiKhoan == maTaiKhoan);
            return Map(kh);
        }

        var nv = await _context.NhanViens.AsNoTracking().Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaTaiKhoan == maTaiKhoan)
            ?? throw new KhongCoQuyenException("Không tìm thấy hồ sơ nhân viên.");
        return new HoSoResponse(nv.MaNhanVien, nv.HoTen, nv.TaiKhoan.Email, nv.TaiKhoan.SoDienThoai, null, null, null);
    }

    public async Task<GuiOtpDoiLienHeResponse> GuiOtpDoiLienHeAsync(GuiOtpDoiLienHeRequest request, long maTaiKhoan)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan);

        var emailMoi = string.IsNullOrWhiteSpace(request.EmailMoi)
            ? null
            : request.EmailMoi.Trim().ToLowerInvariant();
        var sdtMoi = string.IsNullOrWhiteSpace(request.SoDienThoaiMoi)
            ? null
            : request.SoDienThoaiMoi.Trim();

        var emailThayDoi = emailMoi != null && !string.Equals(emailMoi, tk.Email, StringComparison.OrdinalIgnoreCase);
        var sdtThayDoi = sdtMoi != null && !string.Equals(sdtMoi, tk.SoDienThoai, StringComparison.Ordinal);

        if (!emailThayDoi && !sdtThayDoi)
        {
            throw new DuLieuKhongHopLeException("KHONG_CO_THAY_DOI_LIEN_HE",
                "Email hoặc số điện thoại mới không thay đổi so với thông tin hiện tại.");
        }

        // Kiểm tra định dạng và tính duy nhất trước khi phát hành OTP
        var loi = new Dictionary<string, string>();
        if (emailThayDoi && (emailMoi!.Length > 255 || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(emailMoi)))
            loi["emailMoi"] = "Email mới không hợp lệ.";
        if (sdtThayDoi && !SoDienThoaiRegex.IsMatch(sdtMoi!))
            loi["soDienThoaiMoi"] = "Số điện thoại mới không hợp lệ.";
        if (loi.Count > 0) throw new HoSoKhongHopLeException("Thông tin liên hệ mới không hợp lệ.", loi);

        if (emailThayDoi && await _context.TaiKhoans.AnyAsync(t => t.MaTaiKhoan != maTaiKhoan && t.Email == emailMoi))
            throw new LienHeDaTonTaiException("Email mới đã thuộc tài khoản khác.");
        if (sdtThayDoi && await _context.TaiKhoans.AnyAsync(t => t.MaTaiKhoan != maTaiKhoan && t.SoDienThoai == sdtMoi))
            throw new LienHeDaTonTaiException("Số điện thoại mới đã thuộc tài khoản khác.");

        var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        var hetHanLuc = DateTime.UtcNow.AddMinutes(10);

        if (_cache != null)
        {
            _cache.Set(
                OtpCacheKey(maTaiKhoan),
                new PendingContactOtp(otp, emailThayDoi ? emailMoi : null, sdtThayDoi ? sdtMoi : null),
                TimeSpan.FromMinutes(10));
        }

        var emailNhan = emailThayDoi ? emailMoi! : (tk.Email ?? "");
        if (!string.IsNullOrWhiteSpace(emailNhan) && _emailAdapter != null)
        {
            var noiDung = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                    <h2 style='color: #2D6A4F; margin-top: 0;'>Xác minh thay đổi thông tin liên hệ - GearGo</h2>
                    <p>Mã xác minh OTP để cập nhật Email/Số điện thoại của bạn là:</p>
                    <div style='background: #F4F6F0; padding: 15px; border-radius: 6px; text-align: center; margin: 16px 0;'>
                        <strong style='font-size: 28px; letter-spacing: 6px; color: #1B4332;'>{otp}</strong>
                    </div>
                    <p style='color: #666; font-size: 13px;'>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
                </div>";
            await _emailAdapter.GuiEmailAsync(emailNhan, "GearGo - Mã OTP xác minh đổi thông tin liên hệ", noiDung, "PROFILE_CONTACT_OTP");
        }

        _logger?.LogInformation("[HoSo OTP] Đã phát hành OTP đổi liên hệ cho tài khoản {MaTaiKhoan}: {Otp}", maTaiKhoan, otp);
        return new GuiOtpDoiLienHeResponse("Mã xác minh OTP đã được gửi tới email của bạn.", hetHanLuc);
    }

    public async Task<HoSoResponse> CapNhatHoSoCuaToiAsync(CapNhatHoSoRequest request, long maTaiKhoan)
    {
        // Quy ước PUT thay thế toàn bộ: diaChi/ngaySinh/anhDaiDien null hoặc rỗng = xóa giá trị.
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan);

        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var sdt = request.SoDienThoai?.Trim() ?? "";
        var hoTen = request.HoTen?.Trim() ?? "";
        var diaChi = string.IsNullOrWhiteSpace(request.DiaChi) ? null : request.DiaChi.Trim();
        var anh = string.IsNullOrWhiteSpace(request.AnhDaiDien) ? null : request.AnhDaiDien.Trim();
        Validate(hoTen, email, sdt, request.NgaySinh, anh);

        // UC1.6 Dòng phụ 4.2: Chỉ yêu cầu OTP khi Email hoặc Số điện thoại thực sự thay đổi
        var emailThayDoi = !string.Equals(email, tk.Email, StringComparison.OrdinalIgnoreCase);
        var sdtThayDoi = !string.Equals(sdt, tk.SoDienThoai, StringComparison.Ordinal);
        if (emailThayDoi || sdtThayDoi)
        {
            var maOtp = request.MaOtp?.Trim();
            if (string.IsNullOrWhiteSpace(maOtp))
            {
                throw new DuLieuKhongHopLeException("CAN_OTP_XAC_MINH",
                    "Thay đổi Email hoặc Số điện thoại yêu cầu mã xác minh OTP.");
            }

            if (_cache != null)
            {
                if (!_cache.TryGetValue<PendingContactOtp>(OtpCacheKey(maTaiKhoan), out var pending) || pending == null)
                {
                    throw new DuLieuKhongHopLeException("OTP_HET_HAN",
                        "Mã OTP chưa được yêu cầu hoặc đã hết hạn. Vui lòng gửi lại mã OTP.");
                }

                if (!string.Equals(pending.Otp, maOtp, StringComparison.Ordinal)
                    || (emailThayDoi && !string.Equals(pending.EmailMoi, email, StringComparison.OrdinalIgnoreCase))
                    || (sdtThayDoi && !string.Equals(pending.SoDienThoaiMoi, sdt, StringComparison.Ordinal)))
                {
                    throw new DuLieuKhongHopLeException("OTP_KHONG_HOP_LE",
                        "Mã OTP không chính xác hoặc không khớp với Email/Số điện thoại mới.");
                }

                _cache.Remove(OtpCacheKey(maTaiKhoan));
            }
        }

        await using var tx = await _context.Database.BeginTransactionAsync();

        if (await _context.TaiKhoans.AnyAsync(t => t.MaTaiKhoan != maTaiKhoan && (t.Email == email || t.SoDienThoai == sdt)))
            throw new LienHeDaTonTaiException("Email hoặc số điện thoại đã thuộc tài khoản khác.");

        HoSoResponse ketQua;
        if (tk.VaiTro == "KhachHang")
        {
            await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
            var kh = await _context.KhachHangs.Include(k => k.TaiKhoan)
                .FirstAsync(k => k.MaTaiKhoan == maTaiKhoan);

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
            ketQua = Map(kh);
        }
        else
        {
            var nv = await _context.NhanViens.Include(n => n.TaiKhoan)
                .FirstOrDefaultAsync(n => n.MaTaiKhoan == maTaiKhoan)
                ?? throw new KhongCoQuyenException("Không tìm thấy hồ sơ nhân viên.");

            var truoc = new { nv.HoTen, nv.TaiKhoan.Email, nv.TaiKhoan.SoDienThoai };
            nv.TaiKhoan.Email = email;
            nv.TaiKhoan.SoDienThoai = sdt;
            nv.TaiKhoan.NgayCapNhat = DateTime.UtcNow;
            nv.HoTen = hoTen;

            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
                maTaiKhoan, "CAP_NHAT_HO_SO", "NHAN_VIEN", nv.MaNhanVien.ToString(),
                truoc, new { nv.HoTen, Email = email, SoDienThoai = sdt }, null));
            ketQua = new HoSoResponse(nv.MaNhanVien, nv.HoTen, nv.TaiKhoan.Email, nv.TaiKhoan.SoDienThoai, null, null, null);
        }

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

        return ketQua;
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

    private static string OtpCacheKey(long maTaiKhoan) => $"hoso_otp:{maTaiKhoan}";

    private sealed record PendingContactOtp(string Otp, string? EmailMoi, string? SoDienThoaiMoi);
}
