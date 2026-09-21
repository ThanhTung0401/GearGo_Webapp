using System.ComponentModel.DataAnnotations;
  namespace GearGo.Models.DTOs.Auth;
  public class DangNhapRequest
  {
      [Required] public string TaiKhoan { get; set; } = string.Empty;
      [Required] public string MatKhau { get; set; } = string.Empty;
  }
  