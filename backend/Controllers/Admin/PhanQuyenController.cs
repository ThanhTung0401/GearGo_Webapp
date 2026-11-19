using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.PhanQuyen;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Quản trị phân quyền động (feat/ROLE_Adjustment).
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/phan-quyen")]
[Route("api/v1/admin/phan-quyen")]
public class PhanQuyenController : BaseApiController
{
    private readonly IPermissionService _service;

    public PhanQuyenController(IPermissionService service) => _service = service;

    [HttpGet("vai-tro")]
    [RequirePermission(DomainConstants.Permissions.PhanQuyen_Xem)]
    public async Task<IActionResult> LayDanhSachVaiTro(CancellationToken ct)
        => Ok(await _service.LayDanhSachVaiTroAsync(ct));

    [HttpGet("quyen")]
    [RequirePermission(DomainConstants.Permissions.PhanQuyen_Xem)]
    public async Task<IActionResult> LayCatalog()
        => Ok(await _service.LayCatalogAsync());

    [HttpGet("vai-tro/{roleName}")]
    [RequirePermission(DomainConstants.Permissions.PhanQuyen_Xem)]
    public async Task<IActionResult> LayQuyenCuaVaiTro([FromRoute] string roleName, CancellationToken ct)
        => HandleResult(await _service.LayQuyenCuaVaiTroAsync(roleName, ct), LayStatusCode);

    [HttpPut("vai-tro/{roleName}")]
    [RequirePermission(DomainConstants.Permissions.PhanQuyen_Quan)]
    public async Task<IActionResult> CapNhatQuyen([FromRoute] string roleName, [FromBody] CapNhatQuyenVaiTroRequest request, CancellationToken ct)
        => ModelState.IsValid
            ? HandleResult(await _service.CapNhatQuyenVaiTroAsync(roleName, request, MaTaiKhoanHienTai, ct), LayStatusCode)
            : BadRequest(ModelState);

    [HttpGet("nhan-vien/{id:long}")]
    [RequirePermission(DomainConstants.Permissions.PhanQuyen_Xem)]
    public async Task<IActionResult> LayQuyenCuaNhanVien([FromRoute] long id, CancellationToken ct)
        => HandleResult(await _service.LayQuyenCuaNhanVienAsync(id, ct), LayStatusCode);

    [HttpPut("nhan-vien/{id:long}")]
    [RequirePermission(DomainConstants.Permissions.PhanQuyen_Quan)]
    public async Task<IActionResult> CapNhatQuyenNhanVien([FromRoute] long id, [FromBody] CapNhatQuyenNhanVienRequest request, CancellationToken ct)
        => ModelState.IsValid
            ? HandleResult(await _service.CapNhatQuyenNhanVienAsync(id, request, MaTaiKhoanHienTai, ct), LayStatusCode)
            : BadRequest(ModelState);

    [HttpDelete("nhan-vien/{id:long}")]
    [RequirePermission(DomainConstants.Permissions.PhanQuyen_Quan)]
    public async Task<IActionResult> XoaPhanQuyenRiengNhanVien([FromRoute] long id, CancellationToken ct)
        => HandleResult(await _service.XoaPhanQuyenRiengNhanVienAsync(id, MaTaiKhoanHienTai, ct), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        DomainConstants.Errors.RoleNotFound or DomainConstants.Errors.AccountNotFound or DomainConstants.Errors.StaffNotFound => 404,
        DomainConstants.Errors.Forbidden => 403,
        _ => 400
    };
}
