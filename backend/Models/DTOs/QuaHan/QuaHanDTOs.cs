using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.QuaHan;

/// <summary>
/// DTO yêu cầu lọc danh sách đơn quá hạn (W4-T2)
/// </summary>
public class LocQuaHanRequest
{
    public DateTime? DenThoiDiem { get; set; }
    public long? MaDon { get; set; }
    public long? MaSanPham { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}

/// <summary>
/// DTO tóm tắt đơn thuê quá hạn trong danh sách phân trang (W4-T2)
/// </summary>
public class DonQuaHanResponse
{
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public string TenKhachHang { get; set; } = string.Empty;
    public string SoDienThoai { get; set; } = string.Empty;
    public DateTime? GioNhanThucTe { get; set; }
    public DateTime GioTraDuKien { get; set; }
    public int SoThietBiChuaTra { get; set; }
    public int TongSoThietBi { get; set; }
    public int SoNgayTreMax { get; set; }
    public decimal TongPhiTreDuKien { get; set; }
    public bool LaTraMotPhan { get; set; }
}

/// <summary>
/// Chi tiết tình trạng quá hạn và phí trễ dự kiến của từng thiết bị trong đơn
/// </summary>
public class ThietBiQuaHanItem
{
    public long MaChiTietBanGiao { get; set; }
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public long MaSanPham { get; set; }
    public string TenSanPham { get; set; } = string.Empty;
    public DateTime? GioTraThucTe { get; set; }
    public DateTime? GioDuyetMat { get; set; }
    public string TrangThai { get; set; } = "ChuaTra"; // ChuaTra, DaTra, DaBaoMat
    public int SoNgayTre { get; set; }
    public decimal DonGiaSnapshot { get; set; }
    public decimal HeSo { get; set; }
    public decimal PhiTreDuKien { get; set; }
}

/// <summary>
/// DTO phản hồi chi tiết đơn quá hạn (W4-T2)
/// </summary>
public class QuaHanChiTietResponse
{
    public long MaDonThue { get; set; }
    public DateTime GioTraDuKien { get; set; }
    public DateTime MocTinhNow { get; set; }
    public bool LaTraMotPhan { get; set; }
    public List<ThietBiQuaHanItem> DanhSachThietBi { get; set; } = new();
    public decimal TongPhiTreDuKien { get; set; }
}

/// <summary>
/// DTO phản hồi các đơn thuê tương lai bị ảnh hưởng do thiết bị quá hạn (W4-T2)
/// </summary>
public class DonBiAnhHuongResponse
{
    public long MaDonBiAnhHuong { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public string TenKhachHang { get; set; } = string.Empty;
    public DateTime GioNhanDuKien { get; set; }
    public DateTime GioTraDuKien { get; set; }
    public long? MaThietBiVung { get; set; }
    public string? MaThietBiHienThi { get; set; }
    public long MaSanPham { get; set; }
    public string TenSanPham { get; set; } = string.Empty;
    public int SoLuongThieu { get; set; }
    public string NguyenNhan { get; set; } = string.Empty;
}

/// <summary>
/// DTO kết quả chạy quét nhắc nhở đơn quá hạn
/// </summary>
public class KetQuaQuetNhacResponse
{
    public int TongSoDonQuet { get; set; }
    public int SoNhacNhoMoi { get; set; }
    public int SoBoQua { get; set; }
    public int SoLoi { get; set; }
}
