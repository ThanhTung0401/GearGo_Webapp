using System;

namespace GearGo.Models.DTOs.ThanhToan;

/// <summary>
/// DTO callback webhook từ cổng thanh toán (W4-T5, W4-T8)
/// </summary>
public class XuLyCallbackRequest
{
    public string MaYeuCau { get; set; } = string.Empty;
    public string? MaGiaoDichCong { get; set; }
    public decimal SoTien { get; set; }
    public string TrangThai { get; set; } = "ThanhCong"; // ThanhCong, ThatBai
    public string? PhuongThuc { get; set; }
    public string? Signature { get; set; }
}

/// <summary>
/// DTO danh sách giao dịch cần đối chiếu ngoại lệ (W4-T8)
/// </summary>
public class GiaoDichCanDoiChieuResponse
{
    public long MaThanhToan { get; set; }
    public string MaYeuCau { get; set; } = string.Empty;
    public long MaDonThue { get; set; }
    public decimal TongSoTien { get; set; }
    public string PhuongThuc { get; set; } = string.Empty;
    public string TrangThai { get; set; } = string.Empty;
    public string? TrangThaiDoiChieu { get; set; }
    public string? LyDoCanDoiChieu { get; set; }
    public DateTime ThoiDiemTao { get; set; }
}

/// <summary>
/// DTO yêu cầu quản trị viên xử lý đối chiếu giao dịch ngoại lệ (W4-T8)
/// </summary>
public class DoiChieuGiaoDichRequest
{
    /// <summary>
    /// Kết luận đối chiếu: "HopLe_XacNhan", "HopLe_HoanTienThua", "TuChoi"
    /// </summary>
    public string KetLuan { get; set; } = string.Empty;
    public string GhiChu { get; set; } = string.Empty;
    public decimal? SoTienHoan { get; set; }
}
