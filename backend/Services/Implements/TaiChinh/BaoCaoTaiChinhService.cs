using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

/// <summary>
/// Triển khai dịch vụ Báo cáo tài chính và số dư cần xử lý (W6-T5).
/// Tách bạch doanh thu hoàn tất, phí hủy, điều chỉnh sau hoàn tất, thu/hoàn thực tế và số dư cọc.
/// </summary>
public partial class BaoCaoTaiChinhService : IBaoCaoTaiChinhService
{
    private const string VaiTroQuanTri = "QuanTriVien";
    private const int SoNgayToiDa = 366;
    private const int SoDongXuatToiDa = 10_000;

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

    public async Task<Result<DoanhThuHoanTatBaoCaoResponse>> LayDoanhThuHoanTatAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<DoanhThuHoanTatBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<DoanhThuHoanTatBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        var donList = await TaiDonHoanTatAsync(khoang!, filter.MaDon);
        var donIds = donList.Select(d => d.MaDonThue).ToList();
        var doiSoatTheoDon = await TaiDoiSoatGocDaChotAsync(donIds);

        var items = new List<DoanhThuHoanTatDongItem>();
        decimal tongThueSauGiam = 0, tongPhuPhiBanDau = 0;

        foreach (var don in donList)
        {
            var coDs = doiSoatTheoDon.TryGetValue(don.MaDonThue, out var dsGoc);
            decimal phuPhi = coDs && dsGoc != null ? dsGoc.TongPhuPhiDuocDuyet : 0;
            tongThueSauGiam += don.TienThueSauGiam;
            tongPhuPhiBanDau += phuPhi;

            items.Add(new DoanhThuHoanTatDongItem
            {
                MaDonThue = don.MaDonThue, MaDonHienThi = don.MaDonHienThi, ThoiDiemHoanTat = don.ThoiDiemHoanTat,
                TienThueTruocGiam = don.TongTienThueTruocGiam, TienGiam = don.TongTienGiam, TienThueSauGiam = don.TienThueSauGiam,
                PhuPhiDoiSoatBanDau = phuPhi, TongDoanhThu = don.TienThueSauGiam + phuPhi,
                MaDoiSoatGoc = dsGoc?.MaDoiSoat, CoNgoaiLeThieuDoiSoat = !coDs,
                GhiChu = !coDs ? "Đơn hoàn tất nhưng chưa liên kết đối soát gốc đã chốt." : null
            });
        }

