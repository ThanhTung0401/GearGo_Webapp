using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThietBi;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ tra cứu thiết bị và lịch phân công thiết bị.
/// </summary>
public class ThietBiService : IThietBiService
{
    private readonly ApplicationDbContext _context;

    public ThietBiService(ApplicationDbContext context) => _context = context;

    public async Task<Result<PagedResult<ThietBiResponse>>> TimKiemThietBiAsync(TimThietBiRequest request, long actorId)
    {
        var query = _context.ThietBis.AsQueryable();
        if (!string.IsNullOrEmpty(request.MaHienThi))
            query = query.Where(t => t.MaThietBiHienThi.Contains(request.MaHienThi));
        if (request.MaSanPhamHienTai.HasValue)
            query = query.Where(t => t.MaSanPhamHienTai == request.MaSanPhamHienTai.Value);
        if (!string.IsNullOrEmpty(request.TrangThai) && Enum.TryParse<TrangThaiThietBi>(request.TrangThai, out var trangThaiEnum))
            query = query.Where(t => t.TrangThaiSuDung == trangThaiEnum);
        if (request.NguonNhap.HasValue)
            query = query.Where(t => t.ChiTietPhieuNhap.MaPhieuNhap == request.NguonNhap.Value);

        int total = await query.CountAsync();
        var items = await query.OrderByDescending(t => t.MaThietBi)
            .Skip((request.Trang - 1) * request.SoMoiTrang).Take(request.SoMoiTrang)
            .Select(t => MapToResponse(t)).ToListAsync();

        return Result<PagedResult<ThietBiResponse>>.Ok(new PagedResult<ThietBiResponse>
        {
            Items = items, TotalItems = total, CurrentPage = request.Trang, PageSize = request.SoMoiTrang
        });
    }

    public async Task<Result<ThietBiResponse>> LayChiTietThietBiAsync(long id, long actorId)
    {
        var t = await _context.ThietBis.FirstOrDefaultAsync(x => x.MaThietBi == id);
        if (t == null) return Result<ThietBiResponse>.Loi("NOT_FOUND", "Không tìm thấy thiết bị");
        return Result<ThietBiResponse>.Ok(MapToResponse(t));
    }

    public async Task<Result<List<PhanCongResponse>>> LayLichThietBiAsync(long id, DateTime? tuNgay, DateTime? denNgay, long actorId)
    {
        var query = _context.PhanCongThietBis.Include(pc => pc.ChiTietDon).ThenInclude(c => c.DonThue)
            .Where(pc => pc.MaThietBi == id && pc.TrangThai != "DaHuy");
        if (tuNgay.HasValue) query = query.Where(pc => pc.ChiTietDon.DonThue.GioTraDuKien > tuNgay.Value);
        if (denNgay.HasValue) query = query.Where(pc => pc.ChiTietDon.DonThue.GioNhanDuKien < denNgay.Value);

        var list = await query.Select(pc => new PhanCongResponse
        {
            MaPhanCong = pc.MaPhanCong, MaDonThue = pc.ChiTietDon.MaDonThue,
            TuNgay = pc.ChiTietDon.DonThue.GioNhanDuKien, DenNgay = pc.ChiTietDon.DonThue.GioTraDuKien,
            TrangThai = pc.TrangThai
        }).OrderBy(x => x.TuNgay).ToListAsync();

        return Result<List<PhanCongResponse>>.Ok(list);
    }

    public async Task<Result<List<ThietBiResponse>>> LayThietBiPhuHopChoDonAsync(long dongDonId, long actorId)
    {
        var chiTietDon = await _context.ChiTietDonThues.Include(c => c.DonThue)
            .FirstOrDefaultAsync(c => c.MaChiTietDon == dongDonId);
        if (chiTietDon == null) return Result<List<ThietBiResponse>>.Loi("NOT_FOUND", "Không tìm thấy chi tiết đơn");

        var allThietBi = await _context.ThietBis
            .Where(t => t.MaSanPhamHienTai == chiTietDon.MaSanPham &&
                        (t.TrangThaiSuDung == TrangThaiThietBi.SanSang || t.TrangThaiSuDung == TrangThaiThietBi.DangThue))
            .ToListAsync();
        var thietBiIds = allThietBi.Select(t => t.MaThietBi).ToList();

        var overlaps = (await _context.PhanCongThietBis.Include(pc => pc.ChiTietDon).ThenInclude(c => c.DonThue)
            .Where(pc => thietBiIds.Contains(pc.MaThietBi) && pc.TrangThai != "DaHuy" &&
                         pc.ChiTietDon.DonThue.GioNhanDuKien < chiTietDon.DonThue.GioTraDuKien &&
                         pc.ChiTietDon.DonThue.GioTraDuKien > chiTietDon.DonThue.GioNhanDuKien)
            .Select(pc => pc.MaThietBi).Distinct().ToListAsync()).ToHashSet();

        return Result<List<ThietBiResponse>>.Ok(
            allThietBi.Where(t => !overlaps.Contains(t.MaThietBi)).Select(MapToResponse).ToList());
    }

    public async Task<Result<KiemTraLichResponse>> KiemTraLichThietBiAsync(KiemTraLichRequest request)
    {
        var thietBi = await _context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == request.MaThietBi);
        if (thietBi == null) return Result<KiemTraLichResponse>.Loi("NOT_FOUND", "Không tìm thấy thiết bị");

        if (thietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang && thietBi.TrangThaiSuDung != TrangThaiThietBi.DangThue)
        {
            return Result<KiemTraLichResponse>.Ok(new KiemTraLichResponse
            {
                DuDieuKien = false,
                LyDo = new List<string> { "Thiết bị không ở trạng thái Sẵn Sàng hoặc Đang Thuê." }
            });
        }

        var query = _context.PhanCongThietBis.Include(pc => pc.ChiTietDon).ThenInclude(c => c.DonThue)
            .Where(pc => pc.MaThietBi == request.MaThietBi && pc.TrangThai != "DaHuy" &&
                         pc.ChiTietDon.DonThue.GioNhanDuKien < request.GioTra &&
                         pc.ChiTietDon.DonThue.GioTraDuKien > request.GioNhan);
        if (request.MaPhanCongLoaiTru.HasValue)
            query = query.Where(pc => pc.MaPhanCong != request.MaPhanCongLoaiTru.Value);

        var overlaps = await query.ToListAsync();
        if (overlaps.Any())
        {
            return Result<KiemTraLichResponse>.Ok(new KiemTraLichResponse
            {
                DuDieuKien = false,
                LyDo = new List<string> { "Thiết bị trùng lịch với phân công khác." },
                ChungTuXungDot = overlaps.Select(o => o.ChiTietDon.DonThue.MaDonHienThi).ToList(),
                CanBoTriLai = false
            });
        }

        return Result<KiemTraLichResponse>.Ok(new KiemTraLichResponse { DuDieuKien = true });
    }

    private static ThietBiResponse MapToResponse(ThietBi t) => new()
    {
        MaThietBi = t.MaThietBi, MaThietBiHienThi = t.MaThietBiHienThi,
        MaSanPhamHienTai = t.MaSanPhamHienTai, MaChiTietPhieuNhap = t.MaChiTietPhieuNhap,
        TrangThaiSuDung = t.TrangThaiSuDung.ToString(), TinhTrang = t.TinhTrang ?? "",
        GiaNhap = t.GiaNhap, NgayNhap = t.NgayNhap
    };
}
