using GearGo.Models.Enums;

namespace GearGo.Models.DTOs.QuanTriKhuyenMai;

/// <summary>
/// Bộ lọc tìm kiếm danh sách khuyến mãi trang Admin (W6-T2)
/// </summary>
public class TimKiemKhuyenMaiRequest
{
    public string? TuKhoa { get; set; }
    public TrangThaiKhuyenMai? TrangThai { get; set; }
    public PhamViApDung? PhamVi { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}
