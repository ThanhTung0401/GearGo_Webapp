using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller Báo cáo tài chính và số dư cần xử lý (W6-T5 - Kim Xuyến, UC25).
/// Chỉ dành cho Quản trị viên (AdminOnly).
/// Các endpoint chỉ đọc số liệu và xuất CSV, không thay đổi trạng thái chứng từ hoặc giao dịch.
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/bao-cao/tai-chinh")]
[Route("api/v1/admin/bao-cao/tai-chinh")]
public class BaoCaoTaiChinhController : BaseApiController
{
    private readonly IBaoCaoTaiChinhService _baoCaoTaiChinhService;

    public BaoCaoTaiChinhController(IBaoCaoTaiChinhService baoCaoTaiChinhService)
    {
        _baoCaoTaiChinhService = baoCaoTaiChinhService;
    }

    /// <summary>
    /// Doanh thu đơn thuê hoàn tất (tiền thuê sau giảm + phụ phí đối soát ban đầu; không cộng cọc).
    /// </summary>
    [HttpGet("doanh-thu-hoan-tat")]
    public async Task<IActionResult> LayDoanhThuHoanTat([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayDoanhThuHoanTatAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>
    /// Phí hủy giữ lại từ tiền thuê thực thu theo quy tắc hủy.
    /// </summary>
    [HttpGet("phi-huy")]
    public async Task<IActionResult> LayPhiHuy([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayPhiHuyAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>
    /// Khoản tăng/giảm điều chỉnh doanh thu từ đối soát sau chốt.
    /// </summary>
    [HttpGet("dieu-chinh")]
    [HttpGet("dieu-chinh-doanh-thu")]
    public async Task<IActionResult> LayDieuChinhDoanhThu([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayDieuChinhDoanhThuAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>
    /// Dòng tiền thực tế: tổng thu/hoàn thành công và phân loại nguồn.
    /// </summary>
    [HttpGet("thu-hoan")]
    [HttpGet("dong-tien")]
    public async Task<IActionResult> LayThuHoan([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayThuHoanAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>
    /// Số dư cọc hiện tại còn phải xử lý (xét cọc thực thu - hoàn cọc - cọc đã bù phụ phí).
    /// </summary>
    [HttpGet("coc-chua-tat-toan")]
    public async Task<IActionResult> LayCocChuaTatToan([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayCocChuaTatToanAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>
    /// Danh sách các khoản pending / cần đối chiếu / chưa phân loại / chênh lệch chứng từ.
    /// </summary>
    [HttpGet("can-xu-ly")]
    public async Task<IActionResult> LayKhoanCanXuLy([FromQuery] LocTaiChinhRequest filter)
        => HandleResult(await _baoCaoTaiChinhService.LayKhoanCanXuLyAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>
    /// Xuất CSV UTF-8 BOM, an toàn chống CSV injection theo cùng bộ lọc và quyền.
    /// </summary>
    [HttpGet("xuat-csv")]
    public async Task<IActionResult> XuatCsv([FromQuery] XuatCsvTaiChinhRequest request)
    {
        var result = await _baoCaoTaiChinhService.XuatCsvAsync(request, User.LayMaTaiKhoan());
        if (!result.ThanhCong)
            return HandleResult(result);

        var tep = result.DuLieu!;
        return File(tep.NoiDung, tep.ContentType, tep.TenTep);
    }
}
