using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("CHI_TIET_GIO_THUE")]
public class ChiTietGioThue {
    [Key] [Column("ma_chi_tiet_gio")] public long MaChiTietGio { get; set; }
    [Column("ma_gio_thue")] public long MaGioThue { get; set; }
    [Column("ma_san_pham")] public long MaSanPham { get; set; }
    [Column("so_luong")] public int SoLuong { get; set; }
    [ForeignKey(nameof(MaGioThue))] public GioThue GioThue { get; set; } = null!;
    [ForeignKey(nameof(MaSanPham))] public SanPham SanPham { get; set; } = null!;
}
