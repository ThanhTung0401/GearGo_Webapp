using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("LUOT_SU_DUNG_KHUYEN_MAI")]
public class LuotSuDungKhuyenMai {
    [Key] [Column("ma_luot_su_dung")] public long MaLuotSuDung { get; set; }
    [Column("ma_khuyen_mai")] public long MaKhuyenMai { get; set; }
    [Column("ma_don_thue")] public long MaDonThue { get; set; }
    [Column("thoi_diem_giu")] public DateTime ThoiDiemGiu { get; set; } = DateTime.UtcNow;
    [Column("het_han")] public DateTime HetHan { get; set; }
    [Column("su_dung")] public DateTime? SuDung { get; set; }
    [Column("giai_phong")] public DateTime? GiaiPhong { get; set; }
    [Column("so_tien_giam")] public decimal SoTienGiam { get; set; }
    [Column("trang_thai")] public int TrangThai { get; set; }
    [ForeignKey(nameof(MaKhuyenMai))] public KhuyenMai KhuyenMai { get; set; } = null!;
    [ForeignKey(nameof(MaDonThue))] public DonThue DonThue { get; set; } = null!;
}
