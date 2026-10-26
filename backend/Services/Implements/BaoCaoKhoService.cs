using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Queries;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Báo cáo nhập hàng, kho và bảo trì (W6-T6 - Minh Tú, UC25).
///
/// Nguyên tắc số liệu (bám Plan Week 6, mục 3.2 và 9):
/// - Đọc từ chứng từ thật; không thêm bảng/cột tổng. Tổng tiền dùng decimal.
/// - Mỗi chỉ số tổng hợp ở đúng mức dữ liệu của nó rồi mới ghép: nhập tính trên dòng phiếu nhập,
///   kho tính trên thiết bị, bảo trì tính trên phiếu bảo trì — không JOIN chéo các tầng rồi SUM (tránh nhân tiền).
/// - Điều chỉnh nhập dùng duy nhất công thức của <see cref="GiaTriNhapHieuLucQuery"/> (Tuần 5).
/// - Lịch sử nhập nhóm theo sản phẩm NGUỒN (chi tiết phiếu nhập); kho hiện tại nhóm theo sản phẩm HIỆN TẠI.
/// - Khoảng ngày Việt Nam được đổi một lần sang UTC nửa mở [00:00 ngày đầu, 00:00 ngày sau ngày cuối).
/// </summary>
public class BaoCaoKhoService : IBaoCaoKhoService
{
    private const string VaiTroQuanTri = "QuanTriVien";
    private const int SoNgayToiDa = 366;
    private const int SoDongXuatToiDa = 10_000;
    private const int SoThietBiHayHongToiDa = 10;
    private static readonly TimeSpan LechGioVn = TimeSpan.FromHours(7);

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

    // ═════════════════════════════ Nhập hàng ═════════════════════════════

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
        var (trang, soMoiTrang) = ChuanHoaTrang(filter.Trang, filter.SoMoiTrang);

