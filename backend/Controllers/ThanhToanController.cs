using GearGo.Models.DTOs.ThanhToan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/thanh-toan")]
public class ThanhToanController : ControllerBase
{
    private readonly IThanhToanService _thanhToanService;

    public ThanhToanController(IThanhToanService thanhToanService)
    {
        _thanhToanService = thanhToanService;
    }

    [HttpPost("xac-nhan")]
    public async Task<IActionResult> XacNhanThanhToan([FromBody] XacNhanThanhToanRequest request)
    {
        var result = await _thanhToanService.XacNhanThanhToanAsync(request);

        if (!result.ThanhCong)
        {
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        }

        return Ok(new { MaThanhToan = result.DuLieu, ThongDiep = "Thanh toán thành công!" });
    }
}
