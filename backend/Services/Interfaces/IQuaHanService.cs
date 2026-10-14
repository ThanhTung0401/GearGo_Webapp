using GearGo.Models.Common;
using GearGo.Models.DTOs.QuaHan;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Giao diện dịch vụ xử lý đơn quá hạn và khả dụng sau nhận trả (W4-T2 - Minh Tú)
/// </summary>
public interface IQuaHanService
{
    /// <summary>
    /// Lấy danh sách các đơn thuê quá hạn có phân trang và bộ lọc
    /// </summary>
    Task<Result<PagedResult<DonQuaHanResponse>>> LayDonQuaHanAsync(LocQuaHanRequest filter, long actorId);

    /// <summary>
    /// Lấy chi tiết quá hạn và phí trễ dự kiến từng thiết bị của đơn thuê
    /// </summary>
    Task<Result<QuaHanChiTietResponse>> LayChiTietQuaHanAsync(long donId, long actorId);

    /// <summary>
    /// Helper dùng chung tính phí trễ dự kiến cho từng thiết bị bàn giao tại một mốc thời gian
    /// </summary>
    Task<Result<TinhPhiTreDuKienResponse>> TinhPhiTreDuKienAsync(long maChiTietBanGiao, DateTime mocTinh);

    /// <summary>
    /// Lấy danh sách các đơn thuê tương lai bị ảnh hưởng do thiết bị quá hạn chưa về
    /// </summary>
    Task<Result<List<DonBiAnhHuongResponse>>> LayDonBiAnhHuongAsync(long donId, long actorId);

    /// <summary>
    /// Quét các đơn quá hạn và gửi thông báo nhắc nhở (Idempotent theo mốc)
    /// </summary>
    Task<Result<KetQuaQuetNhacResponse>> QuetVaTaoNhacQuaHanAsync(DateTime? mocQuet);
}
