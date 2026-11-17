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
        CancellationToken ct = default);
}
