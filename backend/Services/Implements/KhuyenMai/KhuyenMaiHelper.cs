using GearGo.Models.DTOs.QuanTriKhuyenMai;
using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Services.Implements.KhuyenMai;

internal static class KhuyenMaiHelper
{
    public static string ChuanHoaMa(string? ma) =>
        string.IsNullOrWhiteSpace(ma) ? string.Empty : ma.Trim().ToUpperInvariant();

    // Tính số tiền giảm dựa trên loại giảm, không vượt quá tiền thuê và mức trần
    public static decimal TinhTienGiam(GearGo.Models.Entities.KhuyenMai km, decimal tienApDung)
    {
        decimal giam = km.LoaiGiam == LoaiKhuyenMai.SoTien
            ? Math.Min(km.GiaTriGiam, tienApDung)
            : Math.Min(Math.Round(tienApDung * (km.GiaTriGiam / 100m), MidpointRounding.AwayFromZero), tienApDung);

        if (km.MucGiamToiDa.HasValue && giam > km.MucGiamToiDa.Value)
            giam = km.MucGiamToiDa.Value;

        return Math.Min(giam, tienApDung);
    }

    public static KhuyenMaiResponse MapResponse(
        GearGo.Models.Entities.KhuyenMai k,
        int daDung,
        int dangGiuConHan,
        int daGiaiPhong,
        List<long>? spIds = null,
        List<long>? dmIds = null) => new()
    {
        MaKhuyenMai = k.MaKhuyenMai,
        MaGiamGia = k.MaGiamGia,
        TenKhuyenMai = k.TenKhuyenMai,
        LoaiGiam = k.LoaiGiam,
        GiaTriGiam = k.GiaTriGiam,
        MucGiamToiDa = k.MucGiamToiDa,
        TienThueToiThieu = k.TienThueToiThieu,
        PhamVi = k.PhamVi,
        BatDau = k.BatDau,
        KetThuc = k.KetThuc,
        GioiHanTongLuot = k.GioiHanTongLuot,
        GioiHanMoiKhach = k.GioiHanMoiKhach,
        TrangThai = k.TrangThai,
        SanPhamIds = spIds ?? k.KhuyenMaiSanPhams.Select(sp => sp.MaSanPham).ToList(),
        DanhMucIds = dmIds ?? k.KhuyenMaiDanhMucs.Select(dm => dm.MaDanhMuc).ToList(),
        SoLuotDaDung = daDung,
        SoLuotDangGiuConHan = dangGiuConHan,
        SoLuotDaGiaiPhong = daGiaiPhong
    };
}
