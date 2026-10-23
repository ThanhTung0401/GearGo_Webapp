namespace GearGo.Configuration;

public class TuVanOptions
{
    public const string Section = "TuVanOptions";

    public string Provider { get; set; } = "Mock"; // "Gemini", "OpenAI", or "Mock"
    public string? ApiKey { get; set; }
    public string Model { get; set; } = "gemini-1.5-flash";
    public int TimeoutSeconds { get; set; } = 10;
    public int MaxCandidates { get; set; } = 30;
    public int RateLimitPerMinute { get; set; } = 20;
    public string BaseUrl { get; set; } = string.Empty;
}
