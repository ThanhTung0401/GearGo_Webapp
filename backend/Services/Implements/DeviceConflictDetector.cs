using GearGo.Data;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class DeviceConflictDetector : IDeviceConflictDetector
{
    private readonly ApplicationDbContext _context;

    public DeviceConflictDetector(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<string>> KiemTraXungDotDonTuongLaiAsync(
        long maThietBi,
        string maThietBiHienThi,
        string ketLuan,
        long maDonHienTai)
    {
        var donSauBiAnhHuong = await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon)
            .Where(pc => pc.MaThietBi == maThietBi &&
                         pc.TrangThai == "DaPhanCong" &&
                         pc.ChiTietDon.MaDonThue != maDonHienTai)
            .Select(pc => pc.ChiTietDon.MaDonThue)
            .Distinct()
            .ToListAsync();

        if (donSauBiAnhHuong.Count > 0)
        {
            return new List<string>
            {
                $"Thiết bị {maThietBiHienThi} ({ketLuan}) ảnh hưởng đến các đơn tương lai: {string.Join(", ", donSauBiAnhHuong)}"
            };
        }

        return new List<string>();
    }
}
