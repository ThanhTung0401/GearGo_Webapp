using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.DieuChinhKho;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Queries;

/// <summary>
/// Helper truy vấn và tính toán giá trị nhập hiệu lực sau chuỗi điều chỉnh (W5-T5 - Minh Tú)
/// Đảm bảo tính nhất quán giữa kho, chi tiết phiếu nhập và báo cáo Tuần 6
/// </summary>
public static class GiaTriNhapHieuLucQuery
{
    public static async Task<GiaTriNhapHieuLucResponse> TinhGiaTriHieuLucPhieuNhapAsync(
        ApplicationDbContext context,
        long maPhieuNhap)
    {
        var phieuNhap = await context.PhieuNhapHangs
            .AsNoTracking()
            .Include(p => p.ChiTietPhieuNhaps)
            .FirstOrDefaultAsync(p => p.MaPhieuNhap == maPhieuNhap);

        if (phieuNhap == null)
            return new GiaTriNhapHieuLucResponse { MaPhieuNhap = maPhieuNhap };

        decimal tongTienGoc = phieuNhap.TongTien;
        int tongSoLuongGoc = phieuNhap.ChiTietPhieuNhaps.Sum(ct => ct.SoLuong);

        // Lấy tất cả các phiếu điều chỉnh liên quan ĐÃ ĐƯỢC ÁP DỤNG (DaApDung)
        var phieuDieuChinhs = await context.PhieuDieuChinhKhos
            .AsNoTracking()
            .Include(p => p.ChiTietDieuChinhKhos)
            .Where(p => p.MaPhieuNhapLienQuan == maPhieuNhap && p.TrangThai == DomainConstants.Status.Applied)
            .OrderBy(p => p.ThoiDiemApDung ?? p.ThoiDiemLap)
            .ToListAsync();

        decimal tongChenhLechGiaTri = 0;
        int tongChenhLechSoLuong = 0;
        var chuoiLichSu = new List<LichSuDieuChinhNhapDto>();

        foreach (var pdc in phieuDieuChinhs)
        {
            decimal deltaGiaTriPhieu = 0;
            int deltaSoLuongPhieu = 0;

            foreach (var ct in pdc.ChiTietDieuChinhKhos)
            {
                var (dGiaTri, dSoLuong) = TinhDeltaChiTiet(pdc.LoaiDieuChinh, ct, phieuNhap.ChiTietPhieuNhaps);
                deltaGiaTriPhieu += dGiaTri;
                deltaSoLuongPhieu += dSoLuong;
            }

            tongChenhLechGiaTri += deltaGiaTriPhieu;
            tongChenhLechSoLuong += deltaSoLuongPhieu;

            chuoiLichSu.Add(new LichSuDieuChinhNhapDto
            {
                MaPhieuDieuChinh = pdc.MaPhieuDieuChinh,
                LoaiDieuChinh = pdc.LoaiDieuChinh ?? "",
                ChenhLechGiaTri = deltaGiaTriPhieu,
                ChenhLechSoLuong = deltaSoLuongPhieu,
                ThoiDiemApDung = pdc.ThoiDiemApDung ?? pdc.ThoiDiemLap,
                NguoiDuyet = pdc.TenNguoiDuyetLucDuyet
            });
        }

        return new GiaTriNhapHieuLucResponse
        {
            MaPhieuNhap = maPhieuNhap,
            TongTienGoc = tongTienGoc,
            TongSoLuongGoc = tongSoLuongGoc,
            TongChenhLechGiaTri = tongChenhLechGiaTri,
            TongChenhLechSoLuong = tongChenhLechSoLuong,
            TongTienHieuLuc = tongTienGoc + tongChenhLechGiaTri,
            TongSoLuongHieuLuc = tongSoLuongGoc + tongChenhLechSoLuong,
            ChuoiDieuChinhDaApDung = chuoiLichSu
        };
    }

