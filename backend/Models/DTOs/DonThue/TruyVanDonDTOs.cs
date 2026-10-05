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
    DateTime? ThoiDiemThanhCong
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
    List<string> ThaoTacKhaDung
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
