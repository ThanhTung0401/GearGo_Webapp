using System;
using System.Collections.Generic;
using GearGo.Models.Enums;

namespace GearGo.Models.DTOs.QuanTriKhuyenMai;

/// <summary>
/// Thông tin chi tiết khuyến mãi dành cho trang Quản trị (W6-T2)
/// </summary>
public class KhuyenMaiResponse
{
    public long MaKhuyenMai { get; set; }
    public string MaGiamGia { get; set; } = string.Empty;
    public string? TenKhuyenMai { get; set; }
    public LoaiKhuyenMai LoaiGiam { get; set; }
    public decimal GiaTriGiam { get; set; }
    public decimal? MucGiamToiDa { get; set; }
    public decimal TienThueToiThieu { get; set; }
    public PhamViApDung PhamVi { get; set; }
    public DateTime BatDau { get; set; }
    public DateTime KetThuc { get; set; }
    public int? GioiHanTongLuot { get; set; }
    public int? GioiHanMoiKhach { get; set; }
    public TrangThaiKhuyenMai TrangThai { get; set; }

    /// <summary>
    /// Danh sách ID sản phẩm được áp dụng nếu là TheoSanPham
    /// </summary>
    public List<long> SanPhamIds { get; set; } = new();

    /// <summary>
    /// Danh sách ID danh mục được áp dụng nếu là TheoDanhMuc
    /// </summary>
    public List<long> DanhMucIds { get; set; } = new();

    // ── Thống kê lượt sử dụng thực tế từ LUOT_SU_DUNG_KHUYEN_MAI ──
    public int SoLuotDaDung { get; set; }
    public int SoLuotDangGiuConHan { get; set; }
    public int SoLuotDaGiaiPhong { get; set; }

    /// <summary>
    /// Cờ báo hiệu mã có thể sửa điều khoản cam kết hay không (chỉ được sửa khi chưa có lượt giữ/dùng)
    /// </summary>
    public bool CoTheSuaDieuKhoanCamKet => SoLuotDaDung == 0 && SoLuotDangGiuConHan == 0;
}
