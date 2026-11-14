using System.Globalization;
using System.Text;

namespace GearGo.Helpers;

/// <summary>
/// Khoảng ngày đã quy đổi sang UTC phục vụ truy vấn báo cáo theo múi giờ Việt Nam (UTC+7).
/// </summary>
public sealed record KhoangNgayBaoCao(DateTime TuNgay, DateTime DenNgay, DateTime TuUtc, DateTime DenUtc);

/// <summary>
/// Helper dùng chung cho các service báo cáo: xử lý khoảng ngày UTC+7, phân trang và xuất CSV an toàn.
/// </summary>
public static class BaoCaoCsvHelper
{
    public static readonly TimeSpan LechGioVn = TimeSpan.FromHours(7);

    /// <summary>Tính khoảng ngày theo UTC+7 và kiểm tra giới hạn số ngày tối đa.</summary>
    public static (KhoangNgayBaoCao? Khoang, string? Loi) TinhKhoangNgay(
        DateTime? tuNgay,
        DateTime? denNgay,
        DateTime utcNow,
        int soNgayToiDa)
    {
        var homNayVn = (utcNow + LechGioVn).Date;
        var den = (denNgay ?? homNayVn).Date;
        var tu = tuNgay.HasValue
            ? tuNgay.Value.Date
            : den.AddDays(-(DomainConstants.Policies.DefaultReportDays - 1));

        if (tu > den)
            return (null, "Từ ngày phải nhỏ hơn hoặc bằng đến ngày.");

        if ((den - tu).Days + 1 > soNgayToiDa)
            return (null, $"Khoảng ngày vượt quá {soNgayToiDa} ngày. Vui lòng thu hẹp bộ lọc.");

        var tuUtc = DateTime.SpecifyKind(tu - LechGioVn, DateTimeKind.Utc);
        var denUtc = DateTime.SpecifyKind(den.AddDays(1) - LechGioVn, DateTimeKind.Utc);
        return (new KhoangNgayBaoCao(tu, den, tuUtc, denUtc), null);
    }

    /// <summary>Chuẩn hóa tham số phân trang về giới hạn hợp lệ.</summary>
    public static (int Trang, int SoMoiTrang) ChuanHoaPhanTrang(int trang, int soMoiTrang)
    {
        int size = soMoiTrang <= 0
            ? DomainConstants.Policies.DefaultPageSize
            : Math.Min(soMoiTrang, DomainConstants.Policies.MaxPageSize);
        return (Math.Max(1, trang), size);
    }

    /// <summary>Chuyển thời điểm UTC sang chuỗi giờ Việt Nam (UTC+7).</summary>
    public static string? DinhDangGioVn(DateTime? utc) =>
        utc.HasValue
            ? (utc.Value + LechGioVn).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
            : null;

    /// <summary>Dựng file CSV UTF-8 có BOM, chống CSV/formula injection.</summary>
    public static byte[] DungCsv(IReadOnlyList<string> tieuDe, IReadOnlyList<List<object?>> dong)
    {
        var sb = new StringBuilder();
        sb.Append(string.Join(",", tieuDe.Select(EscapeText)));
        foreach (var r in dong)
        {
            sb.Append("\r\n");
            sb.Append(string.Join(",", r.Select(FormatCell)));
        }

        var utf8Bom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        return utf8Bom.GetPreamble().Concat(utf8Bom.GetBytes(sb.ToString())).ToArray();
    }

    /// <summary>Định dạng giá trị ô: giữ nguyên kiểu số, chỉ vô hiệu hóa công thức ở ô văn bản.</summary>
    private static string FormatCell(object? value) => value switch
    {
        null => string.Empty,
        string s => EscapeText(s),
        decimal d => d.ToString("0.##", CultureInfo.InvariantCulture),
        double d => d.ToString("0.##", CultureInfo.InvariantCulture),
        int i => i.ToString(CultureInfo.InvariantCulture),
        long l => l.ToString(CultureInfo.InvariantCulture),
        bool b => b ? "true" : "false",
        _ => EscapeText(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty)
    };

    /// <summary>Chống CSV/formula injection (=, +, -, @, tab, CR đứng đầu) và bọc ngoặc kép chuẩn RFC 4180.</summary>
    private static string EscapeText(string s)
    {
        if (s.Length > 0 && "=+-@\t\r".Contains(s[0]))
            s = "'" + s;
        return "\"" + s.Replace("\"", "\"\"") + "\"";
    }
}
