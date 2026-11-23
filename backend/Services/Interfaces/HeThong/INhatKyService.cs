using GearGo.Models.Common;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Dịch vụ tra cứu nhật ký thao tác và liên kết chứng từ nguồn (UC10.4).
/// </summary>
public interface INhatKyService
{
    Task<PagedResult<object>> TraCuuAsync(
        long currentTaiKhoanId,
        long? maTaiKhoan,
        string? hanhDong,
        string? loaiDoiTuong,
        string? maDoiTuong,
        DateTime? tuNgay,
        DateTime? denNgay,
        string? tuKhoa,
        int trang = 1,
        int soMoiTrang = 20,
        // [AUDIT-03]: cho phép lọc theo vai trò người thực hiện ngay trên Backend để Pagination server
        // không bị hỏng (trước đây FE lọc client-side trên 20 dòng của trang hiện tại).
        string? vaiTro = null,
        CancellationToken ct = default);
}
