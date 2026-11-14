using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.HuyDon;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

/// <summary>
/// Dịch vụ xem trước chi phí hủy, hủy đơn thuê và ghi nhận khách không đến nhận.
/// </summary>
public partial class HuyDonService : IHuyDonService
{
    private const int DoDaiLyDoToiDa = 1000;
    private const string BanGiaoDaGiao = "DaGiao";
    private const string BanGiaoDaHuy = "DaHuy";
    private const string LuotDangGiu = "DangGiu";
    private const string LuotDaGiaiPhong = "DaGiaiPhong";

    private static readonly TrangThaiDonThue[] TruocBanGiao =
        { TrangThaiDonThue.ChoThanhToan, TrangThaiDonThue.DaXacNhan, TrangThaiDonThue.DangChuanBi, TrangThaiDonThue.SanSangNhan };

    private static readonly TrangThaiDonThue[] DaKetThucHuy =
        { TrangThaiDonThue.KhachHuy, TrangThaiDonThue.CuaHangHuy, TrangThaiDonThue.HetHan };

    private readonly ApplicationDbContext _context;
    private readonly IHoanTienService _hoanTien;
    private readonly IChuanBiDonService _chuanBiDon;
    private readonly ILichSuNghiepVuService _lichSu;
    private readonly IThongBaoService _thongBao;
    private readonly TimeProvider _clock;
    private readonly ILogger<HuyDonService> _logger;

    public HuyDonService(ApplicationDbContext context, IHoanTienService hoanTien, IChuanBiDonService chuanBiDon,
        ILichSuNghiepVuService lichSu, IThongBaoService thongBao, TimeProvider clock, ILogger<HuyDonService> logger)
    {
        _context = context;
        _hoanTien = hoanTien;
        _chuanBiDon = chuanBiDon;
        _lichSu = lichSu;
        _thongBao = thongBao;
        _clock = clock;
        _logger = logger;
    }

    private DateTime Now => _clock.GetUtcNow().UtcDateTime;

