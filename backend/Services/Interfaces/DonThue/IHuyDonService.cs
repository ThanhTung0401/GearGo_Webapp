using GearGo.Models.DTOs.HuyDon;

namespace GearGo.Services.Interfaces;

/// <summary>
/// UC07 — hủy đơn trước bàn giao và lập yêu cầu hoàn theo từng nguồn thu.
/// Hủy và hoàn là hai tiến trình: đơn đã hủy dù khoản hoàn còn chờ; hoàn thất bại không khôi phục đơn.
/// </summary>
public interface IHuyDonService
{
    /// <summary>Chỉ đọc. loaiHuy: KhachHuy (chủ đơn) | CuaHangHuy | KhongDenNhan (nhân viên/quản trị viên).</summary>
    Task<XemTruocHuyResponse> XemTruocHuyAsync(long maDonThue, long maTaiKhoan, string loaiHuy, CancellationToken ct = default);

    Task<HuyDonResponse> KhachHuyAsync(long maDonThue, HuyDonRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>Quản trị viên hủy do cửa hàng không cung cấp được đồ: hoàn toàn bộ tiền thuê và cọc đã thu.</summary>
    Task<HuyDonResponse> CuaHangHuyAsync(long maDonThue, HuyDonRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>Nhân viên ghi nhận khách không đến; chỉ quản trị viên quyết định hủy/xử lý tiền theo chính sách.</summary>
    Task<KhongDenNhanResponse> GhiNhanKhongDenNhanAsync(long maDonThue, KhongDenNhanRequest request, long maTaiKhoan, CancellationToken ct = default);
}
