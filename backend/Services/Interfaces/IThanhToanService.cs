using System.Collections.Generic;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThanhToan;

namespace GearGo.Services.Interfaces;

public interface IThanhToanService
{
    /// <summary>
    /// Xác nhận thanh toán ban đầu của đơn thuê (Week 2)
    /// </summary>
    Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request);
    
    /// <summary>
    /// Tạo yêu cầu thu bổ sung phụ phí đối soát (W4-T5)
    /// </summary>
    Task<Result<YeuCauThuResponse>> TaoThuBoSungAsync(TaoThuBoSungRequest request, long actorId);

    /// <summary>
    /// Lấy trạng thái giao dịch thu (W4-T5)
    /// </summary>
    Task<Result<YeuCauThuResponse>> LayTrangThaiGiaoDichAsync(string maYeuCau, long actorId);

    /// <summary>
    /// Xử lý callback webhook thu bổ sung và liên kết đối soát (W4-T5, W4-T8)
    /// </summary>
    Task<Result<YeuCauThuResponse>> XuLyCallbackThuBoSungAsync(XuLyCallbackRequest request);

    /// <summary>
    /// Lấy danh sách giao dịch cần đối chiếu ngoại lệ (W4-T8)
    /// </summary>
    Task<Result<List<GiaoDichCanDoiChieuResponse>>> LayDanhSachCanDoiChieuAsync(long actorId);

    /// <summary>
    /// Quản trị viên đối chiếu và xử lý giao dịch ngoại lệ, hoàn tiền thừa nếu có (W4-T8)
    /// </summary>
    Task<Result<string>> DoiChieuGiaoDichAsync(long maThanhToan, DoiChieuGiaoDichRequest request, long actorId);
}
