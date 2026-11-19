using System;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using GearGo.Data;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử HTTP cho 3 bổ sung M9 & M10:
/// - UC94: POST /api/danh-gia/{id}/phan-hoi (StaffOrAdmin), an/khoi-phuc vẫn AdminOnly
/// - UC98: GET /api/bao-cao-van-hanh (StaffOrAdmin)
/// - UC102: GET /api/nhat-ky (StaffOrAdmin, giới hạn phạm vi với NhanVien)
/// </summary>
public class ApiM9M10AuthTests : IDisposable
{
    private const string JwtSecret = "GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!";
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;
    private readonly WebApplicationFactory<Program> _app;

    public ApiM9M10AuthTests()
    {
        using (var ctx = _db.NewContext()) _du = Seed.CoBan(ctx);
        _app = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseEnvironment("Development");
            b.UseSetting("Jwt:SecretKey", JwtSecret);
            b.ConfigureServices(services =>
            {
                services.RemoveAll<IHostedService>();
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<ApplicationDbContext>();
                services.AddScoped<ApplicationDbContext>(_ => _db.NewContext());
                services.RemoveAll<TimeProvider>();
                services.AddSingleton<TimeProvider>(_db.Clock);
            });
        });
    }

    public void Dispose()
    {
        _app.Dispose();
        _db.Dispose();
    }

    private HttpClient Client(long? maTaiKhoan = null, string? vaiTro = null)
    {
        var c = _app.CreateClient();
        if (maTaiKhoan.HasValue)
        {
            var token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
                claims: new[] { new Claim("MaTaiKhoan", maTaiKhoan.Value.ToString()), new Claim(ClaimTypes.Role, vaiTro!) },
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret)), SecurityAlgorithms.HmacSha256)));
            c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        return c;
    }

    private HttpClient KhachA => Client(_du.TkKhachA, "KhachHang");
    private HttpClient NhanVien => Client(_du.TkNhanVien, "NhanVien");
    private HttpClient QuanTri => Client(_du.TkQuanTri, "QuanTriVien");

    [Fact]
    public async Task DanhGia_PhanHoiChoStaffOrAdmin_AnKhoiPhucChiAdmin()
    {
        long maDanhGia;
        using (var ctx = _db.NewContext())
        {
            var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-2), TrangThaiDonThue.HoanTat, 100_000, 200_000);
            var dg = new DanhGia
            {
                MaChiTietDon = don.MaChiTietDon,
                SoSao = 5,
                NoiDung = "Rất tốt",
                TrangThaiHienThi = "HienThi",
                NgayTao = _db.Clock.Utc
            };
            ctx.DanhGias.Add(dg);
            ctx.SaveChanges();
            maDanhGia = dg.MaDanhGia;
        }

        // Chưa đăng nhập -> 401; Khách hàng -> 403
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client().PostAsJsonAsync($"/api/danh-gia/{maDanhGia}/phan-hoi", new { noiDung = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await KhachA.PostAsJsonAsync($"/api/danh-gia/{maDanhGia}/phan-hoi", new { noiDung = "x" })).StatusCode);

        // Nhân viên được phản hồi (200), nhưng không được ẩn đánh giá (403)
        var nvReply = await NhanVien.PostAsJsonAsync($"/api/danh-gia/{maDanhGia}/phan-hoi", new { noiDung = "Shop cảm ơn bạn!" });
        Assert.Equal(HttpStatusCode.OK, nvReply.StatusCode);
        using (var doc = JsonDocument.Parse(await nvReply.Content.ReadAsStringAsync()))
        {
            Assert.Equal("Shop cảm ơn bạn!", doc.RootElement.GetProperty("phanHoiCuaHang").GetString());
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await NhanVien.PostAsJsonAsync($"/api/danh-gia/{maDanhGia}/an", new { lyDo = "Vi phạm" })).StatusCode);

        // Admin được ẩn đánh giá (200)
        Assert.Equal(HttpStatusCode.OK, (await QuanTri.PostAsJsonAsync($"/api/danh-gia/{maDanhGia}/an", new { lyDo = "Vi phạm" })).StatusCode);
    }

    [Fact]
    public async Task NhatKyVaBaoCaoVanHanh_PhanQuyenStaffOrAdmin_NhanVienBiGioiHanTaiKhoan()
    {
        using (var ctx = _db.NewContext())
        {
            ctx.NhatKyThaoTacs.AddRange(
                new NhatKyThaoTac
                {
                    MaTaiKhoan = _du.TkNhanVien,
                    HanhDong = "XAC_NHAN_BAN_GIAO",
                    LoaiDoiTuong = "DON_THUE",
                    MaDoiTuong = "101",
                    ThoiDiem = _db.Clock.Utc
                },
                new NhatKyThaoTac
                {
                    MaTaiKhoan = _du.TkQuanTri,
                    HanhDong = "KHOA_TAI_KHOAN",
                    LoaiDoiTuong = "TAI_KHOAN",
                    MaDoiTuong = "99",
                    ThoiDiem = _db.Clock.Utc
                }
            );
            ctx.SaveChanges();
        }

        // Nhật ký: Anonymous 401, Khách 403, Nhân viên 200 (chỉ thấy nhật ký vận hành/của mình), Admin 200 (thấy hết)
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client().GetAsync("/api/nhat-ky")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await KhachA.GetAsync("/api/nhat-ky")).StatusCode);

        var nvLogs = await NhanVien.GetAsync("/api/nhat-ky");
        Assert.Equal(HttpStatusCode.OK, nvLogs.StatusCode);
        using (var doc = JsonDocument.Parse(await nvLogs.Content.ReadAsStringAsync()))
        {
            var items = doc.RootElement.GetProperty("items");
            Assert.Contains(items.EnumerateArray(), x => x.GetProperty("hanhDong").GetString() == "XAC_NHAN_BAN_GIAO");
            Assert.DoesNotContain(items.EnumerateArray(), x => x.GetProperty("loaiDoiTuong").GetString() == "TAI_KHOAN");
        }

        var adminLogs = await QuanTri.GetAsync("/api/nhat-ky");
        Assert.Equal(HttpStatusCode.OK, adminLogs.StatusCode);
        using (var doc = JsonDocument.Parse(await adminLogs.Content.ReadAsStringAsync()))
        {
            var items = doc.RootElement.GetProperty("items");
            Assert.Contains(items.EnumerateArray(), x => x.GetProperty("loaiDoiTuong").GetString() == "TAI_KHOAN");
        }

        // Báo cáo vận hành: Anonymous 401, Khách 403, Nhân viên qua lớp Authorize (không 401/403)
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client().GetAsync("/api/bao-cao-van-hanh")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await KhachA.GetAsync("/api/bao-cao-van-hanh")).StatusCode);
        var nvReport = await NhanVien.GetAsync("/api/bao-cao-van-hanh");
        Assert.NotEqual(HttpStatusCode.Unauthorized, nvReport.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, nvReport.StatusCode);
    }
}
