using GearGo.Models.Common;
using GearGo.Models.DTOs.NhanTra;

namespace GearGo.Services.Interfaces;

public interface INhanTraService
{
    /// <summary>
    /// Tạo phiếu nhận trả nháp mới cho danh sách chi tiết bàn giao được chọn
    /// </summary>
    Task<Result<NhanTraResponse>> TaoPhieuNhanTraNhapAsync(
        long donId,
        TaoNhanTraRequest request,
        long actorId
    );

    /// <summary>
    /// Cập nhật thông tin kiểm tra thiết bị trên phiếu nhận trả nháp
    /// </summary>
    Task<Result<NhanTraResponse>> CapNhatPhieuNhanTraNhapAsync(
        long phieuId,
        CapNhatPhieuNhanTraRequest request,
        long actorId
    );

    /// <summary>
    /// Tách các dòng chưa đủ điều kiện (mất/hỏng) sang một phiếu nháp riêng để chốt phần đồ đã về
    /// </summary>
    Task<Result<TachDongResponse>> TachDongChoXuLyAsync(
        long phieuId,
        TachDongChoXuLyRequest request,
        long actorId
    );

    /// <summary>
    /// Quản trị viên phê duyệt kết luận mất thiết bị khi đã có phụ phí bồi thường được duyệt
    /// </summary>
    Task<Result<ChiTietNhanTraResponse>> DuyetKetLuanMatAsync(
        long phieuId,
        long chiTietId,
        DuyetMatRequest request,
        long actorId
    );

    /// <summary>
    /// Chốt phiếu nhận trả: cập nhật trạng thái thiết bị, tạo phiếu bảo trì nếu hỏng, cập nhật trạng thái đơn
    /// </summary>
    Task<Result<NhanTraResponse>> ChotNhanTraAsync(
        long phieuId,
        long actorId
    );
}
