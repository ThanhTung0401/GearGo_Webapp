using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/admin/bao-cao-van-hanh")]
[Authorize(Policy = "AdminOnly")]
public class BaoCaoVanHanhController : BaseApiController
{
    private readonly IBaoCaoVanHanhService _baoCaoService;

    public BaoCaoVanHanhController(IBaoCaoVanHanhService baoCaoService)
    {
        _baoCaoService = baoCaoService;
    }

    [HttpGet]
    public async Task<IActionResult> LayBaoCao([FromQuery] BoLocBaoCaoRequest filter)
    {
        var result = await _baoCaoService.LayBaoCaoVanHanhAsync(filter);
        return Ok(result);
    }
}
