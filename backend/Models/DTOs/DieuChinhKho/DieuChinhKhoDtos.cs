using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.DieuChinhKho;

/// <summary>
/// Yêu cầu lập phiếu điều chỉnh kho mới
/// </summary>
public class LapDieuChinhKhoRequest
{
    /// <summary>
    /// SaiGiaNhap | KhaiBaoThieuThietBi | KhaiBaoTrungSaiThietBi | KiemKeSaiLech | GiangCapThietBi | NgungSuDung
    /// </summary>
    public string LoaiDieuChinh { get; set; } = string.Empty;

    /// <summary>
    /// Bắt buộc nếu là SaiGiaNhap hoặc KhaiBaoThieuThietBi
    /// </summary>
    public long? MaPhieuNhapLienQuan { get; set; }

    public string LyDo { get; set; } = string.Empty;

    /// <summary>
    /// Danh sách URL hoặc mã tệp bằng chứng đính kèm (JSON)
    /// </summary>
    public List<string>? BangChung { get; set; }

    /// <summary>
    /// Danh sách các dòng chi tiết điều chỉnh
    /// </summary>
    public List<DongDieuChinhRequest> ChiTiet { get; set; } = new();
}

/// <summary>
/// Dòng chi tiết trong phiếu điều chỉnh
/// </summary>
public class DongDieuChinhRequest
{
    /// <summary>
    /// Mã thiết bị (bắt buộc với KhaiBaoTrungSai, KiemKe, GiangCap, NgungSuDung; có thể null khi khai báo thiếu của lần nhập cũ)
    /// </summary>
    public long? MaThietBi { get; set; }

    /// <summary>
    /// Mã chi tiết phiếu nhập (bắt buộc khi SaiGiaNhap hoặc KhaiBaoThieu)
    /// </summary>
    public long? MaChiTietPhieuNhap { get; set; }

    /// <summary>
    /// Giá trị đề nghị sau điều chỉnh (Object chứa các field được phép theo loại)
    /// </summary>
    public object? GiaTriDeNghiSau { get; set; }

    public string? GhiChu { get; set; }
}

/// <summary>
/// Yêu cầu từ chối phiếu điều chỉnh
/// </summary>
public class TuChoiDieuChinhRequest
{
    public string LyDo { get; set; } = string.Empty;
}

/// <summary>
/// Phản hồi thông tin phiếu điều chỉnh kho
/// </summary>
public class DieuChinhKhoResponse
{
    public long MaPhieuDieuChinh { get; set; }
    public long? MaPhieuNhapLienQuan { get; set; }
    public string? LoaiDieuChinh { get; set; }
    public string? LyDo { get; set; }
    public List<string>? BangChung { get; set; }
    public string TrangThai { get; set; } = string.Empty;

    public long MaNguoiLap { get; set; }
    public string? TenNguoiLapLucLap { get; set; }
    public DateTime ThoiDiemLap { get; set; }

    public long? MaNguoiDuyet { get; set; }
    public string? TenNguoiDuyetLucDuyet { get; set; }
    public DateTime? ThoiDiemDuyet { get; set; }
    public DateTime? ThoiDiemApDung { get; set; }

    public List<ChiTietDieuChinhKhoDto> ChiTiet { get; set; } = new();
}

public class ChiTietDieuChinhKhoDto
{
    public long MaChiTietDieuChinh { get; set; }
    public long? MaThietBi { get; set; }
    public string? MaThietBiHienThi { get; set; }
    public long? MaChiTietPhieuNhap { get; set; }
    public string? GiaTriTruoc { get; set; }
    public string? GiaTriSau { get; set; }
    public string? GhiChu { get; set; }
}

/// <summary>
/// Kết quả tính toán giá trị nhập hiệu lực sau các đợt điều chỉnh
/// </summary>
public class GiaTriNhapHieuLucResponse
{
    public long MaPhieuNhap { get; set; }
    public decimal TongTienGoc { get; set; }
    public int TongSoLuongGoc { get; set; }
    public decimal TongChenhLechGiaTri { get; set; }
    public int TongChenhLechSoLuong { get; set; }
    public decimal TongTienHieuLuc { get; set; }
    public int TongSoLuongHieuLuc { get; set; }

    public List<LichSuDieuChinhNhapDto> ChuoiDieuChinhDaApDung { get; set; } = new();
}

public class LichSuDieuChinhNhapDto
{
    public long MaPhieuDieuChinh { get; set; }
    public string LoaiDieuChinh { get; set; } = string.Empty;
    public decimal ChenhLechGiaTri { get; set; }
    public int ChenhLechSoLuong { get; set; }
    public DateTime ThoiDiemApDung { get; set; }
    public string? NguoiDuyet { get; set; }
}
