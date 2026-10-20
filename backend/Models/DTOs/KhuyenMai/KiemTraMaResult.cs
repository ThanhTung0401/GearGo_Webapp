using System.Collections.Generic;

namespace GearGo.Models.DTOs.KhuyenMai;

/// <summary>
/// Kết quả kiểm tra áp mã giảm giá và báo giá hiển thị (W6-T3)
/// </summary>
public class KiemTraMaResult
{
    public long MaKhuyenMai { get; set; }
    public string MaGiamGia { get; set; } = string.Empty;
    public string? TenKhuyenMai { get; set; }
    public bool HopLe { get; set; }
    public string? LyDoKhongHopLe { get; set; }

    /// <summary>
    /// Tổng tiền thuê trước giảm của toàn bộ giỏ/đơn (dùng xét ngưỡng TienThueToiThieu)
    /// </summary>
    public decimal TienThueXetNguong { get; set; }

    /// <summary>
    /// Tổng tiền thuê của các dòng sản phẩm nằm trong phạm vi áp dụng (E)
    /// </summary>
    public decimal TienThueDuPhamVi { get; set; }

    /// <summary>
    /// Tổng số tiền giảm giá thực tế sau khi áp trần và chặn không vượt E
    /// </summary>
    public decimal TongGiamGia { get; set; }

    /// <summary>
    /// Tổng tiền cọc (bảo đảm giữ nguyên 100%, không bị trừ vào tiền giảm)
    /// </summary>
    public decimal TongCoc { get; set; }

    /// <summary>
    /// Tổng số tiền thanh toán ban đầu = (TienThueXetNguong - TongGiamGia) + TongCoc
    /// </summary>
    public decimal TongThanhToanBanDau => (TienThueXetNguong - TongGiamGia) + TongCoc;

    /// <summary>
    /// Danh sách phân bổ chi tiết số tiền giảm xuống từng dòng
    /// </summary>
    public List<PhanBoDongResult> PhanBoCacDong { get; set; } = new();
}
