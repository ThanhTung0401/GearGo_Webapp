using GearGo.Models.Common;
using GearGo.Models.DTOs.QuaHan;

namespace GearGo.Services.Interfaces;

public interface IQuaHanService
{
    // Helper tính phí trễ cho từng thiết bị
    Task<Result<TinhPhiTreDuKienResponse>> TinhPhiTreDuKienAsync(long maChiTietBanGiao, DateTime mocTinh);
    
    // Các method khác của task 2 có thể được thêm sau
}
