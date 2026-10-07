using System.Collections.Generic;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhuPhi;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Giao diện dịch vụ quản lý phụ phí và giải quyết tranh chấp (UC14 - Kiện Minh)
/// </summary>
public interface IPhuPhiService
{
    /// <summary>
    /// Lấy danh sách phụ phí của một đơn thuê (hỗ trợ cả khách hàng và nhân viên vận hành)
    /// </summary>
    Task<Result<List<PhuPhiResponse>>> LayDanhSachPhuPhiTheoDonAsync(long donId, long actorId);

    /// <summary>
    /// Lấy gợi ý phụ phí theo thiết bị bàn giao (tính trễ, hư hỏng, thiếu phụ kiện)
    /// </summary>
    Task<Result<List<GoiYPhuPhiResponse>>> GoiYPhiAsync(long chiTietBanGiaoId, long actorId);

    /// <summary>
    /// Lập phụ phí mới chờ phê duyệt (kiểm tra chống trùng lặp khoản phí cho cùng tổn thất)
    /// </summary>
    Task<Result<PhuPhiResponse>> LapPhiAsync(LapPhuPhiRequest dto, long actorId);

    /// <summary>
    /// Cập nhật phụ phí khi đang ở trạng thái chưa duyệt và chưa bị khóa đối soát
    /// </summary>
    Task<Result<PhuPhiResponse>> CapNhatPhiChuaDuyetAsync(long id, CapNhatPhuPhiRequest dto, long actorId);

    /// <summary>
    /// Phê duyệt phụ phí theo phân quyền thẩm quyền (Staff duyệt hạn mức, Admin duyệt vượt quyền/mất đồ)
    /// </summary>
    Task<Result<PhuPhiResponse>> DuyetPhiAsync(long id, DuyetPhuPhiRequest dto, long actorId);

    /// <summary>
    /// Từ chối phụ phí
    /// </summary>
    Task<Result<PhuPhiResponse>> TuChoiPhiAsync(long id, DuyetPhuPhiRequest dto, long actorId);

    /// <summary>
    /// Khách hàng mở khiếu nại / tranh chấp đối với phụ phí đã duyệt của đơn mình
    /// </summary>
    Task<Result<PhuPhiResponse>> TaoTranhChapAsync(long id, TranhChapRequest dto, long actorId);

    /// <summary>
    /// Quản trị viên xử lý và kết luận giải quyết tranh chấp
    /// </summary>
    Task<Result<PhuPhiResponse>> GiaiQuyetTranhChapAsync(long id, GiaiQuyetTranhChapRequest dto, long actorId);

    /// <summary>
    /// Lập phụ phí điều chỉnh sau khi đã đối soát (tham chiếu khoản gốc, tổng phí không được âm)
    /// </summary>
    Task<Result<PhuPhiResponse>> LapDieuChinhPhiAsync(long phiGocId, DieuChinhPhiRequest dto, long actorId);
}
