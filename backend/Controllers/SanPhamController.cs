using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GearGo.Services.Interfaces;
using GearGo.Models.DTOs.Admin;
using GearGo.Helpers; // Dùng FileValidator

namespace GearGo.Controllers.Admin
{
    [Route("api/admin/san-pham")]
    [ApiController]
    [Authorize(Policy = "AdminOnly")] // Khóa cổng: Chỉ Admin mới được vào
    public class SanPhamController : ControllerBase
    {
        private readonly IAdminSanPhamService _service;

        public SanPhamController(IAdminSanPhamService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetDanhSach([FromQuery] string? tuKhoa, [FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 12)
        {
            var result = await _service.LayDanhSachAsync(tuKhoa, trang, soMoiTrang);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> TaoMoi([FromBody] TaoSanPhamRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _service.TaoMoiAsync(req);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> CapNhat(long id, [FromBody] CapNhatSanPhamRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _service.CapNhatAsync(id, req);
            return Ok(result);
        }

       [HttpPatch("{id}/trang-thai")]
        public async Task<IActionResult> DoiTrangThai(long id, [FromBody] string trangThaiMoi)
        {
            await _service.DoiTrangThaiAsync(id, trangThaiMoi);
            return NoContent();
        }

        [HttpPost("{id}/hinh-anh")]
        public async Task<IActionResult> UploadHinhAnh(long id, IFormFile file)
        {
            // GỌI HELPER BẢO MẬT: Kiểm tra Magic Bytes và Dung lượng
            if (!FileValidator.IsValidImage(file, out string errorMessage))
            {
                return BadRequest(new { maLoi = "FILE_KHONG_HOP_LE", thongDiep = errorMessage });
            }

            var result = await _service.ThemHinhAnhAsync(id, file);
            return Ok(result);
        }

        [HttpDelete("hinh-anh/{maHinhAnh}")]
        public async Task<IActionResult> XoaHinhAnh(long maHinhAnh)
        {
            await _service.XoaHinhAnhAsync(maHinhAnh);
            return NoContent();
        }
    }
}