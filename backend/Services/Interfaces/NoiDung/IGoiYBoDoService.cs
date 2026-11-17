using GearGo.Models.DTOs.TuVan;

namespace GearGo.Services.Interfaces;

public interface IGoiYBoDoService
{
    TuVanBoDoResponse GoiYTheoQuyTac(TuVanBoDoRequest request, List<AiCandidate> candidates, int thoiGianThueNgay);
}
