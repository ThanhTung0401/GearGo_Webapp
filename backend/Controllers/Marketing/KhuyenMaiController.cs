using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Marketing;

/// <summary>
/// Quản lý khuyến mãi (hợp nhất các endpoint khuyến mãi, phân quyền theo DB).
/// </summary>
[ApiController]
[Authorize]
[Route("api/khuyen-mai")]
public class KhuyenMaiController : BaseApiController
{
    private readonly IQuanTriKhuyenMaiService _quanTriKhuyenMaiService;

    public KhuyenMaiController(IQuanTriKhuyenMaiService quanTriKhuyenMaiService) => _quanTriKhuyenMaiService = quanTriKhuyenMaiService;

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.KhuyenMai_Xem)]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemKhuyenMaiRequest request)
        => HandleResult(await _quanTriKhuyenMaiService.TimKiemAsync(request), LayStatusCode);

    [HttpGet("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.KhuyenMai_Xem)]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id)
        => HandleResult(await _quanTriKhuyenMaiService.LayChiTietAsync(id), LayStatusCode);

    [HttpPost]
    [RequirePermission(DomainConstants.Permissions.KhuyenMai_Quan)]
    public async Task<IActionResult> TaoMoi([FromBody] TaoKhuyenMaiRequest request)
        => ModelState.IsValid
            ? HandleCreatedResult(await _quanTriKhuyenMaiService.TaoAsync(request, MaTaiKhoanHienTai), LayStatusCode)
            : BadRequest(ModelState);

    [HttpPut("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.KhuyenMai_Quan)]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatKhuyenMaiRequest request)
        => ModelState.IsValid
            ? HandleResult(await _quanTriKhuyenMaiService.CapNhatAsync(id, request, MaTaiKhoanHienTai), LayStatusCode)
            : BadRequest(ModelState);

    [HttpPost("{id:long}/tam-an")]
    [RequirePermission(DomainConstants.Permissions.KhuyenMai_Quan)]
    public async Task<IActionResult> TamAn([FromRoute] long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
        => HandleResult(await _quanTriKhuyenMaiService.TamAnAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/hien-thi")]
    [RequirePermission(DomainConstants.Permissions.KhuyenMai_Quan)]
    public async Task<IActionResult> HienThi([FromRoute] long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
        => HandleResult(await _quanTriKhuyenMaiService.HienThiAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("{id:long}/su-dung")]
    [RequirePermission(DomainConstants.Permissions.KhuyenMai_Xem)]
    public async Task<IActionResult> LayTinhHinhSuDung([FromRoute] long id)
        => HandleResult(await _quanTriKhuyenMaiService.LayTinhHinhSuDungAsync(id), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "KHUYEN_MAI_NOT_FOUND" => 404,
        "MA_GIAM_GIA_TRUNG" or "DIEU_KHOAN_MA_DA_CAM_KET" or "HAN_MUC_THAP_HON_DANG_CHIEM" => 409,
        _ => 400
    };
}
