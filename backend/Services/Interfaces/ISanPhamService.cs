using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.SanPham;

namespace GearGo.Services.Interfaces;

public interface ISanPhamService
{
    Task<Result<PagedResult<SanPhamResponse>>> TimKiemAsync(TimKiemSanPhamRequest request);
    Task<Result<SanPhamResponse>> LayChiTietAsync(long id, TimKiemSanPhamRequest request);
}
