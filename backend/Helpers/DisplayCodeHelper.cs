namespace GearGo.Helpers;

public static class DisplayCodeHelper
{
    public static string SinhMaPhieuNhanTra(long maDonThue, int lanTra)
        => $"PNT-DT{maDonThue:D4}-{lanTra:D2}";

    public static string SinhMaPhieuBanGiao(long maDonThue)
        => $"PBG-DT{maDonThue:D4}";

    public static string SinhMaPhieuBaoTri(long maThietBi, DateTime thoiDiem)
        => $"PBT-TB{maThietBi:D4}-{thoiDiem:yyyyMMddHHmm}";

    public static string SinhMaYeuCauThanhToan(DateTime thoiDiem)
        => $"PAY_{thoiDiem:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";

    public static string SinhMaDonHienThi(DateTime thoiDiem)
        => $"DH{thoiDiem:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
}
