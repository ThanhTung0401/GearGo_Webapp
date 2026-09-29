namespace GearGo.Models.DTOs.DonThue;

public record TaoDonThueRequest(
    long MaKhachHang,
    DateTime GioNhanDuKien,
    DateTime GioTraDuKien,
    string TenNguoiNhan,
    string SoDienThoaiNguoiNhan,
    string EmailLienHe,
    string? GhiChu,
    List<ChiTietDonThueDto> ChiTiet
);

public record ChiTietDonThueDto(
    long MaSanPham,
    int SoLuong
);
