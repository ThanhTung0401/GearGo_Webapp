namespace GearGo.Services.Strategies;

public interface IInspectionStrategyFactory
{
    bool IsValidConclusion(string? ketLuan);
    IInspectionStrategy? GetStrategy(string? ketLuan);
}
