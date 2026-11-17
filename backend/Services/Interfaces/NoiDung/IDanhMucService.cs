using System.Collections.Generic;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DanhMuc;

namespace GearGo.Services.Interfaces;

public interface IDanhMucService
{
    Task<Result<List<DanhMucResponse>>> LayCayDanhMucAsync();
    Task<Result<DanhMucResponse>> LayChiTietAsync(long id);
}
