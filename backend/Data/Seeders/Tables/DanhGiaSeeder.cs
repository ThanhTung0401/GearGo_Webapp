using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung đánh giá sản phẩm (hiển thị, đã phản hồi, tạm ẩn).</summary>
internal static class DanhGiaSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var ctds = await context.ChiTietDonThues.OrderBy(c => c.MaChiTietDon).ToListAsync();
        var nv = await context.NhanViens.OrderBy(n => n.MaNhanVien).FirstOrDefaultAsync();
        if (ctds.Count < 2) return;

        var reviews = new[]
        {
            (ctds[1 % ctds.Count].MaChiTietDon, 5, "Bếp ga nhỏ gọn, đun sôi nước rất nhanh giữa trời lạnh!", "HienThi", "Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của GearGo!"),
            (ctds[2 % ctds.Count].MaChiTietDon, 4, "Thiết bị sạch sẽ, nhân viên giao nhận nhiệt tình đúng giờ.", "HienThi", null as string),
            (ctds[3 % ctds.Count].MaChiTietDon, 2, "Bình luận chứa từ ngữ không phù hợp cần kiểm duyệt.", "TamAn", null as string),
        };

        foreach (var (maCtd, sao, noiDung, tt, phanHoi) in reviews)
        {
            if (await context.DanhGias.AnyAsync(d => d.MaChiTietDon == maCtd)) continue;
            context.DanhGias.Add(new DanhGia
            {
                MaChiTietDon = maCtd,
                SoSao = sao,
                NoiDung = noiDung,
                NgayTao = DateTime.UtcNow.AddDays(-2),
                TrangThaiHienThi = tt,
                PhanHoiCuaHang = phanHoi,
                MaNguoiPhanHoi = phanHoi != null ? nv?.MaNhanVien : null,
                ThoiDiemPhanHoi = phanHoi != null ? DateTime.UtcNow.AddDays(-1) : null
            });
        }
        await context.SaveChangesAsync();
    }
}
