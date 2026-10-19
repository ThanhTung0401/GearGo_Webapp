using GearGo.Helpers;
using GearGo.Models.DTOs.BanGiao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/ban-giao")]
[Route("api/ban-giao")]
[Authorize(Policy = "StaffOrAdmin")]
public class BanGiaoController : BaseApiController
{
    private readonly IBanGiaoService _banGiaoService;

    public BanGiaoController(IBanGiaoService banGiaoService)
    {
        _banGiaoService = banGiaoService;
    }

    [HttpGet("don-thue/{maDonThue:long}")]
    [HttpGet("theo-don/{maDonThue:long}")]
    public async Task<IActionResult> LayTheoDon(long maDonThue)
        => HandleResult(await _banGiaoService.LayTheoDonAsync(maDonThue));

    [HttpPost("nhap/{maDonThue:long}")]
    [HttpPost("theo-don/{maDonThue:long}")]
    public async Task<IActionResult> TaoHoacLayPhieuBanGiaoNhap(long maDonThue)
        => HandleResult(await _banGiaoService.TaoHoacLayPhieuBanGiaoNhapAsync(maDonThue, User.LayMaTaiKhoan()));

    [HttpPut("nhap/{maPhieuBanGiao:long}")]
    [HttpPut("{maPhieuBanGiao:long}")]
    public async Task<IActionResult> CapNhatPhieuBanGiaoNhap(long maPhieuBanGiao, [FromBody] CapNhatPhieuBanGiaoRequest request)
        => HandleResult(await _banGiaoService.CapNhatPhieuBanGiaoNhapAsync(maPhieuBanGiao, request));

    [HttpPost("{maPhieuBanGiao:long}/chot")]
    public async Task<IActionResult> ChotBanGiao(long maPhieuBanGiao, [FromBody] ChotBanGiaoRequest request)
    {
        var result = await _banGiaoService.ChotBanGiaoAsync(maPhieuBanGiao, request, User.LayMaTaiKhoan());
        if (!result.ThanhCong)
            return HandleResult(result);

        return Ok(new { Message = "Chốt bàn giao thành công! Đơn đã chuyển sang trạng thái Đang Thuê." });
    }
}
