using GearGo.Data;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services
{
    public class KhaDungService : IKhaDungService
    {
        private readonly ApplicationDbContext _context;
        public KhaDungService(ApplicationDbContext context) => _context = context;

        public async Task<int> LayKhaDungAsync(int sanPhamId, DateTime gioNhan, DateTime gioTra)
        {
            if (gioNhan >= gioTra) return 0;
            var tongThietBi = await _context.ThietBis.CountAsync(t => t.SanPhamId == sanPhamId && (t.TrangThai == TrangThaiThietBi.SanSang || t.TrangThai == TrangThaiThietBi.DangThue));
            if (tongThietBi == 0) return 0;

            var soLuongDaDat = await _context.ChiTietDonThues
                .Where(ct => ct.SanPhamId == sanPhamId && ct.DonThue.TrangThai != TrangThaiDonThue.HetHan && ct.DonThue.TrangThai != TrangThaiDonThue.KhachHuy && ct.DonThue.TrangThai != TrangThaiDonThue.CuaHangHuy && ct.DonThue.TrangThai != TrangThaiDonThue.HoanTat && ct.DonThue.GioNhan < gioTra && ct.DonThue.GioTra > gioNhan)
                .SumAsync(ct => (int?)ct.SoLuong) ?? 0;

            return Math.Max(0, tongThietBi - soLuongDaDat);
        }

        public async Task<Dictionary<int, int>> LayKhaDungNhieuSanPhamAsync(IEnumerable<int> ids, DateTime gioNhan, DateTime gioTra)
        {
            var dict = new Dictionary<int, int>();
            if (gioNhan >= gioTra || !ids.Any()) return dict;

            var idList = ids.Distinct().ToList();
            var tongThietBiDict = await _context.ThietBis.Where(t => idList.Contains(t.SanPhamId) && (t.TrangThai == TrangThaiThietBi.SanSang || t.TrangThai == TrangThaiThietBi.DangThue))
                .GroupBy(t => t.SanPhamId).Select(g => new { SanPhamId = g.Key, Tong = g.Count() }).ToDictionaryAsync(k => k.SanPhamId, v => v.Tong);

            var soLuongDaDatDict = await _context.ChiTietDonThues.Where(ct => idList.Contains(ct.SanPhamId) && ct.DonThue.TrangThai != TrangThaiDonThue.HetHan && ct.DonThue.TrangThai != TrangThaiDonThue.KhachHuy && ct.DonThue.TrangThai != TrangThaiDonThue.CuaHangHuy && ct.DonThue.TrangThai != TrangThaiDonThue.HoanTat && ct.DonThue.GioNhan < gioTra && ct.DonThue.GioTra > gioNhan)
                .GroupBy(ct => ct.SanPhamId).Select(g => new { SanPhamId = g.Key, DaDat = g.Sum(x => x.SoLuong) }).ToDictionaryAsync(k => k.SanPhamId, v => v.DaDat);

            foreach (var id in idList)
                dict[id] = Math.Max(0, tongThietBiDict.GetValueOrDefault(id, 0) - soLuongDaDatDict.GetValueOrDefault(id, 0));

            return dict;
        }
    }
}