using System.Security.Claims;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.DieuChinhKho;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Inventory;

/// <summary>
/// Controller điều chỉnh kho và xử lý sai lệch phiếu nhập (W5-T5 - Minh Tú)
/// </summary>
[ApiController]
[Route("api/dieu-chinh-kho")]
[Authorize]
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
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Xem)]
    public async Task<IActionResult> TimPhieu(
        [FromQuery] int trang = 1,
        [FromQuery] int soMoiTrang = 20,
        [FromQuery] string? loaiDieuChinh = null,
        [FromQuery] string? trangThai = null)
    {
        return HandleResult(await _dieuChinhKhoService.TimPhieuAsync(trang, soMoiTrang, loaiDieuChinh, trangThai, MaTaiKhoanHienTai));
    }

    /// <summary>
    /// Xem chi tiết một phiếu điều chỉnh kho
    /// </summary>
    [HttpGet("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Xem)]
    public async Task<IActionResult> LayChiTiet(long id)
    {
        bool laAdmin = User.FindFirstValue(ClaimTypes.Role) == "QuanTriVien";
        return HandleResult(await _dieuChinhKhoService.LayChiTietAsync(id, MaTaiKhoanHienTai, laAdmin));
    }

    /// <summary>
    /// Lập phiếu điều chỉnh kho mới
    /// </summary>
    [HttpPost]
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Xem)]
    public async Task<IActionResult> LapPhieu([FromBody] LapDieuChinhKhoRequest request)
    {
        return HandleCreatedResult(await _dieuChinhKhoService.LapPhieuAsync(request, MaTaiKhoanHienTai));
    }

    /// <summary>
    /// Cập nhật nội dung phiếu điều chỉnh khi còn ở trạng thái nháp
    /// </summary>
    [HttpPut("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Xem)]
    public async Task<IActionResult> CapNhatNhap(long id, [FromBody] LapDieuChinhKhoRequest request)
    {
        return HandleResult(await _dieuChinhKhoService.CapNhatNhapAsync(id, request, MaTaiKhoanHienTai));
    }

    /// <summary>
    /// Gửi duyệt phiếu điều chỉnh (chuyển sang ChoDuyet)
    /// </summary>
    [HttpPost("{id:long}/gui-duyet")]
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Xem)]
    public async Task<IActionResult> GuiDuyet(long id)
    {
        return HandleResult(await _dieuChinhKhoService.GuiDuyetAsync(id, MaTaiKhoanHienTai));
    }

    /// <summary>
    /// Quản trị viên từ chối phiếu điều chỉnh
    /// </summary>
    [HttpPost("{id:long}/tu-choi")]
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Duyet)]
    public async Task<IActionResult> TuChoi(long id, [FromBody] TuChoiDieuChinhRequest request)
    {
        return HandleResult(await _dieuChinhKhoService.TuChoiAsync(id, request, MaTaiKhoanHienTai));
    }

    /// <summary>
    /// Quản trị viên phê duyệt và áp dụng điều chỉnh kho nguyên tử
    /// </summary>
    [HttpPost("{id:long}/duyet-ap-dung")]
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Duyet)]
    public async Task<IActionResult> DuyetVaApDung(long id)
    {
        return HandleResult(await _dieuChinhKhoService.DuyetVaApDungAsync(id, MaTaiKhoanHienTai));
    }

    /// <summary>
    /// Tra cứu giá trị và số lượng nhập hiệu lực của phiếu nhập sau các đợt điều chỉnh
    /// </summary>
    [HttpGet("hieu-luc/{maPhieuNhap:long}")]
    [RequirePermission(DomainConstants.Permissions.DieuChinhKho_Xem)]
    public async Task<IActionResult> TinhGiaTriHieuLuc(long maPhieuNhap)
    {
        return HandleResult(await _dieuChinhKhoService.TinhGiaTriSauDieuChinhAsync(maPhieuNhap, MaTaiKhoanHienTai));
    }
}

