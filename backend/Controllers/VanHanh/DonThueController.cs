using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.VanHanh;

[ApiController]
[Route("api/v1/van-hanh/don-thue")]
[Authorize(Policy = "StaffOrAdmin")]
public class DonThueController : ControllerBase
{
    private readonly ITruyVanDonThueService _truyVanService;

    public DonThueController(ITruyVanDonThueService truyVanService) => _truyVanService = truyVanService;

    [HttpGet]
    public async Task<IActionResult> TimDon([FromQuery] TimDonVanHanhRequest filter)
        => Ok(await _truyVanService.TimDonVanHanhAsync(filter, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet(long id)
        => Ok(await _truyVanService.LayChiTietDonVanHanhAsync(id, User.LayMaTaiKhoan()));
}
