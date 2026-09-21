using System.Threading.Tasks;
using GearGo.Models.DTOs.SanPham;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/san-pham")]
public class SanPhamController : ControllerBase
{
    private readonly ISanPhamService _sanPhamService;

    public SanPhamController(ISanPhamService sanPhamService)
    {
        _sanPhamService = sanPhamService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TimKiemSanPhamRequest request)
    {
        var result = await _sanPhamService.TimKiemAsync(request);
        if (!result.ThanhCong) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id, [FromQuery] TimKiemSanPhamRequest request)
    {
        var result = await _sanPhamService.LayChiTietAsync(id, request);
        if (!result.ThanhCong) return NotFound(result);
        return Ok(result);
    }
}
