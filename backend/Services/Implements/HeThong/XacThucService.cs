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

namespace GearGo.Services.Implements.HeThong;

public partial class XacThucService : IXacThucService
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtService _jwt;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly ILogger<XacThucService> _logger;
    private readonly IEmailNotificationAdapter _emailAdapter;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public XacThucService(
        ApplicationDbContext db, IJwtService jwt, IMemoryCache cache, IConfiguration config,
        ILogger<XacThucService> logger, IEmailNotificationAdapter emailAdapter,
        IHttpContextAccessor httpContextAccessor)
    {
        _db = db; _jwt = jwt; _cache = cache; _config = config;
        _logger = logger; _emailAdapter = emailAdapter; _httpContextAccessor = httpContextAccessor;
    }

    private string LayClientIp()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null) return "127.0.0.1";
        var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : (httpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1");
    }

    private async Task<string?> LayHoTenTheoVaiTroAsync(TaiKhoan taiKhoan) =>
        taiKhoan.VaiTro == "KhachHang"
            ? (await _db.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == taiKhoan.MaTaiKhoan))?.HoTen
            : (await _db.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == taiKhoan.MaTaiKhoan))?.HoTen;

    public async Task<Result<AuthResponse>> DangKyAsync(DangKyRequest req)
    {
        var clientIp = LayClientIp();
        var maxDangKy10Phut = _config.GetValue<int>("AppSettings:DangKyGioiHanMoi10Phut", 5);
        var rateLimitKey = $"rate_limit_dang_ky:{clientIp}";
        var soLanDaDangKy = _cache.Get<int>(rateLimitKey);

        if (soLanDaDangKy >= maxDangKy10Phut)
        {
            _logger.LogWarning("[Rate Limit] IP {ClientIp} vượt quá giới hạn đăng ký ({Count}/{Limit})", clientIp, soLanDaDangKy, maxDangKy10Phut);
            return Result<AuthResponse>.Loi("RATE_LIMIT_VUOT_MUC", "Bạn đã thực hiện quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 10 phút.");
        }

        if (await _db.TaiKhoans.AnyAsync(t => t.Email == req.Email))
            return Result<AuthResponse>.Loi("EMAIL_DA_TON_TAI", "Email đã được đăng ký.");
        if (await _db.TaiKhoans.AnyAsync(t => t.SoDienThoai == req.SoDienThoai))
            return Result<AuthResponse>.Loi("SDT_DA_TON_TAI", "Số điện thoại đã được đăng ký.");

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var taiKhoan = new TaiKhoan
            {
                Email = req.Email, SoDienThoai = req.SoDienThoai,
                MatKhauBam = BCrypt.Net.BCrypt.HashPassword(req.MatKhau, workFactor: 12),
                VaiTro = "KhachHang", TrangThai = "HoatDong",
                NgayTao = DateTime.UtcNow, NgayCapNhat = DateTime.UtcNow
            };
            _db.TaiKhoans.Add(taiKhoan);
            await _db.SaveChangesAsync();

            var khachHang = new KhachHang
            {
                MaTaiKhoan = taiKhoan.MaTaiKhoan, HoTen = req.HoTen,
                DiaChi = req.DiaChi, NgaySinh = req.NgaySinh
            };
            _db.KhachHangs.Add(khachHang);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            // Đẩy Welcome Email vào hàng chờ Outbox sau khi tạo tài khoản thành công (W7-MAIL-01)
            try
            {
                _db.ThongBaos.Add(new ThongBao
                {
                    MaTaiKhoan = taiKhoan.MaTaiKhoan,
                    MaSuKien = $"WELCOME:{taiKhoan.MaTaiKhoan}",
                    LoaiSuKien = "Welcome",
                    TieuDe = "Chào mừng bạn đến với GearGo!",
                    NoiDung = $"Xin chào {khachHang.HoTen},\nTài khoản của bạn ({taiKhoan.Email}) đã sẵn sàng. Bạn có thể bắt đầu tìm kiếm thiết bị, nhận tư vấn bộ đồ AI và đặt thuê trực tuyến ngay bây giờ.",
                    KenhGui = "Email",
                    TrangThaiGui = "ChuaGui",
                    ThoiDiemTao = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể xếp hàng Welcome Email cho tài khoản #{Id}", taiKhoan.MaTaiKhoan);
            }

            _cache.Set(rateLimitKey, soLanDaDangKy + 1, TimeSpan.FromMinutes(10));
            var (token, hetHanSau) = _jwt.TaoToken(taiKhoan);
            return Result<AuthResponse>.Ok(new AuthResponse
            {
                Token = token, HetHanSau = hetHanSau, MaTaiKhoan = taiKhoan.MaTaiKhoan,
                VaiTro = taiKhoan.VaiTro, HoTen = khachHang.HoTen, Email = taiKhoan.Email
            });
        }
        catch { await tx.RollbackAsync(); throw; }
    }

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
        var hoTen = await LayHoTenTheoVaiTroAsync(taiKhoan);
        var (token, hetHanSau) = _jwt.TaoToken(taiKhoan);
        return Result<AuthResponse>.Ok(new AuthResponse
        {
            Token = token, HetHanSau = hetHanSau, MaTaiKhoan = taiKhoan.MaTaiKhoan,
            VaiTro = taiKhoan.VaiTro, HoTen = hoTen, Email = taiKhoan.Email
        });
    }

    public async Task<Result<AuthResponse>> LayThongTinToiAsync(long maTaiKhoan)
    {
        var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
        if (taiKhoan == null) return Result<AuthResponse>.Loi("KHONG_TIM_THAY", "Tài khoản không tồn tại.");

        return Result<AuthResponse>.Ok(new AuthResponse
        {
            Token = "", HetHanSau = DateTime.MinValue, MaTaiKhoan = taiKhoan.MaTaiKhoan,
            VaiTro = taiKhoan.VaiTro, HoTen = await LayHoTenTheoVaiTroAsync(taiKhoan), Email = taiKhoan.Email
        });
    }

    public Task<Result> DangXuatAsync(string? rawToken, DateTime? hetHanUtc)
    {
        ThuHoiToken(rawToken, hetHanUtc);
        return Task.FromResult(Result.Ok());
    }
}
