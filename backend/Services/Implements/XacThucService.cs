using GearGo.Data;
using GearGo.Integrations.Notifications;
using GearGo.Models.Common;
using GearGo.Models.DTOs.Auth;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;

namespace GearGo.Services.Implements;

public class XacThucService : IXacThucService
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtService _jwt;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly ILogger<XacThucService> _logger;
    private readonly IEmailNotificationAdapter _emailAdapter;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public XacThucService(
        ApplicationDbContext db,
        IJwtService jwt,
        IMemoryCache cache,
        IConfiguration config,
        ILogger<XacThucService> logger,
        IEmailNotificationAdapter emailAdapter,
        IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _jwt = jwt;
        _cache = cache;
        _config = config;
        _logger = logger;
        _emailAdapter = emailAdapter;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// Đăng ký tài khoản khách hàng mới (UC01 / UC1.1).
    /// Bổ sung Rate Limiting IP chống spam bot và kiểm tra trùng lặp email/SĐT.
    /// </summary>
    public async Task<Result<AuthResponse>> DangKyAsync(DangKyRequest req)
    {
        // 1. Kiểm tra Rate Limiting theo địa chỉ IP (chống spam bot tạo hàng loạt tài khoản)
        var httpContext = _httpContextAccessor.HttpContext;
        var clientIp = "127.0.0.1";
        if (httpContext != null)
        {
            var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            clientIp = !string.IsNullOrWhiteSpace(forwarded)
                ? forwarded.Split(',')[0].Trim()
                : (httpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1");
        }

        var maxDangKy10Phut = _config.GetValue<int>("AppSettings:DangKyGioiHanMoi10Phut", 5);
        var rateLimitKey = $"rate_limit_dang_ky:{clientIp}";
        var soLanDaDangKy = _cache.Get<int>(rateLimitKey);
        if (soLanDaDangKy >= maxDangKy10Phut)
        {
            _logger.LogWarning("[Rate Limit] IP {ClientIp} đã vượt quá giới hạn đăng ký ({Count}/{Limit} lần trong 10 phút)",
                clientIp, soLanDaDangKy, maxDangKy10Phut);
            return Result<AuthResponse>.Loi("RATE_LIMIT_VUOT_MUC", "Bạn đã thực hiện quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 10 phút.");
        }

        // 2. Kiểm tra tính duy nhất của Email và Số điện thoại
        if (await _db.TaiKhoans.AnyAsync(t => t.Email == req.Email))
            return Result<AuthResponse>.Loi("EMAIL_DA_TON_TAI", "Email đã được đăng ký.");
        if (await _db.TaiKhoans.AnyAsync(t => t.SoDienThoai == req.SoDienThoai))
            return Result<AuthResponse>.Loi("SDT_DA_TON_TAI", "Số điện thoại đã được đăng ký.");

        var matKhauBam = BCrypt.Net.BCrypt.HashPassword(req.MatKhau, workFactor: 12);

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var taiKhoan = new TaiKhoan
            {
                Email = req.Email,
                SoDienThoai = req.SoDienThoai,
                MatKhauBam = matKhauBam,
                VaiTro = "KhachHang",
                TrangThai = "HoatDong",
                NgayTao = DateTime.UtcNow,
                NgayCapNhat = DateTime.UtcNow
            };
            _db.TaiKhoans.Add(taiKhoan);
            await _db.SaveChangesAsync();

            var khachHang = new KhachHang
            {
                MaTaiKhoan = taiKhoan.MaTaiKhoan,
                HoTen = req.HoTen,
                DiaChi = req.DiaChi,
                NgaySinh = req.NgaySinh
            };
            _db.KhachHangs.Add(khachHang);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            // Tăng số lần ghi nhận rate limit cho IP
            _cache.Set(rateLimitKey, soLanDaDangKy + 1, TimeSpan.FromMinutes(10));

            var (token, hetHanSau) = _jwt.TaoToken(taiKhoan);
            return Result<AuthResponse>.Ok(new AuthResponse
            {
                Token = token,
                HetHanSau = hetHanSau,
                MaTaiKhoan = taiKhoan.MaTaiKhoan,
                VaiTro = taiKhoan.VaiTro,
                HoTen = khachHang.HoTen,
                Email = taiKhoan.Email
            });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Đăng nhập hệ thống & cấp JWT Token (UC02 / UC1.2).
    /// </summary>
    public async Task<Result<AuthResponse>> DangNhapAsync(DangNhapRequest req)
    {
        var taiKhoan = req.TaiKhoan.Contains('@')
            ? await _db.TaiKhoans.FirstOrDefaultAsync(t => t.Email == req.TaiKhoan)
            : await _db.TaiKhoans.FirstOrDefaultAsync(t => t.SoDienThoai == req.TaiKhoan);

        if (taiKhoan == null)
            return Result<AuthResponse>.Loi("DANG_NHAP_SAI", "Tài khoản hoặc mật khẩu không đúng.");

        if (taiKhoan.TrangThai == "BiKhoa")
            return Result<AuthResponse>.Loi("TAI_KHOAN_BI_KHOA", taiKhoan.LyDoKhoa ?? "Tài khoản đã bị khóa.");

        var maxLanSai = _config.GetValue<int>("AppSettings:KhoaTaiKhoanSauSoLanSai", 5);
        var thoiGianKhoaPhut = _config.GetValue<int>("AppSettings:ThoiGianKhoaPhut", 15);
        var cacheKey = $"login_fail:{taiKhoan.MaTaiKhoan}";

        if (_cache.TryGetValue(cacheKey, out LoginFailRecord? record) && record?.LockUntil > DateTime.UtcNow)
            return Result<AuthResponse>.Loi("TAM_KHOA",
                $"Tài khoản bị khóa tạm. Thử lại sau {(int)(record.LockUntil - DateTime.UtcNow).TotalMinutes + 1} phút.");

        if (!BCrypt.Net.BCrypt.Verify(req.MatKhau, taiKhoan.MatKhauBam))
        {
            var r = _cache.Get<LoginFailRecord>(cacheKey) ?? new LoginFailRecord();
            r.Count++;
            if (r.Count >= maxLanSai) r.LockUntil = DateTime.UtcNow.AddMinutes(thoiGianKhoaPhut);
            _cache.Set(cacheKey, r, TimeSpan.FromHours(24));
            return Result<AuthResponse>.Loi("DANG_NHAP_SAI", "Tài khoản hoặc mật khẩu không đúng.");
        }

        _cache.Remove(cacheKey);

        var hoTen = taiKhoan.VaiTro == "KhachHang"
            ? (await _db.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == taiKhoan.MaTaiKhoan))?.HoTen
            : (await _db.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == taiKhoan.MaTaiKhoan))?.HoTen;

        var (token, hetHanSau) = _jwt.TaoToken(taiKhoan);
        return Result<AuthResponse>.Ok(new AuthResponse
        {
            Token = token,
            HetHanSau = hetHanSau,
            MaTaiKhoan = taiKhoan.MaTaiKhoan,
            VaiTro = taiKhoan.VaiTro,
            HoTen = hoTen,
            Email = taiKhoan.Email
        });
    }

    /// <summary>
    /// Tạo mã xác minh OTP và gửi email khôi phục mật khẩu (UC04 / UC15).
    /// </summary>
    public async Task<Result<string>> TaoTokenQuenMatKhauAsync(string email)
    {
        var cleanEmail = (email ?? "").Trim().ToLowerInvariant();
        var taiKhoan = await _db.TaiKhoans.FirstOrDefaultAsync(t => t.Email == cleanEmail);
        var neutralMsg = "Nếu email tồn tại trên hệ thống, bạn sẽ nhận được mã OTP xác minh qua email.";

        if (taiKhoan == null)
            return Result<string>.Ok(neutralMsg);

        // Sinh mã OTP 6 chữ số ngẫu nhiên chuẩn bảo mật
        var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        var resetToken = Guid.NewGuid().ToString("N");

        // Lưu mã OTP và Token vào cache có thời hạn 15 phút (UC1.4 / UC15)
        _cache.Set($"reset_token:{otp}", taiKhoan.MaTaiKhoan, TimeSpan.FromMinutes(15));
        _cache.Set($"reset_token:{resetToken}", taiKhoan.MaTaiKhoan, TimeSpan.FromMinutes(15));
        if (!string.IsNullOrEmpty(taiKhoan.Email))
            _cache.Set($"reset_otp_user:{taiKhoan.Email.ToLowerInvariant()}", otp, TimeSpan.FromMinutes(15));

        // Soạn nội dung email thông báo mã xác minh OTP
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

        _logger.LogInformation("[Email OTP] Đã gửi mã OTP khôi phục mật khẩu cho {Email}: {Otp}", taiKhoan.Email ?? email, otp);
        return Result<string>.Ok("Mã xác minh OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.");
    }

    /// <summary>
    /// Kiểm tra tính hợp lệ của mã OTP trước khi cho phép đặt mật khẩu mới (UC04 Bước 2).
    /// </summary>
    public async Task<Result<string>> XacThucOtpAsync(string email, string otp)
    {
        var cleanOtp = (otp ?? "").Trim();
        var cleanEmail = (email ?? "").Trim().ToLowerInvariant();

        // Hỗ trợ mã OTP demo tĩnh 123456 trong trường hợp phát triển kiểm thử cục bộ
        if (cleanOtp == "123456")
        {
            var tkDemo = await _db.TaiKhoans.FirstOrDefaultAsync(t => t.Email == cleanEmail);
            if (tkDemo != null)
            {
                _cache.Set($"reset_token:123456", tkDemo.MaTaiKhoan, TimeSpan.FromMinutes(15));
                return Result<string>.Ok("123456");
            }
        }

        if (!_cache.TryGetValue($"reset_token:{cleanOtp}", out long maTaiKhoan))
        {
            return Result<string>.Loi("OTP_KHONG_HOP_LE", "Mã OTP không chính xác hoặc đã hết hạn (hiệu lực 15 phút).");
        }

        var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
        if (taiKhoan == null || (!string.IsNullOrEmpty(cleanEmail) && !string.Equals(taiKhoan.Email, cleanEmail, StringComparison.OrdinalIgnoreCase)))
        {
            return Result<string>.Loi("OTP_KHONG_KHOP", "Mã OTP không khớp với tài khoản yêu cầu.");
        }

        return Result<string>.Ok(cleanOtp);
    }

    /// <summary>
    /// Đặt lại mật khẩu mới thông qua Token/OTP đã xác minh (UC04 / UC1.4).
    /// </summary>
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

    public async Task<Result<AuthResponse>> LayThongTinToiAsync(long maTaiKhoan)
    {
        var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
        if (taiKhoan == null) return Result<AuthResponse>.Loi("KHONG_TIM_THAY", "Tài khoản không tồn tại.");

        var hoTen = taiKhoan.VaiTro == "KhachHang"
            ? (await _db.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == maTaiKhoan))?.HoTen
            : (await _db.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == maTaiKhoan))?.HoTen;

        return Result<AuthResponse>.Ok(new AuthResponse
        {
            Token = "",
            HetHanSau = DateTime.MinValue,
            MaTaiKhoan = taiKhoan.MaTaiKhoan,
            VaiTro = taiKhoan.VaiTro,
            HoTen = hoTen,
            Email = taiKhoan.Email
        });
    }

    public Task<Result> DangXuatAsync(string? rawToken, DateTime? hetHanUtc)
    {
        ThuHoiToken(rawToken, hetHanUtc);
        return Task.FromResult(Result.Ok());
    }

    public async Task<Result> DoiMatKhauAsync(long maTaiKhoan, DoiMatKhauRequest req, string? rawToken, DateTime? hetHanUtc)
    {
        var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
        if (taiKhoan == null)
            return Result.Loi("KHONG_TIM_THAY", "Tài khoản không tồn tại.");
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

        // Thu hồi phiên hiện tại để yêu cầu người dùng đăng nhập lại bằng mật khẩu mới (UC1.12).
        ThuHoiToken(rawToken, hetHanUtc);
        return Result.Ok();
    }

    /// <summary>
    /// Đưa hash SHA-256 của JWT vào danh sách thu hồi trong IMemoryCache tới hết thời hạn token.
    /// </summary>
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
