using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("DANH_MUC_SAN_PHAM")]
public class DanhMucSanPham {
    [Key] [Column("ma_danh_muc")] public long MaDanhMuc { get; set; }
    [Column("ma_danh_muc_cha")] public long? MaDanhMucCha { get; set; }
    [Column("ten_danh_muc")] public string TenDanhMuc { get; set; } = null!;
    [Column("mo_ta")] public string? MoTa { get; set; }
    [Column("thu_tu_hien_thi")] public int ThuTuHienThi { get; set; }
    [Column("trang_thai")] public string TrangThai { get; set; } = null!;
    [ForeignKey(nameof(MaDanhMucCha))] public DanhMucSanPham? DanhMucCha { get; set; }
    public ICollection<DanhMucSanPham> DanhMucCon { get; set; } = new List<DanhMucSanPham>();
    public ICollection<SanPham> SanPhams { get; set; } = new List<SanPham>();
}
