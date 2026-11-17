using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhanQuyen;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Dịch vụ phân quyền động (feat/ROLE_Adjustment).
/// Quản trị viên cấp/thu quyền cho role; version tăng mỗi lần đổi → handler biết reload.
/// </summary>
public interface IPermissionService
{
    Task<List<VaiTroResponse>> LayDanhSachVaiTroAsync(CancellationToken ct = default);

    Task<List<QuyenCatalogResponse>> LayCatalogAsync();

    Task<Result<QuyenCuaVaiTroResponse>> LayQuyenCuaVaiTroAsync(string roleName, CancellationToken ct = default);

    /// <summary>Set toàn bộ danh sách quyền cho role (idempotent). Bump version + ghi audit trong cùng transaction.</summary>
    Task<Result<QuyenCuaVaiTroResponse>> CapNhatQuyenVaiTroAsync(
        string roleName, CapNhatQuyenVaiTroRequest request, long actor, CancellationToken ct = default);

    Task<Result<QuyenCuaToiResponse>> LayQuyenCuaToiAsync(long maTaiKhoan, CancellationToken ct = default);

    /// <summary>Kiểm tra role có permission; dùng bởi AuthorizationHandler (cache + version).</summary>
    Task<bool> KiemTraCoQuyenAsync(string roleName, string permissionMa, CancellationToken ct = default);

    /// <summary>Version hiện tại của role; handler so với cache để quyết định reload.</summary>
    Task<long> LayVersionAsync(string roleName, CancellationToken ct = default);

    /// <summary>UC1.10: Lấy quyền chi tiết của một nhân viên theo MaTaiKhoan hoặc MaNhanVien.</summary>
    Task<Result<QuyenCuaNhanVienResponse>> LayQuyenCuaNhanVienAsync(long id, CancellationToken ct = default);

    /// <summary>UC1.10: Cấp/thu quyền riêng cho một tài khoản nhân viên.</summary>
    Task<Result<QuyenCuaNhanVienResponse>> CapNhatQuyenNhanVienAsync(
        long id, CapNhatQuyenNhanVienRequest request, long actor, CancellationToken ct = default);

    /// <summary>UC1.10: Xóa phân quyền riêng của nhân viên để quay về kế thừa theo vai trò.</summary>
    Task<Result<QuyenCuaNhanVienResponse>> XoaPhanQuyenRiengNhanVienAsync(
        long id, long actor, CancellationToken ct = default);

    /// <summary>Kiểm tra quyền hiệu lực của tài khoản (ưu tiên quyền riêng nếu có, ngược lại theo role).</summary>
    Task<bool> KiemTraCoQuyenTaiKhoanAsync(long maTaiKhoan, string roleName, string permissionMa, CancellationToken ct = default);
}
