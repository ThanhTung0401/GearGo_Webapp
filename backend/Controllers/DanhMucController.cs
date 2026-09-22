using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GearGo.Services.Interfaces;
using GearGo.Models.DTOs.Admin;

namespace GearGo.Controllers.Admin
{
    [Route("api/admin/danh-muc")]
    [ApiController]
    [Authorize(Policy = "AdminOnly")] // Khóa cổng: Chỉ Admin được vào
    public class DanhMucController : ControllerBase
    {
        private readonly IAdminDanhMucService _service;

        public DanhMucController(IAdminDanhMucService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetList()
        {
            var result = await _service.LayDanhSachAsync();
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> TaoMoi([FromBody] TaoDanhMucRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _service.TaoMoiAsync(req);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> CapNhat(long id, [FromBody] CapNhatDanhMucRequest req)
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> Xoa(long id)
        {
            await _service.XoaAsync(id);
            return NoContent();
        }
    }
}