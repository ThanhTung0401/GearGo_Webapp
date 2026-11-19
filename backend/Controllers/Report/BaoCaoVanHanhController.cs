using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.BaoCao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Report;

[ApiController]
[Route("api/bao-cao-van-hanh")]
[Authorize]
public class BaoCaoVanHanhController : BaseApiController
{
    private readonly IBaoCaoVanHanhService _baoCaoService;

    public BaoCaoVanHanhController(IBaoCaoVanHanhService baoCaoService) => _baoCaoService = baoCaoService;

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.BaoCaoVanHanh_Xem)]
    public async Task<IActionResult> LayBaoCao([FromQuery] BoLocBaoCaoRequest filter)
        => Ok(await _baoCaoService.LayBaoCaoVanHanhAsync(filter));
}
