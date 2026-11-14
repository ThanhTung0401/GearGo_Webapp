using GearGo.Helpers;
using GearGo.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders;

/// <summary>Kết quả seed tài khoản, khách hàng và nhân viên dùng chung cho các seeder khác.</summary>
internal sealed record SeedActors(
    TaiKhoan AdminTk,
    TaiKhoan StaffTk,
    TaiKhoan StaffTk2,
    TaiKhoan CustomerTk1,
    TaiKhoan CustomerTk2,
    KhachHang Khach1,
    KhachHang Khach2,
    NhanVien NhanVien1,
    NhanVien NhanVien2);

/// <summary>Seed tài khoản, hồ sơ khách hàng, nhân viên và phân quyền mặc định.</summary>
internal static class NguoiDungNhanSuSeeder
{
    public static async Task<SeedActors> SeedAsync(ApplicationDbContext context)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("GearGo@2026", workFactor: 11);

        var adminTk = await UpsertTaiKhoanAsync(context, "admin@geargo.vn", "0901000001", hash, "QuanTriVien", "HoatDong", true);
        var staffTk = await UpsertTaiKhoanAsync(context, "staff@geargo.vn", "0901000002", hash, "NhanVien", "HoatDong", true);
        var staffTk2 = await UpsertTaiKhoanAsync(context, "tuan.staff@geargo.vn", "0901000005", hash, "NhanVien", "HoatDong", false);
        var customerTk1 = await UpsertTaiKhoanAsync(context, "customer@geargo.vn", "0901000003", hash, "KhachHang", "HoatDong", false);
        var customerTk2 = await UpsertCustomer2Async(context, hash);
        await UpsertLockedTaiKhoanAsync(context, hash);
        await context.SaveChangesAsync();

        var khach1 = await UpsertKhachHangAsync(context, customerTk1.MaTaiKhoan, "Nguyễn Văn An", "123 Cầu Giấy, Phường Dịch Vọng, Hà Nội", true);
        var khach2 = await UpsertKhachHangAsync(context, customerTk2.MaTaiKhoan, "Trần Minh Quang", "456 Lê Lợi, Quận 1, TP. Hồ Chí Minh", true);
        await UpsertKhachHangAsync(context, (await context.TaiKhoans.FirstAsync(t => t.Email == "locked.kh@geargo.vn")).MaTaiKhoan,
            "Hoàng Văn Khóa", "789 Nguyễn Trãi, Thanh Xuân, Hà Nội", false);

        var nv1 = await UpsertNhanVienAsync(context, adminTk.MaTaiKhoan, "Nguyễn Văn Quản Trị");
        var nv2 = await UpsertNhanVienAsync(context, staffTk.MaTaiKhoan, "Lê Thị Mai (NV Kho)");
        await UpsertNhanVienAsync(context, staffTk2.MaTaiKhoan, "Trần Tuấn (NV Vận Hành)");
        await context.SaveChangesAsync();

