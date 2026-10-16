using GearGo.Models.Entities;

namespace GearGo.Services.Strategies;

public interface IInspectionStrategy
{
    /// <summary>
    /// Kiểm tra chiến lược có áp dụng cho kết luận kiểm định này hay không
    /// </summary>
    bool CanHandle(string ketLuan);

    /// <summary>
    /// Thực thi cập nhật trạng thái thiết bị, khởi tạo bảo trì nếu cần
    /// </summary>
    Task XuLySauKiemTraAsync(
        ChiTietNhanTra chiTiet,
        ThietBi thietBi,
        NhanVien nhanVien,
        long maDonThue);
}
