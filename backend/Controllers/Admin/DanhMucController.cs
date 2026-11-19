using System;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.Admin;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller quản lý Danh mục sản phẩm dành riêng cho Quản trị viên (Admin)
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/danh-muc")]
public class DanhMucController : BaseApiController
{
    private readonly IAdminDanhMucService _adminDanhMucService;

    public DanhMucController(IAdminDanhMucService adminDanhMucService)
    {
        _adminDanhMucService = adminDanhMucService;
    }

    /// <summary>
    /// Lấy toàn bộ danh mục sản phẩm (bao gồm cả trạng thái ẩn)
    /// </summary>
    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Xem)]
    public async Task<IActionResult> LayDanhSach()
    {
        var result = await _adminDanhMucService.LayDanhSachAsync();
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới một danh mục sản phẩm
    /// </summary>
    [HttpPost]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> TaoMoi([FromBody] TaoDanhMucRequest request)
    {
        var result = await _adminDanhMucService.TaoMoiAsync(request);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Cập nhật thông tin danh mục sản phẩm
    /// </summary>
    [HttpPut("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatDanhMucRequest request)
    {
        var result = await _adminDanhMucService.CapNhatAsync(id, request);
        return Ok(result);
    }

    /// <summary>
    /// Đổi trạng thái hiển thị của danh mục (HienThi / TamAn)
    /// </summary>
    [HttpPatch("{id:long}/trang-thai")]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> DoiTrangThai([FromRoute] long id, [FromBody] DoiTrangThaiRequest request)
    {
        await _adminDanhMucService.DoiTrangThaiAsync(id, request.TrangThaiMoi);
        return Ok(new { message = "Cập nhật trạng thái danh mục thành công." });
    }

    /// <summary>
    /// Xóa danh mục sản phẩm (Chỉ xóa khi không có sản phẩm và không có danh mục con)
    /// </summary>
    [HttpDelete("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.DanhMuc_Quan)]
    public async Task<IActionResult> Xoa([FromRoute] long id)
    {
        await _adminDanhMucService.XoaAsync(id);
        return Ok(new { message = "Xóa danh mục thành công." });
    }
}
