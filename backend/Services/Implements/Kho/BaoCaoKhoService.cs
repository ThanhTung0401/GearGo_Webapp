using System;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Báo cáo nhập hàng, kho và bảo trì (UC25).
/// Đọc từ chứng từ thật; mỗi chỉ số tổng hợp ở đúng mức dữ liệu của nó để tránh nhân bản số liệu.
/// </summary>
public partial class BaoCaoKhoService : IBaoCaoKhoService
{
    private const string VaiTroQuanTri = "QuanTriVien";
    private const int SoNgayToiDa = 366;
    private const int SoDongXuatToiDa = 10_000;
    private const int SoThietBiHayHongToiDa = 10;

    private static readonly string[] LoaiDieuChinhAnhHuongNhap =
        { "SaiGiaNhap", "KhaiBaoThieuThietBi", "KhaiBaoTrungSaiThietBi" };

    private static readonly string[] TrangThaiBaoTriDangMo =
    {
        DomainConstants.Status.PendingProcessing,
        DomainConstants.Status.InProgress,
        DomainConstants.Status.PendingInspection
    };

    private readonly ApplicationDbContext _context;
    private readonly IKhoService _khoService;
    private readonly TimeProvider _clock;

    public BaoCaoKhoService(ApplicationDbContext context, IKhoService khoService, TimeProvider? clock = null)
    {
        _context = context;
        _khoService = khoService;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<Result<NhapHangResponse>> LayNhapHangAsync(LocNhapHangRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<NhapHangResponse>(actorId, canAdmin: true);
        if (chan != null) return chan;

        if (filter.CheDo != CheDoBaoCaoNhap.LoNhap)
        {
            return Result<NhapHangResponse>.Loi(
                DomainConstants.Errors.UnsupportedWarehouseReportMoment,
                "Báo cáo nhập hàng chỉ lọc theo lô nhập (LoNhap). Dùng báo cáo điều chỉnh nhập để xem phát sinh theo thời điểm áp dụng.");
        }

        var khoang = TinhKhoang(filter.TuNgay, filter.DenNgay);
        if (khoang.Loi != null)
            return Result<NhapHangResponse>.Loi(DomainConstants.Errors.InvalidTime, khoang.Loi);

        var du = await TaiDuLieuNhapAsync(filter, khoang.Khoang!);
        var (trang, soMoiTrang) = BaoCaoCsvHelper.ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);

        return Result<NhapHangResponse>.Ok(new NhapHangResponse
        {
            Meta = TaoMeta(khoang.Khoang, "PhieuNhapHang.NgayNhapThucTe",
                "Chỉ tính phiếu đã nhập kho. Giá trị hiệu lực là hiệu lực tại thời điểm truy vấn (gồm điều chỉnh về sau), không phải số bất biến tại cuối kỳ cũ.",
                filter.MaSanPhamNguon.HasValue
                    ? "Lọc theo sản phẩm nguồn: chỉ tính các dòng nhập của sản phẩm đó và điều chỉnh gắn với dòng đó."
                    : null),
            CheDo = CheDoBaoCaoNhap.LoNhap,
            TongSoPhieu = du.Phieu.Count,
            TongSoLuongGoc = du.Phieu.Sum(p => p.TongSoLuongGoc),
            TongGiaTriGoc = du.Phieu.Sum(p => p.TongGiaTriGoc),
            TongDeltaSoLuong = du.Phieu.Sum(p => p.DeltaSoLuong),
            TongDeltaGiaTri = du.Phieu.Sum(p => p.DeltaGiaTri),
            TongSoLuongHieuLuc = du.Phieu.Sum(p => p.TongSoLuongHieuLuc),
            TongGiaTriHieuLuc = du.Phieu.Sum(p => p.TongGiaTriHieuLuc),
            TheoSanPhamNguon = du.TheoSanPham,
            Phieu = new PagedResult<NhapHangPhieuItem>
            {
                Items = du.Phieu.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
                TotalItems = du.Phieu.Count,
                CurrentPage = trang,
                PageSize = soMoiTrang
            }
        });
    }

    public async Task<Result<DieuChinhNhapResponse>> LayDieuChinhNhapAsync(LocNhapHangRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<DieuChinhNhapResponse>(actorId, canAdmin: true);
        if (chan != null) return chan;

        var khoang = TinhKhoang(filter.TuNgay, filter.DenNgay);
        if (khoang.Loi != null)
            return Result<DieuChinhNhapResponse>.Loi(DomainConstants.Errors.InvalidTime, khoang.Loi);

        var items = await TaiDieuChinhNhapAsync(filter, khoang.Khoang!);
        var (trang, soMoiTrang) = BaoCaoCsvHelper.ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);

