using GearGo.Models.Entities;

namespace GearGo.Services.Interfaces
{
    public interface IDanhMucService
    {
        Task<IEnumerable<DanhMucSanPham>> LayTatCaAsync();
        Task<DanhMucSanPham?> LayTheoIdAsync(int id);
        Task<DanhMucSanPham> TaoMoiAsync(DanhMucSanPham danhMuc);
        Task<bool> CapNhatAsync(DanhMucSanPham danhMuc);
        Task<(bool ThanhCong, string? LoiLam)> XoaAsync(int id);
    }
}