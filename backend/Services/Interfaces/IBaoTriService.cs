using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoTri;
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

    Task<Result<DanhSachBaoTriResponse>> TimKiemAsync(TimKiemBaoTriRequest request);
    Task<Result<BaoTriResponse>> LayChiTietAsync(long maPhieuBaoTri);
    Task<Result<BaoTriResponse>> LapPhieuAsync(LapBaoTriRequest request, long actorId);
    Task<Result<BaoTriResponse>> PhanCongXuLyAsync(long maPhieuBaoTri, PhanCongBaoTriRequest request, long actorId);
    Task<Result<BaoTriResponse>> CapNhatTienDoAsync(long maPhieuBaoTri, CapNhatTienDoRequest request, long actorId);
    Task<Result<BaoTriResponse>> GuiKiemTraAsync(long maPhieuBaoTri, long actorId);
    Task<Result<BaoTriResponse>> XacNhanHoanThanhAsync(long maPhieuBaoTri, XacNhanBaoTriRequest request, long actorId);
    Task<Result<BaoTriResponse>> KetThucKhongDatAsync(long maPhieuBaoTri, XacNhanBaoTriRequest request, long actorId);
}
