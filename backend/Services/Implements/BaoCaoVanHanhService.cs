using GearGo.Data;
using GearGo.Models.DTOs.BaoCao;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class BaoCaoVanHanhService : IBaoCaoVanHanhService
{
    private readonly ApplicationDbContext _context;

    public BaoCaoVanHanhService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BaoCaoVanHanhChiTietResponse> LayBaoCaoVanHanhAsync(BoLocBaoCaoRequest filter)
    {
        var tuNgay = filter.TuNgay ?? DateTime.UtcNow.AddDays(-30);
        var denNgay = filter.DenNgay ?? DateTime.UtcNow;

        // 1. Lọc đơn thuê theo khoảng thời gian
        var queryDon = _context.DonThues.AsNoTracking()
            .Where(d => d.NgayDat >= tuNgay && d.NgayDat <= denNgay);

        int tongDon = await queryDon.CountAsync();
        int tongDonHuy = await queryDon.CountAsync(d => 
            d.TrangThai == TrangThaiDonThue.KhachHuy || 
            d.TrangThai == TrangThaiDonThue.CuaHangHuy || 
            d.TrangThai == TrangThaiDonThue.HetHan);

        int tongDonThanhCong = await queryDon.CountAsync(d => 
            d.TrangThai == TrangThaiDonThue.HoanTat || 
            d.TrangThai == TrangThaiDonThue.DangThue ||
            d.TrangThai == TrangThaiDonThue.DaNhanTra ||
            d.TrangThai == TrangThaiDonThue.ChoDoiSoat);

        double tyLeHuy = tongDon > 0 ? Math.Round((double)tongDonHuy / tongDon * 100, 2) : 0.0;

        // 2. Thống kê thiết bị toàn hệ thống
        var queryThietBi = _context.ThietBis.AsNoTracking();
        int tongThietBi = await queryThietBi.CountAsync();
        int soDangThue = await queryThietBi.CountAsync(t => t.TrangThaiSuDung == TrangThaiThietBi.DangThue);
        int soDangBaoTri = await queryThietBi.CountAsync(t => t.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri);
        int soThatLac = await queryThietBi.CountAsync(t => t.TrangThaiSuDung == TrangThaiThietBi.ThatLac);

        double tyLeHaoMon = tongThietBi > 0 
            ? Math.Round((double)(soDangBaoTri + soThatLac) / tongThietBi * 100, 2) 
            : 0.0;

        // 3. Tính số ngày thuê trung bình của các đơn thành công
        var danhSachSoNgay = await queryDon
            .Where(d => d.TrangThai != TrangThaiDonThue.KhachHuy && 
                        d.TrangThai != TrangThaiDonThue.CuaHangHuy && 
                        d.TrangThai != TrangThaiDonThue.HetHan)
            .Select(d => (double)EF.Functions.DateDiffDay(d.GioNhanDuKien, d.GioTraDuKien))
            .ToListAsync();

        double soNgayThueTB = danhSachSoNgay.Count > 0 
            ? Math.Round(danhSachSoNgay.Average(), 1) 
            : 0.0;
        if (soNgayThueTB < 1.0 && danhSachSoNgay.Count > 0) soNgayThueTB = 1.0;

        // 4. Tính tỷ lệ quay vòng = Tổng lượt thuê thiết bị / Tổng thiết bị
        int tongLuotThueThietBi = await _context.PhanCongThietBis
            .AsNoTracking()
            .Where(pc => pc.ThoiDiemPhanCong >= tuNgay && pc.ThoiDiemPhanCong <= denNgay && pc.TrangThai != "DaHuy")
            .CountAsync();

        double tyLeQuayVong = tongThietBi > 0 
            ? Math.Round((double)tongLuotThueThietBi / tongThietBi, 2) 
            : 0.0;

        // 5. Thống kê theo từng sản phẩm
        var sanPhamQuery = _context.SanPhams.AsNoTracking()
            .Include(s => s.DanhMuc)
            .Include(s => s.ThietBis)
            .AsQueryable();

        if (filter.MaDanhMuc.HasValue)
        {
            sanPhamQuery = sanPhamQuery.Where(s => s.MaDanhMuc == filter.MaDanhMuc.Value);
        }
        if (filter.MaSanPham.HasValue)
        {
            sanPhamQuery = sanPhamQuery.Where(s => s.MaSanPham == filter.MaSanPham.Value);
        }

        var sanPhamList = await sanPhamQuery.ToListAsync();

        var chiTietStats = await _context.ChiTietDonThues.AsNoTracking()
            .Where(c => c.DonThue.NgayDat >= tuNgay && c.DonThue.NgayDat <= denNgay)
            .GroupBy(c => c.MaSanPham)
            .Select(g => new
            {
                MaSanPham = g.Key,
                SoLuotThue = g.Sum(c => c.SoLuong),
                TongDoanhThu = g.Sum(c => c.DonGiaThueMoiNgay * c.SoLuong * c.SoNgayTinhTien - c.TienGiam)
            })
            .ToDictionaryAsync(x => x.MaSanPham);

        var nhanTraStats = await _context.ChiTietNhanTras.AsNoTracking()
            .Where(ct => ct.PhieuNhanTra.ThoiDiemLap >= tuNgay && ct.PhieuNhanTra.ThoiDiemLap <= denNgay)
            .Select(ct => new
            {
                MaSanPham = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi.MaSanPhamHienTai,
                ct.KetLuan
            })
            .GroupBy(x => x.MaSanPham)
            .Select(g => new
            {
                MaSanPham = g.Key,
                SoHong = g.Count(x => x.KetLuan == "HongNhe" || x.KetLuan == "HongNang"),
                SoMat = g.Count(x => x.KetLuan == "MatThietBi")
            })
            .ToDictionaryAsync(x => x.MaSanPham);

        var chiSoSanPham = sanPhamList.Select(s =>
        {
            chiTietStats.TryGetValue(s.MaSanPham, out var stat);
            nhanTraStats.TryGetValue(s.MaSanPham, out var ntStat);

            return new ChiSoSanPhamResponse
            {
                MaSanPham = s.MaSanPham,
                TenSanPham = s.TenSanPham,
                TenDanhMuc = s.DanhMuc?.TenDanhMuc ?? "",
                TongSoThietBi = s.ThietBis.Count,
                SoLuotThue = stat?.SoLuotThue ?? 0,
                SoLuotHongHoc = ntStat?.SoHong ?? 0,
                SoLuotMat = ntStat?.SoMat ?? 0,
                TongDoanhThuUocTinh = stat?.TongDoanhThu ?? 0
            };
        })
        .OrderByDescending(s => s.SoLuotThue)
        .ToList();

        return new BaoCaoVanHanhChiTietResponse
        {
            TongQuan = new TongQuanChiSoVanHanhResponse
            {
                TongDonPhatSinh = tongDon,
                TongDonThanhCong = tongDonThanhCong,
                TongDonBiHuy = tongDonHuy,
                TyLeHuyDonPhanTram = tyLeHuy,
                TongThietBiTrongKho = tongThietBi,
                SoThietBiDangChoThue = soDangThue,
                SoThietBiDangBaoTri = soDangBaoTri,
                SoThietBiThatLac = soThatLac,
                TyLeHaoMonPhanTram = tyLeHaoMon,
                SoNgayThueTrungBinh = soNgayThueTB,
                TyLeQuayVongThietBi = tyLeQuayVong
            },
            ChiSoTheoSanPham = chiSoSanPham
        };
    }
}
