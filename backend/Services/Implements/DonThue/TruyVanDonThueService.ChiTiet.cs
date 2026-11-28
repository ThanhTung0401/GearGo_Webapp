using GearGo.Exceptions;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class TruyVanDonThueService
{
    private async Task<DonChiTietResponse> XayDungChiTietAsync(long maDonThue, bool laNoiBo, long maTaiKhoanXem)
    {
        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == maDonThue)
                  ?? throw new DonKhongTimThayException();

        var dong = await _context.ChiTietDonThues.AsNoTracking()
            .Where(c => c.MaDonThue == maDonThue).OrderBy(c => c.MaChiTietDon)
            .Select(c => new DongThueResponse(
                c.MaChiTietDon, c.MaSanPham, c.TenSanPhamLucDat, c.SoLuong, c.SoNgayTinhTien,
                c.DonGiaThueMoiNgay, c.TienGiam, c.MucCocMoiThietBi,
                c.SoLuong * c.SoNgayTinhTien * c.DonGiaThueMoiNgay - c.TienGiam))
            .ToListAsync();

        var thanhToan = await _context.ThanhToans.AsNoTracking()
            .Where(t => t.MaDonThue == maDonThue).OrderByDescending(t => t.ThoiDiemTao).ThenByDescending(t => t.MaThanhToan)
            .Select(t => new ThanhToanDonResponse(
                t.MaThanhToan,
                t.PhuongThuc,
                t.TrangThai,
                t.TongSoTien,
                t.ThoiDiemThanhCong,
                t.ChiTietThanhToans.Select(c => c.MucDich).FirstOrDefault(),
                t.GhiChu))
            .ToListAsync();
        var daThu = thanhToan.Where(t => t.TrangThai == "ThanhCong").Sum(t => t.TongSoTien);

        var lichSu = await LayLichSuAsync(maDonThue, laNoiBo, maTaiKhoanXem);
        var banGiao = await LayBanGiaoKhachAsync(maDonThue, chiDaChot: !laNoiBo);
        var nhanTra = await _context.PhieuNhanTras.AsNoTracking()
            .Where(p => p.MaDonThue == maDonThue && p.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            .OrderBy(p => p.LanTra)
            .Select(p => new PhieuNhanTraTomTatResponse(p.MaPhieuNhanTra, p.MaPhieuHienThi, p.LanTra, p.TrangThai.ToString(), p.ThoiDiemChot))
            .ToListAsync();

        var taiChinh = await XayDungTaiChinhAsync(don, laNoiBo);
        var phuPhi = taiChinh.PhuPhi.Items
            .Select(p => new PhuPhiKhachResponse(p.MaPhuPhi, p.LoaiPhi, p.SoTien, p.LyDo, p.TrangThaiDuyet))
            .ToList();

        var thaoTac = new List<string>();
        if (!laNoiBo)
        {
            if (don.TrangThai == TrangThaiDonThue.ChoThanhToan) thaoTac.Add("ThanhToan");
            if (TruocBanGiao.Contains(don.TrangThai)) { thaoTac.Add("XemTruocHuy"); thaoTac.Add("HuyDon"); }
            var daChotDoiSoat = taiChinh.DoiSoat.Any(d => d.ThoiDiemChot != null);
            if (!daChotDoiSoat && taiChinh.PhuPhi.Items.Any(p => p.TrangThaiDuyet == PhuPhiDaDuyet && string.IsNullOrEmpty(p.TrangThaiTranhChap)))
                thaoTac.Add("TranhChapPhuPhi");
            if (taiChinh.Nhan.Contains("CanThuBoSung")) thaoTac.Add("ThanhToanBoSung");
        }

        return new DonChiTietResponse(
            don.MaDonThue, don.MaDonHienThi, don.TrangThai.ToString(), don.NgayDat, don.GioNhanDuKien, don.GioTraDuKien,
            don.HanThanhToan, don.TenNguoiNhan, don.SoDienThoaiNguoiNhan, don.EmailLienHe,
            don.TongTienThueTruocGiam, don.TongTienGiam, don.TongTienCoc, daThu,
            dong, thanhToan, lichSu, banGiao, nhanTra, phuPhi, taiChinh.Hoan.Items, thaoTac, taiChinh);
    }

    private async Task<List<SuKienDonResponse>> LayLichSuAsync(long maDonThue, bool laNoiBo, long maTaiKhoanXem)
    {
        var rows = await _context.LichSuTrangThaiDons.AsNoTracking()
            .Where(l => l.MaDonThue == maDonThue)
            .OrderBy(l => l.ThoiDiem).ThenBy(l => l.MaLichSuDon)
            .Select(l => new { l.ThoiDiem, l.TrangThaiTruoc, l.TrangThaiSau, l.LyDo, l.MaNguoiThucHien })
            .ToListAsync();

        return rows.Select(r => new SuKienDonResponse(
            r.ThoiDiem, r.TrangThaiTruoc, r.TrangThaiSau,
            laNoiBo || r.MaNguoiThucHien == maTaiKhoanXem ? r.LyDo : null)).ToList();
    }

    private async Task<List<PhieuBanGiaoKhachResponse>> LayBanGiaoKhachAsync(long maDonThue, bool chiDaChot = true)
    {
        var phieus = await _context.PhieuBanGiaos.AsNoTracking()
            .Where(p => p.MaDonThue == maDonThue && (!chiDaChot || p.TrangThai == BanGiaoDaGiao))
            .Select(p => new { p.MaPhieuBanGiao, p.TrangThai, p.ThoiDiemGiaoThucTe, p.TenNhanVienLucGiao, p.TenNguoiNhanThucTe })
            .ToListAsync();
        if (phieus.Count == 0) return new();

        var ids = phieus.Select(p => p.MaPhieuBanGiao).ToList();
        var chiTiet = await _context.ChiTietBanGiaos.AsNoTracking()
            .Where(c => ids.Contains(c.MaPhieuBanGiao)).OrderBy(c => c.MaChiTietBanGiao)
            .Select(c => new
            {
                c.MaPhieuBanGiao,
                Dto = new ChiTietBanGiaoKhachResponse(
                    c.MaChiTietBanGiao, c.PhanCongThietBi.ThietBi.MaThietBiHienThi,
                    c.PhanCongThietBi.ChiTietDon.TenSanPhamLucDat, c.TinhTrangTruocThue, c.PhuKienThucGiao, c.DanhSachAnh)
            }).ToListAsync();

        return phieus.Select(p => new PhieuBanGiaoKhachResponse(
            p.MaPhieuBanGiao, p.TrangThai, p.ThoiDiemGiaoThucTe, p.TenNhanVienLucGiao, p.TenNguoiNhanThucTe,
            chiTiet.Where(c => c.MaPhieuBanGiao == p.MaPhieuBanGiao).Select(c => c.Dto).ToList())).ToList();
    }
}
