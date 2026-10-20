using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.QuanTriKhuyenMai;

/// <summary>
/// Báo cáo tình hình sử dụng mã khuyến mãi chi tiết theo đơn (W6-T2)
/// </summary>
public class SuDungKhuyenMaiResponse
{
    public long MaKhuyenMai { get; set; }
    public string MaGiamGia { get; set; } = string.Empty;
    public string? TenKhuyenMai { get; set; }

    public int TongLuotDaDung { get; set; }
    public int TongLuotDangGiuConHan { get; set; }
    public int TongLuotDaGiaiPhong { get; set; }
    public decimal TongTienGiamDaDung { get; set; }

    public List<ChiTietSuDungItem> ChiTietSuDung { get; set; } = new();
}

public class ChiTietSuDungItem
{
    public long MaLuotSuDung { get; set; }
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public long MaKhachHang { get; set; }
    public string TenKhachHang { get; set; } = string.Empty;
    public string TrangThaiLuot { get; set; } = string.Empty;
    public DateTime ThoiDiemGiuLuot { get; set; }
    public DateTime ThoiDiemHetHan { get; set; }
    public DateTime? ThoiDiemSuDung { get; set; }
    public decimal TienGiamDon { get; set; }
    public string TrangThaiDonThue { get; set; } = string.Empty;
}
