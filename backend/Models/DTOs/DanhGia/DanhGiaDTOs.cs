using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.DanhGia;

/// <summary>
/// DTO gửi lên để tạo đánh giá cho một chi tiết đơn thuê
/// </summary>
public class TaoDanhGiaRequest
{
    [Required(ErrorMessage = "Mã chi tiết đơn thuê là bắt buộc.")]
    public long MaChiTietDon { get; set; }

    [Range(1, 5, ErrorMessage = "Số sao đánh giá phải từ 1 đến 5.")]
    public int SoSao { get; set; }

    [MaxLength(1000, ErrorMessage = "Nội dung đánh giá tối đa 1000 ký tự.")]
    public string? NoiDung { get; set; }

    /// <summary>
    /// Danh sách URL ảnh đính kèm (tối đa 5 ảnh)
    /// </summary>
    public List<string>? DanhSachAnh { get; set; }
}

/// <summary>
/// Bộ lọc danh sách đánh giá sản phẩm công khai
/// </summary>
public class LocDanhGiaRequest
{
    public long SanPhamId { get; set; }

    public int? SoSao { get; set; }

    public int Trang { get; set; } = 1;

    public int SoMoiTrang { get; set; } = 10;

    /// <summary>
    /// Sắp xếp: "MoiNhat", "DiemCao", "DiemThap"
    /// </summary>
    public string? ThuTu { get; set; } = "MoiNhat";
}

/// <summary>
/// Yêu cầu ẩn đánh giá từ Quản trị viên
/// </summary>
public class AnDanhGiaRequest
{
    [Required(ErrorMessage = "Lý do ẩn đánh giá là bắt buộc.")]
    [MaxLength(500, ErrorMessage = "Lý do ẩn tối đa 500 ký tự.")]
    public string LyDo { get; set; } = null!;
}

/// <summary>
/// Yêu cầu khôi phục hiển thị đánh giá
/// </summary>
public class KhoiPhucDanhGiaRequest
{
    [MaxLength(500, ErrorMessage = "Lý do khôi phục tối đa 500 ký tự.")]
    public string? LyDo { get; set; }
}

/// <summary>
/// DTO phản hồi chi tiết của một đánh giá
/// </summary>
public class DanhGiaResponse
{
    public long MaDanhGia { get; set; }

    public long MaChiTietDon { get; set; }

    public long MaSanPham { get; set; }

    public string TenSanPham { get; set; } = null!;

    /// <summary>
    /// Tên tác giả hiển thị đã được che bớt bảo mật (vd: "Nguyễn V***")
    /// </summary>
    public string TenNguoiDung { get; set; } = null!;

    public int SoSao { get; set; }

    public string? NoiDung { get; set; }

    public List<string> DanhSachAnh { get; set; } = new();

    public DateTime NgayTao { get; set; }

    public string TrangThaiHienThi { get; set; } = "HienThi";

    public string? LyDoAn { get; set; }
}

/// <summary>
/// DTO tổng hợp điểm số và phân bố sao của sản phẩm
/// </summary>
public class TongHopDanhGiaResponse
{
    public int SoDanhGia { get; set; }

    public double? DiemTrungBinh { get; set; }

    /// <summary>
    /// Thống kê số lượng đánh giá theo từng mức 1, 2, 3, 4, 5 sao
    /// </summary>
    public Dictionary<int, int> ThongKe1Den5Sao { get; set; } = new()
    {
        { 1, 0 },
        { 2, 0 },
        { 3, 0 },
        { 4, 0 },
        { 5, 0 }
    };
}

/// <summary>
/// DTO hiển thị các sản phẩm đủ điều kiện đánh giá trong đơn đã hoàn tất của khách
/// </summary>
public class SanPhamDuDieuKienDanhGiaResponse
{
    public long MaChiTietDon { get; set; }

    public long MaDonThue { get; set; }

    public string MaDonHienThi { get; set; } = null!;

    public long MaSanPham { get; set; }

    public string TenSanPham { get; set; } = null!;

    public string? HinhAnhChinh { get; set; }

    public DateTime NgayHoanTat { get; set; }

    public bool DaDanhGia { get; set; }
}
