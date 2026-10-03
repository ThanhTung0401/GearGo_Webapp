using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.PhieuNhap;

public class XacNhanNhapKhoRequest
{
    [Required]
    public DateTimeOffset NgayNhapThucTe { get; set; }

    [Required]
    public List<DongXacNhanNhap> DanhSachDong { get; set; } = new();
}

public class DongXacNhanNhap
{
    public long MaChiTietPhieuNhap { get; set; }

    [Required]
    public List<ThietBiNhap> ThietBi { get; set; } = new();
}

public class ThietBiNhap
{
    [Required]
    [MaxLength(50)]
    public string MaHienThi { get; set; } = null!;

    [Required]
    public string TinhTrang { get; set; } = null!;

    public List<string> PhuKien { get; set; } = new();

    public string? GhiChu { get; set; }

    public bool CanBaoTri { get; set; }

    public string? MoTaLoi { get; set; }

    public string? BangChung { get; set; }
}
