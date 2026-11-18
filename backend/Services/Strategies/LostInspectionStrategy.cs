using GearGo.Helpers;
using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Services.Strategies;

public class LostInspectionStrategy : IInspectionStrategy
{
    public bool CanHandle(string ketLuan)
        => ketLuan == DomainConstants.InspectionConclusions.Lost;

    public Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue)
    {
        thietBi.TrangThaiSuDung = TrangThaiThietBi.ThatLac;
        chiTiet.ThoiDiemTraThucTe = null;
        return Task.CompletedTask;
    }
}
