using GearGo.Integrations.Payments;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements.DonThue;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.TaiChinh;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 5: Quản lý thanh toán và tiền cọc (UC5.1 – UC5.7).
/// </summary>
public class PhanHe5_ThanhToanDoiSoatHoanTienTests
{
    [Fact]
    public async Task UC5_1_ThanhToanXacNhanDon_ThanhCong()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        var don = new DonThue
        {
            MaKhachHang = seed.Khach.MaKhachHang,
            MaChinhSach = seed.ChinhSach.MaChinhSach,
            MaDonHienThi = "DH-TT-01",
            GioNhanDuKien = DateTime.UtcNow.AddDays(2),
            GioTraDuKien = DateTime.UtcNow.AddDays(4),
            TrangThai = TrangThaiDonThue.ChoThanhToan,
            TenNguoiNhan = "Khách Thanh Toán",
            SoDienThoaiNguoiNhan = "0900000003",
            TongTienThueTruocGiam = 400000m,
            TongTienCoc = 500000m,
            NgayDat = DateTime.UtcNow
        };
        db.DonThues.Add(don);
        await db.SaveChangesAsync();

        var lichSu = new LichSuNghiepVuService(db);
        var tbSvc = new ThongBaoService(db);
        var hoanTienSvc = new HoanTienService(
            db,
            new MockRefundGateway(new MockRefundGatewayOptions()),
            lichSu,
            tbSvc,
            TimeProvider.System,
            NullLogger<HoanTienService>.Instance);

        var ttSvc = new ThanhToanService(db, NullLogger<ThanhToanService>.Instance, hoanTienSvc, tbSvc);
        var res = await ttSvc.XacNhanThanhToanAsync(
            new XacNhanThanhToanRequest(don.MaDonThue, "ChuyenKhoan", 900000m, "TXN-TEST-001"));

        Assert.True(res.ThanhCong);
        var donSau = await db.DonThues.FindAsync(don.MaDonThue);
        Assert.Equal(TrangThaiDonThue.DaXacNhan, donSau!.TrangThai);
    }

    [Fact]
    public async Task UC5_2_Den_UC5_4_PhuPhi_Va_DoiSoat_XemTruoc()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        var don = new DonThue
        {
            MaKhachHang = seed.Khach.MaKhachHang,
            MaChinhSach = seed.ChinhSach.MaChinhSach,
            MaDonHienThi = "DH-DS-01",
            GioNhanDuKien = DateTime.UtcNow.AddDays(-2),
            GioTraDuKien = DateTime.UtcNow,
            TrangThai = TrangThaiDonThue.ChoDoiSoat,
            TenNguoiNhan = "Khách Đối Soát",
            SoDienThoaiNguoiNhan = "0900000003",
            TongTienThueTruocGiam = 400000m,
            TongTienCoc = 500000m,
            NgayDat = DateTime.UtcNow.AddDays(-3)
        };
        db.DonThues.Add(don);
        await db.SaveChangesAsync();

        var quaHanSvc = new QuaHanService(db, new KhaDungService(db), new ThongBaoService(db), NullLogger<QuaHanService>.Instance);
        var phuPhiSvc = new PhuPhiService(db, quaHanSvc);
        var dsPhuPhi = await phuPhiSvc.LayDanhSachPhuPhiTheoDonAsync(don.MaDonThue, seed.StaffTk.MaTaiKhoan);
        Assert.True(dsPhuPhi.ThanhCong);

        var hoanTienSvc = new HoanTienService(
            db,
            new MockRefundGateway(new MockRefundGatewayOptions()),
            new LichSuNghiepVuService(db),
            new ThongBaoService(db),
            TimeProvider.System,
            NullLogger<HoanTienService>.Instance);
        var ttSvc = new ThanhToanService(db, NullLogger<ThanhToanService>.Instance, hoanTienSvc, new ThongBaoService(db));
        var doiSoatSvc = new DoiSoatService(db, ttSvc, hoanTienSvc);

        var xemTruoc = await doiSoatSvc.XemTruocAsync(don.MaDonThue, seed.StaffTk.MaTaiKhoan);
        Assert.True(xemTruoc.ThanhCong);
    }
}
