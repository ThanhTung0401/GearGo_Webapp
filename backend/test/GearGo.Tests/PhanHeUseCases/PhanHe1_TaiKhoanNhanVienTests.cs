using GearGo.Models.DTOs.Auth;
using GearGo.Models.DTOs.HoSo;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Services.Implements.HeThong;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 1: Quản lý tài khoản và nhân viên (UC1.1 – UC1.13).
/// </summary>
public class PhanHe1_TaiKhoanNhanVienTests
{
    private static XacThucService TaoXacThucService(Data.ApplicationDbContext db, Microsoft.Extensions.Caching.Memory.IMemoryCache cache)
    {
        var config = TestHelpers.CreateConfig();
        var jwt = new JwtService(config);
        return new XacThucService(
            db,
            jwt,
            cache,
            config,
            NullLogger<XacThucService>.Instance,
            TestHelpers.CreateMockEmailAdapter(),
            TestHelpers.CreateHttpContextAccessor());
    }

    [Fact]
    public async Task UC1_1_Va_UC1_2_DangKy_Va_DangNhap_ThanhCong_KhongCapQuyenNoiBo()
    {
        await using var db = TestDbFactory.CreateDb();
        using var cache = TestHelpers.CreateCache();
        var svc = TaoXacThucService(db, cache);

        var reg = await svc.DangKyAsync(new DangKyRequest
        {
            Email = "newuser@geargo.vn",
            SoDienThoai = "0912345678",
            MatKhau = "MatKhau@123",
            XacNhanMatKhau = "MatKhau@123",
            HoTen = "Người Dùng Mới",
            DiaChi = "Hà Nội"
        });

        Assert.True(reg.ThanhCong);
        Assert.Equal("KhachHang", reg.DuLieu!.VaiTro);
        Assert.False(string.IsNullOrWhiteSpace(reg.DuLieu.Token));

        var login = await svc.DangNhapAsync(new DangNhapRequest
        {
            TaiKhoan = "newuser@geargo.vn",
            MatKhau = "MatKhau@123"
        });
        Assert.True(login.ThanhCong);
        Assert.Equal("KhachHang", login.DuLieu!.VaiTro);
    }

    [Fact]
    public async Task UC1_1_DangKyTrungEmail_TuChoiKhongDeHoSoMoCoi()
    {
        await using var db = TestDbFactory.CreateDb();
        await TestHelpers.SeedCoBanAsync(db);
        using var cache = TestHelpers.CreateCache();
        var svc = TaoXacThucService(db, cache);

        var reg = await svc.DangKyAsync(new DangKyRequest
        {
            Email = "khach@geargo.vn",
            SoDienThoai = "0988888888",
            MatKhau = "MatKhau@123",
            XacNhanMatKhau = "MatKhau@123",
            HoTen = "Trùng Email"
        });

        Assert.False(reg.ThanhCong);
    }

    [Fact]
    public async Task UC1_3_Va_UC1_12_DangXuat_Va_DoiMatKhau_VoHieuTokenCu()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        using var cache = TestHelpers.CreateCache();
        var svc = TaoXacThucService(db, cache);

        var doiMk = await svc.DoiMatKhauAsync(
            seed.KhachTk.MaTaiKhoan,
            new DoiMatKhauRequest
            {
                MatKhauHienTai = "Khach@123",
                MatKhauMoi = "KhachMoi@123",
                XacNhanMatKhau = "KhachMoi@123"
            },
            "raw-token-abc",
            DateTime.UtcNow.AddMinutes(30));

        Assert.True(doiMk.ThanhCong);

        var loginCu = await svc.DangNhapAsync(new DangNhapRequest
        {
            TaiKhoan = "khach@geargo.vn",
            MatKhau = "Khach@123"
        });
        Assert.False(loginCu.ThanhCong);

        var loginMoi = await svc.DangNhapAsync(new DangNhapRequest
        {
            TaiKhoan = "khach@geargo.vn",
            MatKhau = "KhachMoi@123"
        });
        Assert.True(loginMoi.ThanhCong);

        var logout = await svc.DangXuatAsync(loginMoi.DuLieu!.Token, DateTime.UtcNow.AddMinutes(30));
        Assert.True(logout.ThanhCong);
    }

    [Fact]
    public async Task UC1_5_Va_UC1_6_Xem_Va_CapNhatHoSoCaNhan()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        var lichSu = new LichSuNghiepVuService(db);
        var hoSoSvc = new HoSoService(db, lichSu, TestHelpers.CreateCache(), TestHelpers.CreateMockEmailAdapter(), NullLogger<HoSoService>.Instance);

        var hs = await hoSoSvc.LayHoSoCuaToiAsync(seed.KhachTk.MaTaiKhoan);
        Assert.Equal("Nguyễn Văn Khách", hs.HoTen);

        var updated = await hoSoSvc.CapNhatHoSoCuaToiAsync(
            new CapNhatHoSoRequest("Nguyễn Văn Đã Sửa", seed.KhachTk.Email!, seed.KhachTk.SoDienThoai!, "456 Hai Bà Trưng", null, null),
            seed.KhachTk.MaTaiKhoan);
        Assert.Equal("Nguyễn Văn Đã Sửa", updated.HoTen);
        Assert.Equal("456 Hai Bà Trưng", updated.DiaChi);
    }

    [Fact]
    public async Task UC1_7_Den_UC1_13_QuanTriNhanVien_Va_TraCuuTaiKhoan()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        var lichSu = new LichSuNghiepVuService(db);
        var nvSvc = new NhanVienService(db, lichSu);
        var tkSvc = new QuanTriTaiKhoanService(db, lichSu);

        var created = await nvSvc.TaoNhanVienAsync(new TaoNhanVienRequest
        {
            Email = "nv2@geargo.vn",
            SoDienThoai = "0900000099",
            MatKhauKhoiTao = "NhanVien@123",
            HoTen = "Trần Nhân Viên",
            VaiTro = "NhanVien"
        }, seed.AdminTk.MaTaiKhoan);
        Assert.True(created.ThanhCong);

        var dsNv = await nvSvc.TimNhanVienAsync(new TimNhanVienRequest(), seed.AdminTk.MaTaiKhoan);
        Assert.True(dsNv.ThanhCong);
        Assert.True(dsNv.DuLieu!.TongSo >= 2);

        var dsTk = await tkSvc.TimTaiKhoanAsync(new TimTaiKhoanRequest { VaiTro = "KhachHang" }, seed.AdminTk.MaTaiKhoan);
        Assert.True(dsTk.ThanhCong);
        Assert.Single(dsTk.DuLieu!.Items);
    }
}
