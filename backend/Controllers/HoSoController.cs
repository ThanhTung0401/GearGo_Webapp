using GearGo.Helpers;
using GearGo.Models.DTOs.HoSo;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/ho-so")]
[Authorize(Policy = "CustomerOnly")]
public class HoSoController : ControllerBase
{
    private readonly IHoSoService _hoSoService;

    public HoSoController(IHoSoService hoSoService) => _hoSoService = hoSoService;

    [HttpGet("toi")]
    public async Task<IActionResult> LayHoSoCuaToi()
        => Ok(await _hoSoService.LayHoSoCuaToiAsync(User.LayMaTaiKhoan()));

    [HttpPut("toi")]
    public async Task<IActionResult> CapNhatHoSoCuaToi([FromBody] CapNhatHoSoRequest request)
        => Ok(await _hoSoService.CapNhatHoSoCuaToiAsync(request, User.LayMaTaiKhoan()));
}
