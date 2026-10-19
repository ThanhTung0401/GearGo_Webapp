namespace GearGo.Helpers;

public static class KietCalculationHelpers
{
    /// <summary>
    /// Tính số ngày thuê từ giờ nhận đến giờ trả theo quy tắc làm tròn lên 24h (tối thiểu 1 ngày)
    /// </summary>
    public static int TinhSoNgayThue(DateTime gioNhan, DateTime gioTra)
    {
        double totalHours = (gioTra - gioNhan).TotalHours;
        return Math.Max(1, (int)Math.Ceiling(totalHours / KietDomainConstants.PolicyConfig.SoGioMotNgay));
    }

    /// <summary>
    /// Chuẩn hóa tham số phân trang an toàn
    /// </summary>
    public static (int Trang, int SoMoiTrang) ChuanHoaPhanTrang(int trang, int soMoiTrang)
    {
        int validTrang = Math.Max(1, trang);
        int rawPageSize = soMoiTrang <= 0 ? KietDomainConstants.PolicyConfig.SoPhanTrangMacDinh : soMoiTrang;
        int validSoMoiTrang = Math.Clamp(rawPageSize, 1, KietDomainConstants.PolicyConfig.SoPhanTrangToiDa);
        return (validTrang, validSoMoiTrang);
    }

    /// <summary>
    /// Tính tỷ lệ % an toàn tránh chia cho 0
    /// </summary>
    public static double TinhPhanTram(int phanTu, int tongSo)
    {
        if (tongSo <= 0) return 0.0;
        return Math.Round(
            (double)phanTu / tongSo * KietDomainConstants.PolicyConfig.TyLePhanTramNhan,
            KietDomainConstants.PolicyConfig.SoChuSoThapPhanLamTron);
    }
}
