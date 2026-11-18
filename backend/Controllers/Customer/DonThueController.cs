using System.Text.Json;
using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.HuyDon;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Customer;

[ApiController]
[Route("api/v1/don-thue")]
[Route("api/don-thue")]
[Authorize]
public class DonThueController : BaseApiController
{
    private readonly IDonThueService _donThueService;
    private readonly ITruyVanDonThueService _truyVanService;
    private readonly IHuyDonService _huyDonService;
    private readonly IChinhSachService _chinhSachService;

    public DonThueController(
        IDonThueService donThueService,
        ITruyVanDonThueService truyVanService,
        IHuyDonService huyDonService,
        IChinhSachService chinhSachService)
    {
        _donThueService = donThueService;
        _truyVanService = truyVanService;
        _huyDonService = huyDonService;
        _chinhSachService = chinhSachService;
    }

    // ── W6-T1 (UC26 - Thanh Tùng): chính sách gắn với đơn ──
    [HttpGet("{id:long}/chinh-sach")]
    public async Task<IActionResult> LayChinhSachCuaDon([FromRoute] long id, CancellationToken ct)
        => HandleResult(
            await _chinhSachService.LayChinhSachCuaDonAsync(id, MaTaiKhoanHienTai, ct),
            maLoi => maLoi switch { "DON_THUE_NOT_FOUND" => 404, "KHONG_CO_QUYEN" => 403, _ => 400 });

    // ── W3-T1: truy vấn đơn của khách (mã khách lấy từ JWT) ──
    [HttpGet]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayDonCuaToi([FromQuery] TimDonRequest filter)
        => Ok(await _truyVanService.LayDonCuaToiAsync(filter, MaTaiKhoanHienTai));

    [HttpGet("{id:long}")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayChiTiet(long id)
        => Ok(await _truyVanService.LayChiTietDonCuaToiAsync(id, MaTaiKhoanHienTai));

    [HttpGet("{id:long}/lich-su")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayLichSu(long id)
        => Ok(await _truyVanService.LayLichSuDonCuaToiAsync(id, MaTaiKhoanHienTai));

    [HttpGet("{id:long}/ban-giao")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayBienBanBanGiao(long id)
        => Ok(await _truyVanService.LayBienBanBanGiaoCuaKhachAsync(id, MaTaiKhoanHienTai));

    // ── W2-UC05: Tạo đơn an toàn, chống IDOR ──
    [HttpPost]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> TaoDonThue([FromBody] TaoDonThueRequest request)
    {
        request.MaTaiKhoan = MaTaiKhoanHienTai;
        return HandleResult(await _donThueService.TaoDonThueAsync(request), _ => 400);
    }

    // ── W4-T7: hủy đơn của khách ──
    [HttpGet("{id:long}/huy/xem-truoc")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> XemTruocHuy(long id, CancellationToken ct)
        => Ok(await _huyDonService.XemTruocHuyAsync(id, MaTaiKhoanHienTai, LoaiHuyDon.KhachHuy, ct));

    [HttpPost("{id:long}/huy")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> HuyDon(long id, [FromBody] HuyDonRequest request, CancellationToken ct)
        => Ok(await _huyDonService.KhachHuyAsync(id, request, MaTaiKhoanHienTai, ct));

    [HttpPut("{id:long}/huy")]
    [Authorize]
    public async Task<IActionResult> HuyDonThue(long id, [FromBody] JsonElement body, CancellationToken ct)
    {
        string lyDo = TrichXuatLyDoHuy(body);
        return HandleResult(
            await _donThueService.HuyDonTuongThichAsync(id, lyDo, MaTaiKhoanHienTai, _huyDonService, ct),
            maLoi => maLoi == DomainConstants.Errors.NotFound ? 404 : 400);
    }

    private static string TrichXuatLyDoHuy(JsonElement body)
    {
        if (body.ValueKind == JsonValueKind.String)
            return body.GetString() ?? "Khách hàng hủy đơn";

        if (body.ValueKind == JsonValueKind.Object &&
            (body.TryGetProperty("lyDo", out var prop) || body.TryGetProperty("LyDo", out prop)))
            return prop.GetString() ?? "Khách hàng hủy đơn";

        return "Khách hàng hủy đơn";
    }
}
