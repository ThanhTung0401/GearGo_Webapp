using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Finance;

/// <summary>W4-T6 — hoàn tiền. Không có endpoint cho khách tự tạo yêu cầu hoàn hoặc tự nhập số tiền/nguồn.</summary>
[ApiController]
[Route("api/hoan-tien")]
public class HoanTienController : BaseApiController
{
    private readonly IHoanTienService _hoanTienService;

    public HoanTienController(IHoanTienService hoanTienService) => _hoanTienService = hoanTienService;

    /// <summary>Chủ đơn hoặc nhân viên/quản trị viên; đơn của người khác trả 404.
    /// v2 §P3 — endpoint cross-role: Customer phải xem được yêu cầu hoàn của ĐƠN CHÍNH MÌNH,
    /// Staff/Admin xem mọi đơn. Service đã guard theo MaTaiKhoanHienTai → giữ [Authorize] đủ.
    /// KHÔNG gắn [RequirePermission(HoanTien_Xem)] vì sẽ chặn Customer (vai trò không nhận permission quản trị).</summary>
    [HttpGet("theo-don/{donId:long}")]
    [Authorize]
    public async Task<IActionResult> LayTheoDon(long donId, CancellationToken ct)
        => Ok(await _hoanTienService.LayDanhSachTheoDonAsync(donId, MaTaiKhoanHienTai, ct));

    [HttpPost("{id:long}/xu-ly")]
    [RequirePermission(DomainConstants.Permissions.HoanTien_Duyet)]
    public async Task<IActionResult> XuLy(long id, [FromBody] XuLyHoanRequest? request, CancellationToken ct)
        => Ok(await _hoanTienService.XuLyYeuCauHoanAsync(id, request ?? new XuLyHoanRequest(), MaTaiKhoanHienTai, ct));

    [HttpPost("{id:long}/doi-chieu")]
    [RequirePermission(DomainConstants.Permissions.HoanTien_Duyet)]
    public async Task<IActionResult> DoiChieu(long id, CancellationToken ct)
        => Ok(await _hoanTienService.DoiChieuKetQuaHoanAsync(id, MaTaiKhoanHienTai, ct));

    /// <summary>Callback gateway: xác thực bằng chữ ký trong body (adapter), không bằng JWT người dùng.</summary>
    [HttpPost("ket-qua")]
    // v2 §8.9+§8.10 — callback gateway, KHÔNG thêm [RequirePermission] (bị override thầm lặng); KHÔNG dùng MaTaiKhoanHienTai (throw).
    [AllowAnonymous]
    public async Task<IActionResult> KetQua([FromBody] KetQuaHoanCallbackRequest request, CancellationToken ct)
    {
        var kq = await _hoanTienService.XuLyKetQuaHoanAsync(request, ct);
        // Acknowledgement tối thiểu cho gateway; không trả dữ liệu đơn/khách.
        return Ok(new { daNhan = true, kq.MaYeuCau, kq.TrangThai });
    }
}

