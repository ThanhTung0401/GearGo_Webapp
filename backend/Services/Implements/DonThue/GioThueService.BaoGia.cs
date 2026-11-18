using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.GioThue;
using GearGo.Models.DTOs.KhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Services.Implements.DonThue;

public partial class GioThueService
{
    // Chuẩn hóa danh sách dòng giỏ thuê sang DTO kiểm tra khuyến mãi
    private static List<DongBaoGiaItem> TaoDanhSachKhuyenMaiItems(GioThue gio)
    {
        int soNgayThue = CalculationHelpers.TinhSoNgayThue(gio.GioNhanDuKien!.Value, gio.GioTraDuKien!.Value);
        return gio.ChiTietGioThues.Select(c => new DongBaoGiaItem
        {
            MaSanPham = c.MaSanPham,
            MaDanhMuc = c.SanPham?.MaDanhMuc,
            SoLuong = c.SoLuong,
            DonGiaThueMoiNgay = c.SanPham?.GiaThueMoiNgay ?? 0,
            SoNgay = soNgayThue,
            TienCocDong = (c.SanPham?.MucCocMoiThietBi ?? 0) * c.SoLuong
        }).ToList();
    }

    // Kiểm tra lại mã khuyến mãi đang gắn; tự động gỡ bỏ nếu giỏ không còn thỏa điều kiện
    private async Task<decimal> TinhTienGiamKhuyenMaiAsync(GioThue gio, GioThueResponse response)
    {
        if (gio.KhuyenMai == null) return 0;

        var kqKm = await _khuyenMaiService.KiemTraApDungChiTietAsync(
            gio.KhuyenMai.MaGiamGia, gio.MaKhachHang, TaoDanhSachKhuyenMaiItems(gio));
        if (kqKm.HopLe) return kqKm.TongGiamGia;

        gio.MaKhuyenMai = null;
        await _context.SaveChangesAsync();
        response.MaKhuyenMaiApDung = null;
        return 0;
    }

    private async Task<GioThueResponse> BuildResponseAsync(GioThue gio)
    {
        var response = new GioThueResponse
        {
            MaGioThue = gio.MaGioThue,
            GioNhanDuKien = gio.GioNhanDuKien,
            GioTraDuKien = gio.GioTraDuKien,
            MaKhuyenMaiApDung = gio.KhuyenMai?.MaGiamGia
        };

        if (gio.GioNhanDuKien == null || gio.GioTraDuKien == null || !gio.ChiTietGioThues.Any())
            return response;

        var danhSachDong = gio.ChiTietGioThues.Select(c => new ChiTietBaoGiaRequest
        {
            MaSanPham = c.MaSanPham,
            SoLuong = c.SoLuong,
            DonGiaThueMoiNgay = c.SanPham.GiaThueMoiNgay,
            MucCocMoiThietBi = c.SanPham.MucCocMoiThietBi
        }).ToList();

        decimal tienGiam = await TinhTienGiamKhuyenMaiAsync(gio, response);
        var baoGia = _baoGiaService.TinhBaoGia(gio.GioNhanDuKien.Value, gio.GioTraDuKien.Value, danhSachDong, tienGiam);
        response.BaoGia = baoGia;

        var spIds = gio.ChiTietGioThues.Select(c => c.MaSanPham).Distinct().ToList();
        var khaDungMap = await _khaDungService.LayKhaDungNhieuAsync(spIds, gio.GioNhanDuKien.Value, gio.GioTraDuKien.Value);

        foreach (var ct in gio.ChiTietGioThues)
        {
            var ctBaoGia = baoGia.ChiTiet.First(x => x.MaSanPham == ct.MaSanPham);
            response.ChiTiet.Add(new ChiTietGioThueResponse
            {
                MaChiTietGio = ct.MaChiTietGio,
                MaSanPham = ct.MaSanPham,
                TenSanPham = ct.SanPham.TenSanPham,
                SoLuong = ct.SoLuong,
                DonGiaThueMoiNgay = ct.SanPham.GiaThueMoiNgay,
                MucCocMoiThietBi = ct.SanPham.MucCocMoiThietBi,
                TienThue = ctBaoGia.TienThue,
                TienCoc = ctBaoGia.TienCoc,
                TienGiam = ctBaoGia.TienGiam,
                NgungKinhDoanh = ct.SanPham.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh,
                SoLuongKhaDung = khaDungMap.TryGetValue(ct.MaSanPham, out var soKhaDung) ? soKhaDung : 0
            });
        }
        return response;
    }

    public async Task<GioThueResponse> ApMaKhuyenMaiAsync(long maKhachHang, ApKhuyenMaiRequest req)
    {
        var gio = await GetOrCreateGioAsync(maKhachHang);
        if (string.IsNullOrWhiteSpace(req.MaGiamGia))
            return await BoMaKhuyenMaiAsync(maKhachHang);

        if (gio.GioNhanDuKien == null || gio.GioTraDuKien == null || !gio.ChiTietGioThues.Any())
            throw new DuLieuKhongHopLeException("GIO_HANG_CHUA_DAY_DU", "Vui lòng chọn thời gian thuê và có ít nhất 1 sản phẩm trước khi áp mã.");

        var checkKm = await _khuyenMaiService.KiemTraApDungChiTietAsync(
            req.MaGiamGia, gio.MaKhachHang, TaoDanhSachKhuyenMaiItems(gio));
        if (!checkKm.HopLe)
            throw new DuLieuKhongHopLeException("MA_GIAM_GIA_KHONG_HOP_LE", checkKm.LyDoKhongHopLe ?? "Mã giảm giá không hợp lệ");

        gio.MaKhuyenMai = checkKm.MaKhuyenMai;
        gio.NgayCapNhat = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await BuildResponseAsync(gio);
    }

    public async Task<GioThueResponse> BoMaKhuyenMaiAsync(long maKhachHang)
    {
        var gio = await GetOrCreateGioAsync(maKhachHang);
        gio.MaKhuyenMai = null;
        gio.NgayCapNhat = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await BuildResponseAsync(gio);
    }
}
