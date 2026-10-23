using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GearGo.Configuration;
using GearGo.Models.DTOs.TuVan;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GearGo.Integrations.AI;

public class AIProviderAdapter : IAIProvider
{
    private readonly TuVanOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AIProviderAdapter> _logger;

    public AIProviderAdapter(
        IOptions<TuVanOptions> options,
        IHttpClientFactory httpClientFactory,
        IHttpContextAccessor httpContextAccessor,
        ILogger<AIProviderAdapter> logger)
    {
        _options = options.Value;
        _httpClientFactory = httpClientFactory;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<AiProviderResult> GoiAsync(TuVanBoDoRequest request, List<AiCandidate> candidates, CancellationToken cancellationToken = default)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var scenario = httpContext?.Request.Headers["X-Mock-AI-Scenario"].ToString();

        // ── Xử lý các scenario kiểm thử đặc biệt theo hợp đồng ──
        if (!string.IsNullOrEmpty(scenario))
        {
            return XuLyScenarioMock(scenario, request, candidates);
        }

        // Nếu không có API Key hoặc cấu hình Provider là Mock -> chạy Mock thông minh
        if (string.IsNullOrWhiteSpace(_options.ApiKey) || string.Equals(_options.Provider, "Mock", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("Sử dụng Mock AI Provider cho yêu cầu tư vấn bộ đồ");
            return MockChonBoDoThongMinh(request, candidates);
        }

        // Gọi AI thật (Gemini hoặc OpenAI)
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds > 0 ? _options.TimeoutSeconds : 10));

