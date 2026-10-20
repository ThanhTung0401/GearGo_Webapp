using System.Threading;
using System.Threading.Tasks;

namespace GearGo.Integrations.Notifications;

public record KetQuaGuiThongBao(
    bool ThanhCong,
    string TrangThai, // "ThanhCong", "ThatBai", "ChuaRoKetQua"
    string? MaPhanHoi = null,
    string? ThongDiepLoi = null
);

/// <summary>
/// Adapter gửi thông báo qua Email (tuân thủ Transactional Outbox, không giữ DB lock)
/// </summary>
public interface IEmailNotificationAdapter
{
    Task<KetQuaGuiThongBao> GuiEmailAsync(string emailNguoiNhan, string tieuDe, string noiDung, string? eventKey = null, CancellationToken ct = default);
}
