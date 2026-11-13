using System.Collections.Concurrent;
using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GearGo.Integrations.Notifications;

/// <summary>
/// Adapter gửi thông báo Email thực tế qua SMTP (UC04 / UC15).
/// Tự động chuyển đổi giữa SMTP server thật (khi cấu hình) và chế độ ghi log/in-memory (môi trường dev/test).
/// </summary>
public class EmailNotificationAdapter : IEmailNotificationAdapter
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailNotificationAdapter> _logger;

    // Bộ nhớ lưu tạm các email đã gửi phục vụ kiểm thử và giám sát
    public ConcurrentBag<(string Email, string TieuDe, string NoiDung, string? EventKey, DateTime ThoiGianGui)> DaGui { get; } = new();

    public EmailNotificationAdapter(IConfiguration config, ILogger<EmailNotificationAdapter> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<KetQuaGuiThongBao> GuiEmailAsync(
        string emailNguoiNhan,
        string tieuDe,
        string noiDung,
        string? eventKey = null,
        CancellationToken ct = default)
    {
        var smtpServer = _config["EmailSettings:SmtpServer"];
        var portStr = _config["EmailSettings:Port"];
        var senderEmail = _config["EmailSettings:SenderEmail"] ?? "no-reply@geargo.vn";
        var senderPassword = _config["EmailSettings:SenderPassword"];
        var enableSsl = _config.GetValue<bool>("EmailSettings:EnableSsl", true);
        var senderName = _config["EmailSettings:SenderName"] ?? "GearGo Outdoor Equipment";

        var port = int.TryParse(portStr, out var p) ? p : 587;

        // Ghi nhận vào danh bạ gửi in-memory
        DaGui.Add((emailNguoiNhan, tieuDe, noiDung, eventKey, DateTime.UtcNow));

        // Nếu có cấu hình máy chủ SMTP thật -> Gửi email thật qua giao thức SMTP
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
                    Body = noiDung,
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

        // Chế độ phát triển nội bộ / kiểm thử: Ghi log chi tiết nội dung email & OTP
        _logger.LogInformation(
            "[EmailAdapter - LocalDev] Đã gửi thông báo đến {Email} | Tiêu đề: {TieuDe} | EventKey: {EventKey} | Nội dung: {NoiDung}",
            emailNguoiNhan, tieuDe, eventKey, noiDung);

        return new KetQuaGuiThongBao(true, "ThanhCong", $"DEV-{Guid.NewGuid():N}", null);
    }
}
