using GearGo.Helpers;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/qua-han")]
[Route("api/qua-han")]
[Authorize(Policy = "StaffOrAdmin")]
public class QuaHanController : BaseApiController
{
    private readonly IQuaHanService _quaHanService;

    public QuaHanController(IQuaHanService quaHanService) => _quaHanService = quaHanService;

    [HttpGet]
    public async Task<IActionResult> LayDonQuaHan([FromQuery] LocQuaHanRequest filter)
        => HandleResult(await _quaHanService.LayDonQuaHanAsync(filter, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("{donId:long}")]
    public async Task<IActionResult> LayChiTietQuaHan(long donId)
        => HandleResult(await _quaHanService.LayChiTietQuaHanAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("{donId:long}/don-bi-anh-huong")]
    public async Task<IActionResult> LayDonBiAnhHuong(long donId)
        => HandleResult(await _quaHanService.LayDonBiAnhHuongAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("quet-nhac")]
    public async Task<IActionResult> QuetVaTaoNhac([FromQuery] DateTime? mocQuet)
        => HandleResult(await _quaHanService.QuetVaTaoNhacQuaHanAsync(mocQuet), LayStatusCode);

    [HttpGet("{donId:long}/nhat-ky-lien-he")]
    public async Task<IActionResult> LayNhatKyLienHe(long donId)
        => HandleResult(await _quaHanService.LayNhatKyLienHeAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{donId:long}/nhat-ky-lien-he")]
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
