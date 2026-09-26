using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Phiếu điều chỉnh thông tin hoặc trạng thái kho thiết bị
/// </summary>
[Table("PHIEU_DIEU_CHINH_KHO")]
public class PhieuDieuChinhKho
{
    [Key]
    [Column("ma_phieu_dieu_chinh")]
    public long MaPhieuDieuChinh { get; set; }

    [Column("ma_phieu_nhap_lien_quan")]
    public long? MaPhieuNhapLienQuan { get; set; }

    [Column("ma_nguoi_lap")]
    public long MaNguoiLap { get; set; }

    [Column("ma_nguoi_duyet")]
    public long? MaNguoiDuyet { get; set; }

    [Column("loai_dieu_chinh")]
    [MaxLength(50)]
    public string? LoaiDieuChinh { get; set; }

    [Column("ly_do")]
    public string? LyDo { get; set; }

    [Column("bang_chung", TypeName = "nvarchar(max)")]
    public string? BangChung { get; set; } // JSON

    [Column("thoi_diem_lap")]
    public DateTime ThoiDiemLap { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_duyet")]
    public DateTime? ThoiDiemDuyet { get; set; }

    [Column("thoi_diem_ap_dung")]
    public DateTime? ThoiDiemApDung { get; set; }

    [Column("ten_nguoi_lap_luc_lap")]
    [MaxLength(255)]
    public string? TenNguoiLapLucLap { get; set; }

    [Column("ten_nguoi_duyet_luc_duyet")]
    [MaxLength(255)]
    public string? TenNguoiDuyetLucDuyet { get; set; }

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = "ChoDuyet";

    // Navigation properties
    [ForeignKey(nameof(MaPhieuNhapLienQuan))]
    public PhieuNhapHang? PhieuNhapLienQuan { get; set; }

    [ForeignKey(nameof(MaNguoiLap))]
    public NhanVien NguoiLap { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiDuyet))]
    public NhanVien? NguoiDuyet { get; set; }

    public ICollection<ChiTietDieuChinhKho> ChiTietDieuChinhKhos { get; set; } = new List<ChiTietDieuChinhKho>();
}
