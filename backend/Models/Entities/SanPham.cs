using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GearGo.Models.Enums;
namespace GearGo.Models.Entities;
[Table("SAN_PHAM")]
public class SanPham {
    [Key] [Column("ma_san_pham")] public long MaSanPham { get; set; }
    [Column("ma_danh_muc")] public long MaDanhMuc { get; set; }
    [Column("ma_san_pham_hien_thi")] public string MaSanPhamHienThi { get; set; } = null!;
    [Column("ten_san_pham")] public string TenSanPham { get; set; } = null!;
    [Column("thuong_hieu")] public string? ThuongHieu { get; set; }
    [Column("mo_ta")] public string? MoTa { get; set; }
    [Column("suc_chua")] public int? SucChua { get; set; }
    [Column("kich_thuoc")] public string? KichThuoc { get; set; }
    [Column("thong_so")] public string? ThongSo { get; set; }
    [Column("gia_thue_moi_ngay")] public decimal GiaThueMoiNgay { get; set; }
    [Column("muc_coc_moi_thiet_bi")] public decimal MucCocMoiThietBi { get; set; }
    [Column("gia_tri_boi_thuong")] public decimal GiaTriBoiThuong { get; set; }
    [Column("trang_thai_kinh_doanh")] public TrangThaiKinhDoanh TrangThaiKinhDoanh { get; set; }
    [ForeignKey(nameof(MaDanhMuc))] public DanhMucSanPham DanhMuc { get; set; } = null!;
    public ICollection<HinhAnhSanPham> HinhAnhs { get; set; } = new List<HinhAnhSanPham>();
    public ICollection<ThietBi> ThietBis { get; set; } = new List<ThietBi>();
}
