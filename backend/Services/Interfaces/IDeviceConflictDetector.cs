namespace GearGo.Services.Interfaces;

public interface IDeviceConflictDetector
{
    /// <summary>
    /// Kiểm tra xem thiết bị (khi có kết luận hỏng hoặc mất) có bị xung đột với các đơn thuê tương lai đã phân công không
    /// </summary>
    Task<List<string>> KiemTraXungDotDonTuongLaiAsync(
        long maThietBi,
        string maThietBiHienThi,
        string ketLuan,
        long maDonHienTai);
}
