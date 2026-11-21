using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung thiết bị serial đa trạng thái và lịch sử tình trạng thiết bị.</summary>
internal static class ThietBiSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var ctpn = await context.ChiTietPhieuNhaps.OrderBy(c => c.MaChiTietPhieuNhap).FirstOrDefaultAsync();
        var sps = await context.SanPhams.OrderBy(s => s.MaSanPham).ToListAsync();
        var tk = await context.TaiKhoans.OrderBy(t => t.MaTaiKhoan).FirstOrDefaultAsync();
        if (ctpn == null || sps.Count == 0 || tk == null) return;

        var items = new[]
        {
            ("TB-LEU-004", sps[0].MaSanPham, 1200000m, "Tốt", "Đủ cọc và dây neo", TrangThaiThietBi.SanSang),
            ("TB-LEU-005", sps[0].MaSanPham, 1200000m, "Tốt", "Đủ phụ kiện", TrangThaiThietBi.SanSang),
            ("TB-BEP-003", sps[1].MaSanPham, 450000m, "Tốt", "Hộp nhựa bảo vệ", TrangThaiThietBi.SanSang),
            ("TB-GHE-002", sps[2].MaSanPham, 250000m, "Tốt", "Túi đựng vai", TrangThaiThietBi.SanSang),
            ("TB-GHE-003", sps[2].MaSanPham, 250000m, "Cần vệ sinh", "Túi đựng vai", TrangThaiThietBi.DangBaoTri),
            ("TB-DEN-002", sps[3].MaSanPham, 280000m, "Tốt", "Cáp sạc Type-C", TrangThaiThietBi.SanSang),
            ("TB-TUI-003", sps[4].MaSanPham, 500000m, "Hư hỏng nhẹ", "Rách khóa túi nén", TrangThaiThietBi.DangBaoTri),
            ("TB-BALO-001", sps.Count > 6 ? sps[6].MaSanPham : sps[0].MaSanPham, 1400000m, "Mới 98%", "Áo mưa trùm balo", TrangThaiThietBi.SanSang),
            ("TB-SAC-001", sps.Count > 8 ? sps[8].MaSanPham : sps[1].MaSanPham, 2000000m, "Tốt", "Dây sạc AC + túi đựng", TrangThaiThietBi.SanSang),
            ("TB-OLD-001", sps[2].MaSanPham, 250000m, "Hao mòn cũ", "Ngừng khai thác", TrangThaiThietBi.NgungSuDung),
        };

        foreach (var (ma, maSp, gia, tinhTrang, pk, tt) in items)
        {
            if (await context.ThietBis.AnyAsync(t => t.MaThietBiHienThi == ma)) continue;
            var tb = new ThietBi
            {
                MaChiTietPhieuNhap = ctpn.MaChiTietPhieuNhap,
                MaSanPhamHienTai = maSp,
                MaThietBiHienThi = ma,
                NgayNhap = DateTime.UtcNow.AddDays(-20),
                GiaNhap = gia,
                TinhTrang = tinhTrang,
                PhuKienDiKem = pk,
                TrangThaiSuDung = tt,
                GhiChu = "Seed dữ liệu thiết bị"
            };
            context.ThietBis.Add(tb);
            await context.SaveChangesAsync();

            context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
            {
                MaThietBi = tb.MaThietBi,
                MaNguoiThucHien = tk.MaTaiKhoan,
                TrangThaiTruoc = TrangThaiThietBi.SanSang.ToString(),
                TrangThaiSau = tt.ToString(),
                TinhTrangTruoc = "Mới",
                TinhTrangSau = tinhTrang,
                LyDo = "Ghi nhận tình trạng thiết bị khi nhập kho / kiểm tra định kỳ",
                ThoiDiem = DateTime.UtcNow.AddDays(-10)
            });
            await context.SaveChangesAsync();
        }

        // Bổ sung tồn kho tự động: đảm bảo mỗi sản phẩm đang kinh doanh có tối thiểu 7 thiết bị SanSang
        // để khi kiểm thử đặt thuê nhiều đơn liên tiếp không bị hết hàng do các đơn mẫu chiếm chỗ.
        const int minReadyPerProduct = 7;
        foreach (var sp in sps.Where(s => s.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh))
        {
            var readyCount = await context.ThietBis.CountAsync(t =>
                t.MaSanPhamHienTai == sp.MaSanPham && t.TrangThaiSuDung == TrangThaiThietBi.SanSang);
            if (readyCount >= minReadyPerProduct) continue;

            var existingCount = await context.ThietBis.CountAsync(t => t.MaSanPhamHienTai == sp.MaSanPham);
            var codePrefix = (sp.MaSanPhamHienThi ?? $"SP{sp.MaSanPham}").Replace("SP-", "TB-");
            var needed = minReadyPerProduct - readyCount;

            for (int i = 1; i <= needed; i++)
            {
                var seq = existingCount + i;
                var maThietBi = $"{codePrefix}-S{seq:D2}";
                while (await context.ThietBis.AnyAsync(t => t.MaThietBiHienThi == maThietBi))
                {
                    seq++;
                    maThietBi = $"{codePrefix}-S{seq:D2}";
                }

                var tb = new ThietBi
                {
                    MaChiTietPhieuNhap = ctpn.MaChiTietPhieuNhap,
                    MaSanPhamHienTai = sp.MaSanPham,
                    MaThietBiHienThi = maThietBi,
                    NgayNhap = DateTime.UtcNow.AddDays(-15),
                    GiaNhap = sp.GiaTriBoiThuong > 0 ? Math.Round(sp.GiaTriBoiThuong * 0.7m, 0) : 500000m,
                    TinhTrang = "Tốt",
                    PhuKienDiKem = "Đầy đủ phụ kiện tiêu chuẩn",
                    TrangThaiSuDung = TrangThaiThietBi.SanSang,
                    GhiChu = "Thiết bị bổ sung sẵn sàng cho thuê"
                };
                context.ThietBis.Add(tb);
                await context.SaveChangesAsync();

                context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
                {
                    MaThietBi = tb.MaThietBi,
                    MaNguoiThucHien = tk.MaTaiKhoan,
                    TrangThaiTruoc = TrangThaiThietBi.SanSang.ToString(),
                    TrangThaiSau = TrangThaiThietBi.SanSang.ToString(),
                    TinhTrangTruoc = "Mới",
                    TinhTrangSau = "Tốt",
                    LyDo = "Nhập kho bổ sung thiết bị sẵn sàng cho thuê",
                    ThoiDiem = DateTime.UtcNow.AddDays(-14)
                });
                await context.SaveChangesAsync();
            }
        }
    }
}
