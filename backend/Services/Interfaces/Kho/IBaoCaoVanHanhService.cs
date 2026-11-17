using GearGo.Models.DTOs.BaoCao;

namespace GearGo.Services.Interfaces;

public interface IBaoCaoVanHanhService
{
    Task<BaoCaoVanHanhChiTietResponse> LayBaoCaoVanHanhAsync(BoLocBaoCaoRequest filter);
}
