using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("GIO_THUE")]
public class GioThue {
    [Key] [Column("ma_gio_thue")] public long MaGioThue { get; set; }
    [Column("ma_khach_hang")] public long MaKhachHang { get; set; }
    [Column("ma_khuyen_mai")] public long? MaKhuyenMai { get; set; }
    [Column("gio_nhan_du_kien")] public DateTime? GioNhanDuKien { get; set; }
    [Column("gio_tra_du_kien")] public DateTime? GioTraDuKien { get; set; }
    [ForeignKey(nameof(MaKhachHang))] public KhachHang KhachHang { get; set; } = null!;
    public ICollection<ChiTietGioThue> ChiTietGioThues { get; set; } = new List<ChiTietGioThue>();
}
