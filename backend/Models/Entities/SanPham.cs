using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GearGo.Models.Enums;

namespace GearGo.Models.Entities;

[Table("SAN_PHAM")]
public class SanPham
{
    [Key]
    public long MaSanPham { get; set; }

    public long MaDanhMuc { get; set; }

    public string MaSanPhamHienThi { get; set; } = null!;

    public string TenSanPham { get; set; } = null!;

    public string? ThuongHieu { get; set; }

    public string? MoTa { get; set; }

    public int? SucChua { get; set; }

    public string? KichThuoc { get; set; }

    public string? ThongSo { get; set; }

    public decimal GiaThueMoiNgay { get; set; }

    public decimal MucCocMoiThietBi { get; set; }

    public decimal GiaTriBoiThuong { get; set; }

    public string TrangThaiKinhDoanh { get; set; } = null!;

    // Navigation properties
    public DanhMucSanPham DanhMuc { get; set; } = null!;
    public ICollection<HinhAnhSanPham> HinhAnhs { get; set; } = new List<HinhAnhSanPham>();
}
