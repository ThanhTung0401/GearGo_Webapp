using GearGo.Models.DTOs.Auth;
  using GearGo.Services.Interfaces;
  using Microsoft.AspNetCore.Authorization;
  using Microsoft.AspNetCore.Mvc;
  using System.Security.Claims;

  namespace GearGo.Controllers;

  [ApiController]
  [Route("api/auth")]
  public class AuthController : ControllerBase
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
          {
              // Phản hồi 429 nếu vi phạm giới hạn Rate Limiting chống spam bot, ngược lại 409 nếu trùng dữ liệu
              var statusCode = result.MaLoi == "RATE_LIMIT_VUOT_MUC" ? 429 : 409;
              return StatusCode(statusCode, new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
          }
          return CreatedAtAction(nameof(DangKy), result.DuLieu);
      }

      [HttpPost("dang-nhap")]
      public async Task<IActionResult> DangNhap([FromBody] DangNhapRequest req)
      {
          var result = await _xacThuc.DangNhapAsync(req);
          if (!result.ThanhCong)
          {
              var status = result.MaLoi is "TAI_KHOAN_BI_KHOA" or "TAM_KHOA" ? 403 : 401;
              return StatusCode(status, new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
          }
          return Ok(result.DuLieu);
      }

      [HttpPost("quen-mat-khau")]
      public async Task<IActionResult> QuenMatKhau([FromBody] QuenMatKhauRequest req)
      {
          var result = await _xacThuc.TaoTokenQuenMatKhauAsync(req.Email);
          return Ok(new { thongDiep = result.DuLieu });
      }

      /// <summary>
      /// Xác minh mã OTP khôi phục mật khẩu (UC1.4 Bước 2 / UC15)
      /// </summary>
      [HttpPost("xac-thuc-otp")]
      public async Task<IActionResult> XacThucOtp([FromBody] XacThucOtpRequest req)
      {
          var result = await _xacThuc.XacThucOtpAsync(req.Email, req.Otp);
          if (!result.ThanhCong)
              return BadRequest(new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
          return Ok(new { thongDiep = "Xác minh mã OTP thành công.", token = result.DuLieu });
      }

      [HttpPost("dat-lai-mat-khau")]
      public async Task<IActionResult> DatLaiMatKhau([FromBody] DatLaiMatKhauRequest req)
      {
          var result = await _xacThuc.DatLaiMatKhauAsync(req);
          if (!result.ThanhCong)
              return BadRequest(new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
          return Ok(new { thongDiep = "Đặt lại mật khẩu thành công." });
      }

      [HttpGet("toi")]
      [Authorize]
      public async Task<IActionResult> LayThongTinToi()
      {
          var maTaiKhoanStr = User.FindFirstValue("MaTaiKhoan");
          if (!long.TryParse(maTaiKhoanStr, out var maTaiKhoan)) return Unauthorized();
          var result = await _xacThuc.LayThongTinToiAsync(maTaiKhoan);
          if (!result.ThanhCong) return NotFound(new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
          return Ok(result.DuLieu);
      }

      // feat/ROLE_Adjustment: quyền của người đang đăng nhập (frontend dùng để ẩn/hiện UI)
      [HttpGet("quyen-cua-toi")]
      [Authorize]
      public async Task<IActionResult> LayQuyenCuaToi(System.Threading.CancellationToken ct)
      {
          var maTaiKhoanStr = User.FindFirstValue("MaTaiKhoan");
          if (!long.TryParse(maTaiKhoanStr, out var maTaiKhoan)) return Unauthorized();
          var result = await _permissionService.LayQuyenCuaToiAsync(maTaiKhoan, ct);
          if (!result.ThanhCong) return NotFound(new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
          return Ok(result.DuLieu);
      }

      // UC1.3: Đăng xuất và thu hồi token hiện tại
      [HttpPost("dang-xuat")]
      [Authorize]
      public async Task<IActionResult> DangXuat()
      {
          var (rawToken, hetHanUtc) = LayTokenHienTai();
          await _xacThuc.DangXuatAsync(rawToken, hetHanUtc);
          return Ok(new { thongDiep = "Đăng xuất thành công." });
      }

      // UC1.12: Đổi mật khẩu khi đang đăng nhập
      [HttpPost("doi-mat-khau")]
      [Authorize]
      public async Task<IActionResult> DoiMatKhau([FromBody] DoiMatKhauRequest req)
      {
          var maTaiKhoanStr = User.FindFirstValue("MaTaiKhoan");
          if (!long.TryParse(maTaiKhoanStr, out var maTaiKhoan)) return Unauthorized();

          var (rawToken, hetHanUtc) = LayTokenHienTai();
          var result = await _xacThuc.DoiMatKhauAsync(maTaiKhoan, req, rawToken, hetHanUtc);
          if (!result.ThanhCong)
          {
              var status = result.MaLoi == "TAM_KHOA" ? 429 : 400;
              return StatusCode(status, new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
          }
          return Ok(new { thongDiep = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
      }

      private (string? RawToken, DateTime? HetHanUtc) LayTokenHienTai()
      {
          var authHeader = Request.Headers.Authorization.ToString();
          var rawToken = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
              ? authHeader["Bearer ".Length..].Trim()
              : null;

          DateTime? hetHanUtc = null;
          var expClaim = User.FindFirstValue("exp");
          if (long.TryParse(expClaim, out var expUnix))
              hetHanUtc = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;

          return (rawToken, hetHanUtc);
      }
  }