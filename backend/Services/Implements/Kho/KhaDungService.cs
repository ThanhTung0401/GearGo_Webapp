using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ tính số lượng thiết bị khả dụng theo khoảng thời gian thuê (thuật toán Sweep Line).
/// </summary>
public class KhaDungService : IKhaDungService
{
    private readonly ApplicationDbContext _context;

    public KhaDungService(ApplicationDbContext context) => _context = context;

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

        if (gioTra <= gioNhan || gioNhan < DateTime.UtcNow.AddMinutes(-5))
        {
            foreach (var sp in sanPhamList) dict[sp] = 0;
            return dict;
        }

        var totalEligible = await LayTongThietBiDuDieuKienAsync(sanPhamList);
        var groupedOverlaps = (await LayKhoangBiChiemAsync(sanPhamList, gioNhan, gioTra))
            .GroupBy(x => x.MaSanPham).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var sp in sanPhamList)
        {
            int total = totalEligible.GetValueOrDefault(sp, 0);
            if (total == 0) { dict[sp] = 0; continue; }

            if (!groupedOverlaps.TryGetValue(sp, out var overlaps) || overlaps.Count == 0)
            {
                dict[sp] = total;
                continue;
            }

            dict[sp] = Math.Max(0, total - TinhSoLuongDongThoiToiDa(overlaps));
        }

        return dict;
    }

    private async Task<Dictionary<long, int>> LayTongThietBiDuDieuKienAsync(List<long> sanPhamList)
    {
        var settledThietBiIds = await _context.ChiTietNhanTras
            .Where(nt => nt.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot &&
                         (nt.ThoiDiemTraThucTe != null || nt.KetLuan == "MatThietBi" || nt.ThoiDiemDuyetMat != null))
            .Select(nt => nt.ChiTietBanGiao.PhanCongThietBi.MaThietBi)
            .Distinct().ToListAsync();

        var thietBiQuaHanIds = await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon).ThenInclude(c => c.DonThue)
            .Where(pc => pc.TrangThai == "DaPhanCong" &&
                         pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangThue &&
                         pc.ChiTietDon.DonThue.GioTraDuKien < DateTime.UtcNow &&
                         !settledThietBiIds.Contains(pc.MaThietBi))
            .Select(pc => pc.MaThietBi).Distinct().ToListAsync();

        return await _context.ThietBis
            .Where(t => (t.TrangThaiSuDung == TrangThaiThietBi.SanSang || t.TrangThaiSuDung == TrangThaiThietBi.DangThue) &&
                        t.ChiTietPhieuNhap.PhieuNhapHang.TrangThai == TrangThaiPhieuNhap.DaNhapKho &&
                        sanPhamList.Contains(t.MaSanPhamHienTai) &&
                        !thietBiQuaHanIds.Contains(t.MaThietBi))
            .GroupBy(t => t.MaSanPhamHienTai)
            .Select(g => new { MaSanPham = g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.MaSanPham, x => x.Total);
    }

    private async Task<List<(long MaSanPham, DateTime Start, DateTime End, int SoLuong)>> LayKhoangBiChiemAsync(
        List<long> sanPhamList, DateTime gioNhan, DateTime gioTra)
    {
        var now = DateTime.UtcNow;
        var settledCountByChiTietDon = await _context.ChiTietNhanTras
            .Where(nt => nt.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot &&
                         (nt.ThoiDiemTraThucTe != null || nt.KetLuan == "MatThietBi" || nt.ThoiDiemDuyetMat != null))
            .GroupBy(nt => nt.ChiTietBanGiao.PhanCongThietBi.MaChiTietDon)
            .Select(g => new { MaChiTietDon = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.MaChiTietDon, x => x.Count);

        var overlappingDetails = await _context.ChiTietDonThues
            .Include(c => c.DonThue).Include(c => c.GiuCho)
            .Where(c => sanPhamList.Contains(c.MaSanPham) &&
                        c.DonThue.GioNhanDuKien < gioTra && c.DonThue.GioTraDuKien > gioNhan &&
                        (c.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                         c.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                         c.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan ||
                         c.DonThue.TrangThai == TrangThaiDonThue.DangThue ||
                         (c.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan &&
                          c.GiuCho != null && c.GiuCho.TrangThai == TrangThaiGiuCho.DangGiu &&
                          c.GiuCho.ThoiDiemHetHan > now)))
            .ToListAsync();

        var result = new List<(long MaSanPham, DateTime Start, DateTime End, int SoLuong)>();
        foreach (var c in overlappingDetails)
        {
            int soLuongChiem = c.SoLuong;
            if (c.DonThue.TrangThai == TrangThaiDonThue.DangThue)
                soLuongChiem = Math.Max(0, c.SoLuong - settledCountByChiTietDon.GetValueOrDefault(c.MaChiTietDon, 0));
            if (soLuongChiem > 0)
                result.Add((c.MaSanPham, c.DonThue.GioNhanDuKien, c.DonThue.GioTraDuKien, soLuongChiem));
        }
        return result;
    }

    /// <summary>Sweep Line: sự kiện Trả (-SoLuong) xử lý trước sự kiện Nhận (+SoLuong) khi trùng thời điểm.</summary>
    private static int TinhSoLuongDongThoiToiDa(List<(long MaSanPham, DateTime Start, DateTime End, int SoLuong)> intervals)
    {
        var events = new List<(DateTime Time, int Diff)>(intervals.Count * 2);
        foreach (var interval in intervals)
        {
            events.Add((interval.Start, interval.SoLuong));
            events.Add((interval.End, -interval.SoLuong));
        }

        int maxConcurrent = 0, current = 0;
        foreach (var e in events.OrderBy(e => e.Time).ThenBy(e => e.Diff))
        {
            current += e.Diff;
            if (current > maxConcurrent) maxConcurrent = current;
        }
        return maxConcurrent;
    }
}
