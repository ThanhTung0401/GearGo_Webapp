using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("CHI_TIET_DON_THUE")]
public class ChiTietDonThue
{
    public long MaChiTietDon { get; set; }

    // Khóa ngoại
    public long MaDonThue { get; set; }
    public long MaSanPham { get; set; }

    public string TenSanPhamLucDat { get; set; } = string.Empty;
    public int SoLuong { get; set; }
    public int SoNgayTinhTien { get; set; }
    public decimal DonGiaThueMoiNgay { get; set; }
    public decimal TienGiam { get; set; }
    public decimal MucCocMoiThietBi { get; set; }
    public decimal GiaTriBoiThuongMoiThietBi { get; set; }
    public string PhuKienVaMucBoiThuongLucDat { get; set; } = string.Empty;

    // -- Navigation Properties --
    public DonThue DonThue { get; set; } = null!;
    public SanPham SanPham { get; set; } = null!;

    // @OneToOne
    public GiuCho? GiuCho { get; set; }
}
