using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Admin;

/// <summary>
/// UC10.4: Tra cứu nhật ký thao tác và liên kết chứng từ nguồn (Quản trị viên và Nhân viên vận hành).
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/nhat-ky")]
[Route("api/v1/admin/nhat-ky")]
public class NhatKyController : BaseApiController
{
    private readonly INhatKyService _nhatKyService;

    public NhatKyController(INhatKyService nhatKyService) => _nhatKyService = nhatKyService;

    [HttpGet]
    [RequirePermission(DomainConstants.Permissions.NhatKy_Xem)]
    public async Task<IActionResult> TraCuu(
        [FromQuery] long? maTaiKhoan,
        [FromQuery] string? hanhDong,
        [FromQuery] string? loaiDoiTuong,
        [FromQuery] string? maDoiTuong,
        [FromQuery] DateTime? tuNgay,
        [FromQuery] DateTime? denNgay,
        [FromQuery] string? tuKhoa,
        [FromQuery] int trang = 1,
        [FromQuery] int soMoiTrang = 20,
        CancellationToken ct = default)
        => Ok(await _nhatKyService.TraCuuAsync(
            MaTaiKhoanHienTai, maTaiKhoan, hanhDong, loaiDoiTuong, maDoiTuong,
            tuNgay, denNgay, tuKhoa, trang, soMoiTrang, ct));
}
