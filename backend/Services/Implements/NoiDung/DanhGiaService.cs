using System.Text.Json;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

public partial class DanhGiaService : IDanhGiaService
{
    private readonly ApplicationDbContext _context;

    public DanhGiaService(ApplicationDbContext context) => _context = context;

    private IQueryable<DanhGia> QueryDanhGiaKemChiTiet() => _context.DanhGias
        .Include(d => d.ChiTietDonThue).ThenInclude(c => c.SanPham)
        .Include(d => d.ChiTietDonThue.DonThue.KhachHang)
        .Include(d => d.NguoiPhanHoi).ThenInclude(t => t!.NhanVien);

    private static async Task<PagedResult<DanhGiaResponse>> PhanTrangAsync(
        IQueryable<DanhGia> query, int trang, int soMoiTrang, bool anDanhTenKhach)
    {
        var total = await query.CountAsync();
        var items = await query.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToListAsync();
        var res = items.Select(d =>
        {
            var ten = d.ChiTietDonThue.DonThue.KhachHang?.HoTen ?? "Khách hàng";
            return MapToResponse(d, d.ChiTietDonThue.SanPham.TenSanPham,
                anDanhTenKhach ? AnDanhTen(ten) : ten, d.ChiTietDonThue.MaSanPham);
        }).ToList();

        return new PagedResult<DanhGiaResponse> { Items = res, TotalItems = total, CurrentPage = trang, PageSize = soMoiTrang };
    }

    public async Task<Result<List<SanPhamDuDieuKienDanhGiaResponse>>> LaySanPhamDuDieuKienDanhGiaAsync(long maTaiKhoan)
    {
        var maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        var chiTiets = await _context.ChiTietDonThues.AsNoTracking()
            .Include(c => c.DonThue).Include(c => c.SanPham).ThenInclude(s => s.HinhAnhs).Include(c => c.DanhGia)
            .Where(c => c.DonThue.MaKhachHang == maKhachHang && c.DonThue.TrangThai == TrangThaiDonThue.HoanTat)
            .OrderByDescending(c => c.DonThue.NgayDat)
            .ToListAsync();

        var grouped = chiTiets.GroupBy(c => new { c.MaDonThue, c.MaSanPham }).Select(g =>
        {
            var daiDien = g.First();
            return new SanPhamDuDieuKienDanhGiaResponse
            {
                MaChiTietDon = daiDien.MaChiTietDon,
                MaDonThue = daiDien.MaDonThue,
                MaDonHienThi = daiDien.DonThue.MaDonHienThi,
                MaSanPham = daiDien.MaSanPham,
                TenSanPham = daiDien.SanPham.TenSanPham,
                HinhAnhChinh = daiDien.SanPham.HinhAnhs.FirstOrDefault(h => h.LaAnhChinh)?.DuongDan
                               ?? daiDien.SanPham.HinhAnhs.FirstOrDefault()?.DuongDan,
                NgayHoanTat = daiDien.DonThue.NgayDat,
                DaDanhGia = g.Any(x => x.DanhGia != null)
            };
        }).ToList();

        return Result<List<SanPhamDuDieuKienDanhGiaResponse>>.Ok(grouped);
    }

