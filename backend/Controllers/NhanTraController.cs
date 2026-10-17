using GearGo.Helpers;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/nhan-tra")]
[Route("api/nhan-tra")]
[Authorize(Policy = "StaffOrAdmin")]
public class NhanTraController : ControllerBase
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
    public async Task<IActionResult> LayDanhSachDotTra(long donId)
        => Ok(await _truyVanService.LayDanhSachDotTraAsync(donId, User.LayMaTaiKhoan()));

    [HttpGet("theo-don/{donId:long}/con-no")]
    public async Task<IActionResult> LayThietBiConNo(long donId)
        => Ok(await _truyVanService.LayThietBiConNoAsync(donId, User.LayMaTaiKhoan()));

    // ─── CÁC ENDPOINT THAO TÁC (COMMAND) ───

    [HttpPost("theo-don/{donId:long}")]
    public async Task<IActionResult> TaoPhieuNhanTraNhap(
        long donId, [FromBody] TaoNhanTraRequest request)
    {
        var result = await _nhanTraService.TaoPhieuNhanTraNhapAsync(donId, request, User.LayMaTaiKhoan());
        return result.ThanhCong ? Ok(result.DuLieu) : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPut("{phieuId:long}")]
    public async Task<IActionResult> CapNhatPhieuNhanTraNhap(
        long phieuId, [FromBody] CapNhatPhieuNhanTraRequest request)
    {
        var result = await _nhanTraService.CapNhatPhieuNhanTraNhapAsync(phieuId, request, User.LayMaTaiKhoan());
        return result.ThanhCong ? Ok(result.DuLieu) : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{phieuId:long}/tach-cho-xu-ly")]
    public async Task<IActionResult> TachDongChoXuLy(
        long phieuId, [FromBody] TachDongChoXuLyRequest request)
    {
        var result = await _nhanTraService.TachDongChoXuLyAsync(phieuId, request, User.LayMaTaiKhoan());
        return result.ThanhCong ? Ok(result.DuLieu) : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{phieuId:long}/chi-tiet/{chiTietId:long}/duyet-mat")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DuyetKetLuanMat(
        long phieuId, long chiTietId, [FromBody] DuyetMatRequest request)
    {
        var result = await _nhanTraService.DuyetKetLuanMatAsync(phieuId, chiTietId, request, User.LayMaTaiKhoan());
        return result.ThanhCong ? Ok(result.DuLieu) : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{phieuId:long}/chot")]
    public async Task<IActionResult> ChotNhanTra(long phieuId)
    {
        var result = await _nhanTraService.ChotNhanTraAsync(phieuId, User.LayMaTaiKhoan());
        return result.ThanhCong ? Ok(result.DuLieu) : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_NOT_FOUND" or "PHIEU_NOT_FOUND" or "CHI_TIET_NOT_FOUND" or "PHU_PHI_NOT_FOUND" or "NHAN_VIEN_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" => 403,
        "DONG_DA_CO_PHIEU_NHAN" or "PHIEU_NHAN_DA_CHOT" or "KET_LUAN_MAT_CHUA_DU" or "THIET_BI_DA_TRA" or "INVALID_STATE" => 409,
        _ => 400
    };
}
