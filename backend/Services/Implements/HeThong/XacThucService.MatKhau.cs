using System.Security.Cryptography;
using System.Text;
using GearGo.Models.Common;
using GearGo.Models.DTOs.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GearGo.Services.Implements.HeThong;

public partial class XacThucService
{
    public async Task<Result<string>> TaoTokenQuenMatKhauAsync(string email)
    {
        var cleanEmail = (email ?? "").Trim().ToLowerInvariant();
        const string neutralMsg = "Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã OTP xác minh qua email.";

        // Giới hạn tần suất gửi mã khôi phục mật khẩu (tối đa 5 lần / 15 phút mỗi email — UC1.4 / UC1.4.1)
        var rateKey = $"reset_rate:{cleanEmail}";
        var requestCount = _cache.Get<int>(rateKey);
        if (requestCount >= 5)
            return Result<string>.Loi("QUA_SO_LAN_YEU_CAU", "Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng thử lại sau 15 phút.");
        _cache.Set(rateKey, requestCount + 1, TimeSpan.FromMinutes(15));

        var taiKhoan = await _db.TaiKhoans.FirstOrDefaultAsync(t => t.Email == cleanEmail);
        if (taiKhoan == null) return Result<string>.Ok(neutralMsg);

        var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        var resetToken = Guid.NewGuid().ToString("N");

        _cache.Set($"reset_token:{otp}", taiKhoan.MaTaiKhoan, TimeSpan.FromMinutes(15));
        _cache.Set($"reset_token:{resetToken}", taiKhoan.MaTaiKhoan, TimeSpan.FromMinutes(15));
        if (!string.IsNullOrEmpty(taiKhoan.Email))
            _cache.Set($"reset_otp_user:{taiKhoan.Email.ToLowerInvariant()}", otp, TimeSpan.FromMinutes(15));

        var noiDungEmail = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                <h2 style='color: #2D6A4F; margin-top: 0;'>Xác nhận khôi phục mật khẩu - GearGo</h2>
                <p>Xin chào quý khách,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email: <strong>{taiKhoan.Email ?? email}</strong>.</p>
                <div style='background: #F4F6F0; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;'>
                    <span style='font-size: 14px; color: #555;'>Mã xác minh OTP của bạn là:</span><br/>
                    <strong style='font-size: 28px; letter-spacing: 6px; color: #1B4332;'>{otp}</strong>
                </div>
                <p style='color: #666; font-size: 13px;'>Mã xác minh này có hiệu lực trong vòng <strong>15 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</p>
                <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />
                <p style='color: #999; font-size: 12px;'>Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này.</p>
            </div>";

        await _emailAdapter.GuiEmailAsync(
            taiKhoan.Email ?? email ?? "",
            "GearGo - Mã xác minh OTP khôi phục mật khẩu",
            noiDungEmail,
            "AUTH_RESET_PASSWORD");

        _logger.LogInformation("[Email OTP] Đã gửi mã OTP khôi phục mật khẩu cho {Email}", taiKhoan.Email ?? email);
        // Phản hồi trung tính không tiết lộ tài khoản tồn tại (UC1.4 dòng phụ 2.1.1)
        return Result<string>.Ok(neutralMsg);
    }

    public async Task<Result<string>> XacThucOtpAsync(string email, string otp)
    {
        var cleanOtp = (otp ?? "").Trim();
        var cleanEmail = (email ?? "").Trim().ToLowerInvariant();

        // Chỉ cho phép mã OTP test 123456 khi bật cờ AppSettings:AllowDemoOtp (chỉ dùng môi trường Dev/E2E) và đã có yêu cầu OTP hợp lệ
        if (cleanOtp == "123456"
            && _config.GetValue<bool>("AppSettings:AllowDemoOtp", false)
            && _cache.TryGetValue($"reset_otp_user:{cleanEmail}", out string? _))
        {
            var tkDemo = await _db.TaiKhoans.FirstOrDefaultAsync(t => t.Email == cleanEmail);
            if (tkDemo != null)
            {
                _cache.Set("reset_token:123456", tkDemo.MaTaiKhoan, TimeSpan.FromMinutes(15));
                return Result<string>.Ok("123456");
            }
        }

        if (!_cache.TryGetValue($"reset_token:{cleanOtp}", out long maTaiKhoan))
            return Result<string>.Loi("OTP_KHONG_HOP_LE", "Mã OTP không chính xác hoặc đã hết hạn (hiệu lực 15 phút).");

        var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
        if (taiKhoan == null || (!string.IsNullOrEmpty(cleanEmail) && !string.Equals(taiKhoan.Email, cleanEmail, StringComparison.OrdinalIgnoreCase)))
            return Result<string>.Loi("OTP_KHONG_KHOP", "Mã OTP không khớp với tài khoản yêu cầu.");

        return Result<string>.Ok(cleanOtp);
    }

