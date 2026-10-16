using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Specifications;

public static class NhanTraValidationRules
{
    /// <summary>
    /// Kiểm tra các quy tắc nghiệp vụ trước khi chốt phiếu nhận trả (Rule Engine)
    /// </summary>
    public static async Task<Result<bool>> KiemTraDieuKienChotAsync(PhieuNhanTra phieu, ApplicationDbContext context)
    {
        foreach (var ct in phieu.ChiTietNhanTras)
        {
            if (string.IsNullOrEmpty(ct.KetLuan))
                return Result<bool>.Loi("KET_LUAN_CHUA_DU", $"Thiết bị #{ct.MaChiTietBanGiao} chưa có kết luận kiểm tra.");

            if (ct.KetLuan == "MatThietBi")
            {
                if (!ct.ThoiDiemDuyetMat.HasValue || !ct.MaNguoiDuyetMat.HasValue)
                {
                    return Result<bool>.Loi("KET_LUAN_MAT_CHUA_DU",
                        $"Thiết bị #{ct.MaChiTietBanGiao} được báo mất nhưng chưa được Quản trị viên phê duyệt kết luận mất.");
                }

                bool coPhiDuyet = await context.PhuPhis.AnyAsync(p =>
                    p.MaChiTietBanGiao == ct.MaChiTietBanGiao &&
                    p.LoaiPhi == "MatThietBi" &&
                    p.TrangThaiDuyet == "DaDuyet");

                if (!coPhiDuyet)
                {
                    return Result<bool>.Loi("KET_LUAN_MAT_CHUA_DU",
                        $"Thiết bị #{ct.MaChiTietBanGiao} chưa có phụ phí bồi thường mất thiết bị được phê duyệt.");
                }
            }
            else
            {
                if (!ct.ThoiDiemTraThucTe.HasValue)
                {
                    ct.ThoiDiemTraThucTe = DateTime.UtcNow;
                }
            }
        }

        return Result<bool>.Ok(true);
    }
}
