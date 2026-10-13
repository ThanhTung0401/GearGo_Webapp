using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GearGo.Exceptions;
using GearGo.Models.Enums;

namespace GearGo.Helpers;

/// <summary>
/// Phần hủy/không đến nhận trong CHINH_SACH.noi_dung_chinh_sach (JSON, khóa không phân biệt hoa thường):
/// <code>
/// {
///   "huyDon":       { "tyLeGiuLaiTu24Den48Gio": 0.5, "tyLeGiuLaiDuoi24Gio": 1.0 },
///   "khongDenNhan": { "soPhutChoSauGioNhan": 120, "tyLeGiuLaiTienThue": 1.0 }
/// }
/// </code>
/// Tỷ lệ là phần của tiền thuê sau giảm đã thu (0..1). Mốc 24/48 giờ theo đặc tả, không cấu hình.
/// Thiếu khóa → null; code không tự đặt tỷ lệ mặc định.
/// </summary>
public sealed record ChinhSachHuy(
    decimal? TyLeGiuLaiTu24Den48Gio,
    decimal? TyLeGiuLaiDuoi24Gio,
    int? SoPhutChoKhongDenNhan,
    decimal? TyLeGiuLaiKhongDenNhan)
{
    public static ChinhSachHuy Doc(string? json, long maChinhSach)
    {
        if (string.IsNullOrWhiteSpace(json)) return new ChinhSachHuy(null, null, null, null);
        JsonElement root;
        try { root = JsonDocument.Parse(json).RootElement; }
        catch (JsonException)
        {
            throw new ChinhSachHuyChuaDuException("Nội dung chính sách của đơn không phải JSON hợp lệ.", new { maChinhSach });
        }
        if (root.ValueKind != JsonValueKind.Object) return new ChinhSachHuy(null, null, null, null);

        var huy = Con(root, "huyDon");
        var kdn = Con(root, "khongDenNhan");
        return new ChinhSachHuy(
            TyLe(huy, "tyLeGiuLaiTu24Den48Gio", maChinhSach),
            TyLe(huy, "tyLeGiuLaiDuoi24Gio", maChinhSach),
            SoNguyen(kdn, "soPhutChoSauGioNhan", maChinhSach),
            TyLe(kdn, "tyLeGiuLaiTienThue", maChinhSach));
    }

    private static JsonElement? Con(JsonElement obj, string ten)
    {
        foreach (var p in obj.EnumerateObject())
            if (string.Equals(p.Name, ten, StringComparison.OrdinalIgnoreCase) && p.Value.ValueKind == JsonValueKind.Object)
                return p.Value;
        return null;
    }

    private static JsonElement? Gia(JsonElement? obj, string ten)
    {
        if (obj is not { } o) return null;
        foreach (var p in o.EnumerateObject())
            if (string.Equals(p.Name, ten, StringComparison.OrdinalIgnoreCase) && p.Value.ValueKind != JsonValueKind.Null)
                return p.Value;
        return null;
    }

    private static decimal? TyLe(JsonElement? obj, string ten, long maChinhSach)
    {
        if (Gia(obj, ten) is not { } v) return null;
        if (v.ValueKind != JsonValueKind.Number || !v.TryGetDecimal(out var d) || d < 0 || d > 1)
            throw new ChinhSachHuyChuaDuException($"Giá trị '{ten}' trong chính sách phải là số từ 0 đến 1.", new { maChinhSach, khoa = ten });
        return d;
    }

    private static int? SoNguyen(JsonElement? obj, string ten, long maChinhSach)
    {
        if (Gia(obj, ten) is not { } v) return null;
        if (v.ValueKind != JsonValueKind.Number || !v.TryGetInt32(out var i) || i < 0)
            throw new ChinhSachHuyChuaDuException($"Giá trị '{ten}' trong chính sách phải là số nguyên không âm.", new { maChinhSach, khoa = ten });
        return i;
    }
}

public static class NhanhChinhSachHuy
{
    public const string ChuaThanhToan = "ChuaThanhToan";
    public const string Tren48Gio = "Tren48Gio";
    public const string Tu24Den48Gio = "Tu24Den48Gio";
    public const string Duoi24Gio = "Duoi24Gio";
    public const string CuaHangHuy = "CuaHangHuy";
    public const string KhongDenNhan = "KhongDenNhan";
}

/// <summary>Đầu vào bảng tính hủy: tiền thực thu đã phân loại và số dự kiến của đơn.</summary>
public sealed record DauVaoBangHuy(
    long MaDonThue,
    string TrangThaiDon,
    string LoaiHuy,
    DateTime GioNhanDuKien,
    DateTime Now,
    bool DaThanhToan,
    decimal TienThueDaThu,
    decimal TienCocDaThu,
    decimal TienThueSauGiamDuKien,  // 0 = đơn chưa lưu tổng, không giới hạn theo dự kiến
    decimal TienCocDuKien,          // 0 = như trên
    ChinhSachHuy ChinhSach,
    long MaChinhSach);

