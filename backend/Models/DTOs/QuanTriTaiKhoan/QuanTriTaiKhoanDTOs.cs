using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.QuanTriTaiKhoan;

/// <summary>Bộ lọc tra cứu tài khoản (Admin). Lọc trước khi phân trang.</summary>
public class TimTaiKhoanRequest
{
    public string? TuKhoa { get; set; }
    public string? VaiTro { get; set; }
    public string? TrangThai { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}

/// <summary>Bộ lọc tra cứu nhân viên (Admin).</summary>
public class TimNhanVienRequest
{
    public string? TuKhoa { get; set; }
    public string? VaiTro { get; set; }
    public string? TrangThaiLamViec { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}

/// <summary>
/// Tạo nhân sự. Chỉ NhanVien/QuanTriVien. MatKhauKhoiTao do quản trị viên cấp ban đầu
/// (luồng cũ: BCrypt); không bao giờ được trả lại hoặc ghi vào nhật ký.
/// </summary>
public class TaoNhanVienRequest
{
    [Required, MaxLength(255)] public string HoTen { get; set; } = "";
    [Required, MaxLength(255)] public string Email { get; set; } = "";
    [Required, MaxLength(20)] public string SoDienThoai { get; set; } = "";
    public string? DiaChi { get; set; }
    public DateOnly? NgayVaoLam { get; set; }
    [Required, MaxLength(50)] public string VaiTro { get; set; } = "";
    [Required, MinLength(8), MaxLength(100)] public string MatKhauKhoiTao { get; set; } = "";
}

/// <summary>Không nhận PK/FK/vai trò/trạng thái: đổi vai trò, khóa, nghỉ việc là action riêng.</summary>
public class CapNhatNhanVienRequest
{
    [Required, MaxLength(255)] public string HoTen { get; set; } = "";
    [Required, MaxLength(255)] public string Email { get; set; } = "";
    [Required, MaxLength(20)] public string SoDienThoai { get; set; } = "";
    public string? DiaChi { get; set; }
    public DateOnly? NgayVaoLam { get; set; }
}

public class KhoaTaiKhoanRequest
{
    [Required, MaxLength(1000)] public string LyDo { get; set; } = "";
}

public class MoKhoaTaiKhoanRequest
{
    [Required, MaxLength(1000)] public string LyDo { get; set; } = "";
}

public class DoiVaiTroRequest
{
    [Required, MaxLength(50)] public string VaiTroMoi { get; set; } = "";
    [Required, MaxLength(1000)] public string LyDo { get; set; } = "";
}

public class NghiViecRequest
{
    public DateOnly NgayNghiViec { get; set; }
    [Required, MaxLength(1000)] public string LyDo { get; set; } = "";
}

public record PhanTrangResponse<T>(IReadOnlyList<T> Items, int TongSo, int Trang, int SoMoiTrang);

/// <summary>Không có mật khẩu băm hay secret.</summary>
public record TaiKhoanResponse(
    long MaTaiKhoan,
    string? Email,
    string? SoDienThoai,
    string VaiTro,
    string TrangThai,
    string? LyDoKhoa,
    string? HoTen,
    long? MaNhanVien,
    long? MaKhachHang,
    DateTime NgayTao,
    DateTime NgayCapNhat);

public record CongViecCanBanGiaoResponse(
    long MaPhieuBaoTri,
    long MaThietBi,
    string TrangThai,
    string? LoaiXuLy,
    string? MoTaLoi);

/// <summary>ID tài khoản và nhân viên tách riêng.</summary>
public record NhanVienResponse(
    long MaNhanVien,
    long MaTaiKhoan,
    string? HoTen,
    string? Email,
    string? SoDienThoai,
    string? DiaChi,
    DateOnly? NgayVaoLam,
    DateOnly? NgayNghiViec,
    string VaiTro,
    string TrangThaiTaiKhoan,
    string TrangThaiLamViec,
    IReadOnlyList<CongViecCanBanGiaoResponse> CongViecCanBanGiao);
