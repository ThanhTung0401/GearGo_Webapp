using GearGo.Data;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services
{
    public class DanhMucService : IDanhMucService
    {
        private readonly ApplicationDbContext _context;
        public DanhMucService(ApplicationDbContext context) => _context = context;

        public async Task<IEnumerable<DanhMucSanPham>> LayTatCaAsync() => await _context.DanhMucSanPhams.OrderBy(d => d.ThuTu).ToListAsync();
        public async Task<DanhMucSanPham?> LayTheoIdAsync(int id) => await _context.DanhMucSanPhams.FindAsync(id);

        public async Task<DanhMucSanPham> TaoMoiAsync(DanhMucSanPham danhMuc)
        {
            danhMuc.CreatedAt = DateTime.UtcNow;
            _context.DanhMucSanPhams.Add(danhMuc);
            await _context.SaveChangesAsync();
            return danhMuc;
        }

        public async Task<bool> CapNhatAsync(DanhMucSanPham danhMuc)
        {
            danhMuc.UpdatedAt = DateTime.UtcNow;
            _context.DanhMucSanPhams.Update(danhMuc);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<(bool ThanhCong, string? LoiLam)> XoaAsync(int id)
        {
            if (await _context.SanPhams.AnyAsync(sp => sp.DanhMucId == id)) return (false, "Không thể xóa danh mục đang chứa sản phẩm.");
            var danhMuc = await _context.DanhMucSanPhams.FindAsync(id);
            if (danhMuc == null) return (false, "Không tìm thấy danh mục.");
            _context.DanhMucSanPhams.Remove(danhMuc);
            await _context.SaveChangesAsync();
            return (true, null);
        }
    }
}