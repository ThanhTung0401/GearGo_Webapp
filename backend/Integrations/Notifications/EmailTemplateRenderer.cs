using System.Text;

namespace GearGo.Integrations.Notifications;

/// <summary>
/// Render 4 mẫu HTML Email chuẩn thương hiệu GearGo (Welcome, Xác nhận đơn, Nhắc quá hạn, Hoàn tiền)
/// theo Plan_Week7_HoanThien mục 1.1 & 4.4.
/// </summary>
public static class EmailTemplateRenderer
{
    public static string Render(string tieuDe, string noiDung, string? eventKey)
    {
        // Nếu nội dung đã là HTML đầy đủ thì giữ nguyên
        if (!string.IsNullOrWhiteSpace(noiDung) &&
            (noiDung.Contains("<div", StringComparison.OrdinalIgnoreCase) ||
             noiDung.Contains("<html", StringComparison.OrdinalIgnoreCase)))
        {
            return noiDung;
        }

        var (badgeText, accentColor, footerHint) = (eventKey ?? "").ToUpperInvariant() switch
        {
            var k when k.Contains("WELCOME") => ("Chào mừng thành viên mới", "#2D6A4F", "Cảm ơn bạn đã đồng hành cùng GearGo cho những chuyến dã ngoại sắp tới."),
            var k when k.Contains("XAC_NHAN") || k.Contains("PAYMENT") => ("Xác nhận đơn thuê", "#1B4332", "Vui lòng mang theo giấy tờ tùy thân khi đến nhận thiết bị đúng giờ."),
            var k when k.Contains("QUA_HAN") || k.Contains("OVERDUE") => ("Nhắc nhở trả thiết bị", "#C85A17", "Vui lòng liên hệ hotline 0901 234 567 nếu bạn cần gia hạn thời gian thuê."),
            var k when k.Contains("HOAN_TIEN") || k.Contains("REFUND") => ("Thông báo hoàn tiền / cọc", "#0F766E", "Khoản hoàn tiền sẽ hiển thị trên sao kê ngân hàng trong 1–3 ngày làm việc."),
            _ => ("Thông báo từ GearGo", "#2D6A4F", "Đây là email tự động từ hệ thống GearGo Outdoor Equipment.")
        };

        var safeTitle = System.Net.WebUtility.HtmlEncode(tieuDe);
        var safeBody = System.Net.WebUtility.HtmlEncode(noiDung).Replace("\n", "<br/>");

        var sb = new StringBuilder();
        sb.Append("<div style=\"font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#FAF8F3;border:1px solid #E5E0D5;border-radius:12px;overflow:hidden;\">");
        sb.Append($"<div style=\"background:{accentColor};color:#FFFFFF;padding:20px 24px;\">");
        sb.Append($"<div style=\"font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;\">{badgeText}</div>");
        sb.Append($"<h2 style=\"margin:6px 0 0;font-size:20px;font-weight:700;\">{safeTitle}</h2>");
        sb.Append("</div>");
        sb.Append("<div style=\"padding:24px;background:#FFFFFF;color:#1F2937;font-size:15px;line-height:1.6;\">");
        sb.Append($"<p style=\"margin-top:0;\">{safeBody}</p>");
        sb.Append("</div>");
        sb.Append("<div style=\"padding:16px 24px;background:#F4F6F0;color:#4B5563;font-size:12px;border-top:1px solid #E5E0D5;\">");
        sb.Append($"<p style=\"margin:0 0 6px;\">{footerHint}</p>");
        sb.Append("<p style=\"margin:0;color:#6B7280;\">GearGo Outdoor Rental &amp; Gear • 128 Nguyễn Đình Chiểu, Q.3, TP.HCM • Hotline: 0901 234 567</p>");
        sb.Append("</div></div>");
        return sb.ToString();
    }
}
