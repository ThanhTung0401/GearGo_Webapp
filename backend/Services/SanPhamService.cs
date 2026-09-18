using GearGo.Data;
using GearGo.Models.DTOs.SanPham;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services
{
    public class SanPhamService : ISanPhamService
    {
        private readonly ApplicationDbContext _context;
        private readonly IKhaDungService _khaDungService;
        private readonly IWebHostEnvironment _env;

        public SanPhamService(ApplicationDbContext context, IKhaDungService khaDungService, IWebHostEnvironment env)
        {
            _context = context;
            _khaDungService = khaDungService;
            _env = env;
        }

        public async Task<(IEnumerable<SanPhamResponse> Data, int TongSo)> TimKiemAsync(TimKiemSanPhamRequest request)
        {
            var query = _context.SanPhams.Include(sp => sp.HinhAnhSanPhams).AsQueryable();

            if (!string.IsNullOrEmpty(request.TuKhoa)) query = query.Where(sp => sp.Ten.Contains(request.TuKhoa));
            if (request.DanhMucId.HasValue) query = query.Where(sp => sp.DanhMucId == request.DanhMucId.Value);
            if (!string.IsNullOrEmpty(request.ThuongHieu)) query = query.Where(sp => sp.ThuongHieu == request.ThuongHieu);
            if (request.GiaThueThapNhat.HasValue) query = query.Where(sp => sp.GiaThueNgay >= request.GiaThueThapNhat.Value);
            if (request.GiaThueCaoNhat.HasValue) query = query.Where(sp => sp.GiaThueNgay <= request.GiaThueCaoNhat.Value);

            query = request.SapXepTheo switch
            {
                "GiaTang" => query.OrderBy(sp => sp.GiaThueNgay),
                "GiaGiam" => query.OrderByDescending(sp => sp.GiaThueNgay),
                _ => query.OrderByDescending(sp => sp.CreatedAt)
            };

            var tongSo = await query.CountAsync();
            var sanPhams = await query.Skip((request.Trang - 1) * request.SoMoiTrang).Take(request.SoMoiTrang).ToListAsync();
            var sanPhamIds = sanPhams.Select(sp => sp.Id).ToList();
            var khaDungDict = (request.GioNhan.HasValue && request.GioTra.HasValue) ? await _khaDungService.LayKhaDungNhieuSanPhamAsync(sanPhamIds, request.GioNhan.Value, request.GioTra.Value) : new Dictionary<int, int>();

            var result = sanPhams.Select(sp => new SanPhamResponse
            {
                Id = sp.Id, Ten = sp.Ten, GiaThueNgay = sp.GiaThueNgay, MucCoc = sp.MucCocMotThietBi,
                ThuongHieu = sp.ThuongHieu, AnhChinh = sp.HinhAnhSanPhams.FirstOrDefault(h => h.LaAnhChinh)?.DuongDan,
                SoLuongKhaDung = khaDungDict.GetValueOrDefault(sp.Id, 0)
            });

            return (result, tongSo);
        }

        public async Task<SanPhamDetailResponse?> LayChiTietAsync(int id, DateTime? gioNhan, DateTime? gioTra)
        {
            var sp = await _context.SanPhams.Include(x => x.HinhAnhSanPhams).FirstOrDefaultAsync(x => x.Id == id);
            if (sp == null) return null;

            int khaDung = (gioNhan.HasValue && gioTra.HasValue) ? await _khaDungService.LayKhaDungAsync(id, gioNhan.Value, gioTra.Value) : 0;

            return new SanPhamDetailResponse
            {
                Id = sp.Id, Ma = sp.Ma, Ten = sp.Ten, MoTa = sp.MoTa, GiaThueNgay = sp.GiaThueNgay, MucCoc = sp.MucCocMotThietBi,
                ThuongHieu = sp.ThuongHieu, SoLuongKhaDung = khaDung, HinhAnhs = sp.HinhAnhSanPhams.OrderBy(h => h.ThuTu).Select(h => h.DuongDan).ToList()
            };
        }

        public async Task<SanPham> TaoMoiAsync(SanPham sanPham, List<IFormFile> hinhAnhs)
        {
            sanPham.CreatedAt = DateTime.UtcNow;
            sanPham.HinhAnhSanPhams = new List<HinhAnhSanPham>();

            if (hinhAnhs != null && hinhAnhs.Any())
            {
                var uploadPath = Path.Combine(_env.WebRootPath, "uploads", "sanpham");
                if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

                for (int i = 0; i < hinhAnhs.Count; i++)
                {
                    var file = hinhAnhs[i];
                    var ext = Path.GetExtension(file.FileName).ToLower();
                    var fileName = $"{Guid.NewGuid()}{ext}";
                    using (var stream = new FileStream(Path.Combine(uploadPath, fileName), FileMode.Create)) { await file.CopyToAsync(stream); }

                    sanPham.HinhAnhSanPhams.Add(new HinhAnhSanPham { DuongDan = $"/uploads/sanpham/{fileName}", LaAnhChinh = i == 0, ThuTu = i });
                }
            }
            _context.SanPhams.Add(sanPham);
            await _context.SaveChangesAsync();
            return sanPham;
        }

        public async Task<bool> CapNhatAsync(SanPham sanPham)
        {
            sanPham.UpdatedAt = DateTime.UtcNow;
            _context.SanPhams.Update(sanPham);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DoiTrangThaiAsync(int id, string trangThaiKinhDoanh)
        {
            var sp = await _context.SanPhams.FindAsync(id);
            if (sp == null) return false;
            sp.TrangThaiKinhDoanh = trangThaiKinhDoanh;
            sp.UpdatedAt = DateTime.UtcNow;
            return await _context.SaveChangesAsync() > 0;
        }
    }
}