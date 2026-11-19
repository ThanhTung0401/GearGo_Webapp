using System;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.Admin;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller quản lý Sản phẩm và Hình ảnh sản phẩm dành riêng cho Quản trị viên (Admin)
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/san-pham")]
public class SanPhamController : BaseApiController
{
    private readonly IAdminSanPhamService _adminSanPhamService;

    public SanPhamController(IAdminSanPhamService adminSanPhamService)
    {
        _adminSanPhamService = adminSanPhamService;
    }

    /// <summary>
    /// Lấy danh sách sản phẩm kèm lọc từ khóa và phân trang (Admin xem được cả DangKinhDoanh, TamNgung, NgungKinhDoanh)
    /// </summary>
    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.SanPham_Xem)]
    public async Task<IActionResult> LayDanhSach(
        [FromQuery] string? tuKhoa,
        [FromQuery] int trang = 1,
        [FromQuery] int soMoiTrang = 12)
    {
        var result = await _adminSanPhamService.LayDanhSachAsync(tuKhoa, trang, soMoiTrang);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới một sản phẩm
    /// </summary>
    [HttpPost]
    [RequirePermission(DomainConstants.Permissions.SanPham_Tao)]
    public async Task<IActionResult> TaoMoi([FromBody] TaoSanPhamRequest request)
    {
        var result = await _adminSanPhamService.TaoMoiAsync(request);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Cập nhật thông tin chi tiết của sản phẩm
    /// </summary>
    [HttpPut("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.SanPham_CapNhat)]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatSanPhamRequest request)
    {
        var result = await _adminSanPhamService.CapNhatAsync(id, request);
        return Ok(result);
    }

    /// <summary>
    /// Đổi trạng thái kinh doanh của sản phẩm (DangKinhDoanh, TamNgung, NgungKinhDoanh)
    /// </summary>
    [HttpPatch("{id:long}/trang-thai")]
    [RequirePermission(DomainConstants.Permissions.SanPham_CapNhat)]
    public async Task<IActionResult> DoiTrangThai([FromRoute] long id, [FromBody] DoiTrangThaiRequest request)
    {
        await _adminSanPhamService.DoiTrangThaiAsync(id, request.TrangThaiMoi);
        return Ok(new { message = "Cập nhật trạng thái sản phẩm thành công." });
    }

    /// <summary>
    /// Lấy danh sách hình ảnh của sản phẩm (kèm MaHinhAnh để Admin xóa)
    /// </summary>
    [HttpGet("{id:long}/hinh-anh")]
    [RequirePermission(DomainConstants.Permissions.SanPham_Xem)]
    public async Task<IActionResult> LayHinhAnh([FromRoute] long id)
    {
        var result = await _adminSanPhamService.LayHinhAnhAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Upload hình ảnh cho sản phẩm (Hỗ trợ .jpg, .jpeg, .png, .webp <= 5MB)
    /// </summary>
    [HttpPost("{id:long}/hinh-anh")]
    [RequirePermission(DomainConstants.Permissions.SanPham_CapNhat)]
    public async Task<IActionResult> ThemHinhAnh([FromRoute] long id, IFormFile file)
    {
        var result = await _adminSanPhamService.ThemHinhAnhAsync(id, file);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Xóa hình ảnh của sản phẩm
    /// </summary>
    [HttpDelete("hinh-anh/{maHinhAnh:long}")]
    [RequirePermission(DomainConstants.Permissions.SanPham_Xoa)]
    public async Task<IActionResult> XoaHinhAnh([FromRoute] long maHinhAnh)
    {
        await _adminSanPhamService.XoaHinhAnhAsync(maHinhAnh);
        return Ok(new { message = "Xóa hình ảnh thành công." });
    }
}
