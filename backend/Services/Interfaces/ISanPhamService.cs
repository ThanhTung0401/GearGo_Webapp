using GearGo.Models.DTOs.SanPham;
using GearGo.Models.Entities;
using Microsoft.AspNetCore.Http;

namespace GearGo.Services.Interfaces
{
    public interface ISanPhamService
    {
        Task<(IEnumerable<SanPhamResponse> Data, int TongSo)> TimKiemAsync(TimKiemSanPhamRequest request);
        Task<SanPhamDetailResponse?> LayChiTietAsync(int id, DateTime? gioNhan, DateTime? gioTra);
        Task<SanPham> TaoMoiAsync(SanPham sanPham, List<IFormFile> hinhAnhs);
        Task<bool> CapNhatAsync(SanPham sanPham);
        Task<bool> DoiTrangThaiAsync(int id, string trangThaiKinhDoanh);
    }
}