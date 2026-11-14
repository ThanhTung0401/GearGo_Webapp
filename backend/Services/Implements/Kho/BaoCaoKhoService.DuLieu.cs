using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Models.Enums;
using GearGo.Services.Queries;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

public partial class BaoCaoKhoService
{
    private sealed class DuLieuNhap
    {
        public List<NhapHangPhieuItem> Phieu { get; init; } = new();
        public List<NhapHangTheoSanPhamItem> TheoSanPham { get; init; } = new();
        public List<GiaTriNhapHieuLucQuery.DeltaDongNhap> Deltas { get; init; } = new();
    }

    private sealed record PhieuNhapThongTin(
        long MaPhieuNhap, string MaPhieuHienThi, string? SoChungTuNhaCungCap, long MaNhaCungCap,
        string? ThongTinNhaCungCapLucNhap, string TenNcc, DateTime? NgayNhapThucTe, decimal TongTien);

    private sealed record DongNhapThongTin(
        long MaChiTietPhieuNhap, long MaPhieuNhap, long MaSanPham,
        string? TenSanPhamLucNhap, string TenHienTai, int SoLuong, decimal DonGiaNhap);

    /// <summary>Tải phiếu đã nhập kho trong kỳ kèm dòng chi tiết và delta hiệu lực.</summary>
    private async Task<DuLieuNhap> TaiDuLieuNhapAsync(LocNhapHangRequest filter, KhoangNgayBaoCao k)
    {
        long? sp = filter.MaSanPhamNguon;
        var phieuQuery = _context.PhieuNhapHangs.AsNoTracking()
            .Where(p => p.TrangThai == TrangThaiPhieuNhap.DaNhapKho
                        && p.NgayNhapThucTe != null
                        && p.NgayNhapThucTe >= k.TuUtc && p.NgayNhapThucTe < k.DenUtc);
        if (filter.MaNhaCungCap.HasValue)
            phieuQuery = phieuQuery.Where(p => p.MaNhaCungCap == filter.MaNhaCungCap.Value);
        if (sp.HasValue)
            phieuQuery = phieuQuery.Where(p => p.ChiTietPhieuNhaps.Any(c => c.MaSanPham == sp.Value));

        var phieus = await phieuQuery
            .OrderByDescending(p => p.NgayNhapThucTe).ThenByDescending(p => p.MaPhieuNhap)
            .Select(p => new PhieuNhapThongTin(
                p.MaPhieuNhap, p.MaPhieuHienThi, p.SoChungTuNhaCungCap, p.MaNhaCungCap,
                p.ThongTinNhaCungCapLucNhap, p.NhaCungCap.TenNhaCungCap, p.NgayNhapThucTe, p.TongTien))
            .ToListAsync();

        var ids = phieus.Select(p => p.MaPhieuNhap).ToList();
        var dongNhap = await _context.ChiTietPhieuNhaps.AsNoTracking()
            .Where(c => ids.Contains(c.MaPhieuNhap) && (!sp.HasValue || c.MaSanPham == sp.Value))
            .Select(c => new DongNhapThongTin(
                c.MaChiTietPhieuNhap, c.MaPhieuNhap, c.MaSanPham, c.TenSanPhamLucNhap,
                c.SanPham.TenSanPham, c.SoLuong, c.DonGiaNhap))
            .ToListAsync();

        var deltas = await GiaTriNhapHieuLucQuery.LayDeltaTheoDongAsync(_context, ids);
        var items = DungDanhSachPhieuNhap(phieus, dongNhap, deltas, sp.HasValue);

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

    private static List<NhapHangPhieuItem> DungDanhSachPhieuNhap(
        List<PhieuNhapThongTin> phieus,
        List<DongNhapThongTin> dongNhap,
        List<GiaTriNhapHieuLucQuery.DeltaDongNhap> deltas,
        bool locTheoSanPham)
    {
        var dongIds = dongNhap.Select(d => d.MaChiTietPhieuNhap).ToHashSet();
        // Delta gắn dòng cụ thể tính theo dòng; delta không gắn dòng chỉ cộng ở cấp phiếu khi không lọc sản phẩm.
        var deltaTheoDong = deltas
            .Where(d => d.MaChiTietPhieuNhap.HasValue && dongIds.Contains(d.MaChiTietPhieuNhap.Value))
            .GroupBy(d => d.MaChiTietPhieuNhap!.Value)
            .ToDictionary(g => g.Key, g => (GiaTri: g.Sum(x => x.GiaTri), SoLuong: g.Sum(x => x.SoLuong)));
        var deltaKhongGanDong = locTheoSanPham
            ? new Dictionary<long, (decimal GiaTri, int SoLuong)>()
            : deltas.Where(d => !d.MaChiTietPhieuNhap.HasValue)
                .GroupBy(d => d.MaPhieuNhap)
                .ToDictionary(g => g.Key, g => (GiaTri: g.Sum(x => x.GiaTri), SoLuong: g.Sum(x => x.SoLuong)));

        var dongTheoPhieu = dongNhap.ToLookup(d => d.MaPhieuNhap);
        return phieus.Select(p => DungMotPhieuNhap(p, dongTheoPhieu[p.MaPhieuNhap], deltaTheoDong, deltaKhongGanDong, locTheoSanPham)).ToList();
    }

    private static NhapHangPhieuItem DungMotPhieuNhap(
        PhieuNhapThongTin p,
        IEnumerable<DongNhapThongTin> dongCuaPhieu,
        Dictionary<long, (decimal GiaTri, int SoLuong)> deltaTheoDong,
        Dictionary<long, (decimal GiaTri, int SoLuong)> deltaKhongGanDong,
        bool locTheoSanPham)
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

        foreach (var d in dongCuaPhieu.OrderBy(x => x.MaChiTietPhieuNhap))
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
        item.LechTongTienPhieu = !locTheoSanPham && item.TongGiaTriGoc != p.TongTien;
        return item;
    }

