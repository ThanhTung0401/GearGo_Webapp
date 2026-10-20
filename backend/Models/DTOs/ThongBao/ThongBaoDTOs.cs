namespace GearGo.Models.DTOs.ThongBao;

public record TimThongBaoRequest(
    bool? ChuaDoc = null,
    int Trang = 1,
    int SoMoiTrang = 20
);

public record ThongBaoResponse(
    long MaThongBao,
    long? MaDonThue,
    string? TieuDe,
    string? NoiDung,
    DateTime ThoiDiemTao,
    DateTime? ThoiDiemDoc
);

// ── Command nội bộ cho service nghiệp vụ khác gọi ──

public record GhiLichSuDonCommand(
    long MaDonThue,
    string TrangThaiTruoc,
    string TrangThaiSau,
    long? MaNguoiThucHien,
    string? LyDo
);

public record GhiLichSuThietBiCommand(
    long MaThietBi,
    long? MaNguoiThucHien,
    string? TrangThaiTruoc,
    string? TrangThaiSau,
    string? TinhTrangTruoc,
    string? TinhTrangSau,
    string? LyDo,
    string? ThamChieuChungTu
);

public record GhiNhatKyCommand(
    long? MaTaiKhoan,
    string HanhDong,
    string LoaiDoiTuong,
    string MaDoiTuong,
    object? DuLieuTruoc,
    object? DuLieuSau,
    string? LyDo
);

/// <summary>Sự kiện cần thông báo (SuKienWeek4Command). Người nhận mặc định là chủ đơn.</summary>
public record SuKienThongBaoCommand(
    long MaDonThue,
    string LoaiSuKien,
    string MaSuKien,
    string TieuDe,
    string? NoiDung,
    long? MaTaiKhoanNhan = null
);

/// <summary>Giá trị cột THONG_BAO.loai_su_kien.</summary>
public static class LoaiSuKienThongBao
{
    public const string SanSangNhan = "SanSangNhan";
    public const string NhanTra = "NhanTra";
    public const string NhacQuaHan = "NhacQuaHan";
    public const string PhuPhi = "PhuPhi";
    public const string TranhChapPhuPhi = "TranhChapPhuPhi";
    public const string ThanhToanBoSung = "ThanhToanBoSung";
    public const string HoanTien = "HoanTien";
    public const string HoanTat = "HoanTat";
    public const string HuyDon = "HuyDon";
    public const string KhongDenNhan = "KhongDenNhan";
}

/// <summary>
/// Mã sự kiện chống lặp theo đúng chứng từ/đợt/giao dịch/mốc nhắc. Chủ module dùng các hàm này
/// thay vì tự đặt chuỗi, để cùng một sự kiện chỉ có một thông báo còn sự kiện khác thì không bị bỏ qua.
/// </summary>
public static class MaSuKienThongBao
{
    public static string NhanTra(long maPhieuNhanTra) => $"NHAN_TRA:{maPhieuNhanTra}";
    public static string NhacQuaHan(long maDonThue, DateTime mocNhacUtc) => $"QUA_HAN:{maDonThue}:{mocNhacUtc:yyyyMMddHHmm}";
    public static string PhuPhi(long maPhuPhi, string trangThaiDuyet) => $"PHU_PHI:{maPhuPhi}:{trangThaiDuyet}";
    public static string TranhChap(long maPhuPhi, string trangThaiTranhChap) => $"TRANH_CHAP:{maPhuPhi}:{trangThaiTranhChap}";
    public static string ThanhToanBoSung(long maThanhToan) => $"THU_BO_SUNG:{maThanhToan}";
    public static string HoanTien(long maHoanTien, string trangThai) => $"HOAN_TIEN:{maHoanTien}:{trangThai}";
    public static string HoanTat(long maDonThue, long maDoiSoat) => $"HOAN_TAT:{maDonThue}:{maDoiSoat}";
    public static string HuyDon(long maDonThue, long maLichSuDon) => $"HUY_DON:{maDonThue}:{maLichSuDon}";
    public static string KhongDenNhan(long maDonThue, long maNhatKy) => $"KHONG_DEN_NHAN:{maDonThue}:{maNhatKy}";
    public static string MoiDanhGia(long maDonThue) => $"MOI_DANH_GIA:{maDonThue}";
    public static string SapHetHan(long maDonThue, DateTime mocNhacUtc) => $"SAP_HET_HAN:{maDonThue}:{mocNhacUtc:yyyyMMddHHmm}";
}

/// <summary>
/// Yêu cầu thử lại gửi thông báo từ Quản trị viên
/// </summary>
public record ThuLaiThongBaoRequest(
    string? LyDo
);

/// <summary>
/// DTO thông báo chi tiết cho Quản trị viên tra cứu danh sách gửi lỗi
/// </summary>
public record ThongBaoAdminResponse(
    long MaThongBao,
    long MaTaiKhoan,
    long? MaDonThue,
    string? MaSuKien,
    string? LoaiSuKien,
    string? TieuDe,
    string? NoiDung,
    string? KenhGui,
    string TrangThaiGui,
    int SoLanThuGui,
    DateTime ThoiDiemTao,
    DateTime? ThoiDiemGui,
    string? LoiGuiGanNhat
);

