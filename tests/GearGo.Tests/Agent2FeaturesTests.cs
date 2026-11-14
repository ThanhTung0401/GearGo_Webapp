using GearGo.Exceptions;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

public class Agent2FeaturesTests
{
    private static DonThueService TaoDonThueService(GearGo.Data.ApplicationDbContext ctx)
    {
        return new DonThueService(
            ctx,
            new KhaDungService(ctx),
            new KhuyenMaiService(ctx),
            new ChinhSachService(ctx, NullLogger<ChinhSachService>.Instance),
            NullLogger<DonThueService>.Instance);
    }

    private static (DuLieuMau Du, long MaThietBi) SeedSanPhamCoThietBi(GearGo.Data.ApplicationDbContext ctx, int holdMinutes = 30)
    {
        var du = Seed.CoBan(ctx);

        // Cập nhật chính sách có thời gian giữ chỗ tùy chỉnh
        var cs = new ChinhSach
        {
            MaNguoiTao = du.NhanVien,
            PhienBan = 999,
            ThoiDiemApDung = DateTime.UtcNow.AddDays(-1),
            NoiDungChinhSach = $"{{\"thoiGianGiuChoPhut\":{holdMinutes},\"heSoTre\":1.5}}",
            NgayTao = DateTime.UtcNow.AddDays(-1)
        };
        ctx.ChinhSachs.Add(cs);

        var ncc = new NhaCungCap { MaNhaCungCapHienThi = $"NCC-{Guid.NewGuid():N}".Substring(0, 12), TenNhaCungCap = "NCC Test" };
        ctx.NhaCungCaps.Add(ncc);
        ctx.SaveChanges();

        var pn = new PhieuNhapHang { MaNhaCungCap = ncc.MaNhaCungCap, MaNguoiLap = du.NhanVien, MaPhieuHienThi = $"PN-{Guid.NewGuid():N}".Substring(0, 12), TrangThai = TrangThaiPhieuNhap.DaNhapKho };
        ctx.PhieuNhapHangs.Add(pn);
        ctx.SaveChanges();

        var ctpn = new ChiTietPhieuNhap { MaPhieuNhap = pn.MaPhieuNhap, MaSanPham = du.SanPham, SoLuong = 1, DonGiaNhap = 1_000_000 };
        ctx.ChiTietPhieuNhaps.Add(ctpn);
        ctx.SaveChanges();

        var tb = new ThietBi
        {
            MaSanPhamHienTai = du.SanPham,
            MaChiTietPhieuNhap = ctpn.MaChiTietPhieuNhap,
            MaThietBiHienThi = $"TB-{Guid.NewGuid():N}".Substring(0, 12),
            TrangThaiSuDung = TrangThaiThietBi.SanSang
        };
        ctx.ThietBis.Add(tb);
        ctx.SaveChanges();
        return (du, tb.MaThietBi);
    }

    [Fact]
    public async Task UC32_TaoDonThue_IdempotencyKey_KhongTaoTrungDon()
    {
        using var db = new TestDb();
        using var scope = db.Mo();
        var (du, _) = SeedSanPhamCoThietBi(scope.Ctx);
        var svc = TaoDonThueService(scope.Ctx);

        var gioNhan = DateTime.UtcNow.AddDays(2);
        var gioTra = gioNhan.AddDays(2);
        var req = new TaoDonThueRequest
        {
            MaTaiKhoan = du.TkKhachA,
            GioNhanDuKien = gioNhan,
            GioTraDuKien = gioTra,
            TenNguoiNhan = "Khách A",
            SoDienThoaiNguoiNhan = "0900000001",
            EmailLienHe = "a@test.vn",
            IdempotencyKey = "idem-test-001",
            ChiTiet = new List<ChiTietDonThueDto> { new(du.SanPham, 1) }
        };

        var kq1 = await svc.TaoDonThueAsync(req);
        var kq2 = await svc.TaoDonThueAsync(req);

        Assert.True(kq1.ThanhCong);
        Assert.True(kq2.ThanhCong);
        Assert.Equal(kq1.DuLieu!.MaDonThue, kq2.DuLieu!.MaDonThue);
        Assert.Equal(1, scope.Ctx.DonThues.Count(d => d.IdempotencyKey == "idem-test-001"));
    }

    [Fact]
    public async Task UC32_TaoDonThue_LayThoiGianGiuChoTuChinhSach()
    {
        using var db = new TestDb();
        using var scope = db.Mo();
        var (du, _) = SeedSanPhamCoThietBi(scope.Ctx, holdMinutes: 45);
        var svc = TaoDonThueService(scope.Ctx);

        var gioNhan = DateTime.UtcNow.AddDays(2);
        var req = new TaoDonThueRequest
        {
            MaTaiKhoan = du.TkKhachA,
            GioNhanDuKien = gioNhan,
            GioTraDuKien = gioNhan.AddDays(1),
            TenNguoiNhan = "Khách A",
            SoDienThoaiNguoiNhan = "0900000001",
            EmailLienHe = "a@test.vn",
            ChiTiet = new List<ChiTietDonThueDto> { new(du.SanPham, 1) }
        };

        var before = DateTime.UtcNow;
        var kq = await svc.TaoDonThueAsync(req);

        Assert.True(kq.ThanhCong);
        var diffMinutes = (kq.DuLieu!.HanThanhToan - before).TotalMinutes;
        Assert.InRange(diffMinutes, 44.0, 46.5);
    }