        return new SeedActors(adminTk, staffTk, staffTk2, customerTk1, customerTk2, khach1, khach2, nv1, nv2);
    }

    /// <summary>Seed Identity roles và quyền mặc định cho nhân viên (idempotent).</summary>
    public static async Task SeedRolesAndPermissionsAsync(ApplicationDbContext context)
    {
        foreach (var roleName in DomainConstants.Roles.All)
        {
            if (await context.Roles.AnyAsync(r => r.Name == roleName)) continue;
            context.Roles.Add(new IdentityRole<long>
            {
                Name = roleName,
                NormalizedName = roleName.ToUpperInvariant(),
                ConcurrencyStamp = Guid.NewGuid().ToString()
            });
        }
        await context.SaveChangesAsync();

        var staffRole = await context.Roles.FirstAsync(r => r.Name == DomainConstants.Roles.Staff);
        var staffExisting = await context.RoleClaims
            .Where(c => c.RoleId == staffRole.Id && c.ClaimType == DomainConstants.Permissions.Type)
            .Select(c => c.ClaimValue!)
            .ToListAsync();

        var missing = DomainConstants.Permissions.DefaultStaff.Except(staffExisting).ToList();
        foreach (var ma in missing)
        {
            context.RoleClaims.Add(new IdentityRoleClaim<long>
            {
                RoleId = staffRole.Id,
                ClaimType = DomainConstants.Permissions.Type,
                ClaimValue = ma
            });
        }
        if (missing.Count > 0) await context.SaveChangesAsync();

        foreach (var roleName in DomainConstants.Roles.All)
        {
            if (await context.RolePermissionVersions.AnyAsync(v => v.RoleName == roleName)) continue;
            context.RolePermissionVersions.Add(new RolePermissionVersion
            {
                RoleName = roleName,
                Version = 1,
                CapNhatLuc = DateTime.UtcNow
            });
        }
        await context.SaveChangesAsync();
    }

    private static async Task<TaiKhoan> UpsertTaiKhoanAsync(
        ApplicationDbContext context, string email, string sdt, string hash,
        string vaiTro, string trangThai, bool syncRoleAndStatus)
    {
        var tk = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == email);
        if (tk == null)
        {
            tk = new TaiKhoan { Email = email, SoDienThoai = sdt, MatKhauBam = hash, VaiTro = vaiTro, TrangThai = trangThai };
            context.TaiKhoans.Add(tk);
            return tk;
        }

        tk.MatKhauBam = hash;
        if (syncRoleAndStatus) { tk.VaiTro = vaiTro; tk.TrangThai = trangThai; }
        return tk;
    }

    private static async Task<TaiKhoan> UpsertCustomer2Async(ApplicationDbContext context, string hash)
    {
        var tk = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == "quang.kh@geargo.vn" || t.Email == "other@geargo.vn");
        if (tk == null)
        {
            tk = new TaiKhoan { Email = "quang.kh@geargo.vn", SoDienThoai = "0918765432", MatKhauBam = hash, VaiTro = "KhachHang", TrangThai = "HoatDong" };
            context.TaiKhoans.Add(tk);
            return tk;
        }
        tk.Email = "quang.kh@geargo.vn";
        tk.SoDienThoai = "0918765432";
        tk.MatKhauBam = hash;
        return tk;
    }

    private static async Task UpsertLockedTaiKhoanAsync(ApplicationDbContext context, string hash)
    {
        var tk = await context.TaiKhoans.FirstOrDefaultAsync(t => t.Email == "locked.kh@geargo.vn");
        if (tk == null)
        {
            context.TaiKhoans.Add(new TaiKhoan
            {
                Email = "locked.kh@geargo.vn",
                SoDienThoai = "0909999888",
                MatKhauBam = hash,
                VaiTro = "KhachHang",
                TrangThai = "BiKhoa",
                LyDoKhoa = "Vi phạm điều khoản nhiều lần làm hỏng thiết bị không bồi thường"
            });
            return;
        }
        tk.MatKhauBam = hash;
    }

    private static async Task<KhachHang> UpsertKhachHangAsync(
        ApplicationDbContext context, long maTaiKhoan, string hoTen, string diaChi, bool syncName)
    {
        var kh = await context.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == maTaiKhoan);
        if (kh == null)
        {
            kh = new KhachHang { MaTaiKhoan = maTaiKhoan, HoTen = hoTen, DiaChi = diaChi };
            context.KhachHangs.Add(kh);
            return kh;
        }
        if (syncName) kh.HoTen = hoTen;
        return kh;
    }

    private static async Task<NhanVien> UpsertNhanVienAsync(ApplicationDbContext context, long maTaiKhoan, string hoTen)
    {
        var nv = await context.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == maTaiKhoan);
        if (nv != null) return nv;
        nv = new NhanVien { MaTaiKhoan = maTaiKhoan, HoTen = hoTen, TrangThaiLamViec = "DangLamViec" };
        context.NhanViens.Add(nv);
        return nv;
    }
}
