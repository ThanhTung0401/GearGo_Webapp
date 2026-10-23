using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.TuVan;

public class TuVanBoDoRequest
{
    public string? DiemDen { get; set; }

    [Required(ErrorMessage = "Số người là bắt buộc")]
    [Range(1, 100, ErrorMessage = "Số người phải lớn hơn 0 và tối đa 100 người")]
    public int SoNguoi { get; set; }

    public DateTime? GioNhan { get; set; }
    public DateTime? GioTra { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Ngân sách không được âm")]
    public decimal? NganSach { get; set; }

    /// <summary>
    /// "TienThue" hoặc "TongBanDau" (tiền thuê + cọc)
    /// </summary>
    public string? LoaiNganSach { get; set; } = "TienThue";

    public List<string>? NhuCau { get; set; } = new();
}

public class TuVanBoDoResponse
{
    public string NguonGoiY { get; set; } = "QuyTac"; // "AI" hoặc "QuyTac"
    public string TrangThai { get; set; } = "ThanhCong"; // "ThanhCong", "CanBoSungThongTin", "KhongTimThayPhuongAn"
    public DateTime? GioNhan { get; set; }
    public DateTime? GioTra { get; set; }
    public int? ThoiGianThueNgay { get; set; }
    public DateTime ThoiDiemKiemTra { get; set; } = DateTime.UtcNow;

    public decimal? TongTienThue { get; set; }
    public decimal? TongTienCoc { get; set; }
    public decimal? TongBanDau { get; set; }

    public string? ThongBaoPhanThieu { get; set; }
    public List<DongGoiYResponse> CacDong { get; set; } = new();
}

public class DongGoiYResponse
{
    public long MaSanPham { get; set; }
    public string MaSanPhamHienThi { get; set; } = string.Empty;
    public string TenSanPham { get; set; } = string.Empty;
    public int SoLuong { get; set; }
    public int? SucChua { get; set; }
    public decimal DonGiaThueMoiNgay { get; set; }
    public decimal MucCocMoiThietBi { get; set; }
    public decimal TienThue { get; set; }
    public decimal TienCoc { get; set; }
    public int SoLuongKhaDung { get; set; }
    public string LyDo { get; set; } = string.Empty;
}

public class ThemBoDoRequest
{
    public DateTime? GioNhan { get; set; }
    public DateTime? GioTra { get; set; }

    [Required]
    public List<DongThemBoDoRequest> CacDong { get; set; } = new();

    /// <summary>
    /// "GiuNguyen" (báo lỗi nếu khác), "ThayThe" (cập nhật lại ngày giỏ hàng theo ngày bộ đồ)
    /// </summary>
    public string? XuLyXungDotLich { get; set; } = "GiuNguyen";
}

public class DongThemBoDoRequest
{
    [Required]
    public long MaSanPham { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải là số nguyên dương")]
    public int SoLuong { get; set; }
}

public class AiCandidate
{
    public long MaSanPham { get; set; }
    public string MaSanPhamHienThi { get; set; } = string.Empty;
    public string TenSanPham { get; set; } = string.Empty;
    public string TenDanhMuc { get; set; } = string.Empty;
    public int? SucChua { get; set; }
    public decimal GiaThueMoiNgay { get; set; }
    public decimal MucCocMoiThietBi { get; set; }
    public int SoLuongKhaDung { get; set; }
    public string? MoTa { get; set; }
}

public class AiSelection
{
    public long MaSanPham { get; set; }
    public int SoLuong { get; set; }
    public string LyDo { get; set; } = string.Empty;
}

public class AiProviderResult
{
    public bool ThanhCong { get; set; }
    public List<AiSelection> Selections { get; set; } = new();
    public string? Loi { get; set; }
    public string ProviderUsed { get; set; } = "Mock";
}
