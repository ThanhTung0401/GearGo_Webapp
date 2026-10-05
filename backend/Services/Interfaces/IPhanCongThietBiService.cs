using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChuanBiDon;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Service phân công thiết bị cho đơn thuê (W3-T7 - Kim Xuyến)
/// </summary>
public interface IPhanCongThietBiService
{
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
}
