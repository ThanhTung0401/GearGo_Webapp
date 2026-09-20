using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("LUOT_SU_DUNG_KHUYEN_MAI")]
public class LuotSuDungKhuyenMai
{
    public long MaLuotSuDung { get; set; }

    public long MaKhuyenMai { get; set; }
    public long MaDonThue { get; set; }

    public DateTime ThoiDiemGiuLuot { get; set; }
    public DateTime ThoiDiemHetHan { get; set; }
    public DateTime? ThoiDiemSuDung { get; set; }
    public DateTime? ThoiDiemGiaiPhong { get; set; }

    public decimal SoTienGiam { get; set; }

    public string TrangThai { get; set; } = string.Empty;

    // -- Navigation Properties --
    public DonThue DonThue { get; set; } = null!;

    // KhuyenMai chưa được tạo bởi Người 3, nên ta tạm comment lại:
    // public KhuyenMai KhuyenMai { get; set; } = null!;
}