    public async Task<XemTruocHuyResponse> XemTruocHuyAsync(long maDonThue, long maTaiKhoan, string loaiHuy, CancellationToken ct = default)
    {
        if (loaiHuy is not (LoaiHuyDon.KhachHuy or LoaiHuyDon.CuaHangHuy or LoaiHuyDon.KhongDenNhan))
            throw new HoSoKhongHopLeException("Loại hủy không hợp lệ.", new { loaiHuy });
        await KiemTraQuyenAsync(maDonThue, maTaiKhoan, loaiHuy, ct);

        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == maDonThue, ct)
                  ?? throw new DonKhongTimThayException();
        return await TaoXemTruocAsync(don, loaiHuy, Now, ct);
    }

    public async Task<HuyDonResponse> KhachHuyAsync(long maDonThue, HuyDonRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await KiemTraQuyenAsync(maDonThue, maTaiKhoan, LoaiHuyDon.KhachHuy, ct);
        return await HuyAsync(maDonThue, LoaiHuyDon.KhachHuy, request.LyDo, request.XacNhanChiPhi, request.DauVanTayXemTruoc, tk, null, ct);
    }

    public async Task<HuyDonResponse> CuaHangHuyAsync(long maDonThue, HuyDonRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await KiemTraQuyenAsync(maDonThue, maTaiKhoan, LoaiHuyDon.CuaHangHuy, ct);
        return await HuyAsync(maDonThue, LoaiHuyDon.CuaHangHuy, request.LyDo, request.XacNhanChiPhi, request.DauVanTayXemTruoc, tk, null, ct);
    }

    public async Task<KhongDenNhanResponse> GhiNhanKhongDenNhanAsync(
        long maDonThue, KhongDenNhanRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await KiemTraQuyenAsync(maDonThue, maTaiKhoan, LoaiHuyDon.KhongDenNhan, ct);
        var ghiChu = KiemTraLyDo(request.GhiChu);
        if (request.XuLyHuy && tk.VaiTro != "QuanTriVien")
            throw new KhongCoQuyenHuyException("Chỉ quản trị viên quyết định xử lý tiền khi khách không đến nhận.");

        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == maDonThue, ct)
                  ?? throw new DonKhongTimThayException();
        KiemTraConTruocBanGiao(don);
        var cs = await DocChinhSachAsync(don.MaChinhSach, ct);
        var moc = don.GioNhanDuKien.AddMinutes(cs.SoPhutChoKhongDenNhan ?? 0);
        if (Now < moc)
            throw new TrangThaiKhongHopLeException("Chưa qua thời gian chờ khách đến nhận theo chính sách.", new { mocGhiNhanDuoc = moc });

        var bangChung = new { ghiChu, request.BangChung, gioNhanDuKien = don.GioNhanDuKien, mocGhiNhanDuoc = moc };
        var coChinhSach = cs.TyLeGiuLaiKhongDenNhan.HasValue;

        if (request.XuLyHuy)
        {
            var kq = await HuyAsync(maDonThue, LoaiHuyDon.KhongDenNhan, "Khách không đến nhận: " + ghiChu,
                request.XacNhanChiPhi, request.DauVanTayXemTruoc, tk, bangChung, ct);
            return new KhongDenNhanResponse(maDonThue, kq.TrangThai, true, true, coChinhSach, "DaHuyTheoChinhSachKhongDenNhan", null, kq);
        }

        await GhiNhanKhongDenNhanVaThongBaoAsync(don, maTaiKhoan, ghiChu, bangChung, ct);
        XemTruocHuyResponse? bang = coChinhSach ? await TaoXemTruocAsync(don, LoaiHuyDon.KhongDenNhan, Now, ct) : null;
        return new KhongDenNhanResponse(maDonThue, don.TrangThai.ToString(), true, false, coChinhSach,
            coChinhSach ? "ChoQuanTriVienXacNhanHuyTheoChinhSach" : "ChoQuanTriVienQuyetDinh_ChinhSachChuaQuyDinh", bang, null);
    }

    private async Task GhiNhanKhongDenNhanVaThongBaoAsync(
        Models.Entities.DonThue don, long maTaiKhoan, string ghiChu, object bangChung, CancellationToken ct)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        await KhoaDonAsync(don.MaDonThue, ct);
        var nk = _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(maTaiKhoan, "GHI_NHAN_KHONG_DEN_NHAN", "DON_THUE",
            don.MaDonThue.ToString(), new { TrangThai = don.TrangThai.ToString() }, bangChung, ghiChu));
        await _context.SaveChangesAsync(ct);

        var quanTri = await _context.TaiKhoans.AsNoTracking()
            .Where(t => t.VaiTro == "QuanTriVien" && t.TrangThai == "HoatDong").Select(t => t.MaTaiKhoan).ToListAsync(ct);
        foreach (var maQt in quanTri)
            await _thongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(don.MaDonThue, LoaiSuKienThongBao.KhongDenNhan,
                MaSuKienThongBao.KhongDenNhan(don.MaDonThue, nk.MaNhatKy), "Khách không đến nhận — cần quyết định",
                $"Đơn {don.MaDonHienThi}: nhân viên ghi nhận khách không đến nhận. {ghiChu}", maQt));
        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    private async Task<TaiKhoan> KiemTraQuyenAsync(long maDonThue, long maTaiKhoan, string loaiHuy, CancellationToken ct)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan, ct);
        if (tk.VaiTro == "KhachHang")
        {
            if (loaiHuy != LoaiHuyDon.KhachHuy)
                throw new KhongCoQuyenHuyException("Khách hàng không được chọn hủy do cửa hàng hoặc ghi nhận không đến nhận.");
            var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan, ct);
            if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue && d.MaKhachHang == maKhach, ct))
                throw new DonKhongTimThayException();
            return tk;
        }

        if (loaiHuy == LoaiHuyDon.KhachHuy)
            throw new KhongCoQuyenHuyException("Nhân viên không hủy thay khách; dùng hủy do cửa hàng hoặc ghi nhận không đến nhận.");
        if (loaiHuy == LoaiHuyDon.CuaHangHuy) await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoan, ct);
        else await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan, ct);

        if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue, ct))
            throw new DonKhongTimThayException();
        return tk;
    }

    private static void KiemTraConTruocBanGiao(Models.Entities.DonThue don)
    {
        if (DaKetThucHuy.Contains(don.TrangThai))
            throw new DonDaHuyKhacYDinhException("Đơn đã hủy hoặc hết hạn.", new { trangThai = don.TrangThai.ToString() });
        if (!TruocBanGiao.Contains(don.TrangThai))
            throw new DonDaBanGiaoException(ct: new { trangThai = don.TrangThai.ToString() });
    }

    private async Task KhoaDonAsync(long maDonThue, CancellationToken ct)
    {
        var n = await _context.DonThues.Where(d => d.MaDonThue == maDonThue)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.TrangThai, d => d.TrangThai), ct);
        if (n == 0) throw new DonKhongTimThayException();
    }

    private static string KiemTraLyDo(string? lyDo)
    {
        var s = lyDo?.Trim();
        if (string.IsNullOrEmpty(s))
            throw new HoSoKhongHopLeException("Lý do là bắt buộc.", new { truong = "lyDo" });
        if (s.Length > DoDaiLyDoToiDa)
            throw new HoSoKhongHopLeException($"Lý do tối đa {DoDaiLyDoToiDa} ký tự.", new { truong = "lyDo" });
        return s;
    }
}
