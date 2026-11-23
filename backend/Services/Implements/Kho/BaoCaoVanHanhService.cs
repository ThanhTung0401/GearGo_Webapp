using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ báo cáo vận hành tổng quan và chỉ số khai thác theo sản phẩm.
/// </summary>
public class BaoCaoVanHanhService : IBaoCaoVanHanhService
{
    private readonly ApplicationDbContext _context;

    public BaoCaoVanHanhService(ApplicationDbContext context) => _context = context;

    public async Task<BaoCaoVanHanhChiTietResponse> LayBaoCaoVanHanhAsync(BoLocBaoCaoRequest filter)
    {
        // [REP-01]: Kiểm tra tuNgay > denNgay như BaoCaoTaiChinhService/BaoCaoKhoService đã làm.
        if (filter.TuNgay.HasValue && filter.DenNgay.HasValue && filter.TuNgay.Value > filter.DenNgay.Value)
            throw new ArgumentException("Khoảng ngày lọc không hợp lệ: Từ ngày phải <= Đến ngày.");

        var tuNgay = filter.TuNgay ?? DateTime.UtcNow.AddDays(-DomainConstants.Policies.DefaultReportDays);
        var denNgay = filter.DenNgay ?? DateTime.UtcNow;
        // [REP-01]: nếu denNgay là 00:00:00, mở rộng tới cuối ngày để không mất dữ liệu phát sinh
        // trong ngày cuối kỳ (vd lọc 1 ngày trả về 0 do so sánh <= 2026-11-23 00:00:00).
        if (filter.DenNgay.HasValue && filter.DenNgay.Value.TimeOfDay == TimeSpan.Zero)
            denNgay = filter.DenNgay.Value.Date.AddDays(1).AddTicks(-1);

        var tongQuan = await TinhTongQuanVanHanhAsync(tuNgay, denNgay);
        var chiSoSanPham = await TinhChiSoTheoSanPhamAsync(filter, tuNgay, denNgay);

        return new BaoCaoVanHanhChiTietResponse
        {
            TongQuan = tongQuan,
            ChiSoTheoSanPham = chiSoSanPham
        };
    }

    private async Task<TongQuanChiSoVanHanhResponse> TinhTongQuanVanHanhAsync(DateTime tuNgay, DateTime denNgay)
    {
        // Lấy thông tin ngày nhận và trả về client để tính khoảng ngày bằng C# (tránh DateDiffDay không tương thích in-memory/SQLite test)
        var danhSachDonRaw = await _context.DonThues.AsNoTracking()
            .Where(d => d.NgayDat >= tuNgay && d.NgayDat <= denNgay)
            .Select(d => new
            {
                d.TrangThai,
                d.GioNhanDuKien,
                d.GioTraDuKien
            }).ToListAsync();

        var danhSachDon = danhSachDonRaw.Select(d => new
        {
            d.TrangThai,
            SoNgay = Math.Max(0.0, (d.GioTraDuKien.Date - d.GioNhanDuKien.Date).TotalDays)
        }).ToList();

        int tongDon = danhSachDon.Count;
        // Tách riêng đơn hủy (KhachHuy/CuaHangHuy) khỏi đơn HetHan (UC10.1 / UC10.2)
        int tongDonHuy = danhSachDon.Count(d =>
            d.TrangThai is TrangThaiDonThue.KhachHuy or TrangThaiDonThue.CuaHangHuy);
        int tongDonThanhCong = danhSachDon.Count(d =>
            d.TrangThai is TrangThaiDonThue.HoanTat or TrangThaiDonThue.DangThue
                or TrangThaiDonThue.DaNhanTra or TrangThaiDonThue.ChoDoiSoat);

        var trangThaiThietBis = await _context.ThietBis.AsNoTracking().Select(t => t.TrangThaiSuDung).ToListAsync();
        int tongThietBi = trangThaiThietBis.Count;
        int soDangThue = trangThaiThietBis.Count(t => t == TrangThaiThietBi.DangThue);
        int soDangBaoTri = trangThaiThietBis.Count(t => t == TrangThaiThietBi.DangBaoTri);
        int soThatLac = trangThaiThietBis.Count(t => t == TrangThaiThietBi.ThatLac);

        var danhSachSoNgay = danhSachDon
            .Where(d => d.TrangThai != TrangThaiDonThue.KhachHuy && d.TrangThai != TrangThaiDonThue.CuaHangHuy && d.TrangThai != TrangThaiDonThue.HetHan)
            .Select(d => d.SoNgay).ToList();
        double soNgayThueTB = danhSachSoNgay.Count > 0 ? Math.Round(danhSachSoNgay.Average(), 1) : 0.0;
        if (soNgayThueTB < DomainConstants.Policies.MinRentalDays && danhSachSoNgay.Count > 0)
            soNgayThueTB = DomainConstants.Policies.MinRentalDays;

        int tongLuotThueThietBi = await _context.PhanCongThietBis.AsNoTracking()
            .Where(pc => pc.ThoiDiemPhanCong >= tuNgay && pc.ThoiDiemPhanCong <= denNgay && pc.TrangThai != DomainConstants.Status.Cancelled)
            .CountAsync();

        return new TongQuanChiSoVanHanhResponse
        {
            TongDonPhatSinh = tongDon,
            TongDonThanhCong = tongDonThanhCong,
            TongDonBiHuy = tongDonHuy,
            TyLeHuyDonPhanTram = CalculationHelpers.TinhPhanTram(tongDonHuy, tongDon),
            TongThietBiTrongKho = tongThietBi,
            SoThietBiDangChoThue = soDangThue,
            SoThietBiDangBaoTri = soDangBaoTri,
            SoThietBiThatLac = soThatLac,
            TyLeHaoMonPhanTram = CalculationHelpers.TinhPhanTram(soDangBaoTri + soThatLac, tongThietBi),
            SoNgayThueTrungBinh = soNgayThueTB,
            TyLeQuayVongThietBi = tongThietBi > 0 ? Math.Round((double)tongLuotThueThietBi / tongThietBi, DomainConstants.Policies.DecimalRoundingDigits) : 0.0
        };
    }

