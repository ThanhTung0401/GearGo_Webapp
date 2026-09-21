 using System.ComponentModel.DataAnnotations;
  namespace GearGo.Models.DTOs.Auth;
  public class QuenMatKhauRequest
  {
      [Required][EmailAddress] public string Email { get; set; } = "";
  }