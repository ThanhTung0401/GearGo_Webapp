using System;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/qua-han")]
[Route("api/qua-han")]
[Authorize(Policy = "StaffOrAdmin")]
public class QuaHanController : ControllerBase
{
    private readonly IQuaHanService _quaHanService;

    public QuaHanController(IQuaHanService quaHanService)
    {
        _quaHanService = quaHanService;
    }

    /// <summary>
    /// Lấy danh sách các đơn thuê quá hạn kèm bộ lọc và phân trang (W4-T2)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> LayDonQuaHan([FromQuery] LocQuaHanRequest filter)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _quaHanService.LayDonQuaHanAsync(filter, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy chi tiết quá hạn và phí trễ dự kiến từng thiết bị của đơn thuê (W4-T2)
    /// </summary>
    [HttpGet("{donId:long}")]
    public async Task<IActionResult> LayChiTietQuaHan(long donId)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _quaHanService.LayChiTietQuaHanAsync(donId, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy danh sách các đơn thuê tương lai bị ảnh hưởng do thiết bị quá hạn (W4-T2)
    /// </summary>
    [HttpGet("{donId:long}/don-bi-anh-huong")]
    public async Task<IActionResult> LayDonBiAnhHuong(long donId)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _quaHanService.LayDonBiAnhHuongAsync(donId, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Kích hoạt quét và gửi thông báo nhắc nhở các đơn quá hạn (W4-T2)
    /// </summary>
    [HttpPost("quet-nhac")]
    public async Task<IActionResult> QuetVaTaoNhac([FromQuery] DateTime? mocQuet)
    {
        var result = await _quaHanService.QuetVaTaoNhacQuaHanAsync(mocQuet);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_NOT_FOUND" or "CHI_TIET_BAN_GIAO_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" => 403,
        "DON_CHUA_BAN_GIAO" => 409,
        _ => 400
    };
}
