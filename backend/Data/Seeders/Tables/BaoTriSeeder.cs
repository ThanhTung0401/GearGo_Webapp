using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung phiếu bảo trì thiết bị đa trạng thái.</summary>
internal static class BaoTriSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var tbs = await context.ThietBis.OrderBy(t => t.MaThietBi).ToListAsync();
        var nv = await context.NhanViens.OrderBy(n => n.MaNhanVien).FirstOrDefaultAsync();
        if (tbs.Count < 3 || nv == null) return;

        var items = new[]
        {
            (tbs[0].MaThietBi, "VeSinh", "Vệ sinh khử khuẩn lều sau chuyến đi Đà Lạt", "Nhe", "ChoXuLy", -1),
            (tbs[1].MaThietBi, "SuaChua", "Thay khóa kéo cửa chính lều", "TrungBinh", "DangXuLy", -3),
            (tbs[2].MaThietBi, "KiemTra", "Kiểm tra van đánh lửa bếp ga", "Nhe", "HoanTat", -8),
            (tbs[tbs.Count > 5 ? 5 : 0].MaThietBi, "VeSinh", "Giặt hấp túi ngủ lông vũ", "Nhe", "HoanTat", -12),
        };

        foreach (var (maTb, loai, moTa, mucDo, tt, daysOff) in items)
        {
            if (await context.PhieuBaoTris.AnyAsync(p => p.MoTaLoi == moTa)) continue;
            context.PhieuBaoTris.Add(new PhieuBaoTri
            {
                MaThietBi = maTb,
                MaNguoiLap = nv.MaNhanVien,
                MaNguoiXacNhanHoanThanh = tt == "HoanTat" ? nv.MaNhanVien : null,
                LoaiXuLy = loai,
                MoTaLoi = moTa,
                MucDo = mucDo,
                NgayBatDau = DateTime.UtcNow.AddDays(daysOff),
                NgayHoanThanhThucTe = tt == "HoanTat" ? DateTime.UtcNow.AddDays(daysOff + 1) : null,
                TrangThai = tt
            });
        }
        await context.SaveChangesAsync();
    }
}
