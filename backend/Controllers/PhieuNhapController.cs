using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Controller quản lý Phiếu nhập hàng nháp và tra cứu (W3-T4 - Kiện Minh)
/// </summary>
[ApiController]
[Route("api/phieu-nhap")]
public class PhieuNhapController : ControllerBase
{
    private readonly IPhieuNhapService _phieuNhapService;

    public PhieuNhapController(IPhieuNhapService phieuNhapService)
    {
        _phieuNhapService = phieuNhapService;
    }

    /// <summary>
    /// Tìm kiếm và phân trang danh sách phiếu nhập (Nhân viên, Quản trị viên)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> TimKiem(
        [FromQuery] string? tuKhoa,
        [FromQuery] long? maNhaCungCap,
        [FromQuery] TrangThaiPhieuNhap? trangThai,
        [FromQuery] DateTime? tuNgay,
        [FromQuery] DateTime? denNgay,
        [FromQuery] int trang = 1,
        [FromQuery] int soMoiTrang = 20,
        CancellationToken ct = default)
    {
        var result = await _phieuNhapService.TimKiemAsync(tuKhoa, maNhaCungCap, trangThai, tuNgay, denNgay, trang, soMoiTrang, ct);
        return Ok(result);
    }

    /// <summary>
    /// Xem thông tin chi tiết một phiếu nhập kèm các dòng sản phẩm (Nhân viên, Quản trị viên)
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id, CancellationToken ct = default)
    {
        var result = await _phieuNhapService.LayChiTietAsync(id, ct);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới một phiếu nhập ở trạng thái Nháp (Nhân viên, Quản trị viên)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> TaoNhap([FromBody] TaoPhieuNhapRequest request, CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _phieuNhapService.TaoNhapAsync(request, maTaiKhoan, ct);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Cập nhật thông tin đầu phiếu nhập nháp (Chỉ khi phiếu còn ở trạng thái Nháp)
    /// </summary>
    [HttpPut("{id:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> CapNhatNhap(
        [FromRoute] long id, 
        [FromBody] CapNhatPhieuNhapRequest request, 
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _phieuNhapService.CapNhatNhapAsync(id, request, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Thêm dòng sản phẩm vào phiếu nhập nháp (Tự động gộp nếu trùng sản phẩm, đơn giá và tình trạng)
    /// </summary>
    [HttpPost("{id:long}/chi-tiet")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> ThemDong(
        [FromRoute] long id, 
        [FromBody] DongNhapRequest request, 
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _phieuNhapService.ThemDongAsync(id, request, maTaiKhoan, ct);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Cập nhật một dòng sản phẩm trong phiếu nhập nháp
    /// </summary>
    [HttpPut("{id:long}/chi-tiet/{chiTietId:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> SuaDong(
        [FromRoute] long id, 
        [FromRoute] long chiTietId, 
        [FromBody] DongNhapRequest request, 
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _phieuNhapService.SuaDongAsync(id, chiTietId, request, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Xóa một dòng sản phẩm khỏi phiếu nhập nháp và tính lại tổng tiền
    /// </summary>
    [HttpDelete("{id:long}/chi-tiet/{chiTietId:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> XoaDong(
        [FromRoute] long id, 
        [FromRoute] long chiTietId, 
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _phieuNhapService.XoaDongAsync(id, chiTietId, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Hủy phiếu nhập nháp kèm lý do
    /// </summary>
    [HttpPost("{id:long}/huy")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> HuyNhap(
        [FromRoute] long id, 
        [FromBody] HuyNhapRequest request, 
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _phieuNhapService.HuyNhapAsync(id, request, maTaiKhoan, ct);
        return Ok(result);
    }

    private long LayMaTaiKhoanHienTai()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("MaTaiKhoan")?.Value;

        if (long.TryParse(claim, out var maTaiKhoan))
            return maTaiKhoan;

        throw new KhongCoQuyenException("Không xác định được danh tính người dùng từ phiên đăng nhập.");
    }
}
