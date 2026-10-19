namespace GearGo.Helpers;

/// <summary>
/// Lớp chuyển tiếp tương thích ngược ủy quyền sang CalculationHelpers
/// </summary>
public static class KietCalculationHelpers
{
    public static int TinhSoNgayThue(DateTime gioNhan, DateTime gioTra)
        => CalculationHelpers.TinhSoNgayThue(gioNhan, gioTra);

    public static (int Trang, int SoMoiTrang) ChuanHoaPhanTrang(int trang, int soMoiTrang)
        => CalculationHelpers.ChuanHoaPhanTrang(trang, soMoiTrang);

    public static double TinhPhanTram(int phanTu, int tongSo)
        => CalculationHelpers.TinhPhanTram(phanTu, tongSo);
}
