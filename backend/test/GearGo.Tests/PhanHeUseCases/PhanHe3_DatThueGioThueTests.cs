using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.GioThue;
using GearGo.Models.Enums;
using GearGo.Services.Implements.DonThue;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.KhuyenMai;
using GearGo.Services.Implements.NoiDung;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 3: Quản lý đặt thuê (UC3.1 – UC3.4).
/// </summary>
public class PhanHe3_DatThueGioThueTests
{
    [Fact]
    public async Task UC3_1_Den_UC3_4_GioThue_TaoDon_TheoDoi_HuyDon()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        var khaDungSvc = new KhaDungService(db);
        var kmSvc = new KhuyenMaiService(db);
        var baoGiaSvc = new BaoGiaService();
        var csSvc = new ChinhSachService(db, NullLogger<ChinhSachService>.Instance);
        var gioSvc = new GioThueService(db, baoGiaSvc, kmSvc, khaDungSvc);
        var donSvc = new DonThueService(db, khaDungSvc, kmSvc, csSvc, NullLogger<DonThueService>.Instance);
        var truyVanSvc = new TruyVanDonThueService(db, TimeProvider.System);

        var gioNhan = DateTime.UtcNow.AddDays(3);
        var gioTra = DateTime.UtcNow.AddDays(5);

        // UC3.1: Thêm vào giỏ & đặt thời gian
        var gio1 = await gioSvc.ThemAsync(seed.KhachTk.MaTaiKhoan, new ThemVaoGioRequest
        {
            MaSanPham = seed.SanPham.MaSanPham,
            SoLuong = 1
        });
        Assert.NotNull(gio1);

        var gio2 = await gioSvc.DatThoiGianAsync(seed.KhachTk.MaTaiKhoan, new DatThoiGianRequest
        {
            GioNhan = gioNhan,
            GioTra = gioTra
        });
        Assert.NotNull(gio2.GioNhanDuKien);
        Assert.Single(gio2.ChiTiet);

        // UC3.2: Tạo đơn thuê & giữ chỗ
        var taoDon = await donSvc.TaoDonThueAsync(new TaoDonThueRequest
        {
            MaTaiKhoan = seed.KhachTk.MaTaiKhoan,
            GioNhanDuKien = gioNhan,
            GioTraDuKien = gioTra,
            TenNguoiNhan = "Nguyễn Văn Khách",
            SoDienThoaiNguoiNhan = "0900000003",
            EmailLienHe = "khach@geargo.vn",
            ChiTiet = new List<ChiTietDonThueDto>
            {
                new(seed.SanPham.MaSanPham, 1)
            }
        });
        Assert.True(taoDon.ThanhCong);
        var maDon = taoDon.DuLieu!.MaDonThue;

        // UC3.3: Theo dõi đơn thuê
        var dsDon = await truyVanSvc.LayDonCuaToiAsync(new TimDonRequest(), seed.KhachTk.MaTaiKhoan);
        Assert.Single(dsDon.Items);

        // UC3.4: Hủy đơn chưa thanh toán -> giải phóng giữ chỗ
        var huyRes = await donSvc.HuyDonAsync(maDon, "Đổi lịch trình", seed.KhachTk.MaTaiKhoan);
        Assert.True(huyRes.ThanhCong);

        var donDb = await db.DonThues.FindAsync(maDon);
        Assert.Equal(TrangThaiDonThue.KhachHuy, donDb!.TrangThai);
    }

    [Fact]
    public async Task ResolveMaKhachHang_UuTienMaTaiKhoan_KhongDocNhamGioKhachKhac()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        // Tạo thêm khách hàng khác có MaKhachHang trùng đúng với MaTaiKhoan của khách hiện tại (mô phỏng tình huống IDOR sau seed)
        var otherTk = new GearGo.Models.Entities.TaiKhoan
        {
            Email = "khach.khac@geargo.vn",
            SoDienThoai = "0909999001",
            MatKhauBam = "hash",
            VaiTro = "KhachHang",
            TrangThai = "HoatDong"
        };
        db.TaiKhoans.Add(otherTk);
        await db.SaveChangesAsync();

        var collidingKh = new GearGo.Models.Entities.KhachHang
        {
            MaKhachHang = seed.KhachTk.MaTaiKhoan,
            MaTaiKhoan = otherTk.MaTaiKhoan,
            HoTen = "Khách Hàng Trùng ID"
        };
        db.KhachHangs.Add(collidingKh);
        await db.SaveChangesAsync();

        var khaDungSvc = new KhaDungService(db);
        var kmSvc = new KhuyenMaiService(db);
        var baoGiaSvc = new BaoGiaService();
        var gioSvc = new GioThueService(db, baoGiaSvc, kmSvc, khaDungSvc);

        // Giả lập TuVanAIService đã lưu trực tiếp giỏ thuê theo MaKhachHang thật (tra từ MaTaiKhoan)
        var gioNhan = DateTime.UtcNow.AddDays(4);
        var gioTra = DateTime.UtcNow.AddDays(6);
        var gioThat = new GearGo.Models.Entities.GioThue
        {
            MaKhachHang = seed.Khach.MaKhachHang,
            GioNhanDuKien = gioNhan,
            GioTraDuKien = gioTra,
            NgayCapNhat = DateTime.UtcNow,
            ChiTietGioThues = new List<GearGo.Models.Entities.ChiTietGioThue>
            {
                new() { MaSanPham = seed.SanPham.MaSanPham, SoLuong = 1 }
            }
        };
        db.GioThues.Add(gioThat);
        await db.SaveChangesAsync();

        // Khi khách gọi GET /api/gio-thue với MaTaiKhoan từ JWT, phải trả về đúng giỏ của mình chứ không đọc nhầm giỏ của collidingKh
        var res = await gioSvc.LayGioAsync(seed.KhachTk.MaTaiKhoan);
        Assert.Equal(gioThat.MaGioThue, res.MaGioThue);
        Assert.Single(res.ChiTiet);
    }
}
