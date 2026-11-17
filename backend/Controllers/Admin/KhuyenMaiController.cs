using GearGo.Helpers;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller Quản trị khuyến mãi dành riêng cho Quản trị viên (W6-T2 - UC24 - Kiện Minh)
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/khuyen-mai")]
[Route("api/v1/admin/khuyen-mai")]
public class KhuyenMaiController : BaseApiController
{
    private readonly IQuanTriKhuyenMaiService _quanTriKhuyenMaiService;

    public KhuyenMaiController(IQuanTriKhuyenMaiService quanTriKhuyenMaiService) => _quanTriKhuyenMaiService = quanTriKhuyenMaiService;

    [HttpGet]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemKhuyenMaiRequest request)
        => HandleResult(await _quanTriKhuyenMaiService.TimKiemAsync(request), LayStatusCode);

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id)
        => HandleResult(await _quanTriKhuyenMaiService.LayChiTietAsync(id), LayStatusCode);

    [HttpPost]
    public async Task<IActionResult> TaoMoi([FromBody] TaoKhuyenMaiRequest request)
        => ModelState.IsValid
            ? HandleCreatedResult(await _quanTriKhuyenMaiService.TaoAsync(request, MaTaiKhoanHienTai), LayStatusCode)
            : BadRequest(ModelState);

    [HttpPut("{id:long}")]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatKhuyenMaiRequest request)
        => ModelState.IsValid
            ? HandleResult(await _quanTriKhuyenMaiService.CapNhatAsync(id, request, MaTaiKhoanHienTai), LayStatusCode)
            : BadRequest(ModelState);

    [HttpPost("{id:long}/tam-an")]
    public async Task<IActionResult> TamAn([FromRoute] long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
        => HandleResult(await _quanTriKhuyenMaiService.TamAnAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/hien-thi")]
    public async Task<IActionResult> HienThi([FromRoute] long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
        => HandleResult(await _quanTriKhuyenMaiService.HienThiAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("{id:long}/su-dung")]
    public async Task<IActionResult> LayTinhHinhSuDung([FromRoute] long id)
        => HandleResult(await _quanTriKhuyenMaiService.LayTinhHinhSuDungAsync(id), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "KHUYEN_MAI_NOT_FOUND" => 404,
        "MA_GIAM_GIA_TRUNG" or "DIEU_KHOAN_MA_DA_CAM_KET" or "HAN_MUC_THAP_HON_DANG_CHIEM" => 409,
        _ => 400
    };
}
