using GearGo.Models.Entities;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.NoiDung;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

public class AllModulesTests
{
    [Fact]
    public async Task ChinhSachService_LayDangHieuLuc_KhiChuaCoChinhSach_TraVeLoiNghiepVu()
    {
        await using var db = TestDbFactory.CreateDb();
        var service = new ChinhSachService(db, NullLogger<ChinhSachService>.Instance);

        var res = await service.LayDangHieuLucAsync(DateTime.UtcNow);
        Assert.False(res.ThanhCong);
        Assert.Equal("CHUA_CO_CHINH_SACH_HIEU_LUC", res.MaLoi);
    }

    [Fact]
    public async Task ThongBaoService_LayDanhSach_TraVeRongKhiChuaCoThongBao()
    {
        await using var db = TestDbFactory.CreateDb();
        var khach = new TaiKhoan
        {
            Email = "tb@geargo.vn",
            MatKhauBam = "hash",
            VaiTro = "KhachHang",
            TrangThai = "HoatDong"
        };
        db.TaiKhoans.Add(khach);
        await db.SaveChangesAsync();

        var service = new ThongBaoService(db);
        var res = await service.LayThongBaoCuaToiAsync(new Models.DTOs.ThongBao.TimThongBaoRequest(), khach.MaTaiKhoan);

        Assert.NotNull(res);
        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task NhaCungCapService_TraCuu_KhiTrongTraVeDanhSachRong()
    {
        await using var db = TestDbFactory.CreateDb();
        var service = new NhaCungCapService(db, NullLogger<NhaCungCapService>.Instance);

        var res = await service.TimKiemAsync(null, null);
        Assert.NotNull(res);
        Assert.Empty(res.Items);
    }
}
