using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Report;

/// <summary>
/// Báo cáo tài chính và số dư cần xử lý (hợp nhất các endpoint tài chính).
/// Các endpoint chỉ đọc số liệu và xuất CSV, không thay đổi trạng thái chứng từ hoặc giao dịch.
/// </summary>
[ApiController]
[Authorize]
[Route("api/bao-cao/tai-chinh")]
public class BaoCaoTaiChinhController : BaseApiController
{
    private readonly IBaoCaoTaiChinhService _baoCaoTaiChinhService;

    public BaoCaoTaiChinhController(IBaoCaoTaiChinhService baoCaoTaiChinhService) => _baoCaoTaiChinhService = baoCaoTaiChinhService;

    [HttpGet("doanh-thu-hoan-tat")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoTaiChinh_Xem)]
    public async Task<IActionResult> LayDoanhThuHoanTat([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayDoanhThuHoanTatAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("phi-huy")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoTaiChinh_Xem)]
    public async Task<IActionResult> LayPhiHuy([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayPhiHuyAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("dieu-chinh")]
    [HttpGet("dieu-chinh-doanh-thu")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoTaiChinh_Xem)]
    public async Task<IActionResult> LayDieuChinhDoanhThu([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayDieuChinhDoanhThuAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("thu-hoan")]
    [HttpGet("dong-tien")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoTaiChinh_Xem)]
    public async Task<IActionResult> LayThuHoan([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayThuHoanAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("coc-chua-tat-toan")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoTaiChinh_Xem)]
    public async Task<IActionResult> LayCocChuaTatToan([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayCocChuaTatToanAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("can-xu-ly")]
    [HttpGet("khoan-can-xu-ly")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoTaiChinh_Xem)]
    public async Task<IActionResult> LayKhoanCanXuLy([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayKhoanCanXuLyAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("xuat-csv")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoTaiChinh_Xuat)]
    public async Task<IActionResult> XuatCsv([FromQuery] XuatCsvTaiChinhRequest request)
    {
        var result = await _baoCaoTaiChinhService.XuatCsvAsync(request, MaTaiKhoanHienTai);
        if (!result.ThanhCong)
            return HandleResult(result);

        var tep = result.DuLieu!;
        return File(tep.NoiDung, tep.ContentType, tep.TenTep);
    }
}
