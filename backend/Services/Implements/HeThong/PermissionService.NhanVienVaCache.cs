using System.Data;
using System.Text.Json;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhanQuyen;
using GearGo.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GearGo.Services.Implements.HeThong;

public partial class PermissionService
{
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

        var (tk, _) = resolved.DuLieu;
        if (tk.VaiTro == DomainConstants.Roles.Customer)
            return Result<QuyenCuaNhanVienResponse>.Loi("VAI_TRO_KHACH_KHONG_NHAN_QUYEN",
                "Tài khoản khách hàng không nhận permission quản trị.");

        var moi = new HashSet<string>(request.Quyen.Distinct(), StringComparer.Ordinal);
        var khongHopLe = moi.Where(p => !DomainConstants.Permissions.All.Contains(p)).ToList();
        if (khongHopLe.Count > 0)
            return Result<QuyenCuaNhanVienResponse>.Loi(DomainConstants.Errors.PermissionNotFound,
                "Có quyền không nằm trong catalog.", new { khongHopLe });

        // Cấm gán quyền chỉ dành cho Quản trị viên vào phân quyền riêng của Nhân viên
        if (tk.VaiTro != DomainConstants.Roles.Admin)
        {
            var quyenCam = moi.Intersect(DomainConstants.Permissions.AdminOnly, StringComparer.Ordinal).ToList();
            if (quyenCam.Count > 0)
                return Result<QuyenCuaNhanVienResponse>.Loi("QUYEN_CHI_DANH_CHO_QUAN_TRI",
                    $"Nhóm quyền phân quyền chỉ dành cho Quản trị viên: {string.Join(", ", quyenCam)}", new { quyenCam });
        }

        // [PERM-01]: với tài khoản Nhân viên, bắt buộc có đủ MinStaff khi gán một bộ quyền KHÔNG RỖNG.
        // Vẫn cho phép danh sách RỖNG (semantic "override rỗng" dùng trong test PermissionSyncTests —
        // nhân viên không có quyền nào ngoài public endpoints) để không phá kịch bản kiểm thử sẵn có.
        // Chặn ở FE (PermissionsTab.save) sẽ hiển thị cảnh báo khi Admin bỏ sót MIN_STAFF.
        if (tk.VaiTro == DomainConstants.Roles.Staff && moi.Count > 0)
        {
            var thieuMin = DomainConstants.Permissions.MinStaff.Except(moi, StringComparer.Ordinal).ToList();
            if (thieuMin.Count > 0)
                return Result<QuyenCuaNhanVienResponse>.Loi("THIEU_QUYEN_TOI_THIEU_NHAN_VIEN",
                    $"Nhân viên phải giữ đủ bộ quyền tối thiểu. Còn thiếu: {string.Join(", ", thieuMin)}",
                    new { thieuMin });
        }

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

            // Marker đánh dấu tài khoản dùng bộ quyền riêng (kể cả khi danh sách quyền rỗng)
            _context.RoleClaims.Add(new IdentityRoleClaim<long> { RoleId = role.Id, ClaimType = overrideType, ClaimValue = "1" });
            foreach (var ma in moi)
                _context.RoleClaims.Add(new IdentityRoleClaim<long> { RoleId = role.Id, ClaimType = permType, ClaimValue = ma });

