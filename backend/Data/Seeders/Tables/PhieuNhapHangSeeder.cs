using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung phiếu nhập kho và chi tiết phiếu nhập đa trạng thái.</summary>
internal static class PhieuNhapHangSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var nccList = await context.NhaCungCaps.OrderBy(n => n.MaNhaCungCap).ToListAsync();
        var nv = await context.NhanViens.OrderBy(n => n.MaNhanVien).FirstAsync();
        var sps = await context.SanPhams.OrderBy(s => s.MaSanPham).ToListAsync();
        if (nccList.Count == 0 || sps.Count == 0) return;

        var receipts = new[]
        {
            ("PN-2026-002", "HD-OUT-202602", TrangThaiPhieuNhap.DaNhapKho, 9500000m, -25, sps[0], 5, 1150000m),
            ("PN-2026-003", "HD-OSP-202603", TrangThaiPhieuNhap.DaNhapKho, 12000000m, -12, sps.Count > 5 ? sps[5] : sps[0], 6, 1500000m),
            ("PN-2026-004", "HD-ECO-202604", TrangThaiPhieuNhap.Nhap, 8000000m, -2, sps.Count > 6 ? sps[6] : sps[1], 4, 2000000m),
            ("PN-2026-005", "HD-DEC-202605", TrangThaiPhieuNhap.DaHuy, 3000000m, -18, sps[2], 10, 300000m),
        };

        for (var i = 0; i < receipts.Length; i++)
        {
            var (ma, chungTu, tt, tong, daysOffset, sp, qty, gia) = receipts[i];
            if (await context.PhieuNhapHangs.AnyAsync(p => p.MaPhieuHienThi == ma)) continue;
            var ncc = nccList[i % nccList.Count];
            var phieu = new PhieuNhapHang
            {
                MaNhaCungCap = ncc.MaNhaCungCap,
                MaNguoiLap = nv.MaNhanVien,
                MaNguoiXacNhan = tt == TrangThaiPhieuNhap.DaNhapKho ? nv.MaNhanVien : null,
                MaPhieuHienThi = ma,
                SoChungTuNhaCungCap = chungTu,
                NgayLap = DateTime.UtcNow.AddDays(daysOffset),
                NgayNhapThucTe = tt == TrangThaiPhieuNhap.DaNhapKho ? DateTime.UtcNow.AddDays(daysOffset) : null,
                NgayXacNhan = tt == TrangThaiPhieuNhap.DaNhapKho ? DateTime.UtcNow.AddDays(daysOffset) : null,
                TongTien = tong,
                TenNguoiLapLucNhap = nv.HoTen,
                TenNguoiXacNhanLucNhap = tt == TrangThaiPhieuNhap.DaNhapKho ? nv.HoTen : null,
                TrangThai = tt
            };
            context.PhieuNhapHangs.Add(phieu);
            await context.SaveChangesAsync();

            context.ChiTietPhieuNhaps.Add(new ChiTietPhieuNhap
            {
                MaPhieuNhap = phieu.MaPhieuNhap,
                MaSanPham = sp.MaSanPham,
                TenSanPhamLucNhap = sp.TenSanPham,
                SoLuong = qty,
                DonGiaNhap = gia,
                TinhTrangKhiNhap = "Mới 100%"
            });
            await context.SaveChangesAsync();
        }
    }
}
