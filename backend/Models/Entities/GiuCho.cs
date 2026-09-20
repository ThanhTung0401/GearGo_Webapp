using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GearGo.Models.Enums;

namespace GearGo.Models.Entities;

[Table("GIU_CHO")]
public class GiuCho
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_giu_cho")]
    public long MaGiuCho { get; set; }

    [Column("ma_chi_tiet_don")]
    public long MaChiTietDon { get; set; }

    [Column("thoi_diem_tao")]
    public DateTime ThoiDiemTao { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_het_han")]
    public DateTime ThoiDiemHetHan { get; set; }

    [Column("thoi_diem_giai_phong")]
    public DateTime? ThoiDiemGiaiPhong { get; set; }

    [Column("trang_thai")]
    public TrangThaiGiuCho TrangThai { get; set; }

    // -- Navigation Property --
    [ForeignKey(nameof(MaChiTietDon))]
    public ChiTietDonThue ChiTietDonThue { get; set; } = null!;
}