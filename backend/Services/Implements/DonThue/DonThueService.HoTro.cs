using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.KhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class DonThueService
{
    private async Task<Result<(decimal TongGiam, Models.Entities.KhuyenMai? KhuyenMai, KiemTraMaResult? ChiTiet)>>
        KiemTraVaApDungKhuyenMaiAsync(TaoDonThueRequest request, Dictionary<long, SanPham> sanPhams, int soNgayThue)
    {
        if (string.IsNullOrWhiteSpace(request.MaKhuyenMai))
            return Result<(decimal, Models.Entities.KhuyenMai?, KiemTraMaResult?)>.Ok((0m, null, null));

        try
        {
            var kmItems = request.ChiTiet.Select(item =>
            {
                var sp = sanPhams[item.MaSanPham];
                return new DongBaoGiaItem
                {
                    MaSanPham = item.MaSanPham, MaDanhMuc = sp.MaDanhMuc, SoLuong = item.SoLuong,
                    DonGiaThueMoiNgay = sp.GiaThueMoiNgay, SoNgay = soNgayThue,
                    TienCocDong = sp.MucCocMoiThietBi * item.SoLuong
                };
            }).ToList();

            var kqKmChiTiet = await _khuyenMaiService.KiemTraApDungChiTietAsync(request.MaKhuyenMai, request.MaKhachHang, kmItems);
            if (!kqKmChiTiet.HopLe)
                return Result<(decimal, Models.Entities.KhuyenMai?, KiemTraMaResult?)>.Loi(
                    "KHUYEN_MAI_KHONG_HOP_LE", kqKmChiTiet.LyDoKhongHopLe ?? "Mã giảm giá không hợp lệ");

            var khuyenMaiApDung = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == kqKmChiTiet.MaKhuyenMai);
            return Result<(decimal, Models.Entities.KhuyenMai?, KiemTraMaResult?)>.Ok((kqKmChiTiet.TongGiamGia, khuyenMaiApDung, kqKmChiTiet));
        }
        catch (KhuyenMaiKhongHopLeException ex)
        {
            return Result<(decimal, Models.Entities.KhuyenMai?, KiemTraMaResult?)>.Loi(DomainConstants.Errors.InvalidPromotion, ex.Message);
        }
    }

    private static Result<DonThueResponse>? KiemTraBaoGiaThayDoi(
        TaoDonThueRequest request, Dictionary<long, SanPham> sanPhams, int soNgayThue,
        decimal tongTienThueTruocGiam, decimal tongTienGiam, decimal tongTienCoc)
    {
        if (request.DongYThayDoiGia) return null;

        var tongTienThueSauGiam = Math.Max(0m, tongTienThueTruocGiam - tongTienGiam);
        var tongThanhToanDuKien = tongTienThueSauGiam + tongTienCoc;
        var hashBaoGiaMoi = TaoHashBaoGia(request, sanPhams, soNgayThue, tongTienThueTruocGiam, tongTienGiam, tongTienCoc);

        bool giaThayDoi = request.GiaTamTinhKyVong.HasValue && Math.Abs(request.GiaTamTinhKyVong.Value - tongThanhToanDuKien) > 0.01m;
        bool hashThayDoi = !string.IsNullOrWhiteSpace(request.HashBaoGia)
            && !string.Equals(request.HashBaoGia.Trim(), hashBaoGiaMoi, StringComparison.OrdinalIgnoreCase);

        if (!giaThayDoi && !hashThayDoi) return null;

        return Result<DonThueResponse>.Loi(
            "BAO_GIA_THAY_DOI",
            $"Giá thuê hoặc ưu đãi đã thay đổi (tổng mới: {tongThanhToanDuKien:N0} đ). Vui lòng xác nhận báo giá mới.",
            new
            {
                SoNgayThue = soNgayThue, TongTienThueTruocGiam = tongTienThueTruocGiam,
                TongTienGiam = tongTienGiam, TongTienThueSauGiam = tongTienThueSauGiam,
                TongTienCoc = tongTienCoc, TongThanhToanDuKien = tongThanhToanDuKien, HashBaoGia = hashBaoGiaMoi
            });
    }

    private async Task LuuChiTietVaDonGioHangAsync(
        Models.Entities.DonThue donThueMoi, TaoDonThueRequest request, Dictionary<long, SanPham> sanPhams,
        int soNgayThue, decimal tongTienGiam, Models.Entities.KhuyenMai? khuyenMaiApDung, KiemTraMaResult? kqKmChiTiet,
        DateTime now, DateTime hanThanhToan)
    {
        var mapGiamDong = kqKmChiTiet?.PhanBoCacDong.ToDictionary(p => p.MaSanPham, p => p.TienGiam) ?? new Dictionary<long, decimal>();
        foreach (var item in request.ChiTiet)
        {
            var sp = sanPhams[item.MaSanPham];
            decimal tienGiamDong = mapGiamDong.TryGetValue(item.MaSanPham, out var g) ? g : 0;
            var chiTiet = ChiTietDonThue.KhoiTao(donThueMoi.MaDonThue, sp, item.SoLuong, soNgayThue, tienGiamDong);
            _context.ChiTietDonThues.Add(chiTiet);
            _context.GiuChos.Add(chiTiet.TaoGiuCho(now, hanThanhToan));
        }

        if (khuyenMaiApDung != null)
        {
            await _khuyenMaiService.GiuLuotV2Async(new GiuLuotCommand
            {
                MaKhuyenMai = khuyenMaiApDung.MaKhuyenMai, MaDonThue = donThueMoi.MaDonThue,
                MaKhachHang = request.MaKhachHang, ThoiDiemHetHan = hanThanhToan, SoTienGiamSnapshot = tongTienGiam
            });
        }

        AuditLogHelper.GhiLichSuDon(_context, donThueMoi.MaDonThue, null, "KhoiTao",
            TrangThaiDonThue.ChoThanhToan.ToString(), "Khách hàng tạo đơn thuê thành công", now);

        var gioThue = await _context.GioThues.Include(g => g.ChiTietGioThues)
            .FirstOrDefaultAsync(g => g.MaKhachHang == request.MaKhachHang);
        if (gioThue != null && gioThue.ChiTietGioThues.Any())
        {
            _context.ChiTietGioThues.RemoveRange(gioThue.ChiTietGioThues);
            gioThue.MaKhuyenMai = null;
        }
    }

    private static string TaoHashBaoGia(
        TaoDonThueRequest request, Dictionary<long, SanPham> sanPhams, int soNgayThue,
        decimal tongTienThueTruocGiam, decimal tongTienGiam, decimal tongTienCoc)
    {
        var itemsPart = string.Join("|", request.ChiTiet.OrderBy(c => c.MaSanPham).Select(c =>
        {
            var sp = sanPhams[c.MaSanPham];
            return $"{c.MaSanPham}:{c.SoLuong}:{sp.GiaThueMoiNgay:F2}:{sp.MucCocMoiThietBi:F2}";
        }));
        var raw = $"{soNgayThue}|{tongTienThueTruocGiam:F2}|{tongTienGiam:F2}|{tongTienCoc:F2}|{request.MaKhuyenMai?.Trim().ToUpperInvariant() ?? ""}|{itemsPart}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
    }
}
