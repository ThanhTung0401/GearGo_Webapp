using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Phiếu bàn giao thiết bị cho khách thuê
/// </summary>
[Table("PHIEU_BAN_GIAO")]
public class PhieuBanGiao
{
    [Key]
    [Column("ma_phieu_ban_giao")]
    public long MaPhieuBanGiao { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_nhan_vien")]
    public long MaNhanVien { get; set; }

    [Column("thoi_diem_lap")]
    public DateTime ThoiDiemLap { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_giao_thuc_te")]
    public DateTime? ThoiDiemGiaoThucTe { get; set; }

    [Column("ten_nhan_vien_luc_giao")]
    [MaxLength(255)]
    public string? TenNhanVienLucGiao { get; set; }

    [Column("ten_nguoi_nhan_thuc_te")]
    [MaxLength(255)]
    public string? TenNguoiNhanThucTe { get; set; }

    [Column("thoi_diem_khach_xac_nhan")]
    public DateTime? ThoiDiemKhachXacNhan { get; set; }

    [Column("bang_chung_xac_nhan", TypeName = "nvarchar(max)")]
    public string? BangChungXacNhan { get; set; } // JSON

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = "ChoGiao";

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaNhanVien))]
    public NhanVien NhanVien { get; set; } = null!;

    public ICollection<ChiTietBanGiao> ChiTietBanGiaos { get; set; } = new List<ChiTietBanGiao>();
}
