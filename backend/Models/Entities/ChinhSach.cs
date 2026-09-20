using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("CHINH_SACH")]

public class ChinhSach
{
    public long MaChinhSach { get; set; }
    public long MaNguoiTao { get; set; }
    public string TenChinhSach { get; set; } = string.Empty;
    public int PhienBan { get; set; }
    public DateTime ThoiDiemApDung { get; set; }

    // JSON string
    public string NoiDungChinhSach { get; set; } = string.Empty;
    public DateTime NgayTao { get; set; }

    // Navigation Property
    public NhanVien NguoiTao { get; set; } = null!;
}
