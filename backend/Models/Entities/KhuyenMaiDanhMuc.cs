using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("KHUYEN_MAI_DANH_MUC")]
public class KhuyenMaiDanhMuc {
    [Column("ma_khuyen_mai")] public long MaKhuyenMai { get; set; }
    [Column("ma_danh_muc")] public long MaDanhMuc { get; set; }
    [ForeignKey(nameof(MaKhuyenMai))] public KhuyenMai KhuyenMai { get; set; } = null!;
    [ForeignKey(nameof(MaDanhMuc))] public DanhMucSanPham DanhMucSanPham { get; set; } = null!;
}
