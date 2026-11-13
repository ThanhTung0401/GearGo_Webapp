using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.Auth;

/// <summary>
/// Yêu cầu đổi mật khẩu cho tài khoản đang đăng nhập (UC1.12).
/// </summary>
public class DoiMatKhauRequest
{
    [Required(ErrorMessage = "Mật khẩu hiện tại không được để trống.")]
    public string MatKhauHienTai { get; set; } = "";

    [Required(ErrorMessage = "Mật khẩu mới không được để trống.")]
    [MinLength(8, ErrorMessage = "Mật khẩu mới phải có ít nhất 8 ký tự.")]
    public string MatKhauMoi { get; set; } = "";

    [Required(ErrorMessage = "Xác nhận mật khẩu không được để trống.")]
    [Compare(nameof(MatKhauMoi), ErrorMessage = "Mật khẩu xác nhận không khớp.")]
    public string XacNhanMatKhau { get; set; } = "";
}

