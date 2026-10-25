using GearGo.Helpers;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>W5-T1: quản trị tài khoản (tra cứu, khóa/mở khóa). Chỉ quản trị viên.</summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/tai-khoan")]
[Route("api/v1/admin/tai-khoan")]
public class TaiKhoanController : BaseApiController
{
    private readonly IQuanTriTaiKhoanService _service;

    public TaiKhoanController(IQuanTriTaiKhoanService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Tim([FromQuery] TimTaiKhoanRequest request, CancellationToken ct)
        => HandleResult(await _service.TimTaiKhoanAsync(request, User.LayMaTaiKhoan(), ct));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Lay(long id, CancellationToken ct)
        => HandleResult(await _service.LayTaiKhoanAsync(id, User.LayMaTaiKhoan(), ct));

    [HttpPost("{id:long}/khoa")]
    public async Task<IActionResult> Khoa(long id, [FromBody] KhoaTaiKhoanRequest request, CancellationToken ct)
        => HandleResult(await _service.KhoaTaiKhoanAsync(id, request, User.LayMaTaiKhoan(), ct));

    [HttpPost("{id:long}/mo-khoa")]
    public async Task<IActionResult> MoKhoa(long id, [FromBody] MoKhoaTaiKhoanRequest request, CancellationToken ct)
        => HandleResult(await _service.MoKhoaTaiKhoanAsync(id, request, User.LayMaTaiKhoan(), ct));
}
