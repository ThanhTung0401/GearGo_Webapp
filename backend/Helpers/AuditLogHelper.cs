using GearGo.Data;
using GearGo.Models.Entities;

namespace GearGo.Helpers;

public static class AuditLogHelper
{
    public static void GhiLichSuDon(
        ApplicationDbContext context,
        long maDonThue,
        long? maTaiKhoan,
        string? trangThaiTruoc,
        string? trangThaiSau,
        string? lyDo,
        DateTime? thoiDiem = null)
    {
        context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
        {
            MaDonThue = maDonThue,
            MaNguoiThucHien = maTaiKhoan,
            TrangThaiTruoc = trangThaiTruoc ?? string.Empty,
            TrangThaiSau = trangThaiSau ?? string.Empty,
            ThoiDiem = thoiDiem ?? DateTime.UtcNow,
            LyDo = lyDo
        });
    }

    public static void GhiLichSuThietBi(
        ApplicationDbContext context,
        long maThietBi,
        long? maTaiKhoan,
        string? trangThaiTruoc,
        string? trangThaiSau,
        string? tinhTrangTruoc,
        string? tinhTrangSau,
        string? lyDo,
        DateTime? thoiDiem = null)
    {
        context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
        {
            MaThietBi = maThietBi,
            MaNguoiThucHien = maTaiKhoan,
            TrangThaiTruoc = trangThaiTruoc,
            TrangThaiSau = trangThaiSau,
            TinhTrangTruoc = tinhTrangTruoc,
            TinhTrangSau = tinhTrangSau,
            ThoiDiem = thoiDiem ?? DateTime.UtcNow,
            LyDo = lyDo
        });
    }
}
