using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller quản lý thông báo và hàng chờ gửi dành riêng cho Quản trị viên (Admin)
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/thong-bao")]
[Route("api/v1/admin/thong-bao")]
public class ThongBaoController : ControllerBase
{
    private readonly IGuiThongBaoService _guiThongBaoService;

    public ThongBaoController(IGuiThongBaoService guiThongBaoService)
    {
        _guiThongBaoService = guiThongBaoService;
    }

    /// <summary>
    /// Admin tra cứu danh sách các thông báo gửi lỗi (hàng chờ email thất bại)
    /// </summary>
    [HttpGet("gui-loi")]
    public async Task<IActionResult> LayThongBaoGuiLoi([FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 20)
    {
        var result = await _guiThongBaoService.LayThongBaoGuiLoiAsync(trang, soMoiTrang);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Admin kích hoạt thử lại gửi một thông báo bị lỗi
    /// </summary>
    [HttpPost("{id:long}/thu-lai")]
    public async Task<IActionResult> ThuLai([FromRoute] long id, [FromBody] ThuLaiThongBaoRequest request)
    {
        var maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _guiThongBaoService.ThuLaiAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "THONG_BAO_NOT_FOUND" => 404,
        "THONG_BAO_DANG_XU_LY" => 409,
        _ => 400
    };
}