    public async Task<Result> DatLaiMatKhauAsync(DatLaiMatKhauRequest req)
    {
        if (!_cache.TryGetValue($"reset_token:{req.Token}", out long maTaiKhoan))
            return Result.Loi("TOKEN_KHONG_HOP_LE", "Mã xác minh không hợp lệ hoặc đã hết hạn.");

        var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
        if (taiKhoan == null)
            return Result.Loi("KHONG_TIM_THAY", "Tài khoản không tồn tại.");

        taiKhoan.MatKhauBam = BCrypt.Net.BCrypt.HashPassword(req.MatKhauMoi, workFactor: 12);
        taiKhoan.NgayCapNhat = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _cache.Remove($"reset_token:{req.Token}");
        _logger.LogInformation("[Auth] Tài khoản {Email} đã khôi phục mật khẩu thành công.", taiKhoan.Email);
        return Result.Ok();
    }

    public async Task<Result> DoiMatKhauAsync(long maTaiKhoan, DoiMatKhauRequest req, string? rawToken, DateTime? hetHanUtc)
    {
        var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
        if (taiKhoan == null) return Result.Loi("KHONG_TIM_THAY", "Tài khoản không tồn tại.");
        if (taiKhoan.TrangThai != "HoatDong")
            return Result.Loi("TAI_KHOAN_BI_KHOA", "Tài khoản không ở trạng thái hoạt động.");

        var maxLanSai = _config.GetValue<int>("AppSettings:KhoaTaiKhoanSauSoLanSai", 5);
        var thoiGianKhoaPhut = _config.GetValue<int>("AppSettings:ThoiGianKhoaPhut", 15);
        var cacheKey = $"pwd_fail:{maTaiKhoan}";

        if (_cache.TryGetValue(cacheKey, out LoginFailRecord? record) && record?.LockUntil > DateTime.UtcNow)
            return Result.Loi("TAM_KHOA",
                $"Thử sai mật khẩu quá nhiều lần. Vui lòng thử lại sau {(int)(record.LockUntil - DateTime.UtcNow).TotalMinutes + 1} phút.");

        if (!BCrypt.Net.BCrypt.Verify(req.MatKhauHienTai, taiKhoan.MatKhauBam))
        {
            var r = _cache.Get<LoginFailRecord>(cacheKey) ?? new LoginFailRecord();
            r.Count++;
            if (r.Count >= maxLanSai) r.LockUntil = DateTime.UtcNow.AddMinutes(thoiGianKhoaPhut);
            _cache.Set(cacheKey, r, TimeSpan.FromHours(1));
            return Result.Loi("MAT_KHAU_HIEN_TAI_SAI", "Mật khẩu hiện tại không chính xác.");
        }

        if (BCrypt.Net.BCrypt.Verify(req.MatKhauMoi, taiKhoan.MatKhauBam))
            return Result.Loi("MAT_KHAU_TRUNG_CU", "Mật khẩu mới phải khác mật khẩu hiện tại.");

        _cache.Remove(cacheKey);
        taiKhoan.MatKhauBam = BCrypt.Net.BCrypt.HashPassword(req.MatKhauMoi, workFactor: 12);
        taiKhoan.NgayCapNhat = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        ThuHoiToken(rawToken, hetHanUtc);
        return Result.Ok();
    }

    private void ThuHoiToken(string? rawToken, DateTime? hetHanUtc)
    {
        if (string.IsNullOrWhiteSpace(rawToken)) return;
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken.Trim())));
        var ttl = hetHanUtc.HasValue && hetHanUtc.Value > DateTime.UtcNow
            ? hetHanUtc.Value - DateTime.UtcNow
            : TimeSpan.FromHours(24);
        _cache.Set($"revoked_token:{hash}", true, ttl);
    }

    private sealed class LoginFailRecord
    {
        public int Count { get; set; }
        public DateTime LockUntil { get; set; }
    }
}
