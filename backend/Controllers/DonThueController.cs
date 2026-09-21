using GearGo.Models.DTOs;
using GearGo.Services.Interfaces;
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

    [HttpPut("{id}/huy")]
    public async Task<IActionResult> HuyDonThue(long id, [FromBody] string lyDo)
    {
        var result = await _donThueService.HuyDonAsync(id, lyDo);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });

        return Ok(new { Message = "Đã hủy đơn thành công!" });
    }
}
