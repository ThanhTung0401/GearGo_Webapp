using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/thanh-toan")]
[Route("api/thanh-toan")]
public class ThanhToanController : ControllerBase
{
    private readonly IThanhToanService _thanhToanService;

    public ThanhToanController(IThanhToanService thanhToanService)
    {
        _thanhToanService = thanhToanService;
    }

    /// <summary>
    /// Xác nhận thanh toán ban đầu (Week 2)
    /// </summary>
    [HttpPost("xac-nhan")]
    [Authorize]
    public async Task<IActionResult> XacNhanThanhToan([FromBody] XacNhanThanhToanRequest request)
    {
        var result = await _thanhToanService.XacNhanThanhToanAsync(request);

        if (!result.ThanhCong)
        {
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        }

        return Ok(new { MaThanhToan = result.DuLieu, ThongDiep = "Thanh toán thành công!" });
    }

    /// <summary>
    /// Tạo yêu cầu thu bổ sung phụ phí đối soát (W4-T5)
    /// </summary>
    [HttpPost("doi-soat/{doiSoatId:long}/thu-bo-sung")]
    [Authorize]
    public async Task<IActionResult> TaoThuBoSung(long doiSoatId, [FromBody] TaoThuBoSungRequest? request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var req = request ?? new TaoThuBoSungRequest();
        req.MaDoiSoat = doiSoatId;

        var result = await _thanhToanService.TaoThuBoSungAsync(req, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Tra cứu trạng thái giao dịch thu theo mã yêu cầu hoặc ID (W4-T5)
    /// </summary>
    [HttpGet("{id}/trang-thai")]
    [Authorize]
    public async Task<IActionResult> LayTrangThaiGiaoDich(string id)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _thanhToanService.LayTrangThaiGiaoDichAsync(id, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Callback webhook nhận kết quả thanh toán thu bổ sung từ cổng thanh toán (W4-T5, W4-T8)
    /// </summary>
    [HttpPost("callback/thu-bo-sung")]
    [AllowAnonymous]
    public async Task<IActionResult> CallbackThuBoSung([FromBody] XuLyCallbackRequest request)
    {
        var result = await _thanhToanService.XuLyCallbackThuBoSungAsync(request);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy danh sách giao dịch cần đối chiếu ngoại lệ (W4-T8)
    /// </summary>
    [HttpGet("can-doi-chieu")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LayDanhSachCanDoiChieu()
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _thanhToanService.LayDanhSachCanDoiChieuAsync(maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Quản trị viên đối chiếu và xử lý giao dịch ngoại lệ, hoàn tiền thừa nếu có (W4-T8)
    /// </summary>
    [HttpPost("{id:long}/doi-chieu")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> DoiChieuGiaoDich(long id, [FromBody] DoiChieuGiaoDichRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _thanhToanService.DoiChieuGiaoDichAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });

        return Ok(new { ThongDiep = result.DuLieu });
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_THUE_NOT_FOUND" or "DOI_SOAT_NOT_FOUND" or "GIAO_DICH_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" => 403,
        "KHONG_CO_NGHIA_VU_THU_THEM" or "THU_THEM_DANG_CHO" or "SO_TIEN_GATEWAY_KHONG_KHOP" or "TIEN_VE_SAU_HUY" => 409,
        _ => 400
    };
}
