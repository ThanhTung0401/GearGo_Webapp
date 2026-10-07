namespace GearGo.Models.DTOs.ThanhToan;

public class YeuCauThuResponse
{
    public long MaThanhToan { get; set; }
    public string MaYeuCau { get; set; } = string.Empty;
    public decimal SoTien { get; set; }
    public string MucDich { get; set; } = string.Empty;
    public string TrangThai { get; set; } = string.Empty;
    public string? PaymentUrl { get; set; }
    public bool CanDoiChieu { get; set; }
}