        var (trang, soMoiTrang) = BaoCaoCsvHelper.ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        return Result<DoanhThuHoanTatBaoCaoResponse>.Ok(new DoanhThuHoanTatBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemHoanTat", "Doanh thu = Tiền thuê sau giảm + Phụ phí đối soát ban đầu đã chốt (không cộng cọc)."),
            TongDoanhThuThueSauGiam = tongThueSauGiam, TongPhuPhiDoiSoatBanDau = tongPhuPhiBanDau,
            TongDoanhThuHoanTat = tongThueSauGiam + tongPhuPhiBanDau, SoDonHoanTat = items.Count,
            Items = items.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
            Trang = trang, SoMoiTrang = soMoiTrang, TongSo = items.Count
        });
    }

    public async Task<Result<PhiHuyBaoCaoResponse>> LayPhiHuyAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<PhiHuyBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<PhiHuyBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        var query = _context.DonThues.AsNoTracking()
            .Where(d => (d.TrangThai == TrangThaiDonThue.KhachHuy || d.TrangThai == TrangThaiDonThue.CuaHangHuy)
                     && d.ThoiDiemHuy != null && d.ThoiDiemHuy >= khoang!.TuUtc && d.ThoiDiemHuy < khoang!.DenUtc);
        if (filter.MaDon.HasValue) query = query.Where(d => d.MaDonThue == filter.MaDon.Value);

        var donHuyList = await query.OrderByDescending(d => d.ThoiDiemHuy).ThenByDescending(d => d.MaDonThue)
            .Select(d => new PhiHuyDongItem
            {
                MaDonThue = d.MaDonThue, MaDonHienThi = d.MaDonHienThi, ThoiDiemHuy = d.ThoiDiemHuy, LyDoHuy = d.LyDoHuy,
                TienThueGiuLai = d.TienThueGiuLaiKhiHuy, TienThueTruocGiam = d.TongTienThueTruocGiam,
                TienGiam = d.TongTienGiam, TienCoc = d.TongTienCoc
            }).ToListAsync();

        var (trang, soMoiTrang) = BaoCaoCsvHelper.ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        return Result<PhiHuyBaoCaoResponse>.Ok(new PhiHuyBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemHuy", "Phí hủy giữ lại từ tiền thuê thực thu theo quy tắc hủy; trình bày riêng, không coi là đơn hoàn tất."),
            TongPhiHuyGiuLai = donHuyList.Sum(d => d.TienThueGiuLai),
            SoDonHuyCoPhi = donHuyList.Count(d => d.TienThueGiuLai > 0),
            Items = donHuyList.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
            Trang = trang, SoMoiTrang = soMoiTrang, TongSo = donHuyList.Count
        });
    }

    public async Task<Result<DieuChinhDoanhThuBaoCaoResponse>> LayDieuChinhDoanhThuAsync(LocTaiChinhRequest filter, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<DieuChinhDoanhThuBaoCaoResponse>(actorId);
        if (loiQuyen != null) return loiQuyen;

        var (khoang, loiKhoang) = TinhKhoangNgay(filter.TuNgay, filter.DenNgay);
        if (loiKhoang != null)
            return Result<DieuChinhDoanhThuBaoCaoResponse>.Loi("KHOANG_BAO_CAO_KHONG_HOP_LE", loiKhoang);

        var query = _context.DoiSoatTienCocs.AsNoTracking()
            .Include(d => d.DonThue).Include(d => d.DoiSoatGoc).Include(d => d.NguoiChot)
            .Where(d => d.MaDoiSoatGoc != null && d.TrangThai == DomainConstants.Status.Finalized
                     && d.ThoiDiemChot != null && d.ThoiDiemChot >= khoang!.TuUtc && d.ThoiDiemChot < khoang!.DenUtc);
        if (filter.MaDon.HasValue) query = query.Where(d => d.MaDonThue == filter.MaDon.Value);

        var items = await query.OrderByDescending(d => d.ThoiDiemChot).ThenByDescending(d => d.MaDoiSoat)
            .Select(d => new DieuChinhDoanhThuDongItem
            {
                MaDoiSoatDieuChinh = d.MaDoiSoat, MaDoiSoatGoc = d.MaDoiSoatGoc!.Value, MaDonThue = d.MaDonThue,
                MaDonHienThi = d.DonThue.MaDonHienThi, ThoiDiemChotDieuChinh = d.ThoiDiemChot, LyDoDieuChinh = d.LyDoDieuChinh,
                PhuPhiSauDieuChinh = d.TongPhuPhiDuocDuyet, PhuPhiGoc = d.DoiSoatGoc != null ? d.DoiSoatGoc.TongPhuPhiDuocDuyet : 0,
                DeltaPhuPhi = d.TongPhuPhiDuocDuyet - (d.DoiSoatGoc != null ? d.DoiSoatGoc.TongPhuPhiDuocDuyet : 0),
                TenNguoiChot = d.TenNguoiChotLucDoiSoat ?? (d.NguoiChot != null ? d.NguoiChot.HoTen : null)
            }).ToListAsync();

        var (trang, soMoiTrang) = BaoCaoCsvHelper.ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);
        return Result<DieuChinhDoanhThuBaoCaoResponse>.Ok(new DieuChinhDoanhThuBaoCaoResponse
        {
            Meta = TaoMeta(khoang, "ThoiDiemChot", "Delta doanh thu = Phụ phí sau điều chỉnh - Phụ phí đối soát gốc; ghi nhận có dấu theo giờ chốt phiếu con."),
            TongDeltaDoanhThu = items.Sum(i => i.DeltaPhuPhi), SoPhieuDieuChinh = items.Count,
            Items = items.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
            Trang = trang, SoMoiTrang = soMoiTrang, TongSo = items.Count
        });
    }

    private sealed record DonHoanTatRow(long MaDonThue, string MaDonHienThi, DateTime? ThoiDiemHoanTat,
        decimal TongTienThueTruocGiam, decimal TongTienGiam, decimal TienThueSauGiam);
    private sealed record DoiSoatGocRow(long MaDoiSoat, long MaDonThue, decimal TongPhuPhiDuocDuyet);

    private async Task<List<DonHoanTatRow>> TaiDonHoanTatAsync(KhoangNgayBaoCao khoang, long? maDon)
    {
        var query = _context.DonThues.AsNoTracking()
            .Where(d => d.TrangThai == TrangThaiDonThue.HoanTat && d.ThoiDiemHoanTat != null
                     && d.ThoiDiemHoanTat >= khoang.TuUtc && d.ThoiDiemHoanTat < khoang.DenUtc);
        if (maDon.HasValue) query = query.Where(d => d.MaDonThue == maDon.Value);
        return await query.OrderByDescending(d => d.ThoiDiemHoanTat).ThenByDescending(d => d.MaDonThue)
            .Select(d => new DonHoanTatRow(d.MaDonThue, d.MaDonHienThi, d.ThoiDiemHoanTat,
                d.TongTienThueTruocGiam, d.TongTienGiam, d.TongTienThueTruocGiam - d.TongTienGiam))
            .ToListAsync();
    }

    private async Task<Dictionary<long, DoiSoatGocRow>> TaiDoiSoatGocDaChotAsync(List<long> donIds)
    {
        var list = await _context.DoiSoatTienCocs.AsNoTracking()
            .Where(ds => donIds.Contains(ds.MaDonThue) && ds.MaDoiSoatGoc == null && ds.TrangThai == DomainConstants.Status.Finalized)
            .Select(ds => new DoiSoatGocRow(ds.MaDoiSoat, ds.MaDonThue, ds.TongPhuPhiDuocDuyet))
            .ToListAsync();
        return list.GroupBy(ds => ds.MaDonThue).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.MaDoiSoat).First());
    }

    private (KhoangNgayBaoCao? Khoang, string? Loi) TinhKhoangNgay(DateTime? tuNgay, DateTime? denNgay) =>
        BaoCaoCsvHelper.TinhKhoangNgay(tuNgay, denNgay, _clock.GetUtcNow().UtcDateTime, SoNgayToiDa);

    private BaoCaoTaiChinhMeta TaoMeta(KhoangNgayBaoCao? k, string mocLoc, params string?[] ghiChu) => new()
    {
        ThoiDiemLayDuLieu = _clock.GetUtcNow().UtcDateTime,
        MuiGioHienThi = "Asia/Ho_Chi_Minh (UTC+7)", DonViTien = "VND",
        TuNgay = k?.TuNgay, DenNgay = k?.DenNgay, TuUtc = k?.TuUtc, DenUtcKhongBaoGom = k?.DenUtc,
        MocLoc = mocLoc, GhiChu = ghiChu.Where(g => !string.IsNullOrWhiteSpace(g)).Select(g => g!).ToList()
    };

    private async Task<Result<T>?> KiemTraQuyenQuanTriAsync<T>(long actorId)
    {
        try
        {
            var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
            return tk.VaiTro != VaiTroQuanTri
                ? Result<T>.Loi("KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH", "Chỉ quản trị viên mới có quyền xem báo cáo tài chính.")
                : null;
        }
        catch (Exception ex) { return Result<T>.Loi("KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH", ex.Message); }
    }
}
