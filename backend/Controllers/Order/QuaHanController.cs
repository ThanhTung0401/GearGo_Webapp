using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Order;

[ApiController]
[Route("api/qua-han")]
[Authorize]
public class QuaHanController : BaseApiController
{
    private readonly IQuaHanService _quaHanService;

    public QuaHanController(IQuaHanService quaHanService) => _quaHanService = quaHanService;

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.QuaHan_Xem)]
    public async Task<IActionResult> LayDonQuaHan([FromQuery] LocQuaHanRequest filter)
        => HandleResult(await _quaHanService.LayDonQuaHanAsync(filter, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("{donId:long}")]
    [RequirePermission(DomainConstants.Permissions.QuaHan_Xem)]
    public async Task<IActionResult> LayChiTietQuaHan(long donId)
        => HandleResult(await _quaHanService.LayChiTietQuaHanAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("{donId:long}/don-bi-anh-huong")]
    [RequirePermission(DomainConstants.Permissions.QuaHan_Xem)]
    public async Task<IActionResult> LayDonBiAnhHuong(long donId)
        => HandleResult(await _quaHanService.LayDonBiAnhHuongAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("quet-nhac")]
    [RequirePermission(DomainConstants.Permissions.QuaHan_XuLy)]
    public async Task<IActionResult> QuetVaTaoNhac([FromQuery] DateTime? mocQuet)
        => HandleResult(await _quaHanService.QuetVaTaoNhacQuaHanAsync(mocQuet), LayStatusCode);

    [HttpGet("{donId:long}/nhat-ky-lien-he")]
    [RequirePermission(DomainConstants.Permissions.QuaHan_Xem)]
    public async Task<IActionResult> LayNhatKyLienHe(long donId)
        => HandleResult(await _quaHanService.LayNhatKyLienHeAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{donId:long}/nhat-ky-lien-he")]
    [RequirePermission(DomainConstants.Permissions.QuaHan_XuLy)]
    public async Task<IActionResult> GhiNhatKyLienHe(long donId, [FromBody] TaoNhatKyLienHeQuaHanRequest request)
        => HandleCreatedResult(await _quaHanService.GhiNhatKyLienHeAsync(donId, request, MaTaiKhoanHienTai), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_NOT_FOUND" or "CHI_TIET_BAN_GIAO_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" => 403,
        "DON_CHUA_BAN_GIAO" => 409,
        _ => 400
    };
}

