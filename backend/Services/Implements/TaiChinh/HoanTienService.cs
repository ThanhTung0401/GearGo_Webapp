using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Integrations.Payments;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

/// <summary>
/// Dịch vụ lập yêu cầu hoàn tiền, kiểm soát hạn mức nguồn thu và đối chiếu gateway.
/// </summary>
public partial class HoanTienService : IHoanTienService
{
    private const int GioiHanMoiLuot = 50;

    private readonly ApplicationDbContext _context;
    private readonly IRefundGateway _gateway;
    private readonly ILichSuNghiepVuService _lichSu;
    private readonly IThongBaoService _thongBao;
    private readonly TimeProvider _clock;
    private readonly ILogger<HoanTienService> _logger;

    public HoanTienService(ApplicationDbContext context, IRefundGateway gateway, ILichSuNghiepVuService lichSu,
        IThongBaoService thongBao, TimeProvider clock, ILogger<HoanTienService> logger)
    {
        _context = context;
        _gateway = gateway;
        _lichSu = lichSu;
        _thongBao = thongBao;
        _clock = clock;
        _logger = logger;
    }

    private DateTime Now => _clock.GetUtcNow().UtcDateTime;

    public async Task<List<HoanTien>> LapYeuCauHoanAsync(LapHoanCommand c, long? maTaiKhoanThucHien, CancellationToken ct = default)
    {
        var tong = ValidateLapHoanCommand(c);
        var existing = await TimYeuCauDaLapAsync(c, tong, ct);
        if (existing != null) return existing;

        // Khóa các nguồn theo thứ tự mã tăng dần trước khi đọc hạn mức.
        var ids = c.NguonUngVien.Distinct().OrderBy(x => x).ToList();
        foreach (var id in ids) await KhoaNguonAsync(id, ct);

        var hanMuc = await TinhHanMucAsync(ids, ct);
        ValidateNguonVaHanMuc(c, ids, hanMuc);
        var phanBo = PhanBoTheoNguon(ids, hanMuc, tong);

        var maNhanVien = maTaiKhoanThucHien.HasValue ? await ActorGuard.LayMaNhanVienAsync(_context, maTaiKhoanThucHien.Value, ct) : null;
        var now = Now;
        var rows = phanBo.Select(p => new HoanTien
        {
            MaChiTietThanhToanGoc = p.Id, MaDoiSoat = c.MaDoiSoat, MaNguoiXuLy = maNhanVien,
            MaYeuCau = HoanTienTongHop.TaoMaYeuCau(c.KhoaNghiaVu, p.Id, 1), LoaiHoan = c.LoaiHoan,
            SoTien = p.SoTien, LyDo = c.LyDo, ThoiDiemYeuCau = now, TrangThai = TrangThaiHoanTien.ChoXuLy
        }).ToList();
        _context.HoanTiens.AddRange(rows);

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(maTaiKhoanThucHien, "LAP_YEU_CAU_HOAN", "HOAN_TIEN", c.KhoaNghiaVu,
            null, new { c.MaDonThue, c.LoaiHoan, c.MaDoiSoat, tong, phanBo = rows.Select(r => new { r.MaYeuCau, r.MaChiTietThanhToanGoc, r.SoTien }) }, c.LyDo));
        return rows;
    }

    public async Task<HanMucNguonResponse> LayHanMucNguonAsync(long maChiTietThanhToan, CancellationToken ct = default)
    {
        var hm = await TinhHanMucAsync(new List<long> { maChiTietThanhToan }, ct);
        return hm.TryGetValue(maChiTietThanhToan, out var n)
            ? n.ToResponse(maChiTietThanhToan)
            : throw new NguonHoanKhongHopLeException("Chi tiết thu gốc không tồn tại.", new { maChiTietThanhToan });
    }

    public async Task<HoanTienTheoDonResponse> LayDanhSachTheoDonAsync(long maDonThue, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan, ct);
        var laKhach = tk.VaiTro == "KhachHang";
        if (laKhach)
        {
            var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan, ct);
            if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue && d.MaKhachHang == maKhach, ct))
                throw new DonKhongTimThayException();
        }
        else
        {
            await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan, ct);
            if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue, ct))
                throw new DonKhongTimThayException();
        }
        return await TongHopTheoDonAsync(maDonThue, laNoiBo: !laKhach, ct);
    }

    public async Task<HoanTienTheoDonResponse> TongHopTheoDonAsync(long maDonThue, bool laNoiBo, CancellationToken ct = default)
    {
        var rows = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == maDonThue).OrderByDescending(h => h.ThoiDiemYeuCau).ThenByDescending(h => h.MaHoanTien)
            .Select(h => new HoanTienRow(h.MaHoanTien, h.MaYeuCau, h.MaChiTietThanhToanGoc, h.ChiTietThanhToanGoc.MucDich,
                h.MaDoiSoat, h.LoaiHoan, h.SoTien, h.TrangThai, h.ThoiDiemYeuCau, h.ThoiDiemThanhCong, h.LyDo, h.MaGiaoDichHoanCong))
            .ToListAsync(ct);

        var dongs = rows.Select(r => new HoanTienTongHop.Dong(r.MaHoanTien, r.MaYeuCau, r.LoaiHoan, r.SoTien, r.TrangThai)).ToList();
        var thayThe = HoanTienTongHop.CacLanDaThayThe(dongs);
        var tong = HoanTienTongHop.Tong(dongs);
        return new HoanTienTheoDonResponse(maDonThue,
            rows.Select(r => r.ToResponse(thayThe.Contains(r.MaHoanTien), laNoiBo)).ToList(),
            tong.DuKien, tong.DangXuLy, tong.DaHoan, tong.CanXuLyLai, HoanTienTongHop.TheoNghiaVu(dongs));
    }

    private decimal ValidateLapHoanCommand(LapHoanCommand c)
    {
        if (_context.Database.CurrentTransaction == null)
            throw new InvalidOperationException("LapYeuCauHoanAsync phải chạy trong transaction của bên gọi (khóa nguồn và lập intent cùng commit).");
        if (!LoaiHoanTien.TatCa.Contains(c.LoaiHoan))
            throw new ArgumentException($"Loại hoàn không hợp lệ: {c.LoaiHoan}.");
        if (c.LoaiHoan == LoaiHoanTien.HoanCocDoiSoat && c.MaDoiSoat == null)
            throw new ArgumentException("Hoàn cọc theo đối soát phải có mã đối soát.");
        if (string.IsNullOrWhiteSpace(c.KhoaNghiaVu) || HoanTienTongHop.TaoMaYeuCau(c.KhoaNghiaVu, long.MaxValue, 99).Length > 100)
            throw new ArgumentException("Khóa nghĩa vụ hoàn thiếu hoặc quá dài.");
        var tong = CalculationHelpers.LamTronVnd(c.TongSoTien);
        if (tong <= 0)
            throw new ArgumentException("Không lập khoản hoàn 0 đồng; bên gọi bỏ qua nghĩa vụ không cần hoàn.");
        if (c.NguonUngVien.Count == 0)
            throw new NguonHoanKhongHopLeException("Nghĩa vụ hoàn không có nguồn thu gốc.", new { c.KhoaNghiaVu });
        return tong;
    }

    private async Task<List<HoanTien>?> TimYeuCauDaLapAsync(LapHoanCommand c, decimal tong, CancellationToken ct)
    {
        var tienTo = HoanTienTongHop.TienToNghiaVu(c.KhoaNghiaVu);
        var daCo = await _context.HoanTiens.AsNoTracking().Where(h => h.MaYeuCau != null && h.MaYeuCau.StartsWith(tienTo)).ToListAsync(ct);
        daCo.AddRange(_context.ChangeTracker.Entries<HoanTien>()
            .Where(e => e.State == EntityState.Added && e.Entity.MaYeuCau != null && e.Entity.MaYeuCau.StartsWith(tienTo))
            .Select(e => e.Entity));
        if (daCo.Count == 0) return null;

        var thayThe = HoanTienTongHop.CacLanDaThayThe(daCo.Select(ToDong).ToList());
        var hienHanh = daCo.Where(h => !thayThe.Contains(h.MaHoanTien)).ToList();
        if (hienHanh.Sum(h => h.SoTien) != tong)
            throw new NguonHoanKhongHopLeException("Nghĩa vụ hoàn đã được lập với số tiền khác; cần lập nghĩa vụ điều chỉnh riêng.",
                new { c.KhoaNghiaVu, daLap = hienHanh.Sum(h => h.SoTien), yeuCau = tong });
        return hienHanh;
    }

    private static void ValidateNguonVaHanMuc(LapHoanCommand c, List<long> ids, Dictionary<long, NguonHanMuc> hanMuc)
    {
        var mucDichBatBuoc = LoaiHoanTien.MucDichNguonBatBuoc(c.LoaiHoan);
        foreach (var id in ids)
        {
            if (!hanMuc.TryGetValue(id, out var n))
                throw new NguonHoanKhongHopLeException("Chi tiết thu gốc không tồn tại.", new { maChiTietThanhToan = id });
            if (n.MaDonThue != c.MaDonThue)
                throw new NguonHoanKhongHopLeException("Chi tiết thu gốc không thuộc đơn của nghĩa vụ.", new { maChiTietThanhToan = id });
            if (n.TrangThaiThu != TrangThaiThanhToan.ThanhCong)
                throw new NguonHoanKhongHopLeException("Khoản thu gốc chưa thành công; không dùng làm nguồn hoàn.", new { maChiTietThanhToan = id, n.TrangThaiThu });
            if (!MucDichThanhToan.TatCa.Contains(n.MucDich) || (mucDichBatBuoc != null && n.MucDich != mucDichBatBuoc))
                throw new NguonHoanKhongHopLeException("Mục đích khoản thu gốc không khớp loại hoàn.", new { maChiTietThanhToan = id, n.MucDich, c.LoaiHoan });
        }
    }

    private static List<(long Id, decimal SoTien)> PhanBoTheoNguon(List<long> ids, Dictionary<long, NguonHanMuc> hanMuc, decimal tong)
    {
        var conLai = tong;
        var phanBo = new List<(long Id, decimal SoTien)>();
        foreach (var id in ids)
        {
            if (conLai <= 0) break;
            var lay = Math.Min(conLai, hanMuc[id].ConCoTheLap);
            if (lay <= 0) continue;
            phanBo.Add((id, lay));
            conLai -= lay;
        }
        if (conLai > 0)
            throw new VuotHanMucHoanException("Tổng đã hoàn, đang giữ và yêu cầu mới vượt số thực thu của nguồn.",
                new { yeuCau = tong, conCoTheLap = tong - conLai, nguon = ids.Select(id => hanMuc[id].ToResponse(id)).ToList() });
        return phanBo;
    }
}
