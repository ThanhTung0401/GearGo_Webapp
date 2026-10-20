using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller quản lý và kiểm duyệt đánh giá dành riêng cho Quản trị viên (Admin)
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/danh-gia")]
[Route("api/v1/admin/danh-gia")]
public class DanhGiaController : ControllerBase
{
    private readonly IDanhGiaService _danhGiaService;

    public DanhGiaController(IDanhGiaService danhGiaService)
    {
        _danhGiaService = danhGiaService;
    }

    /// <summary>
    /// Admin tra cứu danh sách toàn bộ đánh giá (kèm bộ lọc trạng thái và phân trang)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> LayDanhSach([FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 10, [FromQuery] string? trangThai = null)
    {
        var result = await _danhGiaService.AdminLayDanhSachDanhGiaAsync(trang, soMoiTrang, trangThai);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Admin ẩn đánh giá vi phạm kèm theo lý do
    /// </summary>
    [HttpPost("{id:long}/an")]
    public async Task<IActionResult> AnDanhGia([FromRoute] long id, [FromBody] AnDanhGiaRequest request)
    {
        var maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _danhGiaService.AnDanhGiaAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Admin khôi phục hiển thị đánh giá đã bị ẩn
    /// </summary>
    [HttpPost("{id:long}/khoi-phuc")]
    public async Task<IActionResult> KhoiPhucDanhGia([FromRoute] long id, [FromBody] KhoiPhucDanhGiaRequest request)
    {
        var maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _danhGiaService.KhoiPhucDanhGiaAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DANH_GIA_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN_KIEM_DUYET" => 403,
        _ => 400
    };
}
