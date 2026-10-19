using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class TruyVanNhanTraService : ITruyVanNhanTraService
{
    private readonly ApplicationDbContext _context;

    public TruyVanNhanTraService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<NhanTraResponse>> LayDanhSachDotTraAsync(long donId, long actorId)
    {
        bool tonTaiDon = await _context.DonThues.AnyAsync(d => d.MaDonThue == donId);
        if (!tonTaiDon)
            throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}");

        int soConNo = await DemThietBiConNoAsync(donId);

        var phieuList = await _context.PhieuNhanTras
            .AsNoTracking()
            .Where(p => p.MaDonThue == donId)
            .OrderBy(p => p.LanTra)
            .Select(p => new NhanTraResponse
            {
                MaPhieu = p.MaPhieuNhanTra,
                MaDonThue = p.MaDonThue,
                MaPhieuHienThi = p.MaPhieuHienThi,
                LanTra = p.LanTra,
                TrangThai = p.TrangThai.ToString(),
                ThoiDiemLap = p.ThoiDiemLap,
                ThoiDiemChot = p.ThoiDiemChot,
                TenNhanVienLucNhan = p.TenNhanVienLucNhan,
                GhiChu = p.GhiChu,
                LaLanTraCuoi = p.LaLanTraCuoi,
                SoThietBiConNo = soConNo,
                ChiTiet = p.ChiTietNhanTras.Select(ct => new ChiTietNhanTraResponse
                {
                    MaChiTietNhanTra = ct.MaChiTietNhanTra,
                    MaChiTietBanGiao = ct.MaChiTietBanGiao,
                    MaThietBi = ct.ChiTietBanGiao.PhanCongThietBi.MaThietBi,
                    MaThietBiHienThi = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi.MaThietBiHienThi ?? "",
                    TenSanPham = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi.SanPhamHienTai.TenSanPham,
                    KetLuan = ct.KetLuan,
                    TinhTrangSauThue = ct.TinhTrangSauThue,
                    ThoiDiemTraThucTe = ct.ThoiDiemTraThucTe,
                    TrangThaiXuLy = ct.TrangThaiXuLy,
                    BienBanMat = ct.BienBanMat,
                    MaNguoiDuyetMat = ct.MaNguoiDuyetMat,
                    TenNguoiDuyetMat = ct.NguoiDuyetMat != null ? ct.NguoiDuyetMat.HoTen : null,
                    ThoiDiemDuyetMat = ct.ThoiDiemDuyetMat,
                    GhiChu = ct.GhiChu
                }).ToList()
            })
            .ToListAsync();

        return phieuList;
    }

    public async Task<List<ThietBiConNoResponse>> LayThietBiConNoAsync(long donId, long actorId)
    {
        var donThue = await _context.DonThues
            .AsNoTracking()
            .Include(d => d.PhieuBanGiao)
                .ThenInclude(pb => pb!.ChiTietBanGiaos)
                    .ThenInclude(ctb => ctb.PhanCongThietBi)
                        .ThenInclude(pc => pc.ThietBi)
                            .ThenInclude(tb => tb.SanPhamHienTai)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId);

        if (donThue == null)
            throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}");

        if (donThue.PhieuBanGiao == null || donThue.PhieuBanGiao.TrangThai != "DaGiao")
            throw new TrangThaiKhongHopLeException("Đơn thuê chưa hoàn tất bàn giao thiết bị.");

        var allChiTietNhanTra = await _context.ChiTietNhanTras
            .AsNoTracking()
            .Where(ct => ct.PhieuNhanTra.MaDonThue == donId)
            .Select(ct => new
            {
                ct.MaChiTietBanGiao,
                TrangThaiPhieu = ct.PhieuNhanTra.TrangThai,
                ct.MaPhieuNhanTra,
                ct.TrangThaiXuLy
            })
            .ToListAsync();

        var settledIds = allChiTietNhanTra
            .Where(ct => ct.TrangThaiPhieu == TrangThaiPhieuNhanTra.DaChot)
            .Select(ct => ct.MaChiTietBanGiao)
            .ToHashSet();

        var draftMap = allChiTietNhanTra
            .Where(ct => ct.TrangThaiPhieu == TrangThaiPhieuNhanTra.Nhap)
            .ToDictionary(ct => ct.MaChiTietBanGiao, ct => ct);

        var result = new List<ThietBiConNoResponse>();
        foreach (var ctb in donThue.PhieuBanGiao.ChiTietBanGiaos)
        {
            if (settledIds.Contains(ctb.MaChiTietBanGiao))
                continue;

            draftMap.TryGetValue(ctb.MaChiTietBanGiao, out var draftCt);
            result.Add(new ThietBiConNoResponse
            {
                MaChiTietBanGiao = ctb.MaChiTietBanGiao,
                MaThietBi = ctb.PhanCongThietBi.MaThietBi,
                MaThietBiHienThi = ctb.PhanCongThietBi.ThietBi.MaThietBiHienThi ?? "",
                TenSanPham = ctb.PhanCongThietBi.ThietBi.SanPhamHienTai?.TenSanPham ?? "",
                TinhTrangTruocThue = ctb.TinhTrangTruocThue,
                PhuKienThucGiao = ctb.PhuKienThucGiao,
                MaPhieuNhanTraDangGiu = draftCt?.MaPhieuNhanTra,
                TrangThaiXuLy = draftCt?.TrangThaiXuLy ?? "ChuaTra"
            });
        }

        return result;
    }

    public async Task<PhieuNhanTra?> LayPhieuNhanTraTheoIdAsync(long phieuId)
    {
        return await _context.PhieuNhanTras
            .Include(p => p.DonThue)
            .Include(p => p.ChiTietNhanTras)
                .ThenInclude(ct => ct.ChiTietBanGiao)
                    .ThenInclude(ctb => ctb.PhanCongThietBi)
                        .ThenInclude(pc => pc.ThietBi)
                            .ThenInclude(tb => tb.SanPhamHienTai)
            .Include(p => p.ChiTietNhanTras)
                .ThenInclude(ct => ct.NguoiDuyetMat)
            .FirstOrDefaultAsync(p => p.MaPhieuNhanTra == phieuId);
    }

    public async Task<int> DemThietBiConNoAsync(long maDonThue, long? includePhieuId = null)
    {
        int tongGiao = await _context.ChiTietBanGiaos
            .CountAsync(ctb => ctb.PhieuBanGiao.MaDonThue == maDonThue);

        var settledCount = await _context.ChiTietNhanTras
            .Where(ct => ct.PhieuNhanTra.MaDonThue == maDonThue &&
                         (ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot ||
                          (includePhieuId.HasValue && ct.MaPhieuNhanTra == includePhieuId.Value)))
            .Select(ct => ct.MaChiTietBanGiao)
            .Distinct()
            .CountAsync();

        return Math.Max(0, tongGiao - settledCount);
    }
}
