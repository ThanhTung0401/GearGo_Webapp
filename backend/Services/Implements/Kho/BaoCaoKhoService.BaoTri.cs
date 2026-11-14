using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.Kho;
using GearGo.Models.DTOs.Kho;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

public partial class BaoCaoKhoService
{
    private sealed record BaoTriDong(
        long MaPhieuBaoTri, long MaThietBi, string LoaiXuLy, string TrangThai,
        decimal? ChiPhi, DateTime? NgayBatDau, DateTime? NgayHoanThanhThucTe,
        string MaThietBiHienThi, long MaSp, string TenSp);

    private async Task<Result<BaoTriThongKeResponse>> DungThongKeBaoTriAsync(
        LocBaoTriRequest filter, bool laAdmin, int topHayHong)
    {
        if (filter.MocLoc != MocLocBaoTri.NgayBatDau && filter.MocLoc != MocLocBaoTri.NgayHoanThanh)
        {
            return Result<BaoTriThongKeResponse>.Loi(
                DomainConstants.Errors.UnsupportedWarehouseReportMoment,
                $"Mốc lọc '{filter.MocLoc}' không hợp lệ. Dùng {MocLocBaoTri.NgayBatDau} hoặc {MocLocBaoTri.NgayHoanThanh}.");
        }

        if (filter.LoaiXuLy != null
            && filter.LoaiXuLy != DomainConstants.Maintenance.TypeCleaning
            && filter.LoaiXuLy != DomainConstants.Maintenance.TypeRepair)
        {
            return Result<BaoTriThongKeResponse>.Loi(
                DomainConstants.Errors.InvalidData,
                $"Loại xử lý '{filter.LoaiXuLy}' không hợp lệ. Dùng {DomainConstants.Maintenance.TypeCleaning} hoặc {DomainConstants.Maintenance.TypeRepair}.");
        }

        var kh = TinhKhoang(filter.TuNgay, filter.DenNgay);
        if (kh.Loi != null) return Result<BaoTriThongKeResponse>.Loi(DomainConstants.Errors.InvalidTime, kh.Loi);
        var k = kh.Khoang!;

        var query = _context.PhieuBaoTris.AsNoTracking().AsQueryable();
        query = filter.MocLoc == MocLocBaoTri.NgayBatDau
            ? query.Where(p => p.NgayBatDau != null && p.NgayBatDau >= k.TuUtc && p.NgayBatDau < k.DenUtc)
            : query.Where(p => p.NgayHoanThanhThucTe != null && p.NgayHoanThanhThucTe >= k.TuUtc && p.NgayHoanThanhThucTe < k.DenUtc);
        if (filter.LoaiXuLy != null)
            query = query.Where(p => p.LoaiXuLy == filter.LoaiXuLy);

        // Một dòng = một phiếu bảo trì; không JOIN qua lịch thuê để tránh nhân bản.
        var rows = await query.Select(p => new BaoTriDong(
            p.MaPhieuBaoTri, p.MaThietBi, p.LoaiXuLy ?? "", p.TrangThai, p.ChiPhi, p.NgayBatDau, p.NgayHoanThanhThucTe,
            p.ThietBi.MaThietBiHienThi, p.ThietBi.MaSanPhamHienTai, p.ThietBi.SanPhamHienTai.TenSanPham))
            .ToListAsync();

        bool Mo(string tt) => TrangThaiBaoTriDangMo.Contains(tt);
        bool DaKetLuan(string tt) => tt == DomainConstants.Status.Completed || tt == DomainConstants.Status.Failed;

        var res = new BaoTriThongKeResponse
        {
            Meta = TaoMeta(k,
                filter.MocLoc == MocLocBaoTri.NgayBatDau ? "PhieuBaoTri.NgayBatDau" : "PhieuBaoTri.NgayHoanThanhThucTe",
                "Vệ sinh và sửa chữa được tách riêng; chỉ sửa chữa mới được coi là đợt hỏng. Chi phí đang mở là dự kiến, chi phí đã chốt tính riêng; cả hai không phải phụ phí khách đã nộp."),
            MocLoc = filter.MocLoc,
            TongSoPhieu = rows.Count,
            SoPhieuVeSinh = rows.Count(r => r.LoaiXuLy == DomainConstants.Maintenance.TypeCleaning),
            SoPhieuSuaChua = rows.Count(r => r.LoaiXuLy == DomainConstants.Maintenance.TypeRepair),
            SoPhieuDangMo = rows.Count(r => Mo(r.TrangThai)),
            SoPhieuDat = rows.Count(r => r.TrangThai == DomainConstants.Status.Completed),
            SoPhieuKhongDat = rows.Count(r => r.TrangThai == DomainConstants.Status.Failed),
            ChiPhiDangXuLy = laAdmin ? rows.Where(r => Mo(r.TrangThai)).Sum(r => r.ChiPhi ?? 0m) : null,
            ChiPhiDaChot = laAdmin ? rows.Where(r => DaKetLuan(r.TrangThai)).Sum(r => r.ChiPhi ?? 0m) : null,
            ThietBiHayHong = await TaiThietBiHayHongAsync(rows, laAdmin, topHayHong)
        };

        return Result<BaoTriThongKeResponse>.Ok(res);
    }

