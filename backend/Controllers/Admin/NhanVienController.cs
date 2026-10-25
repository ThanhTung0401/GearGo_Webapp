using GearGo.Helpers;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>W5-T1: quản trị hồ sơ nhân viên, vai trò, nghỉ việc. Chỉ quản trị viên; không có API xóa cứng.</summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/nhan-vien")]
[Route("api/v1/admin/nhan-vien")]
public class NhanVienController : BaseApiController
{
    private readonly INhanVienService _service;

    public NhanVienController(INhanVienService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Tim([FromQuery] TimNhanVienRequest request, CancellationToken ct)
        => HandleResult(await _service.TimNhanVienAsync(request, User.LayMaTaiKhoan(), ct));

    [HttpPost]
    public async Task<IActionResult> Tao([FromBody] TaoNhanVienRequest request, CancellationToken ct)
        => HandleCreatedResult(await _service.TaoNhanVienAsync(request, User.LayMaTaiKhoan(), ct));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Lay(long id, CancellationToken ct)
        => HandleResult(await _service.LayNhanVienAsync(id, User.LayMaTaiKhoan(), ct));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> CapNhat(long id, [FromBody] CapNhatNhanVienRequest request, CancellationToken ct)
        => HandleResult(await _service.CapNhatNhanVienAsync(id, request, User.LayMaTaiKhoan(), ct));

    [HttpPost("{id:long}/doi-vai-tro")]
    public async Task<IActionResult> DoiVaiTro(long id, [FromBody] DoiVaiTroRequest request, CancellationToken ct)
        => HandleResult(await _service.DoiVaiTroAsync(id, request, User.LayMaTaiKhoan(), ct));

    [HttpPost("{id:long}/nghi-viec")]
    public async Task<IActionResult> NghiViec(long id, [FromBody] NghiViecRequest request, CancellationToken ct)
        => HandleResult(await _service.GhiNhanNghiViecAsync(id, request, User.LayMaTaiKhoan(), ct));
}
