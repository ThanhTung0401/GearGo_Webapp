using GearGo.Helpers;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/thong-bao")]
[Route("api/v1/thong-bao")]
[Authorize]
public class ThongBaoController : ControllerBase
{
    private readonly IThongBaoService _thongBaoService;

    public ThongBaoController(IThongBaoService thongBaoService) => _thongBaoService = thongBaoService;

    [HttpGet]
    public async Task<IActionResult> LayThongBaoCuaToi([FromQuery] TimThongBaoRequest filter)
        => Ok(await _thongBaoService.LayThongBaoCuaToiAsync(filter, User.LayMaTaiKhoan()));

    [HttpGet("chua-doc/dem")]
    public async Task<IActionResult> DemChuaDoc()
        => Ok(new { SoLuongChuaDoc = await _thongBaoService.DemChuaDocAsync(User.LayMaTaiKhoan()) });

    [HttpPost("{id:long}/da-doc")]
    public async Task<IActionResult> DanhDauDaDoc(long id)
        => Ok(await _thongBaoService.DanhDauDaDocAsync(id, User.LayMaTaiKhoan()));

    [HttpPost("da-doc-tat-ca")]
    public async Task<IActionResult> DanhDauTatCaDaDoc()
        => Ok(new { SoLuongCapNhat = await _thongBaoService.DanhDauTatCaDaDocAsync(User.LayMaTaiKhoan()) });
}

