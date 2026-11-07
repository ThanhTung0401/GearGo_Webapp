using System.Threading;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.DTOs.ChinhSach;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// Controller Quản trị chính sách (W6-T1 - UC26 - Thanh Tùng).
/// Toàn bộ thao tác ghi yêu cầu quyền quản trị viên hiện tại.
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/chinh-sach")]
[Route("api/v1/admin/chinh-sach")]
public class ChinhSachController : ControllerBase
{
    private readonly IChinhSachService _service;

    public ChinhSachController(IChinhSachService service)
    {
        _service = service;
    }

    /// <summary>Danh sách bản chính sách (phân trang, sort thời điểm giảm dần + phiên bản giảm dần).</summary>
    [HttpGet]
    public async Task<IActionResult> LayDanhSach([FromQuery] int trang = 1, [FromQuery] int kichThuoc = 20, CancellationToken ct = default)
    {
        var kq = await _service.LayDanhSachAsync(trang, kichThuoc, ct);
        return kq.ThanhCong ? Ok(kq.DuLieu) : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep, kq.ChiTiet });
    }

    /// <summary>Chi tiết một phiên bản chính sách.</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet([FromRoute] long id, CancellationToken ct = default)
    {
        var kq = await _service.LayChiTietAsync(id, ct);
        return kq.ThanhCong ? Ok(kq.DuLieu) : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep, kq.ChiTiet });
    }

    /// <summary>Kiểm tra/xem trước nội dung (không ghi).</summary>
    [HttpPost("kiem-tra")]
    public async Task<IActionResult> KiemTra([FromBody] TaoChinhSachRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var actorId = User.LayMaTaiKhoan();
        var kq = await _service.KiemTraNoiDungAsync(request, actorId, ct);
        return kq.ThanhCong ? Ok(kq.DuLieu) : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep, kq.ChiTiet });
    }

    /// <summary>Tạo một phiên bản chính sách mới.</summary>
    [HttpPost]
    public async Task<IActionResult> TaoMoi([FromBody] TaoChinhSachRequest request, CancellationToken ct = default)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var actorId = User.LayMaTaiKhoan();
        var kq = await _service.TaoPhienBanAsync(request, actorId, ct);
        return kq.ThanhCong
            ? StatusCode(201, kq.DuLieu)
            : StatusCode(LayStatusCode(kq.MaLoi), new { kq.MaLoi, kq.ThongDiep, kq.ChiTiet });
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "CHINH_SACH_NOT_FOUND" => 404,
        "CHUA_CO_CHINH_SACH_HIEU_LUC" => 409,
        "PHIEN_BAN_XUNG_DOT" => 409,
        "BAO_GIA_DIEU_KHOAN_DA_DOI" => 409,
        "THOI_DIEM_AP_DUNG_HOI_TO" => 400,
        "NOI_DUNG_CHINH_SACH_KHONG_HOP_LE" => 400,
        DomainConstants.Errors.Forbidden => 403,
        _ => 400
    };
}
