using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Report;

/// <summary>
/// Báo cáo kho hợp nhất: hiện trạng vận hành, bảo trì, nhập hàng, điều chỉnh nhập, lịch sử đơn giá và xuất CSV.
/// Phân quyền chi tiết theo từng permission từ DB.
/// </summary>
[ApiController]
[Authorize]
[Route("api/bao-cao/kho")]
public class BaoCaoKhoController : BaseApiController
{
    private readonly IBaoCaoKhoService _baoCaoKhoService;

    public BaoCaoKhoController(IBaoCaoKhoService baoCaoKhoService) => _baoCaoKhoService = baoCaoKhoService;

    [HttpGet("hien-trang")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoKho_Xem)]
    public async Task<IActionResult> LayHienTrang([FromQuery] LocHienTrangKhoRequest filter)
        => HandleResult(await _baoCaoKhoService.LayHienTrangKhoAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("bao-tri")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoKho_Xem)]
    public async Task<IActionResult> LayThongKeBaoTri([FromQuery] LocBaoTriRequest filter)
        => HandleResult(await _baoCaoKhoService.LayThongKeBaoTriAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("nhap-hang")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoKho_Xem)]
    public async Task<IActionResult> LayNhapHang([FromQuery] LocNhapHangRequest filter)
        => HandleResult(await _baoCaoKhoService.LayNhapHangAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("dieu-chinh-nhap")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoKho_Xem)]
    public async Task<IActionResult> LayDieuChinhNhap([FromQuery] LocNhapHangRequest filter)
        => HandleResult(await _baoCaoKhoService.LayDieuChinhNhapAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("lich-su-don-gia")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoKho_Xem)]
    public async Task<IActionResult> LayLichSuDonGia([FromQuery] LocNhapHangRequest filter)
        => HandleResult(await _baoCaoKhoService.LayLichSuDonGiaAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("xuat-csv")]
    [RequirePermission(DomainConstants.Permissions.BaoCaoKho_Xuat)]
    public async Task<IActionResult> XuatCsv([FromQuery] XuatCsvKhoRequest request)
    {
        var result = await _baoCaoKhoService.XuatCsvAsync(request, MaTaiKhoanHienTai);
        if (!result.ThanhCong)
            return HandleResult(result);

        var tep = result.DuLieu!;
        return File(tep.NoiDung, tep.ContentType, tep.TenTep);
    }
}
