using System;
using System.IO;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/danh-gia")]
[Route("api/v1/danh-gia")]
public class DanhGiaController : ControllerBase
{
    private readonly IDanhGiaService _danhGiaService;
    private readonly IWebHostEnvironment _env;

    public DanhGiaController(IDanhGiaService danhGiaService, IWebHostEnvironment env)
    {
        _danhGiaService = danhGiaService;
        _env = env;
    }

    /// <summary>
    /// Lấy danh sách đánh giá công khai của sản phẩm (chỉ hiển thị các đánh giá hợp lệ)
    /// </summary>
    [HttpGet("san-pham/{sanPhamId:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> LayDanhGiaSanPham(long sanPhamId, [FromQuery] int? soSao, [FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 10, [FromQuery] string? thuTu = "MoiNhat")
    {
        var request = new LocDanhGiaRequest
        {
            SanPhamId = sanPhamId,
            SoSao = soSao,
            Trang = trang,
            SoMoiTrang = soMoiTrang,
            ThuTu = thuTu
        };

        var result = await _danhGiaService.LayDanhGiaSanPhamAsync(request);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy điểm trung bình, số lượt đánh giá và biểu đồ phân bố 1-5 sao của sản phẩm
    /// </summary>
    [HttpGet("san-pham/{sanPhamId:long}/tong-hop")]
    [AllowAnonymous]
    public async Task<IActionResult> LayTongHopDiem(long sanPhamId)
    {
        var result = await _danhGiaService.LayTongHopDiemAsync(sanPhamId);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy các sản phẩm trong các đơn đã hoàn tất đủ điều kiện đánh giá của khách
    /// </summary>
    [HttpGet("du-dieu-kien")]
    [Authorize]
    public async Task<IActionResult> LaySanPhamDuDieuKien()
    {
        var maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _danhGiaService.LaySanPhamDuDieuKienDanhGiaAsync(maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

    /// <summary>
    /// Lấy danh sách các đánh giá do chính khách hàng đã viết
    /// </summary>
    [HttpGet("cua-toi")]
    [Authorize]
    public async Task<IActionResult> LayDanhGiaCuaToi([FromQuery] int trang = 1, [FromQuery] int soMoiTrang = 10)
    {
        var maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _danhGiaService.LayDanhGiaCuaToiAsync(trang, soMoiTrang, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return Ok(result.DuLieu);
    }

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
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var uniqueFileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativeUrl = $"/uploads/reviews/{uniqueFileName}";
        return StatusCode(201, new { url = relativeUrl, duongDan = relativeUrl });
    }

    /// <summary>
    /// Khách hàng gửi đánh giá mới cho sản phẩm đã thuê trong đơn hoàn tất
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> TaoDanhGia([FromBody] TaoDanhGiaRequest request)
    {
        var maTaiKhoan = User.LayMaTaiKhoan();
        var result = await _danhGiaService.TaoDanhGiaAsync(request, maTaiKhoan);
        if (!result.ThanhCong)
            return StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
        return StatusCode(201, result.DuLieu);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DANH_GIA_NOT_FOUND" or "CHI_TIET_DON_NOT_FOUND" => 404,
        "DANH_GIA_KHONG_THUOC_KHACH" or "KHONG_CO_QUYEN_KIEM_DUYET" => 403,
        "DON_CHUA_HOAN_TAT" or "SAN_PHAM_TRONG_DON_DA_DANH_GIA" => 409,
        _ => 400
    };
}
