using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller Quản trị khuyến mãi dành riêng cho Quản trị viên (W6-T2 - UC24 - Kiện Minh)
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/khuyen-mai")]
[Route("api/v1/admin/khuyen-mai")]
public class KhuyenMaiController : ControllerBase
{
    private readonly IQuanTriKhuyenMaiService _quanTriKhuyenMaiService;

    public KhuyenMaiController(IQuanTriKhuyenMaiService quanTriKhuyenMaiService)
    {
        _quanTriKhuyenMaiService = quanTriKhuyenMaiService;
    }

    /// <summary>
    /// Tra cứu và lọc danh sách khuyến mãi có phân trang
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemKhuyenMaiRequest request)
    {
        var result = await _quanTriKhuyenMaiService.TimKiemAsync(request);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Xem chi tiết cấu hình và phạm vi khuyến mãi
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id)
    {
        var result = await _quanTriKhuyenMaiService.LayChiTietAsync(id);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Tạo mới chương trình khuyến mãi
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> TaoMoi([FromBody] TaoKhuyenMaiRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var actorId = User.LayMaTaiKhoan();
        var result = await _quanTriKhuyenMaiService.TaoAsync(request, actorId);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return StatusCode(201, result.DuLieu);
    }

    /// <summary>
    /// Cập nhật chương trình khuyến mãi (khóa điều khoản cam kết nếu đã có lượt)
    /// </summary>
    [HttpPut("{id:long}")]
    public async Task<IActionResult> CapNhat([FromRoute] long id, [FromBody] CapNhatKhuyenMaiRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var actorId = User.LayMaTaiKhoan();
        var result = await _quanTriKhuyenMaiService.CapNhatAsync(id, request, actorId);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Tạm ẩn chương trình khuyến mãi (ngừng nhận lượt áp mới)
    /// </summary>
    [HttpPost("{id:long}/tam-an")]
    public async Task<IActionResult> TamAn([FromRoute] long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
    {
        var actorId = User.LayMaTaiKhoan();
        var result = await _quanTriKhuyenMaiService.TamAnAsync(id, request, actorId);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Hiển thị lại chương trình khuyến mãi đã tạm ẩn
    /// </summary>
    [HttpPost("{id:long}/hien-thi")]
    public async Task<IActionResult> HienThi([FromRoute] long id, [FromBody] DoiHienThiKhuyenMaiRequest request)
    {
        var actorId = User.LayMaTaiKhoan();
        var result = await _quanTriKhuyenMaiService.HienThiAsync(id, request, actorId);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Báo cáo thống kê tình hình sử dụng mã chi tiết theo đơn thuê
    /// </summary>
    [HttpGet("{id:long}/su-dung")]
    public async Task<IActionResult> LayTinhHinhSuDung([FromRoute] long id)
    {
        var result = await _quanTriKhuyenMaiService.LayTinhHinhSuDungAsync(id);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "KHUYEN_MAI_NOT_FOUND" => 404,
        "MA_GIAM_GIA_TRUNG" => 409,
        "DIEU_KHOAN_MA_DA_CAM_KET" => 409,
        "HAN_MUC_THAP_HON_DANG_CHIEM" => 409,
        "PHAM_VI_MA_KHONG_HOP_LE" => 400,
        "CAU_HINH_GIAM_KHONG_HOP_LE" => 400,
        _ => 400
    };
}
