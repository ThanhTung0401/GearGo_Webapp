using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("HINH_ANH_SAN_PHAM")]
public class HinhAnhSanPham {
    [Key] [Column("ma_hinh_anh")] public long MaHinhAnh { get; set; }
    [Column("ma_san_pham")] public long MaSanPham { get; set; }
    [Column("duong_dan")] public string DuongDan { get; set; } = null!;
    [Column("la_anh_chinh")] public bool LaAnhChinh { get; set; }
    [Column("thu_tu")] public int ThuTu { get; set; }
    [ForeignKey(nameof(MaSanPham))] public SanPham SanPham { get; set; } = null!;
}
