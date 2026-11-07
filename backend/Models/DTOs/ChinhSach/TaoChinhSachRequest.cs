using System;
using System.ComponentModel.DataAnnotations;

namespace GearGo.Models.DTOs.ChinhSach;

/// <summary>
/// Yêu cầu tạo một phiên bản chính sách mới (W6-T1 - UC26).
/// Phiên bản / người tạo / giờ tạo do server tự sinh — không nhận từ client.
/// </summary>
public class TaoChinhSachRequest
{
    [Required(ErrorMessage = "Tên chính sách là bắt buộc.")]
    [MaxLength(255, ErrorMessage = "Tên chính sách tối đa 255 ký tự.")]
    public string TenChinhSach { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm chính sách bắt đầu có hiệu lực (giờ server, UTC).
    /// Không hồi tố về quá khứ ngoài kênh bootstrap có kiểm soát.
    /// </summary>
    [Required(ErrorMessage = "Thời điểm áp dụng là bắt buộc.")]
    public DateTime ThoiDiemApDung { get; set; }

    /// <summary>Nội dung chính sách theo cấu trúc; được validate theo đường dẫn khóa.</summary>
    [Required(ErrorMessage = "Nội dung chính sách là bắt buộc.")]
    public NoiDungChinhSachDto NoiDung { get; set; } = new();
}
