using GearGo.Helpers;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Controller chuẩn bị đơn và phân công thiết bị (W3-T7 - Kim Xuyến)
/// </summary>
[ApiController]
[Route("api/chuan-bi-don")]
[Authorize(Policy = "StaffOrAdmin")]
public class ChuanBiDonController : BaseApiController
{
    private readonly IChuanBiDonService _chuanBiDonService;

    public ChuanBiDonController(IChuanBiDonService chuanBiDonService) => _chuanBiDonService = chuanBiDonService;

    [HttpGet("{donId:long}")]
    public async Task<IActionResult> LayTinhTrang([FromRoute] long donId, CancellationToken ct = default)
        => Ok(await _chuanBiDonService.LayTinhTrangChuanBiAsync(donId, MaTaiKhoanHienTai, ct));

    [HttpPost("{donId:long}/bat-dau")]
    public async Task<IActionResult> BatDauChuanBi([FromRoute] long donId, CancellationToken ct = default)
        => Ok(await _chuanBiDonService.BatDauChuanBiAsync(donId, MaTaiKhoanHienTai, ct));

    [HttpPost("{donId:long}/phan-cong")]
    public async Task<IActionResult> GanThietBi([FromRoute] long donId, [FromBody] GanThietBiRequest request, CancellationToken ct = default)
        => StatusCode(201, await _chuanBiDonService.GanThietBiAsync(donId, request, MaTaiKhoanHienTai, ct));

    [HttpPost("{donId:long}/phan-cong/{phanCongId:long}/huy")]
    public async Task<IActionResult> HuyPhanCong([FromRoute] long donId, [FromRoute] long phanCongId, [FromBody] HuyPhanCongRequest request, CancellationToken ct = default)
        => Ok(await _chuanBiDonService.HuyPhanCongAsync(donId, phanCongId, request, MaTaiKhoanHienTai, ct));

    [HttpPost("{donId:long}/phan-cong/{phanCongId:long}/thay-the")]
    public async Task<IActionResult> ThayTheThietBi([FromRoute] long donId, [FromRoute] long phanCongId, [FromBody] ThayTheRequest request, CancellationToken ct = default)
        => Ok(await _chuanBiDonService.ThayTheThietBiAsync(donId, phanCongId, request, MaTaiKhoanHienTai, ct));

    [HttpPost("{donId:long}/san-sang")]
    public async Task<IActionResult> XacNhanSanSang([FromRoute] long donId, [FromBody] XacNhanSanSangRequest request, CancellationToken ct = default)
        => Ok(await _chuanBiDonService.XacNhanSanSangAsync(donId, request, MaTaiKhoanHienTai, ct));

    [HttpPost("{donId:long}/bao-thieu")]
    public async Task<IActionResult> BaoThieuThietBi([FromRoute] long donId, [FromBody] BaoThieuThietBiRequest request, CancellationToken ct = default)
        => Ok(await _chuanBiDonService.BaoThieuThietBiAsync(donId, request, MaTaiKhoanHienTai, ct));
}
