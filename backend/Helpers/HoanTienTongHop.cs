using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.Enums;

namespace GearGo.Helpers;

/// <summary>
/// Quy ước mã yêu cầu hoàn và cách cộng tiền hoàn theo trạng thái.
/// Mã: "HT:{khoaNghiaVu}:{maChiTietThanhToanGoc}:L{lanThu}". Một nghĩa vụ có thể chia nhiều nguồn;
/// mỗi nguồn có thể có nhiều lần thử, chỉ lần thử mới nhất được tính (lần cũ ThatBai đã được thay thế).
/// </summary>
public static class HoanTienTongHop
{
    public const string TienTo = "HT:";

    public record Dong(long MaHoanTien, string? MaYeuCau, string? LoaiHoan, decimal SoTien, string TrangThai);

    public static string TaoMaYeuCau(string khoaNghiaVu, long maChiTietThanhToan, int lanThu)
        => $"{TienTo}{khoaNghiaVu}:{maChiTietThanhToan}:L{lanThu}";

    public static string TienToNghiaVu(string khoaNghiaVu) => $"{TienTo}{khoaNghiaVu}:";

    /// <summary>Khóa lần thử (bỏ ":L{n}") và khóa nghĩa vụ (bỏ thêm mã nguồn). Mã ngoài quy ước được coi là nghĩa vụ riêng.</summary>
    public static (string KhoaNguon, string KhoaNghiaVu, int LanThu) TachMa(string? maYeuCau, long maHoanTien)
    {
        if (string.IsNullOrEmpty(maYeuCau) || !maYeuCau.StartsWith(TienTo))
        {
            var rieng = maYeuCau ?? $"#{maHoanTien}";
            return (rieng, rieng, 1);
        }
        var viTriLan = maYeuCau.LastIndexOf(":L", StringComparison.Ordinal);
        if (viTriLan < 0 || !int.TryParse(maYeuCau[(viTriLan + 2)..], out var lan))
            return (maYeuCau, maYeuCau, 1);
        var khoaNguon = maYeuCau[..viTriLan];
        var viTriNguon = khoaNguon.LastIndexOf(':');
        var khoaNghiaVu = viTriNguon > TienTo.Length ? khoaNguon[TienTo.Length..viTriNguon] : khoaNguon;
        return (khoaNguon, khoaNghiaVu, lan);
    }

    /// <summary>Mã hoàn của các lần thử đã bị thay thế bởi lần thử mới hơn trên cùng nguồn/nghĩa vụ.</summary>
    public static HashSet<long> CacLanDaThayThe(IEnumerable<Dong> dongs)
        => dongs.GroupBy(d => TachMa(d.MaYeuCau, d.MaHoanTien).KhoaNguon)
            .SelectMany(g => g.OrderByDescending(d => d.MaHoanTien).Skip(1).Select(d => d.MaHoanTien))
            .ToHashSet();

    public static string NhanHienThi(string trangThai, bool daThayThe) => trangThai switch
    {
        TrangThaiHoanTien.ChoXuLy => "DuKien",
        TrangThaiHoanTien.DangXuLy => "DangXuLy",
        TrangThaiHoanTien.ChuaRoKetQua => "ChuaRoKetQua",
        TrangThaiHoanTien.ThanhCong => "DaHoan",
        TrangThaiHoanTien.ThatBai => daThayThe ? "DaThayThe" : "CanXuLyLai",
        _ => trangThai
    };

    public record TongTheoTrangThai(decimal DuKien, decimal DangXuLy, decimal DaHoan, decimal CanXuLyLai);

    /// <summary>Cộng theo trạng thái; ThatBai đã được thay thế không còn là "cần xử lý lại".</summary>
    public static TongTheoTrangThai Tong(IReadOnlyCollection<Dong> dongs)
    {
        var thayThe = CacLanDaThayThe(dongs);
        decimal Sum(Func<Dong, bool> f) => dongs.Where(f).Sum(d => d.SoTien);
        return new TongTheoTrangThai(
            Sum(d => d.TrangThai == TrangThaiHoanTien.ChoXuLy),
            Sum(d => d.TrangThai == TrangThaiHoanTien.DangXuLy || d.TrangThai == TrangThaiHoanTien.ChuaRoKetQua),
            Sum(d => d.TrangThai == TrangThaiHoanTien.ThanhCong),
            Sum(d => d.TrangThai == TrangThaiHoanTien.ThatBai && !thayThe.Contains(d.MaHoanTien)));
    }

    public static List<NghiaVuHoanResponse> TheoNghiaVu(IReadOnlyCollection<Dong> dongs)
    {
        var thayThe = CacLanDaThayThe(dongs);
        return dongs.Where(d => !thayThe.Contains(d.MaHoanTien))
            .GroupBy(d => TachMa(d.MaYeuCau, d.MaHoanTien).KhoaNghiaVu)
            .OrderBy(g => g.Min(d => d.MaHoanTien))
            .Select(g =>
            {
                var tong = g.Sum(d => d.SoTien);
                var daHoan = g.Where(d => d.TrangThai == TrangThaiHoanTien.ThanhCong).Sum(d => d.SoTien);
                return new NghiaVuHoanResponse(
                    g.Key, g.First().LoaiHoan, tong, daHoan, tong - daHoan,
                    g.Count(d => d.TrangThai == TrangThaiHoanTien.ThatBai),
                    g.All(d => d.TrangThai == TrangThaiHoanTien.ThanhCong));
            })
            .ToList();
    }
}
