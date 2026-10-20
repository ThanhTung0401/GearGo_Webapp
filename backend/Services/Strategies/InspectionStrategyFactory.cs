using GearGo.Helpers;

namespace GearGo.Services.Strategies;

public class InspectionStrategyFactory : IInspectionStrategyFactory
{
    private static readonly HashSet<string> ValidConclusions = new(StringComparer.OrdinalIgnoreCase)
    {
        KietDomainConstants.KetLuanKiemTra.Dat,
        KietDomainConstants.KetLuanKiemTra.CanVeSinh,
        KietDomainConstants.KetLuanKiemTra.HongNhe,
        KietDomainConstants.KetLuanKiemTra.HongNang,
        KietDomainConstants.KetLuanKiemTra.ThieuPhuKien,
        KietDomainConstants.KetLuanKiemTra.MatThietBi
    };

    private readonly IEnumerable<IInspectionStrategy> _strategies;

    public InspectionStrategyFactory(IEnumerable<IInspectionStrategy> strategies)
    {
        _strategies = strategies;
    }

    public bool IsValidConclusion(string? ketLuan)
        => !string.IsNullOrWhiteSpace(ketLuan) && ValidConclusions.Contains(ketLuan);

    public IInspectionStrategy? GetStrategy(string? ketLuan)
        => string.IsNullOrWhiteSpace(ketLuan)
            ? null
            : _strategies.FirstOrDefault(s => s.CanHandle(ketLuan));
}
