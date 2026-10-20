namespace GearGo.Models.DTOs.DonThue;

public record TaoDonThueRequest
{
    public long MaKhachHang { get; set; }
    public long? MaTaiKhoan { get; set; }
    public DateTime GioNhanDuKien { get; init; }
    public DateTime GioTraDuKien { get; init; }
    public string TenNguoiNhan { get; init; } = string.Empty;
    public string SoDienThoaiNguoiNhan { get; init; } = string.Empty;
    public string EmailLienHe { get; init; } = string.Empty;
    public string? GhiChu { get; init; }
    public string? DiaChiNhanHang { get; init; }
    public string? MaKhuyenMai { get; init; }
    public List<ChiTietDonThueDto> ChiTiet { get; init; } = new();
}

public record ChiTietDonThueDto(
    long MaSanPham,
    int SoLuong
);
