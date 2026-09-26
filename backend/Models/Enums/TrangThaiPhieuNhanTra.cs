namespace GearGo.Models.Enums;

/// <summary>
/// Trạng thái của Phiếu nhận trả
/// </summary>
public enum TrangThaiPhieuNhanTra
{
    Nhap = 1,      // Đang kiểm tra thiết bị, lưu tạm
    DaChot = 2,    // Đã hoàn tất kiểm tra và chốt nhận trả đợt này
    DaHuy = 3      // Phiếu bị hủy
}
