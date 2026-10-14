using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.Entities;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Hoàn tiền dùng chung cho hủy đơn (Thanh Tùng), đối soát cọc (Kim Xuyến) và thu thừa/thu muộn (Minh Tú).
/// Luồng: LapYeuCauHoanAsync (trong transaction bên gọi) → commit → GuiYeuCauDaLapAsync (ngoài transaction)
/// → kết quả qua callback/tra cứu → XuLyKetQuaHoanAsync / DoiChieuKetQuaHoanAsync. Callback không gọi ngược đối soát.
/// </summary>
public interface IHoanTienService
{
    /// <summary>
    /// Lập intent hoàn theo từng nguồn thu gốc. BẮT BUỘC chạy trong transaction của bên gọi; chỉ Add vào DbContext,
    /// không SaveChanges/commit. Khóa các nguồn theo mã tăng dần, kiểm tra
    /// "đã hoàn thành công + đang giữ + yêu cầu mới ≤ thực thu" trên từng nguồn rồi phân bổ.
    /// Gọi lại cùng KhoaNghiaVu trả bộ yêu cầu cũ (không lập thêm). Không gọi mạng.
    /// </summary>
    Task<List<HoanTien>> LapYeuCauHoanAsync(LapHoanCommand command, long? maTaiKhoanThucHien, CancellationToken ct = default);

    /// <summary>Hạn mức hiện tại của một nguồn (đọc, không khóa) — để bên gọi xem trước.</summary>
    Task<HanMucNguonResponse> LayHanMucNguonAsync(long maChiTietThanhToan, CancellationToken ct = default);

    /// <summary>
    /// Gửi các intent đã commit ra gateway (dùng sau commit của hủy/đối soát, hoặc job phục hồi).
    /// Không ném lỗi gateway ra ngoài: lỗi chưa rõ được ghi thành ChuaRoKetQua.
    /// </summary>
    Task GuiYeuCauDaLapAsync(IEnumerable<long> maHoanTiens, long? maNhanVien, CancellationToken ct = default);

    /// <summary>API vận hành: gửi một yêu cầu ChoXuLy, hoặc lập lần thử mới cho yêu cầu ThatBai đã xác minh.</summary>
    Task<HoanTienResponse> XuLyYeuCauHoanAsync(long maHoanTien, XuLyHoanRequest request, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>Callback gateway đã ký. Cập nhật thành công đúng một lần; không để thất bại cũ ghi đè thành công.</summary>
    Task<HoanTienResponse> XuLyKetQuaHoanAsync(KetQuaHoanCallbackRequest ketQua, CancellationToken ct = default);

    /// <summary>Tra cứu gateway bằng CÙNG mã yêu cầu (timeout/khởi động lại); kết quả đi qua cùng handler với callback.</summary>
    Task<HoanTienResponse> DoiChieuKetQuaHoanAsync(long maHoanTien, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>Chủ đơn hoặc nhân viên/quản trị viên. HOAN_TIEN → CHI_TIET_THANH_TOAN → THANH_TOAN → DON_THUE.</summary>
    Task<HoanTienTheoDonResponse> LayDanhSachTheoDonAsync(long maDonThue, long maTaiKhoan, CancellationToken ct = default);

    /// <summary>Bản nội bộ không kiểm tra quyền — chỉ cho service đã kiểm tra quyền đơn (vd. HuyDonService).</summary>
    Task<HoanTienTheoDonResponse> TongHopTheoDonAsync(long maDonThue, bool laNoiBo, CancellationToken ct = default);

    /// <summary>Job/khởi động lại: gửi intent ChoXuLy bị bỏ dở và đối chiếu các yêu cầu đang chờ cũ hơn <paramref name="doTre"/>.</summary>
    Task<TiepTucHoanKetQua> TiepTucCacYeuCauDangChoAsync(TimeSpan doTre, CancellationToken ct = default);
}
