using GearGo.Models.Entities;
namespace GearGo.Services.Interfaces;
  public interface IJwtService
  {
      (string token, DateTime hetHanSau) TaoToken(TaiKhoan taiKhoan);
  }