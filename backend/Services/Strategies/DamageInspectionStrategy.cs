using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Strategies;

public class DamageInspectionStrategy : IInspectionStrategy
{
    private readonly IBaoTriService _baoTriService;

    public DamageInspectionStrategy(IBaoTriService baoTriService)
    {
        _baoTriService = baoTriService;
    }

    public bool CanHandle(string ketLuan) => ketLuan is "HongNhe" or "HongNang";

    public async Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue)
    {
        thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;
        if (!chiTiet.ThoiDiemTraThucTe.HasValue)
        {
            chiTiet.ThoiDiemTraThucTe = DateTime.UtcNow;
        }

        string mucDo = chiTiet.KetLuan == "HongNang" ? "Nang" : "Nhe";
        await _baoTriService.TaoPhieuBaoTriToiThieuAsync(
            thietBi.MaThietBi,
            maDonThue,
            nhanVien.MaNhanVien,
            "SuaChua",
            $"Hư hỏng sau thuê: {chiTiet.TinhTrangSauThue}",
            mucDo);
    }
}
