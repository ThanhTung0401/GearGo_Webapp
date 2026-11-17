using System;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhieuNhap;

namespace GearGo.Services.Interfaces;

public interface INhapKhoService
{
    Task<Result<KetQuaNhapKhoResponse>> XacNhanNhapKhoAsync(long phieuId, XacNhanNhapKhoRequest request, long actorId);
}
