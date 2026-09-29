namespace GearGo.Models.DTOs.BanGiao;

public record CapNhatPhieuBanGiaoRequest(
    string? TenNguoiNhanThucTe,
    DateTime ThoiDiemKhachXacNhan,
    string? BangChungXacNhan, // JSON chuỗi, VD: Link ảnh chữ ký
    string? GhiChu,
    List<CapNhatChiTietBanGiaoRequest> ChiTiet
);

public record CapNhatChiTietBanGiaoRequest(
    long MaPhanCong,
    string? TinhTrangTruocThue,
    string? PhuKienThucGiao, // JSON chuỗi, VD: ["Sạc", "Dây cáp"]
    string? DanhSachAnh, // JSON chuỗi, VD: ["url1", "url2"]
    string? GhiChu
);

public record ChotBanGiaoRequest(
    string TenNguoiNhanThucTe // Bắt buộc phải điền tên người nhận khi chốt
);

public record PhieuBanGiaoResponse(
    long MaPhieuBanGiao,
    long MaDonThue,
    long MaNhanVien,
    DateTime ThoiDiemLap,
    DateTime? ThoiDiemGiaoThucTe,
    string? TenNhanVienLucGiao,
    string? TenNguoiNhanThucTe,
    string TrangThai, // "ChoGiao", "DaGiao"
    List<ChiTietBanGiaoResponse> ChiTiet
);

public record ChiTietBanGiaoResponse(
    long MaChiTietBanGiao,
    long MaPhanCong,
    string? TinhTrangTruocThue,
    string? PhuKienThucGiao,
    string? DanhSachAnh
);
