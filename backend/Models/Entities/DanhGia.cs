using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Đánh giá của khách hàng cho từng chi tiết đơn thuê
/// </summary>
[Table("DANH_GIA")]
public class DanhGia
{
    [Key]
    [Column("ma_danh_gia")]
    public long MaDanhGia { get; set; }

    [Column("ma_chi_tiet_don")]
    public long MaChiTietDon { get; set; }

    [Column("ma_nguoi_an")]
    public long? MaNguoiAn { get; set; }

    [Column("so_sao")]
    public int SoSao { get; set; }

    [Column("noi_dung")]
    public string? NoiDung { get; set; }

    [Column("danh_sach_anh", TypeName = "nvarchar(max)")]
    public string? DanhSachAnh { get; set; } // JSON

    [Column("ngay_tao")]
    public DateTime NgayTao { get; set; } = DateTime.UtcNow;

    [Column("ngay_cap_nhat")]
    public DateTime? NgayCapNhat { get; set; }

    [Column("trang_thai_hien_thi")]
    [MaxLength(50)]
    public string TrangThaiHienThi { get; set; } = "HienThi";

    [Column("ly_do_an")]
    public string? LyDoAn { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaChiTietDon))]
    public ChiTietDonThue ChiTietDonThue { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiAn))]
    public NhanVien? NguoiAn { get; set; }
}
