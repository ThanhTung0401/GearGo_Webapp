namespace GearGo.Models.DTOs.HoanTien;

/// <summary>
/// Lệnh nội bộ lập nghĩa vụ hoàn (không phải DTO công khai — khách không tự chọn nguồn/số tiền).
/// Bên gọi đã xác nhận nghĩa vụ (bảng hủy, bảng đối soát, kết luận thu thừa) và đang giữ transaction.
/// </summary>
/// <param name="MaDonThue">Đơn của nghĩa vụ; mọi nguồn phải thuộc đơn này.</param>
/// <param name="LoaiHoan">Một giá trị của <see cref="Enums.LoaiHoanTien"/>.</param>
/// <param name="KhoaNghiaVu">
/// Khóa ổn định của nghĩa vụ, vd. "HUY:{maDon}:THUE", "HUY:{maDon}:COC", "DS:{maDoiSoat}", "TT:{maChiTietThanhToan}".
/// Gọi lại cùng khóa trả bộ yêu cầu cũ, không lập thêm.
/// </param>
/// <param name="TongSoTien">Số tiền nghĩa vụ (VND, server tính).</param>
/// <param name="NguonUngVien">Các CHI_TIET_THANH_TOAN có thể dùng làm nguồn; phân bổ theo mã tăng dần.</param>
public record LapHoanCommand(
    long MaDonThue,
    string LoaiHoan,
    string KhoaNghiaVu,
    decimal TongSoTien,
    IReadOnlyList<long> NguonUngVien,
    long? MaDoiSoat = null,
    string? LyDo = null
);

public record XuLyHoanRequest(string? GhiChuXuLy = null);

/// <summary>Callback từ gateway (qua adapter). Chữ ký bắt buộc; không phải thao tác của khách.</summary>
public record KetQuaHoanCallbackRequest(
    string MaYeuCau,
    string? MaGiaoDichHoanCong,
    decimal SoTien,
    string TrangThai,          // ThanhCong | ThatBai | DangXuLy
    DateTime? ThoiDiem,
    string? ChuKy
);

public record HoanTienResponse(
    long MaHoanTien,
    string? MaYeuCau,
    long MaChiTietThanhToanGoc,
    string MucDichNguon,
    long? MaDoiSoat,
    string? LoaiHoan,
    decimal SoTien,
    string TrangThai,
    string NhanHienThi,        // DuKien | DangXuLy | ChuaRoKetQua | DaHoan | CanXuLyLai
    DateTime ThoiDiemYeuCau,
    DateTime? ThoiDiemThanhCong,
    string? LyDo,
    string? MaGiaoDichHoanCong // chỉ trả cho nhân viên/quản trị viên
);

/// <summary>Hạn mức của một nguồn thu: mọi loại hoàn dùng chung, không chỉ cùng đối soát.</summary>
public record HanMucNguonResponse(
    long MaChiTietThanhToan,
    string MucDich,
    decimal ThucThu,
    decimal DaHoanThanhCong,
    decimal DangGiu,
    decimal ConCoTheLap
);

/// <summary>Tiến độ một nghĩa vụ hoàn có thể chia nhiều nguồn: chỉ hoàn thành khi mọi phần đã thành công.</summary>
public record NghiaVuHoanResponse(
    string KhoaNghiaVu,
    string? LoaiHoan,
    decimal TongSoTien,
    decimal DaHoanThanhCong,
    decimal ConCho,
    int SoKhoanCanXuLyLai,
    bool DaHoanThanh
);

public record HoanTienTheoDonResponse(
    long MaDonThue,
    List<HoanTienResponse> Items,
    decimal TongDuKien,
    decimal TongDangXuLy,
    decimal TongDaHoan,
    decimal TongCanXuLyLai,
    List<NghiaVuHoanResponse> NghiaVu
);

public record TiepTucHoanKetQua(int SoDaGui, int SoDaDoiChieu);
