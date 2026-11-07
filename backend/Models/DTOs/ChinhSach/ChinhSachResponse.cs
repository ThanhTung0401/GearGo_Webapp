using System;

namespace GearGo.Models.DTOs.ChinhSach;

/// <summary>
/// Thông tin một phiên bản chính sách (W6-T1 - UC26).
/// Trạng thái hiệu lực được suy ra từ <see cref="ThoiDiemApDung"/> và bản kế tiếp,
/// không lưu cột trạng thái trong database.
/// </summary>
public class ChinhSachResponse
{
    public long MaChinhSach { get; set; }
    public int PhienBan { get; set; }
    public string? TenChinhSach { get; set; }
    public DateTime ThoiDiemApDung { get; set; }
    public DateTime NgayTao { get; set; }
    public long MaNguoiTao { get; set; }

    /// <summary>HienHanh | TuongLai | DaThayThe (suy ra tại thời điểm trả).</summary>
    public string HieuLuc { get; set; } = string.Empty;

    /// <summary>Nội dung đã parse (null khi JSON không hợp lệ).</summary>
    public NoiDungChinhSachDto? NoiDung { get; set; }

    /// <summary>Chuỗi JSON thô để truy vết nếu bản cũ đã lưu khác format.</summary>
    public string? NoiDungJsonGoc { get; set; }
}

public static class HieuLucChinhSach
{
    public const string HienHanh = "HienHanh";
    public const string TuongLai = "TuongLai";
    public const string DaThayThe = "DaThayThe";
}
