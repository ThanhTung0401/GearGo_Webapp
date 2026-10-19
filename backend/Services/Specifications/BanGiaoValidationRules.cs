using GearGo.Helpers;
using GearGo.Models.Common;

namespace GearGo.Services.Specifications;

public static class BanGiaoValidationRules
{
    /// <summary>
    /// Kiểm tra điều kiện đơn thuê đã hoàn tất nghĩa vụ thanh toán trước khi bàn giao
    /// </summary>
    public static Result<bool> KiemTraThanhToan(decimal tongTienYeuCau, decimal tongDaDong)
    {
        if (tongDaDong < tongTienYeuCau)
        {
            return Result<bool>.Loi(KietDomainConstants.ErrorCodes.ChuaThanhToanDu,
                $"Đơn thuê này chưa thanh toán đủ. Yêu cầu: {tongTienYeuCau}, Đã đóng: {tongDaDong}");
        }

        return Result<bool>.Ok(true);
    }
}
