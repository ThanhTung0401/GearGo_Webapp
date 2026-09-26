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

    [Column("muc_dich")]
    [MaxLength(50)]
    public string MucDich { get; set; } = string.Empty; // TienThue, TienCoc, ThuBoSung

    [Column("so_tien", TypeName = "decimal(18,2)")]
    public decimal SoTien { get; set; }

    // -- Navigation Property --
    [ForeignKey(nameof(MaThanhToan))]
    public ThanhToan ThanhToan { get; set; } = null!;

    public GiaoDichDoiSoat? GiaoDichDoiSoat { get; set; }
    public ICollection<HoanTien> HoanTiens { get; set; } = new List<HoanTien>();
}
