using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.Admin;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

public class AdminSanPhamService : IAdminSanPhamService
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public AdminSanPhamService(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    public async Task<object> LayDanhSachAsync(string? tuKhoa, int trang = 1, int soMoiTrang = 12)
    {
        var query = _context.Set<SanPham>().AsQueryable();
        if (!string.IsNullOrEmpty(tuKhoa))
            query = query.Where(s => s.TenSanPham.Contains(tuKhoa) || s.MaSanPhamHienThi.Contains(tuKhoa));

        var total = await query.CountAsync();
        var items = await query.Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToListAsync();
        return new { Total = total, Items = items };
    }

    public async Task<object> TaoMoiAsync(TaoSanPhamRequest req)
    {
        if (await _context.Set<SanPham>().AnyAsync(s => s.MaSanPhamHienThi == req.MaSanPhamHienThi))
            throw new Exception("Mã sản phẩm hiển thị đã tồn tại.");

        var sp = new SanPham
        {
            MaDanhMuc = req.MaDanhMuc, MaSanPhamHienThi = req.MaSanPhamHienThi, TenSanPham = req.TenSanPham,
            ThuongHieu = req.ThuongHieu, MoTa = req.MoTa, SucChua = req.SucChua,
            KichThuoc = req.KichThuoc, ThongSo = req.ThongSo, GiaThueMoiNgay = req.GiaThueMoiNgay,
            MucCocMoiThietBi = req.MucCocMoiThietBi, GiaTriBoiThuong = req.GiaTriBoiThuong,
            TrangThaiKinhDoanh = Enum.Parse<TrangThaiKinhDoanh>(req.TrangThaiKinhDoanh)
        };
        _context.Add(sp);
        await _context.SaveChangesAsync();
        return sp;
    }

    public async Task<object> CapNhatAsync(long id, CapNhatSanPhamRequest req)
    {
        var sp = await _context.Set<SanPham>().FindAsync(id) ?? throw new Exception("Không tìm thấy sản phẩm.");
        if (sp.MaSanPhamHienThi != req.MaSanPhamHienThi &&
            await _context.Set<SanPham>().AnyAsync(s => s.MaSanPhamHienThi == req.MaSanPhamHienThi))
            throw new Exception("Mã sản phẩm hiển thị đã tồn tại.");

        sp.MaDanhMuc = req.MaDanhMuc; sp.MaSanPhamHienThi = req.MaSanPhamHienThi; sp.TenSanPham = req.TenSanPham;
        sp.ThuongHieu = req.ThuongHieu; sp.MoTa = req.MoTa; sp.SucChua = req.SucChua;
        sp.KichThuoc = req.KichThuoc; sp.ThongSo = req.ThongSo; sp.GiaThueMoiNgay = req.GiaThueMoiNgay;
        sp.MucCocMoiThietBi = req.MucCocMoiThietBi; sp.GiaTriBoiThuong = req.GiaTriBoiThuong;
        sp.TrangThaiKinhDoanh = Enum.Parse<TrangThaiKinhDoanh>(req.TrangThaiKinhDoanh);

        await _context.SaveChangesAsync();
        return sp;
    }

    public async Task DoiTrangThaiAsync(long id, string trangThaiMoi)
    {
        var sp = await _context.Set<SanPham>().FindAsync(id) ?? throw new Exception("Không tìm thấy sản phẩm.");
        var validStatus = new[] { "DangKinhDoanh", "TamNgung", "NgungKinhDoanh" };
        if (!validStatus.Contains(trangThaiMoi)) throw new Exception("Trạng thái không hợp lệ.");

        sp.TrangThaiKinhDoanh = Enum.Parse<TrangThaiKinhDoanh>(trangThaiMoi);
        await _context.SaveChangesAsync();
    }

    public async Task<object> LayHinhAnhAsync(long maSanPham)
        => await _context.Set<HinhAnhSanPham>().AsNoTracking()
            .Where(h => h.MaSanPham == maSanPham).OrderBy(h => h.ThuTu)
            .Select(h => new { h.MaHinhAnh, h.MaSanPham, h.DuongDan, h.LaAnhChinh, h.ThuTu })
            .ToListAsync();

    public async Task<object> ThemHinhAnhAsync(long maSanPham, IFormFile file)
    {
        _ = await _context.Set<SanPham>().FindAsync(maSanPham) ?? throw new Exception("Không tìm thấy sản phẩm.");
        var ext = ValidateAnhUpload(file);

        var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "san-pham");
        if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = Guid.NewGuid().ToString() + ext;
        using (var stream = new FileStream(Path.Combine(uploadsFolder, uniqueFileName), FileMode.Create))
            await file.CopyToAsync(stream);

        var hinhAnhs = await _context.Set<HinhAnhSanPham>().Where(h => h.MaSanPham == maSanPham).ToListAsync();
        var hinhAnhDb = new HinhAnhSanPham
        {
            MaSanPham = maSanPham,
            DuongDan = $"/uploads/san-pham/{uniqueFileName}",
            LaAnhChinh = !hinhAnhs.Any(),
            ThuTu = hinhAnhs.Any() ? hinhAnhs.Max(h => h.ThuTu) + 1 : 1
        };
        _context.Add(hinhAnhDb);
        await _context.SaveChangesAsync();
        return hinhAnhDb;
    }

    // Ủy quyền kiểm tra định dạng, dung lượng (<= 5MB) và magic bytes (kể cả WEBP) cho FileValidator dùng chung
    private static string ValidateAnhUpload(IFormFile file)
    {
        if (!FileValidator.IsValidImage(file, out var errorMessage))
            throw new Exception(errorMessage);
        return Path.GetExtension(file.FileName).ToLowerInvariant();
    }

    public async Task XoaHinhAnhAsync(long maHinhAnh)
    {
        var hinhAnh = await _context.Set<HinhAnhSanPham>().FindAsync(maHinhAnh)
            ?? throw new KhongTimThayException("Không tìm thấy hình ảnh.");

        var rootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var fullPath = Path.Combine(rootPath, hinhAnh.DuongDan.TrimStart('/'));
        if (File.Exists(fullPath)) File.Delete(fullPath);

        _context.Remove(hinhAnh);
        await _context.SaveChangesAsync();
    }
}
