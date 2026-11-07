using System;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChinhSach;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Dịch vụ Quản lý chính sách theo phiên bản (W6-T1 - UC26 - Thanh Tùng).
/// Đóng vai trò selector dùng chung cho mọi service đọc chính sách (tạo đơn, hủy, phí trễ…).
/// </summary>
public interface IChinhSachService
{
    /// <summary>Danh sách các bản bất biến cho admin, sort thời điểm áp dụng + phiên bản giảm dần.</summary>
    Task<Result<PagedResult<ChinhSachResponse>>> LayDanhSachAsync(int trang = 1, int kichThuoc = 20, CancellationToken ct = default);

    /// <summary>Chi tiết một phiên bản cụ thể.</summary>
    Task<Result<ChinhSachResponse>> LayChiTietAsync(long maChinhSach, CancellationToken ct = default);

    /// <summary>
    /// Selector dùng chung: trả phiên bản đang hiệu lực tại <paramref name="mocThoiGian"/>.
    /// Quy tắc: thoi_diem_ap_dung &lt;= mốc, sort thời điểm giảm rồi phiên bản giảm;
    /// nếu không có bản hợp lệ, trả lỗi <c>CHUA_CO_CHINH_SACH_HIEU_LUC</c>.
    /// </summary>
    Task<Result<ChinhSachResponse>> LayDangHieuLucAsync(DateTime mocThoiGian, CancellationToken ct = default);

    /// <summary>
    /// Xem trước/kiểm tra nội dung chính sách (không ghi).
    /// Trả danh sách lỗi theo đường dẫn và phiên bản dự kiến được chọn tại mốc đưa vào.
    /// </summary>
    Task<Result<KiemTraChinhSachResponse>> KiemTraNoiDungAsync(TaoChinhSachRequest request, long actor, CancellationToken ct = default);

    /// <summary>Tạo một phiên bản mới (bất biến). Cấp phiên bản có bảo vệ race-condition.</summary>
    Task<Result<ChinhSachResponse>> TaoPhienBanAsync(TaoChinhSachRequest request, long actor, CancellationToken ct = default);

    /// <summary>Lấy chính sách đã gắn với một đơn thuê — chỉ phần điều khoản cho khách.</summary>
    Task<Result<ChinhSachCuaDonResponse>> LayChinhSachCuaDonAsync(long maDonThue, long actor, CancellationToken ct = default);
}