    private async Task<List<DieuChinhNhapItem>> TaiDieuChinhNhapAsync(LocNhapHangRequest filter, KhoangNgayBaoCao k)
    {
        var query = _context.PhieuDieuChinhKhos.AsNoTracking()
            .Where(p => p.TrangThai == DomainConstants.Status.Applied
                        && p.MaPhieuNhapLienQuan != null && p.LoaiDieuChinh != null
                        && LoaiDieuChinhAnhHuongNhap.Contains(p.LoaiDieuChinh)
                        && (p.ThoiDiemApDung ?? p.ThoiDiemLap) >= k.TuUtc
                        && (p.ThoiDiemApDung ?? p.ThoiDiemLap) < k.DenUtc
                        && p.PhieuNhapLienQuan!.TrangThai == TrangThaiPhieuNhap.DaNhapKho);
        if (filter.MaNhaCungCap.HasValue)
            query = query.Where(p => p.PhieuNhapLienQuan!.MaNhaCungCap == filter.MaNhaCungCap.Value);

        var pdcs = await query.Select(p => new
        {
            p.MaPhieuDieuChinh, p.LoaiDieuChinh, p.LyDo, ApDung = p.ThoiDiemApDung ?? p.ThoiDiemLap,
            MaPhieuNhap = p.MaPhieuNhapLienQuan!.Value, HienThi = p.PhieuNhapLienQuan!.MaPhieuHienThi,
            NgayNhap = p.PhieuNhapLienQuan!.NgayNhapThucTe
        }).ToListAsync();

        var phieuNhapIds = pdcs.Select(p => p.MaPhieuNhap).Distinct().ToList();
        var deltas = await GiaTriNhapHieuLucQuery.LayDeltaTheoDongAsync(_context, phieuNhapIds);

        HashSet<long>? dongCuaSanPham = null;
        if (filter.MaSanPhamNguon.HasValue)
        {
            dongCuaSanPham = (await _context.ChiTietPhieuNhaps.AsNoTracking()
                .Where(c => phieuNhapIds.Contains(c.MaPhieuNhap) && c.MaSanPham == filter.MaSanPhamNguon.Value)
                .Select(c => c.MaChiTietPhieuNhap).ToListAsync()).ToHashSet();
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
                MaPhieuDieuChinh = p.MaPhieuDieuChinh, MaPhieuNhap = p.MaPhieuNhap,
                MaPhieuNhapHienThi = p.HienThi, LoaiDieuChinh = p.LoaiDieuChinh ?? string.Empty,
                LyDo = p.LyDo, ThoiDiemApDung = p.ApDung,
                NguoiDuyet = list.Select(r => r.NguoiDuyet).FirstOrDefault(),
                DeltaSoLuong = list.Sum(r => r.SoLuong), DeltaGiaTri = list.Sum(r => r.GiaTri),
                NgayNhapThucTe = p.NgayNhap,
                PhieuNhapNgoaiKy = !p.NgayNhap.HasValue || p.NgayNhap < k.TuUtc || p.NgayNhap >= k.DenUtc
            });
        }

        return ketQua.OrderByDescending(i => i.ThoiDiemApDung).ThenByDescending(i => i.MaPhieuDieuChinh).ToList();
    }

    private async Task<LichSuDonGiaResponse> DungLichSuDonGiaAsync(LocNhapHangRequest filter, KhoangNgayBaoCao k)
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
                    Loai = "Nhap", MaChungTu = p.MaPhieuHienThi, NguonNhapHienThi = p.MaPhieuHienThi,
                    SoLuong = d.SoLuongGoc, DonGia = d.DonGiaGoc
                });
            }

        foreach (var dl in du.Deltas.Where(x => x.MaChiTietPhieuNhap.HasValue && dongTheoMa.ContainsKey(x.MaChiTietPhieuNhap.Value)))
        {
            var (maSp, maPhieu) = dongTheoMa[dl.MaChiTietPhieuNhap!.Value];
            mocTheoSp[maSp].Add(new MocDonGiaItem
            {
                ThoiDiem = dl.ThoiDiemApDung, Loai = "DieuChinh",
                MaChungTu = $"DC-{dl.MaPhieuDieuChinh}", NguonNhapHienThi = maPhieu,
                DeltaGiaTri = dl.GiaTri, DeltaSoLuong = dl.SoLuong
            });
        }

        var sanPhams = du.TheoSanPham.Select(tsp =>
        {
            var gocRows = nhapRows.Where(r => r.MaSp == tsp.MaSanPhamNguon).ToList();
            return new LichSuDonGiaSanPhamItem
            {
                MaSanPhamNguon = tsp.MaSanPhamNguon, TenSanPham = tsp.TenSanPham, SoLanNhap = gocRows.Count,
                TongSoLuongGoc = tsp.SoLuongGoc, TongGiaTriGoc = tsp.GiaTriGoc,
                DonGiaBinhQuanGoc = ChiaAnToan(tsp.GiaTriGoc, tsp.SoLuongGoc),
                TongSoLuongHieuLuc = tsp.SoLuongHieuLuc, TongGiaTriHieuLuc = tsp.GiaTriHieuLuc,
                DonGiaBinhQuanHieuLuc = ChiaAnToan(tsp.GiaTriHieuLuc, tsp.SoLuongHieuLuc),
                DonGiaThapNhat = gocRows.Count > 0 ? gocRows.Min(r => r.Gia) : null,
                DonGiaCaoNhat = gocRows.Count > 0 ? gocRows.Max(r => r.Gia) : null,
                Moc = mocTheoSp[tsp.MaSanPhamNguon].OrderBy(m => m.ThoiDiem).ThenBy(m => m.Loai == "Nhap" ? 0 : 1).ToList()
            };
        }).ToList();

        return new LichSuDonGiaResponse
        {
            Meta = TaoMeta(k, "PhieuNhapHang.NgayNhapThucTe",
                "Đơn giá bình quân = tổng giá trị / tổng số lượng cùng tập dữ liệu (không trung bình cộng đơn giá). Mẫu số 0 trả null.",
                "Nhóm theo sản phẩm nguồn của dòng nhập; không đổi khi thiết bị sau này bị giáng cấp."),
            SanPham = sanPhams
        };
    }

    private static decimal? ChiaAnToan(decimal tu, int mau) => mau == 0 ? null : Math.Round(tu / mau, 2);
}
