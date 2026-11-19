using System.Security.Claims;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.Kho;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Inventory;

/// <summary>
/// Controller theo dõi kho, kiểm kê và phân tích khả dụng (W5-T4 - Minh Tú)
/// </summary>
[ApiController]
[Route("api/kho")]
[Authorize]
public class KhoController : BaseApiController
{
    private readonly IKhoService _khoService;

    public KhoController(IKhoService khoService)
    {
        _khoService = khoService;
    }

    /// <summary>
    /// Thống kê tổng quan số lượng thiết bị theo trạng thái
    /// </summary>
    [HttpGet("tong-quan")]
    [RequirePermission(DomainConstants.Permissions.Kho_Xem)]
    public async Task<IActionResult> LayTongQuanKho([FromQuery] LocKhoRequest request)
    {
        bool laAdmin = User.FindFirstValue(ClaimTypes.Role) == "QuanTriVien";
        return HandleResult(await _khoService.LayTongQuanKhoAsync(request, MaTaiKhoanHienTai, laAdmin));
    }

    /// <summary>
    /// Danh sách thiết bị trong kho phân trang kèm bộ lọc
    /// </summary>
    [HttpGet("thiet-bi")]
    [RequirePermission(DomainConstants.Permissions.Kho_Xem)]
    public async Task<IActionResult> TimThietBi([FromQuery] LocKhoRequest request)
    {
        bool laAdmin = User.FindFirstValue(ClaimTypes.Role) == "QuanTriVien";
        return HandleResult(await _khoService.TimThietBiAsync(request, MaTaiKhoanHienTai, laAdmin));
    }

    /// <summary>
    /// Đối chiếu quét mã kiểm kê thực tế tại kho (chỉ phân tích, không sửa DB)
    /// </summary>
    [HttpPost("kiem-ke/doi-chieu")]
    [RequirePermission(DomainConstants.Permissions.Kho_Quan)]
    public async Task<IActionResult> DoiChieuKiemKe([FromBody] DoiChieuKiemKeRequest request)
    {
        return HandleResult(await _khoService.LayDoiChieuKiemKeAsync(request, MaTaiKhoanHienTai));
    }

    /// <summary>
    /// Giả lập và phân tích ảnh hưởng cam kết đơn thuê khi loại trừ thiết bị hoặc giáng cấp
    /// </summary>
    [HttpPost("dieu-chinh/xem-anh-huong")]
    [RequirePermission(DomainConstants.Permissions.Kho_Quan)]
    public async Task<IActionResult> XemAnhHuongThayDoi([FromBody] PhanTichAnhHuongRequest request)
    {
        return HandleResult(await _khoService.PhanTichAnhHuongAsync(request, MaTaiKhoanHienTai));
    }
}