public sealed record BangHuy(
    string Nhanh,
    decimal? TyLe,
    double SoGioTruocNhan,
    decimal TienThueGiuLai,
    decimal TienThueHoan,
    decimal TienCocHoan,
    decimal TienThuVuot,
    string DauVanTay)
{
    public decimal TongHoan => TienThueHoan + TienCocHoan;
    public bool CoTien => TienThueGiuLai > 0 || TongHoan > 0;
}

/// <summary>
/// Bảng tính hủy thuần (không I/O) để kiểm thử đủ ranh giới:
/// trên 48 giờ → giữ 0; từ 24 đến 48 giờ gồm cả hai mốc → tyLeGiuLaiTu24Den48Gio; dưới 24 giờ → tyLeGiuLaiDuoi24Gio;
/// cửa hàng hủy → giữ 0; không đến nhận → tyLeGiuLaiTienThue của khongDenNhan. Cọc trước bàn giao hoàn đủ.
/// </summary>
public static class BangTinhHuy
{
    public static BangHuy Tinh(DauVaoBangHuy v)
    {
        var conLai = v.GioNhanDuKien - v.Now;
        var soGio = Math.Round(conLai.TotalHours, 2);

        // Chỉ phần đúng nghĩa vụ của đơn mới vào bảng hủy; phần thu vượt đi luồng thu thừa (W4-T8).
        var thueHopLe = v.TienThueSauGiamDuKien > 0 ? Math.Min(v.TienThueDaThu, v.TienThueSauGiamDuKien) : v.TienThueDaThu;
        var cocHopLe = v.TienCocDuKien > 0 ? Math.Min(v.TienCocDaThu, v.TienCocDuKien) : v.TienCocDaThu;
        var vuot = (v.TienThueDaThu - thueHopLe) + (v.TienCocDaThu - cocHopLe);

        string nhanh;
        decimal? tyLe;
        if (!v.DaThanhToan)
        {
            nhanh = NhanhChinhSachHuy.ChuaThanhToan;
            tyLe = 0;
        }
        else if (v.LoaiHuy == LoaiHuyDon.CuaHangHuy)
        {
            nhanh = NhanhChinhSachHuy.CuaHangHuy;
            tyLe = 0;
        }
        else if (v.LoaiHuy == LoaiHuyDon.KhongDenNhan)
        {
            nhanh = NhanhChinhSachHuy.KhongDenNhan;
            tyLe = v.ChinhSach.TyLeGiuLaiKhongDenNhan
                   ?? throw new ChinhSachHuyChuaDuException("Chính sách của đơn chưa quy định mức xử lý khách không đến nhận.",
                       new { v.MaChinhSach, khoa = "khongDenNhan.tyLeGiuLaiTienThue" });
        }
        else if (conLai > TimeSpan.FromHours(48))
        {
            nhanh = NhanhChinhSachHuy.Tren48Gio;
            tyLe = 0;
        }
        else if (conLai >= TimeSpan.FromHours(24))
        {
            nhanh = NhanhChinhSachHuy.Tu24Den48Gio;
            tyLe = v.ChinhSach.TyLeGiuLaiTu24Den48Gio
                   ?? throw new ChinhSachHuyChuaDuException("Chính sách của đơn chưa có tỷ lệ giữ lại khi hủy 24–48 giờ trước nhận.",
                       new { v.MaChinhSach, khoa = "huyDon.tyLeGiuLaiTu24Den48Gio" });
        }
        else
        {
            nhanh = NhanhChinhSachHuy.Duoi24Gio;
            tyLe = v.ChinhSach.TyLeGiuLaiDuoi24Gio
                   ?? throw new ChinhSachHuyChuaDuException("Chính sách của đơn chưa có mức giữ lại khi hủy dưới 24 giờ trước nhận.",
                       new { v.MaChinhSach, khoa = "huyDon.tyLeGiuLaiDuoi24Gio" });
        }

        var giuLai = TienTe.LamTronVnd(thueHopLe * tyLe.Value);
        var thueHoan = thueHopLe - giuLai;
        var dau = DauVanTay(v.MaDonThue, v.TrangThaiDon, v.LoaiHuy, nhanh, giuLai, thueHoan, cocHopLe, v.TienThueDaThu, v.TienCocDaThu);
        return new BangHuy(nhanh, v.DaThanhToan ? tyLe : null, soGio, giuLai, thueHoan, cocHopLe, vuot, dau);
    }

    /// <summary>Dấu stateless của bảng (không chứa thời điểm): cùng nhánh + cùng số tiền → cùng dấu.</summary>
    public static string DauVanTay(long maDon, string trangThai, string loaiHuy, string nhanh,
        decimal giuLai, decimal thueHoan, decimal cocHoan, decimal thueDaThu, decimal cocDaThu)
    {
        var s = $"{maDon}|{trangThai}|{loaiHuy}|{nhanh}|{giuLai:0}|{thueHoan:0}|{cocHoan:0}|{thueDaThu:0}|{cocDaThu:0}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(s)))[..16].ToLowerInvariant();
    }
}
