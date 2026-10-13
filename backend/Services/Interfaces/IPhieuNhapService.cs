using System;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.Enums;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Service quản lý Phiếu nhập hàng nháp và tra cứu (W3-T4 - Kiện Minh)
/// </summary>
public interface IPhieuNhapService
{
    /// <summary>
    /// Tìm kiếm và phân trang danh sách phiếu nhập
    /// </summary>
    Task<PagedResult<PhieuNhapResponse>> TimKiemAsync(
        string? tuKhoa, 
        long? maNhaCungCap, 
        TrangThaiPhieuNhap? trangThai, 
        DateTime? tuNgay, 
        DateTime? denNgay, 
        int trang = 1, 
        int soMoiTrang = 20, 
        CancellationToken ct = default);

    /// <summary>
    /// Xem chi tiết một phiếu nhập kèm các dòng sản phẩm
    /// </summary>
    Task<PhieuNhapResponse> LayChiTietAsync(long id, CancellationToken ct = default);

    /// <summary>
    /// Tạo mới một phiếu nhập ở trạng thái Nháp (chưa tạo thiết bị, chưa tăng kho)
    /// </summary>
    Task<PhieuNhapResponse> TaoNhapAsync(TaoPhieuNhapRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Cập nhật thông tin đầu phiếu nhập nháp
    /// </summary>
    Task<PhieuNhapResponse> CapNhatNhapAsync(long id, CapNhatPhieuNhapRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Thêm dòng sản phẩm vào phiếu nhập (tự động gộp dòng nếu trùng sản phẩm, đơn giá và tình trạng)
    /// </summary>
    Task<PhieuNhapResponse> ThemDongAsync(long phieuId, DongNhapRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Cập nhật dòng sản phẩm trong phiếu nhập (tính lại tổng tiền, gộp dòng nếu trùng bộ khóa)
    /// </summary>
    Task<PhieuNhapResponse> SuaDongAsync(long phieuId, long chiTietId, DongNhapRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Xóa một dòng sản phẩm khỏi phiếu nhập nháp và cập nhật lại tổng tiền
    /// </summary>
    Task<PhieuNhapResponse> XoaDongAsync(long phieuId, long chiTietId, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>
    /// Hủy phiếu nhập nháp kèm lý do
    /// </summary>
    Task<PhieuNhapResponse> HuyNhapAsync(long id, HuyNhapRequest request, long maTaiKhoan, CancellationToken ct = default);
}
