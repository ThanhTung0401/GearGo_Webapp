using GearGo.Helpers;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Quản trị tài khoản người dùng &amp; nhân viên (UC1.11, UC1.13).
/// </summary>
[ApiController]
[Authorize(Roles = "QuanTriVien")]
[Route("api/quan-tri/tai-khoan")]
[Route("api/v1/quan-tri/tai-khoan")]
public class QuanTriTaiKhoanController : BaseApiController
{
    private readonly IQuanTriTaiKhoanService _service;

    public QuanTriTaiKhoanController(IQuanTriTaiKhoanService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> TimTaiKhoan([FromQuery] TimTaiKhoanRequest request, CancellationToken ct = default)
    {
        var kq = await _service.TimTaiKhoanAsync(request, MaTaiKhoanHienTai, ct);
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpGet("{maTaiKhoan:long}")]
    public async Task<IActionResult> LayTaiKhoan(long maTaiKhoan, CancellationToken ct = default)
    {
        var kq = await _service.LayTaiKhoanAsync(maTaiKhoan, MaTaiKhoanHienTai, ct);
        return kq.ThanhCong ? Ok(kq.DuLieu) : NotFound(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPost("{maTaiKhoan:long}/khoa")]
    public async Task<IActionResult> KhoaTaiKhoan(long maTaiKhoan, [FromBody] KhoaTaiKhoanRequest request, CancellationToken ct = default)
    {
        var kq = await _service.KhoaTaiKhoanAsync(maTaiKhoan, request, MaTaiKhoanHienTai, ct);
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPost("{maTaiKhoan:long}/mo-khoa")]
    public async Task<IActionResult> MoKhoaTaiKhoan(long maTaiKhoan, [FromBody] MoKhoaTaiKhoanRequest request, CancellationToken ct = default)
    {
        var kq = await _service.MoKhoaTaiKhoanAsync(maTaiKhoan, request, MaTaiKhoanHienTai, ct);
        return kq.ThanhCong ? Ok(kq.DuLieu) : BadRequest(new { kq.MaLoi, kq.ThongDiep });
    }
}
