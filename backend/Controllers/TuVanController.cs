using System.Collections.Concurrent;
using System.Security.Claims;
using GearGo.Configuration;
using GearGo.Helpers;
using GearGo.Models.DTOs.TuVan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace GearGo.Controllers;

[ApiController]
[Route("api/tu-van")]
public class TuVanController : BaseApiController
{
    private readonly ITuVanAIService _tuVanService;
    private readonly TuVanOptions _options;
    private static readonly ConcurrentDictionary<string, (int Count, DateTime WindowStart)> _rateLimiter = new();

    public TuVanController(ITuVanAIService tuVanService, IOptions<TuVanOptions> options)
    {
        _tuVanService = tuVanService;
        _options = options.Value;
    }

    [HttpPost("bo-do")]
    [AllowAnonymous]
    public async Task<IActionResult> TuVanBoDo([FromBody] TuVanBoDoRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.Identity?.IsAuthenticated == true
            ? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("MaTaiKhoan")?.Value
            : null;
        var clientKey = !string.IsNullOrEmpty(userId)
            ? $"user_{userId}"
            : HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        if (KiemTraRateLimit(clientKey))
            return StatusCode(429, new { maLoi = "VUOT_GIOI_HAN_TU_VAN", thongDiep = "Bạn đã gửi yêu cầu quá nhanh. Vui lòng thử lại sau giây lát." });

        return Ok(await _tuVanService.TuVanAsync(request, cancellationToken));
    }

    [HttpPost("bo-do/kiem-tra")]
    [AllowAnonymous]
    public async Task<IActionResult> KiemTraBoDo([FromBody] TuVanBoDoRequest request, CancellationToken cancellationToken)
        => ModelState.IsValid ? Ok(await _tuVanService.KiemTraVaTinhLaiBoDoAsync(request, cancellationToken)) : BadRequest(ModelState);

    [HttpPost("bo-do/them-vao-gio")]
    public async Task<IActionResult> ThemBoDoVaoGio([FromBody] ThemBoDoRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var claim = User.Identity?.IsAuthenticated == true
            ? User.FindFirst("MaTaiKhoan")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            : null;
        if (!long.TryParse(claim, out var maTaiKhoan))
            return Unauthorized(new { maLoi = "CAN_DANG_NHAP_DE_THEM_GIO", thongDiep = "Vui lòng đăng nhập để thêm bộ đồ vào giỏ hàng." });

        await _tuVanService.ThemBoDoVaoGioAsync(maTaiKhoan, request, cancellationToken);
        return Ok(new { thanhCong = true, thongDiep = "Đã thêm toàn bộ bộ đồ vào giỏ hàng thành công." });
    }

    private bool KiemTraRateLimit(string key)
    {
        var limit = _options.RateLimitPerMinute > 0 ? _options.RateLimitPerMinute : 30;
        var now = DateTime.UtcNow;
        var entry = _rateLimiter.AddOrUpdate(
            key,
            (Count: 1, WindowStart: now),
            (_, existing) => now - existing.WindowStart > TimeSpan.FromMinutes(1)
                ? (Count: 1, WindowStart: now)
                : (Count: existing.Count + 1, existing.WindowStart));
        return entry.Count > limit;
    }
}
