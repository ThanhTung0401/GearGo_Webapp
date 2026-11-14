using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhanQuyen;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GearGo.Services.Implements;

/// <summary>
/// Dịch vụ phân quyền động (feat/ROLE_Adjustment).
/// Lưu quyền trong AspNetRoleClaims; version lưu trong ROLE_PERMISSION_VERSION.
/// </summary>
public class PermissionService : IPermissionService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PermissionService> _logger;

    private static TimeSpan CacheTtl => TimeSpan.FromSeconds(30);

    public PermissionService(ApplicationDbContext context, IMemoryCache cache, ILogger<PermissionService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<VaiTroResponse>> LayDanhSachVaiTroAsync(CancellationToken ct = default)
    {
        var roles = await _context.Roles.AsNoTracking().ToListAsync(ct);
        var counts = await _context.RoleClaims.AsNoTracking()
            .Where(c => c.ClaimType == DomainConstants.Permissions.Type)
            .GroupBy(c => c.RoleId)
            .Select(g => new { RoleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count, ct);
        var versions = await _context.RolePermissionVersions.AsNoTracking()
            .ToDictionaryAsync(v => v.RoleName, v => v.Version, ct);

        return roles
            .Where(r => r.Name != null && DomainConstants.Roles.All.Contains(r.Name))
            .Select(r => new VaiTroResponse
            {
                RoleName = r.Name!,
                TenHienThi = TenHienThi(r.Name!),
                Version = versions.TryGetValue(r.Name!, out var v) ? v : 0,
                SoQuyen = counts.TryGetValue(r.Id, out var c) ? c : 0
            })
            .OrderBy(r => Array.IndexOf(DomainConstants.Roles.All, r.RoleName))
            .ToList();
    }

    public Task<List<QuyenCatalogResponse>> LayCatalogAsync()
    {
        var groups = DomainConstants.Permissions.All
            .GroupBy(p => p.Split('.', 2)[0])
            .Select(g => new QuyenCatalogResponse
            {
                Nhom = g.Key,
                Quyen = g.Select(q => new QuyenItem { Ma = q, TenHienThi = TenQuyenHienThi(q) }).ToList()
            })
            .ToList();
        return Task.FromResult(groups);
    }

    public async Task<Result<QuyenCuaVaiTroResponse>> LayQuyenCuaVaiTroAsync(string roleName, CancellationToken ct = default)
    {
        if (!DomainConstants.Roles.All.Contains(roleName))
            return Result<QuyenCuaVaiTroResponse>.Loi(DomainConstants.Errors.RoleNotFound, "Vai trò không tồn tại.");

        var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == roleName, ct);
        if (role == null)
            return Result<QuyenCuaVaiTroResponse>.Loi(DomainConstants.Errors.RoleNotFound, "Vai trò chưa được seed.");

        var quyen = await _context.RoleClaims.AsNoTracking()
            .Where(c => c.RoleId == role.Id && c.ClaimType == DomainConstants.Permissions.Type)
            .Select(c => c.ClaimValue!)
            .ToListAsync(ct);

        var version = await LayVersionAsync(roleName, ct);
        return Result<QuyenCuaVaiTroResponse>.Ok(new QuyenCuaVaiTroResponse
        {
            RoleName = roleName,
            Version = version,
            QuyenCoDuoc = quyen.OrderBy(p => p).ToList()
        });
    }

    public async Task<Result<QuyenCuaVaiTroResponse>> CapNhatQuyenVaiTroAsync(
        string roleName, CapNhatQuyenVaiTroRequest request, long actor, CancellationToken ct = default)
    {
        if (!DomainConstants.Roles.All.Contains(roleName))
            return Result<QuyenCuaVaiTroResponse>.Loi(DomainConstants.Errors.RoleNotFound, "Vai trò không tồn tại.");

        await ActorGuard.EnsureQuanTriVienAsync(_context, actor, ct);

        if (roleName == DomainConstants.Roles.Customer && request.Quyen.Count > 0)
            return Result<QuyenCuaVaiTroResponse>.Loi("VAI_TRO_KHACH_KHONG_NHAN_QUYEN",
                "Role KhachHang không cấp permission quản trị; dùng CustomerOnly policy riêng.");

        var moi = new HashSet<string>(request.Quyen.Distinct(), StringComparer.Ordinal);
        var khongHopLe = moi.Where(p => !DomainConstants.Permissions.All.Contains(p)).ToList();
        if (khongHopLe.Count > 0)
            return Result<QuyenCuaVaiTroResponse>.Loi(DomainConstants.Errors.PermissionNotFound,
                "Có quyền không nằm trong catalog.", new { khongHopLe });

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct);
            if (role == null)
                return Result<QuyenCuaVaiTroResponse>.Loi(DomainConstants.Errors.RoleNotFound, "Role chưa seed.");

            var hienCo = await _context.RoleClaims
                .Where(c => c.RoleId == role.Id && c.ClaimType == DomainConstants.Permissions.Type)
                .ToListAsync(ct);
            var tapCu = hienCo.Select(c => c.ClaimValue!).ToHashSet(StringComparer.Ordinal);

            var themVao = moi.Except(tapCu).ToList();
            var boDi = hienCo.Where(c => !moi.Contains(c.ClaimValue!)).ToList();

            foreach (var ma in themVao)
            {
                _context.RoleClaims.Add(new IdentityRoleClaim<long>
                {
                    RoleId = role.Id,
                    ClaimType = DomainConstants.Permissions.Type,
                    ClaimValue = ma
                });
            }
            _context.RoleClaims.RemoveRange(boDi);

            var version = await _context.RolePermissionVersions.FirstOrDefaultAsync(v => v.RoleName == roleName, ct);
            if (version == null)
            {
                version = new RolePermissionVersion { RoleName = roleName, Version = 1, CapNhatLuc = DateTime.UtcNow };
                _context.RolePermissionVersions.Add(version);
            }
            else
            {
                version.Version += 1;
                version.CapNhatLuc = DateTime.UtcNow;
            }

            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = actor,
                HanhDong = "CapNhatQuyenVaiTro",
                LoaiDoiTuong = "VAI_TRO",
                MaDoiTuong = roleName,
                DuLieuTruoc = JsonSerializer.Serialize(tapCu.OrderBy(x => x)),
                DuLieuSau = JsonSerializer.Serialize(moi.OrderBy(x => x)),
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Thêm {themVao.Count}, bỏ {boDi.Count}, version → {version.Version}"
            });

            _cache.Remove(CacheKey(roleName));

            return Result<QuyenCuaVaiTroResponse>.Ok(new QuyenCuaVaiTroResponse
            {
                RoleName = roleName,
                Version = version.Version,
                QuyenCoDuoc = moi.OrderBy(x => x).ToList()
            });
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<QuyenCuaToiResponse>> LayQuyenCuaToiAsync(long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await _context.TaiKhoans.AsNoTracking().FirstOrDefaultAsync(t => t.MaTaiKhoan == maTaiKhoan, ct);
        if (tk == null)
            return Result<QuyenCuaToiResponse>.Loi(DomainConstants.Errors.AccountNotFound, "Tài khoản không tồn tại.");

        var kq = await LayQuyenCuaVaiTroAsync(tk.VaiTro, ct);
        var quyen = kq.ThanhCong && kq.DuLieu != null ? kq.DuLieu.QuyenCoDuoc : new List<string>();
        var version = kq.ThanhCong && kq.DuLieu != null ? kq.DuLieu.Version : 0;

        // Nếu tài khoản có phân quyền riêng (UC1.10), ưu tiên trả về danh sách quyền riêng
        var (coQuyenRieng, quyenRieng) = await LoadUserOverrideFromDbAsync(maTaiKhoan, ct);
        if (coQuyenRieng)
        {
            quyen = quyenRieng.OrderBy(p => p).ToList();
        }

        return Result<QuyenCuaToiResponse>.Ok(new QuyenCuaToiResponse
        {
            MaTaiKhoan = maTaiKhoan,
            RoleName = tk.VaiTro,
            Version = version,
            Quyen = quyen
        });
    }

    public async Task<bool> KiemTraCoQuyenAsync(string roleName, string permissionMa, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(roleName) || string.IsNullOrEmpty(permissionMa)) return false;
        var tap = await LoadCachedAsync(roleName, ct);
        return tap.Contains(permissionMa);
    }

    public async Task<bool> KiemTraCoQuyenTaiKhoanAsync(
        long maTaiKhoan, string roleName, string permissionMa, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(roleName) || string.IsNullOrEmpty(permissionMa)) return false;

        // Kiểm tra quyền riêng theo tài khoản trước (nếu có cấu hình override)
        var userKey = UserCacheKey(maTaiKhoan);
        if (!_cache.TryGetValue<UserCacheEntry>(userKey, out var cached) || cached == null)
        {
            var (hasOverride, perms) = await LoadUserOverrideFromDbAsync(maTaiKhoan, ct);
            cached = new UserCacheEntry(hasOverride, perms);
            _cache.Set(userKey, cached, CacheTtl);
        }

        if (cached.HasOverride)
        {
            return cached.Quyen.Contains(permissionMa);
        }

        return await KiemTraCoQuyenAsync(roleName, permissionMa, ct);
    }

    public async Task<Result<QuyenCuaNhanVienResponse>> LayQuyenCuaNhanVienAsync(long id, CancellationToken ct = default)
    {
        var resolved = await ResolveNhanVienAsync(id, ct);
        if (!resolved.ThanhCong)
            return Result<QuyenCuaNhanVienResponse>.Loi(resolved.MaLoi!, resolved.ThongDiep!);

        var (tk, nv) = resolved.DuLieu;
        var kqRole = await LayQuyenCuaVaiTroAsync(tk.VaiTro, ct);
        var quyenVaiTro = kqRole.ThanhCong && kqRole.DuLieu != null ? kqRole.DuLieu.QuyenCoDuoc : new List<string>();
        var (coQuyenRieng, quyenRieng) = await LoadUserOverrideFromDbAsync(tk.MaTaiKhoan, ct);

        return Result<QuyenCuaNhanVienResponse>.Ok(new QuyenCuaNhanVienResponse
        {
            MaTaiKhoan = tk.MaTaiKhoan,
            MaNhanVien = nv?.MaNhanVien,
            HoTen = nv?.HoTen ?? tk.Email ?? $"TK#{tk.MaTaiKhoan}",
            Email = tk.Email ?? string.Empty,
            RoleName = tk.VaiTro,
            CoPhanQuyenRieng = coQuyenRieng,
            QuyenCoDuoc = coQuyenRieng ? quyenRieng.OrderBy(x => x).ToList() : quyenVaiTro,
            QuyenTheoVaiTro = quyenVaiTro
        });
    }

    public async Task<Result<QuyenCuaNhanVienResponse>> CapNhatQuyenNhanVienAsync(
        long id, CapNhatQuyenNhanVienRequest request, long actor, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actor, ct);

        var resolved = await ResolveNhanVienAsync(id, ct);
        if (!resolved.ThanhCong)
            return Result<QuyenCuaNhanVienResponse>.Loi(resolved.MaLoi!, resolved.ThongDiep!);

        var (tk, nv) = resolved.DuLieu;
        if (tk.VaiTro == DomainConstants.Roles.Customer)
            return Result<QuyenCuaNhanVienResponse>.Loi("VAI_TRO_KHACH_KHONG_NHAN_QUYEN",
                "Tài khoản khách hàng không nhận permission quản trị.");

        var moi = new HashSet<string>(request.Quyen.Distinct(), StringComparer.Ordinal);
        var khongHopLe = moi.Where(p => !DomainConstants.Permissions.All.Contains(p)).ToList();
        if (khongHopLe.Count > 0)
            return Result<QuyenCuaNhanVienResponse>.Loi(DomainConstants.Errors.PermissionNotFound,
                "Có quyền không nằm trong catalog.", new { khongHopLe });

        var kq = await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == tk.VaiTro, ct);
            if (role == null)
                return Result<QuyenCuaNhanVienResponse>.Loi(DomainConstants.Errors.RoleNotFound, "Role chưa seed.");

            var overrideType = UserOverrideMarkerType(tk.MaTaiKhoan);
            var permType = UserPermClaimType(tk.MaTaiKhoan);

            var hienCo = await _context.RoleClaims
                .Where(c => c.ClaimType == permType || c.ClaimType == overrideType)
                .ToListAsync(ct);

            var tapCu = hienCo.Where(c => c.ClaimType == permType).Select(c => c.ClaimValue!).ToHashSet(StringComparer.Ordinal);
            _context.RoleClaims.RemoveRange(hienCo);

            // Ghi marker đánh dấu tài khoản này dùng bộ quyền riêng (kể cả khi danh sách quyền rỗng)
            _context.RoleClaims.Add(new IdentityRoleClaim<long>
            {
                RoleId = role.Id,
                ClaimType = overrideType,
                ClaimValue = "1"
            });

            foreach (var ma in moi)
            {
                _context.RoleClaims.Add(new IdentityRoleClaim<long>
                {
                    RoleId = role.Id,
                    ClaimType = permType,
                    ClaimValue = ma
                });
            }

            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = actor,
                HanhDong = "CapNhatQuyenNhanVien",
                LoaiDoiTuong = "TAI_KHOAN",
                MaDoiTuong = tk.MaTaiKhoan.ToString(),
                DuLieuTruoc = JsonSerializer.Serialize(tapCu.OrderBy(x => x)),
                DuLieuSau = JsonSerializer.Serialize(moi.OrderBy(x => x)),
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Cập nhật {moi.Count} quyền riêng cho tài khoản #{tk.MaTaiKhoan}"
            });

            _cache.Remove(UserCacheKey(tk.MaTaiKhoan));
            return Result<QuyenCuaNhanVienResponse>.Ok(new QuyenCuaNhanVienResponse());
        }, _logger, IsolationLevel.Serializable);

        if (!kq.ThanhCong) return kq;
        return await LayQuyenCuaNhanVienAsync(tk.MaTaiKhoan, ct);
    }

    public async Task<Result<QuyenCuaNhanVienResponse>> XoaPhanQuyenRiengNhanVienAsync(
        long id, long actor, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actor, ct);

        var resolved = await ResolveNhanVienAsync(id, ct);
        if (!resolved.ThanhCong)
            return Result<QuyenCuaNhanVienResponse>.Loi(resolved.MaLoi!, resolved.ThongDiep!);

        var (tk, _) = resolved.DuLieu;
        var overrideType = UserOverrideMarkerType(tk.MaTaiKhoan);
        var permType = UserPermClaimType(tk.MaTaiKhoan);

        var hienCo = await _context.RoleClaims
            .Where(c => c.ClaimType == permType || c.ClaimType == overrideType)
            .ToListAsync(ct);

        if (hienCo.Count > 0)
        {
            _context.RoleClaims.RemoveRange(hienCo);
            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = actor,
                HanhDong = "XoaPhanQuyenRiengNhanVien",
                LoaiDoiTuong = "TAI_KHOAN",
                MaDoiTuong = tk.MaTaiKhoan.ToString(),
                DuLieuTruoc = JsonSerializer.Serialize(hienCo.Where(c => c.ClaimType == permType).Select(c => c.ClaimValue).OrderBy(x => x)),
                DuLieuSau = "[]",
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Đưa tài khoản #{tk.MaTaiKhoan} về kế thừa quyền theo vai trò {tk.VaiTro}"
            });
            await _context.SaveChangesAsync(ct);
        }

        _cache.Remove(UserCacheKey(tk.MaTaiKhoan));
        return await LayQuyenCuaNhanVienAsync(tk.MaTaiKhoan, ct);
    }

    public async Task<long> LayVersionAsync(string roleName, CancellationToken ct = default)
    {
        return await _context.RolePermissionVersions.AsNoTracking()
            .Where(v => v.RoleName == roleName)
            .Select(v => (long?)v.Version)
            .FirstOrDefaultAsync(ct) ?? 0;
    }

    private async Task<HashSet<string>> LoadCachedAsync(string roleName, CancellationToken ct)
    {
        var version = await LayVersionAsync(roleName, ct);
        var key = CacheKey(roleName);
        if (_cache.TryGetValue<CacheEntry>(key, out var entry) && entry != null && entry.Version == version)
            return entry.Quyen;

        var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == roleName, ct);
        HashSet<string> quyen;
        if (role == null)
        {
            quyen = new HashSet<string>(StringComparer.Ordinal);
        }
        else
        {
            var danhSach = await _context.RoleClaims.AsNoTracking()
                .Where(c => c.RoleId == role.Id && c.ClaimType == DomainConstants.Permissions.Type)
                .Select(c => c.ClaimValue!)
                .ToListAsync(ct);
            quyen = new HashSet<string>(danhSach, StringComparer.Ordinal);
        }

        _cache.Set(key, new CacheEntry(version, quyen), CacheTtl);
        return quyen;
    }

    private static string CacheKey(string roleName) => $"perm:{roleName}";
    private static string UserCacheKey(long maTaiKhoan) => $"perm_user:{maTaiKhoan}";
    private static string UserOverrideMarkerType(long maTaiKhoan) => $"user_perm_override:{maTaiKhoan}";
    private static string UserPermClaimType(long maTaiKhoan) => $"user_perm:{maTaiKhoan}";

    private async Task<(bool HasOverride, HashSet<string> Quyen)> LoadUserOverrideFromDbAsync(long maTaiKhoan, CancellationToken ct)
    {
        var overrideType = UserOverrideMarkerType(maTaiKhoan);
        var permType = UserPermClaimType(maTaiKhoan);
        var claims = await _context.RoleClaims.AsNoTracking()
            .Where(c => c.ClaimType == overrideType || c.ClaimType == permType)
            .ToListAsync(ct);

        var hasOverride = claims.Any(c => c.ClaimType == overrideType);
        if (!hasOverride) return (false, new HashSet<string>(StringComparer.Ordinal));

        var quyen = claims
            .Where(c => c.ClaimType == permType && !string.IsNullOrEmpty(c.ClaimValue))
            .Select(c => c.ClaimValue!)
            .ToHashSet(StringComparer.Ordinal);
        return (true, quyen);
    }

    private async Task<Result<(TaiKhoan Tk, NhanVien? Nv)>> ResolveNhanVienAsync(long id, CancellationToken ct)
    {
        var nv = await _context.NhanViens.AsNoTracking()
            .Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaTaiKhoan == id || n.MaNhanVien == id, ct);
        if (nv != null)
            return Result<(TaiKhoan, NhanVien?)>.Ok((nv.TaiKhoan, nv));

        var tk = await _context.TaiKhoans.AsNoTracking()
            .FirstOrDefaultAsync(t => t.MaTaiKhoan == id, ct);
        if (tk == null)
            return Result<(TaiKhoan, NhanVien?)>.Loi(DomainConstants.Errors.AccountNotFound, "Không tìm thấy tài khoản nhân viên.");

        return Result<(TaiKhoan, NhanVien?)>.Ok((tk, null));
    }

    private sealed record CacheEntry(long Version, HashSet<string> Quyen);
    private sealed record UserCacheEntry(bool HasOverride, HashSet<string> Quyen);

    private static string TenHienThi(string roleName) => roleName switch
    {
        DomainConstants.Roles.Admin => "Quản trị viên",
        DomainConstants.Roles.Staff => "Nhân viên",
        DomainConstants.Roles.Customer => "Khách hàng",
        _ => roleName
    };

    private static string TenQuyenHienThi(string ma)
    {
        var parts = ma.Split('.', 2);
        var nhom = parts[0];
        var hanhDong = parts.Length > 1 ? parts[1] : "";
        var tenHanhDong = hanhDong switch
        {
            "Xem" => "Xem",
            "Tao" => "Tạo",
            "CapNhat" => "Cập nhật",
            "Xoa" => "Xóa",
            "Huy" => "Hủy",
            "Quan" => "Quản lý",
            "Xuat" => "Xuất",
            _ => hanhDong
        };
        var tenNhom = nhom switch
        {
            "DonThue" => "đơn thuê",
            "SanPham" => "sản phẩm",
            "DanhMuc" => "danh mục",
            "KhuyenMai" => "khuyến mãi",
            "ChinhSach" => "chính sách",
            "BaoCao" => "báo cáo",
            "TaiKhoan" => "tài khoản",
            "NhanVien" => "nhân viên",
            "PhanQuyen" => "phân quyền",
            _ => nhom
        };
        return $"{tenHanhDong} {tenNhom}";
    }
}
