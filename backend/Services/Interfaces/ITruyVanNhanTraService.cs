using GearGo.Models.DTOs.NhanTra;

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
}
