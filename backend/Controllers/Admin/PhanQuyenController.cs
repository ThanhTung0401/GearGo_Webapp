using System.Threading;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.PhanQuyen;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Quản trị phân quyền động (feat/ROLE_Adjustment).
/// Admin cấp/thu permission theo role; mọi user mang role đó nhận đổi ngay request kế.
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/phan-quyen")]
[Route("api/v1/admin/phan-quyen")]
public class PhanQuyenController : ControllerBase
{
    private readonly IPermissionService _service;

    public PhanQuyenController(IPermissionService service) => _service = service;

    [HttpGet("vai-tro")]
    public async Task<IActionResult> LayDanhSachVaiTro(CancellationToken ct)
        => Ok(await _service.LayDanhSachVaiTroAsync(ct));

    [HttpGet("quyen")]
    public async Task<IActionResult> LayCatalog()
        => Ok(await _service.LayCatalogAsync());

    [HttpGet("vai-tro/{roleName}")]
    public async Task<IActionResult> LayQuyenCuaVaiTro([FromRoute] string roleName, CancellationToken ct)
    {
        var kq = await _service.LayQuyenCuaVaiTroAsync(roleName, ct);
        return kq.ThanhCong
            ? Ok(kq.DuLieu)
            : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPut("vai-tro/{roleName}")]
    public async Task<IActionResult> CapNhatQuyen(
        [FromRoute] string roleName,
        [FromBody] CapNhatQuyenVaiTroRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var actorId = User.LayMaTaiKhoan();
        var kq = await _service.CapNhatQuyenVaiTroAsync(roleName, request, actorId, ct);
        return kq.ThanhCong
            ? Ok(kq.DuLieu)
            : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep, kq.ChiTiet });
    }

    // UC1.10: Phân quyền chi tiết theo từng nhân viên (id có thể là MaTaiKhoan hoặc MaNhanVien)
    [HttpGet("nhan-vien/{id:long}")]
    public async Task<IActionResult> LayQuyenCuaNhanVien([FromRoute] long id, CancellationToken ct)
    {
        var kq = await _service.LayQuyenCuaNhanVienAsync(id, ct);
        return kq.ThanhCong
            ? Ok(kq.DuLieu)
            : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep });
    }

    [HttpPut("nhan-vien/{id:long}")]
    public async Task<IActionResult> CapNhatQuyenNhanVien(
        [FromRoute] long id,
        [FromBody] CapNhatQuyenNhanVienRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var actorId = User.LayMaTaiKhoan();
        var kq = await _service.CapNhatQuyenNhanVienAsync(id, request, actorId, ct);
        return kq.ThanhCong
            ? Ok(kq.DuLieu)
            : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep, kq.ChiTiet });
    }

    [HttpDelete("nhan-vien/{id:long}")]
    public async Task<IActionResult> XoaPhanQuyenRiengNhanVien([FromRoute] long id, CancellationToken ct)
    {
        var actorId = User.LayMaTaiKhoan();
        var kq = await _service.XoaPhanQuyenRiengNhanVienAsync(id, actorId, ct);
        return kq.ThanhCong
            ? Ok(kq.DuLieu)
            : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep });
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        DomainConstants.Errors.RoleNotFound => 404,
        DomainConstants.Errors.AccountNotFound => 404,
        DomainConstants.Errors.StaffNotFound => 404,
        DomainConstants.Errors.PermissionNotFound => 400,
        DomainConstants.Errors.Forbidden => 403,
        "VAI_TRO_KHACH_KHONG_NHAN_QUYEN" => 400,
        _ => 400
    };
}
