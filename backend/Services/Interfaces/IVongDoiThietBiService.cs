using GearGo.Models.Common;
using GearGo.Models.DTOs.VongDoiThietBi;

namespace GearGo.Services.Interfaces;

public interface IVongDoiThietBiService
{
    Task<Result<HoSoVongDoiResponse>> LayHoSoVongDoiAsync(long thietBiId, bool laAdmin);
    Task<Result<AnhHuongThayDoiResponse>> XemAnhHuongThayDoiAsync(long thietBiId, XemAnhHuongThayDoiRequest request);
    Task<Result<DeNghiVongDoiResponse>> DeNghiGiangCapAsync(long thietBiId, DeNghiGiangCapRequest request, long actorId);
    Task<Result<DeNghiVongDoiResponse>> DeNghiNgungSuDungAsync(long thietBiId, DeNghiNgungSuDungRequest request, long actorId);
    Task<Result<DeNghiVongDoiResponse>> DuyetDeNghiVongDoiAsync(long maPhieuDieuChinh, long actorId);
}
