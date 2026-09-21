using GearGo.Models.Entities;
  using GearGo.Services.Interfaces;
  using Microsoft.IdentityModel.Tokens;
  using System.IdentityModel.Tokens.Jwt;
  using System.Security.Claims;
  using System.Text;

  namespace GearGo.Services.Implements;
  public class JwtService : IJwtService
  {
      private readonly IConfiguration _config;
      public JwtService(IConfiguration config) { _config = config; }

      public (string token, DateTime hetHanSau) TaoToken(TaiKhoan taiKhoan)
      {
          var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:SecretKey"]!));
          var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
          var hetHanSau = DateTime.UtcNow.AddDays(7);

          var claims = new[]
          {
              new Claim("MaTaiKhoan", taiKhoan.MaTaiKhoan.ToString()),
              new Claim(ClaimTypes.Email, taiKhoan.Email ?? ""),
              new Claim(ClaimTypes.Role, taiKhoan.VaiTro)
          };

          var token = new JwtSecurityToken(claims: claims, expires: hetHanSau, signingCredentials: creds);
          return (new JwtSecurityTokenHandler().WriteToken(token), hetHanSau);
      }
  }