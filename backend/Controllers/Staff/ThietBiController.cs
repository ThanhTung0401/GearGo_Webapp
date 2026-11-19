using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.ThietBi;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Staff;

[ApiController]
[Route("api/thiet-bi")]
[Authorize]
public class ThietBiController : BaseApiController
{
    private readonly IThietBiService _thietBiService;

    public ThietBiController(IThietBiService thietBiService) => _thietBiService = thietBiService;

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_Xem)]
    public async Task<IActionResult> TimKiem([FromQuery] TimThietBiRequest request)
    {
        var result = await _thietBiService.TimKiemThietBiAsync(request, MaTaiKhoanHienTai);
        return result.ThanhCong ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{id}")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_Xem)]
    public async Task<IActionResult> LayChiTiet(long id)
    {
        var result = await _thietBiService.LayChiTietThietBiAsync(id, MaTaiKhoanHienTai);
        return result.ThanhCong ? Ok(result) : NotFound(result);
    }

    [HttpGet("{id}/lich")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_Xem)]
    public async Task<IActionResult> LayLich(long id, [FromQuery] DateTime? tuNgay, [FromQuery] DateTime? denNgay)
    {
        var result = await _thietBiService.LayLichThietBiAsync(id, tuNgay, denNgay, MaTaiKhoanHienTai);
        return result.ThanhCong ? Ok(result) : BadRequest(result);
    }

    [HttpGet("phu-hop")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_Xem)]
    public async Task<IActionResult> LayPhuHop([FromQuery] long maChiTietDon)
    {
        var result = await _thietBiService.LayThietBiPhuHopChoDonAsync(maChiTietDon, MaTaiKhoanHienTai);
        return result.ThanhCong ? Ok(result) : BadRequest(result);
    }
}
