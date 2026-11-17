using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Enums;
using Xunit;

namespace GearGo.Tests;

/// <summary>W4-T7-A01 — chọn nhánh chính sách đúng ở mọi ranh giới 24/48 giờ (hàm thuần, không I/O).</summary>
public class BangTinhHuyTests
{
    private static readonly DateTime GioNhan = new(2026, 10, 10, 3, 0, 0, DateTimeKind.Utc);
    private static readonly ChinhSachHuy CsMau = new(0.5m, 1.0m, 120, 1.0m);

    private static BangHuy Tinh(TimeSpan truocNhan, string loai = LoaiHuyDon.KhachHuy, decimal thue = 400_000, decimal coc = 1_000_000,
        ChinhSachHuy? cs = null, bool daThanhToan = true)
        => BangTinhHuy.Tinh(new DauVaoBangHuy(1, "DaXacNhan", loai, GioNhan, GioNhan - truocNhan, daThanhToan,
            daThanhToan ? thue : 0, daThanhToan ? coc : 0, thue, coc, cs ?? CsMau, 1));

    [Theory]
    [InlineData(48 * 60 + 1, NhanhChinhSachHuy.Tren48Gio, 0)]          // trước 48 giờ 1 phút
    [InlineData(48 * 60, NhanhChinhSachHuy.Tu24Den48Gio, 200_000)]     // đúng 48 giờ
    [InlineData(36 * 60, NhanhChinhSachHuy.Tu24Den48Gio, 200_000)]
    [InlineData(24 * 60, NhanhChinhSachHuy.Tu24Den48Gio, 200_000)]     // đúng 24 giờ
    [InlineData(24 * 60 - 1, NhanhChinhSachHuy.Duoi24Gio, 400_000)]    // dưới 24 giờ 1 phút
    [InlineData(-30, NhanhChinhSachHuy.Duoi24Gio, 400_000)]            // đã qua giờ nhận nhưng chưa bàn giao
    public void A01_RanhGioi(int phutTruocNhan, string nhanh, int giuLai)
    {
        var b = Tinh(TimeSpan.FromMinutes(phutTruocNhan));
        Assert.Equal(nhanh, b.Nhanh);
        Assert.Equal(giuLai, b.TienThueGiuLai);
        Assert.Equal(400_000 - giuLai, b.TienThueHoan);
        Assert.Equal(1_000_000, b.TienCocHoan); // cọc trước bàn giao luôn hoàn đủ
    }

    [Fact]
    public void ViDu13_3_CuaHangHuy_HoanToanBo()
    {
        var b = Tinh(TimeSpan.FromHours(2), LoaiHuyDon.CuaHangHuy);
        Assert.Equal(NhanhChinhSachHuy.CuaHangHuy, b.Nhanh);
        Assert.Equal(0, b.TienThueGiuLai);
        Assert.Equal(1_400_000, b.TongHoan);
    }

    [Fact]
    public void ChuaThanhToan_KhongPhi_KhongHoan()
    {
        var b = Tinh(TimeSpan.FromHours(2), daThanhToan: false);
        Assert.Equal(NhanhChinhSachHuy.ChuaThanhToan, b.Nhanh);
        Assert.False(b.CoTien);
    }

    [Fact]
    public void ThieuCauHinh_KhongTuBiaTyLe()
    {
        var rong = new ChinhSachHuy(null, null, null, null);
        Assert.Throws<ChinhSachHuyChuaDuException>(() => Tinh(TimeSpan.FromHours(30), cs: rong));
        Assert.Throws<ChinhSachHuyChuaDuException>(() => Tinh(TimeSpan.FromHours(3), cs: rong));
        Assert.Throws<ChinhSachHuyChuaDuException>(() => Tinh(TimeSpan.FromHours(3), LoaiHuyDon.KhongDenNhan, cs: rong));
        // Nhánh không cần tỷ lệ vẫn tính được.
        Assert.Equal(0, Tinh(TimeSpan.FromHours(72), cs: rong).TienThueGiuLai);
    }

    [Fact]
    public void ThuVuotNghiaVu_KhongVaoBangHuy()
    {
        var b = BangTinhHuy.Tinh(new DauVaoBangHuy(1, "DaXacNhan", LoaiHuyDon.KhachHuy, GioNhan, GioNhan.AddHours(-72), true,
            800_000, 1_000_000, 400_000, 1_000_000, CsMau, 1));
        Assert.Equal(400_000, b.TienThueHoan);
        Assert.Equal(400_000, b.TienThuVuot);
    }

    [Fact]
    public void DauVanTay_DoiKhiDoiNhanh_KhongDoiTheoThoiGianTrongCungNhanh()
    {
        var a = Tinh(TimeSpan.FromMinutes(24 * 60 + 1));
        var b = Tinh(TimeSpan.FromMinutes(24 * 60 + 30));
        var c = Tinh(TimeSpan.FromMinutes(24 * 60 - 1));
        Assert.Equal(a.DauVanTay, b.DauVanTay);
        Assert.NotEqual(a.DauVanTay, c.DauVanTay);
    }

    [Fact]
    public void DocChinhSach_KhongPhanBietHoaThuong_VaChanGiaTriNgoaiMien()
    {
        var cs = ChinhSachHuy.Doc("""{"HuyDon":{"TyLeGiuLaiTu24Den48Gio":0.3}}""", 1);
        Assert.Equal(0.3m, cs.TyLeGiuLaiTu24Den48Gio);
        Assert.Null(cs.TyLeGiuLaiDuoi24Gio);
        Assert.Throws<ChinhSachHuyChuaDuException>(() => ChinhSachHuy.Doc("""{"huyDon":{"tyLeGiuLaiDuoi24Gio":1.5}}""", 1));
        Assert.Throws<ChinhSachHuyChuaDuException>(() => ChinhSachHuy.Doc("không phải json", 1));
    }
}
