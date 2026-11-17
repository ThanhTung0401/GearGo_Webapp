using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriTaiKhoan;

namespace GearGo.Services.Interfaces;

/// <summary>W5-T1: tra cứu, khóa/mở khóa tài khoản. actorId = MaTaiKhoan quản trị viên (JWT).</summary>
public interface IQuanTriTaiKhoanService
{
    Task<Result<PhanTrangResponse<TaiKhoanResponse>>> TimTaiKhoanAsync(TimTaiKhoanRequest request, long actorId, CancellationToken ct = default);
    Task<Result<TaiKhoanResponse>> LayTaiKhoanAsync(long maTaiKhoan, long actorId, CancellationToken ct = default);
    Task<Result<TaiKhoanResponse>> KhoaTaiKhoanAsync(long maTaiKhoan, KhoaTaiKhoanRequest request, long actorId, CancellationToken ct = default);
    Task<Result<TaiKhoanResponse>> MoKhoaTaiKhoanAsync(long maTaiKhoan, MoKhoaTaiKhoanRequest request, long actorId, CancellationToken ct = default);
}
