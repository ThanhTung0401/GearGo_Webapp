 using GearGo.Models.Common;
  using GearGo.Models.DTOs.Auth;
  namespace GearGo.Services.Interfaces;
  public interface IXacThucService
  {
      Task<Result<AuthResponse>> DangKyAsync(DangKyRequest req);
      Task<Result<AuthResponse>> DangNhapAsync(DangNhapRequest req);
      Task<Result<string>> TaoTokenQuenMatKhauAsync(string email);
      Task<Result> DatLaiMatKhauAsync(DatLaiMatKhauRequest req);
      Task<Result<AuthResponse>> LayThongTinToiAsync(long maTaiKhoan);
  }