            if (string.Equals(_options.Provider, "Gemini", StringComparison.OrdinalIgnoreCase))
            {
                return await GoiGeminiAsync(request, candidates, cts.Token);
            }
            else if (string.Equals(_options.Provider, "OpenAI", StringComparison.OrdinalIgnoreCase))
            {
                return await GoiOpenAIAsync(request, candidates, cts.Token);
            }
            else
            {
                return MockChonBoDoThongMinh(request, candidates);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Gọi AI Provider bị timeout sau {Timeout}s", _options.TimeoutSeconds);
            return new AiProviderResult { ThanhCong = false, Loi = "TIMEOUT_PROVIDER", ProviderUsed = _options.Provider };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi kết nối AI Provider: {Message}", ex.Message);
            return new AiProviderResult { ThanhCong = false, Loi = ex.Message, ProviderUsed = _options.Provider };
        }
    }

    private AiProviderResult XuLyScenarioMock(string scenario, TuVanBoDoRequest request, List<AiCandidate> candidates)
    {
        switch (scenario.ToLowerInvariant())
        {
            case "timeout":
                return new AiProviderResult { ThanhCong = false, Loi = "TIMEOUT_PROVIDER", ProviderUsed = "Mock" };

            case "json_error":
                return new AiProviderResult { ThanhCong = false, Loi = "INVALID_JSON_RESPONSE", ProviderUsed = "Mock" };

            case "invalid_candidate":
                // Ca W5-T7-A02: Model trả ID lạ (999999), số lượng âm (-1)
                return new AiProviderResult
                {
                    ThanhCong = true,
                    ProviderUsed = "Mock",
                    Selections = new List<AiSelection>
                    {
                        new AiSelection { MaSanPham = 999999, SoLuong = -1, LyDo = "Mã sản phẩm lạ và số lượng âm từ model" }
                    }
                };

            case "invalid_capacity":
                // Ca W5-T7-A01: Nhu cầu 4 người nhưng chỉ gợi ý 1 lều sức chứa 2
                var leu2Nguoi = candidates.FirstOrDefault(c => c.SucChua == 2) ?? candidates.FirstOrDefault();
                return new AiProviderResult
                {
                    ThanhCong = true,
                    ProviderUsed = "Mock",
                    Selections = new List<AiSelection>
                    {
                        new AiSelection
                        {
                            MaSanPham = leu2Nguoi != null ? leu2Nguoi.MaSanPham : 1,
                            SoLuong = 1,
                            LyDo = "Lều đôi (chỉ chứa 2 người nhưng nhóm 4 người)"
                        }
                    }
                };

            default:
                return MockChonBoDoThongMinh(request, candidates);
        }
    }

    private AiProviderResult MockChonBoDoThongMinh(TuVanBoDoRequest request, List<AiCandidate> candidates)
    {
        var selections = new List<AiSelection>();
        var soNguoi = request.SoNguoi;

        // 1. Tìm lều phù hợp sức chứa
        var leuCandidates = candidates
            .Where(c => c.TenDanhMuc.Contains("Lều", StringComparison.OrdinalIgnoreCase) ||
                        c.TenSanPham.Contains("Lều", StringComparison.OrdinalIgnoreCase))
            .OrderBy(c => c.SucChua ?? 0)
            .ToList();

        var leuVuaVan = leuCandidates.FirstOrDefault(l => (l.SucChua ?? 0) >= soNguoi)
                        ?? leuCandidates.LastOrDefault();

        if (leuVuaVan != null)
        {
            var canLeu = 1;
            if ((leuVuaVan.SucChua ?? 0) > 0 && (leuVuaVan.SucChua ?? 0) < soNguoi)
            {
                canLeu = (int)Math.Ceiling((double)soNguoi / leuVuaVan.SucChua!.Value);
            }
            selections.Add(new AiSelection
            {
                MaSanPham = leuVuaVan.MaSanPham,
                SoLuong = canLeu,
                LyDo = $"Lều cắm trại phù hợp cho {soNguoi} người"
            });
        }

        // 2. Ghế cắm trại
        var ghe = candidates.FirstOrDefault(c => c.TenDanhMuc.Contains("Ghế", StringComparison.OrdinalIgnoreCase) ||
                                                 c.TenSanPham.Contains("Ghế", StringComparison.OrdinalIgnoreCase));
        if (ghe != null)
        {
            selections.Add(new AiSelection
            {
                MaSanPham = ghe.MaSanPham,
                SoLuong = soNguoi,
                LyDo = $"Mỗi thành viên 1 ghế xếp dã ngoại"
            });
        }

        // 3. Bàn cắm trại
        var ban = candidates.FirstOrDefault(c => c.TenDanhMuc.Contains("Bàn", StringComparison.OrdinalIgnoreCase) ||
                                                 c.TenSanPham.Contains("Bàn", StringComparison.OrdinalIgnoreCase));
        if (ban != null)
        {
            selections.Add(new AiSelection
            {
                MaSanPham = ban.MaSanPham,
                SoLuong = 1,
                LyDo = "Bàn gấp gọn sinh hoạt và ăn uống cho cả nhóm"
            });
        }

        // 4. Đèn dã ngoại
        var den = candidates.FirstOrDefault(c => c.TenDanhMuc.Contains("Đèn", StringComparison.OrdinalIgnoreCase) ||
                                                 c.TenSanPham.Contains("Đèn", StringComparison.OrdinalIgnoreCase));
        if (den != null)
        {
            selections.Add(new AiSelection
            {
                MaSanPham = den.MaSanPham,
                SoLuong = 1,
                LyDo = "Đèn lều chiếu sáng ban đêm"
            });
        }

        return new AiProviderResult
        {
            ThanhCong = true,
            Selections = selections,
            ProviderUsed = "Mock"
        };
    }

    private async Task<AiProviderResult> GoiGeminiAsync(TuVanBoDoRequest request, List<AiCandidate> candidates, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient();
        var model = string.IsNullOrWhiteSpace(_options.Model) ? "gemini-1.5-flash" : _options.Model;
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_options.ApiKey}";

        var prompt = DựngPrompt(request, candidates);

        var requestBody = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } }
            },
            generationConfig = new
            {
                temperature = 0.2,
                responseMimeType = "application/json"
            }
        };

        var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        var response = await client.PostAsync(url, content, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Gemini API lỗi ({StatusCode}): {Err}", response.StatusCode, err);
            return new AiProviderResult { ThanhCong = false, Loi = $"Gemini HTTP {response.StatusCode}", ProviderUsed = "Gemini" };
        }

        var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseGeminiResponse(jsonResponse);
    }

    private async Task<AiProviderResult> GoiOpenAIAsync(TuVanBoDoRequest request, List<AiCandidate> candidates, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient();
        var url = string.IsNullOrWhiteSpace(_options.BaseUrl) ? "https://api.openai.com/v1/chat/completions" : _options.BaseUrl;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        var prompt = DựngPrompt(request, candidates);

        var requestBody = new
        {
            model = string.IsNullOrWhiteSpace(_options.Model) ? "gpt-4o-mini" : _options.Model,
            messages = new[]
            {
                new { role = "system", content = "Bạn là trợ lý tư vấn bộ đồ cắm trại GearGo. Bạn CHỈ được trả lời bằng định dạng JSON array các món đồ." },
                new { role = "user", content = prompt }
            },
            temperature = 0.2,
            response_format = new { type = "json_object" }
        };

        var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        var response = await client.PostAsync(url, content, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("OpenAI API lỗi ({StatusCode}): {Err}", response.StatusCode, err);
            return new AiProviderResult { ThanhCong = false, Loi = $"OpenAI HTTP {response.StatusCode}", ProviderUsed = "OpenAI" };
        }

        var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseOpenAIResponse(jsonResponse);
    }

    private string DựngPrompt(TuVanBoDoRequest request, List<AiCandidate> candidates)
    {
        var candidateList = candidates.Select(c => new
        {
            c.MaSanPham,
            c.TenSanPham,
            c.TenDanhMuc,
            c.SucChua,
            c.GiaThueMoiNgay,
            c.MucCocMoiThietBi,
            c.SoLuongKhaDung
        });

        return $@"
Dưới đây là danh sách sản phẩm ứng viên có sẵn:
{JsonSerializer.Serialize(candidateList)}

Yêu cầu chuyến đi của khách:
- Điểm đến: {request.DiemDen ?? "Dã ngoại"}
- Số người tham gia: {request.SoNguoi}
- Ngân sách: {request.NganSach?.ToString() ?? "Không giới hạn"} ({request.LoaiNganSach ?? "TienThue"})
- Nhu cầu chi tiết: {string.Join(", ", request.NhuCau ?? new List<string>())}

Hãy chọn bộ đồ tối ưu từ danh sách ứng viên trên.
QUY TẮC BẮT BUỘC:
1. CHỈ được chọn các maSanPham có trong danh sách trên.
2. Tổng sức chứa của lều phải đủ cho {request.SoNguoi} người.
3. Số lượng phải là số nguyên dương hợp lý.
4. Trả về định dạng JSON array:
[
  {{ ""maSanPham"": 123, ""soLuong"": 1, ""lyDo"": ""Lý do chọn"" }}
]
";
    }

    private AiProviderResult ParseGeminiResponse(string jsonResponse)
    {
        try
        {
            using var doc = JsonDocument.Parse(jsonResponse);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(text))
                return new AiProviderResult { ThanhCong = false, Loi = "EMPTY_TEXT_RESPONSE", ProviderUsed = "Gemini" };

            var items = JsonSerializer.Deserialize<List<AiSelection>>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return new AiProviderResult { ThanhCong = true, Selections = items ?? new(), ProviderUsed = "Gemini" };
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Không thể parse JSON từ Gemini: {Message}", ex.Message);
            return new AiProviderResult { ThanhCong = false, Loi = "PARSE_JSON_ERROR", ProviderUsed = "Gemini" };
        }
    }

    private AiProviderResult ParseOpenAIResponse(string jsonResponse)
    {
        try
        {
            using var doc = JsonDocument.Parse(jsonResponse);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
                return new AiProviderResult { ThanhCong = false, Loi = "EMPTY_TEXT_RESPONSE", ProviderUsed = "OpenAI" };

            // Nếu content bọc trong object {"items": [...]}
            if (content.TrimStart().StartsWith("{"))
            {
                using var innerDoc = JsonDocument.Parse(content);
                foreach (var prop in innerDoc.RootElement.EnumerateObject())
                {
                    if (prop.Value.ValueKind == JsonValueKind.Array)
                    {
                        var items = JsonSerializer.Deserialize<List<AiSelection>>(prop.Value.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        return new AiProviderResult { ThanhCong = true, Selections = items ?? new(), ProviderUsed = "OpenAI" };
                    }
                }
            }

            var directList = JsonSerializer.Deserialize<List<AiSelection>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return new AiProviderResult { ThanhCong = true, Selections = directList ?? new(), ProviderUsed = "OpenAI" };
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Không thể parse JSON từ OpenAI: {Message}", ex.Message);
            return new AiProviderResult { ThanhCong = false, Loi = "PARSE_JSON_ERROR", ProviderUsed = "OpenAI" };
        }
    }
}