    public async Task<Result<DanhGiaResponse>> TaoDanhGiaAsync(TaoDanhGiaRequest request, long maTaiKhoan)
    {
        if (request.SoSao < 1 || request.SoSao > 5)
            return Result<DanhGiaResponse>.Loi("SO_SAO_KHONG_HOP_LE", "Số sao đánh giá phải từ 1 đến 5.");
        if (request.DanhSachAnh != null && request.DanhSachAnh.Count > 5)
            return Result<DanhGiaResponse>.Loi("ANH_VUOT_GIOI_HAN", "Tối đa chỉ được đính kèm 5 ảnh.");

        var chiTiet = await _context.ChiTietDonThues
            .Include(c => c.DonThue).ThenInclude(d => d.KhachHang).Include(c => c.SanPham)
            .FirstOrDefaultAsync(c => c.MaChiTietDon == request.MaChiTietDon);
        if (chiTiet == null)
            return Result<DanhGiaResponse>.Loi("CHI_TIET_DON_NOT_FOUND", "Chi tiết đơn thuê không tồn tại.");
        if (chiTiet.DonThue.KhachHang.MaTaiKhoan != maTaiKhoan)
            return Result<DanhGiaResponse>.Loi("DANH_GIA_KHONG_THUOC_KHACH", "Bạn không có quyền đánh giá đơn thuê này.");
        if (chiTiet.DonThue.TrangThai != TrangThaiDonThue.HoanTat)
            return Result<DanhGiaResponse>.Loi("DON_CHUA_HOAN_TAT", "Chỉ được đánh giá khi đơn thuê đã hoàn tất (HoanTat).");

        var cacChiTietCungSp = await _context.ChiTietDonThues
            .Where(c => c.MaDonThue == chiTiet.MaDonThue && c.MaSanPham == chiTiet.MaSanPham)
            .Select(c => c.MaChiTietDon).ToListAsync();
        if (await _context.DanhGias.AnyAsync(d => cacChiTietCungSp.Contains(d.MaChiTietDon)))
            return Result<DanhGiaResponse>.Loi("SAN_PHAM_TRONG_DON_DA_DANH_GIA", "Sản phẩm này trong đơn thuê đã được đánh giá.");

        var danhGia = new DanhGia
        {
            MaChiTietDon = request.MaChiTietDon,
            SoSao = request.SoSao,
            NoiDung = request.NoiDung?.Trim(),
            DanhSachAnh = request.DanhSachAnh is { Count: > 0 } ? JsonSerializer.Serialize(request.DanhSachAnh) : null,
            NgayTao = DateTime.UtcNow,
            TrangThaiHienThi = "HienThi"
        };
        _context.DanhGias.Add(danhGia);
        await _context.SaveChangesAsync();

        return Result<DanhGiaResponse>.Ok(MapToResponse(
            danhGia, chiTiet.SanPham.TenSanPham, chiTiet.DonThue.KhachHang?.HoTen ?? "Khách hàng", chiTiet.MaSanPham));
    }

    public async Task<Result<PagedResult<DanhGiaResponse>>> LayDanhGiaCuaToiAsync(int trang, int soMoiTrang, long maTaiKhoan)
    {
        var maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        trang = trang < 1 ? 1 : trang;
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = QueryDanhGiaKemChiTiet().AsNoTracking()
            .Where(d => d.ChiTietDonThue.DonThue.MaKhachHang == maKhachHang)
            .OrderByDescending(d => d.NgayTao);

        return Result<PagedResult<DanhGiaResponse>>.Ok(await PhanTrangAsync(query, trang, soMoiTrang, anDanhTenKhach: false));
    }

    public async Task<Result<PagedResult<DanhGiaResponse>>> LayDanhGiaSanPhamAsync(LocDanhGiaRequest request)
    {
        var trang = request.Trang < 1 ? 1 : request.Trang;
        var soMoiTrang = Math.Clamp(request.SoMoiTrang, 1, 100);

        var query = QueryDanhGiaKemChiTiet().AsNoTracking()
            .Where(d => d.TrangThaiHienThi == "HienThi" && d.ChiTietDonThue.MaSanPham == request.SanPhamId);

        if (request.SoSao is >= 1 and <= 5)
            query = query.Where(d => d.SoSao == request.SoSao.Value);

        query = request.ThuTu?.ToLower() switch
        {
            "diemcao" => query.OrderByDescending(d => d.SoSao).ThenByDescending(d => d.NgayTao),
            "diemthap" => query.OrderBy(d => d.SoSao).ThenByDescending(d => d.NgayTao),
            _ => query.OrderByDescending(d => d.NgayTao)
        };

        return Result<PagedResult<DanhGiaResponse>>.Ok(await PhanTrangAsync(query, trang, soMoiTrang, anDanhTenKhach: true));
    }

    public async Task<Result<TongHopDanhGiaResponse>> LayTongHopDiemAsync(long sanPhamId)
    {
        var danhGias = await _context.DanhGias.AsNoTracking()
            .Where(d => d.TrangThaiHienThi == "HienThi" && d.ChiTietDonThue.MaSanPham == sanPhamId)
            .Select(d => d.SoSao).ToListAsync();

        var response = new TongHopDanhGiaResponse { SoDanhGia = danhGias.Count };
        if (danhGias.Count == 0) { response.DiemTrungBinh = null; return Result<TongHopDanhGiaResponse>.Ok(response); }

        response.DiemTrungBinh = Math.Round(danhGias.Average(), 1);
        foreach (var sao in danhGias)
        {
            if (response.ThongKe1Den5Sao.ContainsKey(sao)) response.ThongKe1Den5Sao[sao]++;
        }
        return Result<TongHopDanhGiaResponse>.Ok(response);
    }
}
