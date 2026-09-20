using System;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace GearGo.Services.Implements;
public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _context;
    public InventoryService(ApplicationDbContext context)
    {
        _context = context;
    }
    public Task<int> CheckAvailabilityAsync(long sanPhamId, DateTime tuNgay, DateTime denNgay)
    {
        // TODO: Viết logic lấy tổng Sẵn Sàng - Đang Giữ Chỗ - Đang Phân Công
        return Task.FromResult(0);
    }
}
