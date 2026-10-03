using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.ChuanBiDon;

// ── REQUEST DTOs ──────────────────────────────────────────────────────────────

/// <summary>
/// Gán một hoặc nhiều thiết bị vào dòng đơn thuê (W3-T7)
/// </summary>
public class GanThietBiRequest
{
    /// <summary>Mã chi tiết dòng đơn thuê cần gán thiết bị</summary>
    public long DongDonId { get; set; }

    /// <summary>Danh sách mã thiết bị cần gán (phải unique trong request)</summary>
    public List<long> ThietBiIds { get; set; } = new();
}

/// <summary>
/// Thay thế một thiết bị đã phân công bằng thiết bị khác (W3-T7)
/// </summary>
public class ThayTheRequest
{
    /// <summary>Mã thiết bị mới muốn thay vào</summary>
    public long ThietBiMoiId { get; set; }

    /// <summary>Lý do thay thế (bắt buộc)</summary>
    public string LyDo { get; set; } = string.Empty;
}

/// <summary>
/// Hủy một phân công thiết bị (W3-T7)
/// </summary>
public class HuyPhanCongRequest
{
    /// <summary>Lý do hủy phân công (bắt buộc)</summary>
    public string LyDo { get; set; } = string.Empty;
}

/// <summary>
/// Xác nhận đơn sẵn sàng bàn giao cho khách (W3-T7)
/// </summary>
public class XacNhanSanSangRequest
{
    /// <summary>Ghi chú kiểm tra cuối trước khi xác nhận sẵn sàng</summary>
    public string? GhiChu { get; set; }
}

// ── RESPONSE DTOs ─────────────────────────────────────────────────────────────

/// <summary>
/// Thông tin tình trạng chuẩn bị của một dòng đơn thuê
/// </summary>
public class DongChuanBiResponse
{
    public long MaChiTietDon { get; set; }
    public long MaSanPham { get; set; }
    public string TenSanPham { get; set; } = string.Empty;
    public int SoLuongCanGan { get; set; }
    public int SoLuongDaGan { get; set; }
    public int SoLuongConThieu { get; set; }
    public List<PhanCongChiTietResponse> DanhSachPhanCong { get; set; } = new();
}

/// <summary>
/// Chi tiết một bản ghi phân công thiết bị
/// </summary>
public class PhanCongChiTietResponse
{
    public long MaPhanCong { get; set; }
    public long MaThietBi { get; set; }
    public string MaThietBiHienThi { get; set; } = string.Empty;
    public string TrangThaiThietBi { get; set; } = string.Empty;
    public string TrangThaiPhanCong { get; set; } = string.Empty;
    public DateTime ThoiDiemGan { get; set; }
    public string? NguoiGan { get; set; }
}

/// <summary>
/// Kết quả tổng hợp tình trạng chuẩn bị toàn bộ đơn (W3-T7)
/// </summary>
public class ChuanBiResponse
{
    public long MaDonThue { get; set; }
    public string TrangThaiDon { get; set; } = string.Empty;
    public bool DuDieuKienSanSang { get; set; }
    public List<DongChuanBiResponse> DanhSachDong { get; set; } = new();
    public List<string> LyDoChuaDuDieuKien { get; set; } = new();
}
