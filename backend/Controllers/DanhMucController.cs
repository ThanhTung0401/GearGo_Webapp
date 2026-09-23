using System.Threading.Tasks;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/danh-muc")]
public class DanhMucController : ControllerBase
{
    private readonly IDanhMucService _danhMucService;

    public DanhMucController(IDanhMucService danhMucService)
    {
        _danhMucService = danhMucService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _danhMucService.LayCayDanhMucAsync();
        if (!result.ThanhCong) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _danhMucService.LayChiTietAsync(id);
        if (!result.ThanhCong) return NotFound(result);
        return Ok(result);
    }
}
