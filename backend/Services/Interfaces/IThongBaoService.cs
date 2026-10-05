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

    Task<PagedResult<ThongBaoResponse>> LayThongBaoCuaToiAsync(TimThongBaoRequest filter, long maTaiKhoan);
    Task<ThongBaoResponse> DanhDauDaDocAsync(long maThongBao, long maTaiKhoan);
}
