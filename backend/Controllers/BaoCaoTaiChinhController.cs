using System.Security.Claims;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Báo cáo doanh thu, dòng tiền và số dư cọc (UC10.2).
/// </summary>
[ApiController]
[Authorize(Roles = "QuanTriVien")]
[Route("api/bao-cao/tai-chinh")]
[Route("api/v1/bao-cao/tai-chinh")]
public class BaoCaoTaiChinhController : ControllerBase
{
    private readonly IBaoCaoTaiChinhService _service;

    public BaoCaoTaiChinhController(IBaoCaoTaiChinhService service) => _service = service;

    private long LayActorId()
        => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpGet("doanh-thu-hoan-tat")]
    public async Task<IActionResult> LayDoanhThuHoanTat([FromQuery] LocTaiChinhRequest filter)
    {
        var kq = await _service.LayDoanhThuHoanTatAsync(filter, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("phi-huy")]
    public async Task<IActionResult> LayPhiHuy([FromQuery] LocTaiChinhRequest filter)
    {
        var kq = await _service.LayPhiHuyAsync(filter, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("dieu-chinh-doanh-thu")]
    public async Task<IActionResult> LayDieuChinhDoanhThu([FromQuery] LocTaiChinhRequest filter)
    {
        var kq = await _service.LayDieuChinhDoanhThuAsync(filter, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("thu-hoan")]
    public async Task<IActionResult> LayThuHoan([FromQuery] LocTaiChinhRequest filter)
    {
        var kq = await _service.LayThuHoanAsync(filter, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("coc-chua-tat-toan")]
    public async Task<IActionResult> LayCocChuaTatToan([FromQuery] LocTaiChinhRequest filter)
    {
        var kq = await _service.LayCocChuaTatToanAsync(filter, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("khoan-can-xu-ly")]
    public async Task<IActionResult> LayKhoanCanXuLy([FromQuery] LocTaiChinhRequest filter)
    {
        var kq = await _service.LayKhoanCanXuLyAsync(filter, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("xuat-csv")]
    public async Task<IActionResult> XuatCsv([FromQuery] XuatCsvTaiChinhRequest request)
    {
        var kq = await _service.XuatCsvAsync(request, LayActorId());
        if (!kq.ThanhCong || kq.DuLieu is null)
            return BadRequest(new { kq.MaLoi, kq.ThongDiep });

        return File(kq.DuLieu.NoiDung, kq.DuLieu.ContentType, kq.DuLieu.TenTep);
    }
}
