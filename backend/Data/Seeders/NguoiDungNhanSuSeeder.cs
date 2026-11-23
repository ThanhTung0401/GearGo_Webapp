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
        // v2 §P1 + §8.10 — seed 2 row TaiKhoan "system" (MaTaiKhoan=1,2) làm actor cho
        // seeder/migration/callback gateway. MatKhauBam=null → không thể login qua JWT.
        // Idempotent; ma_tai_khoan là identity nên phải dùng SET IDENTITY_INSERT.
        await SeedSystemActorsAsync(context);

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
        var nv2 = await UpsertNhanVienAsync(context, staffTk.MaTaiKhoan, "Lê Thị Mai");
        await UpsertNhanVienAsync(context, staffTk2.MaTaiKhoan, "Trần Tuấn");
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
        var staffHasVersion = await context.RolePermissionVersions.AnyAsync(v => v.RoleName == DomainConstants.Roles.Staff);

        // Luôn dọn các quyền AdminOnly (PhanQuyen.*) nếu từng bị gán nhầm trên vai trò NhanVien hoặc override của NhanVien
        var dirtyStaffAdminClaims = await context.RoleClaims
            .Where(c => c.RoleId == staffRole.Id
                && (c.ClaimType == DomainConstants.Permissions.Type || c.ClaimType!.StartsWith("user_perm:"))
                && DomainConstants.Permissions.AdminOnly.Contains(c.ClaimValue!))
            .ToListAsync();
        if (dirtyStaffAdminClaims.Count > 0)
            context.RoleClaims.RemoveRange(dirtyStaffAdminClaims);

        // Chỉ seed DefaultStaff trong lần khởi tạo đầu tiên để tránh ghi đè lại các quyền Admin đã chủ động gỡ
        var missing = new List<string>();
        if (!staffHasVersion)
        {
            var staffExisting = await context.RoleClaims
                .Where(c => c.RoleId == staffRole.Id && c.ClaimType == DomainConstants.Permissions.Type)
                .Select(c => c.ClaimValue!)
                .ToListAsync();
            missing = DomainConstants.Permissions.DefaultStaff.Except(staffExisting).ToList();
            foreach (var ma in missing)
            {
                context.RoleClaims.Add(new IdentityRoleClaim<long>
                {
                    RoleId = staffRole.Id,
                    ClaimType = DomainConstants.Permissions.Type,
                    ClaimValue = ma
                });
            }
        }

        // Đồng bộ đầy đủ Permissions.All cho QuanTriVien trong Real DB (hỗ trợ 100% DB-Driven RBAC)
        var adminRole = await context.Roles.FirstAsync(r => r.Name == DomainConstants.Roles.Admin);
        var adminExisting = await context.RoleClaims
            .Where(c => c.RoleId == adminRole.Id && c.ClaimType == DomainConstants.Permissions.Type)
            .Select(c => c.ClaimValue!)
            .ToListAsync();

        var adminMissing = DomainConstants.Permissions.All.Except(adminExisting).ToList();
        foreach (var ma in adminMissing)
        {
            context.RoleClaims.Add(new IdentityRoleClaim<long>
            {
                RoleId = adminRole.Id,
                ClaimType = DomainConstants.Permissions.Type,
                ClaimValue = ma
            });
        }
        if (dirtyStaffAdminClaims.Count > 0 || missing.Count > 0 || adminMissing.Count > 0)
            await context.SaveChangesAsync();

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

    /// <summary>
    /// v2 §P1 — seed row TaiKhoan "system" với MaTaiKhoan cố định (Seeder=1, Gateway=2).
    /// Dùng IDENTITY_INSERT vì ma_tai_khoan là identity column.
    /// </summary>
    private static async Task SeedSystemActorsAsync(ApplicationDbContext context)
    {
        var existing = await context.TaiKhoans.AsNoTracking()
            .Where(t => t.MaTaiKhoan == DomainConstants.SystemActors.Seeder
                     || t.MaTaiKhoan == DomainConstants.SystemActors.Gateway)
            .Select(t => t.MaTaiKhoan)
            .ToListAsync();

        var needSeeder = !existing.Contains(DomainConstants.SystemActors.Seeder);
        var needGateway = !existing.Contains(DomainConstants.SystemActors.Gateway);
        if (!needSeeder && !needGateway) return;

        // Ép identity-insert ở mức bảng cho DbContext hiện tại; chạy trong 1 transaction để
        // đảm bảo SET IDENTITY_INSERT tồn tại trên đúng connection khi INSERT.
        await using var tx = await context.Database.BeginTransactionAsync();
        await context.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT TAI_KHOAN ON");
        try
        {
            if (needSeeder)
            {
                await context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO TAI_KHOAN (ma_tai_khoan, email, so_dien_thoai, mat_khau_bam, vai_tro, trang_thai, ly_do_khoa, ngay_tao, ngay_cap_nhat, permission_version) " +
                    "VALUES ({0}, {1}, {2}, NULL, {3}, {4}, NULL, {5}, {5}, 0)",
                    DomainConstants.SystemActors.Seeder,
                    "system@geargo.local",
                    "0000000001",
                    DomainConstants.SystemActors.SystemRole,
                    DomainConstants.AccountStatus.Active,
                    DateTime.Now);
            }
            if (needGateway)
            {
                await context.Database.ExecuteSqlRawAsync(
                    "INSERT INTO TAI_KHOAN (ma_tai_khoan, email, so_dien_thoai, mat_khau_bam, vai_tro, trang_thai, ly_do_khoa, ngay_tao, ngay_cap_nhat, permission_version) " +
                    "VALUES ({0}, {1}, {2}, NULL, {3}, {4}, NULL, {5}, {5}, 0)",
                    DomainConstants.SystemActors.Gateway,
                    "gateway@geargo.local",
                    "0000000002",
                    DomainConstants.SystemActors.SystemRole,
                    DomainConstants.AccountStatus.Active,
                    DateTime.Now);
            }
        }
        finally
        {
            await context.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT TAI_KHOAN OFF");
        }
        await tx.CommitAsync();
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
        if (nv != null)
        {
            // Dọn hậu tố chức danh cũ như (NV Kho), (NV Vận Hành) để đồng bộ mô hình tiệm nhỏ
            if (nv.HoTen != hoTen && nv.HoTen?.Contains("(NV ") == true)
            {
                nv.HoTen = hoTen;
            }
            return nv;
        }
        nv = new NhanVien { MaTaiKhoan = maTaiKhoan, HoTen = hoTen, TrangThaiLamViec = "DangLamViec" };
        context.NhanViens.Add(nv);
        return nv;
    }
}
