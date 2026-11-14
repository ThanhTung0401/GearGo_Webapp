using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.KhuyenMai;

public partial class QuanTriKhuyenMaiService : IQuanTriKhuyenMaiService
{
    private readonly ApplicationDbContext _context;

    public QuanTriKhuyenMaiService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PagedResult<KhuyenMaiResponse>>> TimKiemAsync(TimKiemKhuyenMaiRequest request)
    {
        var now = DateTime.UtcNow;
        var query = _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams)
            .Include(k => k.KhuyenMaiDanhMucs)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            var tk = request.TuKhoa.Trim();
            query = query.Where(k => k.MaGiamGia.Contains(tk) || (k.TenKhuyenMai != null && k.TenKhuyenMai.Contains(tk)));
        }
        if (request.TrangThai.HasValue)
            query = query.Where(k => k.TrangThai == request.TrangThai.Value);
        if (request.PhamVi.HasValue)
            query = query.Where(k => k.PhamVi == request.PhamVi.Value);

        var totalItems = await query.CountAsync();
        var page = request.Trang < 1 ? 1 : request.Trang;
        var pageSize = request.SoMoiTrang < 1 ? 20 : Math.Min(100, request.SoMoiTrang);

        var itemsRaw = await query
            .OrderByDescending(k => k.MaKhuyenMai)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var kmIds = itemsRaw.Select(k => k.MaKhuyenMai).ToList();
        var counts = await _context.LuotSuDungKhuyenMais
            .Where(l => kmIds.Contains(l.MaKhuyenMai))
            .GroupBy(l => l.MaKhuyenMai)
            .Select(g => new
            {
                MaKhuyenMai = g.Key,
                DaDung = g.Count(x => x.TrangThai == "DaSuDung"),
                DangGiuConHan = g.Count(x => x.TrangThai == "DangGiu" && x.ThoiDiemHetHan > now),
                DaGiaiPhong = g.Count(x => x.TrangThai == "DaGiaiPhong" || (x.TrangThai == "DangGiu" && x.ThoiDiemHetHan <= now))
            })
            .ToDictionaryAsync(x => x.MaKhuyenMai);

        var responses = itemsRaw.Select(k =>
        {
            counts.TryGetValue(k.MaKhuyenMai, out var c);
            return KhuyenMaiHelper.MapResponse(k, c?.DaDung ?? 0, c?.DangGiuConHan ?? 0, c?.DaGiaiPhong ?? 0);
        }).ToList();

        return Result<PagedResult<KhuyenMaiResponse>>.Ok(new PagedResult<KhuyenMaiResponse>
        {
            Items = responses,
            TotalItems = totalItems,
            CurrentPage = page,
            PageSize = pageSize
        });
    }

    public async Task<Result<KhuyenMaiResponse>> LayChiTietAsync(long id)
    {
        var now = DateTime.UtcNow;
        var km = await _context.KhuyenMais
            .Include(k => k.KhuyenMaiSanPhams)
            .Include(k => k.KhuyenMaiDanhMucs)
            .FirstOrDefaultAsync(k => k.MaKhuyenMai == id);

        if (km == null)
            return Result<KhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");

        var stats = await _context.LuotSuDungKhuyenMais
            .Where(l => l.MaKhuyenMai == id)
            .GroupBy(l => l.MaKhuyenMai)
            .Select(g => new
            {
                DaDung = g.Count(x => x.TrangThai == "DaSuDung"),
                DangGiuConHan = g.Count(x => x.TrangThai == "DangGiu" && x.ThoiDiemHetHan > now),
                DaGiaiPhong = g.Count(x => x.TrangThai == "DaGiaiPhong" || (x.TrangThai == "DangGiu" && x.ThoiDiemHetHan <= now))
            })
            .FirstOrDefaultAsync();

        return Result<KhuyenMaiResponse>.Ok(
            KhuyenMaiHelper.MapResponse(km, stats?.DaDung ?? 0, stats?.DangGiuConHan ?? 0, stats?.DaGiaiPhong ?? 0));
    }

    public async Task<Result<KhuyenMaiResponse>> TamAnAsync(long id, DoiHienThiKhuyenMaiRequest request, long actorId)
        => await DoiTrangThaiHienThiAsync(id, TrangThaiKhuyenMai.TamAn);

    public async Task<Result<KhuyenMaiResponse>> HienThiAsync(long id, DoiHienThiKhuyenMaiRequest request, long actorId)
        => await DoiTrangThaiHienThiAsync(id, TrangThaiKhuyenMai.HienThi);

    private async Task<Result<KhuyenMaiResponse>> DoiTrangThaiHienThiAsync(long id, TrangThaiKhuyenMai trangThai)
    {
        var km = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == id);
        if (km == null)
            return Result<KhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");

        km.TrangThai = trangThai;
        await _context.SaveChangesAsync();
        return await LayChiTietAsync(id);
    }

    public async Task<Result<SuDungKhuyenMaiResponse>> LayTinhHinhSuDungAsync(long id)
    {
        var now = DateTime.UtcNow;
        var km = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == id);
        if (km == null)
            return Result<SuDungKhuyenMaiResponse>.Loi("KHUYEN_MAI_NOT_FOUND", "Không tìm thấy chương trình khuyến mãi.");

        var luots = await _context.LuotSuDungKhuyenMais
            .Include(l => l.DonThue).ThenInclude(d => d.KhachHang)
            .Where(l => l.MaKhuyenMai == id)
            .OrderByDescending(l => l.ThoiDiemGiuLuot)
            .ToListAsync();

        return Result<SuDungKhuyenMaiResponse>.Ok(new SuDungKhuyenMaiResponse
        {
            MaKhuyenMai = km.MaKhuyenMai,
            MaGiamGia = km.MaGiamGia,
            TenKhuyenMai = km.TenKhuyenMai,
            TongLuotDaDung = luots.Count(l => l.TrangThai == "DaSuDung"),
            TongLuotDangGiuConHan = luots.Count(l => l.TrangThai == "DangGiu" && l.ThoiDiemHetHan > now),
            TongLuotDaGiaiPhong = luots.Count(l => l.TrangThai == "DaGiaiPhong" || (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan <= now)),
            TongTienGiamDaDung = luots.Where(l => l.TrangThai == "DaSuDung").Sum(l => l.DonThue.TongTienGiam),
            ChiTietSuDung = luots.Select(l => new ChiTietSuDungItem
            {
                MaLuotSuDung = l.MaLuotSuDung,
                MaDonThue = l.MaDonThue,
                MaDonHienThi = l.DonThue.MaDonHienThi,
                MaKhachHang = l.DonThue.MaKhachHang,
                TenKhachHang = l.DonThue.KhachHang?.HoTen ?? l.DonThue.TenNguoiNhan ?? string.Empty,
                TrangThaiLuot = (l.TrangThai == "DangGiu" && l.ThoiDiemHetHan <= now) ? "HetHan" : l.TrangThai,
                ThoiDiemGiuLuot = l.ThoiDiemGiuLuot,
                ThoiDiemHetHan = l.ThoiDiemHetHan,
                ThoiDiemSuDung = l.ThoiDiemSuDung,
                TienGiamDon = l.DonThue.TongTienGiam,
                TrangThaiDonThue = l.DonThue.TrangThai.ToString()
            }).ToList()
        });
    }
}
