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
                if (pdc.LoaiDieuChinh == "SaiGiaNhap" && !string.IsNullOrEmpty(ct.GiaTriTruoc) && !string.IsNullOrEmpty(ct.GiaTriSau))
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

                        // Tìm số lượng tương ứng của dòng nhập
                        int slDong = 1;
                        if (ct.MaChiTietPhieuNhap.HasValue)
                        {
                            var ctpn = phieuNhap.ChiTietPhieuNhaps.FirstOrDefault(c => c.MaChiTietPhieuNhap == ct.MaChiTietPhieuNhap.Value);
                            if (ctpn != null) slDong = ctpn.SoLuong;
                        }

                        deltaGiaTriPhieu += (giaSau - giaTruoc) * slDong;
                    }
                    catch { }
                }
                else if (pdc.LoaiDieuChinh == "KhaiBaoThieuThietBi")
                {
                    deltaSoLuongPhieu += 1;
                    if (ct.MaChiTietPhieuNhap.HasValue)
                    {
                        var ctpn = phieuNhap.ChiTietPhieuNhaps.FirstOrDefault(c => c.MaChiTietPhieuNhap == ct.MaChiTietPhieuNhap.Value);
                        if (ctpn != null) deltaGiaTriPhieu += ctpn.DonGiaNhap;
                    }
                }
                else if (pdc.LoaiDieuChinh == "KhaiBaoTrungSaiThietBi")
                {
                    deltaSoLuongPhieu -= 1;
                    if (ct.MaChiTietPhieuNhap.HasValue)
                    {
                        var ctpn = phieuNhap.ChiTietPhieuNhaps.FirstOrDefault(c => c.MaChiTietPhieuNhap == ct.MaChiTietPhieuNhap.Value);
                        if (ctpn != null) deltaGiaTriPhieu -= ctpn.DonGiaNhap;
                    }
                }
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
}
