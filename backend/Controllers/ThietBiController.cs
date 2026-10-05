using System.Threading.Tasks;
using GearGo.Models.DTOs.ThietBi;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/thiet-bi")]
[Authorize(Roles = "NhanVien, QuanTriVien")]
public class ThietBiController : ControllerBase
{
    private readonly IThietBiService _thietBiService;
    private readonly IJwtService _jwtService;

    public ThietBiController(IThietBiService thietBiService, IJwtService jwtService)
    {
        _thietBiService = thietBiService;
        _jwtService = jwtService;
    }

    private long GetActorId()
    {
        // Giả sử có logic lấy ID người dùng hiện tại
        return 1; // placeholder
    }

    [HttpGet]
    public async Task<IActionResult> TimKiem([FromQuery] TimThietBiRequest request)
    {
        var actorId = GetActorId();
        var result = await _thietBiService.TimKiemThietBiAsync(request, actorId);
        if (!result.ThanhCong) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> LayChiTiet(long id)
    {
        var actorId = GetActorId();
        var result = await _thietBiService.LayChiTietThietBiAsync(id, actorId);
        if (!result.ThanhCong) return NotFound(result);
        return Ok(result);
    }

    [HttpGet("{id}/lich")]
    public async Task<IActionResult> LayLich(long id, [FromQuery] System.DateTime? tuNgay, [FromQuery] System.DateTime? denNgay)
    {
        var actorId = GetActorId();
        var result = await _thietBiService.LayLichThietBiAsync(id, tuNgay, denNgay, actorId);
        if (!result.ThanhCong) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("phu-hop")]
    public async Task<IActionResult> LayPhuHop([FromQuery] long maChiTietDon)
    {
        var actorId = GetActorId();
        var result = await _thietBiService.LayThietBiPhuHopChoDonAsync(maChiTietDon, actorId);
        if (!result.ThanhCong) return BadRequest(result);
        return Ok(result);
    }
}
