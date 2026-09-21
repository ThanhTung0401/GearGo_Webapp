using System;
using System.Collections.Generic;
using System.Linq;
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

    public async Task<int> CheckAvailabilityAsync(long sanPhamId, DateTime tuNgay, DateTime denNgay)
    {
        var now = DateTime.UtcNow;

        // 1. Đếm tổng ThietBi đủ điều kiện từ phiếu nhập đã xác nhận (DaNhapKho)
        int tongThietBi = await _context.ThietBis
            .Where(t => t.ChiTietPhieuNhap.MaSanPham == sanPhamId 
                     && t.ChiTietPhieuNhap.PhieuNhapHang.TrangThai == Models.Enums.TrangThaiPhieuNhap.DaNhapKho)
            .CountAsync();

        // 2. Lấy các khoảng thời gian và số lượng bị chiếm
        var overlappingItems = await _context.ChiTietDonThues
            .Include(c => c.DonThue)
            .Include(c => c.GiuCho)
            .Where(c => c.MaSanPham == sanPhamId
                     && c.DonThue.GioNhanDuKien < denNgay
                     && c.DonThue.GioTraDuKien > tuNgay
                     && (
                         // Đơn đã xác nhận, đang chuẩn bị, sẵn sàng nhận, đang thuê
                         (c.DonThue.TrangThai == Models.Enums.TrangThaiDonThue.DaXacNhan ||
                          c.DonThue.TrangThai == Models.Enums.TrangThaiDonThue.DangChuanBi ||
                          c.DonThue.TrangThai == Models.Enums.TrangThaiDonThue.SanSangNhan ||
                          c.DonThue.TrangThai == Models.Enums.TrangThaiDonThue.DangThue)
                         ||
                         // Giữ chỗ tạm chiếm lịch
                         (c.DonThue.TrangThai == Models.Enums.TrangThaiDonThue.ChoThanhToan &&
                          c.GiuCho != null &&
                          c.GiuCho.TrangThai == Models.Enums.TrangThaiGiuCho.DangGiu &&
                          c.GiuCho.ThoiDiemHetHan > now)
                     ))
            .Select(c => new {
                c.DonThue.GioNhanDuKien,
                c.DonThue.GioTraDuKien,
                c.SoLuong
            })
            .ToListAsync();

        // 3. Tính số lượng bị chiếm đồng thời lớn nhất (Sweep-line algorithm)
        int maxOccupied = 0;
        if (overlappingItems.Any())
        {
            var events = new List<(DateTime Time, int Diff)>();
            foreach (var item in overlappingItems)
            {
                events.Add((item.GioNhanDuKien, item.SoLuong));
                events.Add((item.GioTraDuKien, -item.SoLuong));
            }

            // Sắp xếp sự kiện theo thời gian, nếu trùng thời gian thì ưu tiên giải phóng (-) trước
            var sortedEvents = events.OrderBy(e => e.Time).ThenBy(e => e.Diff).ToList();

            int currentOccupied = 0;
            foreach (var ev in sortedEvents)
            {
                currentOccupied += ev.Diff;
                if (currentOccupied > maxOccupied)
                {
                    maxOccupied = currentOccupied;
                }
            }
        }

        // 4. Khả dụng = Tổng thiết bị - Số lượng bị chiếm lớn nhất
        return Math.Max(0, tongThietBi - maxOccupied);
    }
}
