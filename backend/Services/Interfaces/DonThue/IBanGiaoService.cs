using GearGo.Models.Common;
using GearGo.Models.DTOs.BanGiao;

namespace GearGo.Services.Interfaces;

public interface IBanGiaoService
{
    // Lấy phiếu bàn giao của một đơn thuê (để xem lại)
    Task<Result<PhieuBanGiaoResponse>> LayTheoDonAsync(long maDonThue);

    // Tạo phiếu nháp (nếu chưa có) từ Đơn Thuê đã sẵn sàng
    Task<Result<PhieuBanGiaoResponse>> TaoHoacLayPhieuBanGiaoNhapAsync(
            long maDonThue, long maNhanVienTao);

    // Cập nhật tình trạng thiết bị, ảnh, chữ ký vào phiếu nháp
    Task<Result<PhieuBanGiaoResponse>> CapNhatPhieuBanGiaoNhapAsync(
            long maPhieuBanGiao, CapNhatPhieuBanGiaoRequest request);

    // Xác nhận giao đồ cho khách, kết thúc quy trình, chuyển trạng thái đơn sang DangThue
    Task<Result<bool>> ChotBanGiaoAsync(
            long maPhieuBanGiao, ChotBanGiaoRequest request, long maNhanVienChot);
}
