using System.Threading.Tasks;
using GearGo.Models.DTOs.SanPham;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Controller công khai tìm kiếm và xem chi tiết sản phẩm cho khách hàng (Task 9)
/// </summary>
[ApiController]
[Route("api/san-pham")]
public class SanPhamController : ControllerBase
{
    private readonly ISanPhamService _sanPhamService;

    public SanPhamController(ISanPhamService sanPhamService)
    {
        _sanPhamService = sanPhamService;
    }

    /// <summary>
    /// Tìm kiếm và lọc sản phẩm có hỗ trợ kiểm tra số lượng khả dụng theo thời gian nhận - trả
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TimKiemSanPhamRequest request)
    {
        var result = await _sanPhamService.TimKiemAsync(request);
        if (!result.ThanhCong) return BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Xem chi tiết sản phẩm kèm số lượng khả dụng
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById([FromRoute] long id, [FromQuery] TimKiemSanPhamRequest request)
    {
        var result = await _sanPhamService.LayChiTietAsync(id, request);
        if (!result.ThanhCong) return NotFound(result);
        return Ok(result);
    }
}