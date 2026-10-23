using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.Kho;

/// <summary>
/// Yêu cầu tìm kiếm và lọc danh sách thiết bị trong kho
/// </summary>
public class LocKhoRequest
{
    public long? MaSanPhamHienTai { get; set; }
    public string? TrangThai { get; set; }
    public string? TuKhoa { get; set; }
    public DateTime? GioNhan { get; set; }
    public DateTime? GioTra { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}

/// <summary>
/// Phản hồi tổng quan số lượng thiết bị theo trạng thái
/// </summary>
public class KhoTongQuanResponse
{
    public int TongHoSoThietBi { get; set; }
    public int SanSangTaiKho { get; set; }
    public int DangChoThue { get; set; }
    public int DangBaoTri { get; set; }
    public int NgungSuDung { get; set; }
    public int ThatLac { get; set; }

    /// <summary>
    /// Số lượng có thể nhận đặt cho khoảng ngày được chọn (nếu có truyền GioNhan, GioTra)
    /// </summary>
    public int? KhaDungTheoLich { get; set; }

    /// <summary>
    /// Tổng giá trị tiền nhập (chỉ hiển thị với Quản trị viên)
    /// </summary>
    public decimal? TongGiaTriNhap { get; set; }

    /// <summary>
    /// Thống kê chi tiết theo từng sản phẩm
    /// </summary>
    public List<ThongKeSanPhamKhoDto> ChiTietSanPham { get; set; } = new();
}

public class ThongKeSanPhamKhoDto
{
    public long MaSanPham { get; set; }
    public string TenSanPham { get; set; } = string.Empty;
    public int TongSo { get; set; }
    public int SanSang { get; set; }
    public int DangThue { get; set; }
    public int BaoTri { get; set; }
    public int NgungSuDung { get; set; }
    public int ThatLac { get; set; }
    public int? KhaDungTheoLich { get; set; }
}

/// <summary>
/// DTO dòng thông tin thiết bị trong kho
/// </summary>
public class ThietBiKhoItemDto
{
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public long MaSanPhamHienTai { get; set; }
    public string TenSanPhamHienTai { get; set; } = string.Empty;
    public long MaSanPhamGoc { get; set; }
    public string TenSanPhamGoc { get; set; } = string.Empty;
    public long MaChiTietPhieuNhap { get; set; }
    public string TrangThaiSuDung { get; set; } = string.Empty;
    public string? TinhTrang { get; set; }
    public decimal? GiaNhap { get; set; } // Chỉ trả về khi là Quản trị viên
    public DateTime NgayNhap { get; set; }
    public bool CoLichHenSapToi { get; set; }
}

/// <summary>
/// Yêu cầu đối chiếu kiểm kê thực tế tại kho
/// </summary>
public class DoiChieuKiemKeRequest
{
    /// <summary>
    /// Phạm vi mã sản phẩm cần kiểm kê (nếu null là kiểm kê toàn kho)
    /// </summary>
    public List<long>? PhamViMaSanPham { get; set; }

    /// <summary>
    /// Danh sách mã thiết bị quét được từ máy đọc mã vạch / kiểm đếm thực tế
    /// </summary>
    public List<string> DanhSachMaQuet { get; set; } = new();

    /// <summary>
    /// Thời điểm thực hiện kiểm kê
    /// </summary>
    public DateTime ThoiDiemKiemKe { get; set; } = DateTime.UtcNow;

    public string? GhiChu { get; set; }
}

/// <summary>
/// Báo cáo sai lệch kiểm kê kho (không làm thay đổi DB)
/// </summary>
public class DoiChieuKiemKeResponse
{
    public DateTime ThoiDiemDoiChieu { get; set; } = DateTime.UtcNow;
    public int TongSoKyVongTaiKho { get; set; }
    public int TongSoQuetThucTe { get; set; }

    /// <summary>
    /// Danh sách mã khớp chính xác
    /// </summary>
    public List<string> DanhSachKhop { get; set; } = new();

    /// <summary>
    /// Danh sách mã có trong kỳ vọng tại kho nhưng không được quét (cần xác minh)
    /// </summary>
    public List<ThietBiThieuDto> DanhSachThieu { get; set; } = new();

    /// <summary>
    /// Danh sách mã quét bị lặp lại trong một lần kiểm kê
    /// </summary>
    public List<string> DanhSachQuetTrung { get; set; } = new();

    /// <summary>
    /// Danh sách mã quét không tồn tại trong hệ thống
    /// </summary>
    public List<string> DanhSachMaLa { get; set; } = new();

    /// <summary>
    /// Danh sách thiết bị đang lưu hành ngoài kho (đang thuê, đang bảo trì) - không tính thiếu
    /// </summary>
    public List<ThietBiNgoaiKhoDto> DanhSachDangLuuHanhNgoaiKho { get; set; } = new();
}

public class ThietBiThieuDto
{
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public string TenSanPham { get; set; } = string.Empty;
    public string? TinhTrang { get; set; }
}

public class ThietBiNgoaiKhoDto
{
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public string TenSanPham { get; set; } = string.Empty;
    public string LyDoNgoaiKho { get; set; } = string.Empty; // DangThue | DangBaoTri
}

/// <summary>
/// Yêu cầu phân tích ảnh hưởng cam kết khi thay đổi thiết bị
/// </summary>
public class PhanTichAnhHuongRequest
{
    public long MaThietBi { get; set; }
    public string LoaiThayDoi { get; set; } = "GiangCap"; // GiangCap | NgungSuDung | BaoTri
    public long? MaSanPhamDich { get; set; }
    public string? LyDo { get; set; }
}

/// <summary>
/// Kết quả phân tích ảnh hưởng khả dụng
/// </summary>
public class PhanTichAnhHuongResponse
{
    public bool CoTheApDungHienTai { get; set; } = true;
    public List<string> CamKetCuThe { get; set; } = new();
    public List<string> ThieuSoLuongTheoLich { get; set; } = new();
    public List<string> VuongMac { get; set; } = new();
}
