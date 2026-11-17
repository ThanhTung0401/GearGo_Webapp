using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Models.Entities;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.NoiDung;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

public class CoreServicesTests
{
    [Fact]
    public async Task DanhMucService_LayCayDanhMucAsync_TraVeDanhMucHienThi()
    {
        await using var db = TestDbFactory.CreateDb();
        db.DanhMucSanPhams.AddRange(
            new DanhMucSanPham { TenDanhMuc = "Lều trại", TrangThai = "HienThi", ThuTuHienThi = 1 },
            new DanhMucSanPham { TenDanhMuc = "Đã ẩn", TrangThai = "An", ThuTuHienThi = 2 }
        );
        await db.SaveChangesAsync();

        var service = new DanhMucService(db);
        var result = await service.LayCayDanhMucAsync();

        Assert.True(result.ThanhCong);
        Assert.NotNull(result.DuLieu);
        Assert.Single(result.DuLieu!);
        Assert.Equal("Lều trại", result.DuLieu![0].TenDanhMuc);
    }

    [Fact]
    public async Task PermissionService_AdminCoMoiQuyen_NhanVienTheoQuyenDuocGan()
    {
        await using var db = TestDbFactory.CreateDb();
        var admin = new TaiKhoan
        {
            Email = "admin@geargo.vn",
            MatKhauBam = "hash",
            VaiTro = "QuanTriVien",
            TrangThai = "HoatDong"
        };
        var staff = new TaiKhoan
        {
            Email = "staff@geargo.vn",
            MatKhauBam = "hash",
            VaiTro = "NhanVien",
            TrangThai = "HoatDong"
        };
        db.TaiKhoans.AddRange(admin, staff);
        await db.SaveChangesAsync();

        db.NhanViens.Add(new NhanVien
        {
            MaTaiKhoan = staff.MaTaiKhoan,
            HoTen = "Nhân viên A",
        });
        await db.SaveChangesAsync();

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new PermissionService(db, cache, NullLogger<PermissionService>.Instance);

        var roles = await service.LayDanhSachVaiTroAsync();
        var catalog = await service.LayCatalogAsync();
        Assert.NotNull(roles);
        Assert.NotEmpty(catalog);
        Assert.False(await service.KiemTraCoQuyenAsync("KhachHang", "QUAN_LY_TAI_CHINH"));
    }

    [Fact]
    public async Task QuanTriTaiKhoanService_KhoaVaMoKhoaTaiKhoan_ThanhCong()
    {
        await using var db = TestDbFactory.CreateDb();
        var admin = new TaiKhoan
        {
            Email = "admin2@geargo.vn",
            MatKhauBam = "hash",
            VaiTro = "QuanTriVien",
            TrangThai = "HoatDong"
        };
        var khach = new TaiKhoan
        {
            Email = "khach@geargo.vn",
            MatKhauBam = "hash",
            VaiTro = "KhachHang",
            TrangThai = "HoatDong"
        };
        db.TaiKhoans.AddRange(admin, khach);
        await db.SaveChangesAsync();

        var lichSu = new LichSuNghiepVuService(db);
        var service = new QuanTriTaiKhoanService(db, lichSu);

        var lockRes = await service.KhoaTaiKhoanAsync(
            khach.MaTaiKhoan,
            new KhoaTaiKhoanRequest { LyDo = "Vi phạm nội quy" },
            admin.MaTaiKhoan);

        Assert.True(lockRes.ThanhCong);
        Assert.Equal("BiKhoa", lockRes.DuLieu!.TrangThai);

        var unlockRes = await service.MoKhoaTaiKhoanAsync(
            khach.MaTaiKhoan,
            new MoKhoaTaiKhoanRequest { LyDo = "Đã xác minh lại" },
            admin.MaTaiKhoan);

        Assert.True(unlockRes.ThanhCong);
        Assert.Equal("HoatDong", unlockRes.DuLieu!.TrangThai);
    }
}
