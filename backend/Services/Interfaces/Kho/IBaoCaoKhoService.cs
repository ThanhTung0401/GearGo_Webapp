using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.Kho;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Báo cáo nhập hàng, kho và bảo trì (W6-T6 - Minh Tú, UC25).
/// Quyền được kiểm tra lại từ database trên từng lời gọi (không tin vai trò trong token cũ):
/// phần giá trị mua/chi phí chỉ dành cho quản trị viên; nhân viên chỉ xem số liệu vận hành.
/// </summary>
public interface IBaoCaoKhoService
{
    /// <summary>Nhập hàng gốc + điều chỉnh tách riêng + hiệu lực. Chỉ phiếu đã nhập kho. Quản trị viên.</summary>
    Task<Result<NhapHangResponse>> LayNhapHangAsync(LocNhapHangRequest filter, long actorId);

    /// <summary>Delta điều chỉnh đã áp dụng có thời điểm áp dụng trong kỳ (kể cả phiếu nguồn ngoài kỳ). Quản trị viên.</summary>
    Task<Result<DieuChinhNhapResponse>> LayDieuChinhNhapAsync(LocNhapHangRequest filter, long actorId);

    /// <summary>Lịch sử đơn giá và đơn giá bình quân gia quyền theo sản phẩm nguồn. Quản trị viên.</summary>
    Task<Result<LichSuDonGiaResponse>> LayLichSuDonGiaAsync(LocNhapHangRequest filter, long actorId);

    /// <summary>Hiện trạng kho hiện tại theo sản phẩm hiện tại. Nhân viên/quản trị viên; giá trị nhập chỉ quản trị viên.</summary>
    Task<Result<HienTrangKhoBaoCaoResponse>> LayHienTrangKhoAsync(LocHienTrangKhoRequest filter, long actorId);

    /// <summary>Thống kê bảo trì. Nhân viên xem số phiếu/thời gian; chi phí chỉ quản trị viên.</summary>
    Task<Result<BaoTriThongKeResponse>> LayThongKeBaoTriAsync(LocBaoTriRequest filter, long actorId);

    /// <summary>Xuất CSV (UTF-8 BOM, chống công thức) cùng bộ lọc/quyền với báo cáo. Quản trị viên.</summary>
    Task<Result<TepCsvKetQua>> XuatCsvAsync(XuatCsvKhoRequest request, long actorId);
}
