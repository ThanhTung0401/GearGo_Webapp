using System.Globalization;

namespace GearGo.Helpers;

public static class CalculationHelpers
{
    /// <summary>
    /// Tính số ngày thuê từ giờ nhận đến giờ trả theo quy tắc làm tròn lên 24h (tối thiểu 1 ngày)
    /// </summary>
    public static int TinhSoNgayThue(DateTime gioNhan, DateTime gioTra)
    {
        double totalHours = (gioTra - gioNhan).TotalHours;
        return Math.Max(1, (int)Math.Ceiling(totalHours / DomainConstants.Policies.HoursPerDay));
    }

    /// <summary>
    /// Chuẩn hóa tham số phân trang an toàn:
    /// - Trang tối thiểu là 1.
    /// - Khi dungMacDinhKhiKhongDuong = true: soMoiTrang &lt;= 0 dùng DefaultPageSize (20), sau đó chặn trong [1, MaxPageSize].
    /// - Khi dungMacDinhKhiKhongDuong = false: giữ hành vi Clamp(soMoiTrang, 1, MaxPageSize).
    /// </summary>
    public static (int Trang, int SoMoiTrang) ChuanHoaPhanTrang(
        int trang,
        int soMoiTrang,
        bool dungMacDinhKhiKhongDuong = true)
    {
        int validTrang = Math.Max(1, trang);
        int rawPageSize = (dungMacDinhKhiKhongDuong && soMoiTrang <= 0)
            ? DomainConstants.Policies.DefaultPageSize
            : soMoiTrang;
        int validSoMoiTrang = Math.Clamp(rawPageSize, 1, DomainConstants.Policies.MaxPageSize);
        return (validTrang, validSoMoiTrang);
    }

    /// <summary>
    /// Tính tỷ lệ % an toàn tránh chia cho 0
    /// </summary>
    public static double TinhPhanTram(int phanTu, int tongSo)
    {
        if (tongSo <= 0) return 0.0;
        return Math.Round(
            (double)phanTu / tongSo * DomainConstants.Policies.PercentageMultiplier,
            DomainConstants.Policies.DecimalRoundingDigits);
    }

    /// <summary>
    /// Quy tắc làm tròn tiền VND dùng chung khi tạo khoản thu/hoàn/phụ phí:
    /// làm tròn đến đơn vị đồng (0 chữ số thập phân), nửa đồng làm tròn lên (AwayFromZero).
    /// </summary>
    public static decimal LamTronVnd(decimal soTien)
        => Math.Round(soTien, 0, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Định dạng tiền VND kiểu "1.000.000đ" bằng InvariantCulture để không phụ thuộc culture của server.
    /// </summary>
    public static string HienThiVnd(decimal soTien)
        => LamTronVnd(soTien)
            .ToString("#,0", CultureInfo.InvariantCulture)
            .Replace(',', '.') + "đ";
}
