using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using GearGo.Models.Common;
using GearGo.Models.Enums;

namespace GearGo.Models.DTOs.PhieuNhap;

/// <summary>
/// DTO yêu cầu tạo đầu phiếu nhập hàng nháp
/// </summary>
public class TaoPhieuNhapRequest
{
    [Required(ErrorMessage = "Mã nhà cung cấp là bắt buộc.")]
    public long MaNhaCungCap { get; set; }

    public DateTime? NgayNhapDuKien { get; set; }

    [MaxLength(100, ErrorMessage = "Số chứng từ nhà cung cấp tối đa 100 ký tự.")]
    public string? SoChungTuNhaCungCap { get; set; }

    public string? GhiChu { get; set; }
}

/// <summary>
/// DTO yêu cầu cập nhật thông tin đầu phiếu nhập nháp
/// </summary>
public class CapNhatPhieuNhapRequest
{
    [Required(ErrorMessage = "Mã nhà cung cấp là bắt buộc.")]
    public long MaNhaCungCap { get; set; }

    public DateTime? NgayNhapDuKien { get; set; }

    [MaxLength(100, ErrorMessage = "Số chứng từ nhà cung cấp tối đa 100 ký tự.")]
    public string? SoChungTuNhaCungCap { get; set; }

    public string? GhiChu { get; set; }
}

/// <summary>
/// DTO thêm hoặc sửa dòng chi tiết trong phiếu nhập
/// </summary>
public class DongNhapRequest
{
    [Required(ErrorMessage = "Mã sản phẩm là bắt buộc.")]
    public long MaSanPham { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Số lượng nhập phải là số nguyên dương lớn hơn 0.")]
    public int SoLuong { get; set; }

    [Range(0, (double)decimal.MaxValue, ErrorMessage = "Đơn giá nhập không được âm.")]
    public decimal DonGiaNhap { get; set; }

    [Required(ErrorMessage = "Tình trạng khi nhập là bắt buộc.")]
    [MaxLength(255)]
    public string TinhTrangKhiNhap { get; set; } = null!;

    public string? GhiChu { get; set; }
}

/// <summary>
/// DTO yêu cầu hủy phiếu nhập nháp
/// </summary>
public class HuyNhapRequest
{
    [Required(ErrorMessage = "Lý do hủy phiếu nhập là bắt buộc.")]
    public string LyDo { get; set; } = null!;
}

/// <summary>
/// DTO phản hồi thông tin chi tiết một dòng sản phẩm trong phiếu nhập
/// </summary>
public class ChiTietPhieuNhapResponse
{
    public long MaChiTietPhieuNhap { get; set; }
    public long MaPhieuNhap { get; set; }
    public long MaSanPham { get; set; }
    public string TenSanPham { get; set; } = null!;
    public int SoLuong { get; set; }
    public decimal DonGiaNhap { get; set; }
    public decimal ThanhTien => SoLuong * DonGiaNhap;
    public string TinhTrangKhiNhap { get; set; } = null!;
    public string? GhiChu { get; set; }
}

/// <summary>
/// DTO phản hồi phiếu nhập hàng
/// </summary>
public class PhieuNhapResponse
{
    public long MaPhieuNhap { get; set; }
    public string MaPhieuHienThi { get; set; } = null!;
    public long MaNhaCungCap { get; set; }
    public string TenNhaCungCap { get; set; } = null!;
    public long MaNguoiLap { get; set; }
    public string? TenNguoiLap { get; set; }
    public long? MaNguoiXacNhan { get; set; }
    public string? TenNguoiXacNhan { get; set; }
    public DateTime NgayLap { get; set; }
    public DateTime? NgayNhapDuKien { get; set; }
    public DateTime? NgayNhapThucTe { get; set; }
    public DateTime? NgayXacNhan { get; set; }
    public string? SoChungTuNhaCungCap { get; set; }
    public decimal TongTien { get; set; }
    public TrangThaiPhieuNhap TrangThai { get; set; }
    public string? LyDoHuy { get; set; }
    public string? GhiChu { get; set; }
    public bool CoTheSua { get; set; }
    public List<ChiTietPhieuNhapResponse> ChiTietPhieuNhaps { get; set; } = new();
}
