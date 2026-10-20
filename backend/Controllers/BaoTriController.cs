using GearGo.Helpers;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/bao-tri")]
[Route("api/v1/bao-tri")]
[Authorize(Policy = "StaffOrAdmin")]
public class BaoTriController : BaseApiController
{
    private readonly IBaoTriService _baoTriService;

    public BaoTriController(IBaoTriService baoTriService)
    {
        _baoTriService = baoTriService;
    }

    [HttpGet]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemBaoTriRequest request)
        => HandleResult(await _baoTriService.TimKiemAsync(request));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet(long id)
        => HandleResult(await _baoTriService.LayChiTietAsync(id));

    [HttpPost]
    public async Task<IActionResult> LapPhieu([FromBody] LapBaoTriRequest request)
        => HandleCreatedResult(await _baoTriService.LapPhieuAsync(request, User.LayMaTaiKhoan()));

    [HttpPost("{id:long}/phan-cong")]
    public async Task<IActionResult> PhanCongXuLy(long id, [FromBody] PhanCongBaoTriRequest request)
        => HandleResult(await _baoTriService.PhanCongXuLyAsync(id, request, User.LayMaTaiKhoan()));

    [HttpPut("{id:long}/tien-do")]
    public async Task<IActionResult> CapNhatTienDo(long id, [FromBody] CapNhatTienDoRequest request)
        => HandleResult(await _baoTriService.CapNhatTienDoAsync(id, request, User.LayMaTaiKhoan()));

    [HttpPost("{id:long}/gui-kiem-tra")]
    public async Task<IActionResult> GuiKiemTra(long id)
        => HandleResult(await _baoTriService.GuiKiemTraAsync(id, User.LayMaTaiKhoan()));

    [HttpPost("{id:long}/hoan-thanh")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> XacNhanHoanThanh(long id, [FromBody] XacNhanBaoTriRequest request)
        => HandleResult(await _baoTriService.XacNhanHoanThanhAsync(id, request, User.LayMaTaiKhoan()));

    [HttpPost("{id:long}/ket-thuc-khong-dat")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> KetThucKhongDat(long id, [FromBody] XacNhanBaoTriRequest request)
        => HandleResult(await _baoTriService.KetThucKhongDatAsync(id, request, User.LayMaTaiKhoan()));
}
