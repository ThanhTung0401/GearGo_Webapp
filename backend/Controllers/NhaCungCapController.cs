using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Models.DTOs.NhaCungCap;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Controller quản lý Nhà cung cấp (W3-T3 - Kiện Minh)
/// </summary>
[ApiController]
[Route("api/nha-cung-cap")]
public class NhaCungCapController : ControllerBase
{
    private readonly INhaCungCapService _nhaCungCapService;

    public NhaCungCapController(INhaCungCapService nhaCungCapService)
    {
        _nhaCungCapService = nhaCungCapService;
    }

    /// <summary>
    /// Tìm kiếm và phân trang danh sách nhà cung cấp (Nhân viên, Quản trị viên)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> TimKiem(
        [FromQuery] string? tuKhoa, 
        [FromQuery] string? trangThaiHopTac, 
        [FromQuery] int trang = 1, 
        [FromQuery] int soMoiTrang = 20,
        CancellationToken ct = default)
    {
        var result = await _nhaCungCapService.TimKiemAsync(tuKhoa, trangThaiHopTac, trang, soMoiTrang, ct);
        return Ok(result);
    }

    /// <summary>
    /// Xem chi tiết thông tin một nhà cung cấp (Nhân viên, Quản trị viên)
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id, CancellationToken ct = default)
    {
        var result = await _nhaCungCapService.LayChiTietAsync(id, ct);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới một nhà cung cấp (Chỉ Quản trị viên)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> TaoMoi([FromBody] TaoNhaCungCapRequest request, CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _nhaCungCapService.TaoAsync(request, maTaiKhoan, ct);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Cập nhật thông tin chi tiết nhà cung cấp (Chỉ Quản trị viên)
    /// </summary>
    [HttpPut("{id:long}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CapNhat(
        [FromRoute] long id, 
        [FromBody] CapNhatNhaCungCapRequest request, 
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _nhaCungCapService.CapNhatAsync(id, request, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Đổi trạng thái hợp tác của nhà cung cấp (Chỉ Quản trị viên)
    /// </summary>
    [HttpPut("{id:long}/trang-thai-hop-tac")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DoiTrangThaiHopTac(
        [FromRoute] long id, 
        [FromBody] DoiHopTacRequest request, 
        CancellationToken ct = default)
    {
        var maTaiKhoan = LayMaTaiKhoanHienTai();
        var result = await _nhaCungCapService.DoiTrangThaiHopTacAsync(id, request, maTaiKhoan, ct);
        return Ok(result);
    }

    /// <summary>
    /// Tra cứu lịch sử nhập hàng thực tế từ nhà cung cấp (Nhân viên, Quản trị viên)
    /// </summary>
    [HttpGet("{id:long}/lich-su-nhap")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LayLichSuNhap(
        [FromRoute] long id, 
        [FromQuery] int trang = 1, 
        [FromQuery] int soMoiTrang = 20, 
        CancellationToken ct = default)
    {
        var result = await _nhaCungCapService.LayLichSuNhapAsync(id, trang, soMoiTrang, ct);
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
