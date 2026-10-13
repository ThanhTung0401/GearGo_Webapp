using System;

namespace GearGo.Models.DTOs.ThietBi;

public class KiemTraLichRequest
{
    public long MaThietBi { get; set; }
    public DateTime GioNhan { get; set; }
    public DateTime GioTra { get; set; }
    public long? MaPhanCongLoaiTru { get; set; }
}
