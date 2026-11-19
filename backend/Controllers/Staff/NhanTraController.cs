using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Staff;

[ApiController]
[Route("api/v1/nhan-tra")]
[Route("api/nhan-tra")]
[Authorize]
public class NhanTraController : BaseApiController
{
    private readonly INhanTraService _nhanTraService;
    private readonly ITruyVanNhanTraService _truyVanService;

    public NhanTraController(
        INhanTraService nhanTraService,
        ITruyVanNhanTraService truyVanService)
    {
        _nhanTraService = nhanTraService;
        _truyVanService = truyVanService;
    }

    // ─── CÁC ENDPOINT TRUY VẤN (QUERY - CQRS LITE) ───

    [HttpGet("theo-don/{donId:long}")]
    [RequirePermission(DomainConstants.Permissions.NhanTra_Xem)]
    public async Task<IActionResult> LayDanhSachDotTra(long donId)
        => Ok(await _truyVanService.LayDanhSachDotTraAsync(donId, MaTaiKhoanHienTai));

    [HttpGet("theo-don/{donId:long}/con-no")]
    [RequirePermission(DomainConstants.Permissions.NhanTra_Xem)]
    public async Task<IActionResult> LayThietBiConNo(long donId)
        => Ok(await _truyVanService.LayThietBiConNoAsync(donId, MaTaiKhoanHienTai));

    // ─── CÁC ENDPOINT THAO TÁC (COMMAND) ───

    [HttpPost("theo-don/{donId:long}")]
    [RequirePermission(DomainConstants.Permissions.NhanTra_Thao)]
    public async Task<IActionResult> TaoPhieuNhanTraNhap(long donId, [FromBody] TaoNhanTraRequest request)
        => HandleResult(await _nhanTraService.TaoPhieuNhanTraNhapAsync(donId, request, MaTaiKhoanHienTai));

    [HttpPut("{phieuId:long}")]
    [RequirePermission(DomainConstants.Permissions.NhanTra_Thao)]
    public async Task<IActionResult> CapNhatPhieuNhanTraNhap(long phieuId, [FromBody] CapNhatPhieuNhanTraRequest request)
        => HandleResult(await _nhanTraService.CapNhatPhieuNhanTraNhapAsync(phieuId, request, MaTaiKhoanHienTai));

    [HttpPost("{phieuId:long}/tach-cho-xu-ly")]
    [RequirePermission(DomainConstants.Permissions.NhanTra_Thao)]
    public async Task<IActionResult> TachDongChoXuLy(long phieuId, [FromBody] TachDongChoXuLyRequest request)
        => HandleResult(await _nhanTraService.TachDongChoXuLyAsync(phieuId, request, MaTaiKhoanHienTai));

    [HttpPost("{phieuId:long}/chi-tiet/{chiTietId:long}/duyet-mat")]
    [RequirePermission(DomainConstants.Permissions.NhanTra_Thao)]
    public async Task<IActionResult> DuyetKetLuanMat(long phieuId, long chiTietId, [FromBody] DuyetMatRequest request)
        => HandleResult(await _nhanTraService.DuyetKetLuanMatAsync(phieuId, chiTietId, request, MaTaiKhoanHienTai));

    [HttpPost("{phieuId:long}/chot")]
    [RequirePermission(DomainConstants.Permissions.NhanTra_Thao)]
    public async Task<IActionResult> ChotNhanTra(long phieuId)
        => HandleResult(await _nhanTraService.ChotNhanTraAsync(phieuId, MaTaiKhoanHienTai));
}
