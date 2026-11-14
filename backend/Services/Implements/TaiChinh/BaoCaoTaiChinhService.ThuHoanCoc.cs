using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class BaoCaoTaiChinhService
{
    public async Task<Result<ThuHoanBaoCaoResponse>> LayThuHoanAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<ThuHoanBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<ThuHoanBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        var (thus, tongThu, thuThue, thuCoc, thuBoSung, thuChoPhanLoai) = await TaiGiaoDichThuAsync(khoang!, filter.MaDon);
        var (hoans, tongHoan, hoanThue, hoanCoc, hoanBoSung) = await TaiKhoanHoanAsync(khoang!, filter.MaDon);

        var (trang, soMoiTrang) = BaoCaoCsvHelper.ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        return Result<ThuHoanBaoCaoResponse>.Ok(new ThuHoanBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemThanhCong", "Dòng tiền thực thu/hoàn qua cổng hoặc trực tiếp; chi tiết dùng để phân loại, không cộng hai lần lên tổng."),
            TongThuThucTe = tongThu, ThuTienThue = thuThue, ThuTienCoc = thuCoc, ThuBoSung = thuBoSung, ThuChoPhanLoai = thuChoPhanLoai,
            SoGiaoDichThu = thus.Count, TongHoanThucTe = tongHoan, HoanTienThue = hoanThue, HoanTienCoc = hoanCoc,
            HoanThuBoSung = hoanBoSung, SoKhoanHoan = hoans.Count, DongTienRong = tongThu - tongHoan,
            GiaoDichThus = thus.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
            KhoanHoans = hoans.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
            Trang = trang, SoMoiTrang = soMoiTrang, TongSoThu = thus.Count, TongSoHoan = hoans.Count
        });
    }

    public async Task<Result<CocChuaTatToanBaoCaoResponse>> LayCocChuaTatToanAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<CocChuaTatToanBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var donQuery = _context.DonThues.AsNoTracking().Include(d => d.KhachHang).AsQueryable();
        if (filter.MaDon.HasValue) donQuery = donQuery.Where(d => d.MaDonThue == filter.MaDon.Value);

        var donList = await donQuery.OrderByDescending(d => d.NgayDat).ThenByDescending(d => d.MaDonThue)
            .Select(d => new { d.MaDonThue, d.MaDonHienThi, TenKhachHang = d.KhachHang.HoTen, TrangThaiDon = d.TrangThai.ToString(), d.NgayDat })
            .ToListAsync();

        var donIds = donList.Select(d => d.MaDonThue).ToList();
        var (cocThuTheoDon, cocHoanTheoDon) = await TaiTongHopCocAsync(donIds);
        var doiSoatTheoDon = (await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(ds => donIds.Contains(ds.MaDonThue) && ds.MaDoiSoatGoc == null)
            .OrderByDescending(ds => ds.MaDoiSoat).ToListAsync())
            .GroupBy(ds => ds.MaDonThue).ToDictionary(g => g.Key, g => g.First());

        var items = new List<CocChuaTatToanDongItem>();
        decimal tongThu = 0, tongHoan = 0, tongBu = 0, tongConGiu = 0;

        foreach (var don in donList)
        {
            decimal thuCoc = cocThuTheoDon.GetValueOrDefault(don.MaDonThue, 0);
            if (thuCoc <= 0) continue;

            decimal hoanCoc = cocHoanTheoDon.GetValueOrDefault(don.MaDonThue, 0);
            doiSoatTheoDon.TryGetValue(don.MaDonThue, out var ds);
            decimal cocBuPhi = ds?.TrangThai == DomainConstants.Status.Finalized
                ? Math.Max(0, ds.TienCocDuocDoiSoat - ds.SoTienCanHoan) : 0;
            decimal cocConGiu = Math.Max(0, thuCoc - hoanCoc - cocBuPhi);
            if (cocConGiu <= 0) continue;

            tongThu += thuCoc; tongHoan += hoanCoc; tongBu += cocBuPhi; tongConGiu += cocConGiu;
            items.Add(new CocChuaTatToanDongItem
            {
                MaDonThue = don.MaDonThue, MaDonHienThi = don.MaDonHienThi, TenKhachHang = don.TenKhachHang,
                TrangThaiDon = don.TrangThaiDon, NgayDat = don.NgayDat, CocDaThu = thuCoc,
                CocDaHoan = hoanCoc, CocDaBuPhuPhi = cocBuPhi, CocConGiu = cocConGiu,
                TrangThaiDoiSoat = ds?.TrangThai ?? "ChuaLap"
            });
        }

        var (trang, soMoiTrang) = BaoCaoCsvHelper.ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        return Result<CocChuaTatToanBaoCaoResponse>.Ok(new CocChuaTatToanBaoCaoResponse
        {
            Meta = TaoMeta(null, "SoDuHienTaiTaiThoiDiemTruyVan",
                "Số dư cọc hiện tại phản ánh nghĩa vụ cọc chưa tất toán của tất cả đơn thuê (lịch sử đầy đủ).",
                "Cọc còn giữ = Cọc thực thu - Cọc đã hoàn - Cọc đã chốt bù phụ phí."),
            TongCocDaThu = tongThu, TongCocDaHoan = tongHoan, TongCocDaBuPhuPhi = tongBu, TongCocChuaTatToan = tongConGiu,
            SoDonConGiuCoc = items.Count, Items = items.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
            Trang = trang, SoMoiTrang = soMoiTrang, TongSo = items.Count
        });
    }

    private async Task<(List<GiaoDichThuItem> Items, decimal Tong, decimal Thue, decimal Coc, decimal BoSung, decimal Cho)>
        TaiGiaoDichThuAsync(KhoangNgayBaoCao khoang, long? maDon)
    {
        var query = _context.ThanhToans.AsNoTracking().Include(t => t.DonThue).Include(t => t.ChiTietThanhToans)
            .Where(t => (t.TrangThai == DomainConstants.Status.Success || t.TrangThai == "ThanhCong")
                     && t.ThoiDiemThanhCong != null && t.ThoiDiemThanhCong >= khoang.TuUtc && t.ThoiDiemThanhCong < khoang.DenUtc);
        if (maDon.HasValue) query = query.Where(t => t.MaDonThue == maDon.Value);

        var list = await query.OrderByDescending(t => t.ThoiDiemThanhCong).ThenByDescending(t => t.MaThanhToan).ToListAsync();
        var items = new List<GiaoDichThuItem>();
        decimal tong = 0, thue = 0, coc = 0, boSung = 0, cho = 0;

        foreach (var t in list)
        {
            decimal tThue = t.ChiTietThanhToans.Where(c => c.MucDich == DomainConstants.TransactionPurposes.RentFee).Sum(c => c.SoTien);
            decimal tCoc = t.ChiTietThanhToans.Where(c => c.MucDich == DomainConstants.TransactionPurposes.DepositFee).Sum(c => c.SoTien);
            decimal tBoSung = t.ChiTietThanhToans.Where(c => c.MucDich == DomainConstants.TransactionPurposes.SupplementaryFee).Sum(c => c.SoTien);
            decimal tCho = Math.Max(0, t.TongSoTien - (tThue + tCoc + tBoSung));

            tong += t.TongSoTien; thue += tThue; coc += tCoc; boSung += tBoSung; cho += tCho;
            items.Add(new GiaoDichThuItem
            {
                MaThanhToan = t.MaThanhToan, MaYeuCau = t.MaYeuCau, MaDonThue = t.MaDonThue,
                MaDonHienThi = t.DonThue?.MaDonHienThi ?? string.Empty, PhuongThuc = t.PhuongThuc,
                CongThanhToan = t.CongThanhToan, ThoiDiemThanhCong = t.ThoiDiemThanhCong,
                TongSoTien = t.TongSoTien, TienThue = tThue, TienCoc = tCoc, ThuBoSung = tBoSung,
                ChoPhanLoai = tCho, TrangThaiDoiChieu = t.TrangThaiDoiChieu
            });
        }
        return (items, tong, thue, coc, boSung, cho);
    }

    private async Task<(List<KhoanHoanItem> Items, decimal Tong, decimal Thue, decimal Coc, decimal BoSung)>
        TaiKhoanHoanAsync(KhoangNgayBaoCao khoang, long? maDon)
    {
        var query = _context.HoanTiens.AsNoTracking()
            .Include(h => h.ChiTietThanhToanGoc).ThenInclude(ct => ct.ThanhToan).ThenInclude(t => t.DonThue)
            .Include(h => h.NguoiXuLy)
            .Where(h => (h.TrangThai == DomainConstants.Status.Success || h.TrangThai == "ThanhCong")
                     && h.ThoiDiemThanhCong != null && h.ThoiDiemThanhCong >= khoang.TuUtc && h.ThoiDiemThanhCong < khoang.DenUtc);
        if (maDon.HasValue) query = query.Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == maDon.Value);

        var list = await query.OrderByDescending(h => h.ThoiDiemThanhCong).ThenByDescending(h => h.MaHoanTien).ToListAsync();
        var items = new List<KhoanHoanItem>();
        decimal tong = 0, thue = 0, coc = 0, boSung = 0;

        foreach (var h in list)
        {
            var mucDich = h.ChiTietThanhToanGoc?.MucDich ?? string.Empty;
            tong += h.SoTien;
            if (mucDich == DomainConstants.TransactionPurposes.RentFee) thue += h.SoTien;
            else if (mucDich == DomainConstants.TransactionPurposes.DepositFee) coc += h.SoTien;
            else if (mucDich == DomainConstants.TransactionPurposes.SupplementaryFee) boSung += h.SoTien;

            items.Add(new KhoanHoanItem
            {
                MaHoanTien = h.MaHoanTien, MaYeuCau = h.MaYeuCau,
                MaDonThue = h.ChiTietThanhToanGoc?.ThanhToan?.MaDonThue ?? 0,
                MaDonHienThi = h.ChiTietThanhToanGoc?.ThanhToan?.DonThue?.MaDonHienThi ?? string.Empty,
                MaChiTietThanhToanGoc = h.MaChiTietThanhToanGoc, MucDichThuGoc = mucDich,
                LoaiHoan = h.LoaiHoan, LyDo = h.LyDo, SoTien = h.SoTien,
                ThoiDiemThanhCong = h.ThoiDiemThanhCong, NguoiXuLy = h.NguoiXuLy?.HoTen
            });
        }
        return (items, tong, thue, coc, boSung);
    }

    private async Task<(Dictionary<long, decimal> Thu, Dictionary<long, decimal> Hoan)> TaiTongHopCocAsync(List<long> donIds)
    {
        var chiTietCocs = await _context.ChiTietThanhToans.AsNoTracking().Include(ct => ct.ThanhToan)
            .Where(ct => donIds.Contains(ct.ThanhToan.MaDonThue)
                      && ct.MucDich == DomainConstants.TransactionPurposes.DepositFee
                      && (ct.ThanhToan.TrangThai == DomainConstants.Status.Success || ct.ThanhToan.TrangThai == "ThanhCong"))
            .Select(ct => new { ct.MaChiTietThanhToan, ct.ThanhToan.MaDonThue, ct.SoTien }).ToListAsync();

        var cocThu = chiTietCocs.GroupBy(c => c.MaDonThue).ToDictionary(g => g.Key, g => g.Sum(x => x.SoTien));
        var ctToDon = chiTietCocs.ToDictionary(c => c.MaChiTietThanhToan, c => c.MaDonThue);
        var ctIds = chiTietCocs.Select(c => c.MaChiTietThanhToan).ToList();

        var hoanCocs = await _context.HoanTiens.AsNoTracking()
            .Where(h => ctIds.Contains(h.MaChiTietThanhToanGoc)
                     && (h.TrangThai == DomainConstants.Status.Success || h.TrangThai == "ThanhCong"))
            .Select(h => new { h.MaChiTietThanhToanGoc, h.SoTien }).ToListAsync();

        var cocHoan = new Dictionary<long, decimal>();
        foreach (var hc in hoanCocs)
            if (ctToDon.TryGetValue(hc.MaChiTietThanhToanGoc, out var donId))
                cocHoan[donId] = cocHoan.GetValueOrDefault(donId) + hc.SoTien;

        return (cocThu, cocHoan);
    }
}
