using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.PhanQuyen;
using GearGo.Models.Entities;
using GearGo.Services.Implements.DonThue;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.KhuyenMai;
using GearGo.Services.Implements.NoiDung;
using GearGo.Services.Implements.TaiChinh;
using GearGo.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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

        var kq = await svc.CapNhatQuyenVaiTroAsync(
            Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xoa } },
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
            new CapNhatQuyenVaiTroRequest { Quyen = new() { DomainConstants.Permissions.DonThue_Xoa } }, adminId);
        Assert.True(await svc.KiemTraCoQuyenAsync(Staff, DomainConstants.Permissions.DonThue_Xoa));

        await svc.CapNhatQuyenVaiTroAsync(Staff,
            new CapNhatQuyenVaiTroRequest { Quyen = new() }, adminId);
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
}
