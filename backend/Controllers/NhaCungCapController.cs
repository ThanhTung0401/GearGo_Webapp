using GearGo.Helpers;
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
public class NhaCungCapController : BaseApiController
{
    private readonly INhaCungCapService _nhaCungCapService;

    public NhaCungCapController(INhaCungCapService nhaCungCapService) => _nhaCungCapService = nhaCungCapService;

    [HttpGet]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> TimKiem(
        [FromQuery] string? tuKhoa, [FromQuery] string? trangThaiHopTac, [FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 20, CancellationToken ct = default)
        => Ok(await _nhaCungCapService.TimKiemAsync(tuKhoa, trangThaiHopTac, trang, soMoiTrang, ct));

    [HttpGet("{id:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id, CancellationToken ct = default)
        => Ok(await _nhaCungCapService.LayChiTietAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> TaoMoi([FromBody] TaoNhaCungCapRequest request, CancellationToken ct = default)
        => StatusCode(201, await _nhaCungCapService.TaoAsync(request, MaTaiKhoanHienTai, ct));

    [HttpPut("{id:long}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatNhaCungCapRequest request, CancellationToken ct = default)
        => Ok(await _nhaCungCapService.CapNhatAsync(id, request, MaTaiKhoanHienTai, ct));

    [HttpPut("{id:long}/trang-thai-hop-tac")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DoiTrangThaiHopTac([FromRoute] long id, [FromBody] DoiHopTacRequest request, CancellationToken ct = default)
        => Ok(await _nhaCungCapService.DoiTrangThaiHopTacAsync(id, request, MaTaiKhoanHienTai, ct));

    [HttpGet("{id:long}/lich-su-nhap")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LayLichSuNhap([FromRoute] long id, [FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 20, CancellationToken ct = default)
        => Ok(await _nhaCungCapService.LayLichSuNhapAsync(id, trang, soMoiTrang, ct));
}
