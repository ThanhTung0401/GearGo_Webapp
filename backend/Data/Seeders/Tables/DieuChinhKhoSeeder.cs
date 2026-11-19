using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung phiếu điều chỉnh kho đa trạng thái.</summary>
internal static class DieuChinhKhoSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var tbs = await context.ThietBis.OrderBy(t => t.MaThietBi).ToListAsync();
        var nv = await context.NhanViens.OrderBy(n => n.MaNhanVien).FirstOrDefaultAsync();
        if (tbs.Count == 0 || nv == null) return;

        var items = new[]
        {
            ("KiemKeDotXuat", "Kiểm kê đột xuất kho lều tháng 11/2026", "ChoDuyet", -1),
            ("BaoHongMat", "Ghi nhận hao mòn dây neo và cọc lều đợt 11", "DaDuyet", -5),
            ("DieuChinhSaiLech", "Điều chỉnh nhầm mã serial khi kiểm đếm", "TuChoi", -9),
        };

        for (var i = 0; i < items.Length; i++)
        {
            var (loai, lyDo, tt, daysOff) = items[i];
            if (await context.PhieuDieuChinhKhos.AnyAsync(p => p.LyDo == lyDo)) continue;
            var pdc = new PhieuDieuChinhKho
            {
                MaNguoiLap = nv.MaNhanVien,
                MaNguoiDuyet = tt != "ChoDuyet" ? nv.MaNhanVien : null,
                LoaiDieuChinh = loai,
                LyDo = lyDo,
                ThoiDiemLap = DateTime.UtcNow.AddDays(daysOff),
                ThoiDiemDuyet = tt != "ChoDuyet" ? DateTime.UtcNow.AddDays(daysOff + 1) : null,
                TrangThai = tt
            };
            context.PhieuDieuChinhKhos.Add(pdc);
            await context.SaveChangesAsync();

            context.ChiTietDieuChinhKhos.Add(new ChiTietDieuChinhKho
            {
                MaPhieuDieuChinh = pdc.MaPhieuDieuChinh,
                MaThietBi = tbs[i % tbs.Count].MaThietBi,
                GiaTriTruoc = "{\"trangThai\":\"SanSang\"}",
                GiaTriSau = "{\"trangThai\":\"DangBaoTri\"}",
                GhiChu = $"Chi tiết kiểm kê: {lyDo}"
            });
            await context.SaveChangesAsync();
        }
    }
}
