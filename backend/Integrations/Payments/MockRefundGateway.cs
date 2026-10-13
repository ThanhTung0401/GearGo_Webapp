using System.Collections.Concurrent;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace GearGo.Integrations.Payments;

public class MockRefundGatewayOptions
{
    public const string Section = "Payments:MockRefund";

    /// <summary>Khóa ký callback. Chỉ dùng môi trường phát triển.</summary>
    public string SecretKey { get; set; } = "GearGoMockRefundSecret_DevOnly_ChangeMe!";

    /// <summary>Kết quả khi gửi yêu cầu mới: ThanhCong | ThatBai | DaTiepNhan | Timeout.</summary>
    public string KetQuaMacDinh { get; set; } = "ThanhCong";
}

/// <summary>
/// Gateway hoàn tiền giả lập cho môi trường phát triển (đăng ký Singleton).
/// - Idempotent theo mã yêu cầu: gửi lại cùng mã trả kết quả đã có, không tạo khoản thứ hai.
/// - "Timeout" mô phỏng gateway đã hoàn nhưng server mất phản hồi: lưu ThanhCong rồi ném lỗi chưa rõ.
/// - Trạng thái chỉ nằm trong RAM: khởi động lại thì tra cứu trả KhongTimThay → service đưa về ChoXuLy
///   và gửi lại CÙNG mã (an toàn vì gateway thật dedupe theo mã). Không phải cổng thanh toán thật.
/// </summary>
public class MockRefundGateway : IRefundGateway
{
    private readonly ConcurrentDictionary<string, PhanHoiHoanGateway> _daNhan = new();
    private readonly MockRefundGatewayOptions _options;

    public MockRefundGateway(MockRefundGatewayOptions options) => _options = options;

    public Task<PhanHoiHoanGateway> GuiYeuCauHoanAsync(YeuCauHoanGateway yeuCau, CancellationToken ct = default)
    {
        if (_daNhan.TryGetValue(yeuCau.MaYeuCau, out var cu))
            return Task.FromResult(cu);

        var maGd = $"MOCKRF-{Guid.NewGuid():N}"[..20];
        var now = DateTime.UtcNow;
        switch (_options.KetQuaMacDinh)
        {
            case "ThatBai":
                return Task.FromResult(_daNhan.GetOrAdd(yeuCau.MaYeuCau,
                    new PhanHoiHoanGateway(KetQuaHoanGateway.ThatBai, null, yeuCau.SoTien, now, "Mock: từ chối hoàn")));
            case "DaTiepNhan":
                return Task.FromResult(_daNhan.GetOrAdd(yeuCau.MaYeuCau,
                    new PhanHoiHoanGateway(KetQuaHoanGateway.DaTiepNhan, maGd, yeuCau.SoTien, null, "Mock: đang xử lý")));
            case "Timeout":
                _daNhan.TryAdd(yeuCau.MaYeuCau,
                    new PhanHoiHoanGateway(KetQuaHoanGateway.ThanhCong, maGd, yeuCau.SoTien, now, "Mock: đã hoàn"));
                throw new RefundGatewayKhongRoKetQuaException("Mock: hết thời gian chờ phản hồi gateway.");
            default:
                return Task.FromResult(_daNhan.GetOrAdd(yeuCau.MaYeuCau,
                    new PhanHoiHoanGateway(KetQuaHoanGateway.ThanhCong, maGd, yeuCau.SoTien, now, "Mock: đã hoàn")));
        }
    }

    public Task<PhanHoiHoanGateway> TraCuuAsync(string maYeuCau, CancellationToken ct = default)
        => Task.FromResult(_daNhan.TryGetValue(maYeuCau, out var kq)
            ? kq
            : new PhanHoiHoanGateway(KetQuaHoanGateway.KhongTimThay, null, null, null, "Mock: không có yêu cầu"));

    public bool XacMinhChuKy(string maYeuCau, string? maGiaoDichHoanCong, decimal soTien, string trangThai, string? chuKy)
    {
        if (string.IsNullOrWhiteSpace(chuKy)) return false;
        var mongDoi = KyChuKy(_options.SecretKey, maYeuCau, maGiaoDichHoanCong, soTien, trangThai);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(mongDoi), Encoding.ASCII.GetBytes(chuKy.Trim().ToLowerInvariant()));
    }

    /// <summary>HMAC-SHA256 (hex thường) trên "maYeuCau|maGiaoDich|soTien(VND nguyên)|trangThai".</summary>
    public static string KyChuKy(string secret, string maYeuCau, string? maGiaoDichHoanCong, decimal soTien, string trangThai)
    {
        var duLieu = $"{maYeuCau}|{maGiaoDichHoanCong}|{soTien.ToString("0", CultureInfo.InvariantCulture)}|{trangThai}";
        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(duLieu));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
