using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.TuVan;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

public partial class TuVanAIService
{
    public async Task<bool> ThemBoDoVaoGioAsync(long maKhachHang, ThemBoDoRequest request, CancellationToken cancellationToken = default)
    {
        if (request.CacDong == null || !request.CacDong.Any())
            throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Danh sách sản phẩm thêm vào giỏ không được rỗng.");

        var trueKhId = await ActorGuard.LayMaKhachHangAsync(_context, maKhachHang, cancellationToken);
        var gio = await _context.GioThues.Include(g => g.ChiTietGioThues)
            .FirstOrDefaultAsync(g => g.MaKhachHang == trueKhId, cancellationToken);

        if (gio == null)
        {
            gio = new GioThue
            {
                MaKhachHang = trueKhId, NgayCapNhat = DateTime.UtcNow,
                GioNhanDuKien = request.GioNhan, GioTraDuKien = request.GioTra
            };
            _context.GioThues.Add(gio);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            DongBoThoiGianGio(gio, request);
        }

        if (gio.GioNhanDuKien.HasValue && gio.GioTraDuKien.HasValue)
            await KiemTraKhaDungBoDoAsync(gio, request.CacDong);

        foreach (var dong in request.CacDong)
        {
            var item = gio.ChiTietGioThues.FirstOrDefault(c => c.MaSanPham == dong.MaSanPham);
            if (item != null) item.SoLuong += dong.SoLuong;
            else gio.ChiTietGioThues.Add(new ChiTietGioThue { MaGioThue = gio.MaGioThue, MaSanPham = dong.MaSanPham, SoLuong = dong.SoLuong });
        }

        gio.NgayCapNhat = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void DongBoThoiGianGio(GioThue gio, ThemBoDoRequest request)
    {
        if (!request.GioNhan.HasValue || !request.GioTra.HasValue) return;

        if (gio.GioNhanDuKien.HasValue && gio.GioTraDuKien.HasValue)
        {
            bool isDifferent = gio.GioNhanDuKien.Value != request.GioNhan.Value || gio.GioTraDuKien.Value != request.GioTra.Value;
            // Nếu khách chọn giữ lịch hiện tại của giỏ thì không ghi đè GioNhanDuKien/GioTraDuKien (UC2.4.2)
            if (isDifferent && string.Equals(request.XuLyXungDotLich, "GiuHienTai", StringComparison.OrdinalIgnoreCase))
            {
                gio.NgayCapNhat = DateTime.UtcNow;
                return;
            }
            if (isDifferent && !string.Equals(request.XuLyXungDotLich, "ThayThe", StringComparison.OrdinalIgnoreCase))
            {
                throw new XungDotDuLieuException("NGAY_GIO_KHAC_GIO_HIEN_TAI",
                    "Thời gian thuê của bộ đồ khác với thời gian hiện tại trong giỏ hàng. Vui lòng xác nhận lựa chọn lịch chung.");
            }
        }

        gio.GioNhanDuKien = request.GioNhan;
        gio.GioTraDuKien = request.GioTra;
        gio.NgayCapNhat = DateTime.UtcNow;
    }

    private async Task KiemTraKhaDungBoDoAsync(GioThue gio, List<DongThemBoDoRequest> cacDong)
    {
        var productIds = cacDong.Select(d => d.MaSanPham).Distinct().ToList();
        var availability = await _khaDungService.LayKhaDungNhieuAsync(productIds, gio.GioNhanDuKien!.Value, gio.GioTraDuKien!.Value);

        foreach (var dong in cacDong)
        {
            var available = availability.TryGetValue(dong.MaSanPham, out var soLuong) ? soLuong : 0;
            var existingItem = gio.ChiTietGioThues.FirstOrDefault(c => c.MaSanPham == dong.MaSanPham);
            var tongCan = dong.SoLuong + (existingItem?.SoLuong ?? 0);

            if (available < tongCan)
            {
                throw new XungDotDuLieuException("BO_DO_KHONG_CON_PHU_HOP",
                    $"Sản phẩm mã {dong.MaSanPham} không còn đủ số lượng khả dụng (chỉ còn {available}, yêu cầu {tongCan}). Không thể thêm dở dang.");
            }
        }
    }
}
