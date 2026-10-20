using System;
using System.Collections.Generic;
using GearGo.Models.Enums;

namespace GearGo.Models.DTOs.QuanTriKhuyenMai;

/// <summary>
/// Yêu cầu cập nhật chương trình khuyến mãi (W6-T2 - UC24)
/// Các trường điều khoản cam kết sẽ bị chặn nếu mã đã có lượt giữ/dùng.
/// </summary>
public class CapNhatKhuyenMaiRequest
{
    public string? TenKhuyenMai { get; set; }

    public LoaiKhuyenMai? LoaiGiam { get; set; }

    public decimal? GiaTriGiam { get; set; }

    public decimal? MucGiamToiDa { get; set; }

    public decimal? TienThueToiThieu { get; set; }

    public PhamViApDung? PhamVi { get; set; }

    public DateTime? BatDau { get; set; }

    public DateTime? KetThuc { get; set; }

    public int? GioiHanTongLuot { get; set; }

    public int? GioiHanMoiKhach { get; set; }

    public List<long>? SanPhamIds { get; set; }

    public List<long>? DanhMucIds { get; set; }

    public string? LyDo { get; set; }
}
