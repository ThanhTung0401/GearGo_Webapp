using GearGo.Helpers;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class DoiSoatService
{
    private IQueryable<DoiSoatTienCoc> TaiDoiSoatDayDuQuery() =>
        _context.DoiSoatTienCocs
            .Include(d => d.DonThue).Include(d => d.PhuPhis)
            .Include(d => d.GiaoDichDoiSoats).ThenInclude(g => g.ChiTietThanhToan).ThenInclude(ct => ct.ThanhToan)
            .Include(d => d.HoanTiens).Include(d => d.NguoiLap).Include(d => d.NguoiChot);

    private async Task<DoiSoatResponse> ChuyenSangResponseAsync(DoiSoatTienCoc d)
    {
        var daHoan = d.HoanTiens.Where(h => h.TrangThai == "ThanhCong").Sum(h => h.SoTien);
        var hoanPending = d.HoanTiens.Where(h => TrangThaiHoanTien.GiuHanMuc.Contains(h.TrangThai)).Sum(h => h.SoTien);
        var daThuThem = d.GiaoDichDoiSoats.Select(g => g.ChiTietThanhToan)
            .Where(ct => ct != null && ct.MucDich == "ThuBoSung" && ct.ThanhToan?.TrangThai == "ThanhCong").Sum(ct => ct.SoTien);

        var thuThemPending = await _context.ThanhToans
            .Where(t => t.MaDonThue == d.MaDonThue && t.TrangThai == "ChoThanhToan" && t.GhiChu != null && t.GhiChu.Contains(d.MaDoiSoat.ToString()))
            .SumAsync(t => t.TongSoTien);

        var (conChuaLap, coTheChot) = TinhTienDo(d, daHoan, hoanPending, daThuThem, thuThemPending);

        return new DoiSoatResponse
        {
            MaDoiSoat = d.MaDoiSoat, MaDonThue = d.MaDonThue, MaDonHienThi = d.DonThue?.MaDonHienThi,
            MaDoiSoatGoc = d.MaDoiSoatGoc, LoaiDoiSoat = d.LoaiDoiSoat, TrangThai = d.TrangThai,
            TienCocDuocDoiSoat = d.TienCocDuocDoiSoat, TongPhuPhiDuocDuyet = d.TongPhuPhiDuocDuyet,
            CanHoan = d.SoTienCanHoan, CanThuThem = d.SoTienCanThuThem, DaHoanThanhCong = daHoan,
            HoanDangCho = hoanPending, DaThuThemThanhCong = daThuThem, ThuThemDangCho = thuThemPending,
            ConChuaLapYeuCau = conChuaLap, CoTheChot = coTheChot, MaNguoiLap = d.MaNguoiLap,
            TenNguoiLap = d.NguoiLap?.HoTen, MaNguoiChot = d.MaNguoiChot,
            TenNguoiChot = d.TenNguoiChotLucDoiSoat ?? d.NguoiChot?.HoTen, ThoiDiemLap = d.ThoiDiemLap,
            ThoiDiemChot = d.ThoiDiemChot, LyDoDieuChinh = d.LyDoDieuChinh,
            NguonCoc = MapNguonCoc(d), DanhSachPhuPhi = MapPhuPhi(d),
            GiaoDichThuThem = MapThuThem(d), GiaoDichHoan = MapHoan(d)
        };
    }

    public async Task<NghiaVuCocDonThueDto?> LayNghiaVuCocDonThueAsync(long donId)
    {
        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == donId);
        if (don == null) return null;

        var chiTietCoc = await _context.ChiTietThanhToans.AsNoTracking().Include(ct => ct.ThanhToan)
            .Where(ct => ct.ThanhToan.MaDonThue == donId && ct.MucDich == DomainConstants.TransactionPurposes.DepositFee
                      && ct.ThanhToan.TrangThai == DomainConstants.Status.Success).ToListAsync();
        var ctIds = chiTietCoc.Select(ct => ct.MaChiTietThanhToan).ToList();
        decimal tongCocThucThu = chiTietCoc.Sum(ct => ct.SoTien);

        var hoanTiens = await _context.HoanTiens.AsNoTracking().Where(h => ctIds.Contains(h.MaChiTietThanhToanGoc)).ToListAsync();
        decimal tongCocDaHoan = hoanTiens.Where(h => h.TrangThai == DomainConstants.Status.Success).Sum(h => h.SoTien);
        decimal hoanChuaXuLy = hoanTiens.Where(h => h.TrangThai == DomainConstants.Status.PendingProcessing || h.TrangThai == DomainConstants.Status.InProgress).Sum(h => h.SoTien);

        var dsGoc = await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(d => d.MaDonThue == donId && d.MaDoiSoatGoc == null).OrderByDescending(d => d.MaDoiSoat).FirstOrDefaultAsync();

        decimal cocBuPhi = 0, thuThemChuaThu = 0;
        if (dsGoc?.TrangThai == DomainConstants.Status.Finalized)
        {
            cocBuPhi = Math.Max(0, dsGoc.TienCocDuocDoiSoat - dsGoc.SoTienCanHoan);
            if (dsGoc.SoTienCanThuThem > 0)
            {
                var daThuThem = await _context.ChiTietThanhToans.AsNoTracking()
                    .Where(ct => ct.ThanhToan.MaDonThue == donId && ct.MucDich == DomainConstants.TransactionPurposes.SupplementaryFee
                              && ct.ThanhToan.TrangThai == DomainConstants.Status.Success).SumAsync(ct => ct.SoTien);
                thuThemChuaThu = Math.Max(0, dsGoc.SoTienCanThuThem - daThuThem);
            }
        }

        var coDieuChinhCho = await _context.DoiSoatTienCocs.AsNoTracking()
            .AnyAsync(d => d.MaDonThue == donId && d.MaDoiSoatGoc != null && d.TrangThai == DomainConstants.Status.PendingProcessing);

        return new NghiaVuCocDonThueDto
        {
            MaDonThue = don.MaDonThue, MaDonHienThi = don.MaDonHienThi,
            TongCocThucThu = tongCocThucThu, TongCocDaHoan = tongCocDaHoan, TongCocDaBuPhuPhi = cocBuPhi,
            TongCocConGiu = Math.Max(0, tongCocThucThu - tongCocDaHoan - cocBuPhi),
            SoTienCanHoanChuaXuLy = hoanChuaXuLy, SoTienCanThuThemChuaThu = thuThemChuaThu,
            TrangThaiDoiSoat = dsGoc?.TrangThai, MaDoiSoatGoc = dsGoc?.MaDoiSoat, CoDoiSoatDieuChinhDangXuLy = coDieuChinhCho
        };
    }

    private static (decimal ConChuaLap, bool CoTheChot) TinhTienDo(
        DoiSoatTienCoc d, decimal daHoan, decimal hoanPending, decimal daThuThem, decimal thuThemPending)
    {
        if (d.SoTienCanHoan > 0)
            return (Math.Max(0, d.SoTienCanHoan - daHoan - hoanPending), daHoan >= d.SoTienCanHoan);
        if (d.SoTienCanThuThem > 0)
            return (Math.Max(0, d.SoTienCanThuThem - daThuThem - thuThemPending), daThuThem >= d.SoTienCanThuThem);
        return (0, true);
    }

    private static List<NguonCocDto> MapNguonCoc(DoiSoatTienCoc d) =>
        d.GiaoDichDoiSoats.Select(g => g.ChiTietThanhToan).Where(ct => ct != null && ct.MucDich == "TienCoc")
            .Select(ct => new NguonCocDto
            {
                MaChiTietThanhToan = ct.MaChiTietThanhToan, MaThanhToan = ct.MaThanhToan,
                MaYeuCau = ct.ThanhToan?.MaYeuCau ?? string.Empty, SoTien = ct.SoTien,
                PhuongThuc = ct.ThanhToan?.PhuongThuc ?? string.Empty,
                ThoiDiem = ct.ThanhToan?.ThoiDiemThanhCong ?? ct.ThanhToan?.ThoiDiemTao ?? DateTime.UtcNow
            }).ToList();

    private static List<PhuPhiDoiSoatDto> MapPhuPhi(DoiSoatTienCoc d) =>
        d.PhuPhis.Select(p => new PhuPhiDoiSoatDto
        {
            MaPhuPhi = p.MaPhuPhi, MaChiTietBanGiao = p.MaChiTietBanGiao, LoaiPhi = p.LoaiPhi,
            SoTien = p.SoTien, LyDo = p.LyDo, TrangThaiDuyet = p.TrangThaiDuyet, TrangThaiTranhChap = p.TrangThaiTranhChap
        }).ToList();

    private static List<GiaoDichThuDoiSoatDto> MapThuThem(DoiSoatTienCoc d) =>
        d.GiaoDichDoiSoats.Select(g => g.ChiTietThanhToan).Where(ct => ct != null && ct.MucDich == "ThuBoSung")
            .Select(ct => new GiaoDichThuDoiSoatDto
            {
                MaChiTietThanhToan = ct.MaChiTietThanhToan, MaThanhToan = ct.MaThanhToan,
                MaYeuCau = ct.ThanhToan?.MaYeuCau ?? string.Empty, SoTien = ct.SoTien,
                TrangThai = ct.ThanhToan?.TrangThai ?? string.Empty,
                ThoiDiem = ct.ThanhToan?.ThoiDiemThanhCong ?? ct.ThanhToan?.ThoiDiemTao ?? DateTime.UtcNow
            }).ToList();

    private static List<GiaoDichHoanDoiSoatDto> MapHoan(DoiSoatTienCoc d) =>
        d.HoanTiens.Select(h => new GiaoDichHoanDoiSoatDto
        {
            MaHoanTien = h.MaHoanTien, MaChiTietThanhToanGoc = h.MaChiTietThanhToanGoc, MaYeuCau = h.MaYeuCau,
            SoTien = h.SoTien, TrangThai = h.TrangThai, ThoiDiemYeuCau = h.ThoiDiemYeuCau, ThoiDiemThanhCong = h.ThoiDiemThanhCong
        }).ToList();
}
