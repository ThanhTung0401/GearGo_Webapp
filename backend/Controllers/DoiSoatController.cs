using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// API Đối soát tiền cọc, hoàn tất đơn thuê và điều chỉnh đối soát (UC15 - Kim Xuyến)
/// </summary>
[ApiController]
[Route("api/v1/doi-soat")]
[Route("api/doi-soat")]
[Authorize]
public class DoiSoatController : ControllerBase
{
    private readonly IDoiSoatService _doiSoatService;

    public DoiSoatController(IDoiSoatService doiSoatService)
    {
        _doiSoatService = doiSoatService;
    }

    /// <summary>
    /// Xem trước bảng tính đối soát và kiểm tra các điều kiện tiên quyết (UC15)
    /// </summary>
    [HttpGet("theo-don/{donId:long}/xem-truoc")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> XemTruoc(long donId)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _doiSoatService.XemTruocAsync(donId, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy thông tin đối soát của một đơn thuê
    /// </summary>
    [HttpGet("theo-don/{donId:long}")]
    public async Task<IActionResult> LayTheoDon(long donId)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _doiSoatService.LayTheoDonAsync(donId, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy chi tiết phiếu đối soát theo ID
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayTheoId(long id)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _doiSoatService.LayTheoIdAsync(id, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lập phiếu đối soát ban đầu cho đơn thuê
    /// </summary>
    [HttpPost("theo-don/{donId:long}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> LapDoiSoat(long donId, [FromBody] LapDoiSoatRequest? request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var dto = request ?? new LapDoiSoatRequest { MaDonThue = donId };
        dto.MaDonThue = donId;

        var result = await _doiSoatService.LapDoiSoatAsync(dto, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return StatusCode(201, result.DuLieu);
    }

    /// <summary>
    /// Nhân viên xác nhận bảng tính đối soát và khóa các khoản phí
    /// </summary>
    [HttpPost("{id:long}/xac-nhan")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> XacNhanBangTinh(long id, [FromBody] XacNhanDoiSoatRequest? request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var dto = request ?? new XacNhanDoiSoatRequest();
        var result = await _doiSoatService.XacNhanBangTinhAsync(id, dto, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Phát lệnh xử lý tiền (tạo yêu cầu hoàn cọc hoặc tạo giao dịch thu thêm)
    /// </summary>
    [HttpPost("{id:long}/xu-ly-tien")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> YeuCauXuLyTien(long id)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _doiSoatService.YeuCauXuLyTienAsync(id, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Chốt đối soát và hoàn tất đơn thuê
    /// </summary>
    [HttpPost("{id:long}/chot")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> ChotDoiSoat(long id)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _doiSoatService.ChotDoiSoatAsync(id, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Quản trị viên lập đối soát điều chỉnh sau khi đã chốt
    /// </summary>
    [HttpPost("{id:long}/dieu-chinh")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> LapDoiSoatDieuChinh(long id, [FromBody] DieuChinhDoiSoatRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _doiSoatService.LapDoiSoatDieuChinhAsync(id, request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return StatusCode(201, result.DuLieu);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_KHONG_TIM_THAY" or "DOI_SOAT_NOT_FOUND" or "CHUA_CO_DOI_SOAT" => 404,
        "KHONG_CO_QUYEN" => 403,
        "DOI_SOAT_CHUA_DU_DIEU_KIEN" or "DOI_SOAT_DA_CHOT" or "DOI_SOAT_CHUA_CHOT" 
            or "BANG_TINH_DA_THAY_DOI" or "GIAO_DICH_CHUA_RO_KET_QUA" 
            or "PHI_DANG_TRANH_CHAP" or "THU_THEM_DANG_CHO" or "KHONG_CO_PHI_DIEU_CHINH" => 409,
        _ => 400
    };
}
