using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Integrations.Payments;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class HoanTienService : IHoanTienService
{
    private const int GioiHanMoiLuot = 50;

    private readonly ApplicationDbContext _context;
    private readonly IRefundGateway _gateway;
    private readonly ILichSuNghiepVuService _lichSu;
    private readonly IThongBaoService _thongBao;
    private readonly TimeProvider _clock;
    private readonly ILogger<HoanTienService> _logger;

    public HoanTienService(ApplicationDbContext context, IRefundGateway gateway, ILichSuNghiepVuService lichSu,
        IThongBaoService thongBao, TimeProvider clock, ILogger<HoanTienService> logger)
    {
        _context = context;
        _gateway = gateway;
        _lichSu = lichSu;
        _thongBao = thongBao;
        _clock = clock;
        _logger = logger;
    }

    private DateTime Now => _clock.GetUtcNow().UtcDateTime;

    // ───────────────────────── LẬP YÊU CẦU (trong transaction bên gọi) ─────────────────────────

    public async Task<List<HoanTien>> LapYeuCauHoanAsync(LapHoanCommand c, long? maTaiKhoanThucHien, CancellationToken ct = default)
    {
        if (_context.Database.CurrentTransaction == null)
            throw new InvalidOperationException("LapYeuCauHoanAsync phải chạy trong transaction của bên gọi (khóa nguồn và lập intent cùng commit).");
        if (!LoaiHoanTien.TatCa.Contains(c.LoaiHoan))
            throw new ArgumentException($"Loại hoàn không hợp lệ: {c.LoaiHoan}.");
        if (c.LoaiHoan == LoaiHoanTien.HoanCocDoiSoat && c.MaDoiSoat == null)
            throw new ArgumentException("Hoàn cọc theo đối soát phải có mã đối soát.");
        if (string.IsNullOrWhiteSpace(c.KhoaNghiaVu) || HoanTienTongHop.TaoMaYeuCau(c.KhoaNghiaVu, long.MaxValue, 99).Length > 100)
            throw new ArgumentException("Khóa nghĩa vụ hoàn thiếu hoặc quá dài.");
        var tong = TienTe.LamTronVnd(c.TongSoTien);
        if (tong <= 0)
            throw new ArgumentException("Không lập khoản hoàn 0 đồng; bên gọi bỏ qua nghĩa vụ không cần hoàn.");
        if (c.NguonUngVien.Count == 0)
            throw new NguonHoanKhongHopLeException("Nghĩa vụ hoàn không có nguồn thu gốc.", new { c.KhoaNghiaVu });

        // Bấm lại / gọi lại cùng nghĩa vụ: trả bộ cũ, không lập thêm.
        var tienTo = HoanTienTongHop.TienToNghiaVu(c.KhoaNghiaVu);
        var daCo = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.MaYeuCau != null && h.MaYeuCau.StartsWith(tienTo)).ToListAsync(ct);
        daCo.AddRange(_context.ChangeTracker.Entries<HoanTien>()
            .Where(e => e.State == EntityState.Added && e.Entity.MaYeuCau != null && e.Entity.MaYeuCau.StartsWith(tienTo))
            .Select(e => e.Entity));
        if (daCo.Count > 0)
        {
            var thayThe = HoanTienTongHop.CacLanDaThayThe(daCo.Select(ToDong).ToList());
            var hienHanh = daCo.Where(h => !thayThe.Contains(h.MaHoanTien)).ToList();
            if (hienHanh.Sum(h => h.SoTien) != tong)
                throw new NguonHoanKhongHopLeException("Nghĩa vụ hoàn đã được lập với số tiền khác; cần lập nghĩa vụ điều chỉnh riêng.",
                    new { c.KhoaNghiaVu, daLap = hienHanh.Sum(h => h.SoTien), yeuCau = tong });
            return hienHanh;
        }

        // Khóa các nguồn theo thứ tự mã tăng dần (cùng thứ tự ở mọi đường ghi) trước khi đọc hạn mức.
        var ids = c.NguonUngVien.Distinct().OrderBy(x => x).ToList();
        foreach (var id in ids)
            await KhoaNguonAsync(id, ct);

        var hanMuc = await TinhHanMucAsync(ids, ct);
        var mucDichBatBuoc = LoaiHoanTien.MucDichNguonBatBuoc(c.LoaiHoan);
        foreach (var id in ids)
        {
            if (!hanMuc.TryGetValue(id, out var n))
                throw new NguonHoanKhongHopLeException("Chi tiết thu gốc không tồn tại.", new { maChiTietThanhToan = id });
            if (n.MaDonThue != c.MaDonThue)
                throw new NguonHoanKhongHopLeException("Chi tiết thu gốc không thuộc đơn của nghĩa vụ.", new { maChiTietThanhToan = id });
            if (n.TrangThaiThu != TrangThaiThanhToan.ThanhCong)
                throw new NguonHoanKhongHopLeException("Khoản thu gốc chưa thành công; không dùng làm nguồn hoàn.", new { maChiTietThanhToan = id, n.TrangThaiThu });
            if (!MucDichThanhToan.TatCa.Contains(n.MucDich) || (mucDichBatBuoc != null && n.MucDich != mucDichBatBuoc))
                throw new NguonHoanKhongHopLeException("Mục đích khoản thu gốc không khớp loại hoàn.",
                    new { maChiTietThanhToan = id, n.MucDich, c.LoaiHoan });
        }

        // Phân bổ theo thứ tự nguồn ổn định; mỗi dòng HOAN_TIEN một nguồn bắt buộc.
        var conLai = tong;
        var phanBo = new List<(long Id, decimal SoTien)>();
        foreach (var id in ids)
        {
            if (conLai <= 0) break;
            var lay = Math.Min(conLai, hanMuc[id].ConCoTheLap);
            if (lay <= 0) continue;
            phanBo.Add((id, lay));
            conLai -= lay;
        }
        if (conLai > 0)
            throw new VuotHanMucHoanException("Tổng đã hoàn, đang giữ và yêu cầu mới vượt số thực thu của nguồn.",
                new { yeuCau = tong, conCoTheLap = tong - conLai, nguon = ids.Select(id => hanMuc[id].ToResponse(id)).ToList() });

        var maNhanVien = maTaiKhoanThucHien.HasValue ? await ActorGuard.LayMaNhanVienAsync(_context, maTaiKhoanThucHien.Value, ct) : null;
        var now = Now;
        var rows = phanBo.Select(p => new HoanTien
        {
            MaChiTietThanhToanGoc = p.Id,
            MaDoiSoat = c.MaDoiSoat,
            MaNguoiXuLy = maNhanVien,
            MaYeuCau = HoanTienTongHop.TaoMaYeuCau(c.KhoaNghiaVu, p.Id, 1),
            LoaiHoan = c.LoaiHoan,
            SoTien = p.SoTien,
            LyDo = c.LyDo,
            ThoiDiemYeuCau = now,
            TrangThai = TrangThaiHoanTien.ChoXuLy
        }).ToList();
        _context.HoanTiens.AddRange(rows);

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(maTaiKhoanThucHien, "LAP_YEU_CAU_HOAN", "HOAN_TIEN", c.KhoaNghiaVu,
            null, new { c.MaDonThue, c.LoaiHoan, c.MaDoiSoat, tong, phanBo = rows.Select(r => new { r.MaYeuCau, r.MaChiTietThanhToanGoc, r.SoTien }) },
            c.LyDo));
        return rows;
    }

    public async Task<HanMucNguonResponse> LayHanMucNguonAsync(long maChiTietThanhToan, CancellationToken ct = default)
    {
        var hm = await TinhHanMucAsync(new List<long> { maChiTietThanhToan }, ct);
        return hm.TryGetValue(maChiTietThanhToan, out var n)
            ? n.ToResponse(maChiTietThanhToan)
            : throw new NguonHoanKhongHopLeException("Chi tiết thu gốc không tồn tại.", new { maChiTietThanhToan });
    }

    // ───────────────────────── GỬI GATEWAY (ngoài transaction) ─────────────────────────

    public async Task GuiYeuCauDaLapAsync(IEnumerable<long> maHoanTiens, long? maNhanVien, CancellationToken ct = default)
    {
        foreach (var id in maHoanTiens.Distinct().OrderBy(x => x))
        {
            try { await GuiMotAsync(id, maNhanVien, ct); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Intent đã bền vững trong database; job phục hồi sẽ tiếp tục, không làm hỏng nghiệp vụ đã commit.
                _logger.LogError(ex, "Gửi yêu cầu hoàn {MaHoanTien} thất bại; để job đối chiếu xử lý tiếp.", id);
            }
        }
    }

    public async Task<HoanTienResponse> XuLyYeuCauHoanAsync(long maHoanTien, XuLyHoanRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan, ct);
        var maNhanVien = await ActorGuard.LayMaNhanVienAsync(_context, maTaiKhoan, ct);
        var h = await _context.HoanTiens.AsNoTracking().FirstOrDefaultAsync(x => x.MaHoanTien == maHoanTien, ct)
                ?? throw new HoanTienKhongTimThayException();

        switch (h.TrangThai)
        {
            case TrangThaiHoanTien.ThanhCong:
                return await MapAsync(maHoanTien, laNoiBo: true, ct);
            case TrangThaiHoanTien.DangXuLy:
            case TrangThaiHoanTien.ChuaRoKetQua:
                throw new HoanChuaRoKetQuaException("Yêu cầu đã gửi và chưa xác định kết quả; phải đối chiếu trước khi gửi lần mới.",
                    new { h.MaHoanTien, h.MaYeuCau, h.TrangThai });
            case TrangThaiHoanTien.ThatBai:
            {
                var moi = await TaoLanThuMoiAsync(h, maTaiKhoan, maNhanVien, request.GhiChuXuLy, ct);
                await GuiMotAsync(moi, maNhanVien, ct);
                return await MapAsync(moi, laNoiBo: true, ct);
            }
            default:
                if (!string.IsNullOrWhiteSpace(request.GhiChuXuLy))
                    await _context.HoanTiens.Where(x => x.MaHoanTien == maHoanTien)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.GhiChu, NoiGhiChu(h.GhiChu, request.GhiChuXuLy)), ct);
                await GuiMotAsync(maHoanTien, maNhanVien, ct);
                return await MapAsync(maHoanTien, laNoiBo: true, ct);
        }
    }

    // ───────────────────────── KẾT QUẢ / ĐỐI CHIẾU ─────────────────────────

    public async Task<HoanTienResponse> XuLyKetQuaHoanAsync(KetQuaHoanCallbackRequest kq, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(kq.MaYeuCau) || string.IsNullOrWhiteSpace(kq.TrangThai)
            || !_gateway.XacMinhChuKy(kq.MaYeuCau, kq.MaGiaoDichHoanCong, kq.SoTien, kq.TrangThai, kq.ChuKy))
            throw new KetQuaHoanKhongKhopException("Kết quả hoàn không xác minh được (chữ ký/mã yêu cầu).");

        var ketQua = kq.TrangThai switch
        {
            "ThanhCong" => KetQuaHoanGateway.ThanhCong,
            "ThatBai" => KetQuaHoanGateway.ThatBai,
            "DangXuLy" => KetQuaHoanGateway.DaTiepNhan,
            _ => throw new KetQuaHoanKhongKhopException("Trạng thái kết quả hoàn không hợp lệ.", new { kq.TrangThai })
        };
        var id = await GhiNhanKetQuaAsync(kq.MaYeuCau,
            new PhanHoiHoanGateway(ketQua, kq.MaGiaoDichHoanCong, kq.SoTien, kq.ThoiDiem, null), "Callback", ct);
        return await MapAsync(id, laNoiBo: true, ct);
    }

    public async Task<HoanTienResponse> DoiChieuKetQuaHoanAsync(long maHoanTien, long maTaiKhoan, CancellationToken ct = default)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan, ct);
        if (!await _context.HoanTiens.AnyAsync(h => h.MaHoanTien == maHoanTien, ct))
            throw new HoanTienKhongTimThayException();
        await DoiChieuMotAsync(maHoanTien, ct);
        return await MapAsync(maHoanTien, laNoiBo: true, ct);
    }

    public async Task<TiepTucHoanKetQua> TiepTucCacYeuCauDangChoAsync(TimeSpan doTre, CancellationToken ct = default)
    {
        var moc = Now - doTre;
        // Đọc lại từ database: không phụ thuộc trạng thái trong RAM của lần chạy trước.
        var choGui = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.TrangThai == TrangThaiHoanTien.ChoXuLy && h.ThoiDiemYeuCau < moc)
            .OrderBy(h => h.MaHoanTien).Select(h => h.MaHoanTien).Take(GioiHanMoiLuot).ToListAsync(ct);
        await GuiYeuCauDaLapAsync(choGui, null, ct);

        var choDoiChieu = await _context.HoanTiens.AsNoTracking()
            .Where(h => (h.TrangThai == TrangThaiHoanTien.DangXuLy || h.TrangThai == TrangThaiHoanTien.ChuaRoKetQua)
                        && h.ThoiDiemYeuCau < moc)
            .OrderBy(h => h.MaHoanTien).Select(h => h.MaHoanTien).Take(GioiHanMoiLuot).ToListAsync(ct);
        foreach (var id in choDoiChieu)
        {
            try { await DoiChieuMotAsync(id, ct); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Đối chiếu khoản hoàn {MaHoanTien} lỗi.", id);
            }
        }
        return new TiepTucHoanKetQua(choGui.Count, choDoiChieu.Count);
    }

    // ───────────────────────── TRUY VẤN ─────────────────────────

    public async Task<HoanTienTheoDonResponse> LayDanhSachTheoDonAsync(long maDonThue, long maTaiKhoan, CancellationToken ct = default)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan, ct);
        var laKhach = tk.VaiTro == "KhachHang";
        if (laKhach)
        {
            var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan, ct);
            if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue && d.MaKhachHang == maKhach, ct))
                throw new DonKhongTimThayException();
        }
        else
        {
            await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan, ct);
            if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue, ct))
                throw new DonKhongTimThayException();
        }
        return await TongHopTheoDonAsync(maDonThue, laNoiBo: !laKhach, ct);
    }

    public async Task<HoanTienTheoDonResponse> TongHopTheoDonAsync(long maDonThue, bool laNoiBo, CancellationToken ct = default)
    {
        // HOAN_TIEN không có FK đơn: đi qua chi tiết thu gốc → thanh toán → đơn.
        var rows = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == maDonThue)
            .OrderBy(h => h.MaHoanTien)
            .Select(h => new HoanTienRow(h.MaHoanTien, h.MaYeuCau, h.MaChiTietThanhToanGoc, h.ChiTietThanhToanGoc.MucDich,
                h.MaDoiSoat, h.LoaiHoan, h.SoTien, h.TrangThai, h.ThoiDiemYeuCau, h.ThoiDiemThanhCong, h.LyDo, h.MaGiaoDichHoanCong))
            .ToListAsync(ct);

        var dongs = rows.Select(r => new HoanTienTongHop.Dong(r.MaHoanTien, r.MaYeuCau, r.LoaiHoan, r.SoTien, r.TrangThai)).ToList();
        var thayThe = HoanTienTongHop.CacLanDaThayThe(dongs);
        var tong = HoanTienTongHop.Tong(dongs);
        return new HoanTienTheoDonResponse(maDonThue,
            rows.Select(r => r.ToResponse(thayThe.Contains(r.MaHoanTien), laNoiBo)).ToList(),
            tong.DuKien, tong.DangXuLy, tong.DaHoan, tong.CanXuLyLai,
            HoanTienTongHop.TheoNghiaVu(dongs));
    }

    // ───────────────────────── NỘI BỘ ─────────────────────────

    private async Task GuiMotAsync(long maHoanTien, long? maNhanVien, CancellationToken ct)
    {
        // UPDATE có điều kiện: chỉ một tiến trình chuyển ChoXuLy → DangXuLy và được gửi.
        var q = _context.HoanTiens.Where(h => h.MaHoanTien == maHoanTien && h.TrangThai == TrangThaiHoanTien.ChoXuLy);
        var n = maNhanVien.HasValue
            ? await q.ExecuteUpdateAsync(s => s.SetProperty(h => h.TrangThai, TrangThaiHoanTien.DangXuLy)
                .SetProperty(h => h.MaNguoiXuLy, maNhanVien), ct)
            : await q.ExecuteUpdateAsync(s => s.SetProperty(h => h.TrangThai, TrangThaiHoanTien.DangXuLy), ct);
        if (n == 0) return; // đã được gửi bởi tiến trình khác hoặc đã có kết quả

        var info = await _context.HoanTiens.AsNoTracking().Where(h => h.MaHoanTien == maHoanTien)
            .Select(h => new { h.MaYeuCau, h.SoTien, h.ChiTietThanhToanGoc.ThanhToan.CongThanhToan, h.ChiTietThanhToanGoc.ThanhToan.MaGiaoDichCong })
            .FirstAsync(ct);

        PhanHoiHoanGateway ph;
        try
        {
            ph = await _gateway.GuiYeuCauHoanAsync(
                new YeuCauHoanGateway(info.MaYeuCau!, info.SoTien, info.CongThanhToan, info.MaGiaoDichCong), ct);
        }
        catch (Exception ex)
        {
            // Timeout/mất kết nối: có thể gateway đã hoàn. Giữ hạn mức, chỉ đối chiếu bằng cùng mã.
            _logger.LogWarning(ex, "Gửi hoàn {MaYeuCau} chưa rõ kết quả.", info.MaYeuCau);
            await DanhDauChuaRoAsync(maHoanTien, ex.Message, CancellationToken.None);
            return;
        }
        if (ph.KetQua == KetQuaHoanGateway.KhongTimThay)
        {
            await DanhDauChuaRoAsync(maHoanTien, "Gateway trả KhongTimThay ngay khi gửi", CancellationToken.None);
            return;
        }
        await GhiNhanKetQuaAsync(info.MaYeuCau!, ph, "GuiYeuCau", ct);
    }

    private async Task DoiChieuMotAsync(long maHoanTien, CancellationToken ct)
    {
        var h = await _context.HoanTiens.AsNoTracking().FirstAsync(x => x.MaHoanTien == maHoanTien, ct);
        // Chỉ yêu cầu đã gửi mà chưa có kết quả mới cần tra cứu; ChoXuLy chưa từng gửi.
        if (h.TrangThai != TrangThaiHoanTien.DangXuLy && h.TrangThai != TrangThaiHoanTien.ChuaRoKetQua) return;

        PhanHoiHoanGateway ph;
        try { ph = await _gateway.TraCuuAsync(h.MaYeuCau!, ct); }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tra cứu hoàn {MaYeuCau} không có phản hồi.", h.MaYeuCau);
            await DanhDauChuaRoAsync(maHoanTien, "Tra cứu không có phản hồi: " + ex.Message, CancellationToken.None);
            return;
        }
        await GhiNhanKetQuaAsync(h.MaYeuCau!, ph, "DoiChieu", ct);
    }

    private Task<int> DanhDauChuaRoAsync(long maHoanTien, string lyDo, CancellationToken ct)
    {
        var ghiChu = $"[{Now:yyyy-MM-dd HH:mm:ss}Z] Chưa rõ kết quả: {lyDo}";
        return _context.HoanTiens
            .Where(h => h.MaHoanTien == maHoanTien && h.TrangThai == TrangThaiHoanTien.DangXuLy)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.TrangThai, TrangThaiHoanTien.ChuaRoKetQua)
                .SetProperty(h => h.GhiChu, h => h.GhiChu == null ? ghiChu : h.GhiChu + "\n" + ghiChu), ct);
    }

    /// <summary>
    /// Handler duy nhất cho mọi kết quả đã xác minh (phản hồi đồng bộ, callback, tra cứu).
    /// Khóa dòng HOAN_TIEN; thành công ghi đúng một lần và không bị thất bại đến sau ghi đè.
    /// </summary>
    private async Task<long> GhiNhanKetQuaAsync(string maYeuCau, PhanHoiHoanGateway ph, string nguonKetQua, CancellationToken ct)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        var khoa = await _context.HoanTiens.Where(h => h.MaYeuCau == maYeuCau)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.TrangThai, h => h.TrangThai), ct);
        if (khoa == 0)
            throw new KetQuaHoanKhongKhopException("Không có yêu cầu hoàn với mã này.", new { maYeuCau });

        var h = await TaiTheoDoiAsync(maYeuCau, ct);
        if (ph.SoTien.HasValue && TienTe.LamTronVnd(ph.SoTien.Value) != h.SoTien)
        {
            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(null, "KET_QUA_HOAN_SAI_SO_TIEN", "HOAN_TIEN", h.MaHoanTien.ToString(),
                new { h.SoTien, h.TrangThai }, new { ph.SoTien, KetQua = ph.KetQua.ToString(), ph.MaGiaoDichHoanCong }, nguonKetQua));
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw new KetQuaHoanKhongKhopException("Số tiền trong kết quả không khớp yêu cầu hoàn; không đánh dấu đã hoàn.",
                new { maYeuCau, soTienYeuCau = h.SoTien, soTienKetQua = ph.SoTien });
        }

        var truoc = h.TrangThai;
        string? mauThuan = null;
        switch (ph.KetQua)
        {
            case KetQuaHoanGateway.ThanhCong:
                if (truoc == TrangThaiHoanTien.ThanhCong)
                {
                    // Callback lặp: giữ thời điểm/mã thành công đầu tiên.
                    if (ph.MaGiaoDichHoanCong != null && h.MaGiaoDichHoanCong != null && ph.MaGiaoDichHoanCong != h.MaGiaoDichHoanCong)
                        mauThuan = $"Thành công lặp với mã giao dịch khác ({ph.MaGiaoDichHoanCong})";
                    break;
                }
                if (truoc == TrangThaiHoanTien.ThatBai)
                    mauThuan = "Thành công đến sau khi đã ghi thất bại; kiểm tra lần thử thay thế để tránh hoàn hai lần";
                h.TrangThai = TrangThaiHoanTien.ThanhCong;
                h.MaGiaoDichHoanCong = ph.MaGiaoDichHoanCong ?? h.MaGiaoDichHoanCong;
                h.ThoiDiemThanhCong = ph.ThoiDiem ?? Now;
                break;
            case KetQuaHoanGateway.ThatBai:
                if (truoc == TrangThaiHoanTien.ThanhCong)
                {
                    mauThuan = "Kết quả thất bại đến sau thành công; giữ thành công";
                    break;
                }
                if (truoc != TrangThaiHoanTien.ThatBai)
                    h.TrangThai = TrangThaiHoanTien.ThatBai; // bằng chứng chắc chắn → giải phóng hạn mức
                break;
            case KetQuaHoanGateway.DaTiepNhan:
                if (truoc == TrangThaiHoanTien.ChuaRoKetQua || truoc == TrangThaiHoanTien.ChoXuLy)
                    h.TrangThai = TrangThaiHoanTien.DangXuLy;
                h.MaGiaoDichHoanCong ??= ph.MaGiaoDichHoanCong;
                break;
            case KetQuaHoanGateway.KhongTimThay:
                // Gateway chưa từng nhận yêu cầu → an toàn gửi lại CÙNG mã.
                if (truoc == TrangThaiHoanTien.DangXuLy || truoc == TrangThaiHoanTien.ChuaRoKetQua)
                    h.TrangThai = TrangThaiHoanTien.ChoXuLy;
                break;
        }

        if (mauThuan != null)
        {
            h.GhiChu = NoiGhiChu(h.GhiChu, $"Mâu thuẫn kết quả ({nguonKetQua}): {mauThuan}");
            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(null, "MAU_THUAN_KET_QUA_HOAN", "HOAN_TIEN", h.MaHoanTien.ToString(),
                new { TrangThai = truoc }, new { KetQua = ph.KetQua.ToString(), ph.MaGiaoDichHoanCong, ph.ThoiDiem }, mauThuan));
        }

        if (h.TrangThai != truoc)
        {
            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(null, "KET_QUA_HOAN", "HOAN_TIEN", h.MaHoanTien.ToString(),
                new { TrangThai = truoc }, new { h.TrangThai, h.MaGiaoDichHoanCong, h.ThoiDiemThanhCong }, nguonKetQua));
            if (h.TrangThai is TrangThaiHoanTien.ThanhCong or TrangThaiHoanTien.ThatBai)
                await ThongBaoKetQuaAsync(h, ct);
        }

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return h.MaHoanTien;
    }

    private async Task ThongBaoKetQuaAsync(HoanTien h, CancellationToken ct)
    {
        var maDon = await _context.ChiTietThanhToans.AsNoTracking()
            .Where(c => c.MaChiTietThanhToan == h.MaChiTietThanhToanGoc).Select(c => c.ThanhToan.MaDonThue).FirstAsync(ct);
        var thanhCong = h.TrangThai == TrangThaiHoanTien.ThanhCong;
        await _thongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
            maDon, LoaiSuKienThongBao.HoanTien, MaSuKienThongBao.HoanTien(h.MaHoanTien, h.TrangThai),
            thanhCong ? "Hoàn tiền thành công" : "Hoàn tiền đang được xử lý lại",
            thanhCong
                ? $"Khoản hoàn {TienTe.HienThi(h.SoTien)} đã được chuyển thành công."
                : $"Khoản hoàn {TienTe.HienThi(h.SoTien)} chưa chuyển được; cửa hàng sẽ xử lý lại, bạn chưa cần thao tác."));
    }

    private async Task<long> TaoLanThuMoiAsync(HoanTien thatBai, long maTaiKhoan, long? maNhanVien, string? ghiChu, CancellationToken ct)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        await KhoaNguonAsync(thatBai.MaChiTietThanhToanGoc, ct);

        var (khoaNguon, _, _) = HoanTienTongHop.TachMa(thatBai.MaYeuCau, thatBai.MaHoanTien);
        var cungNguon = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.MaYeuCau == khoaNguon || (h.MaYeuCau != null && h.MaYeuCau.StartsWith(khoaNguon + ":L")))
            .ToListAsync(ct);
        var moiNhat = cungNguon.MaxBy(h => h.MaHoanTien)!;
        // Đã có lần thử khác chưa thất bại (đang chờ/thành công): không lập thêm.
        if (moiNhat.TrangThai != TrangThaiHoanTien.ThatBai)
        {
            await tx.CommitAsync(ct);
            return moiNhat.MaHoanTien;
        }

        var hm = (await TinhHanMucAsync(new List<long> { moiNhat.MaChiTietThanhToanGoc }, ct))[moiNhat.MaChiTietThanhToanGoc];
        if (moiNhat.SoTien > hm.ConCoTheLap)
            throw new VuotHanMucHoanException("Nguồn không còn đủ hạn mức để hoàn lại khoản thất bại.",
                new { yeuCau = moiNhat.SoTien, nguon = hm.ToResponse(moiNhat.MaChiTietThanhToanGoc) });

        var lanMoi = cungNguon.Max(h => HoanTienTongHop.TachMa(h.MaYeuCau, h.MaHoanTien).LanThu) + 1;
        var maYeuCau = $"{khoaNguon}:L{lanMoi}";
        if (maYeuCau.Length > 100)
            throw new HoanChuaRoKetQuaException("Mã yêu cầu thay thế vượt độ dài cho phép; cần quản trị viên xử lý.", new { moiNhat.MaHoanTien });

        var moi = new HoanTien
        {
            MaChiTietThanhToanGoc = moiNhat.MaChiTietThanhToanGoc,
            MaDoiSoat = moiNhat.MaDoiSoat,
            MaNguoiXuLy = maNhanVien,
            MaYeuCau = maYeuCau,
            LoaiHoan = moiNhat.LoaiHoan,
            SoTien = moiNhat.SoTien,
            LyDo = moiNhat.LyDo,
            ThoiDiemYeuCau = Now,
            TrangThai = TrangThaiHoanTien.ChoXuLy,
            GhiChu = NoiGhiChu($"Lần thử thay thế cho khoản #{moiNhat.MaHoanTien} đã thất bại.", ghiChu)
        };
        _context.HoanTiens.Add(moi);
        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(maTaiKhoan, "LAP_LAI_YEU_CAU_HOAN", "HOAN_TIEN", moiNhat.MaHoanTien.ToString(),
            new { moiNhat.MaYeuCau, moiNhat.TrangThai }, new { moi.MaYeuCau, moi.SoTien }, ghiChu));
        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return moi.MaHoanTien;
    }

    /// <summary>Khóa hàng nguồn thu bằng UPDATE không đổi giá trị (giữ khóa ghi tới hết transaction).</summary>
    private Task<int> KhoaNguonAsync(long maChiTietThanhToan, CancellationToken ct)
        => _context.ChiTietThanhToans.Where(x => x.MaChiTietThanhToan == maChiTietThanhToan)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.SoTien, x => x.SoTien), ct);

    private sealed record NguonHanMuc(string MucDich, decimal ThucThu, decimal DaHoan, decimal DangGiu, string TrangThaiThu, long MaDonThue)
    {
        public decimal ConCoTheLap => Math.Max(0, ThucThu - DaHoan - DangGiu);
        public HanMucNguonResponse ToResponse(long id) => new(id, MucDich, ThucThu, DaHoan, DangGiu, ConCoTheLap);
    }

    /// <summary>
    /// Thực thu − đã hoàn thành công − đang giữ (ChoXuLy/DangXuLy/ChuaRoKetQua), tính trên MỌI loại hoàn của nguồn,
    /// gồm cả intent vừa Add trong transaction hiện tại. Tổng tiền tính phía ứng dụng (dữ liệu nhỏ, đúng kiểu decimal).
    /// </summary>
    private async Task<Dictionary<long, NguonHanMuc>> TinhHanMucAsync(List<long> ids, CancellationToken ct)
    {
        var nguons = await _context.ChiTietThanhToans.AsNoTracking()
            .Where(x => ids.Contains(x.MaChiTietThanhToan))
            .Select(x => new { x.MaChiTietThanhToan, x.MucDich, x.SoTien, x.ThanhToan.TrangThai, x.ThanhToan.MaDonThue })
            .ToListAsync(ct);
        var hoan = await _context.HoanTiens.AsNoTracking()
            .Where(h => ids.Contains(h.MaChiTietThanhToanGoc))
            .Select(h => new { h.MaChiTietThanhToanGoc, h.SoTien, h.TrangThai })
            .ToListAsync(ct);
        hoan.AddRange(_context.ChangeTracker.Entries<HoanTien>()
            .Where(e => e.State == EntityState.Added && ids.Contains(e.Entity.MaChiTietThanhToanGoc))
            .Select(e => new { e.Entity.MaChiTietThanhToanGoc, e.Entity.SoTien, e.Entity.TrangThai }));

        return nguons.ToDictionary(n => n.MaChiTietThanhToan, n =>
        {
            var cuaNguon = hoan.Where(h => h.MaChiTietThanhToanGoc == n.MaChiTietThanhToan).ToList();
            return new NguonHanMuc(n.MucDich, n.SoTien,
                cuaNguon.Where(h => h.TrangThai == TrangThaiHoanTien.ThanhCong).Sum(h => h.SoTien),
                cuaNguon.Where(h => TrangThaiHoanTien.GiuHanMuc.Contains(h.TrangThai)).Sum(h => h.SoTien),
                n.TrangThai, n.MaDonThue);
        });
    }

    /// <summary>Lấy entity đang theo dõi với giá trị mới nhất từ database (tránh bản cũ trong change tracker).</summary>
    private async Task<HoanTien> TaiTheoDoiAsync(string maYeuCau, CancellationToken ct)
    {
        var id = await _context.HoanTiens.AsNoTracking().Where(h => h.MaYeuCau == maYeuCau).Select(h => h.MaHoanTien).FirstAsync(ct);
        var local = _context.HoanTiens.Local.FirstOrDefault(h => h.MaHoanTien == id);
        if (local != null)
        {
            await _context.Entry(local).ReloadAsync(ct);
            return local;
        }
        return await _context.HoanTiens.FirstAsync(h => h.MaHoanTien == id, ct);
    }

    private async Task<HoanTienResponse> MapAsync(long maHoanTien, bool laNoiBo, CancellationToken ct)
    {
        var r = await _context.HoanTiens.AsNoTracking().Where(h => h.MaHoanTien == maHoanTien)
            .Select(h => new HoanTienRow(h.MaHoanTien, h.MaYeuCau, h.MaChiTietThanhToanGoc, h.ChiTietThanhToanGoc.MucDich,
                h.MaDoiSoat, h.LoaiHoan, h.SoTien, h.TrangThai, h.ThoiDiemYeuCau, h.ThoiDiemThanhCong, h.LyDo, h.MaGiaoDichHoanCong))
            .FirstAsync(ct);
        var (khoaNguon, _, _) = HoanTienTongHop.TachMa(r.MaYeuCau, r.MaHoanTien);
        var coLanMoiHon = await _context.HoanTiens.AnyAsync(h => h.MaHoanTien > r.MaHoanTien && h.MaYeuCau != null
            && h.MaYeuCau.StartsWith(khoaNguon + ":L"), ct);
        return r.ToResponse(coLanMoiHon, laNoiBo);
    }

    private static HoanTienTongHop.Dong ToDong(HoanTien h) => new(h.MaHoanTien, h.MaYeuCau, h.LoaiHoan, h.SoTien, h.TrangThai);

    private static string? NoiGhiChu(string? cu, string? moi)
        => string.IsNullOrWhiteSpace(moi) ? cu : string.IsNullOrWhiteSpace(cu) ? moi : cu + "\n" + moi;

    private sealed record HoanTienRow(long MaHoanTien, string? MaYeuCau, long MaChiTietThanhToanGoc, string MucDich, long? MaDoiSoat,
        string? LoaiHoan, decimal SoTien, string TrangThai, DateTime ThoiDiemYeuCau, DateTime? ThoiDiemThanhCong, string? LyDo,
        string? MaGiaoDichHoanCong)
    {
        public HoanTienResponse ToResponse(bool daThayThe, bool laNoiBo) => new(
            MaHoanTien, MaYeuCau, MaChiTietThanhToanGoc, MucDich, MaDoiSoat, LoaiHoan, SoTien, TrangThai,
            HoanTienTongHop.NhanHienThi(TrangThai, daThayThe), ThoiDiemYeuCau, ThoiDiemThanhCong, LyDo,
            laNoiBo ? MaGiaoDichHoanCong : null);
    }
}
