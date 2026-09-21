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
      public AuthController(IXacThucService xacThuc) { _xacThuc = xacThuc; }

      [HttpPost("dang-ky")]
      public async Task<IActionResult> DangKy([FromBody] DangKyRequest req)
      {
          var result = await _xacThuc.DangKyAsync(req);
          if (!result.ThanhCong)
              return Conflict(new { maLoi = result.MaLoi, thongDiep = result.ThongDiep });
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
  }