        var res = new NhapHangResponse
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
        };
        return Result<NhapHangResponse>.Ok(res);
    }

    public async Task<Result<DieuChinhNhapResponse>> LayDieuChinhNhapAsync(LocNhapHangRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<DieuChinhNhapResponse>(actorId, canAdmin: true);
        if (chan != null) return chan;

        var khoang = TinhKhoang(filter.TuNgay, filter.DenNgay);
        if (khoang.Loi != null)
            return Result<DieuChinhNhapResponse>.Loi(DomainConstants.Errors.InvalidTime, khoang.Loi);

        var items = await TaiDieuChinhNhapAsync(filter, khoang.Khoang!);
        var (trang, soMoiTrang) = ChuanHoaTrang(filter.Trang, filter.SoMoiTrang);

        var res = new DieuChinhNhapResponse
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
        };
        return Result<DieuChinhNhapResponse>.Ok(res);
    }

    public async Task<Result<LichSuDonGiaResponse>> LayLichSuDonGiaAsync(LocNhapHangRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<LichSuDonGiaResponse>(actorId, canAdmin: true);
        if (chan != null) return chan;

        var khoang = TinhKhoang(filter.TuNgay, filter.DenNgay);
        if (khoang.Loi != null)
            return Result<LichSuDonGiaResponse>.Loi(DomainConstants.Errors.InvalidTime, khoang.Loi);

        var res = await DungLichSuDonGiaAsync(filter, khoang.Khoang!);
        return Result<LichSuDonGiaResponse>.Ok(res);
    }

    // ═════════════════════════════ Hiện trạng kho ═════════════════════════════

    public async Task<Result<HienTrangKhoBaoCaoResponse>> LayHienTrangKhoAsync(LocHienTrangKhoRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<HienTrangKhoBaoCaoResponse>(actorId, canAdmin: false);
        if (chan != null) return chan;
        bool laAdmin = await LaQuanTriAsync(actorId);

        // Tái dùng projection kho của Tuần 5 để số liệu hai nơi không lệch nhau.
        var tq = await _khoService.LayTongQuanKhoAsync(
            new LocKhoRequest { MaSanPhamHienTai = filter.MaSanPham }, actorId, laAdmin);
        if (!tq.ThanhCong)
            return Result<HienTrangKhoBaoCaoResponse>.Loi(tq.MaLoi!, tq.ThongDiep!);

        return Result<HienTrangKhoBaoCaoResponse>.Ok(AnhXaHienTrang(tq.DuLieu!, laAdmin));
    }

    // ═════════════════════════════ Bảo trì ═════════════════════════════

    public async Task<Result<BaoTriThongKeResponse>> LayThongKeBaoTriAsync(LocBaoTriRequest filter, long actorId)
    {
        var chan = await ChanQuyenAsync<BaoTriThongKeResponse>(actorId, canAdmin: false);
        if (chan != null) return chan;
        bool laAdmin = await LaQuanTriAsync(actorId);

        var res = await DungThongKeBaoTriAsync(filter, laAdmin, SoThietBiHayHongToiDa);
        return res;
    }

    // ═════════════════════════════ Xuất CSV ═════════════════════════════

    public async Task<Result<TepCsvKetQua>> XuatCsvAsync(XuatCsvKhoRequest request, long actorId)
    {
        var chan = await ChanQuyenAsync<TepCsvKetQua>(actorId, canAdmin: true);
        if (chan != null) return chan;

        if (!LoaiBaoCaoKhoXuat.TatCa.Contains(request.LoaiBaoCao))
        {
            return Result<TepCsvKetQua>.Loi(
                DomainConstants.Errors.UnsupportedExportType,
                $"Loại báo cáo '{request.LoaiBaoCao}' không được hỗ trợ xuất. Cho phép: {string.Join(", ", LoaiBaoCaoKhoXuat.TatCa)}.");
        }

        var locNhap = new LocNhapHangRequest
        {
            TuNgay = request.TuNgay,
            DenNgay = request.DenNgay,
            MaNhaCungCap = request.MaNhaCungCap,
            MaSanPhamNguon = request.MaSanPhamNguon,
            CheDo = request.CheDo
        };

        List<string> tieuDe;
        List<List<object?>> dong = new();

        switch (request.LoaiBaoCao)
        {
            case LoaiBaoCaoKhoXuat.NhapHang:
            {
                var kh = TinhKhoang(request.TuNgay, request.DenNgay);
                if (kh.Loi != null) return Result<TepCsvKetQua>.Loi(DomainConstants.Errors.ExportRangeTooLarge, kh.Loi);
                var du = await TaiDuLieuNhapAsync(locNhap, kh.Khoang!);
                tieuDe = new()
                {
                    "Mã phiếu nhập", "Số chứng từ NCC", "Nhà cung cấp lúc nhập", "Ngày nhập thực tế (giờ VN)",
                    "Mã sản phẩm nguồn", "Tên sản phẩm lúc nhập", "Số lượng gốc", "Đơn giá gốc (VND)",
                    "Giá trị gốc (VND)", "Delta số lượng", "Delta giá trị (VND)", "Số lượng hiệu lực", "Giá trị hiệu lực (VND)"
                };
                foreach (var p in du.Phieu)
                    foreach (var d in p.Dong)
                        dong.Add(new()
                        {
                            p.MaPhieuHienThi, p.SoChungTuNhaCungCap, p.NhaCungCapLucNhap ?? p.TenNhaCungCapHienTai,
                            GioVn(p.NgayNhapThucTe), d.MaSanPhamNguon, d.TenSanPhamLucNhap, d.SoLuongGoc, d.DonGiaGoc,
                            d.GiaTriGoc, d.DeltaSoLuong, d.DeltaGiaTri, d.SoLuongHieuLuc, d.GiaTriHieuLuc
                        });
                break;
            }
            case LoaiBaoCaoKhoXuat.DieuChinhNhap:
            {
                var kh = TinhKhoang(request.TuNgay, request.DenNgay);
                if (kh.Loi != null) return Result<TepCsvKetQua>.Loi(DomainConstants.Errors.ExportRangeTooLarge, kh.Loi);
                var items = await TaiDieuChinhNhapAsync(locNhap, kh.Khoang!);
                tieuDe = new()
                {
                    "Mã phiếu điều chỉnh", "Mã phiếu nhập", "Loại điều chỉnh", "Lý do", "Thời điểm áp dụng (giờ VN)",
                    "Người duyệt", "Delta số lượng", "Delta giá trị (VND)", "Phiếu nhập ngoài kỳ"
                };
                foreach (var i in items)
                    dong.Add(new()
                    {
                        i.MaPhieuDieuChinh, i.MaPhieuNhapHienThi, i.LoaiDieuChinh, i.LyDo, GioVn(i.ThoiDiemApDung),
                        i.NguoiDuyet, i.DeltaSoLuong, i.DeltaGiaTri, i.PhieuNhapNgoaiKy ? "Có" : "Không"
                    });
                break;
            }
            case LoaiBaoCaoKhoXuat.LichSuDonGia:
            {
                var kh = TinhKhoang(request.TuNgay, request.DenNgay);
                if (kh.Loi != null) return Result<TepCsvKetQua>.Loi(DomainConstants.Errors.ExportRangeTooLarge, kh.Loi);
                var ls = await DungLichSuDonGiaAsync(locNhap, kh.Khoang!);
                tieuDe = new()
                {
                    "Mã sản phẩm nguồn", "Tên sản phẩm", "Thời điểm (giờ VN)", "Loại mốc", "Mã chứng từ", "Phiếu nhập nguồn",
                    "Số lượng", "Đơn giá (VND)", "Delta số lượng", "Delta giá trị (VND)", "Đơn giá bình quân gốc (VND)",
                    "Đơn giá bình quân hiệu lực (VND)"
                };
                foreach (var sp in ls.SanPham)
                    foreach (var m in sp.Moc)
                        dong.Add(new()
                        {
                            sp.MaSanPhamNguon, sp.TenSanPham, GioVn(m.ThoiDiem), m.Loai, m.MaChungTu, m.NguonNhapHienThi,
                            m.SoLuong, m.DonGia, m.DeltaSoLuong, m.DeltaGiaTri, sp.DonGiaBinhQuanGoc, sp.DonGiaBinhQuanHieuLuc
                        });
                break;
            }
            case LoaiBaoCaoKhoXuat.HienTrangKho:
            {
                var r = await LayHienTrangKhoAsync(new LocHienTrangKhoRequest { MaSanPham = request.MaSanPham }, actorId);
                if (!r.ThanhCong) return Result<TepCsvKetQua>.Loi(r.MaLoi!, r.ThongDiep!);
                tieuDe = new()
                {
                    "Mã sản phẩm hiện tại", "Tên sản phẩm", "Tổng hồ sơ", "Đang khai thác", "Sẵn sàng", "Đang thuê",
                    "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"
                };
                foreach (var s in r.DuLieu!.SanPham)
                    dong.Add(new()
                    {
                        s.MaSanPhamHienTai, s.TenSanPham, s.TongHoSo, s.DangKhaiThac, s.SanSang, s.DangThue,
                        s.DangBaoTri, s.ThatLac, s.NgungSuDung
                    });
                break;
            }
            default: // BaoTri
            {
                var r = await DungThongKeBaoTriAsync(
                    new LocBaoTriRequest
                    {
                        TuNgay = request.TuNgay, DenNgay = request.DenNgay,
                        MocLoc = request.MocLoc, LoaiXuLy = request.LoaiXuLy
                    },
                    laAdmin: true, topHayHong: int.MaxValue);
                if (!r.ThanhCong) return Result<TepCsvKetQua>.Loi(r.MaLoi!, r.ThongDiep!);
                tieuDe = new()
                {
                    "Mã thiết bị", "Mã sản phẩm hiện tại", "Tên sản phẩm hiện tại", "Số đợt sửa chữa", "Số lần thuê",
                    "Tổng giờ xử lý", "Tổng chi phí sửa (VND)"
                };
                foreach (var t in r.DuLieu!.ThietBiHayHong)
                    dong.Add(new()
                    {
                        t.MaThietBiHienThi, t.MaSanPhamHienTai, t.TenSanPhamHienTai, t.SoDotSuaChua, t.SoLanThue,
                        t.TongGioXuLy, t.TongChiPhiSua
                    });
                break;
            }
        }

        if (dong.Count > SoDongXuatToiDa)
        {
            return Result<TepCsvKetQua>.Loi(
                DomainConstants.Errors.ExportRangeTooLarge,
                $"Báo cáo có {dong.Count} dòng, vượt giới hạn {SoDongXuatToiDa}. Hãy thu hẹp bộ lọc; hệ thống không tự cắt file.");
        }

        var tep = new TepCsvKetQua
        {
            TenTep = $"bao-cao-kho-{request.LoaiBaoCao}-{(_clock.GetUtcNow().UtcDateTime + LechGioVn):yyyyMMddHHmmss}.csv",
            NoiDung = DungCsv(tieuDe, dong)
        };
        return Result<TepCsvKetQua>.Ok(tep);
    }

    // ═════════════════════════════ Truy vấn nội bộ ═════════════════════════════

    private sealed record KhoangNgay(DateTime TuNgay, DateTime DenNgay, DateTime TuUtc, DateTime DenUtc);

    private sealed class DuLieuNhap
    {
        public List<NhapHangPhieuItem> Phieu { get; init; } = new();
        public List<NhapHangTheoSanPhamItem> TheoSanPham { get; init; } = new();
        public List<GiaTriNhapHieuLucQuery.DeltaDongNhap> Deltas { get; init; } = new();
    }

    /// <summary>Phiếu đã nhập kho trong kỳ (theo ngày nhập thực tế) + dòng + delta hiệu lực; mọi tổng tính từ dòng nhập.</summary>
    private async Task<DuLieuNhap> TaiDuLieuNhapAsync(LocNhapHangRequest filter, KhoangNgay k)
    {
        long? sp = filter.MaSanPhamNguon;

        var phieuQuery = _context.PhieuNhapHangs.AsNoTracking()
            .Where(p => p.TrangThai == TrangThaiPhieuNhap.DaNhapKho
                        && p.NgayNhapThucTe != null
                        && p.NgayNhapThucTe >= k.TuUtc
                        && p.NgayNhapThucTe < k.DenUtc);
        if (filter.MaNhaCungCap.HasValue)
            phieuQuery = phieuQuery.Where(p => p.MaNhaCungCap == filter.MaNhaCungCap.Value);
        if (sp.HasValue)
            phieuQuery = phieuQuery.Where(p => p.ChiTietPhieuNhaps.Any(c => c.MaSanPham == sp.Value));

        var phieus = await phieuQuery
            .OrderByDescending(p => p.NgayNhapThucTe).ThenByDescending(p => p.MaPhieuNhap)
            .Select(p => new
            {
                p.MaPhieuNhap, p.MaPhieuHienThi, p.SoChungTuNhaCungCap, p.MaNhaCungCap,
                p.ThongTinNhaCungCapLucNhap, TenNcc = p.NhaCungCap.TenNhaCungCap, p.NgayNhapThucTe, p.TongTien
            })
            .ToListAsync();

        var ids = phieus.Select(p => p.MaPhieuNhap).ToList();

        var dongNhap = await _context.ChiTietPhieuNhaps.AsNoTracking()
            .Where(c => ids.Contains(c.MaPhieuNhap) && (!sp.HasValue || c.MaSanPham == sp.Value))
            .Select(c => new
            {
                c.MaChiTietPhieuNhap, c.MaPhieuNhap, c.MaSanPham, c.TenSanPhamLucNhap,
                TenHienTai = c.SanPham.TenSanPham, c.SoLuong, c.DonGiaNhap
            })
            .ToListAsync();

        var deltas = await GiaTriNhapHieuLucQuery.LayDeltaTheoDongAsync(_context, ids);
        var dongIds = dongNhap.Select(d => d.MaChiTietPhieuNhap).ToHashSet();

        // Delta gắn dòng cụ thể → theo dòng; delta không gắn dòng chỉ cộng ở cấp phiếu khi không lọc sản phẩm.
        var deltaTheoDong = deltas
            .Where(d => d.MaChiTietPhieuNhap.HasValue && dongIds.Contains(d.MaChiTietPhieuNhap.Value))
            .GroupBy(d => d.MaChiTietPhieuNhap!.Value)
            .ToDictionary(g => g.Key, g => (GiaTri: g.Sum(x => x.GiaTri), SoLuong: g.Sum(x => x.SoLuong)));
        var deltaKhongGanDong = sp.HasValue
            ? new Dictionary<long, (decimal GiaTri, int SoLuong)>()
            : deltas.Where(d => !d.MaChiTietPhieuNhap.HasValue)
                .GroupBy(d => d.MaPhieuNhap)
                .ToDictionary(g => g.Key, g => (GiaTri: g.Sum(x => x.GiaTri), SoLuong: g.Sum(x => x.SoLuong)));

        var dongTheoPhieu = dongNhap.ToLookup(d => d.MaPhieuNhap);
        var items = new List<NhapHangPhieuItem>();

        foreach (var p in phieus)
        {
            var item = new NhapHangPhieuItem
            {
                MaPhieuNhap = p.MaPhieuNhap,
                MaPhieuHienThi = p.MaPhieuHienThi,
                SoChungTuNhaCungCap = p.SoChungTuNhaCungCap,
                MaNhaCungCap = p.MaNhaCungCap,
                NhaCungCapLucNhap = p.ThongTinNhaCungCapLucNhap,
                TenNhaCungCapHienTai = p.TenNcc,
                NgayNhapThucTe = p.NgayNhapThucTe,
                TongTienGhiNhanTrenPhieu = p.TongTien
            };

            foreach (var d in dongTheoPhieu[p.MaPhieuNhap].OrderBy(x => x.MaChiTietPhieuNhap))
            {
                deltaTheoDong.TryGetValue(d.MaChiTietPhieuNhap, out var dl);
                decimal giaTriGoc = d.SoLuong * d.DonGiaNhap;
                item.Dong.Add(new NhapHangDongItem
                {
                    MaChiTietPhieuNhap = d.MaChiTietPhieuNhap,
                    MaSanPhamNguon = d.MaSanPham,
                    TenSanPhamLucNhap = d.TenSanPhamLucNhap ?? d.TenHienTai,
                    TenSanPhamHienTai = d.TenHienTai,
                    SoLuongGoc = d.SoLuong,
                    DonGiaGoc = d.DonGiaNhap,
                    GiaTriGoc = giaTriGoc,
                    DeltaSoLuong = dl.SoLuong,
                    DeltaGiaTri = dl.GiaTri,
                    SoLuongHieuLuc = d.SoLuong + dl.SoLuong,
                    GiaTriHieuLuc = giaTriGoc + dl.GiaTri
                });
            }

            deltaKhongGanDong.TryGetValue(p.MaPhieuNhap, out var kgd);
            item.TongSoLuongGoc = item.Dong.Sum(x => x.SoLuongGoc);
            item.TongGiaTriGoc = item.Dong.Sum(x => x.GiaTriGoc);
            item.DeltaSoLuong = item.Dong.Sum(x => x.DeltaSoLuong) + kgd.SoLuong;
            item.DeltaGiaTri = item.Dong.Sum(x => x.DeltaGiaTri) + kgd.GiaTri;
            item.TongSoLuongHieuLuc = item.TongSoLuongGoc + item.DeltaSoLuong;
            item.TongGiaTriHieuLuc = item.TongGiaTriGoc + item.DeltaGiaTri;
            item.LechTongTienPhieu = !sp.HasValue && item.TongGiaTriGoc != p.TongTien;
            items.Add(item);
        }

        var theoSp = items.SelectMany(i => i.Dong)
            .GroupBy(d => d.MaSanPhamNguon)
            .Select(g => new NhapHangTheoSanPhamItem
            {
                MaSanPhamNguon = g.Key,
                TenSanPham = g.First().TenSanPhamHienTai,
                SoLuongGoc = g.Sum(x => x.SoLuongGoc),
                GiaTriGoc = g.Sum(x => x.GiaTriGoc),
                DeltaSoLuong = g.Sum(x => x.DeltaSoLuong),
                DeltaGiaTri = g.Sum(x => x.DeltaGiaTri),
                SoLuongHieuLuc = g.Sum(x => x.SoLuongHieuLuc),
                GiaTriHieuLuc = g.Sum(x => x.GiaTriHieuLuc)
            })
            .OrderBy(x => x.MaSanPhamNguon)
            .ToList();

        return new DuLieuNhap { Phieu = items, TheoSanPham = theoSp, Deltas = deltas };
    }

    private async Task<List<DieuChinhNhapItem>> TaiDieuChinhNhapAsync(LocNhapHangRequest filter, KhoangNgay k)
    {
        long? sp = filter.MaSanPhamNguon;

        var query = _context.PhieuDieuChinhKhos.AsNoTracking()
            .Where(p => p.TrangThai == DomainConstants.Status.Applied
                        && p.MaPhieuNhapLienQuan != null
                        && p.LoaiDieuChinh != null
                        && LoaiDieuChinhAnhHuongNhap.Contains(p.LoaiDieuChinh)
                        && (p.ThoiDiemApDung ?? p.ThoiDiemLap) >= k.TuUtc
                        && (p.ThoiDiemApDung ?? p.ThoiDiemLap) < k.DenUtc
                        && p.PhieuNhapLienQuan!.TrangThai == TrangThaiPhieuNhap.DaNhapKho);
        if (filter.MaNhaCungCap.HasValue)
            query = query.Where(p => p.PhieuNhapLienQuan!.MaNhaCungCap == filter.MaNhaCungCap.Value);

        var pdcs = await query
            .Select(p => new
            {
                p.MaPhieuDieuChinh, p.LoaiDieuChinh, p.LyDo, ApDung = p.ThoiDiemApDung ?? p.ThoiDiemLap,
                MaPhieuNhap = p.MaPhieuNhapLienQuan!.Value,
                HienThi = p.PhieuNhapLienQuan!.MaPhieuHienThi,
                NgayNhap = p.PhieuNhapLienQuan!.NgayNhapThucTe
            })
            .ToListAsync();

        var phieuNhapIds = pdcs.Select(p => p.MaPhieuNhap).Distinct().ToList();
        var deltas = await GiaTriNhapHieuLucQuery.LayDeltaTheoDongAsync(_context, phieuNhapIds);

        HashSet<long>? dongCuaSanPham = null;
        if (sp.HasValue)
        {
            dongCuaSanPham = (await _context.ChiTietPhieuNhaps.AsNoTracking()
                .Where(c => phieuNhapIds.Contains(c.MaPhieuNhap) && c.MaSanPham == sp.Value)
                .Select(c => c.MaChiTietPhieuNhap)
                .ToListAsync()).ToHashSet();
        }

        var deltaTheoPdc = deltas.ToLookup(d => d.MaPhieuDieuChinh);
        var ketQua = new List<DieuChinhNhapItem>();

        foreach (var p in pdcs)
        {
            var rows = deltaTheoPdc[p.MaPhieuDieuChinh].AsEnumerable();
            if (dongCuaSanPham != null)
                rows = rows.Where(r => r.MaChiTietPhieuNhap.HasValue && dongCuaSanPham.Contains(r.MaChiTietPhieuNhap.Value));
            var list = rows.ToList();
            if (dongCuaSanPham != null && list.Count == 0) continue;

            ketQua.Add(new DieuChinhNhapItem
            {
                MaPhieuDieuChinh = p.MaPhieuDieuChinh,
                MaPhieuNhap = p.MaPhieuNhap,
                MaPhieuNhapHienThi = p.HienThi,
                LoaiDieuChinh = p.LoaiDieuChinh ?? string.Empty,
                LyDo = p.LyDo,
                ThoiDiemApDung = p.ApDung,
                NguoiDuyet = list.Select(r => r.NguoiDuyet).FirstOrDefault(),
                DeltaSoLuong = list.Sum(r => r.SoLuong),
                DeltaGiaTri = list.Sum(r => r.GiaTri),
                NgayNhapThucTe = p.NgayNhap,
                PhieuNhapNgoaiKy = !p.NgayNhap.HasValue || p.NgayNhap < k.TuUtc || p.NgayNhap >= k.DenUtc
            });
        }

        return ketQua.OrderByDescending(i => i.ThoiDiemApDung).ThenByDescending(i => i.MaPhieuDieuChinh).ToList();
    }

    private async Task<LichSuDonGiaResponse> DungLichSuDonGiaAsync(LocNhapHangRequest filter, KhoangNgay k)
    {
        var du = await TaiDuLieuNhapAsync(filter, k);

        var mocTheoSp = new Dictionary<long, List<MocDonGiaItem>>();
        var dongTheoMa = new Dictionary<long, (long MaSp, string MaPhieu)>();
        var nhapRows = new List<(long MaSp, string Ten, int Sl, decimal Gia)>();

        foreach (var p in du.Phieu)
            foreach (var d in p.Dong)
            {
                dongTheoMa[d.MaChiTietPhieuNhap] = (d.MaSanPhamNguon, p.MaPhieuHienThi);
                nhapRows.Add((d.MaSanPhamNguon, d.TenSanPhamHienTai, d.SoLuongGoc, d.DonGiaGoc));
                if (!mocTheoSp.TryGetValue(d.MaSanPhamNguon, out var ds))
                    mocTheoSp[d.MaSanPhamNguon] = ds = new();
                ds.Add(new MocDonGiaItem
                {
                    ThoiDiem = p.NgayNhapThucTe ?? DateTime.MinValue,
                    Loai = "Nhap",
                    MaChungTu = p.MaPhieuHienThi,
                    NguonNhapHienThi = p.MaPhieuHienThi,
                    SoLuong = d.SoLuongGoc,
                    DonGia = d.DonGiaGoc
                });
            }

        foreach (var dl in du.Deltas.Where(x => x.MaChiTietPhieuNhap.HasValue && dongTheoMa.ContainsKey(x.MaChiTietPhieuNhap.Value)))
        {
            var (maSp, maPhieu) = dongTheoMa[dl.MaChiTietPhieuNhap!.Value];
            mocTheoSp[maSp].Add(new MocDonGiaItem
            {
                ThoiDiem = dl.ThoiDiemApDung,
                Loai = "DieuChinh",
                MaChungTu = $"DC-{dl.MaPhieuDieuChinh}",
                NguonNhapHienThi = maPhieu,
                DeltaGiaTri = dl.GiaTri,
                DeltaSoLuong = dl.SoLuong
            });
        }

        var sanPhams = new List<LichSuDonGiaSanPhamItem>();
        foreach (var tsp in du.TheoSanPham)
        {
            var gocRows = nhapRows.Where(r => r.MaSp == tsp.MaSanPhamNguon).ToList();
            sanPhams.Add(new LichSuDonGiaSanPhamItem
            {
                MaSanPhamNguon = tsp.MaSanPhamNguon,
                TenSanPham = tsp.TenSanPham,
                SoLanNhap = gocRows.Count,
                TongSoLuongGoc = tsp.SoLuongGoc,
                TongGiaTriGoc = tsp.GiaTriGoc,
                DonGiaBinhQuanGoc = ChiaAnToan(tsp.GiaTriGoc, tsp.SoLuongGoc),
                TongSoLuongHieuLuc = tsp.SoLuongHieuLuc,
                TongGiaTriHieuLuc = tsp.GiaTriHieuLuc,
                DonGiaBinhQuanHieuLuc = ChiaAnToan(tsp.GiaTriHieuLuc, tsp.SoLuongHieuLuc),
                DonGiaThapNhat = gocRows.Count > 0 ? gocRows.Min(r => r.Gia) : null,
                DonGiaCaoNhat = gocRows.Count > 0 ? gocRows.Max(r => r.Gia) : null,
                Moc = mocTheoSp[tsp.MaSanPhamNguon].OrderBy(m => m.ThoiDiem).ThenBy(m => m.Loai == "Nhap" ? 0 : 1).ToList()
            });
        }

        return new LichSuDonGiaResponse
        {
            Meta = TaoMeta(k, "PhieuNhapHang.NgayNhapThucTe",
                "Đơn giá bình quân = tổng giá trị / tổng số lượng cùng tập dữ liệu (không trung bình cộng đơn giá). Mẫu số 0 trả null.",
                "Nhóm theo sản phẩm nguồn của dòng nhập; không đổi khi thiết bị sau này bị giáng cấp."),
            SanPham = sanPhams
        };
    }

    private async Task<Result<BaoTriThongKeResponse>> DungThongKeBaoTriAsync(LocBaoTriRequest filter, bool laAdmin, int topHayHong)
    {
        if (filter.MocLoc != MocLocBaoTri.NgayBatDau && filter.MocLoc != MocLocBaoTri.NgayHoanThanh)
        {
            return Result<BaoTriThongKeResponse>.Loi(
                DomainConstants.Errors.UnsupportedWarehouseReportMoment,
                $"Mốc lọc '{filter.MocLoc}' không hợp lệ. Dùng {MocLocBaoTri.NgayBatDau} hoặc {MocLocBaoTri.NgayHoanThanh}.");
        }

        if (filter.LoaiXuLy != null
            && filter.LoaiXuLy != DomainConstants.Maintenance.TypeCleaning
            && filter.LoaiXuLy != DomainConstants.Maintenance.TypeRepair)
        {
            return Result<BaoTriThongKeResponse>.Loi(
                DomainConstants.Errors.InvalidData,
                $"Loại xử lý '{filter.LoaiXuLy}' không hợp lệ. Dùng {DomainConstants.Maintenance.TypeCleaning} hoặc {DomainConstants.Maintenance.TypeRepair}.");
        }

        var kh = TinhKhoang(filter.TuNgay, filter.DenNgay);
        if (kh.Loi != null) return Result<BaoTriThongKeResponse>.Loi(DomainConstants.Errors.InvalidTime, kh.Loi);
        var k = kh.Khoang!;

        var query = _context.PhieuBaoTris.AsNoTracking().AsQueryable();
        query = filter.MocLoc == MocLocBaoTri.NgayBatDau
            ? query.Where(p => p.NgayBatDau != null && p.NgayBatDau >= k.TuUtc && p.NgayBatDau < k.DenUtc)
            : query.Where(p => p.NgayHoanThanhThucTe != null && p.NgayHoanThanhThucTe >= k.TuUtc && p.NgayHoanThanhThucTe < k.DenUtc);
        if (filter.LoaiXuLy != null)
            query = query.Where(p => p.LoaiXuLy == filter.LoaiXuLy);

        // Một dòng = một phiếu bảo trì; không JOIN qua lịch thuê/phân công nên không nhân bản.
        var rows = await query.Select(p => new
        {
            p.MaPhieuBaoTri, p.MaThietBi, p.LoaiXuLy, p.TrangThai, p.ChiPhi, p.NgayBatDau, p.NgayHoanThanhThucTe,
            MaThietBiHienThi = p.ThietBi.MaThietBiHienThi,
            MaSp = p.ThietBi.MaSanPhamHienTai,
            TenSp = p.ThietBi.SanPhamHienTai.TenSanPham
        }).ToListAsync();

        bool Mo(string tt) => TrangThaiBaoTriDangMo.Contains(tt);
        bool DaKetLuan(string tt) => tt == DomainConstants.Status.Completed || tt == DomainConstants.Status.Failed;

        var res = new BaoTriThongKeResponse
        {
            Meta = TaoMeta(k,
                filter.MocLoc == MocLocBaoTri.NgayBatDau ? "PhieuBaoTri.NgayBatDau" : "PhieuBaoTri.NgayHoanThanhThucTe",
                "Vệ sinh và sửa chữa được tách riêng; chỉ sửa chữa mới được coi là đợt hỏng. Chi phí đang mở là dự kiến, chi phí đã chốt tính riêng; cả hai không phải phụ phí khách đã nộp."),
            MocLoc = filter.MocLoc,
            TongSoPhieu = rows.Count,
            SoPhieuVeSinh = rows.Count(r => r.LoaiXuLy == DomainConstants.Maintenance.TypeCleaning),
            SoPhieuSuaChua = rows.Count(r => r.LoaiXuLy == DomainConstants.Maintenance.TypeRepair),
            SoPhieuDangMo = rows.Count(r => Mo(r.TrangThai)),
            SoPhieuDat = rows.Count(r => r.TrangThai == DomainConstants.Status.Completed),
            SoPhieuKhongDat = rows.Count(r => r.TrangThai == DomainConstants.Status.Failed)
        };

        if (laAdmin)
        {
            res.ChiPhiDangXuLy = rows.Where(r => Mo(r.TrangThai)).Sum(r => r.ChiPhi ?? 0m);
            res.ChiPhiDaChot = rows.Where(r => DaKetLuan(r.TrangThai)).Sum(r => r.ChiPhi ?? 0m);
        }

        var nhomSua = rows.Where(r => r.LoaiXuLy == DomainConstants.Maintenance.TypeRepair)
            .GroupBy(r => r.MaThietBi)
            .Select(g => new
            {
                MaThietBi = g.Key,
                First = g.First(),
                SoDot = g.Count(),
                Gio = g.Where(x => x.NgayBatDau.HasValue && x.NgayHoanThanhThucTe.HasValue)
                       .Select(x => (x.NgayHoanThanhThucTe!.Value - x.NgayBatDau!.Value).TotalHours).ToList(),
                ChiPhi = g.Sum(x => x.ChiPhi ?? 0m)
            })
            .OrderByDescending(x => x.SoDot).ThenByDescending(x => x.ChiPhi).ThenBy(x => x.MaThietBi)
            .Take(topHayHong)
            .ToList();

        var thietBiIds = nhomSua.Select(x => x.MaThietBi).ToList();
        string[] daGiao = { DomainConstants.Status.Delivered, DomainConstants.Status.Finalized };
        var soLanThue = thietBiIds.Count == 0
            ? new Dictionary<long, int>()
            : (await _context.ChiTietBanGiaos.AsNoTracking()
                .Where(c => thietBiIds.Contains(c.PhanCongThietBi.MaThietBi) && daGiao.Contains(c.PhieuBanGiao.TrangThai))
                .GroupBy(c => c.PhanCongThietBi.MaThietBi)
                .Select(g => new { MaThietBi = g.Key, N = g.Count() })
                .ToListAsync()).ToDictionary(x => x.MaThietBi, x => x.N);

        res.ThietBiHayHong = nhomSua.Select(x => new ThietBiSuaChuaItem
        {
            MaThietBi = x.MaThietBi,
            MaThietBiHienThi = x.First.MaThietBiHienThi,
            MaSanPhamHienTai = x.First.MaSp,
            TenSanPhamHienTai = x.First.TenSp,
            SoDotSuaChua = x.SoDot,
            SoLanThue = soLanThue.TryGetValue(x.MaThietBi, out var n) ? n : 0,
            TongGioXuLy = x.Gio.Count > 0 ? Math.Round(x.Gio.Sum(), 2) : null,
            TongChiPhiSua = laAdmin ? x.ChiPhi : null
        }).ToList();

        return Result<BaoTriThongKeResponse>.Ok(res);
    }

    private HienTrangKhoBaoCaoResponse AnhXaHienTrang(KhoTongQuanResponse tq, bool laAdmin)
    {
        return new HienTrangKhoBaoCaoResponse
        {
            Meta = TaoMeta(null, "THIET_BI.trang_thai_su_dung (hiện tại)",
                "Số liệu kho hiện tại, nhóm theo sản phẩm hiện tại. Không dựng lại kho tại ngày quá khứ. Tổng hồ sơ lưu không phải tổng vật phẩm đang ở kho."),
            TongHoSo = tq.TongHoSoThietBi,
            DangKhaiThac = tq.TongHoSoThietBi - tq.ThatLac - tq.NgungSuDung,
            SanSang = tq.SanSangTaiKho,
            DangThue = tq.DangChoThue,
            DangBaoTri = tq.DangBaoTri,
            ThatLac = tq.ThatLac,
            NgungSuDung = tq.NgungSuDung,
            TongGiaTriNhap = laAdmin ? tq.TongGiaTriNhap : null,
            SanPham = tq.ChiTietSanPham.Select(s => new HienTrangKhoSanPhamItem
            {
                MaSanPhamHienTai = s.MaSanPham,
                TenSanPham = s.TenSanPham,
                TongHoSo = s.TongSo,
                DangKhaiThac = s.TongSo - s.ThatLac - s.NgungSuDung,
                SanSang = s.SanSang,
                DangThue = s.DangThue,
                DangBaoTri = s.BaoTri,
                ThatLac = s.ThatLac,
                NgungSuDung = s.NgungSuDung
            }).OrderBy(s => s.MaSanPhamHienTai).ToList()
        };
    }

    // ═════════════════════════════ Quyền ═════════════════════════════

    /// <summary>Kiểm tra quyền hiện tại từ database; trả lỗi (hoặc null nếu hợp lệ).</summary>
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

    // ═════════════════════════════ Tiện ích ═════════════════════════════

    /// <summary>
    /// Đổi khoảng ngày Việt Nam [TuNgay, DenNgay] (cả hai bao gồm) sang UTC nửa mở một lần duy nhất.
    /// Không dùng mốc 23:59:59 nên không mất dữ liệu ở phần giây cuối ngày.
    /// </summary>
    private (KhoangNgay? Khoang, string? Loi) TinhKhoang(DateTime? tuNgay, DateTime? denNgay)
    {
        var homNayVn = (_clock.GetUtcNow().UtcDateTime + LechGioVn).Date;
        var den = (denNgay ?? homNayVn).Date;
        var tu = tuNgay.HasValue
            ? tuNgay.Value.Date
            : den.AddDays(-(DomainConstants.Policies.DefaultReportDays - 1));

        if (tu > den) return (null, "TuNgay phải nhỏ hơn hoặc bằng DenNgay.");
        if ((den - tu).Days + 1 > SoNgayToiDa)
            return (null, $"Khoảng ngày vượt {SoNgayToiDa} ngày. Hãy thu hẹp bộ lọc.");

        var tuUtc = DateTime.SpecifyKind(tu - LechGioVn, DateTimeKind.Utc);
        var denUtc = DateTime.SpecifyKind(den.AddDays(1) - LechGioVn, DateTimeKind.Utc);
        return (new KhoangNgay(tu, den, tuUtc, denUtc), null);
    }

    private BaoCaoKhoMeta TaoMeta(KhoangNgay? k, string mocLoc, params string?[] ghiChu)
    {
        return new BaoCaoKhoMeta
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

    private static (int Trang, int SoMoiTrang) ChuanHoaTrang(int trang, int soMoiTrang)
    {
        int size = soMoiTrang <= 0 ? DomainConstants.Policies.DefaultPageSize
            : Math.Min(soMoiTrang, DomainConstants.Policies.MaxPageSize);
        return (Math.Max(1, trang), size);
    }

    private static decimal? ChiaAnToan(decimal tu, int mau) => mau == 0 ? null : Math.Round(tu / mau, 2);

    private static string? GioVn(DateTime? utc) =>
        utc.HasValue ? (utc.Value + LechGioVn).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) : null;

    // ═════════════════════════════ CSV ═════════════════════════════

    private static byte[] DungCsv(IReadOnlyList<string> tieuDe, IReadOnlyList<List<object?>> dong)
    {
        var sb = new StringBuilder();
        sb.Append(string.Join(",", tieuDe.Select(t => Van(t))));
        foreach (var r in dong)
        {
            sb.Append("\r\n");
            sb.Append(string.Join(",", r.Select(Cell)));
        }

        var utf8Bom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        return utf8Bom.GetPreamble().Concat(utf8Bom.GetBytes(sb.ToString())).ToArray();
    }

    /// <summary>Số giữ nguyên kiểu số (kể cả số âm); chỉ ô văn bản bị vô hiệu hóa công thức.</summary>
    private static string Cell(object? v) => v switch
    {
        null => string.Empty,
        string s => Van(s),
        decimal d => d.ToString("0.##", CultureInfo.InvariantCulture),
        double d => d.ToString("0.##", CultureInfo.InvariantCulture),
        int i => i.ToString(CultureInfo.InvariantCulture),
        long l => l.ToString(CultureInfo.InvariantCulture),
        bool b => b ? "true" : "false",
        _ => Van(Convert.ToString(v, CultureInfo.InvariantCulture) ?? string.Empty)
    };

    /// <summary>Văn bản: chống CSV/formula injection (=, +, -, @, tab, CR đứng đầu) rồi bọc ngoặc kép chuẩn RFC 4180.</summary>
    private static string Van(string s)
    {
        if (s.Length > 0 && "=+-@\t\r".Contains(s[0])) s = "'" + s;
        return "\"" + s.Replace("\"", "\"\"") + "\"";
    }
}
