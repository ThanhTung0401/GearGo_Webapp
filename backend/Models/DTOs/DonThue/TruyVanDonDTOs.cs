using GearGo.Models.DTOs.BanGiao;

namespace GearGo.Models.DTOs.DonThue;

public record TimDonRequest(
    string? MaDon = null,
    DateTime? TuNgay = null,
    DateTime? DenNgay = null,
    string? TrangThai = null,
    int Trang = 1,
    int SoMoiTrang = 20
);

/// <summary>Bộ lọc dành cho nhân viên: thêm từ khóa người nhận/khách và nhóm việc cần xử lý.</summary>
public record TimDonVanHanhRequest(
    string? MaDon = null,
    string? TuKhoa = null,          // tên/SĐT người nhận hoặc khách
    DateTime? TuNgay = null,
    DateTime? DenNgay = null,
    string? TrangThai = null,
    bool? CanChuanBi = null,        // DaXacNhan, DangChuanBi
    bool? CanGiao = null,           // SanSangNhan
    int Trang = 1,
    int SoMoiTrang = 20
);

public record DonTomTatResponse(
    long MaDonThue,
    string MaDonHienThi,
    DateTime NgayDat,
    DateTime GioNhanDuKien,
    DateTime GioTraDuKien,
    string TrangThai,
    decimal TongTienThueTruocGiam,
    decimal TongTienGiam,
    decimal TongTienCoc,
    int SoDong
);

public record DonVanHanhTomTatResponse(
    long MaDonThue,
    string MaDonHienThi,
    long MaKhachHang,
    string? TenKhachHang,
    string? TenNguoiNhan,
    string? SoDienThoaiNguoiNhan,
    DateTime NgayDat,
    DateTime GioNhanDuKien,
    DateTime GioTraDuKien,
    string TrangThai,
    int SoDong,
    int SoThietBiCanPhanCong,
    int SoThietBiDaPhanCong
);

public record DongThueResponse(
    long MaChiTietDon,
    long MaSanPham,
    string? TenSanPham,
    int SoLuong,
    int SoNgayTinhTien,
    decimal DonGiaThueMoiNgay,
    decimal TienGiam,
    decimal MucCocMoiThietBi,
    decimal ThanhTienThue
);

public record ThanhToanDonResponse(
    long MaThanhToan,
    string? PhuongThuc,
    string TrangThai,
    decimal TongSoTien,
    DateTime? ThoiDiemThanhCong
);

public record SuKienDonResponse(
    DateTime ThoiDiem,
    string TrangThaiTruoc,
    string TrangThaiSau,
    string? LyDo
);

public record PhieuNhanTraTomTatResponse(
    long MaPhieuNhanTra,
    string MaPhieuHienThi,
    int LanTra,
    string TrangThai,
    DateTime? ThoiDiemChot
);

public record PhuPhiKhachResponse(
    long MaPhuPhi,
    string LoaiPhi,
    decimal SoTien,
    string? LyDo,
    string TrangThaiDuyet
);

public record HoanTienKhachResponse(
    long MaHoanTien,
    string? LoaiHoan,
    decimal SoTien,
    string TrangThai,
    DateTime? ThoiDiemThanhCong,
    string NhanHienThi = ""             // DuKien | DangXuLy | ChuaRoKetQua | DaHoan | CanXuLyLai | DaThayThe
);

/// <summary>
/// DTO cho khách: không có giá nhập, ghi chú quản trị, bằng chứng nội bộ.
/// Các phần nhận trả/phụ phí/hoàn tiền là mảng rỗng khi chưa phát sinh.
/// </summary>
public record DonChiTietResponse(
    long MaDonThue,
    string MaDonHienThi,
    string TrangThai,
    DateTime NgayDat,
    DateTime GioNhanDuKien,
    DateTime GioTraDuKien,
    DateTime? HanThanhToan,
    string? TenNguoiNhan,
    string? SoDienThoaiNguoiNhan,
    string? EmailLienHe,
    decimal TongTienThueTruocGiam,
    decimal TongTienGiam,
    decimal TongTienCoc,
    decimal TienDaThu,
    List<DongThueResponse> Dong,
    List<ThanhToanDonResponse> ThanhToan,
    List<SuKienDonResponse> LichSu,
    List<PhieuBanGiaoKhachResponse> BanGiao,
    List<PhieuNhanTraTomTatResponse> NhanTra,
    List<PhuPhiKhachResponse> PhuPhi,
    List<HoanTienKhachResponse> HoanTien,
    List<string> ThaoTacKhaDung,
    DonTaiChinhResponse TaiChinh
);

public record PhieuBanGiaoKhachResponse(
    long MaPhieuBanGiao,
    string TrangThai,
    DateTime? ThoiDiemGiaoThucTe,
    string? TenNhanVienLucGiao,
    string? TenNguoiNhanThucTe,
    List<ChiTietBanGiaoKhachResponse> ChiTiet
);

