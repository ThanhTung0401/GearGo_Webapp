using System.Security.Claims;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.VongDoiThietBi;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Inventory;

[ApiController]
[Route("api/vong-doi-thiet-bi")]
[Authorize]
public class VongDoiThietBiController : BaseApiController
{
    private readonly IVongDoiThietBiService _vongDoiService;

    public VongDoiThietBiController(IVongDoiThietBiService vongDoiService)
    {
        _vongDoiService = vongDoiService;
    }

    [HttpGet("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_Xem)]
    public async Task<IActionResult> LayHoSoVongDoi(long id)
    {
        bool laAdmin = User.FindFirstValue(ClaimTypes.Role) == "QuanTriVien";
        return HandleResult(await _vongDoiService.LayHoSoVongDoiAsync(id, laAdmin));
    }

    [HttpPost("{id:long}/xem-anh-huong")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_Xem)]
    public async Task<IActionResult> XemAnhHuongThayDoi(long id, [FromBody] XemAnhHuongThayDoiRequest request)
        => HandleResult(await _vongDoiService.XemAnhHuongThayDoiAsync(id, request));

    [HttpPost("{id:long}/de-nghi-giang-cap")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_CapNhat)]
    public async Task<IActionResult> DeNghiGiangCap(long id, [FromBody] DeNghiGiangCapRequest request)
        => HandleCreatedResult(await _vongDoiService.DeNghiGiangCapAsync(id, request, MaTaiKhoanHienTai));

    /// <summary>
    /// UC6.15: Đề nghị điều chuyển thiết bị sang sản phẩm khác (tái sử dụng kiểm tra cam kết & phiếu điều chỉnh vòng đời).
    /// </summary>
    [HttpPost("{id:long}/dieu-chuyen-san-pham")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_CapNhat)]
    public async Task<IActionResult> DeNghiDieuChuyenSanPham(long id, [FromBody] DeNghiGiangCapRequest request)
        => HandleCreatedResult(await _vongDoiService.DeNghiGiangCapAsync(id, request, MaTaiKhoanHienTai));

    [HttpPost("{id:long}/de-nghi-ngung-su-dung")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_CapNhat)]
    public async Task<IActionResult> DeNghiNgungSuDung(long id, [FromBody] DeNghiNgungSuDungRequest request)
        => HandleCreatedResult(await _vongDoiService.DeNghiNgungSuDungAsync(id, request, MaTaiKhoanHienTai));

    [HttpPost("de-nghi/{maPhieuDieuChinh:long}/duyet")]
    [RequirePermission(DomainConstants.Permissions.VongDoiThietBi_CapNhat)]
    public async Task<IActionResult> DuyetDeNghiVongDoi(long maPhieuDieuChinh)
        => HandleResult(await _vongDoiService.DuyetDeNghiVongDoiAsync(maPhieuDieuChinh, MaTaiKhoanHienTai));
}

