using GearGo.Helpers;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/danh-gia")]
[Route("api/v1/danh-gia")]
public class DanhGiaController : BaseApiController
{
    private readonly IDanhGiaService _danhGiaService;
    private readonly IWebHostEnvironment _env;

    public DanhGiaController(IDanhGiaService danhGiaService, IWebHostEnvironment env)
    {
        _danhGiaService = danhGiaService;
        _env = env;
    }

    [HttpGet("san-pham/{sanPhamId:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> LayDanhGiaSanPham(
        long sanPhamId, [FromQuery] int? soSao, [FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 10, [FromQuery] string? thuTu = "MoiNhat")
        => HandleResult(await _danhGiaService.LayDanhGiaSanPhamAsync(new LocDanhGiaRequest
        {
            SanPhamId = sanPhamId, SoSao = soSao, Trang = trang, SoMoiTrang = soMoiTrang, ThuTu = thuTu
        }), LayStatusCode);

    [HttpGet("san-pham/{sanPhamId:long}/tong-hop")]
    [AllowAnonymous]
    public async Task<IActionResult> LayTongHopDiem(long sanPhamId)
        => HandleResult(await _danhGiaService.LayTongHopDiemAsync(sanPhamId), LayStatusCode);

    [HttpGet("du-dieu-kien")]
    [Authorize]
    public async Task<IActionResult> LaySanPhamDuDieuKien()
        => HandleResult(await _danhGiaService.LaySanPhamDuDieuKienDanhGiaAsync(MaTaiKhoanHienTai), LayStatusCode);

    [HttpGet("cua-toi")]
    [Authorize]
    public async Task<IActionResult> LayDanhGiaCuaToi([FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 10)
        => HandleResult(await _danhGiaService.LayDanhGiaCuaToiAsync(trang, soMoiTrang, MaTaiKhoanHienTai), LayStatusCode);

    /// <summary>
    /// Khách hàng tải lên hình ảnh đính kèm đánh giá (UC9.1.2 - Hỗ trợ .jpg, .jpeg, .png, .webp <= 5MB)
    /// </summary>
    [HttpPost("hinh-anh")]
    [Authorize]
    public async Task<IActionResult> UploadHinhAnh(IFormFile file)
    {
        if (!FileValidator.IsValidImage(file, out var errorMessage))
            return BadRequest(new { MaLoi = "FILE_KHONG_HOP_LE", ThongDiep = errorMessage });

        var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads", "reviews");
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
        await using (var stream = new FileStream(Path.Combine(uploadsFolder, uniqueFileName), FileMode.Create))
            await file.CopyToAsync(stream);

        var relativeUrl = $"/uploads/reviews/{uniqueFileName}";
        return StatusCode(201, new { url = relativeUrl, duongDan = relativeUrl });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> TaoDanhGia([FromBody] TaoDanhGiaRequest request)
        => HandleCreatedResult(await _danhGiaService.TaoDanhGiaAsync(request, MaTaiKhoanHienTai), LayStatusCode);

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DANH_GIA_NOT_FOUND" or "CHI_TIET_DON_NOT_FOUND" => 404,
        "DANH_GIA_KHONG_THUOC_KHACH" or "KHONG_CO_QUYEN_KIEM_DUYET" => 403,
        "DON_CHUA_HOAN_TAT" or "SAN_PHAM_TRONG_DON_DA_DANH_GIA" => 409,
        _ => 400
    };
}
