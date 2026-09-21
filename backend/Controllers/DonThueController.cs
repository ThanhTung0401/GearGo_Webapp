using GearGo.Models.DTOs;
using GearGo.Services.DonThue;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/don-thue")]
public class DonThueController : ControllerBase
{
    private readonly IDonThueService _donThueService;

    public DonThueController(IDonThueService donThueService)
    {
        _donThueService = donThueService;
    }

    [HttpPost]
    public async Task<IActionResult> TaoDonThue([FromBody] TaoDonThueRequest request)
    {
        var result = await _donThueService.TaoDonThueAsync(request);

        if (!result.ThanhCong)
        {
            return BadRequest(new
            {
                result.MaLoi,
                result.ThongDiep
            });
        }

        return Ok(result.DuLieu);
    }
}
