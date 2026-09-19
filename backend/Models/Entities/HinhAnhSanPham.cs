using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("HINH_ANH_SAN_PHAM")]
public class HinhAnhSanPham
{
    [Key]
    public long MaHinhAnh { get; set; }

    public long MaSanPham { get; set; }

    public string DuongDan { get; set; } = null!;

    public bool LaAnhChinh { get; set; }

    public int ThuTu { get; set; }

    // Navigation property
    public SanPham SanPham { get; set; } = null!;
}
