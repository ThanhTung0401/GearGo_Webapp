using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Models.DTOs.DoiSoat;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ Báo cáo tài chính và số dư cần xử lý (W6-T5 - Kim Xuyến, UC25).
/// Tuân thủ quy tắc nghiệp vụ trong Document/Plan_Week6.md:
/// - Tách bạch doanh thu hoàn tất, phí hủy, điều chỉnh sau hoàn tất, thu/hoàn thực tế và số dư cọc.
/// - Không cộng cọc vào doanh thu; không trừ hoàn cọc vào doanh thu thuê.
/// - Không fan-out số tiền khi JOIN nhiều bảng (aggregate theo grain trước khi ghép).
/// - Số dư cọc hiện tại dùng lịch sử đầy đủ, không lọc theo ngày thu phát sinh trong kỳ.
/// </summary>
public class BaoCaoTaiChinhService : IBaoCaoTaiChinhService
{
    private const string VaiTroQuanTri = "QuanTriVien";
    private const int SoNgayToiDa = 366;
    private const int SoDongXuatToiDa = 10_000;
    private static readonly TimeSpan LechGioVn = TimeSpan.FromHours(7);

    private readonly ApplicationDbContext _context;
    private readonly IDoiSoatService _doiSoatService;
    private readonly TimeProvider _clock;

    public BaoCaoTaiChinhService(
        ApplicationDbContext context,
        IDoiSoatService doiSoatService,
        TimeProvider? clock = null)
    {
        _context = context;
        _doiSoatService = doiSoatService;
        _clock = clock ?? TimeProvider.System;
    }

    // ───────────────────────────── 1. Doanh thu hoàn tất ─────────────────────────────

    public async Task<Result<DoanhThuHoanTatBaoCaoResponse>> LayDoanhThuHoanTatAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<DoanhThuHoanTatBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<DoanhThuHoanTatBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        var query = _context.DonThues.AsNoTracking()
            .Where(d => d.TrangThai == TrangThaiDonThue.HoanTat
                     && d.ThoiDiemHoanTat != null
                     && d.ThoiDiemHoanTat >= khoang!.TuUtc
                     && d.ThoiDiemHoanTat < khoang!.DenUtc);

        if (filter.MaDon.HasValue)
            query = query.Where(d => d.MaDonThue == filter.MaDon.Value);

        var donList = await query
            .OrderByDescending(d => d.ThoiDiemHoanTat)
            .ThenByDescending(d => d.MaDonThue)
            .Select(d => new
            {
                d.MaDonThue,
                d.MaDonHienThi,
                d.ThoiDiemHoanTat,
                d.TongTienThueTruocGiam,
                d.TongTienGiam,
                TienThueSauGiam = d.TongTienThueTruocGiam - d.TongTienGiam
            })
            .ToListAsync();

        var donIds = donList.Select(d => d.MaDonThue).ToList();

        // Lấy đối soát gốc đã chốt của các đơn này
        var doiSoatGocs = await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(ds => donIds.Contains(ds.MaDonThue)
                      && ds.MaDoiSoatGoc == null
                      && ds.TrangThai == DomainConstants.Status.Finalized)
            .Select(ds => new
            {
                ds.MaDoiSoat,
                ds.MaDonThue,
                ds.TongPhuPhiDuocDuyet
            })
            .ToListAsync();

