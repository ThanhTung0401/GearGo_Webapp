using GearGo.Exceptions;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Enums;
using GearGo.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GearGo.Tests;

/// <summary>W4-T9 — theo dõi đơn: nhận trả nhiều đợt, phí, đối soát, thu/hoàn và thông báo sự kiện.</summary>
public class TheoDoiDonTaiChinhTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;

    public TheoDoiDonTaiChinhTests()
    {
        using var ctx = _db.NewContext();
        _du = Seed.CoBan(ctx);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task A01_BaDotNhan_BonPhi_HaiNguonCoc_HaiHoan_TongKhongBiNhan()
    {
        Seed.DonMau don;
        using (var ctx = _db.NewContext())
        {
            don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-3), TrangThaiDonThue.ChoDoiSoat, 600_000, 1_000_000, soLuong: 4);
            var nguonCoc2 = Seed.Nguon(ctx, don.MaDon, MucDichThanhToan.TienCoc, 500_000);
            var tb = Seed.BanGiao(ctx, _du, don.MaDon, don.MaChiTietDon, 4, daGiao: true);
            Seed.NhanTra(ctx, _du, don.MaDon, 1, true, (tb[0].MaChiTietBanGiao, "Bình thường", false), (tb[1].MaChiTietBanGiao, "Bình thường", false));
            Seed.NhanTra(ctx, _du, don.MaDon, 2, true, (tb[2].MaChiTietBanGiao, "Hỏng nhẹ", false));
            Seed.NhanTra(ctx, _du, don.MaDon, 3, true, (tb[3].MaChiTietBanGiao, "Mất thiết bị", true));
            Seed.PhuPhi(ctx, _du, don.MaDon, 100_000, "DaDuyet");
            Seed.PhuPhi(ctx, _du, don.MaDon, 200_000, "DaDuyet", loai: "PhiSuaChua");
            Seed.PhuPhi(ctx, _du, don.MaDon, 300_000, "ChoDuyet");
            Seed.PhuPhi(ctx, _du, don.MaDon, 50_000, "TuChoi");
            Seed.Hoan(ctx, don.NguonCoc!.Value, 400_000, TrangThaiHoanTien.ThanhCong, "HT:DS:9:1:L1");
            Seed.Hoan(ctx, nguonCoc2, 250_000, TrangThaiHoanTien.ChoXuLy, "HT:DS:9:2:L1");
        }

        using var s = _db.Mo();
        var nv = await s.TruyVan.LayChiTietDonVanHanhAsync(don.MaDon, _du.TkNhanVien);
        var tc = nv.Don.TaiChinh;

        Assert.Equal(4, tc.NhanTra.TongThietBiDaGiao);
        Assert.Equal(3, tc.NhanTra.SoDaTra);
        Assert.Equal(1, tc.NhanTra.SoDaKetLuanMat);
        Assert.Equal(0, tc.NhanTra.SoConNo);
        Assert.Equal(new[] { 1, 2, 3 }, tc.NhanTra.CacDot.Select(d => d.LanTra));
        Assert.Equal(new[] { 2, 1, 0 }, tc.NhanTra.CacDot.Select(d => d.SoThietBiTra));

        Assert.Equal(300_000, tc.PhuPhi.TongDaDuyet);
        Assert.Equal(300_000, tc.PhuPhi.TongDeNghi);
        Assert.Equal(50_000, tc.PhuPhi.TongTuChoi);
        Assert.Equal(4, tc.PhuPhi.Items.Count);

        Assert.Equal(600_000, tc.Thu.TienThueDaThu);
        Assert.Equal(1_500_000, tc.Thu.TienCocDaThu);
        Assert.Equal(0, tc.Thu.ChuaPhanLoai);
        Assert.Equal(400_000, tc.Hoan.DaHoan);
        Assert.Equal(250_000, tc.Hoan.DuKien);
        Assert.Equal(2, tc.Hoan.Items.Count);
        Assert.Contains("ChoHoanTien", tc.Nhan);
        Assert.Contains(nv.ViecCanXuLy, v => v.Contains("Duyệt phụ phí"));

        // Khách: không thấy phí chờ duyệt/từ chối; tổng tiền vẫn đúng.
        var khach = await s.TruyVan.LayChiTietDonCuaToiAsync(don.MaDon, _du.TkKhachA);
        Assert.Equal(2, khach.TaiChinh.PhuPhi.Items.Count);
        Assert.Equal(0, khach.TaiChinh.PhuPhi.TongDeNghi);
        Assert.Equal(300_000, khach.TaiChinh.PhuPhi.TongDaDuyet);
        Assert.Equal(1_500_000, khach.TaiChinh.Thu.TienCocDaThu);
    }

    [Fact]
    public async Task A02_HoanDangChoTrenDonDaTraDu_KhachThayChoHoan_KhongThayDaHoan()
    {
        Seed.DonMau don;
        using (var ctx = _db.NewContext())
        {
            don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-3), TrangThaiDonThue.ChoDoiSoat);
            var tb = Seed.BanGiao(ctx, _du, don.MaDon, don.MaChiTietDon, 1, daGiao: true);
            Seed.NhanTra(ctx, _du, don.MaDon, 1, true, (tb[0].MaChiTietBanGiao, "Bình thường", false));
            Seed.DoiSoat(ctx, _du, don.MaDon, 1_000_000, 0, 1_000_000, 0, "DaXacNhan", _db.Clock.Utc, null);
            Seed.Hoan(ctx, don.NguonCoc!.Value, 1_000_000, TrangThaiHoanTien.DangXuLy, "HT:DS:1:1:L1", loai: LoaiHoanTien.HoanCocDoiSoat);
        }

        using var s = _db.Mo();
        var d = await s.TruyVan.LayChiTietDonCuaToiAsync(don.MaDon, _du.TkKhachA);
        Assert.Equal("ChoDoiSoat", d.TrangThai);
        Assert.Equal(0, d.TaiChinh.Hoan.DaHoan);
        Assert.Equal(1_000_000, d.TaiChinh.Hoan.DangXuLy);
        Assert.Equal("DangXuLy", d.HoanTien.Single().NhanHienThi);
        Assert.Contains("ChoHoanTien", d.TaiChinh.Nhan);
        Assert.Null(d.TaiChinh.ThoiDiemHoanTat);
        Assert.Equal(1_000_000, d.TaiChinh.DoiSoat.Single().SoTienCanHoan); // số cần hoàn ≠ đã hoàn
    }

    [Fact]
    public async Task A03_DieuChinhSauHoanTat_PhanBietGocVaBoSung_GiuNgayHoanTat()
    {
        var hoanTat = _db.Clock.Utc.AddDays(-2);
        Seed.DonMau don;
        using (var ctx = _db.NewContext())
        {
            don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-10), TrangThaiDonThue.HoanTat);
            var d = ctx.DonThues.Single(x => x.MaDonThue == don.MaDon);
            d.ThoiDiemHoanTat = hoanTat;
            ctx.SaveChanges();
            var goc = Seed.DoiSoat(ctx, _du, don.MaDon, 1_000_000, 200_000, 800_000, 0, "DaChot", hoanTat.AddHours(-1), hoanTat.AddHours(-1));
            Seed.DoiSoat(ctx, _du, don.MaDon, 0, -50_000, 50_000, 0, "ChoChot", _db.Clock.Utc.AddDays(-1), null, goc);
        }

        using var s = _db.Mo();
        var tc = (await s.TruyVan.LayChiTietDonCuaToiAsync(don.MaDon, _du.TkKhachA)).TaiChinh;
        Assert.Equal(hoanTat, tc.ThoiDiemHoanTat);
        Assert.True(tc.CoDieuChinhSauHoanTat);
        Assert.Equal(new[] { false, true }, tc.DoiSoat.Select(x => x.LaDieuChinh));
        Assert.Equal(tc.DoiSoat[0].MaDoiSoat, tc.DoiSoat[1].MaDoiSoatGoc);
    }

    [Fact]
    public async Task TraMotPhan_QuaHan_DangXuLyMat_TheoDuLieuThat()
    {
        Seed.DonMau don;
        using (var ctx = _db.NewContext())
        {
            don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-3), TrangThaiDonThue.DangThue, soLuong: 3); // trả dự kiến = nhận + 2 ngày → đã quá
            var tb = Seed.BanGiao(ctx, _du, don.MaDon, don.MaChiTietDon, 3, daGiao: true);
            Seed.NhanTra(ctx, _du, don.MaDon, 1, true, (tb[0].MaChiTietBanGiao, "Bình thường", false), (tb[1].MaChiTietBanGiao, "Bình thường", false));
            Seed.NhanTra(ctx, _du, don.MaDon, 2, false, (tb[2].MaChiTietBanGiao, "Mất thiết bị", false)); // nháp, chưa duyệt mất
        }

        using var s = _db.Mo();
        var tc = (await s.TruyVan.LayChiTietDonCuaToiAsync(don.MaDon, _du.TkKhachA)).TaiChinh;
        Assert.Equal(1, tc.NhanTra.SoConNo);
        Assert.True(tc.NhanTra.ThietBiConNo.Single().DangXuLyMat);
        Assert.Single(tc.NhanTra.CacDot); // chỉ đợt đã chốt
        Assert.Contains("TraMotPhan", tc.Nhan);
        Assert.Contains("QuaHan", tc.Nhan);
        Assert.Contains("DangXuLyMat", tc.Nhan);
    }

    [Fact]
    public async Task DonHuy_HienPhiGiuLaiVaTungKhoanHoan_ThaoTacKhachDung()
    {
        Seed.DonMau don, donCho;
        using (var ctx = _db.NewContext())
        {
            don = Seed.Don(ctx, _du, _db.Clock.Utc.AddHours(72), TrangThaiDonThue.DaXacNhan);
            donCho = Seed.Don(ctx, _du, _db.Clock.Utc.AddHours(72), TrangThaiDonThue.DaXacNhan);
        }
        string dau;
        using (var s = _db.Mo())
            dau = (await s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachA, LoaiHuyDon.KhachHuy)).DauVanTay;
        using (var s = _db.Mo())
            await s.HuyDon.KhachHuyAsync(don.MaDon, new("Đổi kế hoạch", true, dau), _du.TkKhachA);

        using var kt = _db.Mo();
        var d = await kt.TruyVan.LayChiTietDonCuaToiAsync(don.MaDon, _du.TkKhachA);
        Assert.NotNull(d.TaiChinh.Huy);
        Assert.Equal("KhachHuy", d.TaiChinh.Huy!.LoaiHuy);
        Assert.Equal("Đổi kế hoạch", d.TaiChinh.Huy.LyDo);
        Assert.Equal(2, d.TaiChinh.Hoan.Items.Count);
        Assert.Equal(1_600_000, d.TaiChinh.Hoan.DaHoan);
        Assert.DoesNotContain("HuyDon", d.ThaoTacKhaDung);
        Assert.Contains(d.LichSu, l => l.TrangThaiSau == "KhachHuy" && l.LyDo == "Đổi kế hoạch");

        var cho = await kt.TruyVan.LayChiTietDonCuaToiAsync(donCho.MaDon, _du.TkKhachA);
        Assert.Contains("XemTruocHuy", cho.ThaoTacKhaDung);
        Assert.Contains("HuyDon", cho.ThaoTacKhaDung);

        await Assert.ThrowsAsync<DonKhongTimThayException>(() => kt.TruyVan.LayChiTietDonCuaToiAsync(don.MaDon, _du.TkKhachB));
    }

    [Fact]
    public async Task ThongBaoSuKien_MaTheoChungTu_DotHaiKhongBiBoQua_GoiLaiKhongTrung()
    {
        Seed.DonMau don;
        using (var ctx = _db.NewContext())
            don = Seed.Don(ctx, _du, _db.Clock.Utc, TrangThaiDonThue.DangThue);

        using (var s = _db.Mo())
        {
            await using var tx = await s.Ctx.Database.BeginTransactionAsync();
            await s.ThongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(don.MaDon, LoaiSuKienThongBao.NhanTra, MaSuKienThongBao.NhanTra(101), "Đã nhận đợt 1", null));
            await s.ThongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(don.MaDon, LoaiSuKienThongBao.NhanTra, MaSuKienThongBao.NhanTra(101), "Đã nhận đợt 1", null));
            await s.ThongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(don.MaDon, LoaiSuKienThongBao.NhanTra, MaSuKienThongBao.NhanTra(102), "Đã nhận đợt 2", null));
            await s.Ctx.SaveChangesAsync();
            await tx.CommitAsync();
        }
        using (var s = _db.Mo())
        {
            await s.ThongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(don.MaDon, LoaiSuKienThongBao.NhanTra, MaSuKienThongBao.NhanTra(102), "Đã nhận đợt 2", null));
            await s.Ctx.SaveChangesAsync();
        }

        using var kt = _db.Mo();
        var tbs = await kt.Ctx.ThongBaos.Where(t => t.MaDonThue == don.MaDon).ToListAsync();
        Assert.Equal(2, tbs.Count);
        Assert.All(tbs, t => Assert.Equal("ChuaGui", t.TrangThaiGui)); // chỉ lưu trong ứng dụng; email Week 5
    }

    [Fact]
    public async Task ThongBaoTrongTransaction_RollbackThiMat()
    {
        Seed.DonMau don;
        using (var ctx = _db.NewContext())
            don = Seed.Don(ctx, _du, _db.Clock.Utc, TrangThaiDonThue.DangThue);

        using (var s = _db.Mo())
        {
            await using var tx = await s.Ctx.Database.BeginTransactionAsync();
            await s.ThongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(don.MaDon, LoaiSuKienThongBao.PhuPhi, MaSuKienThongBao.PhuPhi(1, "DaDuyet"), "Phụ phí", null));
            await s.Ctx.SaveChangesAsync();
            await tx.RollbackAsync();
        }
        using var kt = _db.Mo();
        Assert.Equal(0, await kt.Ctx.ThongBaos.CountAsync());
    }
}
