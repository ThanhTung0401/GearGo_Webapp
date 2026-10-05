using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/don-thue")]
public class DonThueController : ControllerBase
{
    private readonly IDonThueService _donThueService;
    private readonly ITruyVanDonThueService _truyVanService;

    public DonThueController(IDonThueService donThueService, ITruyVanDonThueService truyVanService)
    {
        _donThueService = donThueService;
        _truyVanService = truyVanService;
    }

    // ── W3-T1: truy vấn đơn của khách (mã khách lấy từ JWT, không nhận từ request) ──

    [HttpGet]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayDonCuaToi([FromQuery] TimDonRequest filter)
        => Ok(await _truyVanService.LayDonCuaToiAsync(filter, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayChiTiet(long id)
        => Ok(await _truyVanService.LayChiTietDonCuaToiAsync(id, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}/lich-su")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayLichSu(long id)
        => Ok(await _truyVanService.LayLichSuDonCuaToiAsync(id, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}/ban-giao")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayBienBanBanGiao(long id)
        => Ok(await _truyVanService.LayBienBanBanGiaoCuaKhachAsync(id, User.LayMaTaiKhoan()));

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
