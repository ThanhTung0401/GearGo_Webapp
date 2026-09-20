using System.ComponentModel.DataAnnotations.Schema;
using GearGo.Models.Enums;

namespace GearGo.Models.Entities;

[Table("GIU_CHO")]
public class GiuCho
{
    public long MaGiuCho { get; set; }

    public long MaChiTietDon { get; set; }

    public DateTime ThoiDiemTao { get; set; }
    public DateTime ThoiDiemHetHan { get; set; }
    public DateTime? ThoiDiemGiaiPhong { get; set; }
    public TrangThaiGiuCho TrangThai { get; set; }

    // -- Navigation Property --
    public ChiTietDonThue ChiTietDonThue { get; set; } = null!;
}
