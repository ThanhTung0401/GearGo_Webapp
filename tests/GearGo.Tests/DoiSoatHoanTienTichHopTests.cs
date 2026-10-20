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

    [Fact]
    public async Task YeuCauXuLyTien_CanThuThem_GoiThanhToanService_KhongBiLoiNestedTransaction()
    {
        // Setup đối soát có P > C (ví dụ cọc 1.000.000, phụ phí 1.200.000 => cần thu thêm 200.000)
        long maDoiSoat;
        using (var ctx = _db.NewContext())
        {
            var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-5), TrangThaiDonThue.ChoDoiSoat, 600_000, 1_000_000);
            maDoiSoat = Seed.DoiSoat(ctx, _du, don.MaDon, 1_000_000, 1_200_000, 0, 200_000, "ChoXuLyTien", _db.Clock.Utc, null);
            ctx.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat { MaDoiSoat = maDoiSoat, MaChiTietThanhToan = don.NguonCoc!.Value });
            ctx.SaveChanges();
        }

        using (var s = _db.Mo())
        {
            var kq = await DoiSoat(s).YeuCauXuLyTienAsync(maDoiSoat, _du.TkNhanVien);
            Assert.True(kq.ThanhCong, kq.ThongDiep);
            Assert.Equal("DangXuLyTien", kq.DuLieu!.TrangThai);
        }

        using var kt = _db.Mo();
        var tt = await kt.Ctx.ThanhToans.Include(t => t.ChiTietThanhToans).FirstOrDefaultAsync(t => t.GhiChu!.Contains($"DoiSoat_{maDoiSoat}"));
        Assert.NotNull(tt);
        Assert.Equal(200_000, tt.TongSoTien);
        Assert.Equal("ChoThanhToan", tt.TrangThai);
        Assert.Equal(MucDichThanhToan.ThuBoSung, tt.ChiTietThanhToans.First().MucDich);
    }

    [Fact]
    public async Task LapDoiSoatDieuChinh_GiamPhi50k_ChiHoanPhanChenhLech50k()
    {
        long maDoiSoatGoc;
        long maPhuPhiGoc;
        long maPhuPhiDieuChinh;
        using (var ctx = _db.NewContext())
        {
            var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-5), TrangThaiDonThue.HoanTat, 600_000, 1_000_000);
            maDoiSoatGoc = Seed.DoiSoat(ctx, _du, don.MaDon, 1_000_000, 200_000, 800_000, 0, "DaChot", _db.Clock.Utc.AddDays(-1), _db.Clock.Utc.AddDays(-1));
            ctx.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat { MaDoiSoat = maDoiSoatGoc, MaChiTietThanhToan = don.NguonCoc!.Value });
            ctx.NhanViens.Add(new NhanVien { MaTaiKhoan = _du.TkQuanTri, HoTen = "Quản trị viên" });
            ctx.SaveChanges();

            // Phụ phí gốc 200k
            var pGoc = new PhuPhi
            {
                MaDonThue = don.MaDon,
                MaNguoiLap = _du.NhanVien,
                MaNguoiDuyet = _du.NhanVien,
                LoaiPhi = "LoiHuHong",
                SoTien = 200_000,
                TrangThaiDuyet = "DaDuyet",
                ThoiDiemLap = _db.Clock.Utc.AddDays(-2)
            };
            ctx.PhuPhis.Add(pGoc);
            ctx.SaveChanges();
            maPhuPhiGoc = pGoc.MaPhuPhi;

            // Phụ phí điều chỉnh giảm 50k: SoTien = -50_000
            var pDc = new PhuPhi
            {
                MaDonThue = don.MaDon,
                MaNguoiLap = _du.NhanVien,
                MaNguoiDuyet = _du.NhanVien,
                MaPhuPhiGoc = maPhuPhiGoc,
                LoaiPhi = "DieuChinh_LoiHuHong",
                SoTien = -50_000,
                TrangThaiDuyet = "DaDuyet",
                ThoiDiemLap = _db.Clock.Utc
            };
            ctx.PhuPhis.Add(pDc);
            ctx.SaveChanges();
            maPhuPhiDieuChinh = pDc.MaPhuPhi;
        }

        using (var s = _db.Mo())
        {
            var dto = new GearGo.Models.DTOs.DoiSoat.DieuChinhDoiSoatRequest
            {
                DanhSachMaPhuPhiDieuChinh = new List<long> { maPhuPhiDieuChinh },
                LyDo = "Khách khiếu nại được giảm 50k"
            };
            var kq = await DoiSoat(s).LapDoiSoatDieuChinhAsync(maDoiSoatGoc, dto, _du.TkQuanTri);
            Assert.True(kq.ThanhCong, kq.ThongDiep);
            Assert.Equal(50_000, kq.DuLieu!.CanHoan);
            Assert.Equal(0, kq.DuLieu.CanThuThem);
            Assert.Equal(-50_000, kq.DuLieu.TongPhuPhiDuocDuyet);
        }
    }

    [Fact]
    public async Task XacNhanThanhToan_GhiNhanChiTietThanhToan_TienThueVaTienCoc()
    {
        long maDon;
        using (var ctx = _db.NewContext())
        {
            var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(2), TrangThaiDonThue.ChoThanhToan, 400_000, 1_000_000, daThanhToan: false);
            maDon = don.MaDon;
        }

        using (var s = _db.Mo())
        {
            var ttService = new ThanhToanService(s.Ctx);
            var kq = await ttService.XacNhanThanhToanAsync(new GearGo.Models.DTOs.ThanhToan.XacNhanThanhToanRequest(
                maDon,
                "VNPAY",
                1_400_000,
                "VNPAY_123"
            ));
            Assert.True(kq.ThanhCong, kq.ThongDiep);
        }

        using var kt = _db.Mo();
        var tt = await kt.Ctx.ThanhToans.Include(t => t.ChiTietThanhToans).SingleAsync(t => t.MaDonThue == maDon);
        Assert.Equal(2, tt.ChiTietThanhToans.Count);
        var ctThue = tt.ChiTietThanhToans.Single(c => c.MucDich == MucDichThanhToan.TienThue);
        var ctCoc = tt.ChiTietThanhToans.Single(c => c.MucDich == MucDichThanhToan.TienCoc);
        Assert.Equal(400_000, ctThue.SoTien);
        Assert.Equal(1_000_000, ctCoc.SoTien);
    }
}
