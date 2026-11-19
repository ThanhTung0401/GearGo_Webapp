using GearGo.Helpers;
using GearGo.Models.DTOs.HoSo;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Auth;

[ApiController]
[Route("api/ho-so")]
[Authorize]
public class HoSoController : BaseApiController
{
    private readonly IHoSoService _hoSoService;

    public HoSoController(IHoSoService hoSoService) => _hoSoService = hoSoService;

    [HttpGet("toi")]
    public async Task<IActionResult> LayHoSoCuaToi()
        => Ok(await _hoSoService.LayHoSoCuaToiAsync(MaTaiKhoanHienTai));

    [HttpPost("toi/gui-otp-lien-he")]
    public async Task<IActionResult> GuiOtpDoiLienHe([FromBody] GuiOtpDoiLienHeRequest request)
        => Ok(await _hoSoService.GuiOtpDoiLienHeAsync(request, MaTaiKhoanHienTai));

    [HttpPut("toi")]
    public async Task<IActionResult> CapNhatHoSoCuaToi([FromBody] CapNhatHoSoRequest request)
        => Ok(await _hoSoService.CapNhatHoSoCuaToiAsync(request, MaTaiKhoanHienTai));
}

