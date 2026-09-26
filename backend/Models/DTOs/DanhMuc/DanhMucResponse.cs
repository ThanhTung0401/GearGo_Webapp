using System.Collections.Generic;

namespace GearGo.Models.DTOs.DanhMuc;

public class DanhMucResponse
{
    public long MaDanhMuc { get; set; }
    public string TenDanhMuc { get; set; } = null!;
    public string? MoTa { get; set; }
    public int ThuTuHienThi { get; set; }
    
    // For hierarchy
    public long? MaDanhMucCha { get; set; }
    public List<DanhMucResponse> DanhMucCon { get; set; } = new();
}
