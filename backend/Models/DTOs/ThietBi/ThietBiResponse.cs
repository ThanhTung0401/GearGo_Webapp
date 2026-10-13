using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.ThietBi;

public class ThietBiResponse
{
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public long MaSanPhamHienTai { get; set; }
    public long MaChiTietPhieuNhap { get; set; }
    public string TrangThaiSuDung { get; set; } = string.Empty;
    public string TinhTrang { get; set; } = string.Empty;
    public decimal GiaNhap { get; set; }
    public DateTime NgayNhap { get; set; }
    public List<PhanCongResponse>? Lich { get; set; }
}

public class PhanCongResponse
{
    public long MaPhanCong { get; set; }
    public long MaDonThue { get; set; }
    public DateTime TuNgay { get; set; }
    public DateTime DenNgay { get; set; }
    public string TrangThai { get; set; } = string.Empty;
}
