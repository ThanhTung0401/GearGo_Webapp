using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Phụ phí phát sinh trong quá trình thuê / trả
/// </summary>
[Table("PHU_PHI")]
public class PhuPhi
{
    [Key]
    [Column("ma_phu_phi")]
    public long MaPhuPhi { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_chi_tiet_ban_giao")]
    public long? MaChiTietBanGiao { get; set; }

    [Column("ma_nguoi_lap")]
    public long MaNguoiLap { get; set; }

    [Column("ma_nguoi_duyet")]
    public long? MaNguoiDuyet { get; set; }

    [Column("ma_phu_phi_goc")]
    public long? MaPhuPhiGoc { get; set; }

    [Column("ma_doi_soat")]
    public long? MaDoiSoat { get; set; }

    [Column("loai_phi")]
    [MaxLength(50)]
    public string LoaiPhi { get; set; } = null!;

    [Column("so_tien")]
    public decimal SoTien { get; set; }

    [Column("ly_do")]
    public string? LyDo { get; set; }

    [Column("can_cu_tinh_phi", TypeName = "nvarchar(max)")]
    public string? CanCuTinhPhi { get; set; } // JSON

    [Column("bang_chung", TypeName = "nvarchar(max)")]
    public string? BangChung { get; set; } // JSON

    [Column("thoi_diem_lap")]
    public DateTime ThoiDiemLap { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_duyet")]
    public DateTime? ThoiDiemDuyet { get; set; }

    [Column("trang_thai_duyet")]
    [MaxLength(50)]
    public string TrangThaiDuyet { get; set; } = "ChoDuyet";

    [Column("trang_thai_tranh_chap")]
    [MaxLength(50)]
    public string? TrangThaiTranhChap { get; set; }

    [Column("ket_qua_giai_quyet")]
    public string? KetQuaGiaiQuyet { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaChiTietBanGiao))]
    public ChiTietBanGiao? ChiTietBanGiao { get; set; }

    [ForeignKey(nameof(MaNguoiLap))]
    public NhanVien NguoiLap { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiDuyet))]
    public NhanVien? NguoiDuyet { get; set; }

    [ForeignKey(nameof(MaPhuPhiGoc))]
    public PhuPhi? PhuPhiGoc { get; set; }

    [ForeignKey(nameof(MaDoiSoat))]
    public DoiSoatTienCoc? DoiSoatTienCoc { get; set; }
}
