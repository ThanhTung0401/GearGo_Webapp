using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Phiếu bảo trì / sửa chữa thiết bị
/// </summary>
[Table("PHIEU_BAO_TRI")]
public class PhieuBaoTri
{
    [Key]
    [Column("ma_phieu_bao_tri")]
    public long MaPhieuBaoTri { get; set; }

    [Column("ma_thiet_bi")]
    public long MaThietBi { get; set; }

    [Column("ma_don_thue")]
    public long? MaDonThue { get; set; }

    [Column("ma_nguoi_lap")]
    public long MaNguoiLap { get; set; }

    [Column("ma_nguoi_xu_ly")]
    public long? MaNguoiXuLy { get; set; }

    [Column("ma_nguoi_xac_nhan_hoan_thanh")]
    public long? MaNguoiXacNhanHoanThanh { get; set; }

    [Column("loai_xu_ly")]
    [MaxLength(50)]
    public string? LoaiXuLy { get; set; }

    [Column("mo_ta_loi")]
    public string? MoTaLoi { get; set; }

    [Column("muc_do")]
    [MaxLength(50)]
    public string? MucDo { get; set; }

    [Column("ngay_bat_dau")]
    public DateTime? NgayBatDau { get; set; }

    [Column("ngay_du_kien_hoan_thanh")]
    public DateTime? NgayDuKienHoanThanh { get; set; }

    [Column("ngay_hoan_thanh_thuc_te")]
    public DateTime? NgayHoanThanhThucTe { get; set; }

    [Column("chi_phi")]
    public decimal? ChiPhi { get; set; }

    [Column("ket_qua")]
    public string? KetQua { get; set; }

    [Column("bang_chung", TypeName = "nvarchar(max)")]
    public string? BangChung { get; set; } // JSON

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = "ChoXuLy";

    // Navigation properties
    [ForeignKey(nameof(MaThietBi))]
    public ThietBi ThietBi { get; set; } = null!;

    [ForeignKey(nameof(MaDonThue))]
    public DonThue? DonThue { get; set; }

    [ForeignKey(nameof(MaNguoiLap))]
    public NhanVien NguoiLap { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiXuLy))]
    public NhanVien? NguoiXuLy { get; set; }

    [ForeignKey(nameof(MaNguoiXacNhanHoanThanh))]
    public NhanVien? NguoiXacNhanHoanThanh { get; set; }
}
