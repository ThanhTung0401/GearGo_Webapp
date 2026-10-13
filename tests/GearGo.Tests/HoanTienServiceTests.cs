using GearGo.Exceptions;
using GearGo.Integrations.Payments;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GearGo.Tests;

/// <summary>W4-T6 — hoàn tiền dùng chung.</summary>
public class HoanTienServiceTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;

    public HoanTienServiceTests()
    {
        using var ctx = _db.NewContext();
        _du = Seed.CoBan(ctx);
    }

    public void Dispose() => _db.Dispose();

    private static async Task<List<HoanTien>> LapAsync(PhamVi s, LapHoanCommand c, long? actor = null)
    {
        await using var tx = await s.Ctx.Database.BeginTransactionAsync();
        var rows = await s.HoanTien.LapYeuCauHoanAsync(c, actor);
        await s.Ctx.SaveChangesAsync();
        await tx.CommitAsync();
        return rows;
    }

    private Seed.DonMau DonDaThanhToan(decimal thue = 600_000, decimal coc = 1_000_000)
    {
        using var ctx = _db.NewContext();
        return Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(5), TrangThaiDonThue.DaXacNhan, thue, coc);
    }

    // ───────────── Hạn mức nguồn ─────────────

    [Fact]
    public async Task A01_TongThanhCongCongDangGiuCongMoi_VuotNguon_BiChan()
    {
        var don = DonDaThanhToan(thue: 0, coc: 2_000_000);
        using (var ctx = _db.NewContext())
        {
            Seed.Hoan(ctx, don.NguonCoc!.Value, 500_000, TrangThaiHoanTien.ThanhCong);
            Seed.Hoan(ctx, don.NguonCoc!.Value, 700_000, TrangThaiHoanTien.ChoXuLy);
        }

        using var s = _db.Mo();
        var ex = await Assert.ThrowsAsync<VuotHanMucHoanException>(() => LapAsync(s,
            new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "TEST:A01", 900_000, new[] { don.NguonCoc!.Value })));
        Assert.Equal("VUOT_HAN_MUC_HOAN", ex.MaLoi);

        using var kt = _db.Mo();
        var hm = await kt.HoanTien.LayHanMucNguonAsync(don.NguonCoc!.Value);
        Assert.Equal(2_000_000, hm.ThucThu);
        Assert.Equal(500_000, hm.DaHoanThanhCong);
        Assert.Equal(700_000, hm.DangGiu);
        Assert.Equal(800_000, hm.ConCoTheLap);
        Assert.Equal(2, await kt.Ctx.HoanTiens.CountAsync()); // không lập dòng nào
    }

    [Fact]
    public async Task NghiemThu_Coc1Trieu_DangCho800_YeuCauMoi300_BiChan()
    {
        var don = DonDaThanhToan(thue: 0, coc: 1_000_000);
        using (var s = _db.Mo())
            await LapAsync(s, new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "TEST:800", 800_000, new[] { don.NguonCoc!.Value }));

        using var s2 = _db.Mo();
        await Assert.ThrowsAsync<VuotHanMucHoanException>(() => LapAsync(s2,
            new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "TEST:300", 300_000, new[] { don.NguonCoc!.Value })));
    }

    [Fact]
    public async Task A02_HaiNguon_NghiaVu2400_ChiaTheoThuTuNguon()
    {
        var don = DonDaThanhToan(thue: 0, coc: 2_000_000);
        long nguon2;
        using (var ctx = _db.NewContext())
            nguon2 = Seed.Nguon(ctx, don.MaDon, MucDichThanhToan.TienCoc, 1_000_000);

        var maDoiSoat = TaoDoiSoat(don.MaDon);
        using var s = _db.Mo();
        var rows = await LapAsync(s, new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanCocDoiSoat, $"DS:{maDoiSoat}", 2_400_000,
            new[] { nguon2, don.NguonCoc!.Value }, MaDoiSoat: maDoiSoat));

        Assert.Equal(2, rows.Count);
        var theoNguon = rows.ToDictionary(r => r.MaChiTietThanhToanGoc, r => r.SoTien);
        Assert.Equal(2_000_000, theoNguon[don.NguonCoc!.Value]); // nguồn mã nhỏ hơn dùng trước
        Assert.Equal(400_000, theoNguon[nguon2]);
        Assert.Equal(2_400_000, rows.Sum(r => r.SoTien));
        Assert.All(rows, r => Assert.Equal(TrangThaiHoanTien.ChoXuLy, r.TrangThai));
        Assert.All(rows, r => Assert.NotNull(r.MaDoiSoat));
    }

    private long TaoDoiSoat(long maDon)
    {
        using var ctx = _db.NewContext();
        return Seed.DoiSoat(ctx, _du, maDon, 3_000_000, 600_000, 2_400_000, 0, "DaXacNhan", _db.Clock.Utc, null);
    }

    [Fact]
    public async Task A03_HaiNhanVienCungHoanPhanConLai_ChiMotIntent_MotXungDot()
    {
        var don = DonDaThanhToan(thue: 0, coc: 1_000_000);
        using var s1 = _db.Mo();
        using var s2 = _db.Mo();
        await LapAsync(s1, new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "TT:NV1", 1_000_000, new[] { don.NguonCoc!.Value }));
        var ex = await Assert.ThrowsAsync<VuotHanMucHoanException>(() => LapAsync(s2,
            new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "TT:NV2", 1_000_000, new[] { don.NguonCoc!.Value })));
        Assert.NotNull(ex.ChiTiet);

        using var kt = _db.Mo();
        Assert.Equal(1, await kt.Ctx.HoanTiens.CountAsync());
    }

    [Fact]
    public async Task GoiLaiCungKhoaNghiaVu_TraBoCu_KhongLapThem()
    {
        var don = DonDaThanhToan();
        using var s = _db.Mo();
        var lan1 = await LapAsync(s, new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanHuyTienCoc, "HUY:X:COC", 1_000_000, new[] { don.NguonCoc!.Value }));
        using var s2 = _db.Mo();
        var lan2 = await LapAsync(s2, new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanHuyTienCoc, "HUY:X:COC", 1_000_000, new[] { don.NguonCoc!.Value }));

        Assert.Equal(lan1.Select(r => r.MaHoanTien), lan2.Select(r => r.MaHoanTien));
        Assert.Equal(1, await s2.Ctx.HoanTiens.CountAsync());
    }

    [Fact]
    public async Task LapNgoaiTransaction_BiTuChoi()
    {
        var don = DonDaThanhToan();
        using var s = _db.Mo();
        await Assert.ThrowsAsync<InvalidOperationException>(() => s.HoanTien.LapYeuCauHoanAsync(
            new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanHuyTienCoc, "HUY:Y:COC", 1_000, new[] { don.NguonCoc!.Value }), null));
    }

    [Fact]
    public async Task NguonKhongHopLe_ChuaThanhCong_KhacDon_SaiMucDich()
    {
        var don = DonDaThanhToan();
        var donKhac = DonDaThanhToan();
        long nguonLoi;
        using (var ctx = _db.NewContext())
            nguonLoi = Seed.Nguon(ctx, don.MaDon, MucDichThanhToan.TienCoc, 500_000, trangThai: "ChoXuLy");

        using var s = _db.Mo();
        var e1 = await Assert.ThrowsAsync<NguonHoanKhongHopLeException>(() => LapAsync(s,
            new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "K1", 100, new[] { nguonLoi })));
        using var s2 = _db.Mo();
        await Assert.ThrowsAsync<NguonHoanKhongHopLeException>(() => LapAsync(s2,
            new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "K2", 100, new[] { donKhac.NguonCoc!.Value })));
        using var s3 = _db.Mo();
        // Hoàn cọc không được lấy nguồn tiền thuê.
        await Assert.ThrowsAsync<NguonHoanKhongHopLeException>(() => LapAsync(s3,
            new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanHuyTienCoc, "K3", 100, new[] { don.NguonThue!.Value })));
        Assert.Equal("NGUON_HOAN_KHONG_HOP_LE", e1.MaLoi);
    }

    // ───────────── Gửi gateway / kết quả ─────────────

    private async Task<long> LapMotKhoan(Seed.DonMau don, decimal soTien = 1_000_000, string khoa = "HUY:T:COC")
    {
        using var s = _db.Mo();
        return (await LapAsync(s, new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanHuyTienCoc, khoa, soTien, new[] { don.NguonCoc!.Value })))[0].MaHoanTien;
    }

    [Fact]
    public async Task GuiThanhCong_GhiMaGiaoDich_ThongBaoKhach()
    {
        var don = DonDaThanhToan();
        var id = await LapMotKhoan(don);
        using (var s = _db.Mo())
            await s.HoanTien.GuiYeuCauDaLapAsync(new[] { id }, _du.NhanVien);

        using var kt = _db.Mo();
        var h = await kt.Ctx.HoanTiens.SingleAsync(x => x.MaHoanTien == id);
        Assert.Equal(TrangThaiHoanTien.ThanhCong, h.TrangThai);
        Assert.Equal("GD-" + h.MaYeuCau, h.MaGiaoDichHoanCong);
        Assert.NotNull(h.ThoiDiemThanhCong);
        Assert.Equal(_du.NhanVien, h.MaNguoiXuLy);
        Assert.Single(_db.Gateway.DaGui);
        Assert.Equal(1, await kt.Ctx.ThongBaos.CountAsync(t => t.LoaiSuKien == "HoanTien" && t.MaDonThue == don.MaDon));
    }

    [Fact]
    public async Task A04_GatewayDaHoanNhungTimeout_GiuNguon_DoiChieuCungMa_KhongHoanThem()
    {
        var don = DonDaThanhToan();
        var id = await LapMotKhoan(don);
        _db.Gateway.KichBan.Enqueue(_db.Gateway.DaHoanNhungTimeout);
        using (var s = _db.Mo())
            await s.HoanTien.GuiYeuCauDaLapAsync(new[] { id }, null);

        using (var s = _db.Mo())
        {
            var h = await s.Ctx.HoanTiens.SingleAsync(x => x.MaHoanTien == id);
            Assert.Equal(TrangThaiHoanTien.ChuaRoKetQua, h.TrangThai);
            // Nguồn vẫn bị giữ: không lập được khoản khác trên phần cọc này.
            await Assert.ThrowsAsync<VuotHanMucHoanException>(() => LapAsync(s,
                new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "KHAC", 1, new[] { don.NguonCoc!.Value })));
        }
        using (var s = _db.Mo())
        {
            // Bấm "xử lý" lại khi chưa rõ → phải đối chiếu trước, không gửi lần mới.
            var ex = await Assert.ThrowsAsync<HoanChuaRoKetQuaException>(() =>
                s.HoanTien.XuLyYeuCauHoanAsync(id, new XuLyHoanRequest(), _du.TkNhanVien));
            Assert.Equal("HOAN_CHUA_RO_KET_QUA", ex.MaLoi);
        }
        using (var s = _db.Mo())
        {
            var kq = await s.HoanTien.DoiChieuKetQuaHoanAsync(id, _du.TkNhanVien);
            Assert.Equal(TrangThaiHoanTien.ThanhCong, kq.TrangThai);
        }

        var maYeuCau = _db.Gateway.DaGui.Single().MaYeuCau;
        Assert.Equal(new[] { maYeuCau }, _db.Gateway.DaTraCuu.Distinct());
        Assert.Single(_db.Gateway.DaGui); // không gửi thêm
    }

    [Fact]
    public async Task A05_CallbackThanhCongRoiThatBaiCu_GiuThanhCong_GhiMauThuan()
    {
        var don = DonDaThanhToan();
        var id = await LapMotKhoan(don);
        _db.Gateway.KichBan.Enqueue(GatewayGia.DaTiepNhan);
        using (var s = _db.Mo())
            await s.HoanTien.GuiYeuCauDaLapAsync(new[] { id }, null);
        string ma;
        using (var s = _db.Mo())
            ma = (await s.Ctx.HoanTiens.SingleAsync(x => x.MaHoanTien == id)).MaYeuCau!;

        var tc = new KetQuaHoanCallbackRequest(ma, "GD-1", 1_000_000, "ThanhCong", new DateTime(2026, 10, 1, 4, 0, 0),
            GatewayGia.Ky(ma, "GD-1", 1_000_000, "ThanhCong"));
        var tb = new KetQuaHoanCallbackRequest(ma, null, 1_000_000, "ThatBai", null, GatewayGia.Ky(ma, null, 1_000_000, "ThatBai"));

        using (var s = _db.Mo()) await s.HoanTien.XuLyKetQuaHoanAsync(tc);
        using (var s = _db.Mo()) await s.HoanTien.XuLyKetQuaHoanAsync(tc);   // lặp
        using (var s = _db.Mo()) await s.HoanTien.XuLyKetQuaHoanAsync(tb);   // cũ, đến sau

        using var kt = _db.Mo();
        var h = await kt.Ctx.HoanTiens.SingleAsync(x => x.MaHoanTien == id);
        Assert.Equal(TrangThaiHoanTien.ThanhCong, h.TrangThai);
        Assert.Equal(new DateTime(2026, 10, 1, 4, 0, 0), h.ThoiDiemThanhCong);
        Assert.Equal("GD-1", h.MaGiaoDichHoanCong);
        Assert.Equal(1, await kt.Ctx.NhatKyThaoTacs.CountAsync(n => n.HanhDong == "MAU_THUAN_KET_QUA_HOAN"));
        Assert.Equal(1, await kt.Ctx.NhatKyThaoTacs.CountAsync(n => n.HanhDong == "KET_QUA_HOAN" && n.MaDoiTuong == id.ToString()));
        Assert.Equal(1, await kt.Ctx.ThongBaos.CountAsync(t => t.LoaiSuKien == "HoanTien")); // một lần cập nhật → một thông báo
    }

    [Fact]
    public async Task Callback_SaiChuKy_HoacSaiSoTien_KhongDanhDauDaHoan()
    {
        var don = DonDaThanhToan();
        var id = await LapMotKhoan(don);
        _db.Gateway.KichBan.Enqueue(GatewayGia.DaTiepNhan);
        using (var s = _db.Mo()) await s.HoanTien.GuiYeuCauDaLapAsync(new[] { id }, null);
        string ma;
        using (var s = _db.Mo()) ma = (await s.Ctx.HoanTiens.SingleAsync(x => x.MaHoanTien == id)).MaYeuCau!;

        using (var s = _db.Mo())
            await Assert.ThrowsAsync<KetQuaHoanKhongKhopException>(() => s.HoanTien.XuLyKetQuaHoanAsync(
                new KetQuaHoanCallbackRequest(ma, "GD", 1_000_000, "ThanhCong", null, "chu-ky-gia")));
        using (var s = _db.Mo())
            await Assert.ThrowsAsync<KetQuaHoanKhongKhopException>(() => s.HoanTien.XuLyKetQuaHoanAsync(
                new KetQuaHoanCallbackRequest(ma, "GD", 999_000, "ThanhCong", null, GatewayGia.Ky(ma, "GD", 999_000, "ThanhCong"))));

        using var kt = _db.Mo();
        Assert.Equal(TrangThaiHoanTien.DangXuLy, (await kt.Ctx.HoanTiens.SingleAsync(x => x.MaHoanTien == id)).TrangThai);
        Assert.Equal(1, await kt.Ctx.NhatKyThaoTacs.CountAsync(n => n.HanhDong == "KET_QUA_HOAN_SAI_SO_TIEN"));
    }

    [Fact]
    public async Task ThatBaiChacChan_GiaiPhongHanMuc_XuLyLai_LapLanThuMoiVaThanhCong()
    {
        var don = DonDaThanhToan();
        var id = await LapMotKhoan(don);
        _db.Gateway.KichBan.Enqueue(GatewayGia.ThatBai);
        using (var s = _db.Mo()) await s.HoanTien.GuiYeuCauDaLapAsync(new[] { id }, null);

        using (var s = _db.Mo())
        {
            Assert.Equal(TrangThaiHoanTien.ThatBai, (await s.Ctx.HoanTiens.SingleAsync(x => x.MaHoanTien == id)).TrangThai);
            Assert.Equal(1_000_000, (await s.HoanTien.LayHanMucNguonAsync(don.NguonCoc!.Value)).ConCoTheLap);
        }

        HoanTienResponse moi;
        using (var s = _db.Mo())
            moi = await s.HoanTien.XuLyYeuCauHoanAsync(id, new XuLyHoanRequest("Khách đổi tài khoản"), _du.TkNhanVien);
        Assert.NotEqual(id, moi.MaHoanTien);
        Assert.EndsWith(":L2", moi.MaYeuCau);
        Assert.Equal(TrangThaiHoanTien.ThanhCong, moi.TrangThai);

        // Bấm lại trên khoản cũ không lập lần thứ ba.
        using (var s = _db.Mo())
        {
            var lai = await s.HoanTien.XuLyYeuCauHoanAsync(id, new XuLyHoanRequest(), _du.TkNhanVien);
            Assert.Equal(moi.MaHoanTien, lai.MaHoanTien);
        }

        using var kt = _db.Mo();
        var ds = await kt.HoanTien.LayDanhSachTheoDonAsync(don.MaDon, _du.TkNhanVien);
        Assert.Equal(2, ds.Items.Count);
        Assert.Equal("DaThayThe", ds.Items.Single(i => i.MaHoanTien == id).NhanHienThi);
        Assert.Equal(1_000_000, ds.TongDaHoan);
        Assert.Equal(0, ds.TongCanXuLyLai);
        Assert.True(ds.NghiaVu.Single().DaHoanThanh);
        Assert.Equal(0, (await kt.HoanTien.LayHanMucNguonAsync(don.NguonCoc!.Value)).ConCoTheLap);
    }

    [Fact]
    public async Task NghiaVuNhieuNguon_MotPhanThatBai_ChuaHoanThanh()
    {
        var don = DonDaThanhToan(thue: 0, coc: 500_000);
        using (var ctx = _db.NewContext()) Seed.Nguon(ctx, don.MaDon, MucDichThanhToan.TienCoc, 500_000);
        List<HoanTien> rows;
        using (var s = _db.Mo())
        {
            var nguon = await s.Ctx.ChiTietThanhToans.Where(c => c.ThanhToan.MaDonThue == don.MaDon).Select(c => c.MaChiTietThanhToan).ToListAsync();
            rows = await LapAsync(s, new LapHoanCommand(don.MaDon, LoaiHoanTien.HoanThuThua, "TT:NHIEU", 800_000, nguon));
        }
        _db.Gateway.KichBan.Enqueue(GatewayGia.ThanhCong);
        _db.Gateway.KichBan.Enqueue(GatewayGia.ThatBai);
        using (var s = _db.Mo()) await s.HoanTien.GuiYeuCauDaLapAsync(rows.Select(r => r.MaHoanTien), null);

        using var kt = _db.Mo();
        var nv = (await kt.HoanTien.LayDanhSachTheoDonAsync(don.MaDon, _du.TkKhachA)).NghiaVu.Single();
        Assert.False(nv.DaHoanThanh);
        Assert.Equal(800_000, nv.TongSoTien);
        Assert.Equal(500_000, nv.DaHoanThanhCong);
        Assert.Equal(300_000, nv.ConCho);
        Assert.Equal(1, nv.SoKhoanCanXuLyLai);
    }

    [Fact]
    public async Task A07_KhoiDongLai_BaYeuCauCho_DocLaiTuDatabase_CungMa()
    {
        var don = DonDaThanhToan(thue: 0, coc: 3_000_000);
        long a, b, c;
        using (var ctx = _db.NewContext())
        {
            var cu = _db.Clock.Utc.AddMinutes(-10);
            a = Seed.Hoan(ctx, don.NguonCoc!.Value, 100_000, TrangThaiHoanTien.ChoXuLy, "HT:R:A:1:L1", cu);   // commit xong nhưng chưa gửi
            b = Seed.Hoan(ctx, don.NguonCoc!.Value, 200_000, TrangThaiHoanTien.DangXuLy, "HT:R:B:1:L1", cu);  // đã gửi, chưa ghi kết quả
            c = Seed.Hoan(ctx, don.NguonCoc!.Value, 300_000, TrangThaiHoanTien.ChuaRoKetQua, "HT:R:C:1:L1", cu);
        }
        _db.Gateway.KetQuaTraCuu["HT:R:B:1:L1"] = new PhanHoiHoanGateway(KetQuaHoanGateway.ThanhCong, "GD-B", 200_000, null, null);
        _db.Gateway.KetQuaTraCuu["HT:R:C:1:L1"] = new PhanHoiHoanGateway(KetQuaHoanGateway.ThatBai, null, 300_000, null, null);

        // "Ứng dụng mới": DbContext + service mới, không có trạng thái RAM nào từ trước.
        using (var s = _db.Mo())
        {
            var kq = await s.HoanTien.TiepTucCacYeuCauDangChoAsync(TimeSpan.FromMinutes(2));
            Assert.Equal(1, kq.SoDaGui);
            Assert.Equal(2, kq.SoDaDoiChieu);
        }

        Assert.Equal(new[] { "HT:R:A:1:L1" }, _db.Gateway.DaGui.Select(g => g.MaYeuCau));
        Assert.Equal(new[] { "HT:R:B:1:L1", "HT:R:C:1:L1" }, _db.Gateway.DaTraCuu);
        using var kt = _db.Mo();
        var tt = await kt.Ctx.HoanTiens.ToDictionaryAsync(h => h.MaHoanTien, h => h.TrangThai);
        Assert.Equal(TrangThaiHoanTien.ThanhCong, tt[a]);
        Assert.Equal(TrangThaiHoanTien.ThanhCong, tt[b]);
        Assert.Equal(TrangThaiHoanTien.ThatBai, tt[c]);
    }

    [Fact]
    public async Task DoiChieu_GatewayKhongCoYeuCau_VeChoXuLy_GuiLaiCungMa()
    {
        var don = DonDaThanhToan();
        var id = await LapMotKhoan(don);
        _db.Gateway.KichBan.Enqueue(_ => throw new RefundGatewayKhongRoKetQuaException("mất kết nối trước khi tới gateway"));
        using (var s = _db.Mo()) await s.HoanTien.GuiYeuCauDaLapAsync(new[] { id }, null);
        using (var s = _db.Mo())
            Assert.Equal(TrangThaiHoanTien.ChoXuLy, (await s.HoanTien.DoiChieuKetQuaHoanAsync(id, _du.TkNhanVien)).TrangThai);
        using (var s = _db.Mo())
            Assert.Equal(TrangThaiHoanTien.ThanhCong, (await s.HoanTien.XuLyYeuCauHoanAsync(id, new XuLyHoanRequest(), _du.TkNhanVien)).TrangThai);

        Assert.Equal(2, _db.Gateway.DaGui.Count);
        Assert.Single(_db.Gateway.DaGui.Select(g => g.MaYeuCau).Distinct());
    }

    // ───────────── Quyền xem ─────────────

    [Fact]
    public async Task LayTheoDon_KhachKhac404_KhachChuDonKhongThayMaGateway_NhanVienThay()
    {
        var don = DonDaThanhToan();
        var id = await LapMotKhoan(don);
        using (var s = _db.Mo()) await s.HoanTien.GuiYeuCauDaLapAsync(new[] { id }, null);

        using var kt = _db.Mo();
        await Assert.ThrowsAsync<DonKhongTimThayException>(() => kt.HoanTien.LayDanhSachTheoDonAsync(don.MaDon, _du.TkKhachB));
        var khach = await kt.HoanTien.LayDanhSachTheoDonAsync(don.MaDon, _du.TkKhachA);
        Assert.Null(khach.Items.Single().MaGiaoDichHoanCong);
        var nv = await kt.HoanTien.LayDanhSachTheoDonAsync(don.MaDon, _du.TkNhanVien);
        Assert.NotNull(nv.Items.Single().MaGiaoDichHoanCong);
        // Khách không gọi được thao tác vận hành.
        await Assert.ThrowsAsync<KhongCoQuyenException>(() => kt.HoanTien.XuLyYeuCauHoanAsync(id, new XuLyHoanRequest(), _du.TkKhachA));
    }
}