    /// <summary>
    /// Delta (giá trị, số lượng) của MỘT chi tiết điều chỉnh đã áp dụng so với giá trị hiệu lực ngay trước đó.
    /// Nguồn duy nhất của công thức delta — dùng chung cho kho (Tuần 5) và báo cáo nhập hàng (Tuần 6).
    /// </summary>
    public static (decimal GiaTri, int SoLuong) TinhDeltaChiTiet(
        string? loaiDieuChinh,
        ChiTietDieuChinhKho ct,
        IEnumerable<ChiTietPhieuNhap> dongNhap)
    {
        ChiTietPhieuNhap? Tim() => ct.MaChiTietPhieuNhap.HasValue
            ? dongNhap.FirstOrDefault(c => c.MaChiTietPhieuNhap == ct.MaChiTietPhieuNhap.Value)
            : null;

        if (loaiDieuChinh == "SaiGiaNhap" && !string.IsNullOrEmpty(ct.GiaTriTruoc) && !string.IsNullOrEmpty(ct.GiaTriSau))
        {
            try
            {
                using var docTruoc = JsonDocument.Parse(ct.GiaTriTruoc);
                using var docSau = JsonDocument.Parse(ct.GiaTriSau);

                decimal giaTruoc = 0;
                if (docTruoc.RootElement.TryGetProperty("donGiaHieuLuc", out var gt) ||
                    docTruoc.RootElement.TryGetProperty("DonGiaHieuLuc", out gt) ||
                    docTruoc.RootElement.TryGetProperty("donGiaNhap", out gt) ||
                    docTruoc.RootElement.TryGetProperty("DonGiaNhap", out gt))
                {
                    giaTruoc = gt.GetDecimal();
                }

                decimal giaSau = 0;
                if (docSau.RootElement.TryGetProperty("donGiaHieuLuc", out var gs) ||
                    docSau.RootElement.TryGetProperty("DonGiaHieuLuc", out gs) ||
                    docSau.RootElement.TryGetProperty("donGiaNhap", out gs) ||
                    docSau.RootElement.TryGetProperty("DonGiaNhap", out gs))
                {
                    giaSau = gs.GetDecimal();
                }

                // Số lượng tương ứng của dòng nhập (mặc định 1 nếu không xác định dòng)
                int slDong = Tim()?.SoLuong ?? 1;
                return ((giaSau - giaTruoc) * slDong, 0);
            }
            catch
            {
                return (0, 0);
            }
        }

        if (loaiDieuChinh == "KhaiBaoThieuThietBi")
            return (Tim()?.DonGiaNhap ?? 0, 1);

        if (loaiDieuChinh == "KhaiBaoTrungSaiThietBi")
            return (-(Tim()?.DonGiaNhap ?? 0), -1);

        return (0, 0);
    }

    /// <summary>Delta của một chi tiết điều chỉnh đã áp dụng, gắn với phiếu điều chỉnh và dòng nhập bị tác động.</summary>
    public record DeltaDongNhap(
        long MaPhieuNhap,
        long MaPhieuDieuChinh,
        long? MaChiTietPhieuNhap,
        string LoaiDieuChinh,
        decimal GiaTri,
        int SoLuong,
        DateTime ThoiDiemApDung,
        string? NguoiDuyet);

    /// <summary>
    /// Lấy theo lô (không N+1) toàn bộ delta của các phiếu điều chỉnh ĐÃ ÁP DỤNG liên quan tới các phiếu nhập.
    /// Công thức delta lấy từ <see cref="TinhDeltaChiTiet"/>, nhất quán với <see cref="TinhGiaTriHieuLucPhieuNhapAsync"/>.
    /// </summary>
    public static async Task<List<DeltaDongNhap>> LayDeltaTheoDongAsync(
        ApplicationDbContext context,
        IReadOnlyCollection<long> maPhieuNhaps)
    {
        var ketQua = new List<DeltaDongNhap>();
        if (maPhieuNhaps.Count == 0) return ketQua;

        var ids = maPhieuNhaps.Distinct().ToList();

        var dongNhap = await context.ChiTietPhieuNhaps
            .AsNoTracking()
            .Where(c => ids.Contains(c.MaPhieuNhap))
            .ToListAsync();
        var dongTheoPhieu = dongNhap.ToLookup(c => c.MaPhieuNhap);

        var phieuDieuChinhs = await context.PhieuDieuChinhKhos
            .AsNoTracking()
            .Include(p => p.ChiTietDieuChinhKhos)
            .Where(p => p.MaPhieuNhapLienQuan != null
                        && ids.Contains(p.MaPhieuNhapLienQuan.Value)
                        && p.TrangThai == DomainConstants.Status.Applied)
            .ToListAsync();

        foreach (var pdc in phieuDieuChinhs.OrderBy(p => p.ThoiDiemApDung ?? p.ThoiDiemLap).ThenBy(p => p.MaPhieuDieuChinh))
        {
            var dong = dongTheoPhieu[pdc.MaPhieuNhapLienQuan!.Value].ToList();
            foreach (var ct in pdc.ChiTietDieuChinhKhos)
            {
                var (dGiaTri, dSoLuong) = TinhDeltaChiTiet(pdc.LoaiDieuChinh, ct, dong);
                ketQua.Add(new DeltaDongNhap(
                    pdc.MaPhieuNhapLienQuan.Value,
                    pdc.MaPhieuDieuChinh,
                    ct.MaChiTietPhieuNhap,
                    pdc.LoaiDieuChinh ?? "",
                    dGiaTri,
                    dSoLuong,
                    pdc.ThoiDiemApDung ?? pdc.ThoiDiemLap,
                    pdc.TenNguoiDuyetLucDuyet));
            }
        }

        return ketQua;
    }
}
