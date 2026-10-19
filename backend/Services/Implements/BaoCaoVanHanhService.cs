using GearGo.Data;
using GearGo.Helpers;
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
        var tuNgay = filter.TuNgay ?? DateTime.UtcNow.AddDays(-KietDomainConstants.PolicyConfig.SoNgayBaoCaoMacDinh);
        var denNgay = filter.DenNgay ?? DateTime.UtcNow;

        // 1. Lọc đơn thuê theo khoảng thời gian (Gộp 4 câu query thành 1 roundtrip duy nhất)
        var danhSachDon = await _context.DonThues.AsNoTracking()
            .Where(d => d.NgayDat >= tuNgay && d.NgayDat <= denNgay)
            .Select(d => new
            {
                d.TrangThai,
                SoNgay = (double)EF.Functions.DateDiffDay(d.GioNhanDuKien, d.GioTraDuKien)
            })
            .ToListAsync();

        int tongDon = danhSachDon.Count;
        int tongDonHuy = danhSachDon.Count(d =>
            d.TrangThai == TrangThaiDonThue.KhachHuy ||
            d.TrangThai == TrangThaiDonThue.CuaHangHuy ||
            d.TrangThai == TrangThaiDonThue.HetHan);

        int tongDonThanhCong = danhSachDon.Count(d =>
            d.TrangThai == TrangThaiDonThue.HoanTat ||
            d.TrangThai == TrangThaiDonThue.DangThue ||
            d.TrangThai == TrangThaiDonThue.DaNhanTra ||
            d.TrangThai == TrangThaiDonThue.ChoDoiSoat);

        double tyLeHuy = KietCalculationHelpers.TinhPhanTram(tongDonHuy, tongDon);

        // 2. Thống kê thiết bị toàn hệ thống (Gộp 4 câu query thành 1 roundtrip duy nhất)
        var trangThaiThietBis = await _context.ThietBis.AsNoTracking()
            .Select(t => t.TrangThaiSuDung)
            .ToListAsync();

        int tongThietBi = trangThaiThietBis.Count;
        int soDangThue = trangThaiThietBis.Count(t => t == TrangThaiThietBi.DangThue);
        int soDangBaoTri = trangThaiThietBis.Count(t => t == TrangThaiThietBi.DangBaoTri);
        int soThatLac = trangThaiThietBis.Count(t => t == TrangThaiThietBi.ThatLac);

        double tyLeHaoMon = KietCalculationHelpers.TinhPhanTram(soDangBaoTri + soThatLac, tongThietBi);

        // 3. Tính số ngày thuê trung bình của các đơn thành công
        var danhSachSoNgay = danhSachDon
            .Where(d => d.TrangThai != TrangThaiDonThue.KhachHuy &&
                        d.TrangThai != TrangThaiDonThue.CuaHangHuy &&
                        d.TrangThai != TrangThaiDonThue.HetHan)
            .Select(d => d.SoNgay)
            .ToList();

        double soNgayThueTB = danhSachSoNgay.Count > 0
            ? Math.Round(danhSachSoNgay.Average(), 1)
            : 0.0;
        if (soNgayThueTB < KietDomainConstants.PolicyConfig.SoNgayThueToiThieu && danhSachSoNgay.Count > 0)
            soNgayThueTB = KietDomainConstants.PolicyConfig.SoNgayThueToiThieu;

        // 4. Tính tỷ lệ quay vòng = Tổng lượt thuê thiết bị / Tổng thiết bị
        int tongLuotThueThietBi = await _context.PhanCongThietBis
            .AsNoTracking()
            .Where(pc => pc.ThoiDiemPhanCong >= tuNgay && pc.ThoiDiemPhanCong <= denNgay && pc.TrangThai != KietDomainConstants.PhieuStatus.DaHuy)
            .CountAsync();

        double tyLeQuayVong = tongThietBi > 0 
            ? Math.Round((double)tongLuotThueThietBi / tongThietBi, KietDomainConstants.PolicyConfig.SoChuSoThapPhanLamTron) 
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
                SoHong = g.Count(x => x.KetLuan == KietDomainConstants.KetLuanKiemTra.HongNhe || x.KetLuan == KietDomainConstants.KetLuanKiemTra.HongNang),
                SoMat = g.Count(x => x.KetLuan == KietDomainConstants.KetLuanKiemTra.MatThietBi)
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
