using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Báo cáo doanh thu, dòng tiền và số dư cọc (UC10.2).
/// </summary>
[ApiController]
[Authorize(Roles = "QuanTriVien")]
[Route("api/bao-cao/tai-chinh")]
[Route("api/v1/bao-cao/tai-chinh")]
public class QuanTriBaoCaoTaiChinhController : BaseApiController
{
    private readonly IBaoCaoTaiChinhService _service;

    public QuanTriBaoCaoTaiChinhController(IBaoCaoTaiChinhService service) => _service = service;

    [HttpGet("doanh-thu-hoan-tat")]
    public async Task<IActionResult> LayDoanhThuHoanTat([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _service.LayDoanhThuHoanTatAsync(filter, MaTaiKhoanHienTai), _ => 400);

    [HttpGet("phi-huy")]
    public async Task<IActionResult> LayPhiHuy([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _service.LayPhiHuyAsync(filter, MaTaiKhoanHienTai), _ => 400);

    [HttpGet("dieu-chinh-doanh-thu")]
    public async Task<IActionResult> LayDieuChinhDoanhThu([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _service.LayDieuChinhDoanhThuAsync(filter, MaTaiKhoanHienTai), _ => 400);

    [HttpGet("thu-hoan")]
    public async Task<IActionResult> LayThuHoan([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _service.LayThuHoanAsync(filter, MaTaiKhoanHienTai), _ => 400);

    [HttpGet("coc-chua-tat-toan")]
    public async Task<IActionResult> LayCocChuaTatToan([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _service.LayCocChuaTatToanAsync(filter, MaTaiKhoanHienTai), _ => 400);

    [HttpGet("khoan-can-xu-ly")]
    public async Task<IActionResult> LayKhoanCanXuLy([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _service.LayKhoanCanXuLyAsync(filter, MaTaiKhoanHienTai), _ => 400);

    [HttpGet("xuat-csv")]
    public async Task<IActionResult> XuatCsv([FromQuery] XuatCsvTaiChinhRequest request)
    {
        var kq = await _service.XuatCsvAsync(request, MaTaiKhoanHienTai);
        if (!kq.ThanhCong || kq.DuLieu is null)
            return BadRequest(new { kq.MaLoi, kq.ThongDiep });
        return File(kq.DuLieu.NoiDung, kq.DuLieu.ContentType, kq.DuLieu.TenTep);
    }
}
