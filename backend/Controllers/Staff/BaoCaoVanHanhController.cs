using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.BaoCao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Staff;

[ApiController]
[Route("api/admin/bao-cao-van-hanh")]
[Route("api/v1/admin/bao-cao-van-hanh")]
[Authorize]
public class BaoCaoVanHanhController : BaseApiController
{
    private readonly IBaoCaoVanHanhService _baoCaoService;

    public BaoCaoVanHanhController(IBaoCaoVanHanhService baoCaoService)
    {
        _baoCaoService = baoCaoService;
    }

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.BaoCaoVanHanh_Xem)]
    public async Task<IActionResult> LayBaoCao([FromQuery] BoLocBaoCaoRequest filter)
    {
        var result = await _baoCaoService.LayBaoCaoVanHanhAsync(filter);
        return Ok(result);
    }
}
