using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("CHI_TIET_DON_THUE")]
public class ChiTietDonThue
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_chi_tiet_don")]
    public long MaChiTietDon { get; set; }

    // Khóa ngoại
    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_san_pham")]
    public long MaSanPham { get; set; }

    [Column("ten_san_pham_luc_dat")]
    [MaxLength(255)]
    public string? TenSanPhamLucDat { get; set; }

    [Column("so_luong")]
    public int SoLuong { get; set; }

    [Column("so_ngay_tinh_tien")]
    public int SoNgayTinhTien { get; set; }

    [Column("don_gia_thue_moi_ngay", TypeName = "decimal(18,2)")]
    public decimal DonGiaThueMoiNgay { get; set; }

    [Column("tien_giam", TypeName = "decimal(18,2)")]
    public decimal TienGiam { get; set; }

    [Column("muc_coc_moi_thiet_bi", TypeName = "decimal(18,2)")]
    public decimal MucCocMoiThietBi { get; set; }

    [Column("gia_tri_boi_thuong_moi_thiet_bi", TypeName = "decimal(18,2)")]
    public decimal GiaTriBoiThuongMoiThietBi { get; set; }

    [Column("phu_kien_va_muc_boi_thuong_luc_dat", TypeName = "nvarchar(max)")]
    public string? PhuKienVaMucBoiThuongLucDat { get; set; }

    // -- Navigation Properties --
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaSanPham))]
    public SanPham SanPham { get; set; } = null!;

    // Quan hệ 1-1 với Giữ Chỗ
    public GiuCho? GiuCho { get; set; }
}
