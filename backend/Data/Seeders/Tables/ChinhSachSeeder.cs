using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung lịch sử phiên bản chính sách thuê.</summary>
internal static class ChinhSachSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var nv = await context.NhanViens.OrderBy(n => n.MaNhanVien).FirstOrDefaultAsync();
        if (nv == null) return;

        if (!await context.ChinhSachs.AnyAsync(c => c.PhienBan == 2))
        {
            context.ChinhSachs.Add(new ChinhSach
            {
                MaNguoiTao = nv.MaNhanVien,
                TenChinhSach = "Chính sách thuê mùa cao điểm 2026 (v2)",
                PhienBan = 2,
                ThoiDiemApDung = DateTime.UtcNow.AddDays(-15),
                NoiDungChinhSach = "{\"heSoTre\": 1.5, \"hanMucStaff\": 500000, \"tyLeCoc\": 100, "
                                   + "\"huyDon\": {\"tyLeGiuLaiTu24Den48Gio\": 0.5, \"tyLeGiuLaiDuoi24Gio\": 1.0}, "
                                   + "\"khongDenNhan\": {\"soPhutChoSauGioNhan\": 120, \"tyLeGiuLaiTienThue\": 1.0}}",
                NgayTao = DateTime.UtcNow.AddDays(-15)
            });
            await context.SaveChangesAsync();
        }
    }
}
