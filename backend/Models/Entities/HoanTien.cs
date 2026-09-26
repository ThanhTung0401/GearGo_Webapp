using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Ghi nhận hoàn tiền cho khách hàng
/// </summary>
[Table("HOAN_TIEN")]
public class HoanTien
{
    [Key]
    [Column("ma_hoan_tien")]
    public long MaHoanTien { get; set; }

    [Column("ma_chi_tiet_thanh_toan_goc")]
    public long MaChiTietThanhToanGoc { get; set; }

    [Column("ma_doi_soat")]
    public long? MaDoiSoat { get; set; }

    [Column("ma_nguoi_xu_ly")]
    public long? MaNguoiXuLy { get; set; }

    [Column("ma_yeu_cau")]
    [MaxLength(100)]
    public string? MaYeuCau { get; set; }

    [Column("ma_giao_dich_hoan_cong")]
    [MaxLength(255)]
    public string? MaGiaoDichHoanCong { get; set; }

    [Column("loai_hoan")]
    [MaxLength(50)]
    public string? LoaiHoan { get; set; }

    [Column("so_tien")]
    public decimal SoTien { get; set; }

    [Column("ly_do")]
    public string? LyDo { get; set; }

    [Column("thoi_diem_yeu_cau")]
    public DateTime ThoiDiemYeuCau { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_thanh_cong")]
    public DateTime? ThoiDiemThanhCong { get; set; }

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = "ChoXuLy";

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaChiTietThanhToanGoc))]
    public ChiTietThanhToan ChiTietThanhToanGoc { get; set; } = null!;

    [ForeignKey(nameof(MaDoiSoat))]
    public DoiSoatTienCoc? DoiSoatTienCoc { get; set; }

    [ForeignKey(nameof(MaNguoiXuLy))]
    public NhanVien? NguoiXuLy { get; set; }
}
