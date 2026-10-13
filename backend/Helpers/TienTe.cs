namespace GearGo.Helpers;

/// <summary>Quy tắc làm tròn tiền dùng chung khi tạo khoản thu/hoàn/phụ phí: đến đồng VND, nửa đồng làm tròn lên.</summary>
public static class TienTe
{
    public static decimal LamTronVnd(decimal soTien) => Math.Round(soTien, 0, MidpointRounding.AwayFromZero);

    /// <summary>"1.000.000đ" — không phụ thuộc culture của server.</summary>
    public static string HienThi(decimal soTien)
        => LamTronVnd(soTien).ToString("#,0", System.Globalization.CultureInfo.InvariantCulture).Replace(',', '.') + "đ";
}
