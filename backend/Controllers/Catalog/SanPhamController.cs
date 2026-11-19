using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.Admin;
using GearGo.Models.DTOs.SanPham;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Catalog;

/// <summary>
/// Sản phẩm & Hình ảnh sản phẩm (hợp nhất endpoint công khai và quản lý).
/// </summary>
[ApiController]
[Route("api/san-pham")]
public class SanPhamController : BaseApiController
{
    private readonly ISanPhamService _sanPhamService;
    private readonly IAdminSanPhamService _adminSanPhamService;

    public SanPhamController(ISanPhamService sanPhamService, IAdminSanPhamService adminSanPhamService)
    {
        _sanPhamService = sanPhamService;
        _adminSanPhamService = adminSanPhamService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] TimKiemSanPhamRequest request)
    {
        var result = await _sanPhamService.TimKiemAsync(request);
        return result.ThanhCong ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{id:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById([FromRoute] long id, [FromQuery] TimKiemSanPhamRequest request)
    {
        var result = await _sanPhamService.LayChiTietAsync(id, request);
        return result.ThanhCong ? Ok(result) : NotFound(result);
    }

    [HttpGet("quan-ly")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.SanPham_Xem)]
    public async Task<IActionResult> LayDanhSach(
        [FromQuery] string? tuKhoa,
        [FromQuery] int trang = 1,
        [FromQuery] int soMoiTrang = 12)
        => Ok(await _adminSanPhamService.LayDanhSachAsync(tuKhoa, trang, soMoiTrang));

    [HttpPost]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.SanPham_Tao)]
    public async Task<IActionResult> TaoMoi([FromBody] TaoSanPhamRequest request)
        => StatusCode(201, await _adminSanPhamService.TaoMoiAsync(request));

    [HttpPut("{id:long}")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.SanPham_CapNhat)]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatSanPhamRequest request)
        => Ok(await _adminSanPhamService.CapNhatAsync(id, request));

    [HttpPatch("{id:long}/trang-thai")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.SanPham_CapNhat)]
    public async Task<IActionResult> DoiTrangThai([FromRoute] long id, [FromBody] DoiTrangThaiRequest request)
    {
        await _adminSanPhamService.DoiTrangThaiAsync(id, request.TrangThaiMoi);
        return Ok(new { message = "Cập nhật trạng thái sản phẩm thành công." });
    }

    [HttpGet("{id:long}/hinh-anh")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.SanPham_Xem)]
    public async Task<IActionResult> LayHinhAnh([FromRoute] long id)
        => Ok(await _adminSanPhamService.LayHinhAnhAsync(id));

    [HttpPost("{id:long}/hinh-anh")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.SanPham_CapNhat)]
    public async Task<IActionResult> ThemHinhAnh([FromRoute] long id, IFormFile file)
        => StatusCode(201, await _adminSanPhamService.ThemHinhAnhAsync(id, file));

    [HttpDelete("hinh-anh/{maHinhAnh:long}")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.SanPham_Xoa)]
    public async Task<IActionResult> XoaHinhAnh([FromRoute] long maHinhAnh)
    {
        await _adminSanPhamService.XoaHinhAnhAsync(maHinhAnh);
        return Ok(new { message = "Xóa hình ảnh thành công." });
    }
}
