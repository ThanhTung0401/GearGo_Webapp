using System.Collections.Generic;

namespace GearGo.Models.DTOs.SanPham;

public class SanPhamResponse
{
    public long MaSanPham { get; set; }
    public long MaDanhMuc { get; set; }
    public string TenSanPham { get; set; } = null!;
    public string? ThuongHieu { get; set; }
    public string? MoTa { get; set; }
    public int? SucChua { get; set; }
    public string? KichThuoc { get; set; }
    public string? ThongSo { get; set; }
    public decimal GiaThueMoiNgay { get; set; }
    public decimal MucCocMoiThietBi { get; set; }
    public decimal GiaTriBoiThuong { get; set; }
    
    public string? HinhAnhChinh { get; set; }
    public List<string> HinhAnhs { get; set; } = new();
    
    public int? SoLuongKhaDung { get; set; }

    /// <summary>Điểm đánh giá trung bình (chỉ tính các đánh giá hiển thị, null nếu chưa có đánh giá)</summary>
    public double? DiemTrungBinh { get; set; }

    /// <summary>Tổng số lượt đánh giá hiển thị của sản phẩm</summary>
    public int SoLuongDanhGia { get; set; } = 0;
}

