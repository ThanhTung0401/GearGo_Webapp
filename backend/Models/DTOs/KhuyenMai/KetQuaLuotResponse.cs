using System;

namespace GearGo.Models.DTOs.KhuyenMai;

/// <summary>
/// Lệnh giữ lượt khuyến mãi nội bộ trong transaction tạo đơn thuê (W6-T3)
/// </summary>
public class GiuLuotCommand
{
    public long MaKhuyenMai { get; set; }
    public long MaDonThue { get; set; }
    public long MaKhachHang { get; set; }
    public DateTime ThoiDiemHetHan { get; set; }
    public decimal SoTienGiamSnapshot { get; set; }
}

/// <summary>
/// Kết quả thao tác giữ/xác nhận/giải phóng lượt sử dụng (W6-T3)
/// </summary>
public class KetQuaLuotResponse
{
    public long MaLuotSuDung { get; set; }
    public long MaKhuyenMai { get; set; }
    public long MaDonThue { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public DateTime ThoiDiemHetHan { get; set; }
    public DateTime? ThoiDiemSuDung { get; set; }
    public decimal SoTienGiamSnapshot { get; set; }
}
