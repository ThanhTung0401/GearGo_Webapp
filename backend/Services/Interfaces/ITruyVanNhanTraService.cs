using GearGo.Models.DTOs.NhanTra;
using GearGo.Models.Entities;

namespace GearGo.Services.Interfaces;

public interface ITruyVanNhanTraService
{
    /// <summary>
    /// Lấy danh sách các đợt nhận trả theo đơn thuê
    /// </summary>
    Task<List<NhanTraResponse>> LayDanhSachDotTraAsync(long donId, long actorId);

    /// <summary>
    /// Lấy danh sách các thiết bị còn nợ chưa được chốt trả
    /// </summary>
    Task<List<ThietBiConNoResponse>> LayThietBiConNoAsync(long donId, long actorId);

    /// <summary>
    /// Tải phiếu nhận trả kèm đầy đủ thông tin đơn thuê, chi tiết và thiết bị
    /// </summary>
    Task<PhieuNhanTra?> LayPhieuNhanTraTheoIdAsync(long phieuId);

    /// <summary>
    /// Đếm số lượng thiết bị còn nợ chưa được quyết toán trên đơn thuê
    /// </summary>
    Task<int> DemThietBiConNoAsync(long maDonThue, long? includePhieuId = null);
}
