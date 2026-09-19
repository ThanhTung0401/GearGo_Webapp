using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("KHUYEN_MAI_SAN_PHAM")]
public class KhuyenMaiSanPham {
    [Column("ma_khuyen_mai")] public long MaKhuyenMai { get; set; }
    [Column("ma_san_pham")] public long MaSanPham { get; set; }
    [ForeignKey(nameof(MaKhuyenMai))] public KhuyenMai KhuyenMai { get; set; } = null!;
    [ForeignKey(nameof(MaSanPham))] public SanPham SanPham { get; set; } = null!;
}
