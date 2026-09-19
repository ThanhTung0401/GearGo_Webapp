using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("CHI_TIET_DON_THUE")]
public class ChiTietDonThue {
    [Key] [Column("ma_chi_tiet_don")] public long MaChiTietDon { get; set; }
    [Column("ma_don_thue")] public long MaDonThue { get; set; }
    [Column("ma_san_pham")] public long MaSanPham { get; set; }
    [Column("so_luong")] public int SoLuong { get; set; }
    [Column("so_ngay_tinh_tien")] public int SoNgayTinhTien { get; set; }
    [Column("ten_san_pham")] [MaxLength(255)] public string TenSanPham { get; set; } = null!;
    [Column("don_gia")] public decimal DonGia { get; set; }
    [Column("muc_coc")] public decimal MucCoc { get; set; }
    [Column("boi_thuong")] public decimal BoiThuong { get; set; }
    [Column("phu_kien")] public string? PhuKien { get; set; }
    [ForeignKey(nameof(MaDonThue))] public DonThue DonThue { get; set; } = null!;
    [ForeignKey(nameof(MaSanPham))] public SanPham SanPham { get; set; } = null!;
}
