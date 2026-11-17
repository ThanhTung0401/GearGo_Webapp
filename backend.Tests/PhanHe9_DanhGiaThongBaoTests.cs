using GearGo.Models.DTOs.DanhGia;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.NoiDung;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 9: Quản lý đánh giá và thông báo (UC9.1 – UC9.4).
/// </summary>
public class PhanHe9_DanhGiaThongBaoTests
{
    [Fact]
    public async Task UC9_1_Va_UC9_2_GuiDanhGia_Va_KiemDuyetDanhGia()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        var don = new DonThue
        {
            MaKhachHang = seed.Khach.MaKhachHang,
            MaChinhSach = seed.ChinhSach.MaChinhSach,
            MaDonHienThi = "DH-DG-01",
            GioNhanDuKien = DateTime.UtcNow.AddDays(-5),
            GioTraDuKien = DateTime.UtcNow.AddDays(-2),
            TrangThai = TrangThaiDonThue.HoanTat,
            TenNguoiNhan = "Khách Đánh Giá",
            SoDienThoaiNguoiNhan = "0900000003",
            TongTienThueTruocGiam = 400000m,
            TongTienCoc = 500000m,
            NgayDat = DateTime.UtcNow.AddDays(-6)
        };
        db.DonThues.Add(don);
        await db.SaveChangesAsync();

        var ct = new ChiTietDonThue
        {
            MaDonThue = don.MaDonThue,
            MaSanPham = seed.SanPham.MaSanPham,
            TenSanPhamLucDat = seed.SanPham.TenSanPham,
            SoLuong = 1,
            SoNgayTinhTien = 3,
            DonGiaThueMoiNgay = 200000m,
            MucCocMoiThietBi = 500000m,
            GiaTriBoiThuongMoiThietBi = 2000000m
        };
        db.ChiTietDonThues.Add(ct);
        await db.SaveChangesAsync();

        var dgSvc = new DanhGiaService(db);
        var gui = await dgSvc.TaoDanhGiaAsync(new TaoDanhGiaRequest
        {
            MaChiTietDon = ct.MaChiTietDon,
            SoSao = 5,
            NoiDung = "Lều rất chắc chắn và sạch sẽ"
        }, seed.KhachTk.MaTaiKhoan);
        Assert.True(gui.ThanhCong);

        // Chống gửi trùng đánh giá trên cùng chi tiết đơn
        var trung = await dgSvc.TaoDanhGiaAsync(new TaoDanhGiaRequest
        {
            MaChiTietDon = ct.MaChiTietDon,
            SoSao = 4,
            NoiDung = "Gửi lại"
        }, seed.KhachTk.MaTaiKhoan);
        Assert.False(trung.ThanhCong);

        // Kiểm duyệt ẩn đánh giá
        var an = await dgSvc.AnDanhGiaAsync(gui.DuLieu!.MaDanhGia, new AnDanhGiaRequest { LyDo = "Kiểm thử ẩn" }, seed.AdminTk.MaTaiKhoan);
        Assert.True(an.ThanhCong);
    }

    [Fact]
    public async Task UC9_3_Va_UC9_4_GuiThongBaoThuCong_Va_DocThongBao()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        var tbSvc = new ThongBaoService(db);
        var gui = await tbSvc.GuiThongBaoThuCongAsync(
            new GuiThongBaoAdminRequest("Thông báo bảo trì", "Hệ thống hoạt động bình thường", seed.KhachTk.MaTaiKhoan),
            seed.AdminTk.MaTaiKhoan);
        Assert.True(gui.ThanhCong);

        var ds = await tbSvc.LayThongBaoCuaToiAsync(new TimThongBaoRequest(), seed.KhachTk.MaTaiKhoan);
        Assert.Single(ds.Items);
    }
}
