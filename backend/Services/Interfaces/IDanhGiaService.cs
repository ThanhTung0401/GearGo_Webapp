using System.Collections.Generic;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DanhGia;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Interface dịch vụ quản lý và xử lý nghiệp vụ đánh giá sản phẩm (W5-T6)
/// </summary>
public interface IDanhGiaService
{
    /// <summary>
    /// Lấy danh sách các dòng sản phẩm trong đơn đã hoàn tất đủ điều kiện đánh giá của khách
    /// </summary>
    Task<Result<List<SanPhamDuDieuKienDanhGiaResponse>>> LaySanPhamDuDieuKienDanhGiaAsync(long maTaiKhoan);

    /// <summary>
    /// Khách hàng tạo đánh giá mới cho sản phẩm trong đơn hoàn tất
    /// </summary>
    Task<Result<DanhGiaResponse>> TaoDanhGiaAsync(TaoDanhGiaRequest request, long maTaiKhoan);

    /// <summary>
    /// Lấy danh sách các đánh giá do chính khách hàng đã tạo
    /// </summary>
    Task<Result<PagedResult<DanhGiaResponse>>> LayDanhGiaCuaToiAsync(int trang, int soMoiTrang, long maTaiKhoan);

    /// <summary>
    /// Lấy danh sách đánh giá công khai đang hiển thị của sản phẩm
    /// </summary>
    Task<Result<PagedResult<DanhGiaResponse>>> LayDanhGiaSanPhamAsync(LocDanhGiaRequest request);

    /// <summary>
    /// Lấy điểm trung bình, số lượt đánh giá và histogram 1-5 sao của sản phẩm
    /// </summary>
    Task<Result<TongHopDanhGiaResponse>> LayTongHopDiemAsync(long sanPhamId);

    /// <summary>
    /// Quản trị viên tra cứu toàn bộ đánh giá (bao gồm cả đánh giá bị ẩn)
    /// </summary>
    Task<Result<PagedResult<DanhGiaResponse>>> AdminLayDanhSachDanhGiaAsync(int trang, int soMoiTrang, string? trangThai);

    /// <summary>
    /// Quản trị viên ẩn đánh giá vi phạm kèm lý do
    /// </summary>
    Task<Result<DanhGiaResponse>> AnDanhGiaAsync(long maDanhGia, AnDanhGiaRequest request, long maNhanVienAdmin);

    /// <summary>
    /// Quản trị viên khôi phục hiển thị đánh giá đã ẩn
    /// </summary>
    Task<Result<DanhGiaResponse>> KhoiPhucDanhGiaAsync(long maDanhGia, KhoiPhucDanhGiaRequest request, long maNhanVienAdmin);
}
