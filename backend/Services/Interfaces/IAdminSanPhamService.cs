using GearGo.Models.DTOs.Admin;
using Microsoft.AspNetCore.Http;

namespace GearGo.Services.Interfaces
{
    public interface IAdminSanPhamService
    {
        Task<object> LayDanhSachAsync(string? tuKhoa, int trang = 1, int soMoiTrang = 12);
        Task<object> TaoMoiAsync(TaoSanPhamRequest req);
        Task<object> CapNhatAsync(long id, CapNhatSanPhamRequest req);
        Task DoiTrangThaiAsync(long id, string trangThaiMoi);
        
        // Xử lý ảnh
        Task<object> ThemHinhAnhAsync(long maSanPham, IFormFile file);
        Task XoaHinhAnhAsync(long maHinhAnh);
    }
}