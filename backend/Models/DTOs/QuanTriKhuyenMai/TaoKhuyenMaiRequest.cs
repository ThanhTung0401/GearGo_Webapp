using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using GearGo.Models.Enums;

namespace GearGo.Models.DTOs.QuanTriKhuyenMai;

/// <summary>
/// Yêu cầu tạo mới chương trình khuyến mãi (W6-T2 - UC24)
/// </summary>
public class TaoKhuyenMaiRequest
{
    [Required(ErrorMessage = "Mã giảm giá là bắt buộc.")]
    [MaxLength(50, ErrorMessage = "Mã giảm giá tối đa 50 ký tự.")]
    public string MaGiamGia { get; set; } = string.Empty;

    [MaxLength(255, ErrorMessage = "Tên khuyến mãi tối đa 255 ký tự.")]
    public string? TenKhuyenMai { get; set; }

    [Required(ErrorMessage = "Loại giảm giá là bắt buộc.")]
    public LoaiKhuyenMai LoaiGiam { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "Giá trị giảm phải lớn hơn 0.")]
    public decimal GiaTriGiam { get; set; }

    public decimal? MucGiamToiDa { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Tiền thuê tối thiểu không được âm.")]
    public decimal TienThueToiThieu { get; set; } = 0;

    [Required(ErrorMessage = "Phạm vi áp dụng là bắt buộc.")]
    public PhamViApDung PhamVi { get; set; } = PhamViApDung.TatCa;

    [Required(ErrorMessage = "Thời điểm bắt đầu là bắt buộc.")]
    public DateTime BatDau { get; set; }

    [Required(ErrorMessage = "Thời điểm kết thúc là bắt buộc.")]
    public DateTime KetThuc { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Giới hạn tổng lượt nếu có phải lớn hơn 0.")]
    public int? GioiHanTongLuot { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Giới hạn mỗi khách nếu có phải lớn hơn 0.")]
    public int? GioiHanMoiKhach { get; set; }

    /// <summary>
    /// Danh sách ID sản phẩm áp dụng khi PhamVi = TheoSanPham
    /// </summary>
    public List<long>? SanPhamIds { get; set; }

    /// <summary>
    /// Danh sách ID danh mục áp dụng khi PhamVi = TheoDanhMuc
    /// </summary>
    public List<long>? DanhMucIds { get; set; }
}
