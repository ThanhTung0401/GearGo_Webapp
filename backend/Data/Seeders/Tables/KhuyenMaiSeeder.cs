using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung các chương trình khuyến mãi đa dạng loại giảm và trạng thái.</summary>
internal static class KhuyenMaiSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var items = new[]
        {
            ("CAMPGO10", "Ưu đãi chuyến đi cuối tuần - Giảm 10%", LoaiKhuyenMai.PhanTram, 10m, 300000m, 500000m, TrangThaiKhuyenMai.HienThi, -30, 90),
            ("GIAM50K", "Giảm trực tiếp 50.000đ cho đơn từ 300k", LoaiKhuyenMai.SoTien, 50000m, 50000m, 300000m, TrangThaiKhuyenMai.HienThi, -20, 60),
            ("NEWGEAR20", "Trải nghiệm thiết bị mới - Giảm 20%", LoaiKhuyenMai.PhanTram, 20m, 500000m, 1000000m, TrangThaiKhuyenMai.HienThi, -10, 45),
            ("GLAMP100K", "Ưu đãi Lều Glamping giảm 100.000đ", LoaiKhuyenMai.SoTien, 100000m, 100000m, 800000m, TrangThaiKhuyenMai.TamAn, -5, 30),
            ("TET2026", "Chào xuân 2026 (Đã hết hạn)", LoaiKhuyenMai.PhanTram, 15m, 250000m, 400000m, TrangThaiKhuyenMai.HienThi, -120, -30),
        };

        foreach (var (code, ten, loai, val, maxGiam, minThue, tt, startOff, endOff) in items)
        {
            if (await context.KhuyenMais.AnyAsync(k => k.MaGiamGia == code)) continue;
            context.KhuyenMais.Add(new KhuyenMai
            {
                MaGiamGia = code,
                TenKhuyenMai = ten,
                LoaiGiam = loai,
                GiaTriGiam = val,
                MucGiamToiDa = maxGiam,
                TienThueToiThieu = minThue,
                PhamVi = PhamViApDung.TatCa,
                BatDau = DateTime.UtcNow.AddDays(startOff),
                KetThuc = DateTime.UtcNow.AddDays(endOff),
                GioiHanTongLuot = 200,
                GioiHanMoiKhach = 2,
                TrangThai = tt
            });
        }
        await context.SaveChangesAsync();
    }
}
