using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.PhuPhi;

/// <summary>
/// Yêu cầu lập phụ phí mới (UC14)
/// </summary>
public class LapPhuPhiRequest
{
    public long MaDonThue { get; set; }
    public long? MaChiTietBanGiao { get; set; }
    
    /// <summary>
    /// Các loại phí hợp lệ: "TreHan", "VeSinhDacBiet", "HuHong", "MatPhuKien", "MatThietBi", "Khac"
    /// </summary>
    public string LoaiPhi { get; set; } = null!;
    
    public decimal? SoTienDeNghi { get; set; }
    public string LyDo { get; set; } = null!;
    public List<string>? DanhSachAnh { get; set; }
}

/// <summary>
/// Cập nhật phụ phí khi đang chờ duyệt
/// </summary>
public class CapNhatPhuPhiRequest
{
    public decimal? SoTien { get; set; }
    public string? LyDo { get; set; }
    public List<string>? DanhSachAnh { get; set; }
}

/// <summary>
/// Duyệt hoặc từ chối phụ phí theo thẩm quyền
/// </summary>
public class DuyetPhuPhiRequest
{
    /// <summary>
    /// "Duyet" hoặc "TuChoi"
    /// </summary>
    public string KetQua { get; set; } = "Duyet";
    public string? LyDo { get; set; }
}

/// <summary>
/// Khách hàng gửi yêu cầu tranh chấp / khiếu nại phụ phí
/// </summary>
public class TranhChapRequest
{
    public string NoiDung { get; set; } = null!;
    public List<string>? DanhSachAnh { get; set; }
}

/// <summary>
/// Quản trị viên xử lý kết quả tranh chấp
/// </summary>
public class GiaiQuyetTranhChapRequest
{
    /// <summary>
    /// "GiuNguyen", "HuyPhi", hoặc "DieuChinh"
    /// </summary>
    public string KetQua { get; set; } = "GiuNguyen";
    public string LyDo { get; set; } = null!;
    public decimal? SoTienDeXuatSauXuLy { get; set; }
}

/// <summary>
/// Lập phụ phí điều chỉnh sau khi đã đối soát (tăng hoặc giảm)
/// </summary>
public class DieuChinhPhiRequest
{
    /// <summary>
    /// Số tiền điều chỉnh có dấu (+ hoặc -)
    /// </summary>
    public decimal SoTienDieuChinhCoDau { get; set; }
    public string LyDo { get; set; } = null!;
    public List<string>? DanhSachAnh { get; set; }
}

/// <summary>
/// Căn cứ tính phụ phí (được lưu vết dạng JSON)
/// </summary>
public class CanCuTinhPhiDto
{
    public string? LoaiPhi { get; set; }
    public string? CongThuc { get; set; }
    public decimal? DonGiaSnapshot { get; set; }
    public decimal? HeSo { get; set; }
    public int? SoNgayTre { get; set; }
    public DateTime? GioTraDuKien { get; set; }
    public DateTime? ThoiDiemKetThuc { get; set; }
    public string? GhiChu { get; set; }
}

/// <summary>
/// Kết quả gợi ý phụ phí tự động cho thiết bị
/// </summary>
public class GoiYPhuPhiResponse
{
    public long MaChiTietBanGiao { get; set; }
    public string LoaiPhi { get; set; } = null!;
    public decimal SoTienGoiY { get; set; }
    public string LyDo { get; set; } = null!;
    public CanCuTinhPhiDto CanCu { get; set; } = new();
}

/// <summary>
/// Thông tin chi tiết phụ phí trả về cho client
/// </summary>
public class PhuPhiResponse
{
    public long MaPhuPhi { get; set; }
    public long MaDonThue { get; set; }
    public long? MaChiTietBanGiao { get; set; }
    public long MaNguoiLap { get; set; }
    public string? TenNguoiLap { get; set; }
    public long? MaNguoiDuyet { get; set; }
    public string? TenNguoiDuyet { get; set; }
    public long? MaPhuPhiGoc { get; set; }
    public long? MaDoiSoat { get; set; }
    public string LoaiPhi { get; set; } = null!;
    public decimal SoTien { get; set; }
    public string? LyDo { get; set; }
    public CanCuTinhPhiDto? CanCuTinhPhi { get; set; }
    public List<string>? BangChung { get; set; }
    public DateTime ThoiDiemLap { get; set; }
    public DateTime? ThoiDiemDuyet { get; set; }
    public string TrangThaiDuyet { get; set; } = null!;
    public string? TrangThaiTranhChap { get; set; }
    public string? KetQuaGiaiQuyet { get; set; }
    
    /// <summary>
    /// Đã đưa vào bảng đối soát (khóa không cho chỉnh sửa trực tiếp)
    /// </summary>
    public bool DaKhoaDoiSoat { get; set; }
}
