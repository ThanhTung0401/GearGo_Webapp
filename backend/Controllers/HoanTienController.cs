using GearGo.Helpers;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>W4-T6 — hoàn tiền. Không có endpoint cho khách tự tạo yêu cầu hoàn hoặc tự nhập số tiền/nguồn.</summary>
[ApiController]
[Route("api/v1/hoan-tien")]
public class HoanTienController : ControllerBase
{
    private readonly IHoanTienService _hoanTienService;

    public HoanTienController(IHoanTienService hoanTienService) => _hoanTienService = hoanTienService;

    /// <summary>Chủ đơn hoặc nhân viên/quản trị viên; đơn của người khác trả 404.</summary>
    [HttpGet("theo-don/{donId:long}")]
    [Authorize]
    public async Task<IActionResult> LayTheoDon(long donId, CancellationToken ct)
        => Ok(await _hoanTienService.LayDanhSachTheoDonAsync(donId, User.LayMaTaiKhoan(), ct));

    [HttpPost("{id:long}/xu-ly")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> XuLy(long id, [FromBody] XuLyHoanRequest? request, CancellationToken ct)
        => Ok(await _hoanTienService.XuLyYeuCauHoanAsync(id, request ?? new XuLyHoanRequest(), User.LayMaTaiKhoan(), ct));

    [HttpPost("{id:long}/doi-chieu")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<IActionResult> DoiChieu(long id, CancellationToken ct)
        => Ok(await _hoanTienService.DoiChieuKetQuaHoanAsync(id, User.LayMaTaiKhoan(), ct));

    /// <summary>Callback gateway: xác thực bằng chữ ký trong body (adapter), không bằng JWT người dùng.</summary>
    [HttpPost("ket-qua")]
    [AllowAnonymous]
    public async Task<IActionResult> KetQua([FromBody] KetQuaHoanCallbackRequest request, CancellationToken ct)
    {
        var kq = await _hoanTienService.XuLyKetQuaHoanAsync(request, ct);
        // Acknowledgement tối thiểu cho gateway; không trả dữ liệu đơn/khách.
        return Ok(new { daNhan = true, kq.MaYeuCau, kq.TrangThai });
    }
}
