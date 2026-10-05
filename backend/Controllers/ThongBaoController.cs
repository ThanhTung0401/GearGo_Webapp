using GearGo.Helpers;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/thong-bao")]
[Authorize]
public class ThongBaoController : ControllerBase
{
    private readonly IThongBaoService _thongBaoService;

    public ThongBaoController(IThongBaoService thongBaoService) => _thongBaoService = thongBaoService;

    [HttpGet]
    public async Task<IActionResult> LayThongBaoCuaToi([FromQuery] TimThongBaoRequest filter)
        => Ok(await _thongBaoService.LayThongBaoCuaToiAsync(filter, User.LayMaTaiKhoan()));

    [HttpPost("{id:long}/da-doc")]
    public async Task<IActionResult> DanhDauDaDoc(long id)
        => Ok(await _thongBaoService.DanhDauDaDocAsync(id, User.LayMaTaiKhoan()));
}
