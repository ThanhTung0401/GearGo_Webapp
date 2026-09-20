using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("LUOT_SU_DUNG_KHUYEN_MAI")]
public class LuotSuDungKhuyenMai
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_luot_su_dung")]
    public long MaLuotSuDung { get; set; }

    [Column("ma_khuyen_mai")]
    public long MaKhuyenMai { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("thoi_diem_giu_luot")]
    public DateTime ThoiDiemGiuLuot { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_het_han")]
    public DateTime ThoiDiemHetHan { get; set; }

    [Column("thoi_diem_su_dung")]
    public DateTime? ThoiDiemSuDung { get; set; }

    [Column("thoi_diem_giai_phong")]
    public DateTime? ThoiDiemGiaiPhong { get; set; }

    [Column("so_tien_giam", TypeName = "decimal(18,2)")]
    public decimal SoTienGiam { get; set; }

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = string.Empty;

    // -- Navigation Properties --
    [ForeignKey(nameof(MaKhuyenMai))]
    public KhuyenMai KhuyenMai { get; set; } = null!;

    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;
}