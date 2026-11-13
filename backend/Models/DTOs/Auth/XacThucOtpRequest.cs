using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.Auth;

/// <summary>
/// DTO yêu cầu xác minh mã OTP khôi phục mật khẩu (UC1.4 / UC15)
/// </summary>
public class XacThucOtpRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Mã OTP phải gồm đúng 6 chữ số.")]
    public string Otp { get; set; } = string.Empty;
}
