using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("LICH_SU_TRANG_THAI_DON")]
public class LichSuTrangThaiDon
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_lich_su_don")]
    public long MaLichSuDon { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_nguoi_thuc_hien")]
    public long? MaNguoiThucHien { get; set; }

    [Column("trang_thai_truoc")]
    public string TrangThaiTruoc { get; set; } = string.Empty;

    [Column("trang_thai_sau")]
    public string TrangThaiSau { get; set; } = string.Empty;

    [Column("thoi_diem")]
    public DateTime ThoiDiem { get; set; }

    [Column("ly_do")]
    public string? LyDo { get; set; }

    // -- Navigation Properties --
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiThucHien))]
    public TaiKhoan? NguoiThucHien { get; set; }
}
