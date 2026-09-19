using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("GIU_CHO")]
public class GiuCho {
    [Key] [Column("ma_giu_cho")] public long MaGiuCho { get; set; }
    [Column("ma_chi_tiet_don")] public long MaChiTietDon { get; set; }
    [Column("luc_tao")] public DateTime LucTao { get; set; } = DateTime.UtcNow;
    [Column("het_han")] public DateTime HetHan { get; set; }
    [Column("giai_phong")] public DateTime? GiaiPhong { get; set; }
    [Column("trang_thai")] public bool TrangThai { get; set; } = true;
    [ForeignKey(nameof(MaChiTietDon))] public ChiTietDonThue ChiTietDon { get; set; } = null!;
}
