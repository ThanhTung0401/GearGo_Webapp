 namespace GearGo.Models.DTOs.Auth;
  public class AuthResponse
  {
      public string Token { get; set; } = "";
      public string LoaiToken { get; set; } = "Bearer";
      public DateTime HetHanSau { get; set; }
      public long MaTaiKhoan { get; set; }
      public string VaiTro { get; set; } = "";
      public string? HoTen { get; set; }
      public string? Email { get; set; }
  }