        return Result<DieuChinhNhapResponse>.Ok(new DieuChinhNhapResponse
        {
            Meta = TaoMeta(khoang.Khoang, "PhieuDieuChinhKho.ThoiDiemApDung",
                "Chỉ điều chỉnh đã áp dụng. Phiếu chờ duyệt/từ chối không tác động số liệu. Gồm cả điều chỉnh sửa phiếu nhập có ngày nhập ngoài kỳ."),
            SoPhieuDieuChinh = items.Count,
            TongDeltaSoLuong = items.Sum(i => i.DeltaSoLuong),
            TongDeltaGiaTri = items.Sum(i => i.DeltaGiaTri),
            Items = new PagedResult<DieuChinhNhapItem>
            {
                Items = items.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToList(),
                TotalItems = items.Count,
                CurrentPage = trang,
                PageSize = soMoiTrang
            }
        });
    }

    public async Task<Result<LichSuDonGiaResponse>> LayLichSuDonGiaAsync(LocNhapHangRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<LichSuDonGiaResponse>(actorId, canAdmin: true);
        if (chan != null) return chan;

        var khoang = TinhKhoang(filter.TuNgay, filter.DenNgay);
        if (khoang.Loi != null)
            return Result<LichSuDonGiaResponse>.Loi(DomainConstants.Errors.InvalidTime, khoang.Loi);

        return Result<LichSuDonGiaResponse>.Ok(await DungLichSuDonGiaAsync(filter, khoang.Khoang!));
    }

    public async Task<Result<HienTrangKhoBaoCaoResponse>> LayHienTrangKhoAsync(LocHienTrangKhoRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<HienTrangKhoBaoCaoResponse>(actorId, canAdmin: false);
        if (chan != null) return chan;
        bool laAdmin = await LaQuanTriAsync(actorId);

        // Tái dùng projection kho để số liệu hiện trạng hai nơi không lệch nhau.
        var tq = await _khoService.LayTongQuanKhoAsync(
            new LocKhoRequest { MaSanPhamHienTai = filter.MaSanPham }, actorId, laAdmin);
        if (!tq.ThanhCong)
            return Result<HienTrangKhoBaoCaoResponse>.Loi(tq.MaLoi!, tq.ThongDiep!);

        return Result<HienTrangKhoBaoCaoResponse>.Ok(AnhXaHienTrang(tq.DuLieu!, laAdmin));
    }

    public async Task<Result<BaoTriThongKeResponse>> LayThongKeBaoTriAsync(LocBaoTriRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<BaoTriThongKeResponse>(actorId, canAdmin: false);
        if (chan != null) return chan;
        bool laAdmin = await LaQuanTriAsync(actorId);

        return await DungThongKeBaoTriAsync(filter, laAdmin, SoThietBiHayHongToiDa);
    }

    private async Task<Result<T>?> ChanQuyenAsync<T>(long actorId, bool canAdmin)
    {
        var nv = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nv.ThanhCong) return Result<T>.Loi(nv.MaLoi!, nv.ThongDiep!);

        if (canAdmin && nv.DuLieu!.TaiKhoan?.VaiTro != VaiTroQuanTri)
        {
            return Result<T>.Loi(
                DomainConstants.Errors.ForbiddenCostInspection,
                "Báo cáo giá trị nhập hàng, điều chỉnh, lịch sử đơn giá và xuất file chỉ dành cho quản trị viên.");
        }
        return null;
    }

    private async Task<bool> LaQuanTriAsync(long actorId)
    {
        var nv = await _context.LayNhanVienDangHoatDongAsync(actorId);
        return nv.ThanhCong && nv.DuLieu!.TaiKhoan?.VaiTro == VaiTroQuanTri;
    }

    private (KhoangNgayBaoCao? Khoang, string? Loi) TinhKhoang(DateTime? tuNgay, DateTime? denNgay)
    {
        var homNayVn = (_clock.GetUtcNow().UtcDateTime + BaoCaoCsvHelper.LechGioVn).Date;
        var den = (denNgay ?? homNayVn).Date;
        var tu = tuNgay.HasValue
            ? tuNgay.Value.Date
            : den.AddDays(-(DomainConstants.Policies.DefaultReportDays - 1));

        if (tu > den) return (null, "TuNgay phải nhỏ hơn hoặc bằng DenNgay.");
        if ((den - tu).Days + 1 > SoNgayToiDa)
            return (null, $"Khoảng ngày vượt {SoNgayToiDa} ngày. Hãy thu hẹp bộ lọc.");

        var tuUtc = DateTime.SpecifyKind(tu - BaoCaoCsvHelper.LechGioVn, DateTimeKind.Utc);
        var denUtc = DateTime.SpecifyKind(den.AddDays(1) - BaoCaoCsvHelper.LechGioVn, DateTimeKind.Utc);
        return (new KhoangNgayBaoCao(tu, den, tuUtc, denUtc), null);
    }

    private BaoCaoKhoMeta TaoMeta(KhoangNgayBaoCao? k, string mocLoc, params string?[] ghiChu) => new()
    {
        ThoiDiemLayDuLieu = _clock.GetUtcNow().UtcDateTime,
        TuNgay = k?.TuNgay,
        DenNgay = k?.DenNgay,
        TuUtc = k?.TuUtc,
        DenUtcKhongBaoGom = k?.DenUtc,
        MocLoc = mocLoc,
        GhiChu = ghiChu.Where(g => !string.IsNullOrWhiteSpace(g)).Select(g => g!).ToList()
    };
}
