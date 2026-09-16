using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("TAI_KHOAN")]
public class TaiKhoan
{
    [Key]
    [Column("ma_tai_khoan")]
    public long MaTaiKhoan { get; set; }

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("so_dien_thoai")]
    [MaxLength(20)]
    public string? SoDienThoai { get; set; }

    [Column("mat_khau_bam")]
    [MaxLength(255)]
    public string? MatKhauBam { get; set; }

    // "KhachHang" | "NhanVien" | "QuanTriVien"
    [Column("vai_tro")]
    [MaxLength(50)]
    public string VaiTro { get; set; } = "KhachHang";

    // "HoatDong" | "BiKhoa"
    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = "HoatDong";

    [Column("ly_do_khoa")]
    public string? LyDoKhoa { get; set; }

    [Column("ngay_tao")]
    public DateTime NgayTao { get; set; } = DateTime.Now;

    [Column("ngay_cap_nhat")]
    public DateTime NgayCapNhat { get; set; } = DateTime.Now;

    public KhachHang? KhachHang { get; set; }
    public NhanVien? NhanVien { get; set; }
}
