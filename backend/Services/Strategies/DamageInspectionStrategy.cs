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
        => ketLuan is KietDomainConstants.KetLuanKiemTra.HongNhe or KietDomainConstants.KetLuanKiemTra.HongNang;

    public async Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue)
    {
        thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;
        chiTiet.ThoiDiemTraThucTe ??= DateTime.UtcNow;

        string mucDo = chiTiet.KetLuan == KietDomainConstants.KetLuanKiemTra.HongNang
            ? KietDomainConstants.BaoTriConfig.MucDoNang
            : KietDomainConstants.BaoTriConfig.MucDoNhe;

        await _baoTriService.TaoPhieuBaoTriToiThieuAsync(
            thietBi.MaThietBi,
            maDonThue,
            nhanVien.MaNhanVien,
            KietDomainConstants.BaoTriConfig.LoaiSuaChua,
            $"Hư hỏng sau thuê: {chiTiet.TinhTrangSauThue}",
            mucDo);
    }
}
