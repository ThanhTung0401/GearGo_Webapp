using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung danh mục, sản phẩm và hình ảnh sản phẩm.</summary>
internal static class DanhMucSanPhamTableSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var cats = new[]
        {
            ("Balo & Gậy Trekking", "Balo trợ lực 40L-70L, gậy leo núi hợp kim carbon siêu nhẹ.", 5, "HienThi"),
            ("Phụ kiện & Năng lượng", "Trạm sạc dự phòng ngoài trời, bình lọc nước, áo mưa bộ.", 6, "HienThi"),
            ("Combo Gia Đình", "Bộ thiết bị trọn gói cho nhóm 4-6 người tiết kiệm chi phí.", 7, "HienThi"),
            ("Thiết bị Mùa Đông (Tạm ẩn)", "Danh mục lưu trữ ngoài mùa cao điểm.", 8, "TamAn"),
        };

        foreach (var (ten, moTa, thuTu, tt) in cats)
        {
            if (!await context.DanhMucSanPhams.AnyAsync(d => d.TenDanhMuc == ten))
            {
                context.DanhMucSanPhams.Add(new DanhMucSanPham { TenDanhMuc = ten, MoTa = moTa, ThuTuHienThi = thuTu, TrangThai = tt });
            }
        }
        await context.SaveChangesAsync();

        var dmBalo = await context.DanhMucSanPhams.FirstAsync(d => d.TenDanhMuc == "Balo & Gậy Trekking");
        var dmPhuKien = await context.DanhMucSanPhams.FirstAsync(d => d.TenDanhMuc == "Phụ kiện & Năng lượng");
        var dmCombo = await context.DanhMucSanPhams.FirstAsync(d => d.TenDanhMuc == "Combo Gia Đình");
        var dmLeu = await context.DanhMucSanPhams.FirstAsync(d => d.TenDanhMuc == "Lều & Bạt dã ngoại");

        var products = new[]
        {
            (dmLeu.MaDanhMuc, "SP-LEU-002", "Lều Glamping 6 Người Naturehike Village 6.0", "Naturehike", "Lều dựng nhanh tự động không gian rộng cho gia đình.", 6, "260 x 230 x 180 cm", "Vải 210D Oxford phủ bạc chống nắng", 280000m, 1000000m, 3500000m, TrangThaiKinhDoanh.DangKinhDoanh, "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600"),
            (dmBalo.MaDanhMuc, "SP-BALO-001", "Balo Trekking Osprey Atmos AG 65L", "Osprey", "Hệ thống lưng lưới thoáng khí Anti-Gravity giảm áp lực vai.", 1, "87 x 39 x 41 cm", "Dung tích 65L, kèm áo mưa trùm balo", 95000m, 400000m, 1800000m, TrangThaiKinhDoanh.DangKinhDoanh, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"),
            (dmBalo.MaDanhMuc, "SP-GAY-001", "Cặp Gậy Leo Núi Carbon Naturehike ST09", "Naturehike", "Gậy gấp 3 khúc khóa ngoài chắc chắn, tay cầm EVA êm ái.", 1, "62 - 135 cm", "Trọng lượng 195g/chiếc", 30000m, 100000m, 350000m, TrangThaiKinhDoanh.DangKinhDoanh, "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600"),
            (dmPhuKien.MaDanhMuc, "SP-SAC-001", "Trạm Sạc Dự Phòng EcoFlow River 2 (256Wh)", "EcoFlow", "Sạc nhanh AC/USB-C 300W cấp điện cho đèn, quạt, laptop.", 4, "24 x 21 x 14 cm", "Dung lượng 256Wh, sạc đầy 60 phút", 180000m, 800000m, 2500000m, TrangThaiKinhDoanh.DangKinhDoanh, "https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?w=600"),
            (dmCombo.MaDanhMuc, "SP-COMBO-001", "Combo Cắm Trại 4 Người Tiêu Chuẩn", "GearGo", "Gồm 1 Lều 4 người, 1 Bàn cuộn, 4 Ghế Kermit, 1 Đèn LED.", 4, "Trọn bộ 7 món", "Tiết kiệm 15% so với thuê lẻ", 250000m, 900000m, 2800000m, TrangThaiKinhDoanh.DangKinhDoanh, "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600"),
            (dmPhuKien.MaDanhMuc, "SP-QUAT-001", "Quạt Tích Điện Dã Ngoại Claymore V600+", "Claymore", "Quạt treo lều hoặc để bàn 3 chân, pin 7800mAh.", 2, "24 x 22 x 35 cm", "Chạy liên tục 30 giờ", 45000m, 150000m, 550000m, TrangThaiKinhDoanh.TamNgung, "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=600"),
        };

        foreach (var (maDm, maHt, ten, th, moTa, sc, kt, ts, gia, coc, bt, tt, img) in products)
        {
            if (await context.SanPhams.AnyAsync(s => s.MaSanPhamHienThi == maHt)) continue;
            var sp = new SanPham
            {
                MaDanhMuc = maDm, MaSanPhamHienThi = maHt, TenSanPham = ten, ThuongHieu = th,
                MoTa = moTa, SucChua = sc, KichThuoc = kt, ThongSo = ts,
                GiaThueMoiNgay = gia, MucCocMoiThietBi = coc, GiaTriBoiThuong = bt,
                TrangThaiKinhDoanh = tt
            };
            context.SanPhams.Add(sp);
            await context.SaveChangesAsync();
            context.HinhAnhSanPhams.Add(new HinhAnhSanPham { MaSanPham = sp.MaSanPham, DuongDan = img, LaAnhChinh = true, ThuTu = 1 });
            await context.SaveChangesAsync();
        }

        // Đồng bộ sửa các URL ảnh cũ dùng domain giả storage.geargo.vn trong DB sang ảnh Unsplash thật
        var brokenImgs = await context.HinhAnhSanPhams
            .Where(h => h.DuongDan.Contains("storage.geargo.vn"))
            .ToListAsync();
        foreach (var h in brokenImgs)
        {
            if (h.DuongDan.Contains("leu4_inside"))
                h.DuongDan = "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600";
            else if (h.DuongDan.Contains("bep_main"))
                h.DuongDan = "https://images.unsplash.com/photo-1571863533956-01c88e79957e?w=600";
            else if (h.DuongDan.Contains("ghe_main"))
                h.DuongDan = "https://images.unsplash.com/photo-1537905569824-f89f14cceb68?w=600";
            else
                h.DuongDan = "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600";
        }
        var brokenRevImgs = await context.DanhGias
            .Where(d => d.DanhSachAnh != null && d.DanhSachAnh.Contains("storage.geargo.vn"))
            .ToListAsync();
        foreach (var d in brokenRevImgs)
        {
            d.DanhSachAnh = "[\"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600\"]";
        }
        if (brokenImgs.Count > 0 || brokenRevImgs.Count > 0)
        {
            await context.SaveChangesAsync();
        }
    }
}
