using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.Kho;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Dịch vụ quản lý kho, kiểm kê và phân tích khả dụng (W5-T4 - Minh Tú)
/// </summary>
public interface IKhoService
{
    /// <summary>
    /// Thống kê tổng quan số lượng thiết bị theo trạng thái và sản phẩm hiện tại
    /// </summary>
    Task<Result<KhoTongQuanResponse>> LayTongQuanKhoAsync(LocKhoRequest request, long actorId, bool laAdmin);

    /// <summary>
    /// Tìm kiếm và lọc danh sách thiết bị kho phân trang
    /// </summary>
    Task<Result<PagedResult<ThietBiKhoItemDto>>> TimThietBiAsync(LocKhoRequest request, long actorId, bool laAdmin);

    /// <summary>
    /// Đối chiếu dữ liệu quét mã vạch kiểm kê thực tế tại kho so với kỳ vọng hệ thống
    /// </summary>
    Task<Result<DoiChieuKiemKeResponse>> LayDoiChieuKiemKeAsync(DoiChieuKiemKeRequest request, long actorId);

    /// <summary>
    /// Giả lập và phân tích ảnh hưởng cam kết đơn thuê khi loại trừ thiết bị hoặc giáng cấp
    /// </summary>
    Task<Result<PhanTichAnhHuongResponse>> PhanTichAnhHuongAsync(PhanTichAnhHuongRequest request, long actorId);
}
