using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GearGo.Integrations.Notifications;

/// <summary>
/// Adapter gửi thông báo Email thực tế theo chuỗi ưu tiên: SendGrid REST API v3 → SMTP → LocalDev in-memory.
/// Hỗ trợ bọc template HTML chuẩn GearGo và ghi log bounce khi thất bại (W7-MAIL-01..03).
/// </summary>
public class EmailNotificationAdapter : IEmailNotificationAdapter
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailNotificationAdapter> _logger;
    private readonly IHttpClientFactory? _httpClientFactory;

    // Bộ nhớ lưu tạm các email đã gửi phục vụ kiểm thử và giám sát
    public ConcurrentBag<(string Email, string TieuDe, string NoiDung, string? EventKey, DateTime ThoiGianGui)> DaGui { get; } = new();

    public EmailNotificationAdapter(
        IConfiguration config,
        ILogger<EmailNotificationAdapter> logger,
        IHttpClientFactory? httpClientFactory = null)
    {
        _config = config;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<KetQuaGuiThongBao> GuiEmailAsync(
        string emailNguoiNhan,
        string tieuDe,
        string noiDung,
        string? eventKey = null,
        CancellationToken ct = default)
    {
        var htmlBody = EmailTemplateRenderer.Render(tieuDe, noiDung, eventKey);
        DaGui.Add((emailNguoiNhan, tieuDe, htmlBody, eventKey, DateTime.UtcNow));

        // 1. Ưu tiên SendGrid REST API v3 nếu cấu hình SendGrid:ApiKey
        var sendGridKey = _config["SendGrid:ApiKey"];
        if (!string.IsNullOrWhiteSpace(sendGridKey))
        {
            var sgFrom = _config["SendGrid:FromEmail"] ?? _config["EmailSettings:SenderEmail"] ?? "no-reply@geargo.vn";
            var sgName = _config["SendGrid:FromName"] ?? _config["EmailSettings:SenderName"] ?? "GearGo Outdoor Equipment";
            return await GuiQuaSendGridAsync(sendGridKey, sgFrom, sgName, emailNguoiNhan, tieuDe, htmlBody, ct);
        }

        // 2. Nếu có cấu hình máy chủ SMTP thật -> Gửi email thật qua giao thức SMTP
        var smtpServer = _config["EmailSettings:SmtpServer"];
        var portStr = _config["EmailSettings:Port"];
        var senderEmail = _config["EmailSettings:SenderEmail"] ?? "no-reply@geargo.vn";
        var senderPassword = _config["EmailSettings:SenderPassword"];
        var enableSsl = _config.GetValue<bool>("EmailSettings:EnableSsl", true);
        var senderName = _config["EmailSettings:SenderName"] ?? "GearGo Outdoor Equipment";
        var port = int.TryParse(portStr, out var p) ? p : 587;

        if (!string.IsNullOrWhiteSpace(smtpServer))
        {
            try
            {
                using var client = new SmtpClient(smtpServer, port)
                {
                    EnableSsl = enableSsl,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    UseDefaultCredentials = false,
                    Credentials = !string.IsNullOrWhiteSpace(senderPassword)
                        ? new NetworkCredential(senderEmail, senderPassword)
                        : CredentialCache.DefaultNetworkCredentials
                };

                using var mail = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = tieuDe,
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                mail.To.Add(emailNguoiNhan);

                await client.SendMailAsync(mail, ct);
                _logger.LogInformation("[EmailAdapter] Đã gửi email thành công qua SMTP đến {Email} | Tiêu đề: {TieuDe}", emailNguoiNhan, tieuDe);
                return new KetQuaGuiThongBao(true, "ThanhCong", $"SMTP-{Guid.NewGuid():N}", null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[EmailAdapter] Lỗi khi gửi email SMTP đến {Email}: {Message}", emailNguoiNhan, ex.Message);
                return new KetQuaGuiThongBao(false, "ThatBai", null, ex.Message);
            }
        }

        // 3. Chế độ phát triển nội bộ / kiểm thử: Ghi log chi tiết nội dung email
        _logger.LogInformation(
            "[EmailAdapter - LocalDev] Đã gửi thông báo đến {Email} | Tiêu đề: {TieuDe} | EventKey: {EventKey}",
            emailNguoiNhan, tieuDe, eventKey);

        return new KetQuaGuiThongBao(true, "ThanhCong", $"DEV-{Guid.NewGuid():N}", null);
    }

    private async Task<KetQuaGuiThongBao> GuiQuaSendGridAsync(
        string apiKey, string fromEmail, string fromName, string toEmail, string subject, string htmlBody, CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory?.CreateClient() ?? new HttpClient();
            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.sendgrid.com/v3/mail/send");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var payload = new
            {
                personalizations = new[] { new { to = new[] { new { email = toEmail } }, subject } },
                from = new { email = fromEmail, name = fromName },
                content = new[] { new { type = "text/html", value = htmlBody } }
            };
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var resp = await client.SendAsync(req, ct);
            if (resp.IsSuccessStatusCode)
            {
                var msgId = resp.Headers.TryGetValues("X-Message-Id", out var vals) ? vals.FirstOrDefault() : $"SG-{Guid.NewGuid():N}";
                _logger.LogInformation("[SendGrid] Gửi email thành công đến {Email} | MessageId: {MsgId}", toEmail, msgId);
                return new KetQuaGuiThongBao(true, "ThanhCong", msgId, null);
            }

            var errBody = await resp.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("[SendGrid Bounce/Error] HTTP {Status} khi gửi đến {Email}: {Body}", (int)resp.StatusCode, toEmail, errBody);
            return new KetQuaGuiThongBao(false, "ThatBai", null, $"SendGrid HTTP {(int)resp.StatusCode}: {errBody}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SendGrid] Lỗi ngoại lệ khi gửi email đến {Email}", toEmail);
            return new KetQuaGuiThongBao(false, "ThatBai", null, ex.Message);
        }
    }
}
