using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.PhuPhi;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// API Quản lý phụ phí, duyệt phí và giải quyết tranh chấp (UC14 - Kiện Minh)
/// </summary>
[ApiController]
[Route("api/v1/phu-phi")]
[Route("api/phu-phi")]
[Authorize]
public class PhuPhiController : ControllerBase
{
    private readonly IPhuPhiService _phuPhiService;

    public PhuPhiController(IPhuPhiService phuPhiService)
    {
        _phuPhiService = phuPhiService;
    }

    /// <summary>
    /// Lấy danh sách phụ phí của một đơn thuê
    /// </summary>
    [HttpGet("theo-don/{donId:long}")]
    public async Task<IActionResult> LayTheoDon(long donId)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.LayDanhSachPhuPhiTheoDonAsync(donId, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Gợi ý phụ phí tự động theo thiết bị bàn giao (trễ hạn, bồi thường mất, vệ sinh)
    /// </summary>
    [HttpGet("goi-y")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> GoiYPhi([FromQuery] long maChiTietBanGiao)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.GoiYPhiAsync(maChiTietBanGiao, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lập phụ phí mới chờ phê duyệt
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LapPhi([FromBody] LapPhuPhiRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.LapPhiAsync(request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return StatusCode(201, result.DuLieu);
    }

    /// <summary>
    /// Cập nhật phụ phí khi đang chờ duyệt
    /// </summary>
    [HttpPut("{id:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> CapNhatPhi(long id, [FromBody] CapNhatPhuPhiRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.CapNhatPhiChuaDuyetAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Phê duyệt phụ phí
    /// </summary>
    [HttpPost("{id:long}/duyet")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> DuyetPhi(long id, [FromBody] DuyetPhuPhiRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.DuyetPhiAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Từ chối phụ phí
    /// </summary>
    [HttpPost("{id:long}/tu-choi")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> TuChoiPhi(long id, [FromBody] DuyetPhuPhiRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.TuChoiPhiAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Khách hàng gửi yêu cầu khiếu nại / tranh chấp phụ phí
    /// </summary>
    [HttpPost("{id:long}/tranh-chap")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> TaoTranhChap(long id, [FromBody] TranhChapRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.TaoTranhChapAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Quản trị viên xử lý kết quả tranh chấp
    /// </summary>
    [HttpPost("{id:long}/giai-quyet-tranh-chap")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GiaiQuyetTranhChap(long id, [FromBody] GiaiQuyetTranhChapRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.GiaiQuyetTranhChapAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Quản trị viên lập phụ phí điều chỉnh sau khi đối soát đã chốt
    /// </summary>
    [HttpPost("{id:long}/dieu-chinh")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> LapDieuChinhPhi(long id, [FromBody] DieuChinhPhiRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _phuPhiService.LapDieuChinhPhiAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return StatusCode(201, result.DuLieu);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_KHONG_TIM_THAY" or "PHU_PHI_NOT_FOUND" or "CHI_TIET_BAN_GIAO_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" or "VUOT_QUYEN_DUYET_PHI" => 403,
        "PHI_TRUNG_TON_THAT" or "PHI_DA_DUYET" or "PHI_DA_KHOA_DOI_SOAT" or "PHI_DA_XU_LY" or "PHI_DANG_TRANH_CHAP" => 409,
        _ => 400
    };
}
