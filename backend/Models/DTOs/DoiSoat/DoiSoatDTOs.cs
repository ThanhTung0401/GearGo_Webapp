using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.DoiSoat;

/// <summary>
/// Nguồn thu cọc hợp lệ được đưa vào bảng đối soát
/// </summary>
public class NguonCocDto
{
    public long MaChiTietThanhToan { get; set; }
    public long MaThanhToan { get; set; }
    public string MaYeuCau { get; set; } = string.Empty;
    public decimal SoTien { get; set; }
    public string PhuongThuc { get; set; } = string.Empty;
    public DateTime ThoiDiem { get; set; }
}

/// <summary>
/// Khoản phụ phí được đưa vào bảng đối soát
/// </summary>
public class PhuPhiDoiSoatDto
{
    public long MaPhuPhi { get; set; }
    public long? MaChiTietBanGiao { get; set; }
    public string LoaiPhi { get; set; } = string.Empty;
    public decimal SoTien { get; set; }
    public string? LyDo { get; set; }
    public string TrangThaiDuyet { get; set; } = string.Empty;
    public string? TrangThaiTranhChap { get; set; }
}

/// <summary>
/// Giao dịch thu bổ sung liên kết với đối soát
/// </summary>
public class GiaoDichThuDoiSoatDto
{
    public long MaChiTietThanhToan { get; set; }
    public long MaThanhToan { get; set; }
    public string MaYeuCau { get; set; } = string.Empty;
    public decimal SoTien { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public DateTime ThoiDiem { get; set; }
}

/// <summary>
/// Giao dịch hoàn tiền liên kết với đối soát
/// </summary>
public class GiaoDichHoanDoiSoatDto
{
    public long MaHoanTien { get; set; }
    public long MaChiTietThanhToanGoc { get; set; }
    public string? MaYeuCau { get; set; }
    public decimal SoTien { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public DateTime ThoiDiemYeuCau { get; set; }
    public DateTime? ThoiDiemThanhCong { get; set; }
}

/// <summary>
/// Response xem trước bảng tính đối soát (UC15)
/// </summary>
public class XemTruocDoiSoatResponse
{
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public bool DuDieuKien { get; set; }
    public List<string> VuongMac { get; set; } = new();

    public decimal TienCocDuocDoiSoat { get; set; }
    public decimal TongPhuPhiDuocDuyet { get; set; }
    public decimal SoTienCanHoan { get; set; }
    public decimal SoTienCanThuThem { get; set; }

    public List<NguonCocDto> NguonCoc { get; set; } = new();
    public List<PhuPhiDoiSoatDto> PhuPhi { get; set; } = new();

    /// <summary>
    /// Dấu vân tay của bảng tính (checksum) dùng để chống trôi dữ liệu giữa xem trước và xác nhận
    /// </summary>
    public string DauVanTayBangTinh { get; set; } = string.Empty;
}

/// <summary>
/// Cấu trúc snapshot lưu trong cột bang_tinh_doi_soat (JSON)
/// </summary>
public class BangTinhDoiSoatDto
{
    public List<long> NguonCocChiTietIds { get; set; } = new();
    public List<long> PhuPhiIds { get; set; } = new();
    public decimal TienCocSnapshot { get; set; }
    public decimal TongPhiSnapshot { get; set; }
    public decimal CanHoanSnapshot { get; set; }
    public decimal CanThuThemSnapshot { get; set; }
    public string DauVanTay { get; set; } = string.Empty;
    public string? MaYeuCauThuThem { get; set; }
    public List<string> DanhSachMaYeuCauHoan { get; set; } = new();
    public DateTime ThoiDiemXacNhan { get; set; }
}

/// <summary>
/// Yêu cầu lập phiếu đối soát ban đầu
/// </summary>
public class LapDoiSoatRequest
{
    public long MaDonThue { get; set; }
    public string? GhiChu { get; set; }
}

/// <summary>
/// Yêu cầu xác nhận bảng tính đối soát
/// </summary>
public class XacNhanDoiSoatRequest
{
    public string? DauVanTayBangTinh { get; set; }
    public bool XacNhan { get; set; } = true;
    public string? GhiChu { get; set; }
}

/// <summary>
/// Yêu cầu lập đối soát điều chỉnh sau khi đã chốt
/// </summary>
public class DieuChinhDoiSoatRequest
{
    public List<long> DanhSachMaPhuPhiDieuChinh { get; set; } = new();
    public string LyDo { get; set; } = string.Empty;
}

/// <summary>
/// Response chi tiết phiếu đối soát trả về cho client
/// </summary>
public class DoiSoatResponse
{
    public long MaDoiSoat { get; set; }
    public long MaDonThue { get; set; }
    public string? MaDonHienThi { get; set; }
    public long? MaDoiSoatGoc { get; set; }
    public string LoaiDoiSoat { get; set; } = string.Empty;
    public string TrangThai { get; set; } = string.Empty;

    public decimal TienCocDuocDoiSoat { get; set; }
    public decimal TongPhuPhiDuocDuyet { get; set; }
    public decimal CanHoan { get; set; }
    public decimal CanThuThem { get; set; }

    public decimal DaHoanThanhCong { get; set; }
    public decimal HoanDangCho { get; set; }
    public decimal DaThuThemThanhCong { get; set; }
    public decimal ThuThemDangCho { get; set; }
    public decimal ConChuaLapYeuCau { get; set; }
    public bool CoTheChot { get; set; }

    public long MaNguoiLap { get; set; }
    public string? TenNguoiLap { get; set; }
    public long? MaNguoiChot { get; set; }
    public string? TenNguoiChot { get; set; }

    public DateTime ThoiDiemLap { get; set; }
    public DateTime? ThoiDiemChot { get; set; }
    public string? LyDoDieuChinh { get; set; }

    public List<NguonCocDto> NguonCoc { get; set; } = new();
    public List<PhuPhiDoiSoatDto> DanhSachPhuPhi { get; set; } = new();
    public List<GiaoDichThuDoiSoatDto> GiaoDichThuThem { get; set; } = new();
    public List<GiaoDichHoanDoiSoatDto> GiaoDichHoan { get; set; } = new();
}
