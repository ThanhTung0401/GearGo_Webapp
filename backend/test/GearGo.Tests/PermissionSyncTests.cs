using System.Security.Claims;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.PhanQuyen;
using GearGo.Models.Entities;
using GearGo.Services.Implements.DonThue;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.KhuyenMai;
using GearGo.Services.Implements.NoiDung;
using GearGo.Services.Implements.TaiChinh;
using GearGo.Services.Interfaces;
using GearGo.Tests.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// feat/ROLE_Adjustment — permission thay đổi có hiệu lực ngay sau cấp/thu,
/// cache tự invalidate theo version, admin bypass handler, catalog whitelist.
/// </summary>
public class PermissionSyncTests
{
    private const string Staff = DomainConstants.Roles.Staff;
    private const string Admin = DomainConstants.Roles.Admin;

    private static async Task<(ApplicationDbContext ctx, PermissionService svc, long adminId)> ArrangeAsync(TestDb db)
    {
        var ctx = db.NewContext();
        foreach (var name in DomainConstants.Roles.All)
        {
            ctx.Roles.Add(new IdentityRole<long>
            {
                Name = name,
                NormalizedName = name.ToUpperInvariant(),
                ConcurrencyStamp = Guid.NewGuid().ToString()
            });
        }
        var admin = new TaiKhoan { Email = "admin@t", MatKhauBam = "x", VaiTro = Admin, TrangThai = "HoatDong" };
        var staff = new TaiKhoan { Email = "staff@t", MatKhauBam = "x", VaiTro = Staff, TrangThai = "HoatDong" };
        ctx.TaiKhoans.AddRange(admin, staff);
        await ctx.SaveChangesAsync();

        var cache = new MemoryCache(new MemoryCacheOptions());
        var svc = new PermissionService(ctx, cache, NullLogger<PermissionService>.Instance);
        return (ctx, svc, admin.MaTaiKhoan);
    }

    [Fact]
    public async Task Staff_KhongCoQuyen_KiemTraTraVeFalse()
    {
        using var db = new TestDb();
        var (_, svc, _) = await ArrangeAsync(db);
        Assert.False(await svc.KiemTraCoQuyenAsync(Staff, DomainConstants.Permissions.DonThue_Xoa));
    }

    [Fact]
    public async Task CapQuyen_KiemTraTraVeTrue_NgayLapTuc()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        Assert.False(await svc.KiemTraCoQuyenAsync(Staff, DomainConstants.Permissions.DonThue_Xoa));

