using System.Collections.Concurrent;
using System.Security.Claims;
using GearGo.Configuration;
using GearGo.Exceptions;
using GearGo.Models.DTOs.TuVan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace GearGo.Controllers;

[ApiController]
[Route("api/tu-van")]
public class TuVanController : ControllerBase
{
    private readonly ITuVanAIService _tuVanService;
    private readonly TuVanOptions _options;
    private static readonly ConcurrentDictionary<string, (int Count, DateTime WindowStart)> _rateLimiter = new();

    public TuVanController(ITuVanAIService tuVanService, IOptions<TuVanOptions> options)
    {
        _tuVanService = tuVanService;
        _options = options.Value;
    }

    /// <summary>
    /// Tư vấn bộ đồ dã ngoại qua AI hoặc gợi ý theo quy tắc dự phòng (UC09)
    /// </summary>
    [HttpPost("bo-do")]
    [AllowAnonymous]
    public async Task<IActionResult> TuVanBoDo([FromBody] TuVanBoDoRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Kiểm tra rate limit theo IP hoặc User
        var clientKey = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (User.Identity?.IsAuthenticated == true)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("MaTaiKhoan")?.Value;
            if (!string.IsNullOrEmpty(userId)) clientKey = $"user_{userId}";
        }

        if (KiemTraRateLimit(clientKey))
        {
            return StatusCode(429, new
            {
                maLoi = "VUOT_GIOI_HAN_TU_VAN",
                thongDiep = "Bạn đã gửi yêu cầu quá nhanh. Vui lòng thử lại sau giây lát."
            });
        }

        var result = await _tuVanService.TuVanAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Tính toán lại giá, cọc và kiểm tra khả dụng khi khách chỉnh sửa số lượng / bỏ bớt món
    /// </summary>
    [HttpPost("bo-do/kiem-tra")]
    [AllowAnonymous]
    public async Task<IActionResult> KiemTraBoDo([FromBody] TuVanBoDoRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _tuVanService.KiemTraVaTinhLaiBoDoAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Thêm toàn bộ bộ đồ đã chọn vào giỏ hàng của khách hàng (yêu cầu đăng nhập)
    /// </summary>
    [HttpPost("bo-do/them-vao-gio")]
    public async Task<IActionResult> ThemBoDoVaoGio([FromBody] ThemBoDoRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (User.Identity?.IsAuthenticated != true)
        {
            return Unauthorized(new
            {
                maLoi = "CAN_DANG_NHAP_DE_THEM_GIO",
                thongDiep = "Vui lòng đăng nhập để thêm bộ đồ vào giỏ hàng."
            });
        }

        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                    ?? User.FindFirst("MaTaiKhoan")?.Value;
        if (!long.TryParse(claim, out var maKhachHang))
        {
            return Unauthorized(new
            {
                maLoi = "CAN_DANG_NHAP_DE_THEM_GIO",
                thongDiep = "Phiên đăng nhập không hợp lệ hoặc thiếu thông tin định danh."
            });
        }

        await _tuVanService.ThemBoDoVaoGioAsync(maKhachHang, request, cancellationToken);
        return Ok(new
        {
            thanhCong = true,
            thongDiep = "Đã thêm toàn bộ bộ đồ vào giỏ hàng thành công."
        });
    }

    private bool KiemTraRateLimit(string key)
    {
        var limit = _options.RateLimitPerMinute > 0 ? _options.RateLimitPerMinute : 30;
        var now = DateTime.UtcNow;

        var entry = _rateLimiter.AddOrUpdate(
            key,
            (Count: 1, WindowStart: now),
            (k, existing) =>
            {
                if (now - existing.WindowStart > TimeSpan.FromMinutes(1))
                {
                    return (Count: 1, WindowStart: now);
                }
                return (Count: existing.Count + 1, WindowStart: existing.WindowStart);
            });

        return entry.Count > limit;
    }
}
