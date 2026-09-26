using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("PHAN_CONG_THIET_BI")]
public class PhanCongThietBi {
    [Key] [Column("ma_phan_cong")] public long MaPhanCong { get; set; }
    [Column("ma_chi_tiet_don")] public long MaChiTietDon { get; set; }
    [Column("ma_thiet_bi")] public long MaThietBi { get; set; }
    [Column("ma_nguoi_phan_cong")] public long MaNguoiPhanCong { get; set; }
    [Column("ma_nguoi_huy_phan_cong")] public long? MaNguoiHuyPhanCong { get; set; }
    [Column("thoi_diem_phan_cong")] public DateTime ThoiDiemPhanCong { get; set; } = DateTime.UtcNow;
    [Column("thoi_diem_huy_phan_cong")] public DateTime? ThoiDiemHuyPhanCong { get; set; }
    [Column("ly_do_huy_phan_cong")] public string? LyDoHuyPhanCong { get; set; }
    [Column("trang_thai")] [MaxLength(50)] public string TrangThai { get; set; } = "DaPhanCong";
    [ForeignKey(nameof(MaChiTietDon))] public ChiTietDonThue ChiTietDon { get; set; } = null!;
    [ForeignKey(nameof(MaThietBi))] public ThietBi ThietBi { get; set; } = null!;
    [ForeignKey(nameof(MaNguoiPhanCong))] public NhanVien NguoiPhanCong { get; set; } = null!;
    [ForeignKey(nameof(MaNguoiHuyPhanCong))] public NhanVien? NguoiHuyPhanCong { get; set; }
}
