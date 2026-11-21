namespace GearGo.Configuration;

public class TuVanOptions
{
    public const string Section = "TuVanOptions";

    /// <summary>Nhà cung cấp AI: "N8n", "Gemini", "OpenAI" hoặc "Mock".</summary>
    public string Provider { get; set; } = "Mock";
    public string? ApiKey { get; set; }
    public string Model { get; set; } = "gemini-2.5-flash";
    public int TimeoutSeconds { get; set; } = 15;
    public int MaxCandidates { get; set; } = 30;
    public int RateLimitPerMinute { get; set; } = 20;
    public string BaseUrl { get; set; } = string.Empty;
    /// <summary>URL Webhook của n8n self-host (Plan_Week7_HoanThien mục 2.4 & 4.5).</summary>
    public string? N8nWebhookUrl { get; set; }
    /// <summary>Header khóa tùy chọn X-N8N-API-KEY bảo vệ webhook n8n.</summary>
    public string? N8nApiKey { get; set; }
}
