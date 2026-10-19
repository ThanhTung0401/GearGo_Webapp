using System.Security.Claims;
using GearGo.Helpers;
using GearGo.Models.DTOs.VongDoiThietBi;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/vong-doi-thiet-bi")]
[Route("api/v1/vong-doi-thiet-bi")]
[Authorize(Policy = "StaffOrAdmin")]
public class VongDoiThietBiController : ControllerBase
{
    private readonly IVongDoiThietBiService _vongDoiService;

    public VongDoiThietBiController(IVongDoiThietBiService vongDoiService)
    {
        _vongDoiService = vongDoiService;
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayHoSoVongDoi(long id)
    {
        bool laAdmin = User.FindFirstValue(ClaimTypes.Role) == "QuanTriVien";
        var result = await _vongDoiService.LayHoSoVongDoiAsync(id, laAdmin);
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{id:long}/xem-anh-huong")]
    public async Task<IActionResult> XemAnhHuongThayDoi(long id, [FromBody] XemAnhHuongThayDoiRequest request)
    {
        var result = await _vongDoiService.XemAnhHuongThayDoiAsync(id, request);
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{id:long}/de-nghi-giang-cap")]
    public async Task<IActionResult> DeNghiGiangCap(long id, [FromBody] DeNghiGiangCapRequest request)
    {
        var result = await _vongDoiService.DeNghiGiangCapAsync(id, request, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? StatusCode(201, result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{id:long}/de-nghi-ngung-su-dung")]
    public async Task<IActionResult> DeNghiNgungSuDung(long id, [FromBody] DeNghiNgungSuDungRequest request)
    {
        var result = await _vongDoiService.DeNghiNgungSuDungAsync(id, request, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? StatusCode(201, result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("de-nghi/{maPhieuDieuChinh:long}/duyet")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DuyetDeNghiVongDoi(long maPhieuDieuChinh)
    {
        var result = await _vongDoiService.DuyetDeNghiVongDoiAsync(maPhieuDieuChinh, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "THIET_BI_NOT_FOUND" or "PHIEU_NOT_FOUND" or "NHAN_VIEN_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" => 403,
        "THIET_BI_CHUA_THU_HOI" or "THAY_DOI_LAM_THIEU_CAM_KET" or "INVALID_STATE" => 409,
        _ => 400
    };
}
