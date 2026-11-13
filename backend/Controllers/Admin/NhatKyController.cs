using GearGo.Data;
using GearGo.Models.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Controllers.Admin;

/// <summary>
/// UC10.4: Tra cứu nhật ký thao tác và liên kết chứng từ nguồn (Chỉ Quản trị viên).
/// </summary>
[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/nhat-ky")]
[Route("api/v1/admin/nhat-ky")]
public class NhatKyController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NhatKyController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
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
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.NhatKyThaoTacs
            .AsNoTracking()
            .Include(n => n.TaiKhoan)
            .AsQueryable();

        if (maTaiKhoan.HasValue)
            query = query.Where(n => n.MaTaiKhoan == maTaiKhoan.Value);
        if (!string.IsNullOrWhiteSpace(hanhDong))
            query = query.Where(n => n.HanhDong == hanhDong.Trim());
        if (!string.IsNullOrWhiteSpace(loaiDoiTuong))
            query = query.Where(n => n.LoaiDoiTuong == loaiDoiTuong.Trim());
        if (!string.IsNullOrWhiteSpace(maDoiTuong))
            query = query.Where(n => n.MaDoiTuong == maDoiTuong.Trim());
        if (tuNgay.HasValue)
            query = query.Where(n => n.ThoiDiem >= tuNgay.Value);
        if (denNgay.HasValue)
            query = query.Where(n => n.ThoiDiem <= denNgay.Value);
        if (!string.IsNullOrWhiteSpace(tuKhoa))
        {
            var kw = tuKhoa.Trim();
            query = query.Where(n =>
                (n.HanhDong != null && n.HanhDong.Contains(kw)) ||
                (n.MaDoiTuong != null && n.MaDoiTuong.Contains(kw)) ||
                (n.LyDo != null && n.LyDo.Contains(kw)) ||
                (n.TaiKhoan != null && n.TaiKhoan.Email != null && n.TaiKhoan.Email.Contains(kw)));
        }

        var total = await query.CountAsync(ct);
        var rawItems = await query
            .OrderByDescending(n => n.ThoiDiem)
            .ThenByDescending(n => n.MaNhatKy)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .Select(n => new
            {
                n.MaNhatKy,
                n.MaTaiKhoan,
                EmailNguoiThucHien = n.TaiKhoan != null ? n.TaiKhoan.Email : null,
                VaiTroNguoiThucHien = n.TaiKhoan != null ? n.TaiKhoan.VaiTro : null,
                n.HanhDong,
                n.LoaiDoiTuong,
                n.MaDoiTuong,
                n.DuLieuTruoc,
                n.DuLieuSau,
                n.ThoiDiem,
                n.LyDo
            })
            .ToListAsync(ct);

        var items = rawItems.Select(n => new
        {
            n.MaNhatKy,
            n.MaTaiKhoan,
            n.EmailNguoiThucHien,
            n.VaiTroNguoiThucHien,
            n.HanhDong,
            n.LoaiDoiTuong,
            n.MaDoiTuong,
            n.DuLieuTruoc,
            n.DuLieuSau,
            n.ThoiDiem,
            n.LyDo,
            // UC10.4.2: Gợi ý đường dẫn API chứng từ nguồn để frontend mở trực tiếp.
            ThamChieuUrl = XayDungUrlChungTu(n.LoaiDoiTuong, n.MaDoiTuong)
        }).ToList();

        return Ok(new PagedResult<object>
        {
            Items = items.Cast<object>().ToList(),
            TotalItems = total,
            CurrentPage = trang,
            PageSize = soMoiTrang
        });
    }

    private static string? XayDungUrlChungTu(string? loaiDoiTuong, string? maDoiTuong)
    {
        if (string.IsNullOrWhiteSpace(loaiDoiTuong) || string.IsNullOrWhiteSpace(maDoiTuong))
            return null;

        return loaiDoiTuong.ToUpperInvariant() switch
        {
            "DON_THUE" => $"/api/v1/van-hanh/don-thue/{maDoiTuong}",
            "PHIEU_NHAP" => $"/api/phieu-nhap/{maDoiTuong}",
            "PHIEU_BAO_TRI" => $"/api/v1/bao-tri/{maDoiTuong}",
            "PHIEU_DIEU_CHINH_KHO" => $"/api/v1/dieu-chinh-kho/{maDoiTuong}",
            "DOI_SOAT" => $"/api/v1/doi-soat/{maDoiTuong}",
            "THIET_BI" => $"/api/thiet-bi/{maDoiTuong}",
            "TAI_KHOAN" => $"/api/v1/admin/tai-khoan/{maDoiTuong}",
            "NHAN_VIEN" => $"/api/v1/admin/nhan-vien/{maDoiTuong}",
            _ => null
        };
    }
}
