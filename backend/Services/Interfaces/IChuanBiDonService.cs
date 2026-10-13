using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChuanBiDon;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Service chuẩn bị đơn và phân công thiết bị (W3-T7 - Kim Xuyến)
/// </summary>
public interface IChuanBiDonService
{
    /// <summary>
    /// Lấy tình trạng chuẩn bị hiện tại của đơn (từng dòng: cần/đã gán/còn thiếu)
    /// </summary>
    Task<Result<ChuanBiResponse>> LayTinhTrangChuanBiAsync(long donId, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Bắt đầu chuẩn bị: chuyển đơn từ DaXacNhan → DangChuanBi
    /// </summary>
    Task<Result<ChuanBiResponse>> BatDauChuanBiAsync(long donId, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Gán một hoặc nhiều thiết bị vào dòng đơn thuê
    /// </summary>
    Task<Result<ChuanBiResponse>> GanThietBiAsync(long donId, GanThietBiRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Hủy một phân công thiết bị (giữ lịch sử, không xóa)
    /// </summary>
    Task<Result<ChuanBiResponse>> HuyPhanCongAsync(long donId, long phanCongId, HuyPhanCongRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Thay thế thiết bị đã gán bằng thiết bị khác trong một transaction
    /// </summary>
    Task<Result<ChuanBiResponse>> ThayTheThietBiAsync(long donId, long phanCongId, ThayTheRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Kiểm tra điều kiện và xác nhận đơn sẵn sàng nhận (DangChuanBi → SanSangNhan)
    /// </summary>
    Task<Result<ChuanBiResponse>> XacNhanSanSangAsync(long donId, XacNhanSanSangRequest request, long maTaiKhoan, CancellationToken ct = default);
}
