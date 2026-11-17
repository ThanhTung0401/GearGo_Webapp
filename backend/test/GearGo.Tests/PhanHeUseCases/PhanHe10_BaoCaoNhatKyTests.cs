using GearGo.Integrations.Payments;
using GearGo.Models.DTOs.BaoCao;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.TaiChinh;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 10: Báo cáo và tra cứu lịch sử (UC10.1 – UC10.4).
/// </summary>
public class PhanHe10_BaoCaoNhatKyTests
{
    [Fact]
    public async Task UC10_1_Den_UC10_3_BaoCaoVanHanh_TaiChinh_NhapHang()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        // UC10.1: Báo cáo vận hành
        var vhSvc = new BaoCaoVanHanhService(db);
        var bcVh = await vhSvc.LayBaoCaoVanHanhAsync(new BoLocBaoCaoRequest(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow.AddDays(1), null, null));
        Assert.NotNull(bcVh);

        // UC10.2: Báo cáo doanh thu & dòng tiền
        var hoanTienSvc = new HoanTienService(
            db,
            new MockRefundGateway(new MockRefundGatewayOptions()),
            new LichSuNghiepVuService(db),
            new ThongBaoService(db),
            TimeProvider.System,
            NullLogger<HoanTienService>.Instance);
        var ttSvc = new ThanhToanService(db, NullLogger<ThanhToanService>.Instance, hoanTienSvc, new ThongBaoService(db));
        var doiSoatSvc = new DoiSoatService(db, ttSvc, hoanTienSvc);
        var tcSvc = new BaoCaoTaiChinhService(db, doiSoatSvc, TimeProvider.System);

        var thuHoan = await tcSvc.LayThuHoanAsync(new LocTaiChinhRequest(), seed.AdminTk.MaTaiKhoan);
        Assert.True(thuHoan.ThanhCong);

        // UC10.3: Báo cáo nhập hàng
        var khoSvc = new KhoService(db, new KhaDungService(db), NullLogger<KhoService>.Instance);
        var bcKhoSvc = new BaoCaoKhoService(db, khoSvc, TimeProvider.System);
        var nhapHang = await bcKhoSvc.LayNhapHangAsync(new LocNhapHangRequest(), seed.AdminTk.MaTaiKhoan);
        Assert.True(nhapHang.ThanhCong);
        Assert.Equal(1, nhapHang.DuLieu!.TongSoPhieu);

        // UC10.4: Tra cứu nhật ký thao tác
        db.NhatKyThaoTacs.Add(new Models.Entities.NhatKyThaoTac
        {
            MaTaiKhoan = seed.AdminTk.MaTaiKhoan,
            HanhDong = "TAO_CHINH_SACH",
            LoaiDoiTuong = "CHINH_SACH",
            MaDoiTuong = seed.ChinhSach.MaChinhSach.ToString(),
            ThoiDiem = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var nkSvc = new NhatKyService(db);
        var nkAdmin = await nkSvc.TraCuuAsync(seed.AdminTk.MaTaiKhoan, null, null, null, null, null, null, null);
        Assert.Single(nkAdmin.Items);
        var nkStaff = await nkSvc.TraCuuAsync(seed.StaffTk.MaTaiKhoan, null, null, null, null, null, null, null);
        Assert.Empty(nkStaff.Items);
    }
}
