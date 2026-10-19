using GearGo.Helpers;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Strategies;

public class CleaningInspectionStrategy : IInspectionStrategy
{
    private readonly IBaoTriService _baoTriService;

    public CleaningInspectionStrategy(IBaoTriService baoTriService)
    {
        _baoTriService = baoTriService;
    }

    public bool CanHandle(string ketLuan)
        => ketLuan == KietDomainConstants.KetLuanKiemTra.CanVeSinh;

    public async Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue)
    {
        thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;
        chiTiet.ThoiDiemTraThucTe ??= DateTime.UtcNow;

        await _baoTriService.TaoPhieuBaoTriToiThieuAsync(
            thietBi.MaThietBi,
            maDonThue,
            nhanVien.MaNhanVien,
            KietDomainConstants.BaoTriConfig.LoaiVeSinh,
            $"Cần vệ sinh sau thuê: {chiTiet.TinhTrangSauThue}",
            KietDomainConstants.BaoTriConfig.MucDoNhe);
    }
}
