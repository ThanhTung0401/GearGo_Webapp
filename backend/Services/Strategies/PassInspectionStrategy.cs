using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Services.Strategies;

public class PassInspectionStrategy : IInspectionStrategy
{
    public bool CanHandle(string ketLuan) => ketLuan == "Dat";

    public Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue)
    {
        thietBi.TrangThaiSuDung = TrangThaiThietBi.SanSang;
        if (!chiTiet.ThoiDiemTraThucTe.HasValue)
        {
            chiTiet.ThoiDiemTraThucTe = DateTime.UtcNow;
        }
        return Task.CompletedTask;
    }
}
