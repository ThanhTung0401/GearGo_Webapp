using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Integrations.Payments;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class HoanTienService
{
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
                var moi = await TaoLanThuMoiAsync(h, maTaiKhoan, maNhanVien, request.GhiChuXuLy, ct);
                await GuiMotAsync(moi, maNhanVien, ct);
                return await MapAsync(moi, laNoiBo: true, ct);
            default:
                if (!string.IsNullOrWhiteSpace(request.GhiChuXuLy))
                    await _context.HoanTiens.Where(x => x.MaHoanTien == maHoanTien)
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.GhiChu, NoiGhiChu(h.GhiChu, request.GhiChuXuLy)), ct);
                await GuiMotAsync(maHoanTien, maNhanVien, ct);
                return await MapAsync(maHoanTien, laNoiBo: true, ct);
        }
    }

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
        var choGui = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.TrangThai == TrangThaiHoanTien.ChoXuLy && h.ThoiDiemYeuCau < moc)
            .OrderBy(h => h.MaHoanTien).Select(h => h.MaHoanTien).Take(GioiHanMoiLuot).ToListAsync(ct);
        await GuiYeuCauDaLapAsync(choGui, null, ct);

        var choDoiChieu = await _context.HoanTiens.AsNoTracking()
            .Where(h => (h.TrangThai == TrangThaiHoanTien.DangXuLy || h.TrangThai == TrangThaiHoanTien.ChuaRoKetQua) && h.ThoiDiemYeuCau < moc)
            .OrderBy(h => h.MaHoanTien).Select(h => h.MaHoanTien).Take(GioiHanMoiLuot).ToListAsync(ct);
        foreach (var id in choDoiChieu)
        {
            try { await DoiChieuMotAsync(id, ct); }
            catch (Exception ex) when (ex is not OperationCanceledException) { _logger.LogError(ex, "Đối chiếu khoản hoàn {MaHoanTien} lỗi.", id); }
        }
        return new TiepTucHoanKetQua(choGui.Count, choDoiChieu.Count);
    }

    private async Task GuiMotAsync(long maHoanTien, long? maNhanVien, CancellationToken ct)
    {
        // UPDATE có điều kiện: chỉ một tiến trình chuyển ChoXuLy → DangXuLy và được gửi.
        var q = _context.HoanTiens.Where(h => h.MaHoanTien == maHoanTien && h.TrangThai == TrangThaiHoanTien.ChoXuLy);
        var n = maNhanVien.HasValue
            ? await q.ExecuteUpdateAsync(s => s.SetProperty(h => h.TrangThai, TrangThaiHoanTien.DangXuLy).SetProperty(h => h.MaNguoiXuLy, maNhanVien), ct)
            : await q.ExecuteUpdateAsync(s => s.SetProperty(h => h.TrangThai, TrangThaiHoanTien.DangXuLy), ct);
        if (n == 0) return;

        var info = await _context.HoanTiens.AsNoTracking().Where(h => h.MaHoanTien == maHoanTien)
            .Select(h => new { h.MaYeuCau, h.SoTien, h.ChiTietThanhToanGoc.ThanhToan.CongThanhToan, h.ChiTietThanhToanGoc.ThanhToan.MaGiaoDichCong })
            .FirstAsync(ct);

        PhanHoiHoanGateway ph;
        try
        {
            ph = await _gateway.GuiYeuCauHoanAsync(new YeuCauHoanGateway(info.MaYeuCau!, info.SoTien, info.CongThanhToan, info.MaGiaoDichCong), ct);
        }
        catch (Exception ex)
        {
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
}
