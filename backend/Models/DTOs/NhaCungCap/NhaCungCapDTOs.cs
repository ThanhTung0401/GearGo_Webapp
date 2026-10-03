using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using GearGo.Models.Common;

namespace GearGo.Models.DTOs.NhaCungCap;

/// <summary>
/// DTO yêu cầu tạo mới Nhà cung cấp (Admin)
/// </summary>
public class TaoNhaCungCapRequest
{
    [Required(ErrorMessage = "Mã hiển thị nhà cung cấp là bắt buộc.")]
    [MaxLength(50, ErrorMessage = "Mã hiển thị tối đa 50 ký tự.")]
    public string MaHienThi { get; set; } = null!;

    [Required(ErrorMessage = "Tên nhà cung cấp là bắt buộc.")]
    [MaxLength(255, ErrorMessage = "Tên nhà cung cấp tối đa 255 ký tự.")]
    public string Ten { get; set; } = null!;

    [MaxLength(255)]
    public string? NguoiLienHe { get; set; }

    [MaxLength(20)]
    public string? SoDienThoai { get; set; }

    [MaxLength(255)]
    [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ.")]
    public string? Email { get; set; }

    public string? DiaChi { get; set; }

    [MaxLength(50)]
    public string? MaSoThue { get; set; }

    public string? GhiChu { get; set; }
}

/// <summary>
/// DTO yêu cầu cập nhật thông tin Nhà cung cấp (Admin)
/// </summary>
public class CapNhatNhaCungCapRequest
{
    [Required(ErrorMessage = "Tên nhà cung cấp là bắt buộc.")]
    [MaxLength(255, ErrorMessage = "Tên nhà cung cấp tối đa 255 ký tự.")]
    public string Ten { get; set; } = null!;

    [MaxLength(255)]
    public string? NguoiLienHe { get; set; }

    [MaxLength(20)]
    public string? SoDienThoai { get; set; }

    [MaxLength(255)]
    [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ.")]
    public string? Email { get; set; }

    public string? DiaChi { get; set; }

    [MaxLength(50)]
    public string? MaSoThue { get; set; }

    public string? GhiChu { get; set; }

    public string? LyDoThayDoi { get; set; }
}

/// <summary>
/// DTO thay đổi trạng thái hợp tác của Nhà cung cấp (Admin)
/// </summary>
public class DoiHopTacRequest
{
    [Required(ErrorMessage = "Trạng thái hợp tác là bắt buộc.")]
    [RegularExpression("^(DangHopTac|NgungHopTac)$", ErrorMessage = "Trạng thái hợp tác chỉ nhận DangHopTac hoặc NgungHopTac.")]
    public string TrangThaiHopTac { get; set; } = null!;

    [Required(ErrorMessage = "Lý do thay đổi trạng thái là bắt buộc.")]
    public string LyDo { get; set; } = null!;
}

/// <summary>
/// DTO phản hồi thông tin Nhà cung cấp
/// </summary>
public class NhaCungCapResponse
{
    public long MaNhaCungCap { get; set; }
    public string MaNhaCungCapHienThi { get; set; } = null!;
    public string TenNhaCungCap { get; set; } = null!;
    public string? NguoiLienHe { get; set; }
    public string? SoDienThoai { get; set; }
    public string? Email { get; set; }
    public string? DiaChi { get; set; }
    public string? MaSoThue { get; set; }
    public string? GhiChu { get; set; }
    public string TrangThaiHopTac { get; set; } = null!;
    public string? CanhBaoTrung { get; set; }
}

/// <summary>
/// DTO phản hồi tổng hợp lịch sử nhập hàng của Nhà cung cấp
/// </summary>
public class LichSuNhapResponse
{
    public int TongSoPhieuDaNhap { get; set; }
    public decimal TongGiaTriNhap { get; set; }
    public int TongSoLuongThietBi { get; set; }
    public PagedResult<LichSuNhapItemResponse> PhieuNhaps { get; set; } = new();
}

public class LichSuNhapItemResponse
{
    public long MaPhieuNhap { get; set; }
    public string MaPhieuHienThi { get; set; } = null!;
    public string? SoChungTuNhaCungCap { get; set; }
    public DateTime NgayLap { get; set; }
    public DateTime? NgayNhapThucTe { get; set; }
    public DateTime? NgayXacNhan { get; set; }
    public decimal TongTien { get; set; }
    public string? TenNguoiLap { get; set; }
    public string? TenNguoiXacNhan { get; set; }
    public List<SanPhamNhapItemResponse> ChiTietSanPham { get; set; } = new();
}

public class SanPhamNhapItemResponse
{
    public long MaChiTietPhieuNhap { get; set; }
    public long MaSanPham { get; set; }
    public string TenSanPham { get; set; } = null!;
    public int SoLuong { get; set; }
    public decimal DonGiaNhap { get; set; }
    public decimal ThanhTien => SoLuong * DonGiaNhap;
    public string TinhTrangKhiNhap { get; set; } = null!;
}
