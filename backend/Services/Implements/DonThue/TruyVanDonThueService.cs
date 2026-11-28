using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

/// <summary>
/// Dịch vụ truy vấn đơn thuê cho khách hàng và bộ phận vận hành.
/// </summary>
public partial class TruyVanDonThueService : ITruyVanDonThueService
{
    private const string BanGiaoDaGiao = "DaGiao";
    private const string PhanCongDaPhanCong = "DaPhanCong";
    private const string PhuPhiChoDuyet = "ChoDuyet";
    private const string PhuPhiDaDuyet = "DaDuyet";
    private const string PhuPhiTuChoi = "TuChoi";
    private const string PhuPhiDangTranhChap = "DangTranhChap";

    private static readonly HashSet<string> KetLuanMat = new(StringComparer.OrdinalIgnoreCase) { "Mất thiết bị", "MatThietBi", "Mat" };
    private static readonly TrangThaiDonThue[] TruocBanGiao =
        { TrangThaiDonThue.ChoThanhToan, TrangThaiDonThue.DaXacNhan, TrangThaiDonThue.DangChuanBi, TrangThaiDonThue.SanSangNhan };

    private readonly ApplicationDbContext _context;
    private readonly TimeProvider _clock;

    public TruyVanDonThueService(ApplicationDbContext context, TimeProvider clock)
    {
        _context = context;
        _clock = clock;
    }

    public async Task<PagedResult<DonTomTatResponse>> LayDonCuaToiAsync(TimDonRequest filter, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        var (trang, soMoi) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);

        // Nối qua Entity KhachHang.XemLichSuThue() để luồng GET /api/don-thue gọi trực tiếp method của Entity
        var kh = await _context.KhachHangs.AsNoTracking()
            .Include(k => k.DonThues)
            .ThenInclude(d => d.ChiTietDonThues)
            .FirstAsync(k => k.MaKhachHang == maKhach);

        var q = LocChung(kh.XemLichSuThue().AsQueryable(),
            filter.MaDon, filter.TuNgay, filter.DenNgay, filter.TrangThai);

        var total = q.Count();
        var items = q.OrderByDescending(d => d.NgayDat).ThenByDescending(d => d.MaDonThue)
            .Skip((trang - 1) * soMoi).Take(soMoi)
            .Select(d => new DonTomTatResponse(
                d.MaDonThue, d.MaDonHienThi, d.NgayDat, d.GioNhanDuKien, d.GioTraDuKien, d.TrangThai.ToString(),
                d.TongTienThueTruocGiam, d.TongTienGiam, d.TongTienCoc, d.ChiTietDonThues.Count))
            .ToList();

