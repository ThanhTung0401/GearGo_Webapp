using System;

namespace GearGo.Models.DTOs.SanPham;

public enum SapXepSanPham
{
    GiaTang,
    GiaGiam,
    MoiNhat,
    PhoBien
}

public class TimKiemSanPhamRequest
{
    public string? TuKhoa { get; set; }
    public long? MaDanhMuc { get; set; }
    public string? ThuongHieu { get; set; }
    public int? SucChua { get; set; }
    public decimal? GiaMin { get; set; }
    public decimal? GiaMax { get; set; }
    public DateTime? GioNhan { get; set; }
    public DateTime? GioTra { get; set; }
    
    public SapXepSanPham? SapXep { get; set; }
    
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 12;
}