        // v2 §8.5 — payload phải gồm MinStaff (DonThue_Xem) nếu không sẽ bị chặn "THIEU_QUYEN_TOI_THIEU".
        var kq = await svc.CapNhatQuyenVaiTroAsync(
            Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xem, DomainConstants.Permissions.DonThue_Xoa } },
            adminId);
        Assert.True(kq.ThanhCong);
        Assert.Equal(1, kq.DuLieu!.Version);

        Assert.True(await svc.KiemTraCoQuyenAsync(Staff, DomainConstants.Permissions.DonThue_Xoa));
    }

    [Fact]
    public async Task ThuQuyen_KiemTraTraVeFalse_NgayLapTuc()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xem, DomainConstants.Permissions.DonThue_Xoa } }, adminId);
        Assert.True(await svc.KiemTraCoQuyenAsync(Staff, DomainConstants.Permissions.DonThue_Xoa));

        // Thu riêng DonThue_Xoa (giữ DonThue_Xem để qua guard MinStaff); sau khi thu, DonThue_Xoa không còn.
        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xem } }, adminId);
        Assert.False(await svc.KiemTraCoQuyenAsync(Staff, DomainConstants.Permissions.DonThue_Xoa));
    }

    [Fact]
    public async Task Version_TangMoiLanCapNhat()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        var v0 = await svc.LayVersionAsync(Staff);
        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xem } }, adminId);
        var v1 = await svc.LayVersionAsync(Staff);
        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xem, DomainConstants.Permissions.DonThue_Xoa } }, adminId);
        var v2 = await svc.LayVersionAsync(Staff);

        Assert.True(v1 > v0);
        Assert.True(v2 > v1);
    }

    [Fact]
    public async Task QuyenNgoaiCatalog_BiTuChoi()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        var kq = await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { "KhongCoThat.DoDau" } }, adminId);
        Assert.False(kq.ThanhCong);
        Assert.Equal(DomainConstants.Errors.PermissionNotFound, kq.MaLoi);
    }

    [Fact]
    public async Task Customer_KhongNhanQuyenAdmin()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        var kq = await svc.CapNhatQuyenVaiTroAsync(DomainConstants.Roles.Customer,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xoa } }, adminId);
        Assert.False(kq.ThanhCong);
        Assert.Equal("VAI_TRO_KHACH_KHONG_NHAN_QUYEN", kq.MaLoi);
    }

    // v2 §5.1 — bổ sung 4 test case bao phủ nhánh handler và override empty.

    /// <summary>Admin pass yêu cầu BẤT KỲ, kể cả mã permission không nằm trong catalog.</summary>
    [Fact]
    public async Task Handler_AdminPassMoiRequirement_KeCaMaKhongTonTai()
    {
        using var db = new TestDb();
        var (_, svc, _) = await ArrangeAsync(db);

        var handler = BuildHandler(svc);
        var ctx = BuildAuthContext(maTaiKhoan: null, role: Admin, permission: "KhongTonTai.ThucSu");
        await handler.HandleAsync(ctx);
        Assert.True(ctx.HasSucceeded);
    }

    /// <summary>NhanVien có quyền (seeded trong role claim) → handler Succeed.</summary>
    [Fact]
    public async Task Handler_NhanVienCoQuyen_RoleClaim_Succeed()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        var ctx0 = db.NewContext();
        var nv = new TaiKhoan { Email = "nv@t", MatKhauBam = "x", VaiTro = Staff, TrangThai = "HoatDong" };
        ctx0.TaiKhoans.Add(nv);
        await ctx0.SaveChangesAsync();

        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xem, DomainConstants.Permissions.DonThue_Huy } }, adminId);

        var handler = BuildHandler(svc);
        var ctx = BuildAuthContext(maTaiKhoan: nv.MaTaiKhoan, role: Staff, permission: DomainConstants.Permissions.DonThue_Huy);
        await handler.HandleAsync(ctx);
        Assert.True(ctx.HasSucceeded);
    }

    /// <summary>NhanVien không có quyền → handler KHÔNG Succeed (dẫn tới 403 ở MVC pipeline).</summary>
    [Fact]
    public async Task Handler_NhanVienKhongCoQuyen_KhongSucceed()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        var ctx0 = db.NewContext();
        var nv = new TaiKhoan { Email = "nv2@t", MatKhauBam = "x", VaiTro = Staff, TrangThai = "HoatDong" };
        ctx0.TaiKhoans.Add(nv);
        await ctx0.SaveChangesAsync();

        // Seed role claim chỉ có DonThue_Xem, không có DonThue_Xoa.
        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xem } }, adminId);

        var handler = BuildHandler(svc);
        var ctx = BuildAuthContext(maTaiKhoan: nv.MaTaiKhoan, role: Staff, permission: DomainConstants.Permissions.DonThue_Xoa);
        await handler.HandleAsync(ctx);
        Assert.False(ctx.HasSucceeded);
    }

    /// <summary>NhanVien có override với danh sách RỖNG → KiemTraCoQuyenTaiKhoanAsync trả false cho mọi permission.</summary>
    [Fact]
    public async Task OverrideRong_NhanVien_KiemTraTraFalseBatKyPerm()
    {
        using var db = new TestDb();
        var (_, svc, adminId) = await ArrangeAsync(db);

        // Role claim có đủ DefaultStaff; nhưng user override rỗng phải thắng.
        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = DomainConstants.Permissions.DefaultStaff.ToList() }, adminId);

        var ctx0 = db.NewContext();
        var nv = new TaiKhoan { Email = "nv3@t", MatKhauBam = "x", VaiTro = Staff, TrangThai = "HoatDong" };
        ctx0.TaiKhoans.Add(nv);
        await ctx0.SaveChangesAsync();
        ctx0.NhanViens.Add(new NhanVien { MaTaiKhoan = nv.MaTaiKhoan, HoTen = "NV3", TrangThaiLamViec = DomainConstants.StaffStatus.Working });
        await ctx0.SaveChangesAsync();

        // Override rỗng cho tài khoản.
        var upd = await svc.CapNhatQuyenNhanVienAsync(nv.MaTaiKhoan,
            new CapNhatQuyenNhanVienRequest { Quyen = new() }, adminId);
        Assert.True(upd.ThanhCong);

        foreach (var perm in new[] { DomainConstants.Permissions.DonThue_Xem, DomainConstants.Permissions.DonThue_Huy, DomainConstants.Permissions.HoanTien_Duyet })
        {
            Assert.False(await svc.KiemTraCoQuyenTaiKhoanAsync(nv.MaTaiKhoan, Staff, perm),
                $"Override rỗng phải chặn perm {perm}.");
        }
    }

    // ─────────── helpers riêng cho các test handler ───────────

    private static PermissionAuthorizationHandler BuildHandler(IPermissionService svc)
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => svc);
        var sp = services.BuildServiceProvider();
        return new PermissionAuthorizationHandler(sp.GetRequiredService<IServiceScopeFactory>());
    }

    private static AuthorizationHandlerContext BuildAuthContext(long? maTaiKhoan, string role, string permission)
    {
        var claims = new List<Claim> { new(ClaimTypes.Role, role) };
        if (maTaiKhoan.HasValue) claims.Add(new Claim("MaTaiKhoan", maTaiKhoan.Value.ToString()));
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        var req = new PermissionRequirement(permission);
        return new AuthorizationHandlerContext(new[] { req }, user, resource: null);
    }
}
