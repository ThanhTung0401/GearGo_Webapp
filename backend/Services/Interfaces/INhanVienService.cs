using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriTaiKhoan;

namespace GearGo.Services.Interfaces;

/// <summary>W5-T1: hồ sơ nhân sự, vai trò, nghỉ việc. actorId = MaTaiKhoan quản trị viên (JWT).</summary>
public interface INhanVienService
{
    Task<Result<PhanTrangResponse<NhanVienResponse>>> TimNhanVienAsync(TimNhanVienRequest request, long actorId, CancellationToken ct = default);
    Task<Result<NhanVienResponse>> LayNhanVienAsync(long maNhanVien, long actorId, CancellationToken ct = default);
    Task<Result<NhanVienResponse>> TaoNhanVienAsync(TaoNhanVienRequest request, long actorId, CancellationToken ct = default);
    Task<Result<NhanVienResponse>> CapNhatNhanVienAsync(long maNhanVien, CapNhatNhanVienRequest request, long actorId, CancellationToken ct = default);
    Task<Result<NhanVienResponse>> DoiVaiTroAsync(long maNhanVien, DoiVaiTroRequest request, long actorId, CancellationToken ct = default);
    Task<Result<NhanVienResponse>> GhiNhanNghiViecAsync(long maNhanVien, NghiViecRequest request, long actorId, CancellationToken ct = default);
}
