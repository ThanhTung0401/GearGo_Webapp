using GearGo.Models.DTOs.Admin;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Models.DTOs.Kho;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.NoiDung;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 6: Quản lý sản phẩm và thiết bị (UC6.1 – UC6.15).
/// </summary>
public class PhanHe6_SanPhamThietBiKhoBaoTriTests
{
    [Fact]
    public async Task UC6_1_Den_UC6_13_DanhMuc_Kho_BaoTri_NghiemThu()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        // UC6.1: Thêm danh mục
        var adminDmSvc = new AdminDanhMucService(db);
        var dmCreated = await adminDmSvc.TaoMoiAsync(new TaoDanhMucRequest { TenDanhMuc = "Bếp dã ngoại", ThuTuHienThi = 2 });
        Assert.NotNull(dmCreated);

        // UC6.10: Tổng quan kho & tìm thiết bị
        var khaDungSvc = new KhaDungService(db);
        var khoSvc = new KhoService(db, khaDungSvc, NullLogger<KhoService>.Instance);
        var tongQuan = await khoSvc.LayTongQuanKhoAsync(new LocKhoRequest(), seed.AdminTk.MaTaiKhoan, laAdmin: true);
        Assert.True(tongQuan.ThanhCong);

        // UC6.12 - UC6.13: Lập phiếu bảo trì và nghiệm thu hoàn thành
        var conflictDetector = new DeviceConflictDetector(db);
        var baoTriSvc = new BaoTriService(db, conflictDetector, NullLogger<BaoTriService>.Instance);

        var lapPhieu = await baoTriSvc.LapPhieuAsync(new LapBaoTriRequest
        {
            MaThietBi = seed.ThietBi1.MaThietBi,
            LoaiXuLy = "SuaChua",
            MoTaLoi = "Rách nhẹ khóa kéo",
            MucDo = "Nhe"
        }, seed.AdminTk.MaTaiKhoan);
        Assert.True(lapPhieu.ThanhCong);

        var phanCong = await baoTriSvc.PhanCongXuLyAsync(
            lapPhieu.DuLieu!.MaPhieuBaoTri,
            new PhanCongBaoTriRequest { MaNguoiXuLy = seed.StaffNv.MaNhanVien },
            seed.AdminTk.MaTaiKhoan);
        Assert.True(phanCong.ThanhCong);

        var tienDo = await baoTriSvc.CapNhatTienDoAsync(
            lapPhieu.DuLieu.MaPhieuBaoTri,
            new CapNhatTienDoRequest { KetQua = "Đã khâu lại khóa kéo", ChiPhi = 50000m },
            seed.StaffTk.MaTaiKhoan);
        Assert.True(tienDo.ThanhCong);

        var guiKt = await baoTriSvc.GuiKiemTraAsync(lapPhieu.DuLieu.MaPhieuBaoTri, seed.StaffTk.MaTaiKhoan);
        Assert.True(guiKt.ThanhCong);

        var nghiemThu = await baoTriSvc.XacNhanHoanThanhAsync(
            lapPhieu.DuLieu.MaPhieuBaoTri,
            new XacNhanBaoTriRequest { KetQuaKiemTra = "Đạt chuẩn sử dụng lại" },
            seed.AdminTk.MaTaiKhoan);
        Assert.True(nghiemThu.ThanhCong);
    }
}
