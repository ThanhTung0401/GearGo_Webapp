using System;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.PhanQuyen;
using GearGo.Services.Interfaces;
using GearGo.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace GearGo.Tests.PhanHeUseCases;

/// <summary>
/// v2 §5.2 — kiểm thử tích hợp mẫu cho RBAC v2 trên endpoint quản trị khuyến mãi.
///
/// SKIP vì cần wire-up thêm (seed role + payload KhuyenMai hợp lệ + MaTaiKhoan lấy từ
/// <see cref="Seed.CoBan"/>). Giữ làm template cho người tiếp tục scope test:
///   - NhanVien không có KhuyenMai_Quan → POST /api/admin/khuyen-mai → 403.
///   - Admin → POST → 200/201.
///   - Gán KhuyenMai_Quan cho role NhanVien qua <see cref="IPermissionService.CapNhatQuyenVaiTroAsync"/>
///     → NhanVien gọi lại POST → 200/201.
/// </summary>
public class RbacV2PermissionTests : IDisposable
{
    private const string JwtSecret = "GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!";
    private readonly TestDb _db = new();
    private readonly WebApplicationFactory<Program> _app;

    public RbacV2PermissionTests()
    {
        using (var ctx = _db.NewContext()) Seed.CoBan(ctx);
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

    private HttpClient Client(long maTaiKhoan, string vaiTro)
    {
        var c = _app.CreateClient();
        var token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            claims: new[]
            {
                new Claim("MaTaiKhoan", maTaiKhoan.ToString()),
                new Claim(ClaimTypes.Role, vaiTro)
            },
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret)),
                SecurityAlgorithms.HmacSha256)));
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return c;
    }

    [Theory(Skip = "TODO: wire up seed role + payload KhuyenMai hợp lệ + lấy MaTaiKhoan từ Seed.CoBan (v2 §5.2).")]
    [InlineData(DomainConstants.Roles.Staff, false, HttpStatusCode.Forbidden)]
    [InlineData(DomainConstants.Roles.Admin, false, HttpStatusCode.OK)]
    [InlineData(DomainConstants.Roles.Staff, true,  HttpStatusCode.OK)]
    public async Task PostKhuyenMai_PhanQuyenTheoRole(string vaiTro, bool capQuyenChoStaff, HttpStatusCode expected)
    {
        if (capQuyenChoStaff)
        {
            using var scope = _app.Services.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<IPermissionService>();
            await svc.CapNhatQuyenVaiTroAsync(
                DomainConstants.Roles.Staff,
                new CapNhatQuyenVaiTroRequest
                {
                    Quyen = new()
                    {
                        DomainConstants.Permissions.KhuyenMai_Xem,
                        DomainConstants.Permissions.KhuyenMai_Quan
                    }
                },
                actor: DomainConstants.SystemActors.Seeder);
        }

        // TODO: inject MaTaiKhoan tương ứng khi bỏ Skip (lấy từ Seed.CoBan — TkQuanTri hoặc TkNhanVien).
        var client = Client(maTaiKhoan: 0L, vaiTro: vaiTro);
        var resp = await client.PostAsJsonAsync("/api/admin/khuyen-mai", new { /* TODO payload */ });
        Assert.Equal(expected, resp.StatusCode);
    }
}
