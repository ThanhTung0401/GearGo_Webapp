using GearGo.Helpers;
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

    public bool CanHandle(string ketLuan)
        => ketLuan is DomainConstants.InspectionConclusions.MinorDamage or DomainConstants.InspectionConclusions.MajorDamage;

    public async Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue)
    {
        thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;
        chiTiet.ThoiDiemTraThucTe ??= DateTime.UtcNow;

        string mucDo = chiTiet.KetLuan == DomainConstants.InspectionConclusions.MajorDamage
            ? DomainConstants.Maintenance.LevelMajor
            : DomainConstants.Maintenance.LevelMinor;

        await _baoTriService.TaoPhieuBaoTriToiThieuAsync(
            thietBi.MaThietBi,
            maDonThue,
            nhanVien.MaNhanVien,
            DomainConstants.Maintenance.TypeRepair,
            $"Hư hỏng sau thuê: {chiTiet.TinhTrangSauThue}",
            mucDo);
    }
}
