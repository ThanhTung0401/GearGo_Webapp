using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Staff;

[ApiController]
[Route("api/bao-tri")]
[Route("api/v1/bao-tri")]
[Authorize]
public class BaoTriController : BaseApiController
{
    private readonly IBaoTriService _baoTriService;

    public BaoTriController(IBaoTriService baoTriService)
    {
        _baoTriService = baoTriService;
    }

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Xem)]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemBaoTriRequest request)
        => HandleResult(await _baoTriService.TimKiemAsync(request));

    [HttpGet("{id:long}")]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Xem)]
    public async Task<IActionResult> LayChiTiet(long id)
        => HandleResult(await _baoTriService.LayChiTietAsync(id));

    [HttpPost]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Tao)]
    public async Task<IActionResult> LapPhieu([FromBody] LapBaoTriRequest request)
        => HandleCreatedResult(await _baoTriService.LapPhieuAsync(request, MaTaiKhoanHienTai));

    [HttpPost("{id:long}/phan-cong")]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Duyet)]
    public async Task<IActionResult> PhanCongXuLy(long id, [FromBody] PhanCongBaoTriRequest request)
        => HandleResult(await _baoTriService.PhanCongXuLyAsync(id, request, MaTaiKhoanHienTai));

    [HttpPut("{id:long}/tien-do")]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Tao)]
    public async Task<IActionResult> CapNhatTienDo(long id, [FromBody] CapNhatTienDoRequest request)
        => HandleResult(await _baoTriService.CapNhatTienDoAsync(id, request, MaTaiKhoanHienTai));

    [HttpPost("{id:long}/gui-kiem-tra")]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Tao)]
    public async Task<IActionResult> GuiKiemTra(long id)
        => HandleResult(await _baoTriService.GuiKiemTraAsync(id, MaTaiKhoanHienTai));

    [HttpPost("{id:long}/hoan-thanh")]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Duyet)]
    public async Task<IActionResult> XacNhanHoanThanh(long id, [FromBody] XacNhanBaoTriRequest request)
        => HandleResult(await _baoTriService.XacNhanHoanThanhAsync(id, request, MaTaiKhoanHienTai));

    [HttpPost("{id:long}/ket-thuc-khong-dat")]
    [RequirePermission(DomainConstants.Permissions.BaoTri_Duyet)]
    public async Task<IActionResult> KetThucKhongDat(long id, [FromBody] XacNhanBaoTriRequest request)
        => HandleResult(await _baoTriService.KetThucKhongDatAsync(id, request, MaTaiKhoanHienTai));
}
