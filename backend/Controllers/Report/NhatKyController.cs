using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers.Report;

/// <summary>
/// UC10.4: Tra cứu nhật ký thao tác và liên kết chứng từ nguồn.
/// </summary>
[ApiController]
[Authorize]
[Route("api/nhat-ky")]
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
        // [AUDIT-03]: lọc theo vai trò thực hiện ngay trên Backend để Pagination chính xác.
        [FromQuery] string? vaiTro = null,
        CancellationToken ct = default)
        => Ok(await _nhatKyService.TraCuuAsync(
            MaTaiKhoanHienTai, maTaiKhoan, hanhDong, loaiDoiTuong, maDoiTuong,
            tuNgay, denNgay, tuKhoa, trang, soMoiTrang, vaiTro, ct));
}
