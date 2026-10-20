using GearGo.Models.Common;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;

namespace GearGo.Services.Interfaces;

public interface IThongBaoService
{
    /// <summary>
    /// Thêm thông báo "Sẵn sàng nhận" (kênh trong ứng dụng) vào DbContext của bên gọi, KHÔNG SaveChanges.
    /// Bên gọi phải đã khóa đơn trong cùng transaction. Cùng (tài khoản, eventKey, kênh) trả lại bản cũ.
    /// eventKey nên có dạng "SAN_SANG_NHAN:{maDon}:{maLichSuDonChuyenSangSanSang}" để lần sẵn sàng lại là sự kiện mới.
    /// </summary>
    Task<ThongBao> TaoThongBaoSanSangNhanAsync(long maDonThue, string eventKey);

    /// <summary>
    /// Helper sự kiện Week 4 (nhận trả, quá hạn, phụ phí, thu bổ sung, hoàn tiền, hoàn tất, hủy).
    /// Cùng quy tắc: chỉ Add vào DbContext của bên gọi, không SaveChanges; gọi lại cùng
    /// (người nhận, MaSuKien, kênh) trả bản cũ. MaSuKien phải gắn với chứng từ/đợt/giao dịch cụ thể —
    /// xem <see cref="MaSuKienThongBao"/> — để đợt trả thứ hai không bị coi là trùng đợt đầu.
    /// </summary>
    Task<ThongBao> TaoThongBaoSuKienAsync(SuKienThongBaoCommand command);

    Task<PagedResult<ThongBaoResponse>> LayThongBaoCuaToiAsync(TimThongBaoRequest filter, long maTaiKhoan);
    Task<ThongBaoResponse> DanhDauDaDocAsync(long maThongBao, long maTaiKhoan);

    /// <summary>Đếm số lượng thông báo chưa đọc của tài khoản</summary>
    Task<int> DemChuaDocAsync(long maTaiKhoan);

    /// <summary>Đánh dấu toàn bộ thông báo của tài khoản là đã đọc</summary>
    Task<int> DanhDauTatCaDaDocAsync(long maTaiKhoan);

    /// <summary>Tạo thông báo kênh Email (đưa vào hàng chờ gửi nền)</summary>
    Task<ThongBao> TaoThongBaoEmailAsync(SuKienThongBaoCommand command);
}

