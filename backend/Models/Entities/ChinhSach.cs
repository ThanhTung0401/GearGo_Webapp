using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("CHINH_SACH")]
public class ChinhSach
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_chinh_sach")]
    public long MaChinhSach { get; set; }

    [Column("ma_nguoi_tao")]
    public long MaNguoiTao { get; set; }

    [Column("ten_chinh_sach")]
    [MaxLength(255)]
    public string? TenChinhSach { get; set; }

    [Column("phien_ban")]
    public int PhienBan { get; set; }

    [Column("thoi_diem_ap_dung")]
    public DateTime ThoiDiemApDung { get; set; }

    // Dạng chuỗi JSON
    [Column("noi_dung_chinh_sach", TypeName = "nvarchar(max)")]
    public string? NoiDungChinhSach { get; set; }

    [Column("ngay_tao")]
    public DateTime NgayTao { get; set; }

    // Navigation Property
    [ForeignKey(nameof(MaNguoiTao))]
    public NhanVien NguoiTao { get; set; } = null!;
}
