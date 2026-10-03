using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhaCungCap;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Service quản lý Nhà cung cấp (W3-T3 - Kiện Minh)
/// </summary>
public interface INhaCungCapService
{
    /// <summary>
    /// Tìm kiếm và phân trang danh sách nhà cung cấp
    /// </summary>
    Task<PagedResult<NhaCungCapResponse>> TimKiemAsync(
        string? tuKhoa, 
        string? trangThaiHopTac, 
        int trang = 1, 
        int soMoiTrang = 20, 
        CancellationToken ct = default);

    /// <summary>
    /// Lấy thông tin chi tiết một nhà cung cấp
    /// </summary>
    Task<NhaCungCapResponse> LayChiTietAsync(long id, CancellationToken ct = default);

    /// <summary>
    /// Tạo mới một nhà cung cấp (chỉ Quản trị viên)
    /// </summary>
    Task<NhaCungCapResponse> TaoAsync(TaoNhaCungCapRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Cập nhật thông tin nhà cung cấp (chỉ Quản trị viên)
    /// </summary>
    Task<NhaCungCapResponse> CapNhatAsync(long id, CapNhatNhaCungCapRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Đổi trạng thái hợp tác (DangHopTac / NgungHopTac)
    /// </summary>
    Task<NhaCungCapResponse> DoiTrangThaiHopTacAsync(long id, DoiHopTacRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Lấy lịch sử nhập hàng thực tế từ các phiếu đã nhập kho
    /// </summary>
    Task<LichSuNhapResponse> LayLichSuNhapAsync(long id, int trang = 1, int soMoiTrang = 20, CancellationToken ct = default);
}
