using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Báo cáo kho có giá trị tiền — chỉ quản trị viên (W6-T6 - UC25 - Minh Tú).
/// Các endpoint chỉ đọc: không đổi giá thuê, THIET_BI.gia_nhap hay trạng thái chứng từ.
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/bao-cao/kho")]
[Route("api/v1/admin/bao-cao/kho")]
public class BaoCaoKhoController : BaseApiController
{
    private readonly IBaoCaoKhoService _baoCaoKhoService;

    public BaoCaoKhoController(IBaoCaoKhoService baoCaoKhoService)
    {
        _baoCaoKhoService = baoCaoKhoService;
    }

    /// <summary>Nhập hàng theo lô nhập: gốc, điều chỉnh, hiệu lực (chỉ phiếu đã nhập kho).</summary>
    [HttpGet("nhap-hang")]
    public async Task<IActionResult> LayNhapHang([FromQuery] LocNhapHangRequest filter)
        => HandleResult(await _baoCaoKhoService.LayNhapHangAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>Phát sinh điều chỉnh nhập trong kỳ theo thời điểm áp dụng.</summary>
    [HttpGet("dieu-chinh-nhap")]
    public async Task<IActionResult> LayDieuChinhNhap([FromQuery] LocNhapHangRequest filter)
        => HandleResult(await _baoCaoKhoService.LayDieuChinhNhapAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>Lịch sử đơn giá nhập và đơn giá bình quân gia quyền theo sản phẩm nguồn.</summary>
    [HttpGet("lich-su-don-gia")]
    public async Task<IActionResult> LayLichSuDonGia([FromQuery] LocNhapHangRequest filter)
        => HandleResult(await _baoCaoKhoService.LayLichSuDonGiaAsync(filter, User.LayMaTaiKhoan()));

    /// <summary>Xuất CSV UTF-8 cùng bộ lọc và quyền với báo cáo tương ứng.</summary>
    [HttpGet("xuat-csv")]
    public async Task<IActionResult> XuatCsv([FromQuery] XuatCsvKhoRequest request)
    {
        var result = await _baoCaoKhoService.XuatCsvAsync(request, User.LayMaTaiKhoan());
        if (!result.ThanhCong)
            return HandleResult(result);

        var tep = result.DuLieu!;
        return File(tep.NoiDung, tep.ContentType, tep.TenTep);
    }
}
