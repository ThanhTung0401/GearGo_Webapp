using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.TaiChinh;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Báo cáo tài chính và số dư cần xử lý (W6-T5 - Kim Xuyến, UC25).
/// Chỉ dành cho Quản trị viên (kiểm tra vai trò hiện tại trong database qua actorId).
/// Đọc từ chứng từ/trạng thái thật; aggregate ở đúng grain; không fan-out nhân đôi số tiền.
/// </summary>
public interface IBaoCaoTaiChinhService
{
    /// <summary>
    /// Doanh thu đơn hoàn tất: tiền thuê sau giảm + phụ phí của đối soát ban đầu đã chốt (không cộng cọc).
    /// Mốc lọc theo ThoiDiemHoanTat của đơn.
    /// </summary>
    Task<Result<DoanhThuHoanTatBaoCaoResponse>> LayDoanhThuHoanTatAsync(LocTaiChinhRequest filter, long actorId);

    /// <summary>
    /// Phí hủy giữ lại có căn cứ từ tiền thuê thực thu theo quyết định hủy.
    /// Mốc lọc theo ThoiDiemHuy của đơn.
    /// </summary>
    Task<Result<PhiHuyBaoCaoResponse>> LayPhiHuyAsync(LocTaiChinhRequest filter, long actorId);

    /// <summary>
    /// Khoản tăng/giảm điều chỉnh doanh thu từ đối soát điều chỉnh sau chốt.
    /// Mốc lọc theo ThoiDiemChot của đối soát điều chỉnh.
    /// </summary>
    Task<Result<DieuChinhDoanhThuBaoCaoResponse>> LayDieuChinhDoanhThuAsync(LocTaiChinhRequest filter, long actorId);

    /// <summary>
    /// Dòng tiền thực tế: tổng thu/hoàn thành công, phân loại (thuê, cọc, thu bổ sung, chờ phân loại; hoàn theo lý do/nguồn).
    /// Mốc lọc theo ThoiDiemThanhCong của giao dịch thanh toán và khoản hoàn tiền.
    /// </summary>
    Task<Result<ThuHoanBaoCaoResponse>> LayThuHoanAsync(LocTaiChinhRequest filter, long actorId);

    /// <summary>
    /// Báo cáo số dư cọc hiện tại còn phải xử lý (xét cọc thực thu - hoàn cọc - cọc đã bù phụ phí đối soát).
    /// Báo cáo số dư hiện tại trên lịch sử đầy đủ, không lọc theo ngày thu phát sinh trong kỳ.
    /// </summary>
    Task<Result<CocChuaTatToanBaoCaoResponse>> LayCocChuaTatToanAsync(LocTaiChinhRequest filter, long actorId);

    /// <summary>
    /// Danh sách các khoản pending / cần đối chiếu / chưa phân loại / chênh lệch chứng từ.
    /// </summary>
    Task<Result<KhoanCanXuLyBaoCaoResponse>> LayKhoanCanXuLyAsync(LocTaiChinhRequest filter, long actorId);

    /// <summary>
    /// Xuất CSV UTF-8 (có BOM, an toàn chống CSV injection) áp dụng cùng quyền và bộ lọc.
    /// </summary>
    Task<Result<TepCsvKetQua>> XuatCsvAsync(XuatCsvTaiChinhRequest request, long actorId);
}
