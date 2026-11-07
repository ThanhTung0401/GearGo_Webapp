using System;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.DTOs.ChinhSach;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

/// <summary>
/// Endpoint công khai cho phần điều khoản khách cần biết (W6-T1 - UC26 - Thanh Tùng).
/// Không trả ngưỡng duyệt nội bộ hoặc metadata chỉ dùng cho quản trị.
/// </summary>
[ApiController]
[Route("api/chinh-sach")]
[Route("api/v1/chinh-sach")]
public class ChinhSachController : ControllerBase
{
    private readonly IChinhSachService _service;

    public ChinhSachController(IChinhSachService service)
    {
        _service = service;
    }

    /// <summary>Trả chính sách hiện hành, chỉ phần điều kiện thuê dành cho khách.</summary>
    [HttpGet("hien-hanh")]
    public async Task<IActionResult> LayHienHanh(CancellationToken ct = default)
    {
        var kq = await _service.LayDangHieuLucAsync(DateTime.UtcNow, ct);
        if (!kq.ThanhCong || kq.DuLieu is null)
        {
            var code = kq.MaLoi == "CHUA_CO_CHINH_SACH_HIEU_LUC" ? 409 : 400;
            return StatusCode(code, new { kq.MaLoi, kq.ThongDiep });
        }

        var cs = kq.DuLieu;
        return Ok(new
        {
            maChinhSach = cs.MaChinhSach,
            phienBan = cs.PhienBan,
            tenChinhSach = cs.TenChinhSach,
            thoiDiemApDung = cs.ThoiDiemApDung,
            dieuKhoanChoKhach = new DieuKhoanChoKhachDto
            {
                ThoiGianGiuChoPhut = cs.NoiDung?.ThoiGianGiuChoPhut,
                HeSoTre = cs.NoiDung?.HeSoTre,
                TyLeCocPhanTram = cs.NoiDung?.TyLeCocPhanTram,
                HuyDon = cs.NoiDung?.HuyDon,
                KhongDenNhan = cs.NoiDung?.KhongDenNhan,
                MocNhac = cs.NoiDung?.MocNhac
            }
        });
    }
}
