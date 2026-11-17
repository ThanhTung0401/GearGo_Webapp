using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;

namespace GearGo.Services.Interfaces;

public interface IDonThueService
{
    Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request);
    Task<Result<bool>> HuyDonAsync(long maDonThue, string lyDo, long maTaiKhoan);
}
