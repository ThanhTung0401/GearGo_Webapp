using GearGo.Models.DTOs.GioThue;

namespace GearGo.Services.Interfaces
{
    public interface IGioThueService
    {
        Task<GioThueResponse> LayGioAsync(long maKhachHang);
        Task<GioThueResponse> ThemAsync(long maKhachHang, ThemVaoGioRequest req);
        Task<GioThueResponse> CapNhatSoLuongAsync(long maKhachHang, long maChiTiet, CapNhatSoLuongRequest req);
        Task XoaChiTietAsync(long maKhachHang, long maChiTiet);
        Task<GioThueResponse> DatThoiGianAsync(long maKhachHang, DatThoiGianRequest req);
        Task<GioThueResponse> ApMaKhuyenMaiAsync(long maKhachHang, ApKhuyenMaiRequest req);
    }
}