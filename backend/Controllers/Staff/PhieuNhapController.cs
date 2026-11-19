using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Staff;

/// <summary>
/// Controller quản lý Phiếu nhập hàng nháp và xác nhận nhập kho (W3-T4 - Kiện Minh)
/// </summary>
[ApiController]
[Authorize]
[Route("api/phieu-nhap")]
public class PhieuNhapController : BaseApiController
{
    private readonly IPhieuNhapService _phieuNhapService;
    private readonly INhapKhoService _nhapKhoService;

    public PhieuNhapController(IPhieuNhapService phieuNhapService, INhapKhoService nhapKhoService)
    {
        _phieuNhapService = phieuNhapService;
        _nhapKhoService = nhapKhoService;
    }

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Xem)]
    public async Task<IActionResult> TimKiem(
        [FromQuery] string? tuKhoa,
        [FromQuery] long? maNhaCungCap,
        [FromQuery] TrangThaiPhieuNhap? trangThai,
        [FromQuery] DateTime? tuNgay,
        [FromQuery] DateTime? denNgay,
        [FromQuery] int trang = 1,
        [FromQuery] int soMoiTrang = 20,
        CancellationToken ct = default)
        => Ok(await _phieuNhapService.TimKiemAsync(tuKhoa, maNhaCungCap, trangThai, tuNgay, denNgay, trang, soMoiTrang, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Xem)]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id, CancellationToken ct = default)
        => Ok(await _phieuNhapService.LayChiTietAsync(id, ct));

    [HttpPost]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Tao)]
    public async Task<IActionResult> TaoNhap([FromBody] TaoPhieuNhapRequest request, CancellationToken ct = default)
        => StatusCode(201, await _phieuNhapService.TaoNhapAsync(request, MaTaiKhoanHienTai, ct));

    [HttpPut("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Tao)]
    public async Task<IActionResult> CapNhatNhap([FromRoute] long id, [FromBody] CapNhatPhieuNhapRequest request, CancellationToken ct = default)
        => Ok(await _phieuNhapService.CapNhatNhapAsync(id, request, MaTaiKhoanHienTai, ct));

    [HttpPost("{id:long}/chi-tiet")]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Tao)]
    public async Task<IActionResult> ThemDong([FromRoute] long id, [FromBody] DongNhapRequest request, CancellationToken ct = default)
        => StatusCode(201, await _phieuNhapService.ThemDongAsync(id, request, MaTaiKhoanHienTai, ct));

    [HttpPut("{id:long}/chi-tiet/{chiTietId:long}")]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Tao)]
    public async Task<IActionResult> SuaDong([FromRoute] long id, [FromRoute] long chiTietId, [FromBody] DongNhapRequest request, CancellationToken ct = default)
        => Ok(await _phieuNhapService.SuaDongAsync(id, chiTietId, request, MaTaiKhoanHienTai, ct));

    [HttpDelete("{id:long}/chi-tiet/{chiTietId:long}")]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Tao)]
    public async Task<IActionResult> XoaDong([FromRoute] long id, [FromRoute] long chiTietId, CancellationToken ct = default)
        => Ok(await _phieuNhapService.XoaDongAsync(id, chiTietId, MaTaiKhoanHienTai, ct));

    [HttpPost("{id:long}/huy")]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Huy)]
    public async Task<IActionResult> HuyNhap([FromRoute] long id, [FromBody] HuyNhapRequest request, CancellationToken ct = default)
        => Ok(await _phieuNhapService.HuyNhapAsync(id, request, MaTaiKhoanHienTai, ct));

    [HttpPost("{id:long}/xac-nhan")]
    [RequirePermission(DomainConstants.Permissions.PhieuNhap_Duyet)]
    public async Task<IActionResult> XacNhanNhapKho([FromRoute] long id, [FromBody] XacNhanNhapKhoRequest request)
        => HandleResult(await _nhapKhoService.XacNhanNhapKhoAsync(id, request, MaTaiKhoanHienTai), _ => 400);
}
