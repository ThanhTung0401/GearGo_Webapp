using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("DANH_MUC_SAN_PHAM")]
public class DanhMucSanPham
{
    [Key]
    public long MaDanhMuc { get; set; }

    public long? MaDanhMucCha { get; set; }

    public string TenDanhMuc { get; set; } = null!;

    public string? MoTa { get; set; }

    public int ThuTuHienThi { get; set; }

    public string TrangThai { get; set; } = null!;

    // Navigation properties
    public DanhMucSanPham? DanhMucCha { get; set; }
    public ICollection<DanhMucSanPham> DanhMucCon { get; set; } = new List<DanhMucSanPham>();
    public ICollection<SanPham> SanPhams { get; set; } = new List<SanPham>();
}
