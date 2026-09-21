using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GearGo.Models.Enums;

namespace GearGo.Models.Entities;

/// <summary>
/// Đại diện cho 1 đợt nhận trả đồ của đơn thuê (1 đơn có thể có nhiều phiếu nhận trả)
/// </summary>
[Table("PHIEU_NHAN_TRA")]
public class PhieuNhanTra
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_phieu_nhan_tra")]
    public long MaPhieuNhanTra { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_nhan_vien")]
    public long MaNhanVien { get; set; }

    // Mã phiếu hiển thị dạng PNT-{MaDonHienThi}-{lan_tra} (ví dụ: PNT-DT001-01)
    [Column("ma_phieu_hien_thi")]
    [MaxLength(50)]
    public string MaPhieuHienThi { get; set; } = string.Empty;

    // Thứ tự đợt trả của đơn (1, 2, 3...)
    [Column("lan_tra")]
    public int LanTra { get; set; }

    // Đánh dấu đây có phải đợt trả cuối cùng hay không để chuyển trạng thái đơn sang DaNhanTra
    [Column("la_lan_tra_cuoi")]
    public bool LaLanTraCuoi { get; set; } = false;

    [Column("thoi_diem_lap")]
    public DateTime ThoiDiemLap { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_chot")]
    public DateTime? ThoiDiemChot { get; set; }

    [Column("ten_nhan_vien_luc_nhan")]
    [MaxLength(255)]
    public string? TenNhanVienLucNhan { get; set; }

    [Column("trang_thai")]
    public TrangThaiPhieuNhanTra TrangThai { get; set; } = TrangThaiPhieuNhanTra.Nhap;

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // ─── NAVIGATION PROPERTIES ───
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaNhanVien))]
    public NhanVien NhanVien { get; set; } = null!;

    // 1 phiếu nhận trả có danh sách các thiết bị được trả trong đợt này
    public ICollection<ChiTietNhanTra> ChiTietNhanTras { get; set; } = new List<ChiTietNhanTra>();
}
