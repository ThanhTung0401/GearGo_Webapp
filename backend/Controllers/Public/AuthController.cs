using GearGo.Helpers;
using GearGo.Models.DTOs.Auth;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GearGo.Controllers.Public;

[ApiController]
[Route("api/auth")]
public class AuthController : BaseApiController
{
    private readonly IXacThucService _xacThuc;
    private readonly IPermissionService _permissionService;

    public AuthController(IXacThucService xacThuc, IPermissionService permissionService)
    {
        _xacThuc = xacThuc;
        _permissionService = permissionService;
    }

    [HttpPost("dang-ky")]
    public async Task<IActionResult> DangKy([FromBody] DangKyRequest req)
    {
        var result = await _xacThuc.DangKyAsync(req);
        if (!result.ThanhCong)
            return StatusCode(result.MaLoi == "RATE_LIMIT_VUOT_MUC" ? 429 : 409, new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
        return CreatedAtAction(nameof(DangKy), result.DuLieu);
    }

    [HttpPost("dang-nhap")]
    public async Task<IActionResult> DangNhap([FromBody] DangNhapRequest req)
        => HandleResult(await _xacThuc.DangNhapAsync(req), maLoi => maLoi is "TAI_KHOAN_BI_KHOA" or "TAM_KHOA" ? 403 : 401);

    [HttpPost("quen-mat-khau")]
    public async Task<IActionResult> QuenMatKhau([FromBody] QuenMatKhauRequest req)
        => Ok(new { thongDiep = (await _xacThuc.TaoTokenQuenMatKhauAsync(req.Email)).DuLieu });

    [HttpPost("xac-thuc-otp")]
    public async Task<IActionResult> XacThucOtp([FromBody] XacThucOtpRequest req)
    {
        var result = await _xacThuc.XacThucOtpAsync(req.Email, req.Otp);
        return result.ThanhCong
            ? Ok(new { thongDiep = "Xác minh mã OTP thành công.", token = result.DuLieu })
            : BadRequest(new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
    }

    [HttpPost("dat-lai-mat-khau")]
    public async Task<IActionResult> DatLaiMatKhau([FromBody] DatLaiMatKhauRequest req)
    {
        var result = await _xacThuc.DatLaiMatKhauAsync(req);
        return result.ThanhCong
            ? Ok(new { thongDiep = "Đặt lại mật khẩu thành công." })
            : BadRequest(new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
    }

    [HttpGet("toi")]
    [Authorize]
    public async Task<IActionResult> LayThongTinToi()
        => long.TryParse(User.FindFirstValue("MaTaiKhoan"), out var maTaiKhoan)
            ? HandleResult(await _xacThuc.LayThongTinToiAsync(maTaiKhoan), _ => 404)
            : Unauthorized();

    [HttpGet("quyen-cua-toi")]
    [Authorize]
    public async Task<IActionResult> LayQuyenCuaToi(CancellationToken ct)
        => long.TryParse(User.FindFirstValue("MaTaiKhoan"), out var maTaiKhoan)
            ? HandleResult(await _permissionService.LayQuyenCuaToiAsync(maTaiKhoan, ct), _ => 404)
            : Unauthorized();

    [HttpPost("dang-xuat")]
    [Authorize]
    public async Task<IActionResult> DangXuat()
    {
        var (rawToken, hetHanUtc) = LayTokenHienTai();
        await _xacThuc.DangXuatAsync(rawToken, hetHanUtc);
        return Ok(new { thongDiep = "Đăng xuất thành công." });
    }

    [HttpPost("doi-mat-khau")]
    [Authorize]
    public async Task<IActionResult> DoiMatKhau([FromBody] DoiMatKhauRequest req)
    {
        if (!long.TryParse(User.FindFirstValue("MaTaiKhoan"), out var maTaiKhoan))
            return Unauthorized();

        var (rawToken, hetHanUtc) = LayTokenHienTai();
        var result = await _xacThuc.DoiMatKhauAsync(maTaiKhoan, req, rawToken, hetHanUtc);
        return result.ThanhCong
            ? Ok(new { thongDiep = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." })
            : StatusCode(result.MaLoi == "TAM_KHOA" ? 429 : 400, new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
    }

    private (string? RawToken, DateTime? HetHanUtc) LayTokenHienTai()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        var rawToken = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader["Bearer ".Length..].Trim()
            : null;
        DateTime? hetHanUtc = long.TryParse(User.FindFirstValue("exp"), out var expUnix)
            ? DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime
            : null;
        return (rawToken, hetHanUtc);
    }
}
