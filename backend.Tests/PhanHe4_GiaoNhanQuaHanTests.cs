using GearGo.Models.DTOs.BanGiao;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements.DonThue;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.Kho;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 4: Quản lý giao nhận (UC4.1 – UC4.5).
/// </summary>
public class PhanHe4_GiaoNhanQuaHanTests
{
    [Fact]
    public async Task UC4_1_Den_UC4_5_ChuanBi_PhanCong_BanGiao_QuaHan_TraCuuVanHanh()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        var don = new DonThue
        {
            MaKhachHang = seed.Khach.MaKhachHang,
            MaChinhSach = seed.ChinhSach.MaChinhSach,
            MaDonHienThi = "DH-0001",
            GioNhanDuKien = DateTime.UtcNow.AddHours(-2),
            GioTraDuKien = DateTime.UtcNow.AddDays(2),
            TrangThai = TrangThaiDonThue.DaXacNhan,
            TenNguoiNhan = "Khách Test",
            SoDienThoaiNguoiNhan = "0900000003",
            TongTienThueTruocGiam = 400000m,
            TongTienCoc = 500000m,
            NgayDat = DateTime.UtcNow.AddDays(-1)
        };
        db.DonThues.Add(don);
        await db.SaveChangesAsync();

        var ct = new ChiTietDonThue
        {
            MaDonThue = don.MaDonThue,
            MaSanPham = seed.SanPham.MaSanPham,
            TenSanPhamLucDat = seed.SanPham.TenSanPham,
            SoLuong = 1,
            SoNgayTinhTien = 2,
            DonGiaThueMoiNgay = 200000m,
            MucCocMoiThietBi = 500000m,
            GiaTriBoiThuongMoiThietBi = 2000000m
        };
        db.ChiTietDonThues.Add(ct);
        db.ThanhToans.Add(new ThanhToan
        {
            MaDonThue = don.MaDonThue,
            MaYeuCau = "TT-PH4-001",
            PhuongThuc = "ChuyenKhoan",
            TongSoTien = 900000m,
            TrangThai = "ThanhCong",
            ThoiDiemTao = DateTime.UtcNow.AddDays(-1)
        });
        await db.SaveChangesAsync();

        // UC4.1: Chuẩn bị & phân công thiết bị
        var lichSu = new LichSuNghiepVuService(db);
        var tbSvc = new ThietBiService(db);
        var tbSvcNotify = new ThongBaoService(db);
        var chuanBiSvc = new ChuanBiDonService(db, tbSvc, lichSu, tbSvcNotify);

        var batDau = await chuanBiSvc.BatDauChuanBiAsync(don.MaDonThue, seed.StaffTk.MaTaiKhoan);
        Assert.True(batDau.ThanhCong);

        var phanCong = await chuanBiSvc.GanThietBiAsync(
            don.MaDonThue,
            new GanThietBiRequest { DongDonId = ct.MaChiTietDon, ThietBiIds = new List<long> { seed.ThietBi1.MaThietBi } },
            seed.StaffTk.MaTaiKhoan);
        Assert.True(phanCong.ThanhCong);

        var sanSang = await chuanBiSvc.XacNhanSanSangAsync(
            don.MaDonThue,
            new XacNhanSanSangRequest { GhiChu = "Đủ thiết bị" },
            seed.StaffTk.MaTaiKhoan);
        Assert.True(sanSang.ThanhCong);

        // UC4.2: Bàn giao thiết bị
        var banGiaoSvc = new BanGiaoService(db, NullLogger<BanGiaoService>.Instance);
        var bgNhap = await banGiaoSvc.TaoHoacLayPhieuBanGiaoNhapAsync(don.MaDonThue, seed.StaffTk.MaTaiKhoan);
        Assert.True(bgNhap.ThanhCong);

        var capNhatBg = await banGiaoSvc.CapNhatPhieuBanGiaoNhapAsync(
            bgNhap.DuLieu!.MaPhieuBanGiao,
            new CapNhatPhieuBanGiaoRequest(
                "Khách Test",
                DateTime.UtcNow,
                "{\"signature\":\"ok\"}",
                "Đủ phụ kiện",
                bgNhap.DuLieu.ChiTiet.Select(x => new CapNhatChiTietBanGiaoRequest(x.MaPhanCong, "Tot", null, null, null)).ToList()));
        Assert.True(capNhatBg.ThanhCong);

        var chotBg = await banGiaoSvc.ChotBanGiaoAsync(
            bgNhap.DuLieu.MaPhieuBanGiao,
            new ChotBanGiaoRequest("Khách Test"),
            seed.StaffTk.MaTaiKhoan);
        Assert.True(chotBg.ThanhCong, $"{chotBg.MaLoi}: {chotBg.ThongDiep}");

        // UC4.5: Tra cứu đơn cho vận hành
        var truyVanSvc = new TruyVanDonThueService(db, TimeProvider.System);
        var dsVanHanh = await truyVanSvc.TimDonVanHanhAsync(new TimDonVanHanhRequest(), seed.StaffTk.MaTaiKhoan);
        Assert.Single(dsVanHanh.Items);

        // UC4.4: Xử lý đơn quá hạn
        don.GioTraDuKien = DateTime.UtcNow.AddHours(-5);
        await db.SaveChangesAsync();

        var quaHanSvc = new QuaHanService(db, new KhaDungService(db), tbSvcNotify, NullLogger<QuaHanService>.Instance);
        var dsQuaHan = await quaHanSvc.LayDonQuaHanAsync(new LocQuaHanRequest(), seed.StaffTk.MaTaiKhoan);
        Assert.True(dsQuaHan.ThanhCong);
        Assert.Single(dsQuaHan.DuLieu!.Items);
    }
}
