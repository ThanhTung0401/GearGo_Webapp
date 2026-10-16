using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/don-thue")]
[Authorize]
public class DonThueController : ControllerBase
{
    private readonly IDonThueService _donThueService;
    private readonly ITruyVanDonThueService _truyVanService;
    private readonly ApplicationDbContext _context;

    public DonThueController(
        IDonThueService donThueService,
        ITruyVanDonThueService truyVanService,
        ApplicationDbContext context)
    {
        _donThueService = donThueService;
        _truyVanService = truyVanService;
        _context = context;
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

    // ── W2-UC05: Tạo đơn an toàn, chống IDOR ──

    [HttpPost]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> TaoDonThue([FromBody] TaoDonThueRequest request)
    {
        // 🔒 BẢO MẬT: Bắt buộc lấy MaKhachHang từ JWT, ghi đè toàn bộ dữ liệu giả mạo từ body
        long maTaiKhoan = User.LayMaTaiKhoan();
        long maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        request.MaKhachHang = maKhachHang;

        var result = await _donThueService.TaoDonThueAsync(request);
        if (!result.ThanhCong)
        {
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        }

        return Ok(result.DuLieu);
    }

    // ── W2-UC05: Hủy đơn an toàn có xác thực quyền sở hữu ──

    [HttpPut("{id:long}/huy")]
    [Authorize]
    public async Task<IActionResult> HuyDonThue(long id, [FromBody] HuyDonRequest request)
    {
        long maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _donThueService.HuyDonAsync(id, request.LyDo, maTaiKhoan);
        if (!result.ThanhCong)
        {
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        }

        return Ok(new { Message = "Đã hủy đơn thành công!" });
    }
}
