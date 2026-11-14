using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Nhật ký liên hệ khách hàng đối với các đơn thuê quá hạn (UC4.4)
/// </summary>
[Table("NHAT_KY_LIEN_HE_QUA_HAN")]
public class NhatKyLienHeQuaHan
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_nhat_ky_lien_he")]
    public long MaNhatKyLienHe { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_tai_khoan")]
    public long MaTaiKhoan { get; set; }

    [Column("kenh_lien_he")]
    [MaxLength(50)]
    public string KenhLienHe { get; set; } = string.Empty;

    [Column("ket_qua")]
    [MaxLength(100)]
    public string KetQua { get; set; } = string.Empty;

    [Column("noi_dung")]
    public string NoiDung { get; set; } = string.Empty;

    [Column("hen_tra_moi")]
    public DateTime? HenTraMoi { get; set; }

    [Column("thoi_diem_lien_he")]
    public DateTime ThoiDiemLienHe { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaTaiKhoan))]
    public TaiKhoan NguoiLienHe { get; set; } = null!;
}
