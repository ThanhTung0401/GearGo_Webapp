using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller quản lý và kiểm duyệt đánh giá dành riêng cho Quản trị viên (Admin)
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/danh-gia")]
[Route("api/v1/admin/danh-gia")]
public class DanhGiaController : BaseApiController
{
    private readonly IDanhGiaService _danhGiaService;

    public DanhGiaController(IDanhGiaService danhGiaService) => _danhGiaService = danhGiaService;

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.DanhGia_Xem)]
    public async Task<IActionResult> LayDanhSach([FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 10, [FromQuery] string? trangThai = null)
        => HandleResult(await _danhGiaService.AdminLayDanhSachDanhGiaAsync(trang, soMoiTrang, trangThai), LayStatusCode);

    [HttpPost("{id:long}/an")]
    [RequirePermission(DomainConstants.Permissions.DanhGia_Duyet)]
    public async Task<IActionResult> AnDanhGia([FromRoute] long id, [FromBody] AnDanhGiaRequest request)
        => HandleResult(await _danhGiaService.AnDanhGiaAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/khoi-phuc")]
    [RequirePermission(DomainConstants.Permissions.DanhGia_Duyet)]
    public async Task<IActionResult> KhoiPhucDanhGia([FromRoute] long id, [FromBody] KhoiPhucDanhGiaRequest request)
        => HandleResult(await _danhGiaService.KhoiPhucDanhGiaAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/phan-hoi")]
    [RequirePermission(DomainConstants.Permissions.DanhGia_Duyet)]
    public async Task<IActionResult> PhanHoiDanhGia([FromRoute] long id, [FromBody] PhanHoiDanhGiaRequest request)
        => HandleResult(await _danhGiaService.PhanHoiDanhGiaAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DANH_GIA_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN_KIEM_DUYET" => 403,
        _ => 400
    };
}
