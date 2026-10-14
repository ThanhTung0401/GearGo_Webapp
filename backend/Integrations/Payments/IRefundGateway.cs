namespace GearGo.Integrations.Payments;

public enum KetQuaHoanGateway
{
    /// <summary>Gateway đã nhận yêu cầu, kết quả báo sau (callback hoặc tra cứu).</summary>
    DaTiepNhan,
    ThanhCong,
    ThatBai,
    /// <summary>Tra cứu: gateway không có yêu cầu với mã này (chưa từng nhận).</summary>
    KhongTimThay
}

public record YeuCauHoanGateway(
    string MaYeuCau,
    decimal SoTien,
    string? CongThanhToan,
    string? MaGiaoDichThuGoc
);

public record PhanHoiHoanGateway(
    KetQuaHoanGateway KetQua,
    string? MaGiaoDichHoanCong,
    decimal? SoTien,
    DateTime? ThoiDiem,
    string? ThongDiep
);

/// <summary>
/// Lỗi phía gateway khi chưa xác định được tiền đã chuyển hay chưa (timeout, mất kết nối, 5xx).
/// Bên gọi phải coi là "chưa rõ kết quả", giữ hạn mức và đối chiếu bằng cùng mã yêu cầu.
/// </summary>
public class RefundGatewayKhongRoKetQuaException : Exception
{
    public RefundGatewayKhongRoKetQuaException(string message, Exception? inner = null) : base(message, inner) { }
}

/// <summary>
/// Adapter hoàn tiền. Gọi ngoài transaction database. Mã yêu cầu là khóa idempotent phía gateway:
/// gửi lại cùng mã không được tạo khoản hoàn thứ hai.
/// </summary>
public interface IRefundGateway
{
    /// <exception cref="RefundGatewayKhongRoKetQuaException">Không biết gateway đã xử lý hay chưa.</exception>
    Task<PhanHoiHoanGateway> GuiYeuCauHoanAsync(YeuCauHoanGateway yeuCau, CancellationToken ct = default);

    /// <exception cref="RefundGatewayKhongRoKetQuaException">Tra cứu không có phản hồi.</exception>
    Task<PhanHoiHoanGateway> TraCuuAsync(string maYeuCau, CancellationToken ct = default);

    /// <summary>Xác minh callback thật sự đến từ gateway (chữ ký trên mã yêu cầu, mã giao dịch, số tiền, trạng thái).</summary>
    bool XacMinhChuKy(string maYeuCau, string? maGiaoDichHoanCong, decimal soTien, string trangThai, string? chuKy);
}
