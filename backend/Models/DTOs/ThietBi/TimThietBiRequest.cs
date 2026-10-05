using System.Collections.Generic;

namespace GearGo.Models.DTOs.ThietBi;

public class TimThietBiRequest
{
    public string? MaHienThi { get; set; }
    public long? MaSanPhamHienTai { get; set; }
    public string? TrangThai { get; set; }
    public long? NguonNhap { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}
