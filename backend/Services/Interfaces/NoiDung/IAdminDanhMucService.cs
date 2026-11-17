using GearGo.Models.DTOs.Admin;

namespace GearGo.Services.Interfaces
{
    public interface IAdminDanhMucService
    {
        Task<object> LayDanhSachAsync();
        Task<object> TaoMoiAsync(TaoDanhMucRequest req);
        Task<object> CapNhatAsync(long id, CapNhatDanhMucRequest req);
        Task DoiTrangThaiAsync(long id, string trangThaiMoi);
        Task XoaAsync(long id);
    }
}