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
public class BanGiaoController : ControllerBase
{
    private readonly IBanGiaoService _banGiaoService;

    public BanGiaoController(IBanGiaoService banGiaoService)
    {
        _banGiaoService = banGiaoService;
    }

    [HttpGet("don-thue/{maDonThue:long}")]
    [HttpGet("theo-don/{maDonThue:long}")]
    public async Task<IActionResult> LayTheoDon(long maDonThue)
    {
        var result = await _banGiaoService.LayTheoDonAsync(maDonThue);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    [HttpPost("nhap/{maDonThue:long}")]
    [HttpPost("theo-don/{maDonThue:long}")]
    public async Task<IActionResult> TaoHoacLayPhieuBanGiaoNhap(long maDonThue)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _banGiaoService.TaoHoacLayPhieuBanGiaoNhapAsync(maDonThue, maTaiKhoan);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    [HttpPut("nhap/{maPhieuBanGiao:long}")]
    [HttpPut("{maPhieuBanGiao:long}")]
    public async Task<IActionResult> CapNhatPhieuBanGiaoNhap(
            long maPhieuBanGiao, [FromBody] CapNhatPhieuBanGiaoRequest request)
    {
        var result = await _banGiaoService.CapNhatPhieuBanGiaoNhapAsync(maPhieuBanGiao, request);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    [HttpPost("{maPhieuBanGiao:long}/chot")]
    public async Task<IActionResult> ChotBanGiao(
            long maPhieuBanGiao, [FromBody] ChotBanGiaoRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _banGiaoService.ChotBanGiaoAsync(maPhieuBanGiao, request, maTaiKhoan);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(new { Message = "Chốt bàn giao thành công! Đơn đã chuyển sang trạng thái Đang Thuê." });
    }
}
