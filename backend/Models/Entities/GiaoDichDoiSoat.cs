using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Giao dịch đối soát liên kết phiếu đối soát với chi tiết thanh toán
/// </summary>
[Table("GIAO_DICH_DOI_SOAT")]
public class GiaoDichDoiSoat
{
    [Key]
    [Column("ma_giao_dich_doi_soat")]
    public long MaGiaoDichDoiSoat { get; set; }

    [Column("ma_doi_soat")]
    public long MaDoiSoat { get; set; }

    [Column("ma_chi_tiet_thanh_toan")]
    public long MaChiTietThanhToan { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaDoiSoat))]
    public DoiSoatTienCoc DoiSoatTienCoc { get; set; } = null!;

    [ForeignKey(nameof(MaChiTietThanhToan))]
    public ChiTietThanhToan ChiTietThanhToan { get; set; } = null!;
}
