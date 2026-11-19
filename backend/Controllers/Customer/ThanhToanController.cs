using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Customer;

[ApiController]
[Route("api/v1/thanh-toan")]
[Route("api/thanh-toan")]
public class ThanhToanController : BaseApiController
{
    private readonly IThanhToanService _thanhToanService;

    public ThanhToanController(IThanhToanService thanhToanService) => _thanhToanService = thanhToanService;

    [HttpPost("xac-nhan")]
    [Authorize]
    public async Task<IActionResult> XacNhanThanhToan([FromBody] XacNhanThanhToanRequest request)
    {
        var result = await _thanhToanService.XacNhanThanhToanAsync(request);
        return result.ThanhCong
            ? Ok(new { MaThanhToan = result.DuLieu, ThongDiep = "Thanh toán thành công!" })
            : BadRequest(new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("doi-soat/{doiSoatId:long}/thu-bo-sung")]
    [Authorize]
    public async Task<IActionResult> TaoThuBoSung(long doiSoatId, [FromBody] TaoThuBoSungRequest? request)
    {
        var req = request ?? new TaoThuBoSungRequest();
        req.MaDoiSoat = doiSoatId;
        return HandleResult(await _thanhToanService.TaoThuBoSungAsync(req, MaTaiKhoanHienTai), LayStatusCode);
    }

    [HttpGet("{id}/trang-thai")]
    [Authorize]
    public async Task<IActionResult> LayTrangThaiGiaoDich(string id)
        => HandleResult(await _thanhToanService.LayTrangThaiGiaoDichAsync(id, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("callback/thu-bo-sung")]
    [AllowAnonymous]
    public async Task<IActionResult> CallbackThuBoSung([FromBody] XuLyCallbackRequest request)
        => HandleResult(await _thanhToanService.XuLyCallbackThuBoSungAsync(request), LayStatusCode);

    [HttpGet("can-doi-chieu")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DoiSoat_Xem)]
    public async Task<IActionResult> LayDanhSachCanDoiChieu()
        => HandleResult(await _thanhToanService.LayDanhSachCanDoiChieuAsync(MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/doi-chieu")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DoiSoat_Chot)]
    public async Task<IActionResult> DoiChieuGiaoDich(long id, [FromBody] DoiChieuGiaoDichRequest request)
    {
        var result = await _thanhToanService.DoiChieuGiaoDichAsync(id, request, MaTaiKhoanHienTai);
        return result.ThanhCong
            ? Ok(new { ThongDiep = result.DuLieu })
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_THUE_NOT_FOUND" or "DOI_SOAT_NOT_FOUND" or "GIAO_DICH_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" => 403,
        "KHONG_CO_NGHIA_VU_THU_THEM" or "THU_THEM_DANG_CHO" or "SO_TIEN_GATEWAY_KHONG_KHOP" or "TIEN_VE_SAU_HUY" => 409,
        _ => 400
    };
}
