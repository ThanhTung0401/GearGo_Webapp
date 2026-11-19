using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller quản lý thông báo và hàng chờ gửi dành riêng cho Quản trị viên (Admin)
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/thong-bao")]
[Route("api/v1/admin/thong-bao")]
public class ThongBaoController : BaseApiController
{
    private readonly IGuiThongBaoService _guiThongBaoService;
    private readonly IThongBaoService _thongBaoService;

    public ThongBaoController(IGuiThongBaoService guiThongBaoService, IThongBaoService thongBaoService)
    {
        _guiThongBaoService = guiThongBaoService;
        _thongBaoService = thongBaoService;
    }

    [HttpPost]
    [RequirePermission(DomainConstants.Permissions.ThongBao_Gui)]
    public async Task<IActionResult> GuiThongBaoThuCong([FromBody] GuiThongBaoAdminRequest request)
        => HandleCreatedResult(await _thongBaoService.GuiThongBaoThuCongAsync(request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("gui-loi")]
    [RequirePermission(DomainConstants.Permissions.ThongBao_Xem)]
    public async Task<IActionResult> LayThongBaoGuiLoi([FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 20)
        => HandleResult(await _guiThongBaoService.LayThongBaoGuiLoiAsync(trang, soMoiTrang), LayStatusCode);

    [HttpPost("{id:long}/thu-lai")]
    [RequirePermission(DomainConstants.Permissions.ThongBao_Gui)]
    public async Task<IActionResult> ThuLai([FromRoute] long id, [FromBody] ThuLaiThongBaoRequest request)
        => HandleResult(await _guiThongBaoService.ThuLaiAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "THONG_BAO_NOT_FOUND" => 404,
        "THONG_BAO_DANG_XU_LY" => 409,
        _ => 400
    };
}