    [Fact]
    public async Task UC322_BaoGiaThayDoi_TraLoiVaChoPhepKhiDongY()
    {
        using var db = new TestDb();
        using var scope = db.Mo();
        var (du, _) = SeedSanPhamCoThietBi(scope.Ctx);
        var svc = TaoDonThueService(scope.Ctx);

        var gioNhan = DateTime.UtcNow.AddDays(2);
        var gioTra = gioNhan.AddDays(2); // 2 ngày * 100k + 500k cọc = 700k

        // Gửi giá kỳ vọng sai (650k) và chưa đồng ý
        var reqFail = new TaoDonThueRequest
        {
            MaTaiKhoan = du.TkKhachA,
            GioNhanDuKien = gioNhan,
            GioTraDuKien = gioTra,
            TenNguoiNhan = "Khách A",
            SoDienThoaiNguoiNhan = "0900000001",
            EmailLienHe = "a@test.vn",
            GiaTamTinhKyVong = 650_000m,
            DongYThayDoiGia = false,
            ChiTiet = new List<ChiTietDonThueDto> { new(du.SanPham, 1) }
        };

        var kqFail = await svc.TaoDonThueAsync(reqFail);
        Assert.False(kqFail.ThanhCong);
        Assert.Equal("BAO_GIA_THAY_DOI", kqFail.MaLoi);
        Assert.NotNull(kqFail.ChiTiet);

        // Xác nhận DongYThayDoiGia = true -> thành công
        var reqOk = reqFail with { DongYThayDoiGia = true };
        var kqOk = await svc.TaoDonThueAsync(reqOk);
        Assert.True(kqOk.ThanhCong);
    }

    [Fact]
    public async Task UC41_ChuanBiDon_BaoThieuThietBi_GhiNhatKyVaThongBaoAdmin()
    {
        using var db = new TestDb();
        using var scope = db.Mo();
        var (du, _) = SeedSanPhamCoThietBi(scope.Ctx);
        var donMau = Seed.Don(scope.Ctx, du, DateTime.UtcNow.AddDays(1), TrangThaiDonThue.DangChuanBi);

        var chuanBiSvc = new ChuanBiDonService(
            scope.Ctx,
            new ThietBiService(scope.Ctx),
            scope.LichSu,
            scope.ThongBao);

        // Thiếu lý do -> ném lỗi
        await Assert.ThrowsAsync<DuLieuKhongHopLeException>(() =>
            chuanBiSvc.BaoThieuThietBiAsync(donMau.MaDon, new BaoThieuThietBiRequest { LyDo = "" }, du.TkNhanVien));

        // Hợp lệ -> ghi nhật ký + thông báo cho admin
        var res = await chuanBiSvc.BaoThieuThietBiAsync(
            donMau.MaDon,
            new BaoThieuThietBiRequest
            {
                DongDonId = donMau.MaChiTietDon,
                SoLuongThieu = 1,
                LyDo = "Thiết bị hỏng bất ngờ"
            },
            du.TkNhanVien);

        Assert.True(res.ThanhCong);
        Assert.True(res.DuLieu!.SoThongBaoDaGui >= 1);
        Assert.Contains(scope.Ctx.NhatKyThaoTacs, n => n.HanhDong == "BaoThieuThietBi" && n.MaDoiTuong == donMau.MaDon.ToString());
        Assert.Contains(scope.Ctx.ThongBaos, tb => tb.MaDonThue == donMau.MaDon && tb.LoaiSuKien == "BaoThieuThietBi");
    }

    [Fact]
    public async Task UC44_QuaHan_GhiVaDocNhatKyLienHe()
    {
        using var db = new TestDb();
        using var scope = db.Mo();
        var (du, _) = SeedSanPhamCoThietBi(scope.Ctx);
        var donMau = Seed.Don(scope.Ctx, du, DateTime.UtcNow.AddDays(-3), TrangThaiDonThue.DangThue);

        var quaHanSvc = new QuaHanService(
            scope.Ctx,
            new KhaDungService(scope.Ctx),
            scope.ThongBao,
            NullLogger<QuaHanService>.Instance);

        // Nội dung rỗng -> lỗi
        var emptyRes = await quaHanSvc.GhiNhatKyLienHeAsync(
            donMau.MaDon,
            new TaoNhatKyLienHeQuaHanRequest { NoiDung = "   " },
            du.TkNhanVien);
        Assert.False(emptyRes.ThanhCong);
        Assert.Equal("DU_LIEU_KHONG_HOP_LE", emptyRes.MaLoi);

        // Ghi thành công 2 lần
        var r1 = await quaHanSvc.GhiNhatKyLienHeAsync(
            donMau.MaDon,
            new TaoNhatKyLienHeQuaHanRequest { KenhLienHe = "GoiDien", KetQua = "KhongNgheMay", NoiDung = "Gọi lần 1 không bắt máy" },
            du.TkNhanVien);
        var r2 = await quaHanSvc.GhiNhatKyLienHeAsync(
            donMau.MaDon,
            new TaoNhatKyLienHeQuaHanRequest { KenhLienHe = "Zalo", KetQua = "HenNgayTra", NoiDung = "Khách hẹn mai trả", HenTraMoi = DateTime.UtcNow.AddDays(1) },
            du.TkNhanVien);

        Assert.True(r1.ThanhCong);
        Assert.True(r2.ThanhCong);

        var list = await quaHanSvc.LayNhatKyLienHeAsync(donMau.MaDon, du.TkNhanVien);
        Assert.True(list.ThanhCong);
        Assert.Equal(2, list.DuLieu!.Count);
        Assert.Equal("Zalo", list.DuLieu[0].KenhLienHe);
    }
}
