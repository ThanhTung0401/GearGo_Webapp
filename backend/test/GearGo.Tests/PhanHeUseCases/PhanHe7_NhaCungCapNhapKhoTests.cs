using GearGo.Models.DTOs.NhaCungCap;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.Enums;
using GearGo.Services.Implements.Kho;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 7: Quản lý nhà cung cấp và nhập hàng (UC7.1 – UC7.10).
/// </summary>
public class PhanHe7_NhaCungCapNhapKhoTests
{
    [Fact]
    public async Task UC7_1_Den_UC7_7_NhaCungCap_PhieuNhap_XacNhanNhapKho()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);

        // UC7.1: Thêm NCC
        var nccSvc = new NhaCungCapService(db, NullLogger<NhaCungCapService>.Instance);
        var nccRes = await nccSvc.TaoAsync(new TaoNhaCungCapRequest
        {
            MaHienThi = "NCC-MB-01",
            Ten = "NCC Dã Ngoại Miền Bắc",
            SoDienThoai = "0243888999",
            Email = "nccbac@geargo.vn"
        }, seed.AdminTk.MaTaiKhoan);
        Assert.NotNull(nccRes);

        // UC7.5: Lập phiếu nhập nháp & thêm dòng
        var pnSvc = new PhieuNhapService(db, NullLogger<PhieuNhapService>.Instance);
        var phieu = await pnSvc.TaoNhapAsync(new TaoPhieuNhapRequest
        {
            MaNhaCungCap = seed.NhaCungCap.MaNhaCungCap,
            NgayNhapDuKien = DateTime.UtcNow.AddDays(1),
            SoChungTuNhaCungCap = "HD-NCC-2026"
        }, seed.AdminTk.MaTaiKhoan);

        var themDong = await pnSvc.ThemDongAsync(phieu.MaPhieuNhap, new DongNhapRequest
        {
            MaSanPham = seed.SanPham.MaSanPham,
            SoLuong = 2,
            DonGiaNhap = 950000m,
            TinhTrangKhiNhap = "Moi"
        }, seed.AdminTk.MaTaiKhoan);
        Assert.Single(themDong.ChiTietPhieuNhaps);

        // UC7.7: Xác nhận nhập kho & sinh mã thiết bị một lần
        var nhapKhoSvc = new NhapKhoService(db);
        var dongId = themDong.ChiTietPhieuNhaps[0].MaChiTietPhieuNhap;
        var xn = await nhapKhoSvc.XacNhanNhapKhoAsync(phieu.MaPhieuNhap, new XacNhanNhapKhoRequest
        {
            NgayNhapThucTe = DateTimeOffset.UtcNow,
            DanhSachDong = new List<DongXacNhanNhap>
            {
                new()
                {
                    MaChiTietPhieuNhap = dongId,
                    ThietBi = new List<ThietBiNhap>
                    {
                        new() { MaHienThi = "TB-NEW-001", TinhTrang = "Moi" },
                        new() { MaHienThi = "TB-NEW-002", TinhTrang = "Moi" }
                    }
                }
            }
        }, seed.AdminTk.MaTaiKhoan);

        Assert.True(xn.ThanhCong);
        var phieuSau = await db.PhieuNhapHangs.FindAsync(phieu.MaPhieuNhap);
        Assert.Equal(TrangThaiPhieuNhap.DaNhapKho, phieuSau!.TrangThai);
    }
}
