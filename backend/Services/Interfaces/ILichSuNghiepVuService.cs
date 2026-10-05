using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Helper ghi lịch sử/audit. KHÔNG gọi SaveChanges và không tự mở transaction:
/// entry chỉ được thêm vào DbContext (tracked) của bên gọi, commit cùng nghiệp vụ.
/// Trạng thái trước phải lấy từ dữ liệu đã đọc/khóa trong transaction, không lấy từ request.
/// </summary>
public interface ILichSuNghiepVuService
{
    LichSuTrangThaiDon GhiChuyenTrangThaiDon(GhiLichSuDonCommand command);
    LichSuTinhTrangThietBi GhiThayDoiThietBi(GhiLichSuThietBiCommand command);
    NhatKyThaoTac GhiNhatKyThaoTac(GhiNhatKyCommand command);
}
