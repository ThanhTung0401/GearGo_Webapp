using GearGo.Models.Common;
using GearGo.Models.DTOs.ThanhToan;

namespace GearGo.Services.Interfaces;

public interface IThanhToanService
{
    Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request);
    
    // W4-T5 & W4-T8
    Task<Result<YeuCauThuResponse>> TaoThuBoSungAsync(TaoThuBoSungRequest request, long actorId);
    Task<Result<YeuCauThuResponse>> LayTrangThaiGiaoDichAsync(string maYeuCau, long actorId);
    // Task<Result<NgoaiLeThanhToanResponse>> DoiChieuGiaoDichAsync(string maYeuCau, long actorId); // Mock cho T8
}
