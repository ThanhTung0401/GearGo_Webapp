using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.HuyDon;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/don-thue")]
public class DonThueController : ControllerBase
{
    private readonly IDonThueService _donThueService;
    private readonly ITruyVanDonThueService _truyVanService;
    private readonly IHuyDonService _huyDonService;

    public DonThueController(IDonThueService donThueService, ITruyVanDonThueService truyVanService, IHuyDonService huyDonService)
    {
        _donThueService = donThueService;
        _truyVanService = truyVanService;
        _huyDonService = huyDonService;
    }

    // ── W3-T1: truy vấn đơn của khách (mã khách lấy từ JWT, không nhận từ request) ──

    [HttpGet]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayDonCuaToi([FromQuery] TimDonRequest filter)
        => Ok(await _truyVanService.LayDonCuaToiAsync(filter, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayChiTiet(long id)
        => Ok(await _truyVanService.LayChiTietDonCuaToiAsync(id, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}/lich-su")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayLichSu(long id)
        => Ok(await _truyVanService.LayLichSuDonCuaToiAsync(id, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}/ban-giao")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayBienBanBanGiao(long id)
        => Ok(await _truyVanService.LayBienBanBanGiaoCuaKhachAsync(id, User.LayMaTaiKhoan()));

    [HttpPost]
    public async Task<IActionResult> TaoDonThue([FromBody] TaoDonThueRequest request)
    {
        var result = await _donThueService.TaoDonThueAsync(request);

        if (!result.ThanhCong)
        {
            return BadRequest(new
            {
                result.MaLoi,
                result.ThongDiep
            });
        }

        return Ok(result.DuLieu);
    }

    // ── W4-T7: hủy đơn của khách (chủ đơn lấy từ JWT) ──

    [HttpGet("{id:long}/huy/xem-truoc")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> XemTruocHuy(long id, CancellationToken ct)
        => Ok(await _huyDonService.XemTruocHuyAsync(id, User.LayMaTaiKhoan(), LoaiHuyDon.KhachHuy, ct));

    [HttpPost("{id:long}/huy")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> HuyDon(long id, [FromBody] HuyDonRequest request, CancellationToken ct)
        => Ok(await _huyDonService.KhachHuyAsync(id, request, User.LayMaTaiKhoan(), ct));

    /// <summary>
    /// Endpoint Tuần 2 giữ cho tương thích (body là chuỗi lý do). Nay đi qua cùng HuyDonService và kiểm tra chủ đơn;
    /// đơn đã thanh toán sẽ nhận 409 CHI_PHI_HUY_DA_THAY_DOI kèm bảng chi phí — dùng POST {id}/huy để xác nhận.
    /// </summary>
    [HttpPut("{id:long}/huy")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> HuyDonThue(long id, [FromBody] string lyDo, CancellationToken ct)
        => Ok(await _huyDonService.KhachHuyAsync(id, new HuyDonRequest(lyDo), User.LayMaTaiKhoan(), ct));
}
