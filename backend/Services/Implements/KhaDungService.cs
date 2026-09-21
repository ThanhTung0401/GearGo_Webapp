using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class KhaDungService : IKhaDungService
{
    private readonly ApplicationDbContext _context;

    public KhaDungService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> LayKhaDungAsync(long maSanPham, DateTime gioNhan, DateTime gioTra)
    {
        var dict = await LayKhaDungNhieuAsync(new[] { maSanPham }, gioNhan, gioTra);
        return dict.TryGetValue(maSanPham, out int val) ? val : 0;
    }

    public async Task<Dictionary<long, int>> LayKhaDungNhieuAsync(IEnumerable<long> maSanPhams, DateTime gioNhan, DateTime gioTra)
    {
        var dict = new Dictionary<long, int>();
        var sanPhamList = maSanPhams.Distinct().ToList();
        if (!sanPhamList.Any()) return dict;

        // Nếu giờ không hợp lệ hoặc quá khứ, trả về 0 hết
        if (gioTra <= gioNhan || gioNhan < DateTime.UtcNow.AddMinutes(-5))
        {
            foreach (var sp in sanPhamList) dict[sp] = 0;
            return dict;
        }

        // 1. Tính tổng thiết bị đủ điều kiện của mỗi sản phẩm
        // SanSang hoặc DangThue, và phiếu nhập DaNhapKho
        var totalEligible = await _context.ThietBis
            .Where(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang || t.TrangThaiSuDung == TrangThaiThietBi.DangThue)
            .Where(t => t.ChiTietPhieuNhap.PhieuNhapHang.TrangThai == TrangThaiPhieuNhap.DaNhapKho)
            .Where(t => sanPhamList.Contains(t.ChiTietPhieuNhap.MaSanPham))
            .GroupBy(t => t.ChiTietPhieuNhap.MaSanPham)
            .Select(g => new { MaSanPham = g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.MaSanPham, x => x.Total);

        var now = DateTime.UtcNow;

        // 2. Lấy các khoảng thời gian bị chiếm
        var overlappingDetails = await _context.ChiTietDonThues
            .Include(c => c.DonThue)
            .Include(c => c.GiuCho)
            .Where(c => sanPhamList.Contains(c.MaSanPham))
            // Điều kiện giao nhau: Nhận của đơn < Trả của khoảng & Trả của đơn > Nhận của khoảng
            .Where(c => c.DonThue.GioNhanDuKien < gioTra && c.DonThue.GioTraDuKien > gioNhan)
            // Điều kiện trạng thái bị chiếm
            .Where(c =>
                c.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                c.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                c.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan ||
                c.DonThue.TrangThai == TrangThaiDonThue.DangThue ||
                (c.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan && 
                 c.GiuCho != null && 
                 c.GiuCho.TrangThai == TrangThaiGiuCho.DangGiu && 
                 c.GiuCho.ThoiDiemHetHan > now))
            .Select(c => new
            {
                c.MaSanPham,
                Start = c.DonThue.GioNhanDuKien,
                End = c.DonThue.GioTraDuKien,
                c.SoLuong
            })
            .ToListAsync();

        var groupedOverlaps = overlappingDetails.GroupBy(x => x.MaSanPham);

        // 3. Tính toán max concurrent với Sweep Line Algorithm
        foreach (var sp in sanPhamList)
        {
            int total = totalEligible.GetValueOrDefault(sp, 0);
            if (total == 0)
            {
                dict[sp] = 0;
                continue;
            }

            var overlaps = groupedOverlaps.FirstOrDefault(g => g.Key == sp);
            if (overlaps == null || !overlaps.Any())
            {
                dict[sp] = total;
                continue;
            }

            // Tạo các events (Thời điểm, Thay đổi số lượng)
            // Khi Nhận -> chiếm thêm SoLuong (+SoLuong)
            // Khi Trả -> trả lại SoLuong (-SoLuong)
            var events = new List<(DateTime Time, int Diff)>();
            foreach (var interval in overlaps)
            {
                events.Add((interval.Start, interval.SoLuong));
                events.Add((interval.End, -interval.SoLuong));
            }

            // Sắp xếp các sự kiện tăng dần theo thời gian. 
            // Nếu cùng thời gian, sự kiện Trả (âm) được xử lý trước để giải phóng hàng trước khi Nhận.
            events = events.OrderBy(e => e.Time).ThenBy(e => e.Diff).ToList();

            int maxConcurrent = 0;
            int current = 0;

            foreach (var e in events)
            {
                current += e.Diff;
                if (current > maxConcurrent)
                {
                    maxConcurrent = current;
                }
            }

            int available = total - maxConcurrent;
            dict[sp] = available < 0 ? 0 : available;
        }

        return dict;
    }
}