        var doiSoatTheoDon = doiSoatGocs
            .GroupBy(ds => ds.MaDonThue)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.MaDoiSoat).First());

        var items = new List<DoanhThuHoanTatDongItem>();
        decimal tongThueSauGiam = 0;
        decimal tongPhuPhiBanDau = 0;

        foreach (var don in donList)
        {
            var coDoiSoat = doiSoatTheoDon.TryGetValue(don.MaDonThue, out var dsGoc);
            decimal phuPhi = coDoiSoat && dsGoc != null ? dsGoc.TongPhuPhiDuocDuyet : 0;
            decimal tongDoanhThuDon = don.TienThueSauGiam + phuPhi;

            tongThueSauGiam += don.TienThueSauGiam;
            tongPhuPhiBanDau += phuPhi;

            items.Add(new DoanhThuHoanTatDongItem
            {
                MaDonThue = don.MaDonThue,
                MaDonHienThi = don.MaDonHienThi,
                ThoiDiemHoanTat = don.ThoiDiemHoanTat,
                TienThueTruocGiam = don.TongTienThueTruocGiam,
                TienGiam = don.TongTienGiam,
                TienThueSauGiam = don.TienThueSauGiam,
                PhuPhiDoiSoatBanDau = phuPhi,
                TongDoanhThu = tongDoanhThuDon,
                MaDoiSoatGoc = dsGoc?.MaDoiSoat,
                CoNgoaiLeThieuDoiSoat = !coDoiSoat,
                GhiChu = !coDoiSoat ? "Đơn hoàn tất nhưng chưa liên kết đối soát gốc đã chốt." : null
            });
        }

        var (trang, soMoiTrang) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        var pagedItems = items.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList();

        var response = new DoanhThuHoanTatBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemHoanTat", "Doanh thu = Tiền thuê sau giảm + Phụ phí đối soát ban đầu đã chốt (không cộng cọc)."),
            TongDoanhThuThueSauGiam = tongThueSauGiam,
            TongPhuPhiDoiSoatBanDau = tongPhuPhiBanDau,
            TongDoanhThuHoanTat = tongThueSauGiam + tongPhuPhiBanDau,
            SoDonHoanTat = items.Count,
            Items = pagedItems,
            Trang = trang,
            SoMoiTrang = soMoiTrang,
            TongSo = items.Count
        };

        return Result<DoanhThuHoanTatBaoCaoResponse>.Ok(response);
    }

    // ───────────────────────────── 2. Phí hủy giữ lại ─────────────────────────────

    public async Task<Result<PhiHuyBaoCaoResponse>> LayPhiHuyAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<PhiHuyBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<PhiHuyBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        var query = _context.DonThues.AsNoTracking()
            .Where(d => (d.TrangThai == TrangThaiDonThue.KhachHuy || d.TrangThai == TrangThaiDonThue.CuaHangHuy)
                     && d.ThoiDiemHuy != null
                     && d.ThoiDiemHuy >= khoang!.TuUtc
                     && d.ThoiDiemHuy < khoang!.DenUtc);

        if (filter.MaDon.HasValue)
            query = query.Where(d => d.MaDonThue == filter.MaDon.Value);

        var donHuyList = await query
            .OrderByDescending(d => d.ThoiDiemHuy)
            .ThenByDescending(d => d.MaDonThue)
            .Select(d => new PhiHuyDongItem
            {
                MaDonThue = d.MaDonThue,
                MaDonHienThi = d.MaDonHienThi,
                ThoiDiemHuy = d.ThoiDiemHuy,
                LyDoHuy = d.LyDoHuy,
                TienThueGiuLai = d.TienThueGiuLaiKhiHuy,
                TienThueTruocGiam = d.TongTienThueTruocGiam,
                TienGiam = d.TongTienGiam,
                TienCoc = d.TongTienCoc
            })
            .ToListAsync();

        decimal tongPhiHuy = donHuyList.Sum(d => d.TienThueGiuLai);
        int soDonCoPhi = donHuyList.Count(d => d.TienThueGiuLai > 0);

        var (trang, soMoiTrang) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        var pagedItems = donHuyList.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList();

        var response = new PhiHuyBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemHuy", "Phí hủy giữ lại từ tiền thuê thực thu theo quy tắc hủy; trình bày riêng, không coi là đơn hoàn tất."),
            TongPhiHuyGiuLai = tongPhiHuy,
            SoDonHuyCoPhi = soDonCoPhi,
            Items = pagedItems,
            Trang = trang,
            SoMoiTrang = soMoiTrang,
            TongSo = donHuyList.Count
        };

        return Result<PhiHuyBaoCaoResponse>.Ok(response);
    }

    // ───────────────────────────── 3. Điều chỉnh doanh thu ─────────────────────────────

    public async Task<Result<DieuChinhDoanhThuBaoCaoResponse>> LayDieuChinhDoanhThuAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<DieuChinhDoanhThuBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<DieuChinhDoanhThuBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        var query = _context.DoiSoatTienCocs.AsNoTracking()
            .Include(d => d.DonThue)
            .Include(d => d.DoiSoatGoc)
            .Include(d => d.NguoiChot)
            .Where(d => d.MaDoiSoatGoc != null
                     && d.TrangThai == DomainConstants.Status.Finalized
                     && d.ThoiDiemChot != null
                     && d.ThoiDiemChot >= khoang!.TuUtc
                     && d.ThoiDiemChot < khoang!.DenUtc);

        if (filter.MaDon.HasValue)
            query = query.Where(d => d.MaDonThue == filter.MaDon.Value);

        var dieuChinhList = await query
            .OrderByDescending(d => d.ThoiDiemChot)
            .ThenByDescending(d => d.MaDoiSoat)
            .Select(d => new
            {
                d.MaDoiSoat,
                MaDoiSoatGoc = d.MaDoiSoatGoc!.Value,
                d.MaDonThue,
                MaDonHienThi = d.DonThue.MaDonHienThi,
                d.ThoiDiemChot,
                d.LyDoDieuChinh,
                PhuPhiSauDieuChinh = d.TongPhuPhiDuocDuyet,
                PhuPhiGoc = d.DoiSoatGoc != null ? d.DoiSoatGoc.TongPhuPhiDuocDuyet : 0,
                TenNguoiChot = d.TenNguoiChotLucDoiSoat ?? (d.NguoiChot != null ? d.NguoiChot.HoTen : null)
            })
            .ToListAsync();

        var items = dieuChinhList.Select(d => new DieuChinhDoanhThuDongItem
        {
            MaDoiSoatDieuChinh = d.MaDoiSoat,
            MaDoiSoatGoc = d.MaDoiSoatGoc,
            MaDonThue = d.MaDonThue,
            MaDonHienThi = d.MaDonHienThi,
            ThoiDiemChotDieuChinh = d.ThoiDiemChot,
            LyDoDieuChinh = d.LyDoDieuChinh,
            PhuPhiGoc = d.PhuPhiGoc,
            PhuPhiSauDieuChinh = d.PhuPhiSauDieuChinh,
            DeltaPhuPhi = d.PhuPhiSauDieuChinh - d.PhuPhiGoc,
            TenNguoiChot = d.TenNguoiChot
        }).ToList();

        decimal tongDelta = items.Sum(i => i.DeltaPhuPhi);

        var (trang, soMoiTrang) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        var pagedItems = items.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList();

        var response = new DieuChinhDoanhThuBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemChot", "Delta doanh thu = Phụ phí sau điều chỉnh - Phụ phí đối soát gốc; ghi nhận có dấu theo giờ chốt phiếu con."),
            TongDeltaDoanhThu = tongDelta,
            SoPhieuDieuChinh = items.Count,
            Items = pagedItems,
            Trang = trang,
            SoMoiTrang = soMoiTrang,
            TongSo = items.Count
        };

        return Result<DieuChinhDoanhThuBaoCaoResponse>.Ok(response);
    }

    // ───────────────────────────── 4. Thu / Hoàn thực tế ─────────────────────────────

    public async Task<Result<ThuHoanBaoCaoResponse>> LayThuHoanAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<ThuHoanBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<ThuHoanBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        // 1. Giao dịch thu thực tế
        var thuQuery = _context.ThanhToans.AsNoTracking()
            .Include(t => t.DonThue)
            .Include(t => t.ChiTietThanhToans)
            .Where(t => (t.TrangThai == DomainConstants.Status.Success || t.TrangThai == "ThanhCong")
                     && t.ThoiDiemThanhCong != null
                     && t.ThoiDiemThanhCong >= khoang!.TuUtc
                     && t.ThoiDiemThanhCong < khoang!.DenUtc);

        if (filter.MaDon.HasValue)
            thuQuery = thuQuery.Where(t => t.MaDonThue == filter.MaDon.Value);

        var thuList = await thuQuery
            .OrderByDescending(t => t.ThoiDiemThanhCong)
            .ThenByDescending(t => t.MaThanhToan)
            .ToListAsync();

        var giaoDichThus = new List<GiaoDichThuItem>();
        decimal tongThuThucTe = 0;
        decimal tongThuTienThue = 0;
        decimal tongThuTienCoc = 0;
        decimal tongThuBoSung = 0;
        decimal tongThuChoPhanLoai = 0;

        foreach (var t in thuList)
        {
            decimal tienThue = t.ChiTietThanhToans
                .Where(ct => ct.MucDich == DomainConstants.TransactionPurposes.RentFee)
                .Sum(ct => ct.SoTien);

            decimal tienCoc = t.ChiTietThanhToans
                .Where(ct => ct.MucDich == DomainConstants.TransactionPurposes.DepositFee)
                .Sum(ct => ct.SoTien);

            decimal thuBoSung = t.ChiTietThanhToans
                .Where(ct => ct.MucDich == DomainConstants.TransactionPurposes.SupplementaryFee)
                .Sum(ct => ct.SoTien);

            decimal daPhanLoai = tienThue + tienCoc + thuBoSung;
            decimal choPhanLoai = Math.Max(0, t.TongSoTien - daPhanLoai);

            tongThuThucTe += t.TongSoTien;
            tongThuTienThue += tienThue;
            tongThuTienCoc += tienCoc;
            tongThuBoSung += thuBoSung;
            tongThuChoPhanLoai += choPhanLoai;

            giaoDichThus.Add(new GiaoDichThuItem
            {
                MaThanhToan = t.MaThanhToan,
                MaYeuCau = t.MaYeuCau,
                MaDonThue = t.MaDonThue,
                MaDonHienThi = t.DonThue?.MaDonHienThi ?? string.Empty,
                PhuongThuc = t.PhuongThuc,
                CongThanhToan = t.CongThanhToan,
                ThoiDiemThanhCong = t.ThoiDiemThanhCong,
                TongSoTien = t.TongSoTien,
                TienThue = tienThue,
                TienCoc = tienCoc,
                ThuBoSung = thuBoSung,
                ChoPhanLoai = choPhanLoai,
                TrangThaiDoiChieu = t.TrangThaiDoiChieu
            });
        }

        // 2. Giao dịch hoàn tiền thực tế
        var hoanQuery = _context.HoanTiens.AsNoTracking()
            .Include(h => h.ChiTietThanhToanGoc)
                .ThenInclude(ct => ct.ThanhToan)
                    .ThenInclude(t => t.DonThue)
            .Include(h => h.NguoiXuLy)
            .Where(h => (h.TrangThai == DomainConstants.Status.Success || h.TrangThai == "ThanhCong")
                     && h.ThoiDiemThanhCong != null
                     && h.ThoiDiemThanhCong >= khoang!.TuUtc
                     && h.ThoiDiemThanhCong < khoang!.DenUtc);

        if (filter.MaDon.HasValue)
            hoanQuery = hoanQuery.Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == filter.MaDon.Value);

        var hoanList = await hoanQuery
            .OrderByDescending(h => h.ThoiDiemThanhCong)
            .ThenByDescending(h => h.MaHoanTien)
            .ToListAsync();

        var khoanHoans = new List<KhoanHoanItem>();
        decimal tongHoanThucTe = 0;
        decimal tongHoanTienThue = 0;
        decimal tongHoanTienCoc = 0;
        decimal tongHoanThuBoSung = 0;

        foreach (var h in hoanList)
        {
            var mucDichGoc = h.ChiTietThanhToanGoc?.MucDich ?? string.Empty;
            tongHoanThucTe += h.SoTien;

            if (mucDichGoc == DomainConstants.TransactionPurposes.RentFee)
                tongHoanTienThue += h.SoTien;
            else if (mucDichGoc == DomainConstants.TransactionPurposes.DepositFee)
                tongHoanTienCoc += h.SoTien;
            else if (mucDichGoc == DomainConstants.TransactionPurposes.SupplementaryFee)
                tongHoanThuBoSung += h.SoTien;

            khoanHoans.Add(new KhoanHoanItem
            {
                MaHoanTien = h.MaHoanTien,
                MaYeuCau = h.MaYeuCau,
                MaDonThue = h.ChiTietThanhToanGoc?.ThanhToan?.MaDonThue ?? 0,
                MaDonHienThi = h.ChiTietThanhToanGoc?.ThanhToan?.DonThue?.MaDonHienThi ?? string.Empty,
                MaChiTietThanhToanGoc = h.MaChiTietThanhToanGoc,
                MucDichThuGoc = mucDichGoc,
                LoaiHoan = h.LoaiHoan,
                LyDo = h.LyDo,
                SoTien = h.SoTien,
                ThoiDiemThanhCong = h.ThoiDiemThanhCong,
                NguoiXuLy = h.NguoiXuLy?.HoTen
            });
        }

        var (trang, soMoiTrang) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        var pagedThus = giaoDichThus.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList();
        var pagedHoans = khoanHoans.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList();

        var response = new ThuHoanBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemThanhCong", "Dòng tiền thực thu/hoàn qua cổng hoặc trực tiếp; chi tiết dùng để phân loại, không cộng hai lần lên tổng."),
            TongThuThucTe = tongThuThucTe,
            ThuTienThue = tongThuTienThue,
            ThuTienCoc = tongThuTienCoc,
            ThuBoSung = tongThuBoSung,
            ThuChoPhanLoai = tongThuChoPhanLoai,
            SoGiaoDichThu = giaoDichThus.Count,

            TongHoanThucTe = tongHoanThucTe,
            HoanTienThue = tongHoanTienThue,
            HoanTienCoc = tongHoanTienCoc,
            HoanThuBoSung = tongHoanThuBoSung,
            SoKhoanHoan = khoanHoans.Count,

            DongTienRong = tongThuThucTe - tongHoanThucTe,
            GiaoDichThus = pagedThus,
            KhoanHoans = pagedHoans,
            Trang = trang,
            SoMoiTrang = soMoiTrang,
            TongSoThu = giaoDichThus.Count,
            TongSoHoan = khoanHoans.Count
        };

        return Result<ThuHoanBaoCaoResponse>.Ok(response);
    }

    // ───────────────────────────── 5. Cọc chưa tất toán (Số dư hiện tại) ─────────────────────────────

    public async Task<Result<CocChuaTatToanBaoCaoResponse>> LayCocChuaTatToanAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<CocChuaTatToanBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        // Báo cáo số dư cọc hiện tại: xét lịch sử đầy đủ của các đơn có phát sinh cọc
        var query = _context.DonThues.AsNoTracking()
            .Include(d => d.KhachHang)
            .AsQueryable();

        if (filter.MaDon.HasValue)
            query = query.Where(d => d.MaDonThue == filter.MaDon.Value);

        var donList = await query
            .OrderByDescending(d => d.NgayDat)
            .ThenByDescending(d => d.MaDonThue)
            .Select(d => new
            {
                d.MaDonThue,
                d.MaDonHienThi,
                TenKhachHang = d.KhachHang.HoTen,
                TrangThaiDon = d.TrangThai.ToString(),
                d.NgayDat
            })
            .ToListAsync();

        var donIds = donList.Select(d => d.MaDonThue).ToList();

        // 1. Tổng cọc đã thu thành công theo đơn
        var chiTietCocs = await _context.ChiTietThanhToans.AsNoTracking()
            .Include(ct => ct.ThanhToan)
            .Where(ct => donIds.Contains(ct.ThanhToan.MaDonThue)
                      && ct.MucDich == DomainConstants.TransactionPurposes.DepositFee
                      && (ct.ThanhToan.TrangThai == DomainConstants.Status.Success || ct.ThanhToan.TrangThai == "ThanhCong"))
            .Select(ct => new
            {
                ct.MaChiTietThanhToan,
                ct.ThanhToan.MaDonThue,
                ct.SoTien
            })
            .ToListAsync();

        var chiTietCocIds = chiTietCocs.Select(ct => ct.MaChiTietThanhToan).ToList();
        var cocThuTheoDon = chiTietCocs
            .GroupBy(ct => ct.MaDonThue)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.SoTien));

        // 2. Tổng cọc đã hoàn thành công theo chi tiết thu gốc
        var hoanCocs = await _context.HoanTiens.AsNoTracking()
            .Where(h => chiTietCocIds.Contains(h.MaChiTietThanhToanGoc)
                     && (h.TrangThai == DomainConstants.Status.Success || h.TrangThai == "ThanhCong"))
            .Select(h => new
            {
                h.MaChiTietThanhToanGoc,
                h.SoTien
            })
            .ToListAsync();

        var ctToDonMap = chiTietCocs.ToDictionary(c => c.MaChiTietThanhToan, c => c.MaDonThue);
        var cocHoanTheoDon = new Dictionary<long, decimal>();
        foreach (var hc in hoanCocs)
        {
            if (ctToDonMap.TryGetValue(hc.MaChiTietThanhToanGoc, out var donId))
            {
                cocHoanTheoDon[donId] = cocHoanTheoDon.GetValueOrDefault(donId) + hc.SoTien;
            }
        }

        // 3. Đối soát gốc đã chốt theo đơn (để xác định cọc đã dùng bù phụ phí)
        var doiSoatGocs = await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(ds => donIds.Contains(ds.MaDonThue)
                      && ds.MaDoiSoatGoc == null)
            .OrderByDescending(ds => ds.MaDoiSoat)
            .ToListAsync();

        var doiSoatTheoDon = doiSoatGocs
            .GroupBy(ds => ds.MaDonThue)
            .ToDictionary(g => g.Key, g => g.First());

        var items = new List<CocChuaTatToanDongItem>();
        decimal tongCocDaThu = 0;
        decimal tongCocDaHoan = 0;
        decimal tongCocDaBuPhuPhi = 0;
        decimal tongCocChuaTatToan = 0;

        foreach (var don in donList)
        {
            decimal thuCoc = cocThuTheoDon.GetValueOrDefault(don.MaDonThue, 0);
            if (thuCoc <= 0) continue; // Không có tiền cọc thực thu thì bỏ qua

            decimal hoanCoc = cocHoanTheoDon.GetValueOrDefault(don.MaDonThue, 0);

            decimal cọcBuPhi = 0;
            string? trangThaiDoiSoat = null;

            if (doiSoatTheoDon.TryGetValue(don.MaDonThue, out var ds))
            {
                trangThaiDoiSoat = ds.TrangThai;
                if (ds.TrangThai == DomainConstants.Status.Finalized)
                {
                    // Phần cọc đã được dùng bù phụ phí theo đối soát đã chốt
                    cọcBuPhi = Math.Max(0, ds.TienCocDuocDoiSoat - ds.SoTienCanHoan);
                }
            }

            decimal cọcConGiu = Math.Max(0, thuCoc - hoanCoc - cọcBuPhi);

            // Chỉ liệt kê các đơn còn giữ cọc > 0 hoặc chưa hoàn tất đối soát
            if (cọcConGiu > 0)
            {
                tongCocDaThu += thuCoc;
                tongCocDaHoan += hoanCoc;
                tongCocDaBuPhuPhi += cọcBuPhi;
                tongCocChuaTatToan += cọcConGiu;

                items.Add(new CocChuaTatToanDongItem
                {
                    MaDonThue = don.MaDonThue,
                    MaDonHienThi = don.MaDonHienThi,
                    TenKhachHang = don.TenKhachHang,
                    TrangThaiDon = don.TrangThaiDon,
                    NgayDat = don.NgayDat,
                    CocDaThu = thuCoc,
                    CocDaHoan = hoanCoc,
                    CocDaBuPhuPhi = cọcBuPhi,
                    CocConGiu = cọcConGiu,
                    TrangThaiDoiSoat = trangThaiDoiSoat ?? "ChuaLap"
                });
            }
        }

        var (trang, soMoiTrang) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        var pagedItems = items.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList();

        var meta = new BaoCaoTaiChinhMeta
        {
            ThoiDiemLayDuLieu = _clock.GetUtcNow().UtcDateTime,
            MuiGioHienThi = "Asia/Ho_Chi_Minh (UTC+7)",
            DonViTien = "VND",
            MocLoc = "SoDuHienTaiTaiThoiDiemTruyVan",
            GhiChu = new List<string>
            {
                "Số dư cọc hiện tại phản ánh nghĩa vụ cọc chưa tất toán của tất cả đơn thuê (lịch sử đầy đủ).",
                "Cọc còn giữ = Cọc thực thu - Cọc đã hoàn - Cọc đã chốt bù phụ phí."
            }
        };

        var response = new CocChuaTatToanBaoCaoResponse
        {
            Meta = meta,
            TongCocDaThu = tongCocDaThu,
            TongCocDaHoan = tongCocDaHoan,
            TongCocDaBuPhuPhi = tongCocDaBuPhuPhi,
            TongCocChuaTatToan = tongCocChuaTatToan,
            SoDonConGiuCoc = items.Count,
            Items = pagedItems,
            Trang = trang,
            SoMoiTrang = soMoiTrang,
            TongSo = items.Count
        };

        return Result<CocChuaTatToanBaoCaoResponse>.Ok(response);
    }

    // ───────────────────────────── 6. Khoản cần xử lý / Ngoại lệ ─────────────────────────────

    public async Task<Result<KhoanCanXuLyBaoCaoResponse>> LayKhoanCanXuLyAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<KhoanCanXuLyBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        // 1. Thu cần đối chiếu
        var thuCanDoiChieuQuery = _context.ThanhToans.AsNoTracking()
            .Include(t => t.DonThue)
            .Where(t => t.TrangThaiDoiChieu == DomainConstants.Status.VerificationNeeded
                     || t.TrangThaiDoiChieu == "CanDoiChieu");

        if (filter.MaDon.HasValue)
            thuCanDoiChieuQuery = thuCanDoiChieuQuery.Where(t => t.MaDonThue == filter.MaDon.Value);

        var thuCanDoiChieus = await thuCanDoiChieuQuery
            .OrderByDescending(t => t.ThoiDiemTao)
            .Select(t => new ThuCanDoiChieuItem
            {
                MaThanhToan = t.MaThanhToan,
                MaYeuCau = t.MaYeuCau,
                MaDonThue = t.MaDonThue,
                MaDonHienThi = t.DonThue.MaDonHienThi,
                TongSoTien = t.TongSoTien,
                ThoiDiemThanhCong = t.ThoiDiemThanhCong,
                TrangThaiDoiChieu = t.TrangThaiDoiChieu,
                GhiChu = t.GhiChu
            })
            .ToListAsync();

        // 2. Thu chưa phân loại đủ chi tiết
        var thanhToanThanhCong = await _context.ThanhToans.AsNoTracking()
            .Include(t => t.DonThue)
            .Include(t => t.ChiTietThanhToans)
            .Where(t => (t.TrangThai == DomainConstants.Status.Success || t.TrangThai == "ThanhCong"))
            .ToListAsync();

        var thuChoPhanLoais = new List<ThuChoPhanLoaiItem>();
        foreach (var t in thanhToanThanhCong)
        {
            if (filter.MaDon.HasValue && t.MaDonThue != filter.MaDon.Value)
                continue;

            decimal daPhanLoai = t.ChiTietThanhToans.Sum(ct => ct.SoTien);
            if (daPhanLoai < t.TongSoTien)
            {
                thuChoPhanLoais.Add(new ThuChoPhanLoaiItem
                {
                    MaThanhToan = t.MaThanhToan,
                    MaYeuCau = t.MaYeuCau,
                    MaDonThue = t.MaDonThue,
                    MaDonHienThi = t.DonThue?.MaDonHienThi ?? string.Empty,
                    TongSoTien = t.TongSoTien,
                    TienDaPhanLoai = daPhanLoai,
                    TienChoPhanLoai = t.TongSoTien - daPhanLoai,
                    ThoiDiemThanhCong = t.ThoiDiemThanhCong
                });
            }
        }

        // 3. Hoàn tiền đang chờ xử lý
        var hoanDangChoQuery = _context.HoanTiens.AsNoTracking()
            .Include(h => h.ChiTietThanhToanGoc)
                .ThenInclude(ct => ct.ThanhToan)
                    .ThenInclude(t => t.DonThue)
            .Where(h => h.TrangThai == DomainConstants.Status.PendingProcessing
                     || h.TrangThai == DomainConstants.Status.InProgress
                     || h.TrangThai == "ChoXuLy");

        if (filter.MaDon.HasValue)
            hoanDangChoQuery = hoanDangChoQuery.Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == filter.MaDon.Value);

        var hoanDangChos = await hoanDangChoQuery
            .OrderByDescending(h => h.ThoiDiemYeuCau)
            .Select(h => new HoanDangChoItem
            {
                MaHoanTien = h.MaHoanTien,
                MaYeuCau = h.MaYeuCau,
                MaDonThue = h.ChiTietThanhToanGoc.ThanhToan.MaDonThue,
                MaDonHienThi = h.ChiTietThanhToanGoc.ThanhToan.DonThue.MaDonHienThi,
                MucDichThuGoc = h.ChiTietThanhToanGoc.MucDich,
                SoTien = h.SoTien,
                TrangThai = h.TrangThai,
                ThoiDiemYeuCau = h.ThoiDiemYeuCau,
                LyDo = h.LyDo
            })
            .ToListAsync();

        // 4. Đối soát điều chỉnh đang xử lý (ChoChot)
        var dieuChinhDangXuLyQuery = _context.DoiSoatTienCocs.AsNoTracking()
            .Include(d => d.DonThue)
            .Where(d => d.MaDoiSoatGoc != null
                     && (d.TrangThai == DomainConstants.Status.PendingProcessing || d.TrangThai == "ChoChot"));

        if (filter.MaDon.HasValue)
            dieuChinhDangXuLyQuery = dieuChinhDangXuLyQuery.Where(d => d.MaDonThue == filter.MaDon.Value);

        var dieuChinhDangXuLys = await dieuChinhDangXuLyQuery
            .OrderByDescending(d => d.ThoiDiemLap)
            .Select(d => new DoiSoatDieuChinhDangXuLyItem
            {
                MaDoiSoatDieuChinh = d.MaDoiSoat,
                MaDoiSoatGoc = d.MaDoiSoatGoc!.Value,
                MaDonThue = d.MaDonThue,
                MaDonHienThi = d.DonThue.MaDonHienThi,
                ThoiDiemLap = d.ThoiDiemLap,
                TrangThai = d.TrangThai,
                LyDoDieuChinh = d.LyDoDieuChinh
            })
            .ToListAsync();

        // 5. Đơn hoàn tất thiếu đối soát gốc đã chốt
        var donHoanTatQuery = _context.DonThues.AsNoTracking()
            .Where(d => d.TrangThai == TrangThaiDonThue.HoanTat);

        if (filter.MaDon.HasValue)
            donHoanTatQuery = donHoanTatQuery.Where(d => d.MaDonThue == filter.MaDon.Value);

        var donHoanTats = await donHoanTatQuery
            .Select(d => new
            {
                d.MaDonThue,
                d.MaDonHienThi,
                d.ThoiDiemHoanTat,
                TienThueSauGiam = d.TongTienThueTruocGiam - d.TongTienGiam
            })
            .ToListAsync();

        var donIdsHoanTat = donHoanTats.Select(d => d.MaDonThue).ToList();
        var donCoDoiSoatChot = await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(ds => donIdsHoanTat.Contains(ds.MaDonThue)
                      && ds.MaDoiSoatGoc == null
                      && ds.TrangThai == DomainConstants.Status.Finalized)
            .Select(ds => ds.MaDonThue)
            .Distinct()
            .ToListAsync();

        var donThieuDoiSoat = donHoanTats
            .Where(d => !donCoDoiSoatChot.Contains(d.MaDonThue))
            .Select(d => new DonHoanTatThieuDoiSoatItem
            {
                MaDonThue = d.MaDonThue,
                MaDonHienThi = d.MaDonHienThi,
                ThoiDiemHoanTat = d.ThoiDiemHoanTat,
                TienThueSauGiam = d.TienThueSauGiam
            })
            .ToList();

        var meta = new BaoCaoTaiChinhMeta
        {
            ThoiDiemLayDuLieu = _clock.GetUtcNow().UtcDateTime,
            MuiGioHienThi = "Asia/Ho_Chi_Minh (UTC+7)",
            DonViTien = "VND",
            MocLoc = "DanhSachCacKhoanChuaHoanTatHoacNgoaiLe",
            GhiChu = new List<string>
            {
                "Danh sách các khoản chờ xử lý, khoản tiền sai lệch cần đối chiếu hoặc chứng từ thiếu sót.",
                "Các nhóm khoản mục có thể cùng phát sinh từ một đơn; không cộng dồn thành một tổng nợ duy nhất."
            }
        };

        var response = new KhoanCanXuLyBaoCaoResponse
        {
            Meta = meta,
            SoKhoanThuCanDoiChieu = thuCanDoiChieus.Count,
            TongTienThuCanDoiChieu = thuCanDoiChieus.Sum(t => t.TongSoTien),
            SoKhoanThuChoPhanLoai = thuChoPhanLoais.Count,
            TongTienThuChoPhanLoai = thuChoPhanLoais.Sum(t => t.TienChoPhanLoai),
            SoKhoanHoanDangCho = hoanDangChos.Count,
            TongTienHoanDangCho = hoanDangChos.Sum(h => h.SoTien),
            SoDoiSoatDieuChinhDangXuLy = dieuChinhDangXuLys.Count,
            SoDonHoanTatThieuDoiSoat = donThieuDoiSoat.Count,

            ThuCanDoiChieuItems = thuCanDoiChieus,
            ThuChoPhanLoaiItems = thuChoPhanLoais,
            HoanDangChoItems = hoanDangChos,
            DoiSoatDieuChinhDangXuLyItems = dieuChinhDangXuLys,
            DonHoanTatThieuDoiSoatItems = donThieuDoiSoat
        };

        return Result<KhoanCanXuLyBaoCaoResponse>.Ok(response);
    }

    // ───────────────────────────── 7. Xuất CSV ─────────────────────────────

    public async Task<Result<TepCsvKetQua>> XuatCsvAsync(XuatCsvTaiChinhRequest request, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<TepCsvKetQua>(actorId);
        if (loiQuyen != null)
            return loiQuyen;

        if (!LoaiBaoCaoTaiChinhXuat.TatCa.Contains(request.LoaiBaoCao))
        {
            return Result<TepCsvKetQua>.Loi(
                "LOAI_XUAT_KHONG_HO_TRO",
                $"Loại báo cáo '{request.LoaiBaoCao}' không được hỗ trợ. Các loại hợp lệ: {string.Join(", ", LoaiBaoCaoTaiChinhXuat.TatCa)}.");
        }

        var filter = new LocTaiChinhRequest
        {
            TuNgay = request.TuNgay,
            DenNgay = request.DenNgay,
            MaDon = request.MaDon,
            Trang = 1,
            SoMoiTrang = SoDongXuatToiDa
        };

        var tieuDe = new List<string>();
        var dong = new List<List<object?>>();

        switch (request.LoaiBaoCao)
        {
            case LoaiBaoCaoTaiChinhXuat.DoanhThuHoanTat:
                var dtResult = await LayDoanhThuHoanTatAsync(filter, actorId);
                if (!dtResult.ThanhCong) return Result<TepCsvKetQua>.Loi(dtResult.MaLoi!, dtResult.ThongDiep!);
                tieuDe = new()
                {
                    "Mã đơn", "Mã đơn hiển thị", "Thời điểm hoàn tất (VN)",
                    "Tiền thuê trước giảm", "Tiền giảm", "Tiền thuê sau giảm",
                    "Phụ phí đối soát ban đầu", "Tổng doanh thu", "Mã đối soát gốc", "Ngoại lệ thiếu đối soát"
                };
                foreach (var item in dtResult.DuLieu!.Items)
                {
                    dong.Add(new()
                    {
                        item.MaDonThue, item.MaDonHienThi, DinhDangGioVn(item.ThoiDiemHoanTat),
                        item.TienThueTruocGiam, item.TienGiam, item.TienThueSauGiam,
                        item.PhuPhiDoiSoatBanDau, item.TongDoanhThu, item.MaDoiSoatGoc, item.CoNgoaiLeThieuDoiSoat
                    });
                }
                break;

            case LoaiBaoCaoTaiChinhXuat.PhiHuy:
                var phResult = await LayPhiHuyAsync(filter, actorId);
                if (!phResult.ThanhCong) return Result<TepCsvKetQua>.Loi(phResult.MaLoi!, phResult.ThongDiep!);
                tieuDe = new()
                {
                    "Mã đơn", "Mã đơn hiển thị", "Thời điểm hủy (VN)", "Lý do hủy",
                    "Phí thuê giữ lại", "Tiền thuê trước giảm", "Tiền giảm", "Tiền cọc"
                };
                foreach (var item in phResult.DuLieu!.Items)
                {
                    dong.Add(new()
                    {
                        item.MaDonThue, item.MaDonHienThi, DinhDangGioVn(item.ThoiDiemHuy), item.LyDoHuy,
                        item.TienThueGiuLai, item.TienThueTruocGiam, item.TienGiam, item.TienCoc
                    });
                }
                break;

            case LoaiBaoCaoTaiChinhXuat.DieuChinhDoanhThu:
                var dcResult = await LayDieuChinhDoanhThuAsync(filter, actorId);
                if (!dcResult.ThanhCong) return Result<TepCsvKetQua>.Loi(dcResult.MaLoi!, dcResult.ThongDiep!);
                tieuDe = new()
                {
                    "Mã đối soát điều chỉnh", "Mã đối soát gốc", "Mã đơn", "Mã đơn hiển thị",
                    "Thời điểm chốt (VN)", "Lý do điều chỉnh", "Phụ phí gốc", "Phụ phí sau điều chỉnh",
                    "Delta phụ phí", "Người chốt"
                };
                foreach (var item in dcResult.DuLieu!.Items)
                {
                    dong.Add(new()
                    {
                        item.MaDoiSoatDieuChinh, item.MaDoiSoatGoc, item.MaDonThue, item.MaDonHienThi,
                        DinhDangGioVn(item.ThoiDiemChotDieuChinh), item.LyDoDieuChinh, item.PhuPhiGoc, item.PhuPhiSauDieuChinh,
                        item.DeltaPhuPhi, item.TenNguoiChot
                    });
                }
                break;

            case LoaiBaoCaoTaiChinhXuat.ThuHoan:
                var thResult = await LayThuHoanAsync(filter, actorId);
                if (!thResult.ThanhCong) return Result<TepCsvKetQua>.Loi(thResult.MaLoi!, thResult.ThongDiep!);
                tieuDe = new()
                {
                    "Loại giao dịch", "Mã giao dịch", "Mã yêu cầu", "Mã đơn", "Mã đơn hiển thị",
                    "Thời điểm thành công (VN)", "Số tiền", "Phân loại nguồn", "Trạng thái đối chiếu"
                };
                foreach (var t in thResult.DuLieu!.GiaoDichThus)
                {
                    dong.Add(new()
                    {
                        "Thu", t.MaThanhToan, t.MaYeuCau, t.MaDonThue, t.MaDonHienThi,
                        DinhDangGioVn(t.ThoiDiemThanhCong), t.TongSoTien,
                        $"Thuê:{t.TienThue} Cọc:{t.TienCoc} BổSung:{t.ThuBoSung} Chờ:{t.ChoPhanLoai}",
                        t.TrangThaiDoiChieu
                    });
                }
                foreach (var h in thResult.DuLieu!.KhoanHoans)
                {
                    dong.Add(new()
                    {
                        "Hoàn", h.MaHoanTien, h.MaYeuCau, h.MaDonThue, h.MaDonHienThi,
                        DinhDangGioVn(h.ThoiDiemThanhCong), -h.SoTien,
                        h.MucDichThuGoc, h.LoaiHoan
                    });
                }
                break;

            case LoaiBaoCaoTaiChinhXuat.CocChuaTatToan:
                var cResult = await LayCocChuaTatToanAsync(filter, actorId);
                if (!cResult.ThanhCong) return Result<TepCsvKetQua>.Loi(cResult.MaLoi!, cResult.ThongDiep!);
                tieuDe = new()
                {
                    "Mã đơn", "Mã đơn hiển thị", "Khách hàng", "Trạng thái đơn", "Ngày đặt (VN)",
                    "Cọc đã thu", "Cọc đã hoàn", "Cọc đã bù phụ phí", "Cọc còn giữ", "Trạng thái đối soát"
                };
                foreach (var item in cResult.DuLieu!.Items)
                {
                    dong.Add(new()
                    {
                        item.MaDonThue, item.MaDonHienThi, item.TenKhachHang, item.TrangThaiDon,
                        DinhDangGioVn(item.NgayDat), item.CocDaThu, item.CocDaHoan, item.CocDaBuPhuPhi,
                        item.CocConGiu, item.TrangThaiDoiSoat
                    });
                }
                break;

            case LoaiBaoCaoTaiChinhXuat.CanXuLy:
                var cxResult = await LayKhoanCanXuLyAsync(filter, actorId);
                if (!cxResult.ThanhCong) return Result<TepCsvKetQua>.Loi(cxResult.MaLoi!, cxResult.ThongDiep!);
                tieuDe = new()
                {
                    "Nhóm khoản mục", "Mã ID", "Mã đơn hiển thị", "Số tiền", "Mô tả / Trạng thái"
                };
                foreach (var t in cxResult.DuLieu!.ThuCanDoiChieuItems)
                {
                    dong.Add(new() { "Thu cần đối chiếu", t.MaThanhToan, t.MaDonHienThi, t.TongSoTien, t.TrangThaiDoiChieu });
                }
                foreach (var t in cxResult.DuLieu!.ThuChoPhanLoaiItems)
                {
                    dong.Add(new() { "Thu chờ phân loại", t.MaThanhToan, t.MaDonHienThi, t.TienChoPhanLoai, "Chưa phân bổ đủ chi tiết" });
                }
                foreach (var h in cxResult.DuLieu!.HoanDangChoItems)
                {
                    dong.Add(new() { "Hoàn tiền đang chờ", h.MaHoanTien, h.MaDonHienThi, h.SoTien, h.TrangThai });
                }
                foreach (var d in cxResult.DuLieu!.DoiSoatDieuChinhDangXuLyItems)
                {
                    dong.Add(new() { "Đối soát điều chỉnh chờ chốt", d.MaDoiSoatDieuChinh, d.MaDonHienThi, 0, d.LyDoDieuChinh });
                }
                foreach (var d in cxResult.DuLieu!.DonHoanTatThieuDoiSoatItems)
                {
                    dong.Add(new() { "Đơn hoàn tất thiếu đối soát", d.MaDonThue, d.MaDonHienThi, d.TienThueSauGiam, d.GhiChu });
                }
                break;
        }

        if (dong.Count > SoDongXuatToiDa)
        {
            return Result<TepCsvKetQua>.Loi(
                "VUOT_GIOI_HAN_XUAT",
                $"Báo cáo có {dong.Count} dòng, vượt giới hạn {SoDongXuatToiDa}. Vui lòng thu hẹp bộ lọc ngày hoặc mã đơn.");
        }

        var thoiDiemFile = (_clock.GetUtcNow().UtcDateTime + LechGioVn).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
        var tep = new TepCsvKetQua
        {
            TenTep = $"bao-cao-tai-chinh-{request.LoaiBaoCao}-{thoiDiemFile}.csv",
            NoiDung = DungCsv(tieuDe, dong)
        };

        return Result<TepCsvKetQua>.Ok(tep);
    }

    // ───────────────────────────── Helper nội bộ ─────────────────────────────

    private async Task<Result<T>?> KiemTraQuyenQuanTriAsync<T>(long actorId)
    {
        try
        {
            var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
            if (tk.VaiTro != VaiTroQuanTri)
            {
                return Result<T>.Loi("KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH", "Chỉ quản trị viên mới có quyền xem báo cáo tài chính.");
            }
            return null;
        }
        catch (Exception ex)
        {
            return Result<T>.Loi("KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH", ex.Message);
        }
    }


    private sealed record KhoangNgay(DateTime TuNgay, DateTime DenNgay, DateTime TuUtc, DateTime DenUtc);

    private (KhoangNgay? Khoang, string? Loi) TinhKhoangNgay(DateTime? tuNgay, DateTime? denNgay)
    {
        var homNayVn = (_clock.GetUtcNow().UtcDateTime + LechGioVn).Date;
        var den = (denNgay ?? homNayVn).Date;
        var tu = tuNgay.HasValue
            ? tuNgay.Value.Date
            : den.AddDays(-(DomainConstants.Policies.DefaultReportDays - 1));

        if (tu > den)
            return (null, "Từ ngày phải nhỏ hơn hoặc bằng đến ngày.");

        if ((den - tu).Days + 1 > SoNgayToiDa)
            return (null, $"Khoảng ngày vượt quá {SoNgayToiDa} ngày. Vui lòng thu hẹp bộ lọc.");

        var tuUtc = DateTime.SpecifyKind(tu - LechGioVn, DateTimeKind.Utc);
        var denUtc = DateTime.SpecifyKind(den.AddDays(1) - LechGioVn, DateTimeKind.Utc);

        return (new KhoangNgay(tu, den, tuUtc, denUtc), null);
    }

    private BaoCaoTaiChinhMeta TaoMeta(KhoangNgay? k, string mocLoc, params string?[] ghiChu)
    {
        return new BaoCaoTaiChinhMeta
        {
            ThoiDiemLayDuLieu = _clock.GetUtcNow().UtcDateTime,
            MuiGioHienThi = "Asia/Ho_Chi_Minh (UTC+7)",
            DonViTien = "VND",
            TuNgay = k?.TuNgay,
            DenNgay = k?.DenNgay,
            TuUtc = k?.TuUtc,
            DenUtcKhongBaoGom = k?.DenUtc,
            MocLoc = mocLoc,
            GhiChu = ghiChu.Where(g => !string.IsNullOrWhiteSpace(g)).Select(g => g!).ToList()
        };
    }

    private static (int Trang, int SoMoiTrang) ChuanHoaPhanTrang(int trang, int soMoiTrang)
    {
        int size = soMoiTrang <= 0 ? DomainConstants.Policies.DefaultPageSize
            : Math.Min(soMoiTrang, DomainConstants.Policies.MaxPageSize);
        return (Math.Max(1, trang), size);
    }

    private static string? DinhDangGioVn(DateTime? utc) =>
        utc.HasValue ? (utc.Value + LechGioVn).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) : null;

    private static byte[] DungCsv(IReadOnlyList<string> tieuDe, IReadOnlyList<List<object?>> dong)
    {
        var sb = new StringBuilder();
        sb.Append(string.Join(",", tieuDe.Select(t => VanBanAnToan(t))));
        foreach (var r in dong)
        {
            sb.Append("\r\n");
            sb.Append(string.Join(",", r.Select(ODataAnToan)));
        }

        var utf8Bom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        return utf8Bom.GetPreamble().Concat(utf8Bom.GetBytes(sb.ToString())).ToArray();
    }

    private static string ODataAnToan(object? v) => v switch
    {
        null => string.Empty,
        string s => VanBanAnToan(s),
        decimal d => d.ToString("0.##", CultureInfo.InvariantCulture),
        double d => d.ToString("0.##", CultureInfo.InvariantCulture),
        int i => i.ToString(CultureInfo.InvariantCulture),
        long l => l.ToString(CultureInfo.InvariantCulture),
        bool b => b ? "true" : "false",
        _ => VanBanAnToan(Convert.ToString(v, CultureInfo.InvariantCulture) ?? string.Empty)
    };

    private static string VanBanAnToan(string s)
    {
        if (s.Length > 0 && "=+-@\t\r".Contains(s[0]))
            s = "'" + s;
        return "\"" + s.Replace("\"", "\"\"") + "\"";
    }
}
