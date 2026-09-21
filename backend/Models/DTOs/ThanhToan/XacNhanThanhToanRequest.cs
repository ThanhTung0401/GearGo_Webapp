namespace GearGo.Models.DTOs.ThanhToan;

public record XacNhanThanhToanRequest(
    long MaDonThue,
    string PhuongThucThanhToan,
    decimal SoTienDaTra,
    string MaGiaoDichDoiTac
);
