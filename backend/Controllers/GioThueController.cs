using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GearGo.Services.Interfaces;
using GearGo.Models.DTOs.GioThue;
using System.Security.Claims;

namespace GearGo.Controllers
{
    [Route("api/gio-thue")]
    [ApiController]
    [Authorize(Policy = "CustomerOnly")] // Bắt buộc phải là khách hàng
    public class GioThueController : ControllerBase
    {
        private readonly IGioThueService _gioThueService;

        public GioThueController(IGioThueService gioThueService)
        {
            _gioThueService = gioThueService;
        }

        // Lấy MaTaiKhoan/MaKhachHang từ JWT Token
        private long GetMaKhachHang()
        {
            // Lấy ID người dùng từ Claim chuẩn NameIdentifier hoặc MaTaiKhoan
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? User.FindFirst("MaTaiKhoan")?.Value;
            if (long.TryParse(claim, out var id)) return id;
            throw new UnauthorizedAccessException("Token không hợp lệ hoặc thiếu thông tin khách hàng");
        }

        [HttpGet]
        public async Task<IActionResult> GetGioThue()
        {
            var result = await _gioThueService.LayGioAsync(GetMaKhachHang());
            return Ok(result);
        }

        [HttpPost("them")]
        public async Task<IActionResult> ThemVaoGio([FromBody] ThemVaoGioRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            var result = await _gioThueService.ThemAsync(GetMaKhachHang(), req);
            return Ok(result);
        }

        [HttpPut("{maChiTiet}/so-luong")]
        public async Task<IActionResult> CapNhatSoLuong(long maChiTiet, [FromBody] CapNhatSoLuongRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _gioThueService.CapNhatSoLuongAsync(GetMaKhachHang(), maChiTiet, req);
            return Ok(result);
        }

        [HttpDelete("{maChiTiet}")]
        public async Task<IActionResult> XoaChiTiet(long maChiTiet)
        {
            await _gioThueService.XoaChiTietAsync(GetMaKhachHang(), maChiTiet);
            return NoContent(); // Code 204: Xóa thành công
        }

        [HttpPut("thoi-gian")]
        public async Task<IActionResult> DatThoiGian([FromBody] DatThoiGianRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            if (req.GioTra <= req.GioNhan) 
                return BadRequest(new { maLoi = "THOI_GIAN_SAI", thongDiep = "Giờ trả phải sau giờ nhận" });
            
            var result = await _gioThueService.DatThoiGianAsync(GetMaKhachHang(), req);
            return Ok(result);
        }

        [HttpPost("ma-giam-gia")]
        public async Task<IActionResult> ApKhuyenMai([FromBody] ApKhuyenMaiRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _gioThueService.ApMaKhuyenMaiAsync(GetMaKhachHang(), req);
            return Ok(result);
        }
    }
}