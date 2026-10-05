using System.Collections.Generic;

namespace GearGo.Models.DTOs.ThietBi;

public class KiemTraLichResponse
{
    public bool DuDieuKien { get; set; }
    public List<string> LyDo { get; set; } = new();
    public List<string> ChungTuXungDot { get; set; } = new();
    public bool CanBoTriLai { get; set; }
}
