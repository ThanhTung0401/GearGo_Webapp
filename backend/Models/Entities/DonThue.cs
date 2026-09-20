using GearGo.Models.Enums;

namespace GearGo.Models.Entities;

public class DonThue
{
    public long MaDonThue { get; set; }

    public long MaKhachHang { get; set; }
    public long MaChinhSach { get; set; }
    public long? MaNguoiHuy { get; set; }

    public string MaDonHienThi { get; set; } = string.Empty;
    public DateTime NgayDat { get; set; }
    public DateTime GioNhanDuKien { get; set; }
    public DateTime GioTraDuKien { get; set; }
    public DateTime HanThanhToan { get; set; }

    public string TenNguoiNhan { get; set; } = string.Empty;
    public string SoDienThoaiNguoiNhan { get; set; } = string.Empty;
    public string EmailLienHe { get; set; } = string.Empty;

    public decimal TongTienThueTruocGiam { get; set; }
    public decimal TongTienGiam { get; set; }
    public decimal TongTienCoc { get; set; }

    // JSON string
    public string KhuyenMaiLucDat { get; set; } = string.Empty;

    public TrangThaiDonThue TrangThai { get; set; }

    public DateTime? ThoiDiemHuy { get; set; }
    public string? LyDoHuy { get; set; }
    public decimal TienThueGiuLaiKhiHuy { get; set; }
    public DateTime? ThoiDiemHoanTat { get; set; }
    public string? GhiChu { get; set; }

    // ─── NAVIGATION PROPERTIES ───
    // @ManyToOne
    public KhachHang KhachHang { get; set; } = null!;
    public ChinhSach ChinhSach { get; set; } = null!;
    public TaiKhoan? NguoiHuy { get; set; }

    // @OneToOne
    public LuotSuDungKhuyenMai? LuotSuDungKhuyenMai { get; set; }
}
