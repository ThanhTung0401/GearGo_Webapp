using GearGo.Models.DTOs.BanGiao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;


[ApiController]
[Route("/api/v1/ban-giao")]
public class BanGiaoController : ControllerBase
{
    private readonly IBanGiaoService _banGiaoService;

    public BanGiaoController(IBanGiaoService banGiaoService)
    {
        _banGiaoService = banGiaoService;
    }

    [HttpGet("/don-thue/{maDonThue}")]
    public async Task<IActionResult> LayTheoDon(long maDonThue)
    {
        var result = await _banGiaoService.LayTheoDonAsync(maDonThue);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    [HttpPost("/nhap/{maDonThue}")]
    public async Task<IActionResult> TaoHoacLayPhieuBanGiaoNhap(long maDonThue)
    {
        // TODO: Trong thực tế, mã nhân viên lấy từ User Claims (JWT Token)
        // var maNhanVien = long.Parse(User.FindFirst("MaNhanVien")?.Value ?? "1");
        long maNhanVien = 1;

        var result = await _banGiaoService
            .TaoHoacLayPhieuBanGiaoNhapAsync(maDonThue,maNhanVien);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    [HttpPut("/nhap/{maPhieuBanGiao}")]
    public async Task<IActionResult> CapNhatPhieuBanGiaoNhap(
            long maPhieuBanGiao, [FromBody] CapNhatPhieuBanGiaoRequest request)
    {
        var result = await _banGiaoService.CapNhatPhieuBanGiaoNhapAsync(maPhieuBanGiao, request);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    [HttpPost("/{maPhieuBanGiao}/chot")]
    public async Task<IActionResult> ChotBanGiao(
            long maPhieuBanGiao, [FromBody] ChotBanGiaoRequest request)
    {
        long maNhanVien = 1; // TODO
        var result = await _banGiaoService.ChotBanGiaoAsync(maPhieuBanGiao, request, maNhanVien);
        if (!result.ThanhCong)
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        return Ok(new { Message = "Chốt bàn giao thành công! Đơn đã chuyển sang trạng thái Đang Thuê." });
    }
}
