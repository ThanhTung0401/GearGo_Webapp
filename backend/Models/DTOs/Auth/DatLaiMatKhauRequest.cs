using System.ComponentModel.DataAnnotations;
  namespace GearGo.Models.DTOs.Auth;
  public class DatLaiMatKhauRequest
  {
      [Required] public string Token { get; set; } = "";
      [Required][MinLength(8)] public string MatKhauMoi { get; set; } = "";
      [Required][Compare(nameof(MatKhauMoi), ErrorMessage = "Mật khẩu xác nhận không khớp.")]
      public string XacNhanMatKhau { get; set; } = "";
  }