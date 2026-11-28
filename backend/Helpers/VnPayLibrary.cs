using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace GearGo.Helpers;

/// <summary>
/// Tiện ích tạo URL thanh toán và xác thực chữ ký HMAC-SHA512 chuẩn VNPay API v2.1.0.
/// </summary>
public static class VnPayLibrary
{
    public const string Version = "2.1.0";

    /// <summary>
    /// Tạo URL chuyển hướng sang cổng thanh toán VNPay Sandbox.
    /// </summary>
    public static string BuildPaymentUrl(
        string baseUrl,
        string tmnCode,
        string hashSecret,
        string txnRef,
        decimal amountVnd,
        string orderInfo,
        string returnUrl,
        string ipAddr,
        string? bankCode = null,
        int expireMinutes = 15)
    {
        // VNPay yêu cầu thời gian theo múi giờ GMT+7 (UTC+7) định dạng yyyyMMddHHmmss
        var vnNow = DateTime.UtcNow.AddHours(7);
        var createDate = vnNow.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
        var expireDate = vnNow.AddMinutes(Math.Max(5, expireMinutes)).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);

        var vnpParams = new SortedList<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = Version,
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = tmnCode,
            ["vnp_Amount"] = ((long)Math.Round(amountVnd * 100m, MidpointRounding.AwayFromZero)).ToString(CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = createDate,
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(ipAddr) ? "127.0.0.1" : ipAddr,
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = SanitizeOrderInfo(orderInfo),
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_ExpireDate"] = expireDate,
            ["vnp_TxnRef"] = txnRef
        };

        if (!string.IsNullOrWhiteSpace(bankCode))
            vnpParams["vnp_BankCode"] = bankCode.Trim();

        var queryBuilder = new StringBuilder();
        foreach (var kv in vnpParams)
        {
            if (string.IsNullOrEmpty(kv.Value)) continue;
            if (queryBuilder.Length > 0) queryBuilder.Append('&');
            queryBuilder.Append(WebUtility.UrlEncode(kv.Key));
            queryBuilder.Append('=');
            queryBuilder.Append(WebUtility.UrlEncode(kv.Value));
        }

        var rawData = queryBuilder.ToString();
        var secureHash = ComputeHmacSha512(hashSecret, rawData);
        return $"{baseUrl}?{rawData}&vnp_SecureHash={secureHash}";
    }

    /// <summary>
    /// Xác thực chữ ký vnp_SecureHash từ VNPay trả về qua Return URL hoặc IPN URL.
    /// </summary>
    public static bool ValidateSignature(IQueryCollection query, string hashSecret)
    {
        var receivedHash = query["vnp_SecureHash"].ToString();
        if (string.IsNullOrWhiteSpace(receivedHash)) return false;

        var vnpParams = new SortedList<string, string>(StringComparer.Ordinal);
        foreach (var kv in query)
        {
            if (string.IsNullOrEmpty(kv.Key) || !kv.Key.StartsWith("vnp_", StringComparison.Ordinal)) continue;
            if (kv.Key.Equals("vnp_SecureHash", StringComparison.OrdinalIgnoreCase) ||
                kv.Key.Equals("vnp_SecureHashType", StringComparison.OrdinalIgnoreCase)) continue;
            var val = kv.Value.ToString();
            if (!string.IsNullOrEmpty(val))
                vnpParams[kv.Key] = val;
        }

        var signBuilder = new StringBuilder();
        foreach (var kv in vnpParams)
        {
            if (signBuilder.Length > 0) signBuilder.Append('&');
            signBuilder.Append(WebUtility.UrlEncode(kv.Key));
            signBuilder.Append('=');
            signBuilder.Append(WebUtility.UrlEncode(kv.Value));
        }

        var computed = ComputeHmacSha512(hashSecret, signBuilder.ToString());
        return string.Equals(computed, receivedHash, StringComparison.OrdinalIgnoreCase);
    }

    public static string ComputeHmacSha512(string key, string inputData)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var inputBytes = Encoding.UTF8.GetBytes(inputData);
        using var hmac = new HMACSHA512(keyBytes);
        var hashBytes = hmac.ComputeHash(inputBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    /// <summary>
    /// Loại bỏ dấu tiếng Việt & ký tự đặc biệt theo quy định vnp_OrderInfo của VNPay.
    /// </summary>
    public static string SanitizeOrderInfo(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "Thanh toan don hang GearGo";
        var normalized = raw.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat == UnicodeCategory.NonSpacingMark) continue;
            var ch = c switch { 'đ' => 'd', 'Đ' => 'D', _ => c };
            if (char.IsLetterOrDigit(ch) || ch == ' ' || ch == '-' || ch == ':')
                sb.Append(ch);
        }
        var cleaned = sb.ToString().Trim();
        return string.IsNullOrEmpty(cleaned) ? "Thanh toan don hang GearGo" : cleaned;
    }

    public static string GetResponseMessage(string code) => code switch
    {
        "00" => "Giao dịch thành công",
        "07" => "Trừ tiền thành công nhưng giao dịch bị nghi ngờ bất thường",
        "09" => "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking",
        "10" => "Xác thực thông tin thẻ/tài khoản sai quá 3 lần",
        "11" => "Đã hết hạn chờ thanh toán",
        "12" => "Thẻ/Tài khoản bị khóa",
        "13" => "Nhập sai mật khẩu xác thực OTP",
        "24" => "Khách hàng hủy giao dịch",
        "51" => "Tài khoản không đủ số dư để thực hiện giao dịch",
        "65" => "Tài khoản vượt quá hạn mức giao dịch trong ngày",
        "75" => "Ngân hàng thanh toán đang bảo trì",
        "79" => "Nhập sai mật khẩu thanh toán quá số lần quy định",
        _ => $"Giao dịch không thành công (Mã lỗi: {code})"
    };
}
