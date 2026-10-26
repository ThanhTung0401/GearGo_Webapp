using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Báo cáo kho dành cho nhân viên/quản trị viên (W6-T6 - UC25 - Minh Tú).
/// Chỉ số liệu vận hành: nhân viên không nhận giá trị nhập hay chi phí (service kiểm tra lại quyền từ DB).
/// </summary>
[ApiController]
[Authorize(Policy = "StaffOrAdmin")]
[Route("api/bao-cao/kho")]
[Route("api/v1/bao-cao/kho")]
public class BaoCaoKhoController : BaseApiController
{
    private readonly IBaoCaoKhoService _baoCaoKhoService;

    public BaoCaoKhoController(IBaoCaoKhoService baoCaoKhoService)
    {
        _baoCaoKhoService = baoCaoKhoService;
    }

    /// <summary>Hiện trạng kho hiện tại theo sản phẩm hiện tại (không dựng lại kho quá khứ).</summary>
    [HttpGet("hien-trang")]
    public async Task<IActionResult> LayHienTrang([FromQuery] LocHienTrangKhoRequest filter)
        => HandleResult(await _baoCaoKhoService.LayHienTrangKhoAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>Thống kê bảo trì: vệ sinh/sửa chữa tách riêng; chi phí chỉ hiện với quản trị viên.</summary>
    [HttpGet("bao-tri")]
    public async Task<IActionResult> LayThongKeBaoTri([FromQuery] LocBaoTriRequest filter)
        => HandleResult(await _baoCaoKhoService.LayThongKeBaoTriAsync(filter, User.LayMaTaiKhoan()));
}
