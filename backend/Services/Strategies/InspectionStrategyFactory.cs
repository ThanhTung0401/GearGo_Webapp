using GearGo.Helpers;

namespace GearGo.Services.Strategies;

public class InspectionStrategyFactory : IInspectionStrategyFactory
{
    private static readonly HashSet<string> ValidConclusions = new(StringComparer.OrdinalIgnoreCase)
    {
        DomainConstants.InspectionConclusions.Pass,
        DomainConstants.InspectionConclusions.NeedsCleaning,
        DomainConstants.InspectionConclusions.MinorDamage,
        DomainConstants.InspectionConclusions.MajorDamage,
        DomainConstants.InspectionConclusions.MissingAccessories,
        DomainConstants.InspectionConclusions.Lost
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
