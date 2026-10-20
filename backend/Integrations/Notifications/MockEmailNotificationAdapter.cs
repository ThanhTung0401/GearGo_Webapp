using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace GearGo.Integrations.Notifications;

/// <summary>
/// Mock Email Adapter cho môi trường development và automated test (ghi nhận danh sách đã gửi)
/// </summary>
public class MockEmailNotificationAdapter : IEmailNotificationAdapter
{
    private readonly ILogger<MockEmailNotificationAdapter> _logger;

    public ConcurrentBag<(string Email, string TieuDe, string NoiDung, string? EventKey)> DaGui { get; } = new();

    /// <summary>
    /// Cho phép kịch bản test giả lập lỗi mạng
    /// </summary>
    public bool GiaLapLoi { get; set; } = false;

    public MockEmailNotificationAdapter(ILogger<MockEmailNotificationAdapter> logger)
    {
        _logger = logger;
    }

    public Task<KetQuaGuiThongBao> GuiEmailAsync(string emailNguoiNhan, string tieuDe, string noiDung, string? eventKey = null, CancellationToken ct = default)
    {
        if (GiaLapLoi)
        {
            _logger.LogWarning("[MockEmail] Giả lập lỗi gửi email đến {Email} với tiêu đề '{TieuDe}'", emailNguoiNhan, tieuDe);
            return Task.FromResult(new KetQuaGuiThongBao(false, "ThatBai", null, "Không thể kết nối đến máy chủ SMTP (Mock error)"));
        }

        _logger.LogInformation("[MockEmail] Đã gửi email thành công đến {Email} | Tiêu đề: {TieuDe} | EventKey: {EventKey}", emailNguoiNhan, tieuDe, eventKey);
        DaGui.Add((emailNguoiNhan, tieuDe, noiDung, eventKey));

        return Task.FromResult(new KetQuaGuiThongBao(true, "ThanhCong", $"MSG-{System.Guid.NewGuid():N}", null));
    }
}
