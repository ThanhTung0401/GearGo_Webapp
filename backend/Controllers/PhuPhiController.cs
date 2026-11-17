using GearGo.Helpers;
using GearGo.Models.DTOs.PhuPhi;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// API Quản lý phụ phí, duyệt phí và giải quyết tranh chấp (UC14 - Kiện Minh)
/// </summary>
[ApiController]
[Route("api/v1/phu-phi")]
[Route("api/phu-phi")]
[Authorize]
public class PhuPhiController : BaseApiController
{
    private readonly IPhuPhiService _phuPhiService;

    public PhuPhiController(IPhuPhiService phuPhiService) => _phuPhiService = phuPhiService;

    [HttpGet("theo-don/{donId:long}")]
    public async Task<IActionResult> LayTheoDon(long donId)
        => HandleResult(await _phuPhiService.LayDanhSachPhuPhiTheoDonAsync(donId, MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("goi-y")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> GoiYPhi([FromQuery] long maChiTietBanGiao)
        => HandleResult(await _phuPhiService.GoiYPhiAsync(maChiTietBanGiao, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LapPhi([FromBody] LapPhuPhiRequest request)
        => HandleCreatedResult(await _phuPhiService.LapPhiAsync(request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPut("{id:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> CapNhatPhi(long id, [FromBody] CapNhatPhuPhiRequest request)
        => HandleResult(await _phuPhiService.CapNhatPhiChuaDuyetAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/duyet")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> DuyetPhi(long id, [FromBody] DuyetPhuPhiRequest request)
        => HandleResult(await _phuPhiService.DuyetPhiAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/tu-choi")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> TuChoiPhi(long id, [FromBody] DuyetPhuPhiRequest request)
        => HandleResult(await _phuPhiService.TuChoiPhiAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/tranh-chap")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> TaoTranhChap(long id, [FromBody] TranhChapRequest request)
        => HandleResult(await _phuPhiService.TaoTranhChapAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/giai-quyet-tranh-chap")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GiaiQuyetTranhChap(long id, [FromBody] GiaiQuyetTranhChapRequest request)
        => HandleResult(await _phuPhiService.GiaiQuyetTranhChapAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/dieu-chinh")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> LapDieuChinhPhi(long id, [FromBody] DieuChinhPhiRequest request)
        => HandleCreatedResult(await _phuPhiService.LapDieuChinhPhiAsync(id, request, MaTaiKhoanHienTai), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_KHONG_TIM_THAY" or "PHU_PHI_NOT_FOUND" or "CHI_TIET_BAN_GIAO_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" or "VUOT_QUYEN_DUYET_PHI" => 403,
        "PHI_TRUNG_TON_THAT" or "PHI_DA_DUYET" or "PHI_DA_KHOA_DOI_SOAT" or "PHI_DA_XU_LY" or "PHI_DANG_TRANH_CHAP" => 409,
        _ => 400
    };
}
