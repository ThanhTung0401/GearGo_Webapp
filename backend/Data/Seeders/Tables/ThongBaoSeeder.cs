using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung thông báo hệ thống (đã gửi, chưa đọc, gửi lỗi chờ thử lại).</summary>
internal static class ThongBaoSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var tks = await context.TaiKhoans.Where(t => t.VaiTro == "KhachHang").OrderBy(t => t.MaTaiKhoan).ToListAsync();
        if (tks.Count == 0) return;

        var items = new[]
        {
            ("EVT_SYS_PROMO_01", "KhuyenMai", "Ưu đãi cuối tuần: Giảm 10% đơn thuê từ 500k", "Nhập mã CAMPGO10 khi thanh toán để nhận ưu đãi.", "InApp", "DaGui", -3),
            ("EVT_SYS_REMIND_01", "NhacLich", "Nhắc lịch nhận thiết bị ngày mai", "Vui lòng mang theo CCCD khi đến nhận lều tại cửa hàng.", "InApp", "DaGui", -1),
            ("EVT_SYS_FAIL_01", "CanhBao", "Thông báo xác nhận hoàn cọc", "Đang chờ kết nối lại cổng gửi Email/SMS.", "Email", "GuiLoi", 0),
            ("EVT_SYS_FAIL_02", "NhacLich", "Nhắc lịch trả thiết bị sắp đến hạn", "Gửi SMS nhắc hạn trả bị timeout nhà mạng.", "SMS", "GuiLoi", 0),
        };

        for (var i = 0; i < items.Length; i++)
        {
            var (maSk, loai, tieuDe, noiDung, kenh, tt, daysOff) = items[i];
            if (await context.ThongBaos.AnyAsync(t => t.MaSuKien == maSk)) continue;
            context.ThongBaos.Add(new ThongBao
            {
                MaTaiKhoan = tks[i % tks.Count].MaTaiKhoan,
                MaSuKien = maSk,
                LoaiSuKien = loai,
                TieuDe = tieuDe,
                NoiDung = noiDung,
                KenhGui = kenh,
                TrangThaiGui = tt,
                ThoiDiemTao = DateTime.UtcNow.AddDays(daysOff),
                ThoiDiemGui = tt == "DaGui" ? DateTime.UtcNow.AddDays(daysOff) : null
            });
        }
        await context.SaveChangesAsync();
    }
}
