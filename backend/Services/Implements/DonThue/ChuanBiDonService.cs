using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

/// <summary>
/// Service chuẩn bị đơn thuê và phân công thiết bị.
/// </summary>
public partial class ChuanBiDonService : IChuanBiDonService
{
    private readonly ApplicationDbContext _db;
    private readonly IThietBiService _thietBiService;
    private readonly ILichSuNghiepVuService _lichSuService;
    private readonly IThongBaoService _thongBaoService;

    public ChuanBiDonService(
        ApplicationDbContext db,
        IThietBiService thietBiService,
        ILichSuNghiepVuService? lichSuService = null,
        IThongBaoService? thongBaoService = null)
    {
        _db = db;
        _thietBiService = thietBiService;
        _lichSuService = lichSuService ?? new LichSuNghiepVuService(db);
        _thongBaoService = thongBaoService ?? new ThongBaoService(db);
    }

    public async Task<Result<ChuanBiResponse>> LayTinhTrangChuanBiAsync(long donId, long maTaiKhoan, CancellationToken ct = default)
    {
        var don = await _db.DonThues
            .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
            ?? throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}.");

        var phanCongs = await TaiPhanCongHieuLucAsync(donId, ct);
        return Result<ChuanBiResponse>.Ok(XayDungResponse(don, phanCongs));
    }

    public async Task<Result<ChuanBiResponse>> BatDauChuanBiAsync(long donId, long maTaiKhoan, CancellationToken ct = default)
    {
        await ActorGuard.LayNhanVienDangLamViecAsync(_db, maTaiKhoan, ct);
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}.");

            if (don.TrangThai != TrangThaiDonThue.DaXacNhan)
                throw new TrangThaiKhongHopLeException($"Chỉ bắt đầu chuẩn bị được đơn ở trạng thái DaXacNhan. Hiện tại: {don.TrangThai}.");

            don.TrangThai = TrangThaiDonThue.DangChuanBi;
            _lichSuService.GhiChuyenTrangThaiDon(new GhiLichSuDonCommand(
                donId, TrangThaiDonThue.DaXacNhan.ToString(), TrangThaiDonThue.DangChuanBi.ToString(),
                maTaiKhoan, "Bắt đầu chuẩn bị đơn thuê"));

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, await TaiPhanCongHieuLucAsync(donId, ct)));
        }
        catch { await tx.RollbackAsync(ct); throw; }
    }

    public async Task<Result<ChuanBiResponse>> XacNhanSanSangAsync(
        long donId, XacNhanSanSangRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        await ActorGuard.LayNhanVienDangLamViecAsync(_db, maTaiKhoan, ct);
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn #{donId}.");

            if (don.TrangThai != TrangThaiDonThue.DangChuanBi)
                throw new TrangThaiKhongHopLeException($"Chỉ xác nhận sẵn sàng được khi đơn ở DangChuanBi. Hiện tại: {don.TrangThai}.");

            var phanCongs = await TaiPhanCongHieuLucAsync(donId, ct);
            var lyDoChuaDu = KiemTraDuDieuKienSanSang(don, phanCongs);
            if (lyDoChuaDu.Any())
                throw new KhongDuDieuKienSanSangException(
                    "Chưa đủ điều kiện xác nhận sẵn sàng: " + string.Join("; ", lyDoChuaDu), lyDoChuaDu);

            don.TrangThai = TrangThaiDonThue.SanSangNhan;
            var lichSuSanSang = _lichSuService.GhiChuyenTrangThaiDon(new GhiLichSuDonCommand(
                donId, TrangThaiDonThue.DangChuanBi.ToString(), TrangThaiDonThue.SanSangNhan.ToString(),
                maTaiKhoan, request.GhiChu ?? "Đã chuẩn bị đủ thiết bị và sẵn sàng bàn giao"));

            await _db.SaveChangesAsync(ct);
            await _thongBaoService.TaoThongBaoSanSangNhanAsync(donId, $"SAN_SANG_NHAN:{donId}:{lichSuSanSang.MaLichSuDon}");
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, phanCongs));
        }
        catch { await tx.RollbackAsync(ct); throw; }
    }

    public async Task<Result> GiaiPhongPhanCongKhiHuyDonAsync(
        long donId, long maTaiKhoan, string? lyDo = null, CancellationToken ct = default)
    {
        var phanCongs = await _db.PhanCongThietBis
            .Include(pc => pc.ThietBi).Include(pc => pc.ChiTietDon)
            .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
            .ToListAsync(ct);
        if (!phanCongs.Any()) return Result.Ok();

        // Giữ nguyên phân công đã bàn giao trong phiếu bàn giao chốt.
        var daBanGiaoPcIds = await _db.ChiTietBanGiaos.Include(ctbg => ctbg.PhieuBanGiao)
            .Where(ctbg => ctbg.PhieuBanGiao.MaDonThue == donId && ctbg.PhieuBanGiao.TrangThai == "DaGiao")
            .Select(ctbg => ctbg.MaPhanCong).ToListAsync(ct);

        long? maNhanVien = null;
        try { maNhanVien = (await ActorGuard.LayNhanVienDangLamViecAsync(_db, maTaiKhoan, ct)).MaNhanVien; }
        catch { /* Tài khoản khách hàng hoặc hệ thống hủy */ }

        foreach (var pc in phanCongs.Where(p => !daBanGiaoPcIds.Contains(p.MaPhanCong)))
        {
            pc.TrangThai = "DaHuy";
            pc.LyDoHuyPhanCong = lyDo ?? "Đơn thuê đã hủy trước bàn giao";
            pc.ThoiDiemHuyPhanCong = DateTime.UtcNow;
            if (maNhanVien.HasValue) pc.MaNguoiHuyPhanCong = maNhanVien.Value;
            if (pc.ThietBi != null) pc.ThietBi.TrangThaiSuDung = TrangThaiThietBi.SanSang;
        }

        await _db.SaveChangesAsync(ct);
        return Result.Ok();
    }

    private static List<string> KiemTraDuDieuKienSanSang(Models.Entities.DonThue don, List<PhanCongThietBi> phanCongs)
    {
        var lyDoChuaDu = new List<string>();
        foreach (var chiTiet in don.ChiTietDonThues)
        {
            var pcsOfDong = phanCongs.Where(pc => pc.MaChiTietDon == chiTiet.MaChiTietDon).ToList();
            var tenSp = chiTiet.TenSanPhamLucDat ?? $"#{chiTiet.MaChiTietDon}";
            if (pcsOfDong.Count < chiTiet.SoLuong)
                lyDoChuaDu.Add($"Dòng '{tenSp}': cần {chiTiet.SoLuong}, mới gán {pcsOfDong.Count}.");
            if (pcsOfDong.Count > chiTiet.SoLuong)
                lyDoChuaDu.Add($"Dòng '{tenSp}': gán thừa ({pcsOfDong.Count}/{chiTiet.SoLuong}).");

            foreach (var pc in pcsOfDong)
            {
                if (pc.ThietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
                    lyDoChuaDu.Add($"Thiết bị #{pc.MaThietBi} không còn ở trạng thái SanSang ({pc.ThietBi.TrangThaiSuDung}).");
                if (pc.ThietBi.MaSanPhamHienTai != chiTiet.MaSanPham)
                    lyDoChuaDu.Add($"Thiết bị #{pc.MaThietBi} không còn khớp sản phẩm dòng đơn.");
            }
        }
        return lyDoChuaDu;
    }

    private Task<List<PhanCongThietBi>> TaiPhanCongHieuLucAsync(long donId, CancellationToken ct) =>
        _db.PhanCongThietBis.Include(pc => pc.ThietBi)
            .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
            .ToListAsync(ct);

    private static ChuanBiResponse XayDungResponse(Models.Entities.DonThue don, List<PhanCongThietBi> phanCongs)
    {
        var danhSachDong = don.ChiTietDonThues.Select(ct =>
        {
            var pcsOfDong = phanCongs.Where(pc => pc.MaChiTietDon == ct.MaChiTietDon).ToList();
            return new DongChuanBiResponse
            {
                MaChiTietDon = ct.MaChiTietDon, MaSanPham = ct.MaSanPham,
                TenSanPham = ct.TenSanPhamLucDat ?? $"Sản phẩm #{ct.MaSanPham}",
                SoLuongCanGan = ct.SoLuong, SoLuongDaGan = pcsOfDong.Count,
                SoLuongConThieu = Math.Max(0, ct.SoLuong - pcsOfDong.Count),
                DanhSachPhanCong = pcsOfDong.Select(pc => new PhanCongChiTietResponse
                {
                    MaPhanCong = pc.MaPhanCong, MaThietBi = pc.MaThietBi,
                    MaThietBiHienThi = pc.ThietBi?.MaThietBiHienThi ?? string.Empty,
                    TrangThaiThietBi = pc.ThietBi?.TrangThaiSuDung.ToString() ?? string.Empty,
                    TrangThaiPhanCong = pc.TrangThai, ThoiDiemGan = pc.ThoiDiemPhanCong
                }).ToList()
            };
        }).ToList();

        return new ChuanBiResponse
        {
            MaDonThue = don.MaDonThue, TrangThaiDon = don.TrangThai.ToString(),
            DuDieuKienSanSang = danhSachDong.All(d => d.SoLuongConThieu == 0),
            DanhSachDong = danhSachDong,
            LyDoChuaDuDieuKien = danhSachDong.Where(d => d.SoLuongConThieu > 0)
                .Select(d => $"Dòng '{d.TenSanPham}': còn thiếu {d.SoLuongConThieu} thiết bị.").ToList()
        };
    }
}
