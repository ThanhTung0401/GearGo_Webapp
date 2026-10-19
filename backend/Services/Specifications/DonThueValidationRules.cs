using GearGo.Helpers;
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
            return Result<bool>.Loi(KietDomainConstants.ErrorCodes.GioHangRong, "Đơn thuê phải có ít nhất 1 sản phẩm.");

        if (request.GioTraDuKien <= request.GioNhanDuKien)
            return Result<bool>.Loi(KietDomainConstants.ErrorCodes.ThoiGianKhongHopLe, "Thời gian trả phải sau thời gian nhận.");

        if (request.GioNhanDuKien < DateTime.UtcNow.AddMinutes(-KietDomainConstants.PolicyConfig.DungSaiPhutThoiGianThuc))
            return Result<bool>.Loi(KietDomainConstants.ErrorCodes.ThoiGianQuaKhu, "Không thể đặt thuê với thời gian bắt đầu trong quá khứ.");

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
                return Result<bool>.Loi(KietDomainConstants.ErrorCodes.SanPhamNotFound, $"Không tìm thấy sản phẩm #{item.MaSanPham}");

            if (sp.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh)
                return Result<bool>.Loi(KietDomainConstants.ErrorCodes.SanPhamNgungKinhDoanh,
                    $"Sản phẩm '{sp.TenSanPham}' hiện đang tạm ngừng hoặc ngừng kinh doanh.");

            if (item.SoLuong <= 0)
                return Result<bool>.Loi(KietDomainConstants.ErrorCodes.SoLuongKhongHopLe, "Số lượng thuê phải lớn hơn 0.");

            if (khaDungData != null)
            {
                if (!khaDungData.TryGetValue(item.MaSanPham, out var slKhaDung) || slKhaDung < item.SoLuong)
                {
                    return Result<bool>.Loi(KietDomainConstants.ErrorCodes.HetHang,
                        $"Sản phẩm '{sp.TenSanPham}' không đủ số lượng khả dụng trong khoảng thời gian đã chọn.");
                }
            }
        }

        return Result<bool>.Ok(true);
    }
}
