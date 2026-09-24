using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Lịch sử thay đổi tình trạng thiết bị theo thời gian
/// </summary>
[Table("LICH_SU_TINH_TRANG_THIET_BI")]
public class LichSuTinhTrangThietBi
{
    [Key]
    [Column("ma_lich_su_thiet_bi")]
    public long MaLichSuThietBi { get; set; }

    [Column("ma_thiet_bi")]
    public long MaThietBi { get; set; }

    [Column("ma_nguoi_thuc_hien")]
    public long? MaNguoiThucHien { get; set; }

    [Column("trang_thai_truoc")]
    [MaxLength(50)]
    public string? TrangThaiTruoc { get; set; }

    [Column("trang_thai_sau")]
    [MaxLength(50)]
    public string? TrangThaiSau { get; set; }

    [Column("tinh_trang_truoc")]
    public string? TinhTrangTruoc { get; set; }

    [Column("tinh_trang_sau")]
    public string? TinhTrangSau { get; set; }

    [Column("thoi_diem")]
    public DateTime ThoiDiem { get; set; } = DateTime.UtcNow;

    [Column("ly_do")]
    public string? LyDo { get; set; }

    [Column("tham_chieu_chung_tu", TypeName = "nvarchar(max)")]
    public string? ThamChieuChungTu { get; set; } // JSON

    // Navigation properties
    [ForeignKey(nameof(MaThietBi))]
    public ThietBi ThietBi { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiThucHien))]
    public TaiKhoan? NguoiThucHien { get; set; }
}
