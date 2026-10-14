using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DoiSoat;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Dịch vụ đối soát cọc, hoàn tất đơn thuê và điều chỉnh đối soát (UC15 - Kim Xuyến)
/// </summary>
public interface IDoiSoatService
{
    /// <summary>
    /// Xem trước bảng tính đối soát và kiểm tra các điều kiện tiên quyết (không ghi dữ liệu)
    /// </summary>
    Task<Result<XemTruocDoiSoatResponse>> XemTruocAsync(long donId, long actorId);

    /// <summary>
    /// Lập phiếu đối soát ban đầu (trạng thái ChoChot) dưới khóa bảo vệ đơn
    /// </summary>
    Task<Result<DoiSoatResponse>> LapDoiSoatAsync(LapDoiSoatRequest dto, long actorId);

    /// <summary>
    /// Xác nhận bảng tính đối soát: cố định số tiền, khóa phụ phí và liên kết giao dịch cọc
    /// </summary>
    Task<Result<DoiSoatResponse>> XacNhanBangTinhAsync(long id, XacNhanDoiSoatRequest dto, long actorId);

    /// <summary>
    /// Phát lệnh xử lý tiền: tạo yêu cầu hoàn cọc (nếu C > P) hoặc gọi thanh toán thu thêm (nếu P > C)
    /// </summary>
    Task<Result<DoiSoatResponse>> YeuCauXuLyTienAsync(long id, long actorId);

    /// <summary>
    /// Chốt đối soát sau khi toàn bộ tiền đã xử lý thành công, chuyển trạng thái đơn sang HoanTat
    /// </summary>
    Task<Result<DoiSoatResponse>> ChotDoiSoatAsync(long id, long actorId);

    /// <summary>
    /// Lập phiếu đối soát điều chỉnh sau khi đơn đã chốt hoàn tất (tham chiếu đối soát gốc)
    /// </summary>
    Task<Result<DoiSoatResponse>> LapDoiSoatDieuChinhAsync(long doiSoatGocId, DieuChinhDoiSoatRequest dto, long actorId);

    /// <summary>
    /// Lấy thông tin đối soát theo mã đơn thuê
    /// </summary>
    Task<Result<DoiSoatResponse>> LayTheoDonAsync(long donId, long actorId);

    /// <summary>
    /// Lấy thông tin đối soát theo mã đối soát
    /// </summary>
    Task<Result<DoiSoatResponse>> LayTheoIdAsync(long id, long actorId);
}