            // v2 §8.3 — bump TaiKhoan.PermissionVersion trong cùng transaction → mọi pod reload cache ở request kế.
            var tkTracked = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == tk.MaTaiKhoan, ct);
            if (tkTracked != null) tkTracked.PermissionVersion += 1;

            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = actor, HanhDong = "CapNhatQuyenNhanVien", LoaiDoiTuong = "TAI_KHOAN",
                MaDoiTuong = tk.MaTaiKhoan.ToString(),
                DuLieuTruoc = JsonSerializer.Serialize(tapCu.OrderBy(x => x)),
                DuLieuSau = JsonSerializer.Serialize(moi.OrderBy(x => x)),
                ThoiDiem = DateTime.UtcNow, LyDo = $"Cập nhật {moi.Count} quyền riêng cho tài khoản #{tk.MaTaiKhoan}"
            });

            _cache.Remove(UserCacheKey(tk.MaTaiKhoan));
            return Result<QuyenCuaNhanVienResponse>.Ok(new QuyenCuaNhanVienResponse());
        }, _logger, IsolationLevel.Serializable);

        return kq.ThanhCong ? await LayQuyenCuaNhanVienAsync(tk.MaTaiKhoan, ct) : kq;
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

            // v2 §8.3 — bump TaiKhoan.PermissionVersion để cache per-user invalidate ở mọi pod.
            var tkTracked = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == tk.MaTaiKhoan, ct);
            if (tkTracked != null) tkTracked.PermissionVersion += 1;

            _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = actor, HanhDong = "XoaPhanQuyenRiengNhanVien", LoaiDoiTuong = "TAI_KHOAN",
                MaDoiTuong = tk.MaTaiKhoan.ToString(),
                DuLieuTruoc = JsonSerializer.Serialize(hienCo.Where(c => c.ClaimType == permType).Select(c => c.ClaimValue).OrderBy(x => x)),
                DuLieuSau = "[]", ThoiDiem = DateTime.UtcNow,
                LyDo = $"Đưa tài khoản #{tk.MaTaiKhoan} về kế thừa quyền theo vai trò {tk.VaiTro}"
            });
            await _context.SaveChangesAsync(ct);
        }

        _cache.Remove(UserCacheKey(tk.MaTaiKhoan));
        return await LayQuyenCuaNhanVienAsync(tk.MaTaiKhoan, ct);
    }

    public async Task<long> LayVersionAsync(string roleName, CancellationToken ct = default)
        => await _context.RolePermissionVersions.AsNoTracking()
            .Where(v => v.RoleName == roleName).Select(v => (long?)v.Version).FirstOrDefaultAsync(ct) ?? 0;

    /// <summary>v2 §8.3 — version quyền riêng của tài khoản (TaiKhoan.PermissionVersion).</summary>
    private async Task<long> LayAccountVersionAsync(long maTaiKhoan, CancellationToken ct = default)
        => await _context.TaiKhoans.AsNoTracking()
            .Where(t => t.MaTaiKhoan == maTaiKhoan)
            .Select(t => (long?)t.PermissionVersion).FirstOrDefaultAsync(ct) ?? 0;

    private async Task<HashSet<string>> LoadCachedAsync(string roleName, CancellationToken ct)
    {
        var version = await LayVersionAsync(roleName, ct);
        var key = CacheKey(roleName);
        if (_cache.TryGetValue<CacheEntry>(key, out var entry) && entry != null && entry.Version == version)
            return entry.Quyen;

        var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == roleName, ct);
        var quyen = role == null
            ? new HashSet<string>(StringComparer.Ordinal)
            : (await _context.RoleClaims.AsNoTracking()
                .Where(c => c.RoleId == role.Id && c.ClaimType == DomainConstants.Permissions.Type)
                .Select(c => c.ClaimValue!).ToListAsync(ct)).ToHashSet(StringComparer.Ordinal);

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
            .Where(c => c.ClaimType == overrideType || c.ClaimType == permType).ToListAsync(ct);

        if (!claims.Any(c => c.ClaimType == overrideType))
            return (false, new HashSet<string>(StringComparer.Ordinal));

        return (true, claims.Where(c => c.ClaimType == permType && !string.IsNullOrEmpty(c.ClaimValue))
            .Select(c => c.ClaimValue!).ToHashSet(StringComparer.Ordinal));
    }

    private async Task<Result<(TaiKhoan Tk, NhanVien? Nv)>> ResolveNhanVienAsync(long id, CancellationToken ct)
    {
        // Ưu tiên khớp theo MaTaiKhoan trước, chỉ fallback MaNhanVien để tránh mơ hồ khi 2 cột trùng giá trị
        var nvQuery = _context.NhanViens.AsNoTracking().Include(n => n.TaiKhoan);
        var nv = await nvQuery.FirstOrDefaultAsync(n => n.MaTaiKhoan == id, ct)
                 ?? await nvQuery.FirstOrDefaultAsync(n => n.MaNhanVien == id, ct);
        if (nv != null) return Result<(TaiKhoan, NhanVien?)>.Ok((nv.TaiKhoan, nv));

        var tk = await _context.TaiKhoans.AsNoTracking().FirstOrDefaultAsync(t => t.MaTaiKhoan == id, ct);
        return tk == null
            ? Result<(TaiKhoan, NhanVien?)>.Loi(DomainConstants.Errors.AccountNotFound, "Không tìm thấy tài khoản nhân viên.")
            : Result<(TaiKhoan, NhanVien?)>.Ok((tk, null));
    }

    private sealed record CacheEntry(long Version, HashSet<string> Quyen);
    private sealed record UserCacheEntry(long Version, bool HasOverride, HashSet<string> Quyen);

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
        var tenHanhDong = (parts.Length > 1 ? parts[1] : "") switch
        {
            "Xem" => "Xem", "Tao" => "Tạo", "CapNhat" => "Cập nhật",
            "Xoa" => "Xóa", "Huy" => "Hủy", "Quan" => "Quản lý", "Xuat" => "Xuất", var x => x
        };
        var tenNhom = parts[0] switch
        {
            "DonThue" => "đơn thuê", "SanPham" => "sản phẩm", "DanhMuc" => "danh mục",
            "KhuyenMai" => "khuyến mãi", "ChinhSach" => "chính sách", "BaoCao" => "báo cáo",
            "TaiKhoan" => "tài khoản", "NhanVien" => "nhân viên", "PhanQuyen" => "phân quyền", var x => x
        };
        return $"{tenHanhDong} {tenNhom}";
    }
}
