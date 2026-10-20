using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Integrations.Notifications;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GearGo.Tests;

public class DanhGiaThongBaoTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;

    public DanhGiaThongBaoTests()
    {
        using var ctx = _db.NewContext();
        _du = Seed.CoBan(ctx);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task TaoDanhGia_DonChuaHoanTat_BiChan()
    {
        // 1. Tạo đơn đang ở trạng thái DangThue (chưa HoanTat)
        long maChiTietDon;
        using (var ctx = _db.NewContext())
        {
            var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-2), TrangThaiDonThue.DangThue, 300_000, 500_000);
            maChiTietDon = don.MaChiTietDon;
        }

        using var s = _db.Mo();
        var danhGiaService = new DanhGiaService(s.Ctx);

        // Khách A gửi đánh giá
        var res = await danhGiaService.TaoDanhGiaAsync(new TaoDanhGiaRequest
        {
            MaChiTietDon = maChiTietDon,
            SoSao = 5,
            NoiDung = "Lều rất tốt"
        }, _du.TkKhachA);

        Assert.False(res.ThanhCong);
        Assert.Equal("DON_CHUA_HOAN_TAT", res.MaLoi);
    }

    [Fact]
    public async Task TaoDanhGia_CungSanPhamHaiDong_ChiDanhGiaMotLan()
    {
        // 1. Tạo đơn HoanTat có 2 dòng chi tiết cùng 1 sản phẩm
        long ct1, ct2;
        using (var ctx = _db.NewContext())
        {
            var don = new DonThue
            {
                MaKhachHang = _du.KhachA,
                MaChinhSach = _du.ChinhSach,
                MaDonHienThi = "DH-TEST-DG",
                NgayDat = _db.Clock.Utc.AddDays(-5),
                GioNhanDuKien = _db.Clock.Utc.AddDays(-5),
                GioTraDuKien = _db.Clock.Utc.AddDays(-2),
                TrangThai = TrangThaiDonThue.HoanTat
            };
            ctx.DonThues.Add(don);
            ctx.SaveChanges();

            var c1 = new ChiTietDonThue { MaDonThue = don.MaDonThue, MaSanPham = _du.SanPham, SoLuong = 1, DonGiaThueMoiNgay = 100_000, MucCocMoiThietBi = 500_000, TenSanPhamLucDat = "Lều 4 người" };
            var c2 = new ChiTietDonThue { MaDonThue = don.MaDonThue, MaSanPham = _du.SanPham, SoLuong = 1, DonGiaThueMoiNgay = 100_000, MucCocMoiThietBi = 500_000, TenSanPhamLucDat = "Lều 4 người" };
            ctx.ChiTietDonThues.AddRange(c1, c2);
            ctx.SaveChanges();

            ct1 = c1.MaChiTietDon;
            ct2 = c2.MaChiTietDon;
        }

        using (var s = _db.Mo())
        {
            var service = new DanhGiaService(s.Ctx);

            // Đánh giá dòng 1 thành công
            var res1 = await service.TaoDanhGiaAsync(new TaoDanhGiaRequest
            {
                MaChiTietDon = ct1,
                SoSao = 5,
                NoiDung = "Đánh giá lần 1"
            }, _du.TkKhachA);

            Assert.True(res1.ThanhCong);
            Assert.Equal(5, res1.DuLieu!.SoSao);

            // Đánh giá dòng 2 của cùng sản phẩm trong cùng đơn -> Bị chặn
            var res2 = await service.TaoDanhGiaAsync(new TaoDanhGiaRequest
            {
                MaChiTietDon = ct2,
                SoSao = 4,
                NoiDung = "Đánh giá lần 2"
            }, _du.TkKhachA);

            Assert.False(res2.ThanhCong);
            Assert.Equal("SAN_PHAM_TRONG_DON_DA_DANH_GIA", res2.MaLoi);
        }
    }

    [Fact]
    public async Task LayTongHopDiem_TinhDungTrungBinhVaHistogram_VaCapNhatKhiAn()
    {
        long maDanhGia3Sao = 0;
        using (var ctx = _db.NewContext())
        {
            // Tạo 3 đơn hoàn tất và 3 đánh giá (5 sao, 4 sao, 3 sao)
            for (int sao = 5; sao >= 3; sao--)
            {
                var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-10 + sao), TrangThaiDonThue.HoanTat, 100_000, 200_000);
                var dg = new DanhGia
                {
                    MaChiTietDon = don.MaChiTietDon,
                    SoSao = sao,
                    NoiDung = $"Đánh giá {sao} sao",
                    TrangThaiHienThi = "HienThi",
                    NgayTao = _db.Clock.Utc
                };
                ctx.DanhGias.Add(dg);
                ctx.SaveChanges();

                if (sao == 3) maDanhGia3Sao = dg.MaDanhGia;
            }
        }

        using (var s = _db.Mo())
        {
            var service = new DanhGiaService(s.Ctx);

            // Ban đầu: 3 đánh giá, điểm TB = (5+4+3)/3 = 4.0
            var th1 = await service.LayTongHopDiemAsync(_du.SanPham);
            Assert.True(th1.ThanhCong);
            Assert.Equal(3, th1.DuLieu!.SoDanhGia);
            Assert.Equal(4.0, th1.DuLieu.DiemTrungBinh);
            Assert.Equal(1, th1.DuLieu.ThongKe1Den5Sao[5]);
            Assert.Equal(1, th1.DuLieu.ThongKe1Den5Sao[4]);
            Assert.Equal(1, th1.DuLieu.ThongKe1Den5Sao[3]);

            // Admin ẩn dòng 3 sao
            var an = await service.AnDanhGiaAsync(maDanhGia3Sao, new AnDanhGiaRequest { LyDo = "Nội dung vi phạm" }, _du.TkQuanTri);
            Assert.True(an.ThanhCong);
            Assert.Equal("BiAn", an.DuLieu!.TrangThaiHienThi);

            // Sau khi ẩn: Còn 2 đánh giá, điểm TB = (5+4)/2 = 4.5
            var th2 = await service.LayTongHopDiemAsync(_du.SanPham);
            Assert.True(th2.ThanhCong);
            Assert.Equal(2, th2.DuLieu!.SoDanhGia);
            Assert.Equal(4.5, th2.DuLieu.DiemTrungBinh);
            Assert.Equal(0, th2.DuLieu.ThongKe1Den5Sao[3]);
        }
    }

    [Fact]
    public async Task ThongBaoService_TaoThongBaoSuKien_ChongLapCungEventKey()
    {
        long maDon;
        using (var ctx = _db.NewContext())
        {
            var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-1), TrangThaiDonThue.DangThue, 200_000, 500_000);
            maDon = don.MaDon;
        }

        using var s = _db.Mo();
        var tbService = new ThongBaoService(s.Ctx);

        var cmd = new SuKienThongBaoCommand(maDon, "HoanTat", "EVT:HOANTAT:123", "Đơn đã hoàn tất", "Cảm ơn bạn");

        // Gọi lần 1 -> Tạo mới
        var tb1 = await tbService.TaoThongBaoSuKienAsync(cmd);
        await s.Ctx.SaveChangesAsync();

        // Gọi lần 2 với cùng EventKey -> Trả lại chính bản ghi cũ, không tạo thêm
        var tb2 = await tbService.TaoThongBaoSuKienAsync(cmd);

        Assert.Equal(tb1.MaThongBao, tb2.MaThongBao);
        Assert.Equal(1, await s.Ctx.ThongBaos.CountAsync(t => t.MaSuKien == "EVT:HOANTAT:123"));
    }

    [Fact]
    public async Task GuiThongBaoService_XuLyHangCho_ClaimVaGuiEmailThanhCong()
    {
        long maDon;
        using (var ctx = _db.NewContext())
        {
            var don = Seed.Don(ctx, _du, _db.Clock.Utc.AddDays(-1), TrangThaiDonThue.DangThue, 200_000, 500_000);
            maDon = don.MaDon;

            // Tạo thông báo email chờ gửi
            ctx.ThongBaos.Add(new ThongBao
            {
                MaTaiKhoan = _du.TkKhachA,
                MaDonThue = maDon,
                KenhGui = "Email",
                TrangThaiGui = "ChuaGui",
                TieuDe = "Xác nhận hoàn tất đơn thuê",
                NoiDung = "Đơn của bạn đã hoàn tất.",
                MaSuKien = "EMAIL:HOANTAT:999",
                ThoiDiemTao = _db.Clock.Utc
            });
            ctx.SaveChanges();
        }

        using var s = _db.Mo();
        var mockEmail = new MockEmailNotificationAdapter(NullLogger<MockEmailNotificationAdapter>.Instance);
        var guiService = new GuiThongBaoService(s.Ctx, mockEmail, NullLogger<GuiThongBaoService>.Instance);

        int count = await guiService.XuLyHangChoAsync(10);
        Assert.Equal(1, count);

        // Kiểm tra database: Trạng thái đã chuyển sang DaGui và ghi nhận ThoiDiemGui
        var tb = await s.Ctx.ThongBaos.FirstAsync(t => t.MaSuKien == "EMAIL:HOANTAT:999");
        Assert.Equal("DaGui", tb.TrangThaiGui);
        Assert.NotNull(tb.ThoiDiemGui);
        Assert.Single(mockEmail.DaGui);
    }
}
