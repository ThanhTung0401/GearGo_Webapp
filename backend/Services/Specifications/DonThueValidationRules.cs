using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Services.Specifications;

public static class DonThueValidationRules
{
    public static Result<bool> KiemTraThoiGianVaGioHang(TaoDonThueRequest request)
    {
        if (request.ChiTiet == null || request.ChiTiet.Count == 0)
            return Result<bool>.Loi("GIO_HANG_RONG", "Đơn thuê phải có ít nhất 1 sản phẩm.");

        if (request.GioTraDuKien <= request.GioNhanDuKien)
            return Result<bool>.Loi("THOI_GIAN_KHONG_HOP_LE", "Thời gian trả phải sau thời gian nhận.");

        if (request.GioNhanDuKien < DateTime.UtcNow.AddMinutes(-5))
            return Result<bool>.Loi("THOI_GIAN_QUA_KHU", "Không thể đặt thuê với thời gian bắt đầu trong quá khứ.");

        return Result<bool>.Ok(true);
    }

    public static Result<bool> KiemTraSanPhamVaKhaDung(
        TaoDonThueRequest request,
        Dictionary<long, SanPham> sanPhams,
        Dictionary<long, int>? khaDungData = null)
    {
        foreach (var item in request.ChiTiet)
        {
            if (!sanPhams.TryGetValue(item.MaSanPham, out var sp))
                return Result<bool>.Loi("SAN_PHAM_NOT_FOUND", $"Không tìm thấy sản phẩm #{item.MaSanPham}");

            if (sp.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh)
                return Result<bool>.Loi("SAN_PHAM_NGUNG_KINH_DOANH",
                    $"Sản phẩm '{sp.TenSanPham}' hiện đang tạm ngừng hoặc ngừng kinh doanh.");

            if (item.SoLuong <= 0)
                return Result<bool>.Loi("SO_LUONG_KHONG_HOP_LE", "Số lượng thuê phải lớn hơn 0.");

            if (khaDungData != null)
            {
                if (!khaDungData.TryGetValue(item.MaSanPham, out var slKhaDung) || slKhaDung < item.SoLuong)
                {
                    return Result<bool>.Loi("HET_HANG",
                        $"Sản phẩm '{sp.TenSanPham}' không đủ số lượng khả dụng trong khoảng thời gian đã chọn.");
                }
            }
        }

        return Result<bool>.Ok(true);
    }
}
