using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.NhanTra;

/// <summary>
/// Yêu cầu tạo phiếu nhận trả nháp (UC12)
/// </summary>
public class TaoNhanTraRequest
{
    [Required(ErrorMessage = "Danh sách chi tiết bàn giao là bắt buộc")]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 thiết bị để nhận trả")]
    public List<long> DanhSachChiTietBanGiao { get; set; } = new();

    public string? GhiChu { get; set; }
}

/// <summary>
/// Cấu trúc phụ kiện kiểm tra
/// </summary>
public class PhuKienItemDto
{
    public string Ten { get; set; } = string.Empty;
    public int SoLuong { get; set; } = 1;
}

/// <summary>
/// Dữ liệu kiểm tra một thiết bị cụ thể khi nhận trả
/// </summary>
public class DongNhanTraRequest
{
    [Required]
    public long MaChiTietBanGiao { get; set; }

    /// <summary>
    /// Thời điểm trả thực tế (đối với đồ đã về). Với đồ đề nghị mất: để null.
    /// </summary>
    public DateTime? ThoiDiemTraThucTe { get; set; }

    /// <summary>
    /// Kết luận kiểm tra: "Dat", "CanVeSinh", "HongNhe", "HongNang", "ThieuPhuKien", "MatThietBi"
    /// </summary>
    public string? KetLuan { get; set; }

    public string? TinhTrangSauThue { get; set; }

    public List<PhuKienItemDto>? PhuKienThucNhan { get; set; }

    public List<PhuKienItemDto>? PhuKienConThieu { get; set; }

    public List<string>? DanhSachAnh { get; set; }

    public string? BienBanMat { get; set; }

    public string? GhiChu { get; set; }
}

/// <summary>
/// Cập nhật phiếu nhận trả nháp sau khi kiểm tra thiết bị
/// </summary>
public class CapNhatPhieuNhanTraRequest
{
    [Required]
    public List<DongNhanTraRequest> DanhSachDong { get; set; } = new();

    public string? GhiChu { get; set; }
}

/// <summary>
/// Quản trị viên phê duyệt kết luận mất thiết bị
/// </summary>
public class DuyetMatRequest
{
    [Required(ErrorMessage = "Lý do duyệt mất là bắt buộc")]
    public string LyDo { get; set; } = null!;

    public string? BienBanMat { get; set; }

    [Required(ErrorMessage = "Mã phụ phí bồi thường đã duyệt là bắt buộc")]
    public long MaPhuPhiBoiThuong { get; set; }
}

/// <summary>
/// Tách các dòng chưa đủ điều kiện (mất/hỏng nặng) sang phiếu nháp riêng
/// </summary>
public class TachDongChoXuLyRequest
{
    [Required(ErrorMessage = "Danh sách dòng cần tách là bắt buộc")]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 dòng để tách")]
    public List<long> DanhSachChiTietNhanTra { get; set; } = new();

    [Required(ErrorMessage = "Lý do tách dòng là bắt buộc")]
    public string LyDo { get; set; } = null!;
}

/// <summary>
/// Thông tin chi tiết nhận trả trả về
/// </summary>
public class ChiTietNhanTraResponse
{
    public long MaChiTietNhanTra { get; set; }
    public long MaChiTietBanGiao { get; set; }
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public string TenSanPham { get; set; } = string.Empty;
    public DateTime? ThoiDiemTraThucTe { get; set; }
    public string? KetLuan { get; set; }
    public string? TinhTrangSauThue { get; set; }
    public string? PhuKienThucNhan { get; set; }
    public string? PhuKienConThieu { get; set; }
    public string? DanhSachAnh { get; set; }
    public string? BienBanMat { get; set; }
    public string? TrangThaiXuLy { get; set; }
    public long? MaNguoiDuyetMat { get; set; }
    public string? TenNguoiDuyetMat { get; set; }
    public DateTime? ThoiDiemDuyetMat { get; set; }
    public string? GhiChu { get; set; }
}

/// <summary>
/// Thông tin phiếu nhận trả hoàn chỉnh
/// </summary>
public class NhanTraResponse
{
    public long MaPhieu { get; set; }
    public long MaDonThue { get; set; }
    public string MaPhieuHienThi { get; set; } = string.Empty;
    public int LanTra { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public DateTime ThoiDiemLap { get; set; }
    public DateTime? ThoiDiemChot { get; set; }
    public string? TenNhanVienLucNhan { get; set; }
    public string? GhiChu { get; set; }
    public bool LaLanTraCuoi { get; set; }
    public int SoThietBiConNo { get; set; }
    public List<ChiTietNhanTraResponse> ChiTiet { get; set; } = new();
    public List<string> CanhBaoDonSau { get; set; } = new();
}

/// <summary>
/// Thông tin thiết bị còn nợ của đơn thuê
/// </summary>
public class ThietBiConNoResponse
{
    public long MaChiTietBanGiao { get; set; }
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public string TenSanPham { get; set; } = string.Empty;
    public string? TinhTrangTruocThue { get; set; }
    public string? PhuKienThucGiao { get; set; }
    public long? MaPhieuNhanTraDangGiu { get; set; }
    public string? TrangThaiXuLy { get; set; }
}

/// <summary>
/// Kết quả sau khi tách dòng chờ xử lý (trả về cả phiếu gốc và phiếu nháp mới)
/// </summary>
public class TachDongResponse
{
    public NhanTraResponse PhieuGoc { get; set; } = null!;
    public NhanTraResponse PhieuMoi { get; set; } = null!;
}
