using GearGo.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Common;

/// <summary>
/// Endpoint tải tệp hình ảnh dùng chung cho hồ sơ, bằng chứng bàn giao/nhận trả, bảo trì và điều chỉnh kho.
/// </summary>
[ApiController]
[Route("api/tep-tin")]
[Authorize]
public class TepTinController : BaseApiController
{
    private static readonly HashSet<string> ThuMucHopLe = new(StringComparer.OrdinalIgnoreCase)
    {
        "avatars",
        "reviews",
        "evidence",
        "maintenance",
        "inventory",
        "general"
    };

    private readonly IWebHostEnvironment _env;

    public TepTinController(IWebHostEnvironment env) => _env = env;

    [HttpPost("upload")]
    public async Task<IActionResult> UploadHinhAnh(IFormFile file, [FromQuery] string? thuMuc = "general")
    {
        if (!FileValidator.IsValidImage(file, out var errorMessage))
            return BadRequest(new { MaLoi = "FILE_KHONG_HOP_LE", ThongDiep = errorMessage });

        var safeFolder = !string.IsNullOrWhiteSpace(thuMuc) && ThuMucHopLe.Contains(thuMuc.Trim())
            ? thuMuc.Trim().ToLowerInvariant()
            : "general";

        var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads", safeFolder);
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
        await using (var stream = new FileStream(Path.Combine(uploadsFolder, uniqueFileName), FileMode.Create))
            await file.CopyToAsync(stream);

        var relativeUrl = $"/uploads/{safeFolder}/{uniqueFileName}";
        return StatusCode(201, new { url = relativeUrl, duongDan = relativeUrl });
    }
}
