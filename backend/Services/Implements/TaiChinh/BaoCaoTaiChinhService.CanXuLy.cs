using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class BaoCaoTaiChinhService
{
    public async Task<Result<KhoanCanXuLyBaoCaoResponse>> LayKhoanCanXuLyAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<KhoanCanXuLyBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var thuDoiChieu = await TaiThuCanDoiChieuAsync(filter.MaDon);
        var thuPhanLoai = await TaiThuChoPhanLoaiAsync(filter.MaDon);
        var hoanCho = await TaiHoanDangChoAsync(filter.MaDon);
        var dieuChinhCho = await TaiDoiSoatDieuChinhChoAsync(filter.MaDon);
        var thieuDoiSoat = await TaiDonThieuDoiSoatAsync(filter.MaDon);

        return Result<KhoanCanXuLyBaoCaoResponse>.Ok(new KhoanCanXuLyBaoCaoResponse
        {
            Meta = TaoMeta(null, "DanhSachCacKhoanChuaHoanTatHoacNgoaiLe",
                "Danh sách các khoản chờ xử lý, khoản tiền sai lệch cần đối chiếu hoặc chứng từ thiếu sót.",
                "Các nhóm khoản mục có thể cùng phát sinh từ một đơn; không cộng dồn thành một tổng nợ duy nhất."),
            SoKhoanThuCanDoiChieu = thuDoiChieu.Count, TongTienThuCanDoiChieu = thuDoiChieu.Sum(t => t.TongSoTien),
            SoKhoanThuChoPhanLoai = thuPhanLoai.Count, TongTienThuChoPhanLoai = thuPhanLoai.Sum(t => t.TienChoPhanLoai),
            SoKhoanHoanDangCho = hoanCho.Count, TongTienHoanDangCho = hoanCho.Sum(h => h.SoTien),
            SoDoiSoatDieuChinhDangXuLy = dieuChinhCho.Count, SoDonHoanTatThieuDoiSoat = thieuDoiSoat.Count,
            ThuCanDoiChieuItems = thuDoiChieu, ThuChoPhanLoaiItems = thuPhanLoai,
            HoanDangChoItems = hoanCho, DoiSoatDieuChinhDangXuLyItems = dieuChinhCho,
            DonHoanTatThieuDoiSoatItems = thieuDoiSoat
        });
    }

    private async Task<List<ThuCanDoiChieuItem>> TaiThuCanDoiChieuAsync(long? maDon)
    {
        var q = _context.ThanhToans.AsNoTracking().Include(t => t.DonThue)
            .Where(t => t.TrangThaiDoiChieu == DomainConstants.Status.VerificationNeeded || t.TrangThaiDoiChieu == "CanDoiChieu");
        if (maDon.HasValue) q = q.Where(t => t.MaDonThue == maDon.Value);
        return await q.OrderByDescending(t => t.ThoiDiemTao).Select(t => new ThuCanDoiChieuItem
        {
            MaThanhToan = t.MaThanhToan, MaYeuCau = t.MaYeuCau, MaDonThue = t.MaDonThue, MaDonHienThi = t.DonThue.MaDonHienThi,
            TongSoTien = t.TongSoTien, ThoiDiemThanhCong = t.ThoiDiemThanhCong, TrangThaiDoiChieu = t.TrangThaiDoiChieu, GhiChu = t.GhiChu
        }).ToListAsync();
    }

    private async Task<List<ThuChoPhanLoaiItem>> TaiThuChoPhanLoaiAsync(long? maDon)
    {
        var q = _context.ThanhToans.AsNoTracking().Include(t => t.DonThue).Include(t => t.ChiTietThanhToans)
            .Where(t => t.TrangThai == DomainConstants.Status.Success || t.TrangThai == "ThanhCong");
        if (maDon.HasValue) q = q.Where(t => t.MaDonThue == maDon.Value);

        var list = await q.ToListAsync();
        return list.Select(t => new { t, DaPhanLoai = t.ChiTietThanhToans.Sum(c => c.SoTien) })
            .Where(x => x.DaPhanLoai < x.t.TongSoTien)
            .Select(x => new ThuChoPhanLoaiItem
            {
                MaThanhToan = x.t.MaThanhToan, MaYeuCau = x.t.MaYeuCau, MaDonThue = x.t.MaDonThue,
                MaDonHienThi = x.t.DonThue?.MaDonHienThi ?? string.Empty, TongSoTien = x.t.TongSoTien,
                TienDaPhanLoai = x.DaPhanLoai, TienChoPhanLoai = x.t.TongSoTien - x.DaPhanLoai,
                ThoiDiemThanhCong = x.t.ThoiDiemThanhCong
            }).ToList();
    }

    private async Task<List<HoanDangChoItem>> TaiHoanDangChoAsync(long? maDon)
    {
        var q = _context.HoanTiens.AsNoTracking()
            .Include(h => h.ChiTietThanhToanGoc).ThenInclude(ct => ct.ThanhToan).ThenInclude(t => t.DonThue)
            .Where(h => h.TrangThai == DomainConstants.Status.PendingProcessing
                     || h.TrangThai == DomainConstants.Status.InProgress || h.TrangThai == "ChoXuLy");
        if (maDon.HasValue) q = q.Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == maDon.Value);
        return await q.OrderByDescending(h => h.ThoiDiemYeuCau).Select(h => new HoanDangChoItem
        {
            MaHoanTien = h.MaHoanTien, MaYeuCau = h.MaYeuCau,
            MaDonThue = h.ChiTietThanhToanGoc.ThanhToan.MaDonThue,
            MaDonHienThi = h.ChiTietThanhToanGoc.ThanhToan.DonThue.MaDonHienThi,
            MucDichThuGoc = h.ChiTietThanhToanGoc.MucDich, SoTien = h.SoTien,
            TrangThai = h.TrangThai, ThoiDiemYeuCau = h.ThoiDiemYeuCau, LyDo = h.LyDo
        }).ToListAsync();
    }

    private async Task<List<DoiSoatDieuChinhDangXuLyItem>> TaiDoiSoatDieuChinhChoAsync(long? maDon)
    {
        var q = _context.DoiSoatTienCocs.AsNoTracking().Include(d => d.DonThue)
            .Where(d => d.MaDoiSoatGoc != null
                     && (d.TrangThai == DomainConstants.Status.PendingProcessing || d.TrangThai == "ChoChot"));
        if (maDon.HasValue) q = q.Where(d => d.MaDonThue == maDon.Value);
        return await q.OrderByDescending(d => d.ThoiDiemLap).Select(d => new DoiSoatDieuChinhDangXuLyItem
        {
            MaDoiSoatDieuChinh = d.MaDoiSoat, MaDoiSoatGoc = d.MaDoiSoatGoc!.Value, MaDonThue = d.MaDonThue,
            MaDonHienThi = d.DonThue.MaDonHienThi, ThoiDiemLap = d.ThoiDiemLap,
            TrangThai = d.TrangThai, LyDoDieuChinh = d.LyDoDieuChinh
        }).ToListAsync();
    }

    private async Task<List<DonHoanTatThieuDoiSoatItem>> TaiDonThieuDoiSoatAsync(long? maDon)
    {
        var q = _context.DonThues.AsNoTracking().Where(d => d.TrangThai == TrangThaiDonThue.HoanTat);
        if (maDon.HasValue) q = q.Where(d => d.MaDonThue == maDon.Value);
        var donHoanTats = await q.Select(d => new
        {
            d.MaDonThue, d.MaDonHienThi, d.ThoiDiemHoanTat,
            TienThueSauGiam = d.TongTienThueTruocGiam - d.TongTienGiam
        }).ToListAsync();

        var ids = donHoanTats.Select(d => d.MaDonThue).ToList();
        var daChot = await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(ds => ids.Contains(ds.MaDonThue) && ds.MaDoiSoatGoc == null && ds.TrangThai == DomainConstants.Status.Finalized)
            .Select(ds => ds.MaDonThue).Distinct().ToListAsync();

        return donHoanTats.Where(d => !daChot.Contains(d.MaDonThue)).Select(d => new DonHoanTatThieuDoiSoatItem
        {
            MaDonThue = d.MaDonThue, MaDonHienThi = d.MaDonHienThi,
            ThoiDiemHoanTat = d.ThoiDiemHoanTat, TienThueSauGiam = d.TienThueSauGiam
        }).ToList();
    }
}
