using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Thông báo hệ thống gửi đến người dùng
/// </summary>
[Table("THONG_BAO")]
public class ThongBao
{
    [Key]
    [Column("ma_thong_bao")]
    public long MaThongBao { get; set; }

    [Column("ma_tai_khoan")]
    public long MaTaiKhoan { get; set; }

    [Column("ma_don_thue")]
    public long? MaDonThue { get; set; }

    [Column("ma_su_kien")]
    [MaxLength(100)]
    public string? MaSuKien { get; set; }

    [Column("loai_su_kien")]
    [MaxLength(50)]
    public string? LoaiSuKien { get; set; }

    [Column("tieu_de")]
    [MaxLength(255)]
    public string? TieuDe { get; set; }

    [Column("noi_dung")]
    public string? NoiDung { get; set; }

    [Column("kenh_gui")]
    [MaxLength(50)]
    public string? KenhGui { get; set; }

    [Column("trang_thai_gui")]
    [MaxLength(50)]
    public string TrangThaiGui { get; set; } = "ChuaGui";

    [Column("so_lan_thu_gui")]
    public int SoLanThuGui { get; set; } = 0;

    [Column("thoi_diem_tao")]
    public DateTime ThoiDiemTao { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_gui")]
    public DateTime? ThoiDiemGui { get; set; }

    [Column("thoi_diem_doc")]
    public DateTime? ThoiDiemDoc { get; set; }

    [Column("loi_gui_gan_nhat")]
    public string? LoiGuiGanNhat { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaTaiKhoan))]
    public TaiKhoan TaiKhoan { get; set; } = null!;

    [ForeignKey(nameof(MaDonThue))]
    public DonThue? DonThue { get; set; }
}
