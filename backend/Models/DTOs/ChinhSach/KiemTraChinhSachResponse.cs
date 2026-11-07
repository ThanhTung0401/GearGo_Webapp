using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.ChinhSach;

/// <summary>
/// Kết quả xem trước/kiểm tra nội dung chính sách (W6-T1 - UC26).
/// Chỉ đọc, không tạo hàng trong CHINH_SACH.
/// </summary>
public class KiemTraChinhSachResponse
{
    public bool HopLe { get; set; }

    /// <summary>Danh sách lỗi theo đường dẫn khóa JSON (vd. huyDon.tyLeGiuLaiDuoi24Gio).</summary>
    public List<LoiDuongDan> LoiTheoDuongDan { get; set; } = new();

    /// <summary>Cảnh báo không chặn lưu (vd. trùng tên, thiếu mốc nhắc tùy chọn).</summary>
    public List<string> CanhBao { get; set; } = new();

    /// <summary>Phiên bản dự kiến sẽ được chọn tại mốc đã đưa vào preview.</summary>
    public PhienBanDuKien? BanDuKienDuocChon { get; set; }
}

public class LoiDuongDan
{
    public string DuongDan { get; set; } = string.Empty;
    public string ThongDiep { get; set; } = string.Empty;
}

public class PhienBanDuKien
{
    public long MaChinhSach { get; set; }
    public int PhienBan { get; set; }
    public DateTime ThoiDiemApDung { get; set; }
    public string? TenChinhSach { get; set; }
}
