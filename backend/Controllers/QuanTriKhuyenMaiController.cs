using System.Security.Claims;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Quản trị khuyến mãi dành cho Quản trị viên (UC8.2 - UC8.5).
/// </summary>
[ApiController]
[Authorize(Roles = "QuanTriVien")]
[Route("api/quan-tri/khuyen-mai")]
[Route("api/v1/quan-tri/khuyen-mai")]
public class QuanTriKhuyenMaiController : ControllerBase
{
    private readonly IQuanTriKhuyenMaiService _service;

    public QuanTriKhuyenMaiController(IQuanTriKhuyenMaiService service) => _service = service;

    private long LayActorId()
        => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpGet]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemKhuyenMaiRequest request)
    {
        var kq = await _service.TimKiemAsync(request);
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet(long id)
    {
        var kq = await _service.LayChiTietAsync(id);
        return kq.ThanhCong ? Ok(kq.DuLieu) : NotFound(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPost]
    public async Task<IActionResult> Tao([FromBody] TaoKhuyenMaiRequest request)
    {
        var kq = await _service.TaoAsync(request, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> CapNhat(long id, [FromBody] CapNhatKhuyenMaiRequest request)
    {
        var kq = await _service.CapNhatAsync(id, request, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPost("{id:long}/tam-an")]
    public async Task<IActionResult> TamAn(long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
    {
        var kq = await _service.TamAnAsync(id, request, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPost("{id:long}/hien-thi")]
    public async Task<IActionResult> HienThi(long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
    {
        var kq = await _service.HienThiAsync(id, request, LayActorId());
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("{id:long}/su-dung")]
    public async Task<IActionResult> LayTinhHinhSuDung(long id)
    {
        var kq = await _service.LayTinhHinhSuDungAsync(id);
        return kq.ThanhCong ? Ok(kq.DuLieu) : NotFound(new { kq.MaLoi, kq.ThongDiep });
    }
}
