using System;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace GearGo.Services.Implements;

public class CheckoutService : ICheckoutService
{
    private readonly ApplicationDbContext _context;
    private readonly IInventoryService _inventoryService;
    public CheckoutService(ApplicationDbContext context, IInventoryService inventoryService)
    {
        _context = context;
        _inventoryService = inventoryService;
    }
    public async Task<bool> PlaceOrderWithReserveAsync(long khachHangId, long chinhSachId, long? khuyenMaiId)
    {
        // Sử dụng RepeatableRead để bảo vệ dữ liệu sản phẩm trong suốt transaction tránh overselling
        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
        try
        {
            var gioThue = await _context.GioThues
                .Include(g => g.ChiTietGioThues)
                .FirstOrDefaultAsync(g => g.MaKhachHang == khachHangId);

            if (gioThue == null || !gioThue.ChiTietGioThues.Any()) 
                throw new Exception("Giỏ hàng trống.");

            // Kiểm tra thời gian thuê dự kiến hợp lệ
            if (!gioThue.GioNhanDuKien.HasValue || !gioThue.GioTraDuKien.HasValue)
                throw new Exception("Giỏ hàng chưa có khoảng thời gian nhận và trả dự kiến.");

            // 1. Sắp xếp danh sách Product IDs TĂNG DẦN để CHỐNG DEADLOCK khi truy vấn
            var sanPhamIds = gioThue.ChiTietGioThues.Select(c => c.MaSanPham).OrderBy(id => id).ToList();

            // 2. Sử dụng LINQ thuần thay cho FromSqlRaw, dữ liệu được khóa qua RepeatableRead transaction
            var lockedSanPhams = await _context.SanPhams
                .Where(sp => sanPhamIds.Contains(sp.MaSanPham))
                .ToListAsync();

            if (khuyenMaiId.HasValue)
            {
                var lockedKhuyenMai = await _context.KhuyenMais
                    .FirstOrDefaultAsync(km => km.MaKhuyenMai == khuyenMaiId.Value);
            }

            foreach (var item in gioThue.ChiTietGioThues)
            {
                int khaDung = await _inventoryService.CheckAvailabilityAsync(
                    item.MaSanPham, 
                    gioThue.GioNhanDuKien.Value, 
                    gioThue.GioTraDuKien.Value);

                if (khaDung < item.SoLuong) 
                    throw new Exception($"Sản phẩm mã {item.MaSanPham} không đủ số lượng trong khoảng thời gian này.");
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return false;
        }
    }
}
