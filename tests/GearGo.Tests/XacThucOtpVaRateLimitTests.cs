using System.Net;
using GearGo.Data;
using GearGo.Integrations.Notifications;
using GearGo.Models.DTOs.Auth;
using GearGo.Models.Entities;
using GearGo.Services.Implements;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

public class TestApplicationDbContext : ApplicationDbContext
{
    public TestApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Chuẩn hóa các kiểu cột SQL Server (nvarchar(max)) tương thích với SQLite in-memory
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                var columnType = property.GetColumnType();
                if (columnType != null && columnType.Contains("max", StringComparison.OrdinalIgnoreCase))
                {
                    property.SetColumnType("TEXT");
                }
            }
        }
    }
}

public class XacThucOtpVaRateLimitTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ApplicationDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly MockEmailNotificationAdapter _emailAdapter;
    private readonly DefaultHttpContext _httpContext;
    private readonly HttpContextAccessor _httpContextAccessor;
    private readonly XacThucService _service;

    public XacThucOtpVaRateLimitTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new TestApplicationDbContext(options);
        _db.Database.EnsureCreated();

        _cache = new MemoryCache(new MemoryCacheOptions());

        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Jwt:SecretKey", "GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!" },
            { "AppSettings:DangKyGioiHanMoi10Phut", "5" },
            { "AppSettings:KhoaTaiKhoanSauSoLanSai", "5" },
            { "AppSettings:ThoiGianKhoaPhut", "15" }
        };
        _config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();

        _emailAdapter = new MockEmailNotificationAdapter(NullLogger<MockEmailNotificationAdapter>.Instance);

        _httpContext = new DefaultHttpContext();
        _httpContext.Connection.RemoteIpAddress = IPAddress.Parse("192.168.1.100");
        _httpContextAccessor = new HttpContextAccessor { HttpContext = _httpContext };

        var jwtService = new JwtService(_config);

        _service = new XacThucService(
            _db,
            jwtService,
            _cache,
            _config,
            NullLogger<XacThucService>.Instance,
            _emailAdapter,
            _httpContextAccessor);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        _cache.Dispose();
    }

    [Fact]
    public async Task DangKyAsync_KhiVuotQuaGioiHan5Lan_SeTraVeLoiRateLimit()
    {
        // Thực hiện 5 lần đăng ký hợp lệ từ cùng IP
        for (int i = 1; i <= 5; i++)
        {
            var req = new DangKyRequest
            {
                Email = $"user{i}@test.com",
                SoDienThoai = $"090000000{i}",
                MatKhau = "Password@123",
                XacNhanMatKhau = "Password@123",
                HoTen = $"User {i}"
            };

            var res = await _service.DangKyAsync(req);
            Assert.True(res.ThanhCong, $"Lần đăng ký thứ {i} phải thành công nhưng bị lỗi: {res.ThongDiep}");
        }

        // Lần thứ 6 từ cùng IP phải bị chặn bởi Rate Limiting (UC01)
        var req6 = new DangKyRequest
        {
            Email = "user6@test.com",
            SoDienThoai = "0900000006",
            MatKhau = "Password@123",
            XacNhanMatKhau = "Password@123",
            HoTen = "User 6"
        };

        var res6 = await _service.DangKyAsync(req6);
        Assert.False(res6.ThanhCong);
        Assert.Equal("RATE_LIMIT_VUOT_MUC", res6.MaLoi);
    }

    [Fact]
    public async Task QuenMatKhauVaXacThucOtp_ThanhCongVaDatLaiMatKhau()
    {
        // 1. Tạo tài khoản mẫu
        var tk = new TaiKhoan
        {
            Email = "test_otp@geargo.vn",
            SoDienThoai = "0911223344",
            MatKhauBam = BCrypt.Net.BCrypt.HashPassword("OldPass@123"),
            VaiTro = "KhachHang",
            TrangThai = "HoatDong",
            NgayTao = DateTime.UtcNow,
            NgayCapNhat = DateTime.UtcNow
        };
        _db.TaiKhoans.Add(tk);
        await _db.SaveChangesAsync();

        // 2. Yêu cầu cấp OTP khôi phục mật khẩu (UC04 / UC15)
        var quenMkResult = await _service.TaoTokenQuenMatKhauAsync(tk.Email);
        Assert.True(quenMkResult.ThanhCong);

        // Kiểm tra xem Email Adapter có ghi nhận email được gửi
        Assert.NotEmpty(_emailAdapter.DaGui);
        var sentEmail = _emailAdapter.DaGui.First(e => e.Email == tk.Email);
        Assert.Contains("Mã xác minh OTP", sentEmail.TieuDe);

        // Lấy mã OTP từ cache
        Assert.True(_cache.TryGetValue($"reset_otp_user:{tk.Email.ToLowerInvariant()}", out string? cachedOtp));
        Assert.NotNull(cachedOtp);
        Assert.Equal(6, cachedOtp!.Length);

        // 3. Xác minh mã OTP hợp lệ (UC04 Bước 2)
        var xacThucResult = await _service.XacThucOtpAsync(tk.Email, cachedOtp);
        Assert.True(xacThucResult.ThanhCong);
        Assert.Equal(cachedOtp, xacThucResult.DuLieu);

        // 4. Thử xác minh mã OTP sai -> phải thất bại
        var saiOtpResult = await _service.XacThucOtpAsync(tk.Email, "999999");
        Assert.False(saiOtpResult.ThanhCong);

        // 5. Đặt lại mật khẩu mới với mã OTP hợp lệ (UC04 Bước 3)
        var datLaiResult = await _service.DatLaiMatKhauAsync(new DatLaiMatKhauRequest
        {
            Token = cachedOtp,
            MatKhauMoi = "NewSecret@2026",
            XacNhanMatKhau = "NewSecret@2026"
        });
        Assert.True(datLaiResult.ThanhCong);

        // 6. Kiểm tra tài khoản đã cập nhật mật khẩu mới và có thể đăng nhập bằng mật khẩu mới
        var dangNhapResult = await _service.DangNhapAsync(new DangNhapRequest
        {
            TaiKhoan = tk.Email,
            MatKhau = "NewSecret@2026"
        });
        Assert.True(dangNhapResult.ThanhCong);
        Assert.Equal(tk.Email, dangNhapResult.DuLieu?.Email);
    }
}
