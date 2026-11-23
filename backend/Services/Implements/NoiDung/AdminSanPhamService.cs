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
        // [SP-02] Include HinhAnhs và project sang DTO phẳng để Frontend không mất ảnh thật và nhận đúng
        // chuỗi TrangThaiKinhDoanh thay vì số (0/1/2) khi JsonStringEnumConverter chưa đăng ký.
        var query = _context.Set<SanPham>().AsNoTracking().Include(s => s.HinhAnhs).AsQueryable();
        if (!string.IsNullOrEmpty(tuKhoa))
            query = query.Where(s => s.TenSanPham.Contains(tuKhoa) || s.MaSanPhamHienThi.Contains(tuKhoa));

        var total = await query.CountAsync();
        var raw = await query
            .OrderByDescending(s => s.MaSanPham)
            .Skip((trang - 1) * soMoiTrang).Take(soMoiTrang)
            .Select(s => new
            {
                s.MaSanPham,
                s.MaDanhMuc,
                s.MaSanPhamHienThi,
                s.TenSanPham,
                s.ThuongHieu,
                s.MoTa,
                s.SucChua,
                s.KichThuoc,
                s.ThongSo,
                s.GiaThueMoiNgay,
                s.MucCocMoiThietBi,
                s.GiaTriBoiThuong,
                TrangThaiKinhDoanh = s.TrangThaiKinhDoanh,
                HinhAnhChinh = s.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault(h => h.LaAnhChinh) != null
                    ? s.HinhAnhs.OrderBy(h => h.ThuTu).First(h => h.LaAnhChinh).DuongDan
                    : (s.HinhAnhs.OrderBy(h => h.ThuTu).FirstOrDefault() != null ? s.HinhAnhs.OrderBy(h => h.ThuTu).First().DuongDan : null),
                HinhAnhs = s.HinhAnhs.OrderBy(h => h.ThuTu).Select(h => h.DuongDan).ToList()
            })
            .ToListAsync();

        var items = raw.Select(s => new
        {
            s.MaSanPham,
            s.MaDanhMuc,
            s.MaSanPhamHienThi,
            s.TenSanPham,
            s.ThuongHieu,
            s.MoTa,
            s.SucChua,
            s.KichThuoc,
            s.ThongSo,
            s.GiaThueMoiNgay,
            s.MucCocMoiThietBi,
            s.GiaTriBoiThuong,
            TrangThaiKinhDoanh = s.TrangThaiKinhDoanh.ToString(),
            s.HinhAnhChinh,
            s.HinhAnhs
        }).ToList();
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

        // [SP-04] Lưu danh sách URL hình ảnh nếu người dùng cung cấp (dòng đầu là ảnh chính).
        await LuuDanhSachHinhAnhAsync(sp.MaSanPham, req.HinhAnhs);

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

        // [SP-04] Hợp nhất danh sách URL hình ảnh mới mà người dùng nhập ở textarea Url hình ảnh.
        await LuuDanhSachHinhAnhAsync(sp.MaSanPham, req.HinhAnhs);

        return sp;
    }

    // [SP-04] Hợp nhất danh sách URL hình ảnh: thêm những URL chưa có trong DB, giữ nguyên các ảnh cũ.
    // Đảm bảo luôn có đúng một ảnh chính (LaAnhChinh = true) sau khi lưu.
    private async Task LuuDanhSachHinhAnhAsync(long maSanPham, List<string>? hinhAnhs)
    {
        if (hinhAnhs == null || hinhAnhs.Count == 0) return;

        var existing = await _context.Set<HinhAnhSanPham>()
            .Where(h => h.MaSanPham == maSanPham).ToListAsync();
        var existingUrls = existing.Select(h => h.DuongDan).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var nextThuTu = existing.Any() ? existing.Max(h => h.ThuTu) + 1 : 1;

        foreach (var url in hinhAnhs)
        {
            var clean = url?.Trim();
            if (string.IsNullOrWhiteSpace(clean)) continue;
            if (existingUrls.Contains(clean)) continue;

            _context.Add(new HinhAnhSanPham
            {
                MaSanPham = maSanPham,
                DuongDan = clean,
                LaAnhChinh = !existing.Any() && nextThuTu == 1 && !existingUrls.Any(),
                ThuTu = nextThuTu++
            });
            existingUrls.Add(clean);
        }

        await _context.SaveChangesAsync();

        // Bảo đảm có đúng 1 ảnh chính
        var all = await _context.Set<HinhAnhSanPham>()
            .Where(h => h.MaSanPham == maSanPham).OrderBy(h => h.ThuTu).ToListAsync();
        if (all.Any() && !all.Any(h => h.LaAnhChinh))
        {
            all.First().LaAnhChinh = true;
            await _context.SaveChangesAsync();
        }
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

        var wasPrimary = hinhAnh.LaAnhChinh;
        var maSanPham = hinhAnh.MaSanPham;

        _context.Remove(hinhAnh);
        await _context.SaveChangesAsync();

        // [SP-05] Nếu vừa xóa ảnh chính, đôn ảnh có ThuTu nhỏ nhất còn lại lên làm ảnh chính.
        if (wasPrimary)
        {
            var next = await _context.Set<HinhAnhSanPham>()
                .Where(h => h.MaSanPham == maSanPham)
                .OrderBy(h => h.ThuTu)
                .FirstOrDefaultAsync();
            if (next != null)
            {
                next.LaAnhChinh = true;
                await _context.SaveChangesAsync();
            }
        }
    }
}
