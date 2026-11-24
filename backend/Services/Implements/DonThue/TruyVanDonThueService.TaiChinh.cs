using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class TruyVanDonThueService
{
    /// <summary>Tổng hợp tài chính theo từng tập độc lập để tránh nhân bản số tiền khi JOIN.</summary>
    private async Task<DonTaiChinhResponse> XayDungTaiChinhAsync(Models.Entities.DonThue don, bool laNoiBo)
    {
        var maDonThue = don.MaDonThue;
        var (nhanTra, conNo, daTraCount, matDaDuyetCount, dangXuLyMatCount) = await TaiTienDoNhanTraAsync(maDonThue);
        var phuPhi = await TaiPhuPhiTongHopAsync(maDonThue, laNoiBo);

        var doiSoat = await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(d => d.MaDonThue == maDonThue).OrderByDescending(d => d.ThoiDiemLap).ThenByDescending(d => d.MaDoiSoat)
            .Select(d => new DoiSoatDonResponse(d.MaDoiSoat, d.MaDoiSoatGoc, d.MaDoiSoatGoc != null, d.LoaiDoiSoat,
                d.TienCocDuocDoiSoat, d.TongPhuPhiDuocDuyet, d.SoTienCanHoan, d.SoTienCanThuThem, d.TrangThai,
                d.ThoiDiemLap, d.ThoiDiemChot, d.LyDoDieuChinh))
            .ToListAsync();

        var (thu, hoan, hoanChoXuLy) = await TaiThuVaHoanAsync(maDonThue);
        HuyDonTomTatResponse? huy = don.TrangThai is TrangThaiDonThue.KhachHuy or TrangThaiDonThue.CuaHangHuy or TrangThaiDonThue.HetHan
            ? new HuyDonTomTatResponse(don.TrangThai.ToString(), don.ThoiDiemHuy, don.LyDoHuy, don.TienThueGiuLaiKhiHuy)
            : null;

        var coDieuChinhSauHoanTat = don.ThoiDiemHoanTat != null
            && doiSoat.Any(d => d.LaDieuChinh && d.ThoiDiemLap > don.ThoiDiemHoanTat);
        var nhan = DungNhanDon(don, conNo, daTraCount + matDaDuyetCount, dangXuLyMatCount, hoanChoXuLy, doiSoat, thu, phuPhi);

        return new DonTaiChinhResponse(nhanTra, phuPhi, doiSoat, thu, hoan, huy, don.ThoiDiemHoanTat, coDieuChinhSauHoanTat, nhan);
    }

    private async Task<(TienDoNhanTraResponse NhanTra, List<ThietBiConNoResponse> ConNo, int DaTraCount, int MatDaDuyetCount, int DangXuLyMatCount)>
        TaiTienDoNhanTraAsync(long maDonThue)
    {
        var daGiao = await _context.ChiTietBanGiaos.AsNoTracking()
            .Where(c => c.PhieuBanGiao.MaDonThue == maDonThue && c.PhieuBanGiao.TrangThai == BanGiaoDaGiao)
            .OrderBy(c => c.MaChiTietBanGiao)
            .Select(c => new { c.MaChiTietBanGiao, c.PhanCongThietBi.ThietBi.MaThietBiHienThi, c.PhanCongThietBi.ChiTietDon.TenSanPhamLucDat })
            .ToListAsync();
        var dongTra = await _context.ChiTietNhanTras.AsNoTracking()
            .Where(c => c.PhieuNhanTra.MaDonThue == maDonThue && c.PhieuNhanTra.TrangThai != TrangThaiPhieuNhanTra.DaHuy)
            .Select(c => new
            {
                c.MaChiTietBanGiao, c.MaPhieuNhanTra,
                PhieuDaChot = c.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot,
                c.KetLuan, c.BienBanMat, c.ThoiDiemDuyetMat
            }).ToListAsync();
        var phieuDaChot = await _context.PhieuNhanTras.AsNoTracking()
            .Where(p => p.MaDonThue == maDonThue && p.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            .OrderBy(p => p.LanTra)
            .Select(p => new { p.MaPhieuNhanTra, p.MaPhieuHienThi, p.LanTra, p.LaLanTraCuoi, p.ThoiDiemChot })
            .ToListAsync();

        static bool LaMat(string? ketLuan, string? bienBan) => !string.IsNullOrEmpty(bienBan) || KetLuanMat.Contains(ketLuan ?? "");
        var daTra = dongTra.Where(d => d.PhieuDaChot && !LaMat(d.KetLuan, d.BienBanMat)).Select(d => d.MaChiTietBanGiao).ToHashSet();
        var matDaDuyet = dongTra.Where(d => d.PhieuDaChot && LaMat(d.KetLuan, d.BienBanMat) && d.ThoiDiemDuyetMat != null).Select(d => d.MaChiTietBanGiao).ToHashSet();
        var dangXuLyMat = dongTra.Where(d => LaMat(d.KetLuan, d.BienBanMat) && d.ThoiDiemDuyetMat == null).Select(d => d.MaChiTietBanGiao).ToHashSet();

        var conNo = daGiao.Where(g => !daTra.Contains(g.MaChiTietBanGiao) && !matDaDuyet.Contains(g.MaChiTietBanGiao))
            .Select(g => new ThietBiConNoResponse(g.MaChiTietBanGiao, g.MaThietBiHienThi, g.TenSanPhamLucDat, dangXuLyMat.Contains(g.MaChiTietBanGiao)))
            .ToList();
        var cacDot = phieuDaChot.Select(p =>
        {
            var cuaPhieu = dongTra.Where(d => d.MaPhieuNhanTra == p.MaPhieuNhanTra).ToList();
            return new DotTraResponse(p.MaPhieuNhanTra, p.MaPhieuHienThi, p.LanTra, p.LaLanTraCuoi, p.ThoiDiemChot,
                cuaPhieu.Count(d => !LaMat(d.KetLuan, d.BienBanMat)), cuaPhieu.Count(d => LaMat(d.KetLuan, d.BienBanMat)));
        }).ToList();

        var nhanTra = new TienDoNhanTraResponse(daGiao.Count, daTra.Count, matDaDuyet.Count, dangXuLyMat.Count, conNo.Count, cacDot, conNo);
        return (nhanTra, conNo, daTra.Count, matDaDuyet.Count, dangXuLyMat.Count);
    }

    private async Task<PhuPhiTongHopResponse> TaiPhuPhiTongHopAsync(long maDonThue, bool laNoiBo)
    {
        var phiAll = await _context.PhuPhis.AsNoTracking()
            .Where(p => p.MaDonThue == maDonThue).OrderByDescending(p => p.ThoiDiemLap).ThenByDescending(p => p.MaPhuPhi)
            .Select(p => new PhuPhiDonResponse(p.MaPhuPhi, p.LoaiPhi, p.SoTien, p.LyDo, p.TrangThaiDuyet, p.TrangThaiTranhChap,
                p.KetQuaGiaiQuyet, p.MaPhuPhiGoc, p.MaDoiSoat, p.MaPhuPhiGoc != null))
            .ToListAsync();
        static bool TranhChapMo(PhuPhiDonResponse p) => p.TrangThaiTranhChap == PhuPhiDangTranhChap;
        var phiHienThi = laNoiBo ? phiAll : phiAll.Where(p => p.TrangThaiDuyet == PhuPhiDaDuyet).ToList();

        return new PhuPhiTongHopResponse(
            laNoiBo ? phiAll.Where(p => p.TrangThaiDuyet == PhuPhiChoDuyet).Sum(p => p.SoTien) : 0,
            phiAll.Where(p => p.TrangThaiDuyet == PhuPhiDaDuyet && !TranhChapMo(p)).Sum(p => p.SoTien),
            phiHienThi.Where(TranhChapMo).Sum(p => p.SoTien),
            laNoiBo ? phiAll.Where(p => p.TrangThaiDuyet == PhuPhiTuChoi).Sum(p => p.SoTien) : 0,
            phiHienThi.Count(TranhChapMo), phiHienThi);
    }

    private async Task<(ThuTienTongHopResponse Thu, HoanTienTongHopResponse Hoan, decimal HoanChoXuLy)>
        TaiThuVaHoanAsync(long maDonThue)
    {
        var tts = await _context.ThanhToans.AsNoTracking().Where(t => t.MaDonThue == maDonThue)
            .Select(t => new { t.TrangThai, t.TongSoTien }).ToListAsync();
        var ctThu = await _context.ChiTietThanhToans.AsNoTracking()
            .Where(c => c.ThanhToan.MaDonThue == maDonThue && c.ThanhToan.TrangThai == TrangThaiThanhToan.ThanhCong)
            .Select(c => new { c.MucDich, c.SoTien }).ToListAsync();

        decimal ThuTheo(string mucDich) => ctThu.Where(c => c.MucDich == mucDich).Sum(c => c.SoTien);
        var thu = new ThuTienTongHopResponse(
            ThuTheo(MucDichThanhToan.TienThue), ThuTheo(MucDichThanhToan.TienCoc), ThuTheo(MucDichThanhToan.ThuBoSung),
            tts.Where(t => t.TrangThai == TrangThaiThanhToan.ThanhCong).Sum(t => t.TongSoTien) - ctThu.Sum(c => c.SoTien),
            tts.Where(t => t.TrangThai != TrangThaiThanhToan.ThanhCong && t.TrangThai != TrangThaiThanhToan.ThatBai).Sum(t => t.TongSoTien));

        var hoanRows = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == maDonThue).OrderByDescending(h => h.ThoiDiemYeuCau).ThenByDescending(h => h.MaHoanTien)
            .Select(h => new { h.MaHoanTien, h.MaYeuCau, h.LoaiHoan, h.SoTien, h.TrangThai, h.ThoiDiemThanhCong })
            .ToListAsync();
        var dongHoan = hoanRows.Select(h => new HoanTienTongHop.Dong(h.MaHoanTien, h.MaYeuCau, h.LoaiHoan, h.SoTien, h.TrangThai)).ToList();
        var thayThe = HoanTienTongHop.CacLanDaThayThe(dongHoan);
        var tongHoan = HoanTienTongHop.Tong(dongHoan);
        var hoan = new HoanTienTongHopResponse(tongHoan.DuKien, tongHoan.DangXuLy, tongHoan.DaHoan, tongHoan.CanXuLyLai,
            hoanRows.Select(h => new HoanTienKhachResponse(h.MaHoanTien, h.LoaiHoan, h.SoTien, h.TrangThai, h.ThoiDiemThanhCong,
                HoanTienTongHop.NhanHienThi(h.TrangThai, thayThe.Contains(h.MaHoanTien)))).ToList());

        return (thu, hoan, tongHoan.DuKien + tongHoan.DangXuLy + tongHoan.CanXuLyLai);
    }

    private List<string> DungNhanDon(
        Models.Entities.DonThue don, List<ThietBiConNoResponse> conNo, int soDaKetLuan,
        int dangXuLyMatCount, decimal hoanChoXuLy, List<DoiSoatDonResponse> doiSoat,
        ThuTienTongHopResponse thu, PhuPhiTongHopResponse phuPhi)
    {
        var now = _clock.GetUtcNow().UtcDateTime;
        var nhan = new List<string>();
        if (don.TrangThai == TrangThaiDonThue.DangThue && conNo.Count > 0)
        {
            if (soDaKetLuan > 0) nhan.Add("TraMotPhan");
            if (now > don.GioTraDuKien) nhan.Add("QuaHan");
        }
        if (dangXuLyMatCount > 0) nhan.Add("DangXuLyMat");
        if (hoanChoXuLy > 0) nhan.Add("ChoHoanTien");
        var canThu = doiSoat.Where(d => d.ThoiDiemChot != null || d.TrangThai != "ChoChot").Sum(d => d.SoTienCanThuThem);
        if (canThu > thu.ThuBoSungDaThu) nhan.Add("CanThuBoSung");
        if (phuPhi.SoTranhChapDangMo > 0) nhan.Add("CoTranhChap");
        return nhan;
    }
}
