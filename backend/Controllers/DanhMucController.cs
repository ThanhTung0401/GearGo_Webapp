using System.Threading.Tasks;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Controller công khai tra cứu danh mục sản phẩm cho khách hàng (Task 9)
/// </summary>
[ApiController]
[Route("api/danh-muc")]
public class DanhMucController : ControllerBase
{
    private readonly IDanhMucService _danhMucService;

    public DanhMucController(IDanhMucService danhMucService)
    {
        _danhMucService = danhMucService;
    }

    /// <summary>
    /// Lấy toàn bộ cây danh mục sản phẩm đang hiển thị
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _danhMucService.LayCayDanhMucAsync();
        if (!result.ThanhCong) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết một danh mục sản phẩm
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById([FromRoute] long id)
    {
        var result = await _danhMucService.LayChiTietAsync(id);
        if (!result.ThanhCong) return NotFound(result);
        return Ok(result);
    }
}