using System;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.ChinhSach;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Marketing;

/// <summary>
/// Chính sách thuê theo phiên bản (hợp nhất endpoint công khai hien-hanh và quản lý).
/// </summary>
[ApiController]
[Route("api/chinh-sach")]
public class ChinhSachController : BaseApiController
{
    private readonly IChinhSachService _service;

    public ChinhSachController(IChinhSachService service) => _service = service;

    /// <summary>Trả chính sách hiện hành, chỉ phần điều kiện thuê dành cho khách.</summary>
    [HttpGet("hien-hanh")]
    [AllowAnonymous]
    public async Task<IActionResult> LayHienHanh(CancellationToken ct = default)
    {
        var kq = await _service.LayDangHieuLucAsync(DateTime.UtcNow, ct);
        if (!kq.ThanhCong || kq.DuLieu is null)
        {
            var code = kq.MaLoi == "CHUA_CO_CHINH_SACH_HIEU_LUC" ? 409 : 400;
            return StatusCode(code, new { kq.MaLoi, kq.ThongDiep });
        }

        var cs = kq.DuLieu;
        return Ok(new
        {
            maChinhSach = cs.MaChinhSach,
            phienBan = cs.PhienBan,
            tenChinhSach = cs.TenChinhSach,
            thoiDiemApDung = cs.ThoiDiemApDung,
            dieuKhoanChoKhach = new DieuKhoanChoKhachDto
            {
                ThoiGianGiuChoPhut = cs.NoiDung?.ThoiGianGiuChoPhut,
                HeSoTre = cs.NoiDung?.HeSoTre,
                TyLeCocPhanTram = cs.NoiDung?.TyLeCocPhanTram,
                HuyDon = cs.NoiDung?.HuyDon,
                KhongDenNhan = cs.NoiDung?.KhongDenNhan,
                MocNhac = cs.NoiDung?.MocNhac
            }
        });
    }

    [HttpGet]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.ChinhSach_Xem)]
    public async Task<IActionResult> LayDanhSach([FromQuery] int trang = 1, [FromQuery] int kichThuoc = 20, CancellationToken ct = default)
        => HandleResult(await _service.LayDanhSachAsync(trang, kichThuoc, ct), LayStatusCode);

    [HttpGet("{id:long}")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.ChinhSach_Xem)]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id, CancellationToken ct = default)
        => HandleResult(await _service.LayChiTietAsync(id, ct), LayStatusCode);

    [HttpPost("kiem-tra")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.ChinhSach_Quan)]
    public async Task<IActionResult> KiemTra([FromBody] TaoChinhSachRequest request, CancellationToken ct = default)
        => ModelState.IsValid
            ? HandleResult(await _service.KiemTraNoiDungAsync(request, MaTaiKhoanHienTai, ct), LayStatusCode)
            : BadRequest(ModelState);

    [HttpPost]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.ChinhSach_Quan)]
    public async Task<IActionResult> TaoMoi([FromBody] TaoChinhSachRequest request, CancellationToken ct = default)
        => ModelState.IsValid
            ? HandleCreatedResult(await _service.TaoPhienBanAsync(request, MaTaiKhoanHienTai, ct), LayStatusCode)
            : BadRequest(ModelState);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "CHINH_SACH_NOT_FOUND" => 404,
        "CHUA_CO_CHINH_SACH_HIEU_LUC" or "PHIEN_BAN_XUNG_DOT" or "BAO_GIA_DIEU_KHOAN_DA_DOI" => 409,
        DomainConstants.Errors.Forbidden => 403,
        _ => 400
    };
}
