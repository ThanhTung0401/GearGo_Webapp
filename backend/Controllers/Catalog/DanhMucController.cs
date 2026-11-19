using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.Admin;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Catalog;

/// <summary>
/// Danh mục sản phẩm (hợp nhất endpoint công khai và quản lý).
/// </summary>
[ApiController]
[Route("api/danh-muc")]
public class DanhMucController : BaseApiController
{
    private readonly IDanhMucService _danhMucService;
    private readonly IAdminDanhMucService _adminDanhMucService;

    public DanhMucController(IDanhMucService danhMucService, IAdminDanhMucService adminDanhMucService)
    {
        _danhMucService = danhMucService;
        _adminDanhMucService = adminDanhMucService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var result = await _danhMucService.LayCayDanhMucAsync();
        return result.ThanhCong ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{id:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById([FromRoute] long id)
    {
        var result = await _danhMucService.LayChiTietAsync(id);
        return result.ThanhCong ? Ok(result) : NotFound(result);
    }

    [HttpGet("quan-ly")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Xem)]
    public async Task<IActionResult> LayDanhSach()
        => Ok(await _adminDanhMucService.LayDanhSachAsync());

    [HttpPost]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> TaoMoi([FromBody] TaoDanhMucRequest request)
        => StatusCode(201, await _adminDanhMucService.TaoMoiAsync(request));

    [HttpPut("{id:long}")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatDanhMucRequest request)
        => Ok(await _adminDanhMucService.CapNhatAsync(id, request));

    [HttpPatch("{id:long}/trang-thai")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> DoiTrangThai([FromRoute] long id, [FromBody] DoiTrangThaiRequest request)
    {
        await _adminDanhMucService.DoiTrangThaiAsync(id, request.TrangThaiMoi);
        return Ok(new { message = "Cập nhật trạng thái danh mục thành công." });
    }

    [HttpDelete("{id:long}")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> Xoa([FromRoute] long id)
    {
        await _adminDanhMucService.XoaAsync(id);
        return Ok(new { message = "Xóa danh mục thành công." });
    }
}
