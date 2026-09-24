using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Chi tiết nhận trả cho từng thiết bị cụ thể đã được bàn giao trước đó
/// </summary>
[Table("CHI_TIET_NHAN_TRA")]
public class ChiTietNhanTra
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_chi_tiet_nhan_tra")]
    public long MaChiTietNhanTra { get; set; }

    [Column("ma_phieu_nhan_tra")]
    public long MaPhieuNhanTra { get; set; }

    // Ràng buộc 1-1 với chi tiết bàn giao (đảm bảo 1 thiết bị đã bàn giao chỉ được ghi nhận trả 1 lần)
    [Column("ma_chi_tiet_ban_giao")]
    public long MaChiTietBanGiao { get; set; }

    [Column("ma_nguoi_duyet_mat")]
    public long? MaNguoiDuyetMat { get; set; }

    [Column("thoi_diem_tra_thuc_te")]
    public DateTime? ThoiDiemTraThucTe { get; set; }

    [Column("thoi_diem_duyet_mat")]
    public DateTime? ThoiDiemDuyetMat { get; set; }

    [Column("ket_luan")]
    [MaxLength(100)]
    public string? KetLuan { get; set; } // Bình thường, Cần vệ sinh, Hỏng nhẹ, Hỏng nặng, Thiếu phụ kiện, Mất thiết bị

    [Column("tinh_trang_sau_thue")]
    public string? TinhTrangSauThue { get; set; }

    [Column("phu_kien_thuc_nhan")]
    public string? PhuKienThucNhan { get; set; } // Lưu JSON danh sách phụ kiện thực nhận

    [Column("phu_kien_con_thieu")]
    public string? PhuKienConThieu { get; set; } // Lưu JSON danh sách phụ kiện thiếu

    [Column("danh_sach_anh")]
    public string? DanhSachAnh { get; set; } // Lưu JSON URLs ảnh hiện trạng khi trả

    [Column("bien_ban_mat")]
    public string? BienBanMat { get; set; } // Lưu JSON biên bản nếu xác nhận mất đồ

    [Column("trang_thai_xu_ly")]
    [MaxLength(50)]
    public string? TrangThaiXuLy { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // ─── NAVIGATION PROPERTIES ───
    [ForeignKey(nameof(MaPhieuNhanTra))]
    public PhieuNhanTra PhieuNhanTra { get; set; } = null!;

    [ForeignKey(nameof(MaChiTietBanGiao))]
    public ChiTietBanGiao ChiTietBanGiao { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiDuyetMat))]
    public NhanVien? NguoiDuyetMat { get; set; }
}