    private async Task<List<ThietBiSuaChuaItem>> TaiThietBiHayHongAsync(
        List<BaoTriDong> rows, bool laAdmin, int topHayHong)
    {
        var nhomSua = rows.Where(r => r.LoaiXuLy == DomainConstants.Maintenance.TypeRepair)
            .GroupBy(r => r.MaThietBi)
            .Select(g => new
            {
                MaThietBi = g.Key,
                First = g.First(),
                SoDot = g.Count(),
                Gio = g.Where(x => x.NgayBatDau.HasValue && x.NgayHoanThanhThucTe.HasValue)
                       .Select(x => (x.NgayHoanThanhThucTe!.Value - x.NgayBatDau!.Value).TotalHours).ToList(),
                ChiPhi = g.Sum(x => x.ChiPhi ?? 0m)
            })
            .OrderByDescending(x => x.SoDot).ThenByDescending(x => x.ChiPhi).ThenBy(x => x.MaThietBi)
            .Take(topHayHong)
            .ToList();

        var thietBiIds = nhomSua.Select(x => x.MaThietBi).ToList();
        string[] daGiao = { DomainConstants.Status.Delivered, DomainConstants.Status.Finalized };
        var soLanThue = thietBiIds.Count == 0
            ? new Dictionary<long, int>()
            : (await _context.ChiTietBanGiaos.AsNoTracking()
                .Where(c => thietBiIds.Contains(c.PhanCongThietBi.MaThietBi) && daGiao.Contains(c.PhieuBanGiao.TrangThai))
                .GroupBy(c => c.PhanCongThietBi.MaThietBi)
                .Select(g => new { MaThietBi = g.Key, N = g.Count() })
                .ToListAsync()).ToDictionary(x => x.MaThietBi, x => x.N);

        return nhomSua.Select(x => new ThietBiSuaChuaItem
        {
            MaThietBi = x.MaThietBi,
            MaThietBiHienThi = x.First.MaThietBiHienThi,
            MaSanPhamHienTai = x.First.MaSp,
            TenSanPhamHienTai = x.First.TenSp,
            SoDotSuaChua = x.SoDot,
            SoLanThue = soLanThue.TryGetValue(x.MaThietBi, out var n) ? n : 0,
            TongGioXuLy = x.Gio.Count > 0 ? Math.Round(x.Gio.Sum(), 2) : null,
            TongChiPhiSua = laAdmin ? x.ChiPhi : null
        }).ToList();
    }

    private HienTrangKhoBaoCaoResponse AnhXaHienTrang(KhoTongQuanResponse tq, bool laAdmin) => new()
    {
        Meta = TaoMeta(null, "THIET_BI.trang_thai_su_dung (hiện tại)",
            "Số liệu kho hiện tại, nhóm theo sản phẩm hiện tại. Không dựng lại kho tại ngày quá khứ. Tổng hồ sơ lưu không phải tổng vật phẩm đang ở kho."),
        TongHoSo = tq.TongHoSoThietBi,
        DangKhaiThac = tq.TongHoSoThietBi - tq.ThatLac - tq.NgungSuDung,
        SanSang = tq.SanSangTaiKho,
        DangThue = tq.DangChoThue,
        DangBaoTri = tq.DangBaoTri,
        ThatLac = tq.ThatLac,
        NgungSuDung = tq.NgungSuDung,
        TongGiaTriNhap = laAdmin ? tq.TongGiaTriNhap : null,
        SanPham = tq.ChiTietSanPham.Select(s => new HienTrangKhoSanPhamItem
        {
            MaSanPhamHienTai = s.MaSanPham, TenSanPham = s.TenSanPham, TongHoSo = s.TongSo,
            DangKhaiThac = s.TongSo - s.ThatLac - s.NgungSuDung, SanSang = s.SanSang,
            DangThue = s.DangThue, DangBaoTri = s.BaoTri, ThatLac = s.ThatLac, NgungSuDung = s.NgungSuDung
        }).OrderBy(s => s.MaSanPhamHienTai).ToList()
    };
}
