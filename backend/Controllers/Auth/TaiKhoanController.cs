using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Auth;

/// <summary>
/// Quản lý tài khoản (tra cứu, khóa/mở khóa) — phân quyền theo DB.
/// </summary>
[ApiController]
[Authorize]
[Route("api/tai-khoan")]
public class TaiKhoanController : BaseApiController
{
    private readonly IQuanTriTaiKhoanService _service;

    public TaiKhoanController(IQuanTriTaiKhoanService service) => _service = service;

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.TaiKhoan_Xem)]
    public async Task<IActionResult> Tim([FromQuery] TimTaiKhoanRequest request, CancellationToken ct)
        => HandleResult(await _service.TimTaiKhoanAsync(request, MaTaiKhoanHienTai, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.TaiKhoan_Xem)]
    public async Task<IActionResult> Lay(long id, CancellationToken ct)
        => HandleResult(await _service.LayTaiKhoanAsync(id, MaTaiKhoanHienTai, ct));

    [HttpPost("{id:long}/khoa")]
    [RequirePermission(DomainConstants.Permissions.TaiKhoan_Quan)]
    public async Task<IActionResult> Khoa(long id, [FromBody] KhoaTaiKhoanRequest request, CancellationToken ct)
        => HandleResult(await _service.KhoaTaiKhoanAsync(id, request, MaTaiKhoanHienTai, ct));

    [HttpPost("{id:long}/mo-khoa")]
    [RequirePermission(DomainConstants.Permissions.TaiKhoan_Quan)]
    public async Task<IActionResult> MoKhoa(long id, [FromBody] MoKhoaTaiKhoanRequest request, CancellationToken ct)
        => HandleResult(await _service.MoKhoaTaiKhoanAsync(id, request, MaTaiKhoanHienTai, ct));
}
