using System.ComponentModel.DataAnnotations;
  namespace GearGo.Models.DTOs.Auth;
  public class DangKyRequest
  {
      [Required][EmailAddress][MaxLength(255)]
      public string Email { get; set; } = string.Empty;

      [Required][RegularExpression(@"^(0[3|5|7|8|9])[0-9]{8}$", ErrorMessage = "Số điện thoại không hợp lệ.")]
      public string SoDienThoai { get; set; } = string.Empty;

      [Required][MinLength(8)]
      public string MatKhau { get; set; } = string.Empty;

      [Required][Compare(nameof(MatKhau), ErrorMessage = "Mật khẩu xác nhận không khớp.")]
      public string XacNhanMatKhau { get; set; } = string.Empty;

      [MaxLength(255)] public string? HoTen { get; set; }
      public string? DiaChi { get; set; }
      public DateOnly? NgaySinh { get; set; }
  }