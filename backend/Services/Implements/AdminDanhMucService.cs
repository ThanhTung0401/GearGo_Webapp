using GearGo.Data;
using GearGo.Models.DTOs.Admin;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Admin
{
    public class AdminDanhMucService : IAdminDanhMucService
    {
        private readonly ApplicationDbContext _context;

        public AdminDanhMucService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<object> LayDanhSachAsync()
        {
            // Admin xem toàn bộ danh mục, bất kể trạng thái
            return await _context.Set<DanhMucSanPham>().ToListAsync();
        }

        public async Task<object> TaoMoiAsync(TaoDanhMucRequest req)
        {
            if (req.MaDanhMucCha.HasValue)
            {
                var parent = await _context.Set<DanhMucSanPham>().FindAsync(req.MaDanhMucCha.Value);
                if (parent == null) throw new Exception("Danh mục cha không tồn tại.");
            }

            var danhMuc = new DanhMucSanPham
            {
                TenDanhMuc = req.TenDanhMuc,
                MaDanhMucCha = req.MaDanhMucCha,
                MoTa = req.MoTa,
                ThuTuHienThi = req.ThuTuHienThi,
                TrangThai = req.TrangThai
            };

            _context.Add(danhMuc);
            await _context.SaveChangesAsync();
            return danhMuc;
        }

        public async Task<object> CapNhatAsync(long id, CapNhatDanhMucRequest req)
        {
            var danhMuc = await _context.Set<DanhMucSanPham>().FindAsync(id);
            if (danhMuc == null) throw new Exception("Không tìm thấy danh mục.");

            if (req.MaDanhMucCha.HasValue)
            {
                // 1. Không cho phép danh mục cha là chính nó
                if (req.MaDanhMucCha.Value == id) 
                    throw new Exception("Danh mục cha không được là chính nó.");
                    
                // 2. Không cho phép danh mục con trực tiếp làm danh mục cha (chống vòng lặp)
                bool isChild = await _context.Set<DanhMucSanPham>().AnyAsync(d => d.MaDanhMucCha == id && d.MaDanhMuc == req.MaDanhMucCha.Value);
                if (isChild) throw new Exception("Không thể chọn danh mục con làm danh mục cha.");
            }

            danhMuc.TenDanhMuc = req.TenDanhMuc;
            danhMuc.MaDanhMucCha = req.MaDanhMucCha;
            danhMuc.MoTa = req.MoTa;
            danhMuc.ThuTuHienThi = req.ThuTuHienThi;
            danhMuc.TrangThai = req.TrangThai;

            await _context.SaveChangesAsync();
            return danhMuc;
        }

        public async Task DoiTrangThaiAsync(long id, string trangThaiMoi)
        {
            var danhMuc = await _context.Set<DanhMucSanPham>().FindAsync(id);
            if (danhMuc == null) throw new Exception("Không tìm thấy danh mục.");
            
            danhMuc.TrangThai = trangThaiMoi;
            await _context.SaveChangesAsync();
        }

        public async Task XoaAsync(long id)
        {
            // Ràng buộc 1: Không có sản phẩm
            bool hasProducts = await _context.Set<SanPham>().AnyAsync(s => s.MaDanhMuc == id);
            if (hasProducts) throw new Exception("Không thể xóa danh mục đang chứa sản phẩm.");

            // Ràng buộc 2: Không có danh mục con
            bool hasChildren = await _context.Set<DanhMucSanPham>().AnyAsync(d => d.MaDanhMucCha == id);
            if (hasChildren) throw new Exception("Không thể xóa danh mục đang chứa danh mục con.");

            var danhMuc = await _context.Set<DanhMucSanPham>().FindAsync(id);
            if (danhMuc != null)
            {
                _context.Remove(danhMuc);
                await _context.SaveChangesAsync();
            }
        }
    }
}