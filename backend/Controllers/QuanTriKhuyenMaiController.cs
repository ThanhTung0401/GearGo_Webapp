using GearGo.Helpers;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Quản trị khuyến mãi dành cho Quản trị viên (UC8.2 - UC8.5).
/// </summary>
[ApiController]
[Authorize(Roles = "QuanTriVien")]
[Route("api/quan-tri/khuyen-mai")]
[Route("api/v1/quan-tri/khuyen-mai")]
public class QuanTriKhuyenMaiController : BaseApiController
{
    private readonly IQuanTriKhuyenMaiService _service;

    public QuanTriKhuyenMaiController(IQuanTriKhuyenMaiService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemKhuyenMaiRequest request)
        => HandleResult(await _service.TimKiemAsync(request), _ => 400);

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet(long id)
        => HandleResult(await _service.LayChiTietAsync(id), _ => 404);

    [HttpPost]
    public async Task<IActionResult> Tao([FromBody] TaoKhuyenMaiRequest request)
        => HandleResult(await _service.TaoAsync(request, MaTaiKhoanHienTai), _ => 400);

    [HttpPut("{id:long}")]
    public async Task<IActionResult> CapNhat(long id, [FromBody] CapNhatKhuyenMaiRequest request)
        => HandleResult(await _service.CapNhatAsync(id, request, MaTaiKhoanHienTai), _ => 400);

    [HttpPost("{id:long}/tam-an")]
    public async Task<IActionResult> TamAn(long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
        => HandleResult(await _service.TamAnAsync(id, request, MaTaiKhoanHienTai), _ => 400);

    [HttpPost("{id:long}/hien-thi")]
    public async Task<IActionResult> HienThi(long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
        => HandleResult(await _service.HienThiAsync(id, request, MaTaiKhoanHienTai), _ => 400);

    [HttpGet("{id:long}/su-dung")]
    public async Task<IActionResult> LayTinhHinhSuDung(long id)
        => HandleResult(await _service.LayTinhHinhSuDungAsync(id), _ => 404);
}
