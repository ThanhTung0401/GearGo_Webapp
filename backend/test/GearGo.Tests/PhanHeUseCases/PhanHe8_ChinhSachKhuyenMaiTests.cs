using GearGo.Models.DTOs.ChinhSach;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Models.Enums;
using GearGo.Services.Implements.KhuyenMai;
using GearGo.Services.Implements.NoiDung;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 8: Quản lý chính sách và khuyến mãi (UC8.1 – UC8.5).
/// </summary>
public class PhanHe8_ChinhSachKhuyenMaiTests
{
    [Fact]
    public async Task UC8_1_CauHinhChinhSach_TaoPhienBanMoiThanhCong()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        var csSvc = new ChinhSachService(db, NullLogger<ChinhSachService>.Instance);

        var res = await csSvc.TaoPhienBanAsync(new TaoChinhSachRequest
        {
            TenChinhSach = "Chính sách v2",
            ThoiDiemApDung = DateTime.UtcNow.AddDays(1),
            NoiDung = new NoiDungChinhSachDto
            {
                ThoiGianGiuChoPhut = 30,
                HeSoTre = 1.5m,
                TyLeCocPhanTram = 50m,
                HanMucNhanVien = 500000m,
                HuyDon = new NoiDungChinhSachDto.HuyDonDto
                {
                    TyLeGiuLaiTu24Den48Gio = 0.2m,
                    TyLeGiuLaiDuoi24Gio = 0.5m
                },
                KhongDenNhan = new NoiDungChinhSachDto.KhongDenNhanDto
                {
                    SoPhutChoSauGioNhan = 60,
                    TyLeGiuLaiTienThue = 1.0m
                }
            }
        }, seed.AdminTk.MaTaiKhoan);

        Assert.True(res.ThanhCong);
        Assert.Equal(2, res.DuLieu!.PhienBan);
    }

    [Fact]
    public async Task UC8_2_Den_UC8_5_Them_TraCuu_NgungKhuyenMai()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        var kmSvc = new QuanTriKhuyenMaiService(db);

        var tao = await kmSvc.TaoAsync(new TaoKhuyenMaiRequest
        {
            MaGiamGia = "CAMP2026",
            TenKhuyenMai = "Giảm giá mùa cắm trại",
            LoaiGiam = LoaiKhuyenMai.PhanTram,
            GiaTriGiam = 15m,
            MucGiamToiDa = 100000m,
            TienThueToiThieu = 200000m,
            BatDau = DateTime.UtcNow.AddDays(-1),
            KetThuc = DateTime.UtcNow.AddDays(30),
            GioiHanTongLuot = 50
        }, seed.AdminTk.MaTaiKhoan);
        Assert.True(tao.ThanhCong);

        var traCuu = await kmSvc.TimKiemAsync(new TimKiemKhuyenMaiRequest { TuKhoa = "CAMP2026" });
        Assert.True(traCuu.ThanhCong);
        Assert.Single(traCuu.DuLieu!.Items);

        var tamAn = await kmSvc.TamAnAsync(tao.DuLieu!.MaKhuyenMai, new DoiHienThiKhuyenMaiRequest { LyDo = "Hết ngân sách" }, seed.AdminTk.MaTaiKhoan);
        Assert.True(tamAn.ThanhCong);
    }
}
