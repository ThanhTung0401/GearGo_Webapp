using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Integrations.Payments;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class HoanTienService
{
    private async Task<long> GhiNhanKetQuaAsync(string maYeuCau, PhanHoiHoanGateway ph, string nguonKetQua, CancellationToken ct)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        var khoa = await _context.HoanTiens.Where(h => h.MaYeuCau == maYeuCau)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.TrangThai, h => h.TrangThai), ct);
        if (khoa == 0) throw new KetQuaHoanKhongKhopException("Không có yêu cầu hoàn với mã này.", new { maYeuCau });

        var h = await TaiTheoDoiAsync(maYeuCau, ct);
        if (ph.SoTien.HasValue && CalculationHelpers.LamTronVnd(ph.SoTien.Value) != h.SoTien)
        {
            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(null, "KET_QUA_HOAN_SAI_SO_TIEN", "HOAN_TIEN", h.MaHoanTien.ToString(),
                new { h.SoTien, h.TrangThai }, new { ph.SoTien, KetQua = ph.KetQua.ToString(), ph.MaGiaoDichHoanCong }, nguonKetQua));
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw new KetQuaHoanKhongKhopException("Số tiền trong kết quả không khớp yêu cầu hoàn; không đánh dấu đã hoàn.",
                new { maYeuCau, soTienYeuCau = h.SoTien, soTienKetQua = ph.SoTien });
        }

        var truoc = h.TrangThai;
        var mauThuan = ApDungKetQuaGateway(h, ph);
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

    private string? ApDungKetQuaGateway(HoanTien h, PhanHoiHoanGateway ph)
    {
        var truoc = h.TrangThai;
        switch (ph.KetQua)
        {
            case KetQuaHoanGateway.ThanhCong:
                if (truoc == TrangThaiHoanTien.ThanhCong)
                    return ph.MaGiaoDichHoanCong != null && h.MaGiaoDichHoanCong != null && ph.MaGiaoDichHoanCong != h.MaGiaoDichHoanCong
                        ? $"Thành công lặp với mã giao dịch khác ({ph.MaGiaoDichHoanCong})" : null;
                var msg = truoc == TrangThaiHoanTien.ThatBai ? "Thành công đến sau khi đã ghi thất bại; kiểm tra lần thử thay thế để tránh hoàn hai lần" : null;
                h.TrangThai = TrangThaiHoanTien.ThanhCong;
                h.MaGiaoDichHoanCong = ph.MaGiaoDichHoanCong ?? h.MaGiaoDichHoanCong;
                h.ThoiDiemThanhCong = ph.ThoiDiem ?? Now;
                return msg;
            case KetQuaHoanGateway.ThatBai:
                if (truoc == TrangThaiHoanTien.ThanhCong) return "Kết quả thất bại đến sau thành công; giữ thành công";
                if (truoc != TrangThaiHoanTien.ThatBai) h.TrangThai = TrangThaiHoanTien.ThatBai;
                return null;
            case KetQuaHoanGateway.DaTiepNhan:
                if (truoc is TrangThaiHoanTien.ChuaRoKetQua or TrangThaiHoanTien.ChoXuLy) h.TrangThai = TrangThaiHoanTien.DangXuLy;
                h.MaGiaoDichHoanCong ??= ph.MaGiaoDichHoanCong;
                return null;
            case KetQuaHoanGateway.KhongTimThay:
                if (truoc is TrangThaiHoanTien.DangXuLy or TrangThaiHoanTien.ChuaRoKetQua) h.TrangThai = TrangThaiHoanTien.ChoXuLy;
                return null;
            default:
                return null;
        }
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
                ? $"Khoản hoàn {CalculationHelpers.HienThiVnd(h.SoTien)} đã được chuyển thành công."
                : $"Khoản hoàn {CalculationHelpers.HienThiVnd(h.SoTien)} chưa chuyển được; cửa hàng sẽ xử lý lại, bạn chưa cần thao tác."));
    }

    private async Task<long> TaoLanThuMoiAsync(HoanTien thatBai, long maTaiKhoan, long? maNhanVien, string? ghiChu, CancellationToken ct)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        await KhoaNguonAsync(thatBai.MaChiTietThanhToanGoc, ct);

        var (khoaNguon, _, _) = HoanTienTongHop.TachMa(thatBai.MaYeuCau, thatBai.MaHoanTien);
        var cungNguon = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.MaYeuCau == khoaNguon || (h.MaYeuCau != null && h.MaYeuCau.StartsWith(khoaNguon + ":L"))).ToListAsync(ct);
        var moiNhat = cungNguon.MaxBy(h => h.MaHoanTien)!;
        if (moiNhat.TrangThai != TrangThaiHoanTien.ThatBai) { await tx.CommitAsync(ct); return moiNhat.MaHoanTien; }

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
            MaChiTietThanhToanGoc = moiNhat.MaChiTietThanhToanGoc, MaDoiSoat = moiNhat.MaDoiSoat, MaNguoiXuLy = maNhanVien,
            MaYeuCau = maYeuCau, LoaiHoan = moiNhat.LoaiHoan, SoTien = moiNhat.SoTien, LyDo = moiNhat.LyDo,
            ThoiDiemYeuCau = Now, TrangThai = TrangThaiHoanTien.ChoXuLy,
            GhiChu = NoiGhiChu($"Lần thử thay thế cho khoản #{moiNhat.MaHoanTien} đã thất bại.", ghiChu)
        };
        _context.HoanTiens.Add(moi);
        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(maTaiKhoan, "LAP_LAI_YEU_CAU_HOAN", "HOAN_TIEN", moiNhat.MaHoanTien.ToString(),
            new { moiNhat.MaYeuCau, moiNhat.TrangThai }, new { moi.MaYeuCau, moi.SoTien }, ghiChu));
        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return moi.MaHoanTien;
    }

    private Task<int> KhoaNguonAsync(long maChiTietThanhToan, CancellationToken ct) =>
        _context.ChiTietThanhToans.Where(x => x.MaChiTietThanhToan == maChiTietThanhToan)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.SoTien, x => x.SoTien), ct);

    private sealed record NguonHanMuc(string MucDich, decimal ThucThu, decimal DaHoan, decimal DangGiu, string TrangThaiThu, long MaDonThue)
    {
        public decimal ConCoTheLap => Math.Max(0, ThucThu - DaHoan - DangGiu);
        public HanMucNguonResponse ToResponse(long id) => new(id, MucDich, ThucThu, DaHoan, DangGiu, ConCoTheLap);
    }

    private async Task<Dictionary<long, NguonHanMuc>> TinhHanMucAsync(List<long> ids, CancellationToken ct)
    {
        var nguons = await _context.ChiTietThanhToans.AsNoTracking().Where(x => ids.Contains(x.MaChiTietThanhToan))
            .Select(x => new { x.MaChiTietThanhToan, x.MucDich, x.SoTien, x.ThanhToan.TrangThai, x.ThanhToan.MaDonThue }).ToListAsync(ct);
        var hoan = await _context.HoanTiens.AsNoTracking().Where(h => ids.Contains(h.MaChiTietThanhToanGoc))
            .Select(h => new { h.MaChiTietThanhToanGoc, h.SoTien, h.TrangThai }).ToListAsync(ct);
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

    private async Task<HoanTien> TaiTheoDoiAsync(string maYeuCau, CancellationToken ct)
    {
        var id = await _context.HoanTiens.AsNoTracking().Where(h => h.MaYeuCau == maYeuCau).Select(h => h.MaHoanTien).FirstAsync(ct);
        var local = _context.HoanTiens.Local.FirstOrDefault(h => h.MaHoanTien == id);
        if (local != null) { await _context.Entry(local).ReloadAsync(ct); return local; }
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
    private static string? NoiGhiChu(string? cu, string? moi) => string.IsNullOrWhiteSpace(moi) ? cu : string.IsNullOrWhiteSpace(cu) ? moi : cu + "\n" + moi;

    private sealed record HoanTienRow(long MaHoanTien, string? MaYeuCau, long MaChiTietThanhToanGoc, string MucDich, long? MaDoiSoat,
        string? LoaiHoan, decimal SoTien, string TrangThai, DateTime ThoiDiemYeuCau, DateTime? ThoiDiemThanhCong, string? LyDo, string? MaGiaoDichHoanCong)
    {
        public HoanTienResponse ToResponse(bool daThayThe, bool laNoiBo) => new(
            MaHoanTien, MaYeuCau, MaChiTietThanhToanGoc, MucDich, MaDoiSoat, LoaiHoan, SoTien, TrangThai,
            HoanTienTongHop.NhanHienThi(TrangThai, daThayThe), ThoiDiemYeuCau, ThoiDiemThanhCong, LyDo,
            laNoiBo ? MaGiaoDichHoanCong : null);
    }
}
