using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.HuyDon;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class HuyDonService : IHuyDonService
{
    private const int DoDaiLyDoToiDa = 1000;
    private const string PhanCongDaPhanCong = "DaPhanCong";
    private const string PhanCongDaHuy = "DaHuy";
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
    private readonly ILichSuNghiepVuService _lichSu;
    private readonly IThongBaoService _thongBao;
    private readonly TimeProvider _clock;
    private readonly ILogger<HuyDonService> _logger;

    public HuyDonService(ApplicationDbContext context, IHoanTienService hoanTien, ILichSuNghiepVuService lichSu,
        IThongBaoService thongBao, TimeProvider clock, ILogger<HuyDonService> logger)
    {
        _context = context;
        _hoanTien = hoanTien;
        _lichSu = lichSu;
        _thongBao = thongBao;
        _clock = clock;
        _logger = logger;
    }

    private DateTime Now => _clock.GetUtcNow().UtcDateTime;

    // ───────────────────────── XEM TRƯỚC ─────────────────────────

    public async Task<XemTruocHuyResponse> XemTruocHuyAsync(long maDonThue, long maTaiKhoan, string loaiHuy, CancellationToken ct = default)
    {
        if (loaiHuy is not (LoaiHuyDon.KhachHuy or LoaiHuyDon.CuaHangHuy or LoaiHuyDon.KhongDenNhan))
            throw new HoSoKhongHopLeException("Loại hủy không hợp lệ.", new { loaiHuy });
        await KiemTraQuyenAsync(maDonThue, maTaiKhoan, loaiHuy, ct);

        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == maDonThue, ct)
                  ?? throw new DonKhongTimThayException();
        return await TaoXemTruocAsync(don, loaiHuy, Now, ct);
    }

    // ───────────────────────── HỦY ─────────────────────────

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

    public async Task<KhongDenNhanResponse> GhiNhanKhongDenNhanAsync(long maDonThue, KhongDenNhanRequest request, long maTaiKhoan, CancellationToken ct = default)
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

        // Nhân viên chỉ ghi nhận có căn cứ; không đổi trạng thái đơn, không tự tạo bàn giao/phạt.
        await using (var tx = await _context.Database.BeginTransactionAsync(ct))
        {
            await KhoaDonAsync(maDonThue, ct);
            var nk = _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(maTaiKhoan, "GHI_NHAN_KHONG_DEN_NHAN", "DON_THUE",
                maDonThue.ToString(), new { TrangThai = don.TrangThai.ToString() }, bangChung, ghiChu));
            await _context.SaveChangesAsync(ct);
            var quanTri = await _context.TaiKhoans.AsNoTracking()
                .Where(t => t.VaiTro == "QuanTriVien" && t.TrangThai == "HoatDong").Select(t => t.MaTaiKhoan).ToListAsync(ct);
            foreach (var maQt in quanTri)
                await _thongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(maDonThue, LoaiSuKienThongBao.KhongDenNhan,
                    MaSuKienThongBao.KhongDenNhan(maDonThue, nk.MaNhatKy), "Khách không đến nhận — cần quyết định",
                    $"Đơn {don.MaDonHienThi}: nhân viên ghi nhận khách không đến nhận. {ghiChu}", maQt));
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        XemTruocHuyResponse? bang = coChinhSach ? await TaoXemTruocAsync(don, LoaiHuyDon.KhongDenNhan, Now, ct) : null;
        return new KhongDenNhanResponse(maDonThue, don.TrangThai.ToString(), true, false, coChinhSach,
            coChinhSach ? "ChoQuanTriVienXacNhanHuyTheoChinhSach" : "ChoQuanTriVienQuyetDinh_ChinhSachChuaQuyDinh", bang, null);
    }

    /// <summary>
    /// Thao tác hủy nguyên tử: khóa đơn (cùng hàng DON_THUE mà chốt bàn giao cập nhật) → tính lại bảng theo giờ server →
    /// ghi hủy, giải phóng giữ chỗ/phân công/nháp bàn giao/lượt khuyến mãi chưa dùng → lập intent hoàn → lịch sử/thông báo → commit.
    /// Sau commit mới gửi hoàn ra gateway.
    /// </summary>
    private async Task<HuyDonResponse> HuyAsync(long maDonThue, string loaiHuy, string lyDoNhap, bool xacNhan, string? dauVanTay,
        TaiKhoan actor, object? bangChung, CancellationToken ct)
    {
        var lyDo = KiemTraLyDo(lyDoNhap);
        var trangThaiDich = loaiHuy == LoaiHuyDon.CuaHangHuy ? TrangThaiDonThue.CuaHangHuy : TrangThaiDonThue.KhachHuy;
        var maNhanVien = await ActorGuard.LayMaNhanVienAsync(_context, actor.MaTaiKhoan, ct);
        var laNoiBo = actor.VaiTro != "KhachHang";
        var yeuCauHoan = new List<HoanTien>();

        await using (var tx = await _context.Database.BeginTransactionAsync(ct))
        {
            await KhoaDonAsync(maDonThue, ct);
            var don = await _context.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.GiuCho)
                .FirstAsync(d => d.MaDonThue == maDonThue, ct);
            await _context.Entry(don).ReloadAsync(ct); // đọc lại sau khóa

            if (DaKetThucHuy.Contains(don.TrangThai))
            {
                // Bấm lại cùng quyết định: trả kết quả cũ, không tạo bộ hoàn thứ hai.
                if (don.TrangThai == trangThaiDich && don.MaNguoiHuy == actor.MaTaiKhoan)
                {
                    await tx.CommitAsync(ct);
                    return await TaoKetQuaAsync(maDonThue, loaiHuy, actor.MaTaiKhoan, laNoiBo, ct);
                }
                throw new DonDaHuyKhacYDinhException("Đơn đã kết thúc bởi một quyết định khác; không ghi đè lý do/phí.",
                    new { trangThai = don.TrangThai.ToString(), don.ThoiDiemHuy });
            }
            KiemTraConTruocBanGiao(don);
            if (await _context.PhieuBanGiaos.AnyAsync(p => p.MaDonThue == maDonThue && p.TrangThai == BanGiaoDaGiao, ct))
                throw new DonDaBanGiaoException();

            var thu = await DocThuAsync(maDonThue, ct);
            if (thu.ChuaPhanLoai != 0)
                throw new NguonHoanKhongHopLeException("Đơn có khoản thu thành công chưa phân loại tiền thuê/cọc; cần đối chiếu thanh toán trước khi hủy.",
                    new { chuaPhanLoai = thu.ChuaPhanLoai });
            var now = Now;
            var cs = await DocChinhSachAsync(don.MaChinhSach, ct);
            var bang = BangTinhHuy.Tinh(TaoDauVao(don, loaiHuy, now, thu, cs));

            if (bang.CoTien)
            {
                if (!xacNhan || string.IsNullOrWhiteSpace(dauVanTay))
                    throw new ChiPhiHuyDaThayDoiException("Cần xác nhận bảng chi phí hủy trước khi hủy.",
                        TaoXemTruoc(don, loaiHuy, now, thu, cs, bang));
                if (!string.Equals(dauVanTay, bang.DauVanTay, StringComparison.OrdinalIgnoreCase))
                    throw new ChiPhiHuyDaThayDoiException("Chi phí hủy đã thay đổi so với bảng đã xem; vui lòng xác nhận bảng mới.",
                        TaoXemTruoc(don, loaiHuy, now, thu, cs, bang));
            }

            var truoc = don.TrangThai;
            don.TrangThai = trangThaiDich;
            don.MaNguoiHuy = actor.MaTaiKhoan;
            don.ThoiDiemHuy = now;
            don.LyDoHuy = lyDo;
            don.TienThueGiuLaiKhiHuy = bang.TienThueGiuLai;

            // Giải phóng giữ chỗ/cam kết.
            foreach (var gc in don.ChiTietDonThues.Select(c => c.GiuCho).OfType<GiuCho>())
                if (gc.TrangThai is TrangThaiGiuCho.DangGiu or TrangThaiGiuCho.DaXacNhan)
                {
                    gc.TrangThai = TrangThaiGiuCho.DaGiaiPhong;
                    gc.ThoiDiemGiaiPhong = now;
                }

            // Hủy phân công còn hiệu lực trước giao (giữ người/thời điểm/lý do); thiết bị chưa rời kho nên vẫn SanSang.
            var phanCongs = await _context.PhanCongThietBis
                .Where(pc => pc.ChiTietDon.MaDonThue == maDonThue && pc.TrangThai == PhanCongDaPhanCong).ToListAsync(ct);
            foreach (var pc in phanCongs)
            {
                pc.TrangThai = PhanCongDaHuy;
                pc.MaNguoiHuyPhanCong = maNhanVien;
                pc.ThoiDiemHuyPhanCong = now;
                pc.LyDoHuyPhanCong = $"Hủy đơn ({loaiHuy}): {lyDo}";
            }

            // Phiếu bàn giao nháp bị vô hiệu, không xóa.
            var nhapBanGiao = await _context.PhieuBanGiaos
                .Where(p => p.MaDonThue == maDonThue && p.TrangThai != BanGiaoDaGiao && p.TrangThai != BanGiaoDaHuy).ToListAsync(ct);
            foreach (var p in nhapBanGiao)
            {
                p.TrangThai = BanGiaoDaHuy;
                p.GhiChu = string.IsNullOrWhiteSpace(p.GhiChu) ? $"Vô hiệu do hủy đơn lúc {now:u}" : $"{p.GhiChu}\nVô hiệu do hủy đơn lúc {now:u}";
            }

            // Lượt khuyến mãi: chỉ release lượt đang giữ; lượt đã dùng khi thanh toán thành công không phục hồi.
            var luot = await _context.LuotSuDungKhuyenMais.FirstOrDefaultAsync(l => l.MaDonThue == maDonThue, ct);
            if (luot is { TrangThai: LuotDangGiu })
            {
                luot.TrangThai = LuotDaGiaiPhong;
                luot.ThoiDiemGiaiPhong = now;
            }

            // Intent hoàn theo từng nguồn trong cùng transaction; không tạo khoản 0 đồng.
            var lyDoHoan = $"Hoàn do hủy đơn {don.MaDonHienThi} ({loaiHuy})";
            if (bang.TienThueHoan > 0)
                yeuCauHoan.AddRange(await _hoanTien.LapYeuCauHoanAsync(new LapHoanCommand(maDonThue, LoaiHoanTien.HoanHuyTienThue,
                    $"HUY:{maDonThue}:THUE", bang.TienThueHoan, thu.NguonThue, null, lyDoHoan), actor.MaTaiKhoan, ct));
            if (bang.TienCocHoan > 0)
                yeuCauHoan.AddRange(await _hoanTien.LapYeuCauHoanAsync(new LapHoanCommand(maDonThue, LoaiHoanTien.HoanHuyTienCoc,
                    $"HUY:{maDonThue}:COC", bang.TienCocHoan, thu.NguonCoc, null, lyDoHoan), actor.MaTaiKhoan, ct));

            var ls = _lichSu.GhiChuyenTrangThaiDon(new GhiLichSuDonCommand(maDonThue, truoc.ToString(), trangThaiDich.ToString(),
                actor.MaTaiKhoan, lyDo));
            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(actor.MaTaiKhoan, "HUY_DON", "DON_THUE", maDonThue.ToString(),
                new { TrangThai = truoc.ToString() },
                new { TrangThai = trangThaiDich.ToString(), loaiHuy, bang.Nhanh, bang.TyLe, bang.TienThueGiuLai, bang.TienThueHoan, bang.TienCocHoan, bangChung },
                lyDo));
            await _context.SaveChangesAsync(ct); // có MaLichSuDon cho mã sự kiện và mã HOAN_TIEN

            await _thongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(maDonThue, LoaiSuKienThongBao.HuyDon,
                MaSuKienThongBao.HuyDon(maDonThue, ls.MaLichSuDon),
                trangThaiDich == TrangThaiDonThue.CuaHangHuy ? "Cửa hàng đã hủy đơn" : "Đơn thuê đã được hủy",
                bang.TongHoan > 0
                    ? $"Đơn {don.MaDonHienThi} đã hủy. Tiền thuê giữ lại {TienTe.HienThi(bang.TienThueGiuLai)}; khoản hoàn {TienTe.HienThi(bang.TongHoan)} đang được xử lý."
                    : $"Đơn {don.MaDonHienThi} đã hủy. Không phát sinh khoản hoàn."));
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        // Sau commit: gửi hoàn. Lỗi gateway không đổi trạng thái hủy; khoản hoàn được theo dõi riêng.
        await _hoanTien.GuiYeuCauDaLapAsync(yeuCauHoan.Select(h => h.MaHoanTien), maNhanVien, ct);
        return await TaoKetQuaAsync(maDonThue, loaiHuy, actor.MaTaiKhoan, laNoiBo, ct);
    }

    // ───────────────────────── NỘI BỘ ─────────────────────────

    private sealed record ThuDaPhanLoai(decimal TienThue, decimal TienCoc, List<long> NguonThue, List<long> NguonCoc, decimal ChuaPhanLoai);

    /// <summary>
    /// Tiền thực thu hợp lệ theo mục đích: chỉ giao dịch ThanhCong, trừ phần đã hoàn/đang giữ trên cùng nguồn
    /// (vd. khoản thu trùng đã được hoàn theo luồng thu thừa). Khoản thu chưa phân loại được báo riêng.
    /// </summary>
    private async Task<ThuDaPhanLoai> DocThuAsync(long maDonThue, CancellationToken ct)
    {
        var tongThu = (await _context.ThanhToans.AsNoTracking()
            .Where(t => t.MaDonThue == maDonThue && t.TrangThai == TrangThaiThanhToan.ThanhCong)
            .Select(t => t.TongSoTien).ToListAsync(ct)).Sum();
        var chiTiet = await _context.ChiTietThanhToans.AsNoTracking()
            .Where(c => c.ThanhToan.MaDonThue == maDonThue && c.ThanhToan.TrangThai == TrangThaiThanhToan.ThanhCong)
            .Select(c => new { c.MaChiTietThanhToan, c.MucDich, c.SoTien })
            .ToListAsync(ct);
        var ids = chiTiet.Select(c => c.MaChiTietThanhToan).ToList();
        var daDung = (await _context.HoanTiens.AsNoTracking()
                .Where(h => ids.Contains(h.MaChiTietThanhToanGoc) && h.TrangThai != TrangThaiHoanTien.ThatBai)
                .Select(h => new { h.MaChiTietThanhToanGoc, h.SoTien }).ToListAsync(ct))
            .GroupBy(h => h.MaChiTietThanhToanGoc).ToDictionary(g => g.Key, g => g.Sum(h => h.SoTien));
        decimal Rong(long id, decimal soTien) => soTien - daDung.GetValueOrDefault(id);

        var thue = chiTiet.Where(c => c.MucDich == MucDichThanhToan.TienThue).ToList();
        var coc = chiTiet.Where(c => c.MucDich == MucDichThanhToan.TienCoc).ToList();
        return new ThuDaPhanLoai(
            thue.Sum(c => Rong(c.MaChiTietThanhToan, c.SoTien)),
            coc.Sum(c => Rong(c.MaChiTietThanhToan, c.SoTien)),
            thue.Select(c => c.MaChiTietThanhToan).ToList(),
            coc.Select(c => c.MaChiTietThanhToan).ToList(),
            tongThu - chiTiet.Sum(c => c.SoTien));
    }

    private async Task<ChinhSachHuy> DocChinhSachAsync(long maChinhSach, CancellationToken ct)
    {
        // Luôn đọc chính sách đã gắn với đơn, không lấy bản mới nhất.
        var noiDung = await _context.ChinhSachs.AsNoTracking().Where(c => c.MaChinhSach == maChinhSach)
            .Select(c => c.NoiDungChinhSach).FirstOrDefaultAsync(ct);
        return ChinhSachHuy.Doc(noiDung, maChinhSach);
    }

    private static DauVaoBangHuy TaoDauVao(DonThue don, string loaiHuy, DateTime now, ThuDaPhanLoai thu, ChinhSachHuy cs)
        => new(don.MaDonThue, don.TrangThai.ToString(), loaiHuy, don.GioNhanDuKien, now,
            thu.TienThue + thu.TienCoc > 0, thu.TienThue, thu.TienCoc,
            Math.Max(0, don.TongTienThueTruocGiam - don.TongTienGiam), don.TongTienCoc, cs, don.MaChinhSach);

    private async Task<XemTruocHuyResponse> TaoXemTruocAsync(DonThue don, string loaiHuy, DateTime now, CancellationToken ct)
    {
        if (DaKetThucHuy.Contains(don.TrangThai))
            return KhongTheHuy(don, loaiHuy, now, "Đơn đã hủy hoặc hết hạn.");
        if (!TruocBanGiao.Contains(don.TrangThai)
            || await _context.PhieuBanGiaos.AnyAsync(p => p.MaDonThue == don.MaDonThue && p.TrangThai == BanGiaoDaGiao, ct))
            return KhongTheHuy(don, loaiHuy, now, "Đơn đã bàn giao; phải xử lý nhận trả/đối soát.");

        var thu = await DocThuAsync(don.MaDonThue, ct);
        if (thu.ChuaPhanLoai != 0)
            return KhongTheHuy(don, loaiHuy, now, "Đơn có khoản thu chưa phân loại tiền thuê/cọc; cần đối chiếu thanh toán trước.");
        var cs = await DocChinhSachAsync(don.MaChinhSach, ct);
        return TaoXemTruoc(don, loaiHuy, now, thu, cs, BangTinhHuy.Tinh(TaoDauVao(don, loaiHuy, now, thu, cs)));
    }

    private static XemTruocHuyResponse TaoXemTruoc(DonThue don, string loaiHuy, DateTime now, ThuDaPhanLoai thu, ChinhSachHuy cs, BangHuy b)
    {
        var canhBao = new List<string>();
        if (b.TienThuVuot > 0)
            canhBao.Add($"Có {TienTe.HienThi(b.TienThuVuot)} thu vượt nghĩa vụ đơn; khoản này xử lý theo luồng thu thừa, không nằm trong bảng hủy.");
        if (b.TongHoan > 0)
            canhBao.Add("Số tiền hoàn là dự kiến; tiền về tài khoản sau khi cổng thanh toán xác nhận.");
        return new XemTruocHuyResponse(don.MaDonThue, don.TrangThai.ToString(), loaiHuy, true, null, now, don.GioNhanDuKien,
            b.SoGioTruocNhan, b.Nhanh, don.MaChinhSach, b.TyLe, thu.TienThue, thu.TienCoc,
            b.TienThueGiuLai, b.TienThueHoan, b.TienCocHoan, b.TongHoan, b.TienThuVuot, b.DauVanTay, canhBao);
    }

    private static XemTruocHuyResponse KhongTheHuy(DonThue don, string loaiHuy, DateTime now, string lyDo)
        => new(don.MaDonThue, don.TrangThai.ToString(), loaiHuy, false, lyDo, now, don.GioNhanDuKien,
            Math.Round((don.GioNhanDuKien - now).TotalHours, 2), "", don.MaChinhSach, null, 0, 0, 0, 0, 0, 0, 0, "", new());

    private static void KiemTraConTruocBanGiao(DonThue don)
    {
        if (DaKetThucHuy.Contains(don.TrangThai))
            throw new DonDaHuyKhacYDinhException("Đơn đã hủy hoặc hết hạn.", new { trangThai = don.TrangThai.ToString() });
        if (!TruocBanGiao.Contains(don.TrangThai))
            throw new DonDaBanGiaoException(ct: new { trangThai = don.TrangThai.ToString() });
    }

    /// <summary>Khách: chỉ đơn của mình, chỉ KhachHuy. CuaHangHuy: quản trị viên. KhongDenNhan: nhân viên/quản trị viên.</summary>
    private async Task<TaiKhoan> KiemTraQuyenAsync(long maDonThue, long maTaiKhoan, string loaiHuy, CancellationToken ct)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan, ct);
        if (tk.VaiTro == "KhachHang")
        {
            if (loaiHuy != LoaiHuyDon.KhachHuy)
                throw new KhongCoQuyenHuyException("Khách hàng không được chọn hủy do cửa hàng hoặc ghi nhận không đến nhận.");
            var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan, ct);
            // Không phân biệt "không tồn tại" và "của người khác".
            if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue && d.MaKhachHang == maKhach, ct))
                throw new DonKhongTimThayException();
            return tk;
        }

        if (loaiHuy == LoaiHuyDon.KhachHuy)
            throw new KhongCoQuyenHuyException("Nhân viên không hủy thay khách; dùng hủy do cửa hàng hoặc ghi nhận không đến nhận.");
        if (loaiHuy == LoaiHuyDon.CuaHangHuy)
            await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoan, ct);
        else
            await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan, ct);
        if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue, ct))
            throw new DonKhongTimThayException();
        return tk;
    }

    /// <summary>Khóa hàng đơn bằng UPDATE không đổi giá trị — cùng hàng mà chốt bàn giao/thanh toán cập nhật.</summary>
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

    private async Task<HuyDonResponse> TaoKetQuaAsync(long maDonThue, string loaiHuy, long maTaiKhoanXem, bool laNoiBo, CancellationToken ct)
    {
        var don = await _context.DonThues.AsNoTracking().FirstAsync(d => d.MaDonThue == maDonThue, ct);
        var hoan = await _hoanTien.TongHopTheoDonAsync(maDonThue, laNoiBo, ct);
        var lichSu = (await _context.LichSuTrangThaiDons.AsNoTracking()
                .Where(l => l.MaDonThue == maDonThue)
                .OrderBy(l => l.ThoiDiem).ThenBy(l => l.MaLichSuDon)
                .Select(l => new { l.ThoiDiem, l.TrangThaiTruoc, l.TrangThaiSau, l.LyDo, l.MaNguoiThucHien })
                .ToListAsync(ct))
            .Select(l => new SuKienDonResponse(l.ThoiDiem, l.TrangThaiTruoc, l.TrangThaiSau,
                laNoiBo || l.MaNguoiThucHien == maTaiKhoanXem ? l.LyDo : null))
            .ToList();
        return new HuyDonResponse(maDonThue, don.TrangThai.ToString(), loaiHuy, don.ThoiDiemHuy, don.LyDoHuy,
            don.TienThueGiuLaiKhiHuy, hoan.Items, hoan.TongDuKien + hoan.TongDangXuLy + hoan.TongCanXuLyLai, hoan.TongDaHoan,
            hoan.Items.Count(i => i.TrangThai != TrangThaiHoanTien.ThanhCong && i.NhanHienThi != "DaThayThe"), lichSu);
    }
}
