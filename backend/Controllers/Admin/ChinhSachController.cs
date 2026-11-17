using GearGo.Helpers;
using GearGo.Models.DTOs.ChinhSach;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller Quản trị chính sách (W6-T1 - UC26 - Thanh Tùng).
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/chinh-sach")]
[Route("api/v1/admin/chinh-sach")]
public class ChinhSachController : BaseApiController
{
    private readonly IChinhSachService _service;

    public ChinhSachController(IChinhSachService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> LayDanhSach([FromQuery] int trang = 1, [FromQuery] int kichThuoc = 20, CancellationToken ct = default)
        => HandleResult(await _service.LayDanhSachAsync(trang, kichThuoc, ct), LayStatusCode);

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id, CancellationToken ct = default)
        => HandleResult(await _service.LayChiTietAsync(id, ct), LayStatusCode);

    [HttpPost("kiem-tra")]
    public async Task<IActionResult> KiemTra([FromBody] TaoChinhSachRequest request, CancellationToken ct = default)
        => ModelState.IsValid
            ? HandleResult(await _service.KiemTraNoiDungAsync(request, MaTaiKhoanHienTai, ct), LayStatusCode)
            : BadRequest(ModelState);

    [HttpPost]
    public async Task<IActionResult> TaoMoi([FromBody] TaoChinhSachRequest request, CancellationToken ct = default)
        => ModelState.IsValid
            ? HandleCreatedResult(await _service.TaoPhienBanAsync(request, MaTaiKhoanHienTai, ct), LayStatusCode)
            : BadRequest(ModelState);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "CHINH_SACH_NOT_FOUND" => 404,
        "CHUA_CO_CHINH_SACH_HIEU_LUC" or "PHIEN_BAN_XUNG_DOT" or "BAO_GIA_DIEU_KHOAN_DA_DOI" => 409,
        DomainConstants.Errors.Forbidden => 403,
        _ => 400
    };
}
