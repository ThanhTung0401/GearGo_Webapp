using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriKhuyenMai;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Giao diện dịch vụ Quản trị khuyến mãi dành cho Admin (W6-T2 - UC24 - Kiện Minh)
/// </summary>
public interface IQuanTriKhuyenMaiService
{
    /// <summary>
    /// Tìm kiếm và phân trang danh sách khuyến mãi
    /// </summary>
    Task<Result<PagedResult<KhuyenMaiResponse>>> TimKiemAsync(TimKiemKhuyenMaiRequest request);

    /// <summary>
    /// Lấy chi tiết khuyến mãi kèm bảng nối và thống kê lượt sử dụng
    /// </summary>
    Task<Result<KhuyenMaiResponse>> LayChiTietAsync(long id);

    /// <summary>
    /// Tạo mới chương trình khuyến mãi (chuẩn hóa mã, validate phạm vi và hạn mức)
    /// </summary>
    Task<Result<KhuyenMaiResponse>> TaoAsync(TaoKhuyenMaiRequest request, long actorId);

    /// <summary>
    /// Cập nhật khuyến mãi (khóa điều khoản cam kết nếu đã có lượt giữ/dùng)
    /// </summary>
    Task<Result<KhuyenMaiResponse>> CapNhatAsync(long id, CapNhatKhuyenMaiRequest request, long actorId);

    /// <summary>
    /// Tạm ẩn khuyến mãi (ngừng nhận lượt áp mới, giữ nguyên đơn đã giữ lượt)
    /// </summary>
    Task<Result<KhuyenMaiResponse>> TamAnAsync(long id, DoiHienThiKhuyenMaiRequest request, long actorId);

    /// <summary>
    /// Hiển thị lại khuyến mãi đã tạm ẩn
    /// </summary>
    Task<Result<KhuyenMaiResponse>> HienThiAsync(long id, DoiHienThiKhuyenMaiRequest request, long actorId);

    /// <summary>
    /// Báo cáo tình hình sử dụng chi tiết theo từng đơn thuê
    /// </summary>
    Task<Result<SuDungKhuyenMaiResponse>> LayTinhHinhSuDungAsync(long id);
}
