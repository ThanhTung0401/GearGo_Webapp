using GearGo.Helpers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;

namespace GearGo.Controllers.Debug;

/// <summary>
/// v2 §8.7 — endpoint flush cache perms chỉ cho môi trường Development/Test.
/// Playwright/CI gọi để bỏ qua TTL 30s, không sleep.
/// </summary>
[ApiController]
[Route("api/debug/flush-permissions")]
public class FlushPermissionsController : BaseApiController
{
    private readonly IMemoryCache _cache;
    private readonly IHostEnvironment _env;

    public FlushPermissionsController(IMemoryCache cache, IHostEnvironment env)
    {
        _cache = cache;
        _env = env;
    }

    [HttpPost]
    public IActionResult Flush()
    {
        if (!_env.IsDevelopment() && !string.Equals(_env.EnvironmentName, "Test", StringComparison.OrdinalIgnoreCase))
            return NotFound();

        if (_cache is MemoryCache mc) mc.Clear();
        return Ok(new { thongDiep = "Đã flush cache permissions + account state." });
    }
}
