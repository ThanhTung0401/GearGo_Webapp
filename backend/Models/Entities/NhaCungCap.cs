using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("NHA_CUNG_CAP")]
public class NhaCungCap {
    [Key] [Column("ma_nha_cung_cap")] public long MaNhaCungCap { get; set; }
    [Column("ma_nha_cung_cap_hien_thi")] [MaxLength(50)] public string MaNhaCungCapHienThi { get; set; } = null!;
    [Column("ten_nha_cung_cap")] [MaxLength(255)] public string TenNhaCungCap { get; set; } = null!;
    [Column("nguoi_lien_he")] [MaxLength(255)] public string? NguoiLienHe { get; set; }
    [Column("so_dien_thoai")] [MaxLength(20)] public string? SoDienThoai { get; set; }
    [Column("email")] [MaxLength(255)] public string? Email { get; set; }
    [Column("dia_chi")] public string? DiaChi { get; set; }
    [Column("ma_so_thue")] [MaxLength(50)] public string? MaSoThue { get; set; }
    [Column("ghi_chu")] public string? GhiChu { get; set; }
    [Column("trang_thai_hop_tac")] [MaxLength(50)] public string TrangThaiHopTac { get; set; } = "DangHopTac";
}
