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
            // [POLICY-02] Sửa khóa JSON seed đúng chuẩn NoiDungChinhSachDto
            // (thoiGianGiuChoPhut, heSoTre, hanMucNhanVien, tyLeCocPhanTram, bieuPhiPhuKien).
            // Trước đây dùng sai tên "hanMucStaff" / "tyLeCoc" + không có bieuPhiPhuKien
            // nên FE map ra mảng rỗng và không hiển thị biểu phí phụ kiện trong form Real API.
            var bieuPhiPhuKienJson = "["
                + "{\"accessoryName\":\"Pin dự phòng chính hãng\",\"defaultFee\":450000},"
                + "{\"accessoryName\":\"Củ sạc nhanh & Cáp USB-C\",\"defaultFee\":300000},"
                + "{\"accessoryName\":\"Nắp ống kính (Lens Cap)\",\"defaultFee\":150000},"
                + "{\"accessoryName\":\"Thẻ nhớ tốc độ cao 128GB\",\"defaultFee\":600000},"
                + "{\"accessoryName\":\"Dây đeo cổ thao tác nhanh\",\"defaultFee\":250000},"
                + "{\"accessoryName\":\"Túi chống sốc cao cấp\",\"defaultFee\":500000}"
                + "]";
            var noiDung = "{\"thoiGianGiuChoPhut\": 15, \"heSoTre\": 1.5, \"hanMucNhanVien\": 500000, \"tyLeCocPhanTram\": 100, "
                        + "\"huyDon\": {\"tyLeGiuLaiTu24Den48Gio\": 0.5, \"tyLeGiuLaiDuoi24Gio\": 1.0}, "
                        + "\"khongDenNhan\": {\"soPhutChoSauGioNhan\": 120, \"tyLeGiuLaiTienThue\": 1.0}, "
                        + "\"bieuPhiPhuKien\": " + bieuPhiPhuKienJson + "}";
            context.ChinhSachs.Add(new ChinhSach
            {
                MaNguoiTao = nv.MaNhanVien,
                TenChinhSach = "Chính sách thuê mùa cao điểm 2026 (v2)",
                PhienBan = 2,
                ThoiDiemApDung = DateTime.UtcNow.AddDays(-15),
                NoiDungChinhSach = noiDung,
                NgayTao = DateTime.UtcNow.AddDays(-15)
            });
            await context.SaveChangesAsync();
        }
    }
}
