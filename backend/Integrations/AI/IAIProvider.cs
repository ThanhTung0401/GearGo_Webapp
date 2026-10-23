using GearGo.Models.DTOs.TuVan;

namespace GearGo.Integrations.AI;

public interface IAIProvider
{
    Task<AiProviderResult> GoiAsync(TuVanBoDoRequest request, List<AiCandidate> candidates, CancellationToken cancellationToken = default);
}
