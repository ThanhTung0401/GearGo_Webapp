using System.Collections.Generic;
using GearGo.Models.DTOs.ThietBi;

namespace GearGo.Models.DTOs.PhieuNhap;

public class KetQuaNhapKhoResponse
{
    public long MaPhieu { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public int SoDaNhap { get; set; }
    public int SoSanSang { get; set; }
    public int SoBaoTri { get; set; }
    public List<ThietBiResponse> ThietBi { get; set; } = new();
}
