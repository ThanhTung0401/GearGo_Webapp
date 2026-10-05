using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;

namespace GearGo.Services.Interfaces;

public interface ITruyVanDonThueService
{
    Task<PagedResult<DonTomTatResponse>> LayDonCuaToiAsync(TimDonRequest filter, long maTaiKhoan);
    Task<DonChiTietResponse> LayChiTietDonCuaToiAsync(long maDonThue, long maTaiKhoan);
    Task<List<SuKienDonResponse>> LayLichSuDonCuaToiAsync(long maDonThue, long maTaiKhoan);
    Task<PhieuBanGiaoKhachResponse> LayBienBanBanGiaoCuaKhachAsync(long maDonThue, long maTaiKhoan);

    Task<PagedResult<DonVanHanhTomTatResponse>> TimDonVanHanhAsync(TimDonVanHanhRequest filter, long maTaiKhoan);
    Task<DonVanHanhChiTietResponse> LayChiTietDonVanHanhAsync(long maDonThue, long maTaiKhoan);
}
