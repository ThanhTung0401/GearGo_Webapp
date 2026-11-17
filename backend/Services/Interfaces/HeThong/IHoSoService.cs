using GearGo.Models.DTOs.HoSo;

namespace GearGo.Services.Interfaces;

public interface IHoSoService
{
    Task<HoSoResponse> LayHoSoCuaToiAsync(long maTaiKhoan);
    Task<GuiOtpDoiLienHeResponse> GuiOtpDoiLienHeAsync(GuiOtpDoiLienHeRequest request, long maTaiKhoan);
    Task<HoSoResponse> CapNhatHoSoCuaToiAsync(CapNhatHoSoRequest request, long maTaiKhoan);
}