    private async Task<List<ChiSoSanPhamResponse>> TinhChiSoTheoSanPhamAsync(BoLocBaoCaoRequest filter, DateTime tuNgay, DateTime denNgay)
    {
        var sanPhamQuery = _context.SanPhams.AsNoTracking().Include(s => s.DanhMuc).Include(s => s.ThietBis).AsQueryable();
        if (filter.MaDanhMuc.HasValue) sanPhamQuery = sanPhamQuery.Where(s => s.MaDanhMuc == filter.MaDanhMuc.Value);
        if (filter.MaSanPham.HasValue) sanPhamQuery = sanPhamQuery.Where(s => s.MaSanPham == filter.MaSanPham.Value);
        var sanPhamList = await sanPhamQuery.ToListAsync();

        var chiTietStats = await _context.ChiTietDonThues.AsNoTracking()
            .Where(c => c.DonThue.NgayDat >= tuNgay && c.DonThue.NgayDat <= denNgay)
            .GroupBy(c => c.MaSanPham)
            .Select(g => new
            {
                MaSanPham = g.Key,
                SoLuotThue = g.Sum(c => c.SoLuong),
                TongDoanhThu = g.Sum(c => c.DonGiaThueMoiNgay * c.SoLuong * c.SoNgayTinhTien - c.TienGiam)
            }).ToDictionaryAsync(x => x.MaSanPham);

        var nhanTraStats = await _context.ChiTietNhanTras.AsNoTracking()
            .Where(ct => ct.PhieuNhanTra.ThoiDiemLap >= tuNgay && ct.PhieuNhanTra.ThoiDiemLap <= denNgay)
            .Select(ct => new { MaSanPham = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi.MaSanPhamHienTai, ct.KetLuan })
            .GroupBy(x => x.MaSanPham)
            .Select(g => new
            {
                MaSanPham = g.Key,
                SoHong = g.Count(x => x.KetLuan == DomainConstants.InspectionConclusions.MinorDamage || x.KetLuan == DomainConstants.InspectionConclusions.MajorDamage),
                SoMat = g.Count(x => x.KetLuan == DomainConstants.InspectionConclusions.Lost)
            }).ToDictionaryAsync(x => x.MaSanPham);

        return sanPhamList.Select(s =>
        {
            chiTietStats.TryGetValue(s.MaSanPham, out var stat);
            nhanTraStats.TryGetValue(s.MaSanPham, out var ntStat);
            return new ChiSoSanPhamResponse
            {
                MaSanPham = s.MaSanPham, TenSanPham = s.TenSanPham, TenDanhMuc = s.DanhMuc?.TenDanhMuc ?? "",
                TongSoThietBi = s.ThietBis.Count, SoLuotThue = stat?.SoLuotThue ?? 0,
                SoLuotHongHoc = ntStat?.SoHong ?? 0, SoLuotMat = ntStat?.SoMat ?? 0,
                TongDoanhThuUocTinh = stat?.TongDoanhThu ?? 0
            };
        }).OrderByDescending(s => s.SoLuotThue).ToList();
    }
}
