using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Services.Strategies;

public class LostInspectionStrategy : IInspectionStrategy
{
    public bool CanHandle(string ketLuan) => ketLuan == "MatThietBi";

    public Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue)
    {
        thietBi.TrangThaiSuDung = TrangThaiThietBi.ThatLac;
        chiTiet.ThoiDiemTraThucTe = null; // Đồ thất lạc không có thời điểm trả thực tế
        return Task.CompletedTask;
    }
}
