using GearGo.Models.Common;
using GearGo.Models.Entities;

namespace GearGo.Services.Interfaces;

public interface IBaoTriService
{
    Task<Result<PhieuBaoTri>> TaoPhieuBaoTriToiThieuAsync(
        long maThietBi,
        long? maDonThue,
        long maNhanVienLap,
        string loaiXuLy,
        string moTaLoi,
        string mucDo
    );
}
