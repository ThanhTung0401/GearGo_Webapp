using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ quản lý kho, tổng quan, tìm kiếm thiết bị, kiểm kê và phân tích ảnh hưởng.
/// </summary>
public partial class KhoService : IKhoService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService? _khaDungService;
    private readonly ILogger<KhoService>? _logger;

    public KhoService(
        ApplicationDbContext context,
        IKhaDungService? khaDungService = null,
        ILogger<KhoService>? logger = null)
    {
        _context = context;
        _khaDungService = khaDungService;
        _logger = logger;
    }

    public async Task<Result<KhoTongQuanResponse>> LayTongQuanKhoAsync(LocKhoRequest request, long actorId, bool laAdmin)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<KhoTongQuanResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        if (request.GioNhan.HasValue || request.GioTra.HasValue)
        {
            if (!request.GioNhan.HasValue || !request.GioTra.HasValue || request.GioTra <= request.GioNhan)
                return Result<KhoTongQuanResponse>.Loi(DomainConstants.Errors.InvalidRentalPeriod,
                    "Khoảng thời gian thuê không hợp lệ. Giờ trả phải sau giờ nhận.");
        }

        var query = _context.ThietBis.AsNoTracking().Include(tb => tb.SanPhamHienTai).AsQueryable();
        if (request.MaSanPhamHienTai.HasValue)
            query = query.Where(tb => tb.MaSanPhamHienTai == request.MaSanPhamHienTai.Value);
        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            string tk = request.TuKhoa.Trim();
            query = query.Where(tb => tb.MaThietBiHienThi.Contains(tk) || (tb.SanPhamHienTai != null && tb.SanPhamHienTai.TenSanPham.Contains(tk)));
        }

        var danhSach = await query.ToListAsync();
        var res = new KhoTongQuanResponse
        {
            TongHoSoThietBi = danhSach.Count,
            SanSangTaiKho = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang),
            DangChoThue = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangThue),
            DangBaoTri = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri),
            NgungSuDung = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.NgungSuDung),
            ThatLac = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.ThatLac),
            TongGiaTriNhap = laAdmin ? danhSach.Sum(t => t.GiaNhap) : null
        };

        var nhomSanPham = danhSach.GroupBy(t => t.MaSanPhamHienTai).ToList();
        var spIds = nhomSanPham.Select(g => g.Key).ToList();
        Dictionary<long, int>? khaDungMap = null;
        if (_khaDungService != null && request.GioNhan.HasValue && request.GioTra.HasValue && spIds.Count > 0)
        {
            khaDungMap = await _khaDungService.LayKhaDungNhieuAsync(spIds, request.GioNhan.Value, request.GioTra.Value);
            res.KhaDungTheoLich = khaDungMap.Values.Sum();
        }

        res.ChiTietSanPham.AddRange(nhomSanPham.Select(grp => new ThongKeSanPhamKhoDto
        {
            MaSanPham = grp.Key,
            TenSanPham = grp.First().SanPhamHienTai?.TenSanPham ?? $"Sản phẩm #{grp.Key}",
            TongSo = grp.Count(),
            SanSang = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang),
            DangThue = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangThue),
            BaoTri = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri),
            NgungSuDung = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.NgungSuDung),
            ThatLac = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.ThatLac),
            KhaDungTheoLich = khaDungMap != null && khaDungMap.TryGetValue(grp.Key, out int kdVal) ? kdVal : null
        }));

        return Result<KhoTongQuanResponse>.Ok(res);
    }

    public async Task<Result<PagedResult<ThietBiKhoItemDto>>> TimThietBiAsync(LocKhoRequest request, long actorId, bool laAdmin)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<PagedResult<ThietBiKhoItemDto>>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var query = _context.ThietBis.AsNoTracking()
            .Include(tb => tb.SanPhamHienTai)
            .Include(tb => tb.ChiTietPhieuNhap).ThenInclude(ct => ct.SanPham)
            .Include(tb => tb.ChiTietPhieuNhap).ThenInclude(ct => ct.PhieuNhapHang)
            .AsQueryable();

        if (request.MaSanPhamHienTai.HasValue)
            query = query.Where(tb => tb.MaSanPhamHienTai == request.MaSanPhamHienTai.Value);
        if (!string.IsNullOrWhiteSpace(request.TrangThai) && Enum.TryParse<TrangThaiThietBi>(request.TrangThai, true, out var ttEnum))
            query = query.Where(tb => tb.TrangThaiSuDung == ttEnum);
        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            string tk = request.TuKhoa.Trim();
            query = query.Where(tb => tb.MaThietBiHienThi.Contains(tk) || (tb.SanPhamHienTai != null && tb.SanPhamHienTai.TenSanPham.Contains(tk)));
        }

        int tongSo = await query.CountAsync();
        int trang = Math.Max(1, request.Trang);
        int soMoiTrang = Math.Clamp(request.SoMoiTrang, 1, DomainConstants.Policies.MaxPageSize);

        var itemsRaw = await query.OrderBy(tb => tb.MaThietBi)
            .Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToListAsync();

        var tbIds = itemsRaw.Select(t => t.MaThietBi).ToList();
        var scheduledSet = (await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon).ThenInclude(ct => ct.DonThue)
            .Where(pc => tbIds.Contains(pc.MaThietBi) && pc.TrangThai == DomainConstants.Status.Assigned &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(pc => pc.MaThietBi).Distinct().ToListAsync()).ToHashSet();

        var dtos = itemsRaw.Select(tb => new ThietBiKhoItemDto
        {
            MaThietBi = tb.MaThietBi, MaThietBiHienThi = tb.MaThietBiHienThi,
            MaSanPhamHienTai = tb.MaSanPhamHienTai, TenSanPhamHienTai = tb.SanPhamHienTai?.TenSanPham ?? "",
            MaSanPhamGoc = tb.ChiTietPhieuNhap.MaSanPham, TenSanPhamGoc = tb.ChiTietPhieuNhap.SanPham?.TenSanPham ?? "",
            MaChiTietPhieuNhap = tb.MaChiTietPhieuNhap, TrangThaiSuDung = tb.TrangThaiSuDung.ToString(),
            TinhTrang = tb.TinhTrang, GiaNhap = laAdmin ? tb.GiaNhap : null,
            NgayNhap = tb.ChiTietPhieuNhap.PhieuNhapHang?.NgayNhapThucTe ?? tb.ChiTietPhieuNhap.PhieuNhapHang?.NgayLap ?? DateTime.MinValue,
            CoLichHenSapToi = scheduledSet.Contains(tb.MaThietBi)
        }).ToList();

        return Result<PagedResult<ThietBiKhoItemDto>>.Ok(new PagedResult<ThietBiKhoItemDto>
        {
            Items = dtos, TotalItems = tongSo, CurrentPage = trang, PageSize = soMoiTrang
        });
    }
}
