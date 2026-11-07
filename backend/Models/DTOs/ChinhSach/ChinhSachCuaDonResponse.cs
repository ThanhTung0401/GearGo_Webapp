using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.ChinhSach;

/// <summary>
/// Chính sách gắn với một đơn thuê cụ thể (W6-T1 - UC26).
/// Chỉ trả phần điều khoản cần cho khách; ngưỡng duyệt nội bộ không lộ ra ngoài.
/// </summary>
public class ChinhSachCuaDonResponse
{
    public long MaDonThue { get; set; }
    public long MaChinhSach { get; set; }
    public int PhienBan { get; set; }
    public string? TenChinhSach { get; set; }
    public DateTime ThoiDiemApDung { get; set; }

    public DieuKhoanChoKhachDto DieuKhoanChoKhach { get; set; } = new();
}

/// <summary>Phần điều khoản công khai cho khách — bỏ dữ liệu quản trị nội bộ.</summary>
public class DieuKhoanChoKhachDto
{
    public int? ThoiGianGiuChoPhut { get; set; }
    public decimal? HeSoTre { get; set; }
    public decimal? TyLeCocPhanTram { get; set; }
    public NoiDungChinhSachDto.HuyDonDto? HuyDon { get; set; }
    public NoiDungChinhSachDto.KhongDenNhanDto? KhongDenNhan { get; set; }
    public List<NoiDungChinhSachDto.MocNhacDto>? MocNhac { get; set; }
}
