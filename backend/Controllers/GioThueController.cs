using GearGo.Helpers;
using GearGo.Models.DTOs.GioThue;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[Route("api/gio-thue")]
[ApiController]
[Authorize(Policy = "CustomerOnly")]
public class GioThueController : BaseApiController
{
    private readonly IGioThueService _gioThueService;

    public GioThueController(IGioThueService gioThueService) => _gioThueService = gioThueService;

    [HttpGet]
    public async Task<IActionResult> GetGioThue()
        => Ok(await _gioThueService.LayGioAsync(MaTaiKhoanHienTai));

    [HttpPost("them")]
    public async Task<IActionResult> ThemVaoGio([FromBody] ThemVaoGioRequest req)
        => ModelState.IsValid ? Ok(await _gioThueService.ThemAsync(MaTaiKhoanHienTai, req)) : BadRequest(ModelState);

    [HttpPut("{maChiTiet}/so-luong")]
    public async Task<IActionResult> CapNhatSoLuong(long maChiTiet, [FromBody] CapNhatSoLuongRequest req)
        => ModelState.IsValid ? Ok(await _gioThueService.CapNhatSoLuongAsync(MaTaiKhoanHienTai, maChiTiet, req)) : BadRequest(ModelState);

    [HttpDelete("{maChiTiet}")]
    public async Task<IActionResult> XoaChiTiet(long maChiTiet)
    {
        await _gioThueService.XoaChiTietAsync(MaTaiKhoanHienTai, maChiTiet);
        return NoContent();
    }

    [HttpPut("thoi-gian")]
    public async Task<IActionResult> DatThoiGian([FromBody] DatThoiGianRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (req.GioTra <= req.GioNhan)
            return BadRequest(new { maLoi = "THOI_GIAN_SAI", thongDiep = "Giờ trả phải sau giờ nhận" });

        return Ok(await _gioThueService.DatThoiGianAsync(MaTaiKhoanHienTai, req));
    }

    [HttpPost("ma-giam-gia")]
    public async Task<IActionResult> ApKhuyenMai([FromBody] ApKhuyenMaiRequest req)
        => ModelState.IsValid ? Ok(await _gioThueService.ApMaKhuyenMaiAsync(MaTaiKhoanHienTai, req)) : BadRequest(ModelState);

    [HttpDelete("ma-giam-gia")]
    public async Task<IActionResult> BoKhuyenMai()
        => Ok(await _gioThueService.BoMaKhuyenMaiAsync(MaTaiKhoanHienTai));
}
