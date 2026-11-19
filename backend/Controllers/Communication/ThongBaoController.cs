using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Communication;

/// <summary>
/// Thông báo (hợp nhất thông báo cá nhân của người dùng và gửi/thử lại hàng chờ).
/// </summary>
[ApiController]
[Authorize]
[Route("api/thong-bao")]
public class ThongBaoController : BaseApiController
{
    private readonly IGuiThongBaoService _guiThongBaoService;
    private readonly IThongBaoService _thongBaoService;

    public ThongBaoController(IGuiThongBaoService guiThongBaoService, IThongBaoService thongBaoService)
    {
        _guiThongBaoService = guiThongBaoService;
        _thongBaoService = thongBaoService;
    }

    [HttpGet]
    public async Task<IActionResult> LayThongBaoCuaToi([FromQuery] TimThongBaoRequest filter)
        => Ok(await _thongBaoService.LayThongBaoCuaToiAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("chua-doc/dem")]
    public async Task<IActionResult> DemChuaDoc()
        => Ok(new { SoLuongChuaDoc = await _thongBaoService.DemChuaDocAsync(MaTaiKhoanHienTai) });

    [HttpPost("{id:long}/da-doc")]
    public async Task<IActionResult> DanhDauDaDoc(long id)
        => Ok(await _thongBaoService.DanhDauDaDocAsync(id, MaTaiKhoanHienTai));

    [HttpPost("da-doc-tat-ca")]
    public async Task<IActionResult> DanhDauTatCaDaDoc()
        => Ok(new { SoLuongCapNhat = await _thongBaoService.DanhDauTatCaDaDocAsync(MaTaiKhoanHienTai) });

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
