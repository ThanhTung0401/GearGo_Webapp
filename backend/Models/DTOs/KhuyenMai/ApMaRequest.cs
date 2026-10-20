using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.KhuyenMai;

/// <summary>
/// Yêu cầu áp mã giảm giá từ phía giỏ hàng / khách hàng (W6-T3)
/// </summary>
public class ApMaRequest
{
    [Required(ErrorMessage = "Mã giảm giá là bắt buộc.")]
    public string MaGiamGia { get; set; } = string.Empty;
}
