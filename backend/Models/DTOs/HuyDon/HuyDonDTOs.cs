using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.HoanTien;

namespace GearGo.Models.DTOs.HuyDon;

/// <summary>
/// Bảng chi phí hủy tính tại <see cref="ThoiDiemTinh"/> (giờ server) theo chính sách gắn với đơn và tiền thực thu hợp lệ.
/// Chỉ là dự kiến: không hứa đã hoàn. <see cref="DauVanTay"/> gửi lại khi xác nhận để phát hiện bảng đã đổi.
/// </summary>
public record XemTruocHuyResponse(
    long MaDonThue,
    string TrangThaiDon,
    string LoaiHuy,
    bool CoTheHuy,
    string? LyDoKhongTheHuy,
    DateTime ThoiDiemTinh,
    DateTime GioNhanDuKien,
    double SoGioTruocNhan,
    string NhanhChinhSach,      // ChuaThanhToan | Tren48Gio | Tu24Den48Gio | Duoi24Gio | CuaHangHuy | KhongDenNhan
    long MaChinhSach,
    decimal? TyLeGiuLaiTienThue,
    decimal TienThueDaThu,
    decimal TienCocDaThu,
    decimal TienThueGiuLai,
    decimal TienThueHoan,
    decimal TienCocHoan,
    decimal TongHoan,
    decimal TienThuVuotChuaXuLy,
    string DauVanTay,
    List<string> CanhBao
);

/// <param name="LyDo">Bắt buộc, tối đa 1000 ký tự.</param>
/// <param name="XacNhanChiPhi">Phải true khi bảng có tiền giữ lại/hoàn.</param>
/// <param name="DauVanTayXemTruoc">Dấu của bảng xem trước khách đã đồng ý; khác bảng tính lại → 409.</param>
public record HuyDonRequest(string LyDo, bool XacNhanChiPhi = false, string? DauVanTayXemTruoc = null);

/// <summary>
/// Nhân viên ghi nhận khách không đến nhận. Quản trị viên gửi thêm <see cref="XuLyHuy"/>=true để hủy
/// theo chính sách không đến nhận đã công bố (cần xác nhận bảng như hủy thường).
/// </summary>
public record KhongDenNhanRequest(
    string GhiChu,
    string? BangChung = null,
    bool XuLyHuy = false,
    bool XacNhanChiPhi = false,
    string? DauVanTayXemTruoc = null
);

public record HuyDonResponse(
    long MaDonThue,
    string TrangThai,
    string LoaiHuy,
    DateTime? ThoiDiemHuy,
    string? LyDo,
    decimal TienThueGiuLai,
    List<HoanTienResponse> YeuCauHoan,
    decimal TongHoanDangCho,
    decimal TongDaHoan,
    int SoKhoanChoXuLy,
    List<SuKienDonResponse> LichSu
);

public record KhongDenNhanResponse(
    long MaDonThue,
    string TrangThaiDon,
    bool DaGhiNhan,
    bool DaHuy,
    bool CoChinhSachKhongDenNhan,
    string HuongXuLy,
    XemTruocHuyResponse? BangTinhNeuHuy,
    HuyDonResponse? KetQuaHuy
);
