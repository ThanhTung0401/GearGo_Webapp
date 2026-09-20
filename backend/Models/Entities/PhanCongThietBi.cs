using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("PHAN_CONG_THIET_BI")]
public class PhanCongThietBi {
    [Key] [Column("ma_phan_cong")] public long MaPhanCong { get; set; }
    [Column("ma_chi_tiet_don")] public long MaChiTietDon { get; set; }
    [Column("ma_thiet_bi")] public long MaThietBi { get; set; }
    [Column("ma_nhan_vien_phan_cong")] public long MaNhanVienPhanCong { get; set; }
    [Column("ma_nhan_vien_huy")] public long? MaNhanVienHuy { get; set; }
    [Column("thoi_gian_phan_cong")] public DateTime ThoiGianPhanCong { get; set; } = DateTime.UtcNow;
    [Column("thoi_gian_huy")] public DateTime? ThoiGianHuy { get; set; }
    [Column("trang_thai")] public bool TrangThai { get; set; } = true;
    [ForeignKey(nameof(MaChiTietDon))] public ChiTietDonThue ChiTietDon { get; set; } = null!;
    [ForeignKey(nameof(MaThietBi))] public ThietBi ThietBi { get; set; } = null!;
    [ForeignKey(nameof(MaNhanVienPhanCong))] public NhanVien NhanVienPhanCong { get; set; } = null!;
    [ForeignKey(nameof(MaNhanVienHuy))] public NhanVien? NhanVienHuy { get; set; }
}
