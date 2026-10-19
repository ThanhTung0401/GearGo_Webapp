using GearGo.Helpers;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

[ApiController]
[Route("api/bao-tri")]
[Route("api/v1/bao-tri")]
[Authorize(Policy = "StaffOrAdmin")]
public class BaoTriController : ControllerBase
{
    private readonly IBaoTriService _baoTriService;

    public BaoTriController(IBaoTriService baoTriService)
    {
        _baoTriService = baoTriService;
    }

    [HttpGet]
    public async Task<IActionResult> TimKiem([FromQuery] TimKiemBaoTriRequest request)
    {
        var result = await _baoTriService.TimKiemAsync(request);
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> LayChiTiet(long id)
    {
        var result = await _baoTriService.LayChiTietAsync(id);
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost]
    public async Task<IActionResult> LapPhieu([FromBody] LapBaoTriRequest request)
    {
        var result = await _baoTriService.LapPhieuAsync(request, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? StatusCode(201, result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{id:long}/phan-cong")]
    public async Task<IActionResult> PhanCongXuLy(long id, [FromBody] PhanCongBaoTriRequest request)
    {
        var result = await _baoTriService.PhanCongXuLyAsync(id, request, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPut("{id:long}/tien-do")]
    public async Task<IActionResult> CapNhatTienDo(long id, [FromBody] CapNhatTienDoRequest request)
    {
        var result = await _baoTriService.CapNhatTienDoAsync(id, request, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{id:long}/gui-kiem-tra")]
    public async Task<IActionResult> GuiKiemTra(long id)
    {
        var result = await _baoTriService.GuiKiemTraAsync(id, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{id:long}/hoan-thanh")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> XacNhanHoanThanh(long id, [FromBody] XacNhanBaoTriRequest request)
    {
        var result = await _baoTriService.XacNhanHoanThanhAsync(id, request, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("{id:long}/ket-thuc-khong-dat")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> KetThucKhongDat(long id, [FromBody] XacNhanBaoTriRequest request)
    {
        var result = await _baoTriService.KetThucKhongDatAsync(id, request, User.LayMaTaiKhoan());
        return result.ThanhCong
            ? Ok(result.DuLieu)
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "PHIEU_NOT_FOUND" or "THIET_BI_NOT_FOUND" or "NHAN_VIEN_NOT_FOUND" => 404,
        "KHONG_PHAI_NGUOI_XU_LY" or "KHONG_CO_QUYEN" => 403,
        "THIET_BI_DANG_O_KHACH" or "THIET_BI_DA_CO_BAO_TRI_MO" or "PHIEU_BAO_TRI_DA_KET_THUC" or "NHAN_VIEN_DA_NGHI_VIEC" or "INVALID_STATE" => 409,
        _ => 400
    };
}
