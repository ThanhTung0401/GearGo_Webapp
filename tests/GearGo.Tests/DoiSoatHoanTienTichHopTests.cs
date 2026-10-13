using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Tích hợp W4-T4 (DoiSoatService — Kim Xuyến) với W4-T6 (HoanTienService): đối soát lập hoàn qua service dùng chung,
/// không tự tạo HOAN_TIEN; phụ phí đã duyệt (DaDuyet của PhuPhiService) được trừ khỏi cọc.
/// </summary>
public class DoiSoatHoanTienTichHopTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;

    public DoiSoatHoanTienTichHopTests()
    {
        using var ctx = _db.NewContext();
        _du = Seed.CoBan(ctx);
    }

    public void Dispose() => _db.Dispose();

    private static DoiSoatService DoiSoat(PhamVi s) => new(s.Ctx, new ThanhToanService(s.Ctx), s.HoanTien);

    private (Seed.DonMau Don, long MaDoiSoat) DonChoDoiSoat(decimal canHoan)
    {
        using var ctx = _db.NewContext();
        var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-5), TrangThaiDonThue.ChoDoiSoat, 600_000, 1_000_000);
        var ds = Seed.DoiSoat(ctx, _du, don.MaDon, 1_000_000, 1_000_000 - canHoan, canHoan, 0, "ChoXuLyTien", _db.Clock.Utc, null);
        ctx.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat { MaDoiSoat = ds, MaChiTietThanhToan = don.NguonCoc!.Value });
        ctx.SaveChanges();
        return (don, ds);
    }

    [Fact]
    public async Task XemTruoc_TruPhuPhiDaDuyet()
    {
        Seed.DonMau don;
        using (var ctx = _db.NewContext())
        {
            don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-5), TrangThaiDonThue.ChoDoiSoat, 600_000, 1_000_000);
            Seed.PhuPhi(ctx, _du, don.MaDon, 200_000, "DaDuyet");
        }
        using var s = _db.Mo();
        var kq = await DoiSoat(s).XemTruocAsync(don.MaDon, _du.TkNhanVien);
        Assert.True(kq.ThanhCong);
        Assert.Equal(200_000, kq.DuLieu!.TongPhuPhiDuocDuyet);
        Assert.Equal(800_000, kq.DuLieu.SoTienCanHoan);
    }

    [Fact]
    public async Task YeuCauXuLyTien_LapHoanQuaHoanTienService_BamLaiKhongLapThem()
    {
        var (don, ds) = DonChoDoiSoat(800_000);

        using (var s = _db.Mo())
        {
            var kq = await DoiSoat(s).YeuCauXuLyTienAsync(ds, _du.TkNhanVien);
            Assert.True(kq.ThanhCong, kq.ThongDiep);
            Assert.Equal("DangXuLyTien", kq.DuLieu!.TrangThai);
        }
        using (var s = _db.Mo())
            Assert.True((await DoiSoat(s).YeuCauXuLyTienAsync(ds, _du.TkNhanVien)).ThanhCong);

        using var kt = _db.Mo();
        var h = await kt.Ctx.HoanTiens.SingleAsync();
        Assert.Equal($"HT:DS:{ds}:{don.NguonCoc}:L1", h.MaYeuCau);
        Assert.Equal(LoaiHoanTien.HoanCocDoiSoat, h.LoaiHoan);
        Assert.Equal(ds, h.MaDoiSoat);
        Assert.Equal(800_000, h.SoTien);
        Assert.Equal(TrangThaiHoanTien.ThanhCong, h.TrangThai); // gửi gateway sau commit
        Assert.Single(_db.Gateway.DaGui);
    }

    [Fact]
    public async Task YeuCauXuLyTien_NguonDaBiGiuBoiKhoanKhac_VuotHanMuc_KhongDoiTrangThai()
    {
        var (don, ds) = DonChoDoiSoat(800_000);
        using (var ctx = _db.NewContext())
            Seed.Hoan(ctx, don.NguonCoc!.Value, 300_000, TrangThaiHoanTien.DangXuLy); // thu thừa đang hoàn trên cùng nguồn

        using (var s = _db.Mo())
        {
            var kq = await DoiSoat(s).YeuCauXuLyTienAsync(ds, _du.TkNhanVien);
            Assert.False(kq.ThanhCong);
            Assert.Equal("VUOT_HAN_MUC_HOAN", kq.MaLoi);
        }

        using var kt = _db.Mo();
        Assert.Equal(1, await kt.Ctx.HoanTiens.CountAsync());
        Assert.Equal("ChoXuLyTien", (await kt.Ctx.DoiSoatTienCocs.SingleAsync(d => d.MaDoiSoat == ds)).TrangThai);
    }

    [Fact]
    public async Task Chot_KhiHoanConDangXuLy_BiChan()
    {
        var (_, ds) = DonChoDoiSoat(800_000);
        _db.Gateway.MacDinh = GatewayGia.DaTiepNhan;
        using (var s = _db.Mo())
            Assert.True((await DoiSoat(s).YeuCauXuLyTienAsync(ds, _du.TkNhanVien)).ThanhCong);

        using var s2 = _db.Mo();
        var chot = await DoiSoat(s2).ChotDoiSoatAsync(ds, _du.TkNhanVien);
        Assert.False(chot.ThanhCong);
        Assert.Contains("đang chờ", chot.ThongDiep);
    }
}
