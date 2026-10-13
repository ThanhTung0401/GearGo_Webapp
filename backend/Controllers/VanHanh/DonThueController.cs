using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.HuyDon;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.VanHanh;

[ApiController]
[Route("api/v1/van-hanh/don-thue")]
[Authorize(Policy = "StaffOrAdmin")]
public class DonThueController : ControllerBase
{
    private readonly ITruyVanDonThueService _truyVanService;
    private readonly IHuyDonService _huyDonService;

    public DonThueController(ITruyVanDonThueService truyVanService, IHuyDonService huyDonService)
    {
        _truyVanService = truyVanService;
        _huyDonService = huyDonService;
    }

    [HttpGet]
    public async Task<IActionResult> TimDon([FromQuery] TimDonVanHanhRequest filter)
        => Ok(await _truyVanService.TimDonVanHanhAsync(filter, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet(long id)
        => Ok(await _truyVanService.LayChiTietDonVanHanhAsync(id, User.LayMaTaiKhoan()));

    // ── W4-T7: hủy vận hành ──

    [HttpGet("{id:long}/cua-hang-huy/xem-truoc")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> XemTruocCuaHangHuy(long id, CancellationToken ct)
        => Ok(await _huyDonService.XemTruocHuyAsync(id, User.LayMaTaiKhoan(), LoaiHuyDon.CuaHangHuy, ct));

    [HttpPost("{id:long}/cua-hang-huy")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CuaHangHuy(long id, [FromBody] HuyDonRequest request, CancellationToken ct)
        => Ok(await _huyDonService.CuaHangHuyAsync(id, request, User.LayMaTaiKhoan(), ct));

    [HttpGet("{id:long}/khong-den-nhan/xem-truoc")]
    public async Task<IActionResult> XemTruocKhongDenNhan(long id, CancellationToken ct)
        => Ok(await _huyDonService.XemTruocHuyAsync(id, User.LayMaTaiKhoan(), LoaiHuyDon.KhongDenNhan, ct));

    /// <summary>Nhân viên ghi nhận; chỉ quản trị viên được gửi xuLyHuy=true để hủy theo chính sách không đến nhận.</summary>
    [HttpPost("{id:long}/khong-den-nhan")]
    public async Task<IActionResult> KhongDenNhan(long id, [FromBody] KhongDenNhanRequest request, CancellationToken ct)
        => Ok(await _huyDonService.GhiNhanKhongDenNhanAsync(id, request, User.LayMaTaiKhoan(), ct));
}
