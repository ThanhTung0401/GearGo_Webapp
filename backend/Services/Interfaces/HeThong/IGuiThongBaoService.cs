using System.Threading;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThongBao;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Interface dịch vụ xử lý gửi thông báo ra kênh ngoài (Email), claim hàng chờ và xử lý thử lại (W5-T8)
/// </summary>
public interface IGuiThongBaoService
{
    /// <summary>
    /// Worker claim các bản ghi thông báo chờ gửi hoặc kẹt dở, thực hiện gửi và cập nhật trạng thái
    /// </summary>
    Task<int> XuLyHangChoAsync(int batchSize = 20, CancellationToken ct = default);

    /// <summary>
    /// Quản trị viên kích hoạt gửi lại một thông báo bị lỗi
    /// </summary>
    Task<Result<ThongBaoAdminResponse>> ThuLaiAsync(long maThongBao, ThuLaiThongBaoRequest request, long maTaiKhoanAdmin, CancellationToken ct = default);

    /// <summary>
    /// Quản trị viên tra cứu danh sách các thông báo gửi thất bại cần can thiệp
    /// </summary>
    Task<Result<PagedResult<ThongBaoAdminResponse>>> LayThongBaoGuiLoiAsync(int trang, int soMoiTrang, CancellationToken ct = default);
}
