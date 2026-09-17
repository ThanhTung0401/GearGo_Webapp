using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("KHACH_HANG")]
public class KhachHang
{
    [Key]
    [Column("ma_khach_hang")]
    public long MaKhachHang { get; set; }

    [Column("ma_tai_khoan")]
    public long MaTaiKhoan { get; set; }

    [Column("ho_ten")]
    [MaxLength(255)]
    public string? HoTen { get; set; }

    [Column("dia_chi")]
    public string? DiaChi { get; set; }

    [Column("ngay_sinh")]
    public DateOnly? NgaySinh { get; set; }

    [Column("anh_dai_dien")]
    public string? AnhDaiDien { get; set; }

    [ForeignKey(nameof(MaTaiKhoan))]
    public TaiKhoan TaiKhoan { get; set; } = null!;
}
