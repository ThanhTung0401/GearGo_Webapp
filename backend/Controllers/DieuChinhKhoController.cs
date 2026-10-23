using System.Security.Claims;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.DieuChinhKho;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Controller điều chỉnh kho và xử lý sai lệch phiếu nhập (W5-T5 - Minh Tú)
/// </summary>
[ApiController]
[Route("api/dieu-chinh-kho")]
[Route("api/v1/dieu-chinh-kho")]
[Authorize(Policy = "StaffOrAdmin")]
public class DieuChinhKhoController : BaseApiController
{
    private readonly IDieuChinhKhoService _dieuChinhKhoService;

    public DieuChinhKhoController(IDieuChinhKhoService dieuChinhKhoService)
    {
        _dieuChinhKhoService = dieuChinhKhoService;
    }

    /// <summary>
    /// Tra cứu danh sách phiếu điều chỉnh kho phân trang
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> TimPhieu(
        [FromQuery] int trang = 1,
        [FromQuery] int soMoiTrang = 20,
        [FromQuery] string? loaiDieuChinh = null,
        [FromQuery] string? trangThai = null)
    {
        return HandleResult(await _dieuChinhKhoService.TimPhieuAsync(trang, soMoiTrang, loaiDieuChinh, trangThai, User.LayMaTaiKhoan()));
    }

    /// <summary>
    /// Xem chi tiết một phiếu điều chỉnh kho
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet(long id)
    {
        bool laAdmin = User.FindFirstValue(ClaimTypes.Role) == "QuanTriVien";
        return HandleResult(await _dieuChinhKhoService.LayChiTietAsync(id, User.LayMaTaiKhoan(), laAdmin));
    }

    /// <summary>
    /// Lập phiếu điều chỉnh kho mới
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> LapPhieu([FromBody] LapDieuChinhKhoRequest request)
    {
        return HandleCreatedResult(await _dieuChinhKhoService.LapPhieuAsync(request, User.LayMaTaiKhoan()));
    }

    /// <summary>
    /// Cập nhật nội dung phiếu điều chỉnh khi còn ở trạng thái nháp
    /// </summary>
    [HttpPut("{id:long}")]
    public async Task<IActionResult> CapNhatNhap(long id, [FromBody] LapDieuChinhKhoRequest request)
    {
        return HandleResult(await _dieuChinhKhoService.CapNhatNhapAsync(id, request, User.LayMaTaiKhoan()));
    }

    /// <summary>
    /// Gửi duyệt phiếu điều chỉnh (chuyển sang ChoDuyet)
    /// </summary>
    [HttpPost("{id:long}/gui-duyet")]
    public async Task<IActionResult> GuiDuyet(long id)
    {
        return HandleResult(await _dieuChinhKhoService.GuiDuyetAsync(id, User.LayMaTaiKhoan()));
    }

    /// <summary>
    /// Quản trị viên từ chối phiếu điều chỉnh
    /// </summary>
    [HttpPost("{id:long}/tu-choi")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> TuChoi(long id, [FromBody] TuChoiDieuChinhRequest request)
    {
        return HandleResult(await _dieuChinhKhoService.TuChoiAsync(id, request, User.LayMaTaiKhoan()));
    }

    /// <summary>
    /// Quản trị viên phê duyệt và áp dụng điều chỉnh kho nguyên tử
    /// </summary>
    [HttpPost("{id:long}/duyet-ap-dung")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DuyetVaApDung(long id)
    {
        return HandleResult(await _dieuChinhKhoService.DuyetVaApDungAsync(id, User.LayMaTaiKhoan()));
    }

    /// <summary>
    /// Tra cứu giá trị và số lượng nhập hiệu lực của phiếu nhập sau các đợt điều chỉnh
    /// </summary>
    [HttpGet("hieu-luc/{maPhieuNhap:long}")]
    public async Task<IActionResult> TinhGiaTriHieuLuc(long maPhieuNhap)
    {
        return HandleResult(await _dieuChinhKhoService.TinhGiaTriSauDieuChinhAsync(maPhieuNhap, User.LayMaTaiKhoan()));
    }
}
