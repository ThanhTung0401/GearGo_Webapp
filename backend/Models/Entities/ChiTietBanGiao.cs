using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Chi tiết bàn giao từng thiết bị
/// </summary>
[Table("CHI_TIET_BAN_GIAO")]
public class ChiTietBanGiao
{
    [Key]
    [Column("ma_chi_tiet_ban_giao")]
    public long MaChiTietBanGiao { get; set; }

    [Column("ma_phieu_ban_giao")]
    public long MaPhieuBanGiao { get; set; }

    [Column("ma_phan_cong")]
    public long MaPhanCong { get; set; }

    [Column("tinh_trang_truoc_thue")]
    public string? TinhTrangTruocThue { get; set; }

    [Column("phu_kien_thuc_giao", TypeName = "nvarchar(max)")]
    public string? PhuKienThucGiao { get; set; } // JSON

    [Column("danh_sach_anh", TypeName = "nvarchar(max)")]
    public string? DanhSachAnh { get; set; } // JSON

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaPhieuBanGiao))]
    public PhieuBanGiao PhieuBanGiao { get; set; } = null!;

    [ForeignKey(nameof(MaPhanCong))]
    public PhanCongThietBi PhanCongThietBi { get; set; } = null!;

    public ChiTietNhanTra? ChiTietNhanTra { get; set; }
}
