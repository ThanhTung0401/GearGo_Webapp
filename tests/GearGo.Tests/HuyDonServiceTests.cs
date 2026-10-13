using GearGo.Exceptions;
using GearGo.Models.DTOs.BanGiao;
using GearGo.Models.DTOs.HuyDon;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GearGo.Tests;

/// <summary>W4-T7 — hủy đơn và tính khoản hoàn.</summary>
public class HuyDonServiceTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;

    public HuyDonServiceTests()
    {
        using var ctx = _db.NewContext();
        _du = Seed.CoBan(ctx);
    }

    public void Dispose() => _db.Dispose();

    private Seed.DonMau Don(TimeSpan truocNhan, TrangThaiDonThue tt = TrangThaiDonThue.DaXacNhan, decimal thue = 600_000,
        decimal coc = 1_000_000, bool daThanhToan = true, long? maChinhSach = null)
    {
        using var ctx = _db.NewContext();
        return Seed.Don(ctx, _du, _db.Clock.Utc + truocNhan, tt, thue, coc, daThanhToan, maChinhSach: maChinhSach);
    }

    private async Task<HuyDonResponse> KhachHuyQuaXemTruoc(long maDon, long? tk = null)
    {
        string dau;
        using (var s = _db.Mo())
            dau = (await s.HuyDon.XemTruocHuyAsync(maDon, tk ?? _du.TkKhachA, LoaiHuyDon.KhachHuy)).DauVanTay;
        using var s2 = _db.Mo();
        return await s2.HuyDon.KhachHuyAsync(maDon, new HuyDonRequest("Đổi lịch", true, dau), tk ?? _du.TkKhachA);
    }

    [Fact]
    public async Task A04_DaThu600Va1Trieu_GiuLai300_HaiIntentDungHaiNguon()
    {
        var don = Don(TimeSpan.FromHours(36));
        XemTruocHuyResponse xem;
        using (var s = _db.Mo())
            xem = await s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachA, LoaiHuyDon.KhachHuy);
        Assert.True(xem.CoTheHuy);
        Assert.Equal("Tu24Den48Gio", xem.NhanhChinhSach);
        Assert.Equal(300_000, xem.TienThueGiuLai);
        Assert.Equal(1_300_000, xem.TongHoan);

        HuyDonResponse kq;
        using (var s = _db.Mo())
            kq = await s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("Bận việc", true, xem.DauVanTay), _du.TkKhachA);

        Assert.Equal("KhachHuy", kq.TrangThai);
        Assert.Equal(300_000, kq.TienThueGiuLai);
        Assert.Equal(2, kq.YeuCauHoan.Count);
        var thue = kq.YeuCauHoan.Single(h => h.LoaiHoan == LoaiHoanTien.HoanHuyTienThue);
        var coc = kq.YeuCauHoan.Single(h => h.LoaiHoan == LoaiHoanTien.HoanHuyTienCoc);
        Assert.Equal((300_000m, don.NguonThue!.Value), (thue.SoTien, thue.MaChiTietThanhToanGoc));
        Assert.Equal((1_000_000m, don.NguonCoc!.Value), (coc.SoTien, coc.MaChiTietThanhToanGoc));
        Assert.All(kq.YeuCauHoan, h => Assert.Equal(TrangThaiHoanTien.ThanhCong, h.TrangThai)); // gateway giả lập thành công sau commit

        using var kt = _db.Mo();
        var d = await kt.Ctx.DonThues.Include(x => x.ChiTietDonThues).ThenInclude(c => c.GiuCho).SingleAsync(x => x.MaDonThue == don.MaDon);
        Assert.Equal(_du.TkKhachA, d.MaNguoiHuy);
        Assert.Equal("Bận việc", d.LyDoHuy);
        Assert.NotNull(d.ThoiDiemHuy);
        Assert.Equal(TrangThaiGiuCho.DaGiaiPhong, d.ChiTietDonThues.Single().GiuCho!.TrangThai);
        Assert.Equal(1, await kt.Ctx.LichSuTrangThaiDons.CountAsync(l => l.MaDonThue == don.MaDon && l.TrangThaiSau == "KhachHuy"));
        Assert.Equal(1, await kt.Ctx.ThongBaos.CountAsync(t => t.MaDonThue == don.MaDon && t.LoaiSuKien == "HuyDon"));
        // Không lấy nguồn cọc hoàn hai lần (A06 của W4-T6).
        Assert.Equal(1, await kt.Ctx.HoanTiens.CountAsync(h => h.MaChiTietThanhToanGoc == don.NguonCoc));
    }

    [Theory]
    [InlineData(72, 0, 1_600_000)]       // ví dụ 13.3 (thuê 600k): trên 48 giờ hoàn toàn bộ
    [InlineData(5, 600_000, 1_000_000)]   // dưới 24 giờ: chính sách mẫu giữ 100% tiền thuê, cọc vẫn hoàn đủ
    public async Task KhachHuy_TheoNhanh(int gioTruocNhan, int giuLai, int tongHoan)
    {
        var don = Don(TimeSpan.FromHours(gioTruocNhan));
        var kq = await KhachHuyQuaXemTruoc(don.MaDon);
        Assert.Equal(giuLai, kq.TienThueGiuLai);
        Assert.Equal(tongHoan, kq.YeuCauHoan.Sum(h => h.SoTien));
        Assert.DoesNotContain(kq.YeuCauHoan, h => h.SoTien == 0);
    }

    [Fact]
    public async Task A02_XemTruocLuc24Gio1Phut_XacNhanSau2Phut_TraBangMoi_ChuaHuy()
    {
        var don = Don(TimeSpan.FromMinutes(24 * 60 + 1));
        string dau;
        using (var s = _db.Mo())
            dau = (await s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachA, LoaiHuyDon.KhachHuy)).DauVanTay;

        _db.Clock.Tien(TimeSpan.FromMinutes(2));
        using (var s = _db.Mo())
        {
            var ex = await Assert.ThrowsAsync<ChiPhiHuyDaThayDoiException>(() =>
                s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("Đổi ý", true, dau), _du.TkKhachA));
            var moi = Assert.IsType<XemTruocHuyResponse>(ex.ChiTiet);
            Assert.Equal("Duoi24Gio", moi.NhanhChinhSach);
            Assert.NotEqual(dau, moi.DauVanTay);
        }

        using var kt = _db.Mo();
        Assert.Equal(TrangThaiDonThue.DaXacNhan, (await kt.Ctx.DonThues.SingleAsync(d => d.MaDonThue == don.MaDon)).TrangThai);
        Assert.Equal(0, await kt.Ctx.HoanTiens.CountAsync());
    }

    [Fact]
    public async Task DonDaThanhToan_KhongXacNhanBang_BiYeuCauXacNhan()
    {
        var don = Don(TimeSpan.FromHours(72));
        using var s = _db.Mo();
        var ex = await Assert.ThrowsAsync<ChiPhiHuyDaThayDoiException>(() =>
            s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("x"), _du.TkKhachA));
        Assert.IsType<XemTruocHuyResponse>(ex.ChiTiet);
    }

    [Fact]
    public async Task CuaHangHuy_HoanToanBo_ChiQuanTriVien()
    {
        var don = Don(TimeSpan.FromHours(5));
        using (var s = _db.Mo())
        {
            await Assert.ThrowsAsync<KhongCoQuyenException>(() =>
                s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkNhanVien, LoaiHuyDon.CuaHangHuy));
            await Assert.ThrowsAsync<KhongCoQuyenHuyException>(() =>
                s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachA, LoaiHuyDon.CuaHangHuy));
        }

        string dau;
        using (var s = _db.Mo())
            dau = (await s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkQuanTri, LoaiHuyDon.CuaHangHuy)).DauVanTay;
        HuyDonResponse kq;
        using (var s = _db.Mo())
            kq = await s.HuyDon.CuaHangHuyAsync(don.MaDon, new HuyDonRequest("Thiếu lều", true, dau), _du.TkQuanTri);

        Assert.Equal("CuaHangHuy", kq.TrangThai);
        Assert.Equal(0, kq.TienThueGiuLai);
        Assert.Equal(1_600_000, kq.YeuCauHoan.Sum(h => h.SoTien));
        Assert.NotNull(kq.YeuCauHoan.First().MaGiaoDichHoanCong); // quản trị viên thấy mã gateway
    }

    [Fact]
    public async Task A05_DaDungMaKhuyenMai_LuotKhongTroLai_GiuChoDuocGiaiPhong()
    {
        var don = Don(TimeSpan.FromHours(72));
        using (var ctx = _db.NewContext())
        {
            var km = new KhuyenMai { MaGiamGia = "GIAM10", LoaiGiam = LoaiKhuyenMai.PhanTram, GiaTriGiam = 10, PhamVi = PhamViApDung.TatCa, BatDau = new DateTime(2026, 1, 1), KetThuc = new DateTime(2027, 1, 1) };
            ctx.KhuyenMais.Add(km);
            ctx.SaveChanges();
            ctx.LuotSuDungKhuyenMais.Add(new LuotSuDungKhuyenMai { MaKhuyenMai = km.MaKhuyenMai, MaDonThue = don.MaDon, TrangThai = "DaSuDung", ThoiDiemSuDung = new DateTime(2026, 9, 1), SoTienGiam = 60_000 });
            ctx.SaveChanges();
        }
        await KhachHuyQuaXemTruoc(don.MaDon);

        using var kt = _db.Mo();
        var luot = await kt.Ctx.LuotSuDungKhuyenMais.SingleAsync(l => l.MaDonThue == don.MaDon);
        Assert.Equal("DaSuDung", luot.TrangThai);
        Assert.Null(luot.ThoiDiemGiaiPhong);
        Assert.Equal(TrangThaiGiuCho.DaGiaiPhong, (await kt.Ctx.GiuChos.SingleAsync(g => g.MaChiTietDon == don.MaChiTietDon)).TrangThai);
    }

    [Fact]
    public async Task A06_ChuaThuTien_KhongTaoHoan0Dong_ReleaseLuotDangGiu()
    {
        var don = Don(TimeSpan.FromHours(3), TrangThaiDonThue.ChoThanhToan, daThanhToan: false);
        using (var ctx = _db.NewContext())
        {
            var km = new KhuyenMai { MaGiamGia = "GIAM5", LoaiGiam = LoaiKhuyenMai.SoTien, GiaTriGiam = 5, PhamVi = PhamViApDung.TatCa, BatDau = new DateTime(2026, 1, 1), KetThuc = new DateTime(2027, 1, 1) };
            ctx.KhuyenMais.Add(km);
            ctx.SaveChanges();
            ctx.LuotSuDungKhuyenMais.Add(new LuotSuDungKhuyenMai { MaKhuyenMai = km.MaKhuyenMai, MaDonThue = don.MaDon, TrangThai = "DangGiu", ThoiDiemHetHan = _db.Clock.Utc.AddMinutes(10) });
            ctx.SaveChanges();
        }

        HuyDonResponse kq;
        using (var s = _db.Mo())
            kq = await s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("Không cần nữa"), _du.TkKhachA); // không cần xác nhận phí

        Assert.Equal("KhachHuy", kq.TrangThai);
        Assert.Empty(kq.YeuCauHoan);
        using var kt = _db.Mo();
        Assert.Equal(0, await kt.Ctx.HoanTiens.CountAsync());
        Assert.Equal("DaGiaiPhong", (await kt.Ctx.LuotSuDungKhuyenMais.SingleAsync(l => l.MaDonThue == don.MaDon)).TrangThai);
        Assert.Empty(_db.Gateway.DaGui);
    }

    [Fact]
    public async Task A07_TienVeSauKhiHuy_DonGiuHuy_KhongTaoLaiGiuCho()
    {
        var don = Don(TimeSpan.FromHours(3), TrangThaiDonThue.ChoThanhToan, daThanhToan: false);
        using (var s = _db.Mo())
            await s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("Hủy"), _du.TkKhachA);

        using (var ctx = _db.NewContext())
        {
            var kq = await new ThanhToanService(ctx).XacNhanThanhToanAsync(new XacNhanThanhToanRequest(don.MaDon, "ChuyenKhoan", 1_600_000, "GD-MUON"));
            Assert.False(kq.ThanhCong);
        }

        using var kt = _db.Mo();
        Assert.Equal(TrangThaiDonThue.KhachHuy, (await kt.Ctx.DonThues.SingleAsync(d => d.MaDonThue == don.MaDon)).TrangThai);
        Assert.Equal(TrangThaiGiuCho.DaGiaiPhong, (await kt.Ctx.GiuChos.SingleAsync(g => g.MaChiTietDon == don.MaChiTietDon)).TrangThai);
    }

    [Fact]
    public async Task A03_GiaoTruoc_HuySau_BiChan()
    {
        var don = Don(TimeSpan.FromHours(1), TrangThaiDonThue.SanSangNhan);
        List<Seed.ThietBiGiao> tb;
        using (var ctx = _db.NewContext())
            tb = Seed.BanGiao(ctx, _du, don.MaDon, don.MaChiTietDon, 1, daGiao: false);
        using (var ctx = _db.NewContext())
            Assert.True((await new BanGiaoService(ctx).ChotBanGiaoAsync(tb[0].MaPhieuBanGiao, new ChotBanGiaoRequest("Khách A"), _du.NhanVien)).ThanhCong);

        using var s = _db.Mo();
        await Assert.ThrowsAsync<DonDaBanGiaoException>(() =>
            s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("muộn", true, "x"), _du.TkKhachA));
        Assert.Equal(0, await s.Ctx.HoanTiens.CountAsync());
    }

    [Fact]
    public async Task A03_HuyTruoc_GiaoSau_BiChan_PhanCongVaNhapDaVoHieu()
    {
        var don = Don(TimeSpan.FromHours(30), TrangThaiDonThue.SanSangNhan);
        List<Seed.ThietBiGiao> tb;
        using (var ctx = _db.NewContext())
            tb = Seed.BanGiao(ctx, _du, don.MaDon, don.MaChiTietDon, 2, daGiao: false);

        await KhachHuyQuaXemTruoc(don.MaDon);

        using (var ctx = _db.NewContext())
            Assert.False((await new BanGiaoService(ctx).ChotBanGiaoAsync(tb[0].MaPhieuBanGiao, new ChotBanGiaoRequest("Khách A"), _du.NhanVien)).ThanhCong);

        using var kt = _db.Mo();
        Assert.Equal(TrangThaiDonThue.KhachHuy, (await kt.Ctx.DonThues.SingleAsync(d => d.MaDonThue == don.MaDon)).TrangThai);
        var pcs = await kt.Ctx.PhanCongThietBis.Where(p => p.ChiTietDon.MaDonThue == don.MaDon).ToListAsync();
        Assert.All(pcs, p => Assert.Equal("DaHuy", p.TrangThai));
        Assert.All(pcs, p => Assert.NotNull(p.ThoiDiemHuyPhanCong));
        Assert.Equal("DaHuy", (await kt.Ctx.PhieuBanGiaos.SingleAsync(p => p.MaDonThue == don.MaDon)).TrangThai);
        Assert.All(await kt.Ctx.ThietBis.Where(t => tb.Select(x => x.MaThietBi).Contains(t.MaThietBi)).ToListAsync(),
            t => Assert.Equal(TrangThaiThietBi.SanSang, t.TrangThaiSuDung)); // không vừa giao vừa giải phóng
    }

    [Theory]
    [InlineData(TrangThaiDonThue.DangThue)]
    [InlineData(TrangThaiDonThue.ChoDoiSoat)]
    [InlineData(TrangThaiDonThue.HoanTat)]
    public async Task DaThue_GoiHuy_BiTuChoi(TrangThaiDonThue tt)
    {
        var don = Don(TimeSpan.FromHours(-5), tt);
        using var s = _db.Mo();
        var xem = await s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachA, LoaiHuyDon.KhachHuy);
        Assert.False(xem.CoTheHuy);
        var ex = await Assert.ThrowsAsync<DonDaBanGiaoException>(() =>
            s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("né trả đồ", true, "x"), _du.TkKhachA));
        Assert.Equal("DON_DA_BAN_GIAO", ex.MaLoi);
    }

    [Fact]
    public async Task HuyHaiLan_MotKetQuaMotBoHoan_QuyetDinhKhacBiChan()
    {
        var don = Don(TimeSpan.FromHours(72));
        var lan1 = await KhachHuyQuaXemTruoc(don.MaDon);
        HuyDonResponse lan2;
        using (var s = _db.Mo())
            lan2 = await s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("Bấm lại"), _du.TkKhachA);
        Assert.Equal(lan1.YeuCauHoan.Select(h => h.MaHoanTien), lan2.YeuCauHoan.Select(h => h.MaHoanTien));
        Assert.Equal(lan1.LyDo, lan2.LyDo); // không ghi đè lý do

        using (var s = _db.Mo())
            await Assert.ThrowsAsync<DonDaHuyKhacYDinhException>(() =>
                s.HuyDon.CuaHangHuyAsync(don.MaDon, new HuyDonRequest("Thiếu đồ", true, "x"), _du.TkQuanTri));
        using var kt = _db.Mo();
        Assert.Equal(2, await kt.Ctx.HoanTiens.CountAsync());
        Assert.Equal(1, await kt.Ctx.LichSuTrangThaiDons.CountAsync(l => l.MaDonThue == don.MaDon));
    }

    [Fact]
    public async Task KhachKhac_KhongThayDon_404()
    {
        var don = Don(TimeSpan.FromHours(72));
        using var s = _db.Mo();
        await Assert.ThrowsAsync<DonKhongTimThayException>(() => s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachB, LoaiHuyDon.KhachHuy));
        await Assert.ThrowsAsync<DonKhongTimThayException>(() =>
            s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("x", true, "x"), _du.TkKhachB));
    }

    [Fact]
    public async Task ChinhSachThieuTyLe_TraLoiCauHinh_KhongHuy()
    {
        var don = Don(TimeSpan.FromHours(30), maChinhSach: _du.ChinhSachRong);
        using var s = _db.Mo();
        var ex = await Assert.ThrowsAsync<ChinhSachHuyChuaDuException>(() =>
            s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachA, LoaiHuyDon.KhachHuy));
        Assert.Equal("CHINH_SACH_HUY_CHUA_DU", ex.MaLoi);
    }

    [Fact]
    public async Task ThuChuaPhanLoai_KhongChoHuy()
    {
        var don = Don(TimeSpan.FromHours(72), daThanhToan: false);
        using (var ctx = _db.NewContext())
        {
            ctx.ThanhToans.Add(new ThanhToan { MaDonThue = don.MaDon, MaYeuCau = "PAY-CHUA-PL", PhuongThuc = "ChuyenKhoan", TongSoTien = 1_600_000, TrangThai = "ThanhCong" });
            ctx.SaveChanges();
        }
        using var s = _db.Mo();
        Assert.False((await s.HuyDon.XemTruocHuyAsync(don.MaDon, _du.TkKhachA, LoaiHuyDon.KhachHuy)).CoTheHuy);
        await Assert.ThrowsAsync<NguonHoanKhongHopLeException>(() =>
            s.HuyDon.KhachHuyAsync(don.MaDon, new HuyDonRequest("x", true, "x"), _du.TkKhachA));
    }

    [Fact]
    public async Task Demo4_HoanThatBai_DonVanHuy_XuLyLaiThanhCong()
    {
        var don = Don(TimeSpan.FromHours(72));
        _db.Gateway.KichBan.Enqueue(GatewayGia.ThanhCong);
        _db.Gateway.KichBan.Enqueue(GatewayGia.ThatBai);
        var kq = await KhachHuyQuaXemTruoc(don.MaDon);

        Assert.Equal("KhachHuy", kq.TrangThai);
        var thatBai = kq.YeuCauHoan.Single(h => h.TrangThai == TrangThaiHoanTien.ThatBai);
        Assert.Equal("CanXuLyLai", thatBai.NhanHienThi);
        Assert.True(kq.TongHoanDangCho > 0);

        using (var s = _db.Mo())
            Assert.Equal(TrangThaiHoanTien.ThanhCong,
                (await s.HoanTien.XuLyYeuCauHoanAsync(thatBai.MaHoanTien, new(), _du.TkNhanVien)).TrangThai);
        using var kt = _db.Mo();
        var ds = await kt.HoanTien.LayDanhSachTheoDonAsync(don.MaDon, _du.TkKhachA);
        Assert.Equal(1_600_000, ds.TongDaHoan);
        Assert.All(ds.NghiaVu, n => Assert.True(n.DaHoanThanh));
        Assert.Equal(TrangThaiDonThue.KhachHuy, (await kt.Ctx.DonThues.SingleAsync(d => d.MaDonThue == don.MaDon)).TrangThai);
    }

    [Fact]
    public async Task LoiGatewaySauCommit_KhongRollbackHuy()
    {
        var don = Don(TimeSpan.FromHours(72));
        _db.Gateway.MacDinh = _ => throw new InvalidOperationException("adapter hỏng");
        var kq = await KhachHuyQuaXemTruoc(don.MaDon);
        Assert.Equal("KhachHuy", kq.TrangThai);
        Assert.All(kq.YeuCauHoan, h => Assert.Equal(TrangThaiHoanTien.ChuaRoKetQua, h.TrangThai));
    }

    // ───────────── Khách không đến nhận ─────────────

    [Fact]
    public async Task KhongDenNhan_NhanVienGhiNhan_QuanTriVienQuyetDinh()
    {
        var don = Don(TimeSpan.FromHours(-1), TrangThaiDonThue.SanSangNhan); // chính sách mẫu chờ 120 phút sau giờ nhận
        using (var s = _db.Mo())
            await Assert.ThrowsAsync<TrangThaiKhongHopLeException>(() =>
                s.HuyDon.GhiNhanKhongDenNhanAsync(don.MaDon, new KhongDenNhanRequest("Gọi không được"), _du.TkNhanVien));

        _db.Clock.Tien(TimeSpan.FromHours(2));
        KhongDenNhanResponse ghi;
        using (var s = _db.Mo())
            ghi = await s.HuyDon.GhiNhanKhongDenNhanAsync(don.MaDon, new KhongDenNhanRequest("Gọi 3 lần không được", "call-log.png"), _du.TkNhanVien);
        Assert.True(ghi.DaGhiNhan);
        Assert.False(ghi.DaHuy);
        Assert.Equal("SanSangNhan", ghi.TrangThaiDon);
        Assert.NotNull(ghi.BangTinhNeuHuy);

        using (var s = _db.Mo())
        {
            await Assert.ThrowsAsync<KhongCoQuyenHuyException>(() => s.HuyDon.GhiNhanKhongDenNhanAsync(don.MaDon,
                new KhongDenNhanRequest("tự xử", XuLyHuy: true, XacNhanChiPhi: true, DauVanTayXemTruoc: ghi.BangTinhNeuHuy!.DauVanTay), _du.TkNhanVien));
            Assert.Equal(1, await s.Ctx.NhatKyThaoTacs.CountAsync(n => n.HanhDong == "GHI_NHAN_KHONG_DEN_NHAN"));
            Assert.Equal(1, await s.Ctx.ThongBaos.CountAsync(t => t.LoaiSuKien == "KhongDenNhan" && t.MaTaiKhoan == _du.TkQuanTri));
        }

        KhongDenNhanResponse xl;
        using (var s = _db.Mo())
            xl = await s.HuyDon.GhiNhanKhongDenNhanAsync(don.MaDon,
                new KhongDenNhanRequest("Xử lý theo chính sách", XuLyHuy: true, XacNhanChiPhi: true, DauVanTayXemTruoc: ghi.BangTinhNeuHuy!.DauVanTay), _du.TkQuanTri);
        Assert.True(xl.DaHuy);
        Assert.Equal("KhachHuy", xl.KetQuaHuy!.TrangThai);
        Assert.Equal(600_000, xl.KetQuaHuy.TienThueGiuLai); // tyLeGiuLaiTienThue = 1.0 trong chính sách mẫu
        Assert.Equal(1_000_000, xl.KetQuaHuy.YeuCauHoan.Sum(h => h.SoTien));
    }

    [Fact]
    public async Task KhongDenNhan_ChinhSachChuaQuyDinh_ChoQuanTriVien_KhongTuPhat()
    {
        var don = Don(TimeSpan.FromHours(-3), TrangThaiDonThue.SanSangNhan, maChinhSach: _du.ChinhSachRong);
        using (var s = _db.Mo())
        {
            var ghi = await s.HuyDon.GhiNhanKhongDenNhanAsync(don.MaDon, new KhongDenNhanRequest("Không đến"), _du.TkNhanVien);
            Assert.False(ghi.CoChinhSachKhongDenNhan);
            Assert.Null(ghi.BangTinhNeuHuy);
            Assert.Equal("ChoQuanTriVienQuyetDinh_ChinhSachChuaQuyDinh", ghi.HuongXuLy);
        }
        using (var s = _db.Mo())
            await Assert.ThrowsAsync<ChinhSachHuyChuaDuException>(() => s.HuyDon.GhiNhanKhongDenNhanAsync(don.MaDon,
                new KhongDenNhanRequest("x", XuLyHuy: true, XacNhanChiPhi: true, DauVanTayXemTruoc: "x"), _du.TkQuanTri));
        using var kt = _db.Mo();
        Assert.Equal(TrangThaiDonThue.SanSangNhan, (await kt.Ctx.DonThues.SingleAsync(d => d.MaDonThue == don.MaDon)).TrangThai);
        Assert.Equal(0, await kt.Ctx.HoanTiens.CountAsync());
    }
}
