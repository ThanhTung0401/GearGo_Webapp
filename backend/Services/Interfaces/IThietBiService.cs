using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThietBi;

namespace GearGo.Services.Interfaces;

public interface IThietBiService
{
    Task<Result<PagedResult<ThietBiResponse>>> TimKiemThietBiAsync(TimThietBiRequest request, long actorId);
    Task<Result<ThietBiResponse>> LayChiTietThietBiAsync(long id, long actorId);
    Task<Result<List<PhanCongResponse>>> LayLichThietBiAsync(long id, DateTime? tuNgay, DateTime? denNgay, long actorId);
    Task<Result<List<ThietBiResponse>>> LayThietBiPhuHopChoDonAsync(long dongDonId, long actorId);
    Task<Result<KiemTraLichResponse>> KiemTraLichThietBiAsync(KiemTraLichRequest request);
}
