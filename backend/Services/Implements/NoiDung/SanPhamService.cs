using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.SanPham;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

public class SanPhamService : ISanPhamService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;

    public SanPhamService(ApplicationDbContext context, IKhaDungService khaDungService)
    {
        _context = context;
        _khaDungService = khaDungService;
    }

    public async Task<Result<PagedResult<SanPhamResponse>>> TimKiemAsync(TimKiemSanPhamRequest request)
    {
        var query = _context.SanPhams
            .Include(x => x.HinhAnhs).Include(x => x.DanhMuc)
            .Where(x => x.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh && x.DanhMuc.TrangThai == "HienThi");

        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
            query = query.Where(x => x.TenSanPham.Contains(request.TuKhoa) || (x.MoTa != null && x.MoTa.Contains(request.TuKhoa)));
        if (request.MaDanhMuc.HasValue) query = query.Where(x => x.MaDanhMuc == request.MaDanhMuc.Value);
        if (!string.IsNullOrWhiteSpace(request.ThuongHieu)) query = query.Where(x => x.ThuongHieu == request.ThuongHieu);
        if (request.SucChua.HasValue) query = query.Where(x => x.SucChua == request.SucChua.Value);
        if (request.GiaMin.HasValue) query = query.Where(x => x.GiaThueMoiNgay >= request.GiaMin.Value);
        if (request.GiaMax.HasValue) query = query.Where(x => x.GiaThueMoiNgay <= request.GiaMax.Value);

        query = request.SapXep switch
        {
            SapXepSanPham.GiaTang => query.OrderBy(x => x.GiaThueMoiNgay),
            SapXepSanPham.GiaGiam => query.OrderByDescending(x => x.GiaThueMoiNgay),
            _ => query.OrderByDescending(x => x.MaSanPham)
        };

        int totalItems = await query.CountAsync();
        var page = request.Trang < 1 ? 1 : request.Trang;
        var pageSize = request.SoMoiTrang < 1 ? 12 : request.SoMoiTrang;
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var resItems = items.Select(MapResponse).ToList();
        await BoSungDanhGiaVaKhaDungAsync(resItems, request);

        return Result<PagedResult<SanPhamResponse>>.Ok(new PagedResult<SanPhamResponse>
        {
            Items = resItems, TotalItems = totalItems, CurrentPage = page, PageSize = pageSize
        });
    }

    private async Task BoSungDanhGiaVaKhaDungAsync(List<SanPhamResponse> resItems, TimKiemSanPhamRequest request)
    {
        var spIds = resItems.Select(r => r.MaSanPham).ToList();
        var ratingDict = await _context.DanhGias.AsNoTracking()
            .Where(d => d.TrangThaiHienThi == "HienThi" && spIds.Contains(d.ChiTietDonThue.MaSanPham))
            .GroupBy(d => d.ChiTietDonThue.MaSanPham)
            .Select(g => new { MaSanPham = g.Key, Count = g.Count(), Avg = g.Average(d => d.SoSao) })
            .ToDictionaryAsync(r => r.MaSanPham);

        foreach (var item in resItems)
        {
            if (ratingDict.TryGetValue(item.MaSanPham, out var r))
            {
                item.SoLuongDanhGia = r.Count;
                item.DiemTrungBinh = Math.Round(r.Avg, 1);
            }
        }

        if (request.GioNhan.HasValue && request.GioTra.HasValue)
        {
            var dictKhaDung = await _khaDungService.LayKhaDungNhieuAsync(spIds, request.GioNhan.Value, request.GioTra.Value);
            foreach (var item in resItems)
            {
                if (dictKhaDung.TryGetValue(item.MaSanPham, out int val))
                    item.SoLuongKhaDung = val;
            }
        }
    }

    public async Task<Result<SanPhamResponse>> LayChiTietAsync(long id, TimKiemSanPhamRequest request)
    {
        var x = await _context.SanPhams.Include(s => s.HinhAnhs).Include(s => s.DanhMuc)
            .Where(s => s.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh && s.DanhMuc.TrangThai == "HienThi")
            .FirstOrDefaultAsync(s => s.MaSanPham == id);

        if (x == null)
            return Result<SanPhamResponse>.Loi("SanPham_NotFound", "Không tìm thấy sản phẩm hoặc sản phẩm ngừng kinh doanh.");

        var res = MapResponse(x);
        var ratingSaoList = await _context.DanhGias.AsNoTracking()
            .Where(d => d.TrangThaiHienThi == "HienThi" && d.ChiTietDonThue.MaSanPham == id)
            .Select(d => d.SoSao).ToListAsync();

        if (ratingSaoList.Count > 0)
        {
            res.SoLuongDanhGia = ratingSaoList.Count;
            res.DiemTrungBinh = Math.Round(ratingSaoList.Average(), 1);
        }
        if (request.GioNhan.HasValue && request.GioTra.HasValue)
            res.SoLuongKhaDung = await _khaDungService.LayKhaDungAsync(id, request.GioNhan.Value, request.GioTra.Value);

        return Result<SanPhamResponse>.Ok(res);
    }

    private static SanPhamResponse MapResponse(SanPham x) => new()
    {
        MaSanPham = x.MaSanPham,
        MaSanPhamHienThi = x.MaSanPhamHienThi, // [SP-06]
        TrangThaiKinhDoanh = x.TrangThaiKinhDoanh.ToString(), // [SP-06]
        MaDanhMuc = x.MaDanhMuc, TenSanPham = x.TenSanPham,
        ThuongHieu = x.ThuongHieu, MoTa = x.MoTa, SucChua = x.SucChua,
        KichThuoc = x.KichThuoc, ThongSo = x.ThongSo, GiaThueMoiNgay = x.GiaThueMoiNgay,
        MucCocMoiThietBi = x.MucCocMoiThietBi, GiaTriBoiThuong = x.GiaTriBoiThuong,
        HinhAnhChinh = x.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault(h => h.LaAnhChinh)?.DuongDan
                    ?? x.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault()?.DuongDan,
        HinhAnhs = x.HinhAnhs.OrderBy(h => h.ThuTu).Select(h => h.DuongDan).ToList()
    };
}
