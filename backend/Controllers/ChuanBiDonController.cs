using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Controller chuẩn bị đơn và phân công thiết bị (W3-T7 - Kim Xuyến)
/// Toàn bộ endpoint chỉ dành cho NhanVien và QuanTriVien
/// </summary>
[ApiController]
[Route("api/chuan-bi-don")]
[Authorize(Policy = "StaffOrAdmin")]
public class ChuanBiDonController : ControllerBase
{
    private readonly IChuanBiDonService _chuanBiDonService;

    public ChuanBiDonController(IChuanBiDonService chuanBiDonService)
    {
        _chuanBiDonService = chuanBiDonService;
    }

    /// <summary>
    /// Xem tình trạng chuẩn bị hiện tại của đơn (từng dòng: cần/đã gán/còn thiếu)
    /// </summary>
    [HttpGet("{donId:long}")]
    public async Task<IActionResult> LayTinhTrang(
        [FromRoute] long donId,
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoan();
        var result = await _chuanBiDonService.LayTinhTrangChuanBiAsync(donId, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Bắt đầu chuẩn bị đơn: chuyển DaXacNhan → DangChuanBi
    /// </summary>
    [HttpPost("{donId:long}/bat-dau")]
    public async Task<IActionResult> BatDauChuanBi(
        [FromRoute] long donId,
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoan();
        var result = await _chuanBiDonService.BatDauChuanBiAsync(donId, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Gán một hoặc nhiều thiết bị vào dòng đơn thuê
    /// </summary>
    [HttpPost("{donId:long}/phan-cong")]
    public async Task<IActionResult> GanThietBi(
        [FromRoute] long donId,
        [FromBody] GanThietBiRequest request,
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoan();
        var result = await _chuanBiDonService.GanThietBiAsync(donId, request, maTaiKhoan, ct);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Hủy một phân công thiết bị (giữ lại lịch sử, không xóa)
    /// </summary>
    [HttpPost("{donId:long}/phan-cong/{phanCongId:long}/huy")]
    public async Task<IActionResult> HuyPhanCong(
        [FromRoute] long donId,
        [FromRoute] long phanCongId,
        [FromBody] HuyPhanCongRequest request,
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoan();
        var result = await _chuanBiDonService.HuyPhanCongAsync(donId, phanCongId, request, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Thay thế thiết bị đã gán bằng thiết bị khác (bắt buộc lý do)
    /// </summary>
    [HttpPost("{donId:long}/phan-cong/{phanCongId:long}/thay-the")]
    public async Task<IActionResult> ThayTheThietBi(
        [FromRoute] long donId,
        [FromRoute] long phanCongId,
        [FromBody] ThayTheRequest request,
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoan();
        var result = await _chuanBiDonService.ThayTheThietBiAsync(donId, phanCongId, request, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra điều kiện và xác nhận đơn sẵn sàng nhận hàng (DangChuanBi → SanSangNhan)
    /// </summary>
    [HttpPost("{donId:long}/san-sang")]
    public async Task<IActionResult> XacNhanSanSang(
        [FromRoute] long donId,
        [FromBody] XacNhanSanSangRequest request,
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoan();
        var result = await _chuanBiDonService.XacNhanSanSangAsync(donId, request, maTaiKhoan, ct);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER — lấy mã tài khoản từ JWT (giống pattern của Kiện Minh)
    // ─────────────────────────────────────────────────────────────────────────
    private long LayMaTaiKhoan()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("MaTaiKhoan")?.Value;

        if (long.TryParse(claim, out var maTaiKhoan))
            return maTaiKhoan;

        throw new KhongCoQuyenException("Không xác định được danh tính người dùng từ phiên đăng nhập.");
    }
}
