using GearGo.Models.Common;
using GearGo.Models.DTOs;

namespace GearGo.Services.Interfaces;

public interface IDonThueService
{
    Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request);

    // Khách hàng chủ động hủy đơn
    Task<Result<bool>> HuyDonAsync(long maDonThue, string lyDo);
}
