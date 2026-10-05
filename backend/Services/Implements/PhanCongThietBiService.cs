using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai IPhanCongThietBiService theo danh mục bàn giao mục 10.A (W3-T7 - Kim Xuyến)
/// </summary>
public class PhanCongThietBiService : IPhanCongThietBiService
{
    private readonly IChuanBiDonService _chuanBiDonService;

    public PhanCongThietBiService(IChuanBiDonService chuanBiDonService)
    {
        _chuanBiDonService = chuanBiDonService;
    }

    public Task<Result<ChuanBiResponse>> GanThietBiAsync(
        long donId, GanThietBiRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        return _chuanBiDonService.GanThietBiAsync(donId, request, maTaiKhoan, ct);
    }

    public Task<Result<ChuanBiResponse>> HuyPhanCongAsync(
        long donId, long phanCongId, HuyPhanCongRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        return _chuanBiDonService.HuyPhanCongAsync(donId, phanCongId, request, maTaiKhoan, ct);
    }

    public Task<Result<ChuanBiResponse>> ThayTheThietBiAsync(
        long donId, long phanCongId, ThayTheRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        return _chuanBiDonService.ThayTheThietBiAsync(donId, phanCongId, request, maTaiKhoan, ct);
    }
}
