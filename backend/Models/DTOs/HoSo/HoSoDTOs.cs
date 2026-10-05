using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.HoSo;

/// <summary>Không nhận mã khách/vai trò/trạng thái: server lấy danh tính từ JWT.</summary>
public record CapNhatHoSoRequest(
    [Required, MaxLength(255)] string HoTen,
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MaxLength(20)] string SoDienThoai,
    string? DiaChi,
    DateOnly? NgaySinh,
    string? AnhDaiDien
);

public record HoSoResponse(
    long MaKhachHang,
    string? HoTen,
    string? Email,
    string? SoDienThoai,
    string? DiaChi,
    DateOnly? NgaySinh,
    string? AnhDaiDien
);
