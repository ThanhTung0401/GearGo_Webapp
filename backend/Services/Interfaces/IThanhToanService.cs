using GearGo.Models.Common;
using GearGo.Models.DTOs.ThanhToan;

namespace GearGo.Services.Interfaces;

public interface IThanhToanService
{
    Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request);
}
