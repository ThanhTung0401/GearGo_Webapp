using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("NHAN_VIEN")]
public class NhanVien
{
    [Key]
    [Column("ma_nhan_vien")]
    public long MaNhanVien { get; set; }

    [Column("ma_tai_khoan")]
    public long MaTaiKhoan { get; set; }

    [Column("ho_ten")]
    [MaxLength(255)]
    public string? HoTen { get; set; }

    [Column("dia_chi")]
    public string? DiaChi { get; set; }

    [Column("ngay_vao_lam")]
    public DateOnly? NgayVaoLam { get; set; }

    [Column("ngay_nghi_viec")]
    public DateOnly? NgayNghiViec { get; set; }

    // "DangLamViec" | "DaNghiViec"
    [Column("trang_thai_lam_viec")]
    [MaxLength(50)]
    public string TrangThaiLamViec { get; set; } = "DangLamViec";

    [ForeignKey(nameof(MaTaiKhoan))]
    public TaiKhoan TaiKhoan { get; set; } = null!;
}
