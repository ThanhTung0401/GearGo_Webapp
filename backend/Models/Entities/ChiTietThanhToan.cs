using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("CHI_TIET_THANH_TOAN")]
public class ChiTietThanhToan
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_chi_tiet_thanh_toan")]
    public long MaChiTietThanhToan { get; set; }

    [Column("ma_thanh_toan")]
    public long MaThanhToan { get; set; }

    [Column("loai_tien")]
    [MaxLength(50)]
    public string LoaiTien { get; set; } = string.Empty; // TienThue, TienCoc, TienPhat, TienBoiThuong

    [Column("so_tien", TypeName = "decimal(18,2)")]
    public decimal SoTien { get; set; }

    // -- Navigation Property --
    [ForeignKey(nameof(MaThanhToan))]
    public ThanhToan ThanhToan { get; set; } = null!;
}
