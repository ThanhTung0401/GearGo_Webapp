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
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var gioThue = await _context.GioThues
                .Include(g => g.ChiTietGioThues)
                .FirstOrDefaultAsync(g => g.MaKhachHang == khachHangId);
            if (gioThue == null || !gioThue.ChiTietGioThues.Any()) throw new Exception("Giỏ hàng trống.");

            // 1. Sắp xếp danh sách Product IDs TĂNG DẦN để CHỐNG DEADLOCK khi Locking
            var sanPhamIds = gioThue.ChiTietGioThues.Select(c => c.MaSanPham).OrderBy(id => id).ToList();

            // 2. Sử dụng UPDLOCK (Pessimistic Lock) ở cấp độ Row của Sản Phẩm (CHỐNG OVERSELLING)
            var lockedSanPhams = await _context.SanPhams
                .FromSqlRaw($"SELECT * FROM SAN_PHAM WITH (UPDLOCK) WHERE ma_san_pham IN ({string.Join(",", sanPhamIds)})")
                .ToListAsync();

            if (khuyenMaiId.HasValue)
            {
                var lockedKhuyenMai = await _context.KhuyenMais
                   .FromSqlRaw($"SELECT * FROM KHUYEN_MAI WITH (UPDLOCK) WHERE ma_khuyen_mai = {khuyenMaiId.Value}")
                   .FirstOrDefaultAsync();
            }
            foreach (var item in gioThue.ChiTietGioThues)
            {
                int khaDung = await _inventoryService.CheckAvailabilityAsync(item.MaSanPham, gioThue.GioNhanDuKien.Value, gioThue.GioTraDuKien.Value);
                if (khaDung < item.SoLuong) throw new Exception($"Sản phẩm mã {item.MaSanPham} không đủ số lượng trong khoảng thời gian này.");
            }
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return false;
        }
    }
}