        return new PagedResult<DonTomTatResponse> { Items = items, TotalItems = total, CurrentPage = trang, PageSize = soMoi };
    }

    public async Task<DonChiTietResponse> LayChiTietDonCuaToiAsync(long maDonThue, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        await EnsureChuDonAsync(maDonThue, maKhach);
        return await XayDungChiTietAsync(maDonThue, laNoiBo: false, maTaiKhoan);
    }

    public async Task<List<SuKienDonResponse>> LayLichSuDonCuaToiAsync(long maDonThue, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        await EnsureChuDonAsync(maDonThue, maKhach);
        return await LayLichSuAsync(maDonThue, laNoiBo: false, maTaiKhoan);
    }

    public async Task<PhieuBanGiaoKhachResponse> LayBienBanBanGiaoCuaKhachAsync(long maDonThue, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        await EnsureChuDonAsync(maDonThue, maKhach);
        var ds = await LayBanGiaoKhachAsync(maDonThue);
        return ds.FirstOrDefault() ?? throw new KhongTimThayException("Đơn thuê này chưa có biên bản bàn giao đã chốt.");
    }

    public async Task<PagedResult<DonVanHanhTomTatResponse>> TimDonVanHanhAsync(TimDonVanHanhRequest filter, long maTaiKhoan)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan);
        var (trang, soMoi) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);

        var q = LocChung(_context.DonThues.AsNoTracking(), filter.MaDon, filter.TuNgay, filter.DenNgay, filter.TrangThai);
        if (!string.IsNullOrWhiteSpace(filter.TuKhoa))
        {
            var k = filter.TuKhoa.Trim();
            q = q.Where(d => (d.TenNguoiNhan != null && d.TenNguoiNhan.Contains(k))
                             || (d.SoDienThoaiNguoiNhan != null && d.SoDienThoaiNguoiNhan.Contains(k))
                             || (d.KhachHang.HoTen != null && d.KhachHang.HoTen.Contains(k))
                             || (d.KhachHang.TaiKhoan.SoDienThoai != null && d.KhachHang.TaiKhoan.SoDienThoai.Contains(k)));
        }
        if (filter.CanChuanBi == true)
            q = q.Where(d => d.TrangThai == TrangThaiDonThue.DaXacNhan || d.TrangThai == TrangThaiDonThue.DangChuanBi);
        if (filter.CanGiao == true)
            q = q.Where(d => d.TrangThai == TrangThaiDonThue.SanSangNhan);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(d => d.NgayDat).ThenByDescending(d => d.MaDonThue)
            .Skip((trang - 1) * soMoi).Take(soMoi)
            .Select(d => new DonVanHanhTomTatResponse(
                d.MaDonThue, d.MaDonHienThi, d.MaKhachHang, d.KhachHang.HoTen,
                d.TenNguoiNhan, d.SoDienThoaiNguoiNhan, d.NgayDat, d.GioNhanDuKien, d.GioTraDuKien,
                d.TrangThai.ToString(), d.ChiTietDonThues.Count,
                d.ChiTietDonThues.Sum(c => (int?)c.SoLuong) ?? 0,
                _context.PhanCongThietBis.Count(pc => pc.ChiTietDon.MaDonThue == d.MaDonThue && (pc.TrangThai == PhanCongDaPhanCong || pc.TrangThai == "DaBanGiao")),
                d.TongTienThueTruocGiam, d.TongTienGiam, d.TongTienCoc))
            .ToListAsync();

        return new PagedResult<DonVanHanhTomTatResponse> { Items = items, TotalItems = total, CurrentPage = trang, PageSize = soMoi };
    }

    public async Task<DonVanHanhChiTietResponse> LayChiTietDonVanHanhAsync(long maDonThue, long maTaiKhoan)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan);
        if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue))
            throw new DonKhongTimThayException();

        var don = await XayDungChiTietAsync(maDonThue, laNoiBo: true, maTaiKhoan);
        var kh = await _context.DonThues.AsNoTracking().Where(d => d.MaDonThue == maDonThue)
            .Select(d => new { d.MaKhachHang, d.KhachHang.HoTen, d.GhiChu }).FirstAsync();

        // [OD-04] Lọc bỏ phân công đã hủy (DaHuy) để Modal Hồ sơ Đơn không hiển thị thiết bị cũ đã đổi.
        var phanCong = await _context.PhanCongThietBis.AsNoTracking()
            .Where(pc => pc.ChiTietDon.MaDonThue == maDonThue && pc.TrangThai != "DaHuy")
            .OrderBy(pc => pc.MaPhanCong)
            .Select(pc => new PhanCongVanHanhResponse(
                pc.MaPhanCong, pc.MaChiTietDon, pc.MaThietBi, pc.ThietBi.MaThietBiHienThi, pc.TrangThai))
            .ToListAsync();

        return new DonVanHanhChiTietResponse(don, kh.MaKhachHang, kh.HoTen, kh.GhiChu, phanCong, GoiYViecCanLam(don, phanCong));
    }

    private static List<string> GoiYViecCanLam(DonChiTietResponse don, List<PhanCongVanHanhResponse> phanCong)
    {
        var tong = don.Dong.Sum(d => d.SoLuong);
        var daGan = phanCong.Count(p => p.TrangThai == PhanCongDaPhanCong);
        var viec = new List<string>();
        switch (Enum.Parse<TrangThaiDonThue>(don.TrangThai))
        {
            case TrangThaiDonThue.DaXacNhan: viec.Add("Bắt đầu chuẩn bị đơn"); break;
            case TrangThaiDonThue.DangChuanBi: viec.Add(daGan < tong ? $"Gán đủ thiết bị ({daGan}/{tong})" : "Xác nhận sẵn sàng nhận"); break;
            case TrangThaiDonThue.SanSangNhan: viec.Add(don.BanGiao.Count == 0 ? "Lập phiếu bàn giao" : "Chốt bàn giao"); break;
            case TrangThaiDonThue.DangThue when don.TaiChinh.NhanTra.SoConNo > 0:
                viec.Add($"Nhận trả ({don.TaiChinh.NhanTra.SoConNo}/{don.TaiChinh.NhanTra.TongThietBiDaGiao} thiết bị còn nợ)"); break;
            case TrangThaiDonThue.DaNhanTra:
            case TrangThaiDonThue.ChoDoiSoat:
                viec.Add(don.TaiChinh.DoiSoat.Count == 0 ? "Lập đối soát tiền cọc" : "Xử lý/chốt đối soát"); break;
        }

        var tc = don.TaiChinh;
        if (tc.NhanTra.SoDangXuLyMat > 0) viec.Add($"Duyệt kết luận mất ({tc.NhanTra.SoDangXuLyMat} thiết bị)");
        if (tc.PhuPhi.TongDeNghi > 0) viec.Add("Duyệt phụ phí đang chờ");
        if (tc.PhuPhi.SoTranhChapDangMo > 0) viec.Add($"Giải quyết tranh chấp phụ phí ({tc.PhuPhi.SoTranhChapDangMo})");
        foreach (var h in tc.Hoan.Items)
        {
            if (h.NhanHienThi is "ChuaRoKetQua" or "DangXuLy") viec.Add($"Đối chiếu khoản hoàn #{h.MaHoanTien}");
            else if (h.NhanHienThi == "CanXuLyLai") viec.Add($"Xử lý lại khoản hoàn thất bại #{h.MaHoanTien}");
            else if (h.NhanHienThi == "DuKien") viec.Add($"Gửi khoản hoàn #{h.MaHoanTien}");
        }
        if (tc.Thu.ChuaPhanLoai != 0) viec.Add("Đối chiếu khoản thu chưa phân loại tiền thuê/cọc");
        return viec;
    }

    private async Task EnsureChuDonAsync(long maDonThue, long maKhach)
    {
        if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue && d.MaKhachHang == maKhach))
            throw new DonKhongTimThayException();
    }

    private static IQueryable<Models.Entities.DonThue> LocChung(
        IQueryable<Models.Entities.DonThue> q, string? maDon, DateTime? tuNgay, DateTime? denNgay, string? trangThai)
    {
        if (!string.IsNullOrWhiteSpace(maDon)) q = q.Where(d => d.MaDonHienThi.Contains(maDon.Trim()));
        if (tuNgay.HasValue) q = q.Where(d => d.NgayDat >= tuNgay.Value);
        if (denNgay.HasValue)
        {
            var het = denNgay.Value.Date.AddDays(1);
            q = q.Where(d => d.NgayDat < het);
        }
        if (!string.IsNullOrWhiteSpace(trangThai))
        {
            if (!Enum.TryParse<TrangThaiDonThue>(trangThai, true, out var tt) || !Enum.IsDefined(tt))
                throw new HoSoKhongHopLeException("Trạng thái lọc không hợp lệ.", new { trangThai });
            q = q.Where(d => d.TrangThai == tt);
        }
        return q;
    }

    // Giữ nguyên hành vi Clamp(soMoi, 1, MaxPageSize) của truy vấn đơn thuê qua CalculationHelpers
    private static (int trang, int soMoi) ChuanHoaPhanTrang(int trang, int soMoi)
        => CalculationHelpers.ChuanHoaPhanTrang(trang, soMoi, dungMacDinhKhiKhongDuong: false);
}
