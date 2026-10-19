using GearGo.Models.Common;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Helpers;

public abstract class KietBaseController : ControllerBase
{
    protected IActionResult HandleResult<T>(Result<T> result)
    {
        if (result.ThanhCong)
        {
            return Ok(result.DuLieu);
        }

        int statusCode = ResolveStatusCode(result.MaLoi);
        return StatusCode(statusCode, new { result.MaLoi, result.ThongDiep });
    }

    protected IActionResult HandleCreatedResult<T>(Result<T> result)
    {
        if (result.ThanhCong)
        {
            return StatusCode(201, result.DuLieu);
        }

        int statusCode = ResolveStatusCode(result.MaLoi);
        return StatusCode(statusCode, new { result.MaLoi, result.ThongDiep });
    }

    public static int ResolveStatusCode(string? maLoi) => maLoi switch
    {
        KietDomainConstants.ErrorCodes.NotFound or
        KietDomainConstants.ErrorCodes.DonNotFound or
        KietDomainConstants.ErrorCodes.PhieuNotFound or
        KietDomainConstants.ErrorCodes.ThietBiNotFound or
        KietDomainConstants.ErrorCodes.NhanVienNotFound or
        KietDomainConstants.ErrorCodes.ChiTietNotFound or
        KietDomainConstants.ErrorCodes.PhuPhiNotFound or
        KietDomainConstants.ErrorCodes.SanPhamNotFound => 404,

        KietDomainConstants.ErrorCodes.KhongCoQuyen or
        KietDomainConstants.ErrorCodes.KhongPhaiNguoiXuLy => 403,

        KietDomainConstants.ErrorCodes.InvalidState or
        KietDomainConstants.ErrorCodes.Locked or
        KietDomainConstants.ErrorCodes.DongDaCoPhieu or
        KietDomainConstants.ErrorCodes.PhieuNhanDaChot or
        KietDomainConstants.ErrorCodes.KetLuanMatChuaDu or
        KietDomainConstants.ErrorCodes.ThietBiDaTra or
        KietDomainConstants.ErrorCodes.ThietBiDangOKhach or
        KietDomainConstants.ErrorCodes.ThietBiDaCoBaoTriMo or
        KietDomainConstants.ErrorCodes.PhieuBaoTriDaKetThuc or
        KietDomainConstants.ErrorCodes.NhanVienDaNghiViec or
        KietDomainConstants.ErrorCodes.ThietBiChuaThuHoi or
        KietDomainConstants.ErrorCodes.ThayDoiLamThieuCamKet => 409,

        _ => 400
    };
}
