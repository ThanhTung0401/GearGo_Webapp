using GearGo.Helpers;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Staff;

/// <summary>
/// API Đối soát tiền cọc, hoàn tất đơn thuê và điều chỉnh đối soát (UC15 - Kim Xuyến)
/// </summary>
[ApiController]
[Route("api/v1/doi-soat")]
[Route("api/doi-soat")]
[Authorize]
public class DoiSoatController : BaseApiController
{
    private readonly IDoiSoatService _doiSoatService;

    public DoiSoatController(IDoiSoatService doiSoatService) => _doiSoatService = doiSoatService;

    [HttpGet("theo-don/{donId:long}/xem-truoc")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> XemTruoc(long donId)
        => HandleResult(await _doiSoatService.XemTruocAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("theo-don/{donId:long}")]
    public async Task<IActionResult> LayTheoDon(long donId)
        => HandleResult(await _doiSoatService.LayTheoDonAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayTheoId(long id)
        => HandleResult(await _doiSoatService.LayTheoIdAsync(id, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("theo-don/{donId:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LapDoiSoat(long donId, [FromBody] LapDoiSoatRequest? request)
    {
        var dto = request ?? new LapDoiSoatRequest { MaDonThue = donId };
        dto.MaDonThue = donId;
        return HandleCreatedResult(await _doiSoatService.LapDoiSoatAsync(dto, MaTaiKhoanHienTai), LayStatusCode);
    }

    [HttpPost("{id:long}/xac-nhan")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> XacNhanBangTinh(long id, [FromBody] XacNhanDoiSoatRequest? request)
        => HandleResult(await _doiSoatService.XacNhanBangTinhAsync(id, request ?? new XacNhanDoiSoatRequest(), MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/xu-ly-tien")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> YeuCauXuLyTien(long id)
        => HandleResult(await _doiSoatService.YeuCauXuLyTienAsync(id, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/chot")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> ChotDoiSoat(long id)
        => HandleResult(await _doiSoatService.ChotDoiSoatAsync(id, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/dieu-chinh")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> LapDoiSoatDieuChinh(long id, [FromBody] DieuChinhDoiSoatRequest request)
        => HandleCreatedResult(await _doiSoatService.LapDoiSoatDieuChinhAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_KHONG_TIM_THAY" or "DOI_SOAT_NOT_FOUND" or "CHUA_CO_DOI_SOAT" => 404,
        "KHONG_CO_QUYEN" => 403,
        "DOI_SOAT_CHUA_DU_DIEU_KIEN" or "DOI_SOAT_DA_CHOT" or "DOI_SOAT_CHUA_CHOT"
            or "BANG_TINH_DA_THAY_DOI" or "GIAO_DICH_CHUA_RO_KET_QUA"
            or "PHI_DANG_TRANH_CHAP" or "THU_THEM_DANG_CHO" or "KHONG_CO_PHI_DIEU_CHINH" => 409,
        _ => 400
    };
}
