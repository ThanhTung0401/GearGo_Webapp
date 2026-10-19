namespace GearGo.Services.Strategies;

public class InspectionStrategyFactory : IInspectionStrategyFactory
{
    private static readonly HashSet<string> ValidConclusions = new(StringComparer.OrdinalIgnoreCase)
    {
        "Dat",
        "CanVeSinh",
        "HongNhe",
        "HongNang",
        "ThieuPhuKien",
        "MatThietBi"
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
