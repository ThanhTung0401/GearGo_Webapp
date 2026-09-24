using System;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.SanPham;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

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
            .Include(x => x.HinhAnhs)
            .Include(x => x.DanhMuc)
            .Where(x => x.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh)
            .Where(x => x.DanhMuc.TrangThai == "HienThi")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            query = query.Where(x => x.TenSanPham.Contains(request.TuKhoa) || (x.MoTa != null && x.MoTa.Contains(request.TuKhoa)));
        }

        if (request.MaDanhMuc.HasValue)
        {
            query = query.Where(x => x.MaDanhMuc == request.MaDanhMuc.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.ThuongHieu))
        {
            query = query.Where(x => x.ThuongHieu == request.ThuongHieu);
        }

        if (request.SucChua.HasValue)
        {
            query = query.Where(x => x.SucChua == request.SucChua.Value);
        }

        if (request.GiaMin.HasValue)
        {
            query = query.Where(x => x.GiaThueMoiNgay >= request.GiaMin.Value);
        }

        if (request.GiaMax.HasValue)
        {
            query = query.Where(x => x.GiaThueMoiNgay <= request.GiaMax.Value);
        }

        // SapXep
        switch (request.SapXep)
        {
            case SapXepSanPham.GiaTang:
                query = query.OrderBy(x => x.GiaThueMoiNgay);
                break;
            case SapXepSanPham.GiaGiam:
                query = query.OrderByDescending(x => x.GiaThueMoiNgay);
                break;
            case SapXepSanPham.MoiNhat:
                query = query.OrderByDescending(x => x.MaSanPham);
                break;
            case SapXepSanPham.PhoBien:
                // Tạm thời xếp theo mã giảm dần, tính phổ biến (UC08) sau
                query = query.OrderByDescending(x => x.MaSanPham);
                break;
            default:
                query = query.OrderByDescending(x => x.MaSanPham);
                break;
        }

        int totalItems = await query.CountAsync();
        
        var page = request.Trang < 1 ? 1 : request.Trang;
        var pageSize = request.SoMoiTrang < 1 ? 12 : request.SoMoiTrang;

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var resItems = items.Select(x => new SanPhamResponse
        {
            MaSanPham = x.MaSanPham,
            MaDanhMuc = x.MaDanhMuc,
            TenSanPham = x.TenSanPham,
            ThuongHieu = x.ThuongHieu,
            MoTa = x.MoTa,
            SucChua = x.SucChua,
            KichThuoc = x.KichThuoc,
            ThongSo = x.ThongSo,
            GiaThueMoiNgay = x.GiaThueMoiNgay,
            MucCocMoiThietBi = x.MucCocMoiThietBi,
            GiaTriBoiThuong = x.GiaTriBoiThuong,
            HinhAnhChinh = x.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault(h => h.LaAnhChinh)?.DuongDan 
                        ?? x.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault()?.DuongDan,
            HinhAnhs = x.HinhAnhs.OrderBy(h => h.ThuTu).Select(h => h.DuongDan).ToList()
        }).ToList();

        if (request.GioNhan.HasValue && request.GioTra.HasValue)
        {
            var dictKhaDung = await _khaDungService.LayKhaDungNhieuAsync(
                resItems.Select(r => r.MaSanPham), 
                request.GioNhan.Value, 
                request.GioTra.Value);

            foreach (var item in resItems)
            {
                if (dictKhaDung.TryGetValue(item.MaSanPham, out int val))
                {
                    item.SoLuongKhaDung = val;
                }
            }
        }

        var pagedResult = new PagedResult<SanPhamResponse>
        {
            Items = resItems,
            TotalItems = totalItems,
            CurrentPage = page,
            PageSize = pageSize
        };

        return Result<PagedResult<SanPhamResponse>>.Ok(pagedResult);
    }

    public async Task<Result<SanPhamResponse>> LayChiTietAsync(long id, TimKiemSanPhamRequest request)
    {
        var x = await _context.SanPhams
            .Include(s => s.HinhAnhs)
            .Include(s => s.DanhMuc)
            .Where(s => s.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh && s.DanhMuc.TrangThai == "HienThi")
            .FirstOrDefaultAsync(s => s.MaSanPham == id);

        if (x == null)
            return Result<SanPhamResponse>.Loi("SanPham_NotFound", "Không tìm thấy sản phẩm hoặc sản phẩm ngừng kinh doanh.");

        var res = new SanPhamResponse
        {
            MaSanPham = x.MaSanPham,
            MaDanhMuc = x.MaDanhMuc,
            TenSanPham = x.TenSanPham,
            ThuongHieu = x.ThuongHieu,
            MoTa = x.MoTa,
            SucChua = x.SucChua,
            KichThuoc = x.KichThuoc,
            ThongSo = x.ThongSo,
            GiaThueMoiNgay = x.GiaThueMoiNgay,
            MucCocMoiThietBi = x.MucCocMoiThietBi,
            GiaTriBoiThuong = x.GiaTriBoiThuong,
            HinhAnhChinh = x.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault(h => h.LaAnhChinh)?.DuongDan 
                        ?? x.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault()?.DuongDan,
            HinhAnhs = x.HinhAnhs.OrderBy(h => h.ThuTu).Select(h => h.DuongDan).ToList()
        };

        if (request.GioNhan.HasValue && request.GioTra.HasValue)
        {
            res.SoLuongKhaDung = await _khaDungService.LayKhaDungAsync(id, request.GioNhan.Value, request.GioTra.Value);
        }

        return Result<SanPhamResponse>.Ok(res);
    }
}
