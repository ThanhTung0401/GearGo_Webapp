using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung tài khoản, khách hàng và nhân viên đa dạng trạng thái.</summary>
internal static class TaiKhoanSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("GearGo@2026", workFactor: 11);

        var users = new[]
        {
            ("kh.bich@geargo.vn", "0902000001", "KhachHang", "HoatDong", "Phạm Ngọc Bích", "12 Nguyễn Huệ, Quận 1, TP.HCM", true),
            ("kh.duc@geargo.vn", "0902000002", "KhachHang", "HoatDong", "Lê Hoàng Đức", "45 Trần Phú, Hải Châu, Đà Nẵng", true),
            ("kh.linh@geargo.vn", "0902000003", "KhachHang", "HoatDong", "Vũ Thùy Linh", "88 Láng Hạ, Đống Đa, Hà Nội", true),
            ("kh.son@geargo.vn", "0902000004", "KhachHang", "TamKhoa", "Đỗ Thanh Sơn", "19 Phan Chu Trinh, Nha Trang", true),
            ("nv.hung@geargo.vn", "0903000001", "NhanVien", "HoatDong", "Nguyễn Mạnh Hùng", "", false),
            ("nv.thao@geargo.vn", "0903000002", "NhanVien", "HoatDong", "Trần Phương Thảo", "", false),
            ("nv.cuong@geargo.vn", "0903000003", "NhanVien", "TamKhoa", "Bùi Quốc Cường", "", false),
        };

        foreach (var (email, sdt, role, status, hoTen, diaChi, isCustomer) in users)
        {
            var tk = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == email);
            if (tk == null)
            {
                tk = new TaiKhoan
                {
                    Email = email,
                    SoDienThoai = sdt,
                    MatKhauBam = hash,
                    VaiTro = role,
                    TrangThai = status,
                    LyDoKhoa = status == "TamKhoa" ? "Tạm khóa kiểm tra quy trình nội bộ" : null
                };
                context.TaiKhoans.Add(tk);
                await context.SaveChangesAsync();
            }

            if (isCustomer)
            {
                if (!await context.KhachHangs.AnyAsync(k => k.MaTaiKhoan == tk.MaTaiKhoan))
                {
                    context.KhachHangs.Add(new KhachHang { MaTaiKhoan = tk.MaTaiKhoan, HoTen = hoTen, DiaChi = diaChi });
                    await context.SaveChangesAsync();
                }
            }
            else
            {
                var existingNv = await context.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == tk.MaTaiKhoan);
                if (existingNv == null)
                {
                    context.NhanViens.Add(new NhanVien { MaTaiKhoan = tk.MaTaiKhoan, HoTen = hoTen });
                    await context.SaveChangesAsync();
                }
                else if (existingNv.HoTen != hoTen && existingNv.HoTen?.Contains("(NV ") == true)
                {
                    // Dọn hậu tố chức danh cũ (NV Giao nhận / NV Kiểm kê / NV Thử việc) cho mô hình tiệm nhỏ
                    existingNv.HoTen = hoTen;
                    await context.SaveChangesAsync();
                }
            }
        }
    }
}
