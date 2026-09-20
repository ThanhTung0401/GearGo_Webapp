namespace GearGo.Models.DTOs;

public record DonThueResponse(
    long MaDonThue,
    string MaDonHienThi,
    decimal TongTienThueTruocGiam,
    decimal TongTienCoc,
    string TrangThai,
    DateTime HanThanhToan
);
