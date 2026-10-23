using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DieuChinhKho;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Dịch vụ lập, quản lý và duyệt áp dụng điều chỉnh kho thiết bị (W5-T5 - Minh Tú)
/// </summary>
public interface IDieuChinhKhoService
{
    /// <summary>
    /// Lập phiếu điều chỉnh kho mới (tự động lưu snapshot trước từ database)
    /// </summary>
    Task<Result<DieuChinhKhoResponse>> LapPhieuAsync(LapDieuChinhKhoRequest request, long actorId);

    /// <summary>
    /// Cập nhật thông tin phiếu điều chỉnh khi còn ở trạng thái nháp
    /// </summary>
    Task<Result<DieuChinhKhoResponse>> CapNhatNhapAsync(long id, LapDieuChinhKhoRequest request, long actorId);

    /// <summary>
    /// Gửi duyệt phiếu điều chỉnh (khóa nội dung, chuyển sang ChoDuyet)
    /// </summary>
    Task<Result<DieuChinhKhoResponse>> GuiDuyetAsync(long id, long actorId);

    /// <summary>
    /// Quản trị viên từ chối phiếu điều chỉnh
    /// </summary>
    Task<Result<DieuChinhKhoResponse>> TuChoiAsync(long id, TuChoiDieuChinhRequest request, long actorId);

    /// <summary>
    /// Quản trị viên duyệt và áp dụng biến động kho trong một transaction nguyên tử (Serializable)
    /// </summary>
    Task<Result<DieuChinhKhoResponse>> DuyetVaApDungAsync(long id, long actorId);

    /// <summary>
    /// Xem chi tiết phiếu điều chỉnh kho
    /// </summary>
    Task<Result<DieuChinhKhoResponse>> LayChiTietAsync(long id, long actorId, bool laAdmin);

    /// <summary>
    /// Danh sách phiếu điều chỉnh kho phân trang
    /// </summary>
    Task<Result<PagedResult<DieuChinhKhoResponse>>> TimPhieuAsync(int trang, int soMoiTrang, string? loaiDieuChinh, string? trangThai, long actorId);

    /// <summary>
    /// Tính toán giá trị và số lượng nhập hiệu lực của một phiếu nhập gốc sau chuỗi điều chỉnh
    /// </summary>
    Task<Result<GiaTriNhapHieuLucResponse>> TinhGiaTriSauDieuChinhAsync(long maPhieuNhap, long actorId);
}