public record ChiTietBanGiaoKhachResponse(
    long MaChiTietBanGiao,
    string? MaThietBiHienThi,
    string? TenSanPham,
    string? TinhTrangTruocThue,
    string? PhuKienThucGiao,
    string? DanhSachAnh
);

/// <summary>Chi tiết cho nhân viên: thêm thông tin khách, ghi chú và phân công thiết bị.</summary>
public record DonVanHanhChiTietResponse(
    DonChiTietResponse Don,
    long MaKhachHang,
    string? TenKhachHang,
    string? GhiChu,
    List<PhanCongVanHanhResponse> PhanCong,
    List<string> ViecCanXuLy
);

public record PhanCongVanHanhResponse(
    long MaPhanCong,
    long MaChiTietDon,
    long MaThietBi,
    string? MaThietBiHienThi,
    string TrangThai
);

// ───────────── W4-T9: tiến độ nhận trả và tài chính của đơn (DonTaiChinhResponse) ─────────────
// Mỗi tập con được đọc bằng truy vấn riêng rồi cộng phía ứng dụng, không JOIN nhiều tập (tránh nhân số tiền).
// Số đề nghị / đã duyệt / đã thu / đã hoàn luôn tách riêng; "cần hoàn" trong đối soát KHÔNG có nghĩa là đã hoàn.

public record DonTaiChinhResponse(
    TienDoNhanTraResponse NhanTra,
    PhuPhiTongHopResponse PhuPhi,
    List<DoiSoatDonResponse> DoiSoat,
    ThuTienTongHopResponse Thu,
    HoanTienTongHopResponse Hoan,
    HuyDonTomTatResponse? Huy,
    DateTime? ThoiDiemHoanTat,          // mốc hoàn tất gốc; phiếu điều chỉnh sau đó không đổi mốc này
    bool CoDieuChinhSauHoanTat,
    List<string> Nhan                   // TraMotPhan | QuaHan | DangXuLyMat | ChoHoanTien | CanThuBoSung | CoTranhChap
);

public record TienDoNhanTraResponse(
    int TongThietBiDaGiao,
    int SoDaTra,
    int SoDaKetLuanMat,
    int SoDangXuLyMat,
    int SoConNo,
    List<DotTraResponse> CacDot,
    List<ThietBiConNoResponse> ThietBiConNo
);

public record DotTraResponse(
    long MaPhieuNhanTra,
    string MaPhieuHienThi,
    int LanTra,
    bool LaLanTraCuoi,
    DateTime? ThoiDiemChot,
    int SoThietBiTra,
    int SoThietBiMat
);

public record ThietBiConNoResponse(
    long MaChiTietBanGiao,
    string? MaThietBiHienThi,
    string? TenSanPham,
    bool DangXuLyMat
);

public record PhuPhiTongHopResponse(
    decimal TongDeNghi,                 // chờ duyệt — chỉ nhân viên thấy
    decimal TongDaDuyet,
    decimal TongDangTranhChap,
    decimal TongTuChoi,
    int SoTranhChapDangMo,
    List<PhuPhiDonResponse> Items
);

public record PhuPhiDonResponse(
    long MaPhuPhi,
    string LoaiPhi,
    decimal SoTien,
    string? LyDo,
    string TrangThaiDuyet,
    string? TrangThaiTranhChap,
    string? KetQuaGiaiQuyet,
    long? MaPhuPhiGoc,
    long? MaDoiSoat,
    bool LaDieuChinh
);

public record DoiSoatDonResponse(
    long MaDoiSoat,
    long? MaDoiSoatGoc,
    bool LaDieuChinh,
    string LoaiDoiSoat,
    decimal TienCocDuocDoiSoat,
    decimal TongPhuPhiDuocDuyet,
    decimal SoTienCanHoan,
    decimal SoTienCanThuThem,
    string TrangThai,
    DateTime ThoiDiemLap,
    DateTime? ThoiDiemChot,
    string? LyDoDieuChinh
);

public record ThuTienTongHopResponse(
    decimal TienThueDaThu,
    decimal TienCocDaThu,
    decimal ThuBoSungDaThu,
    decimal ChuaPhanLoai,               // thu thành công nhưng chưa tách mục đích — cần đối chiếu
    decimal DangXuLy                    // giao dịch thu chưa có kết quả cuối
);

public record HoanTienTongHopResponse(
    decimal DuKien,
    decimal DangXuLy,
    decimal DaHoan,
    decimal CanXuLyLai,
    List<HoanTienKhachResponse> Items
);

public record HuyDonTomTatResponse(
    string LoaiHuy,
    DateTime? ThoiDiemHuy,
    string? LyDo,
    decimal TienThueGiuLai
);
