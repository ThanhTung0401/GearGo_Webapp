using GearGo.Models.Common;
using GearGo.Models.DTOs;

namespace GearGo.Services.DonThue;

public interface IDonThueService
{
    Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request);
}
