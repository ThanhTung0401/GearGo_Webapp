using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Specifications;

public static class NhanTraValidationRules
{
    /// <summary>
    /// Kiểm tra tính hợp lệ của danh sách thiết bị nhận trả đầu vào
    /// </summary>
    public static Result<bool> KiemTraDanhSachNhanTra(IReadOnlyList<long>? danhSach)
    {
        if (danhSach == null || danhSach.Count == 0)
            return Result<bool>.Loi(DomainConstants.Errors.EmptyList, "Phải chọn ít nhất 1 thiết bị để nhận trả.");

        if (danhSach.Distinct().Count() != danhSach.Count)
            return Result<bool>.Loi(DomainConstants.Errors.DuplicateItems, "Danh sách thiết bị chọn bị trùng lặp.");

        return Result<bool>.Ok(true);
    }

    /// <summary>
    /// Kiểm tra tính hợp lệ của danh sách dòng tách chờ xử lý
    /// </summary>
    public static Result<bool> KiemTraTachDong(IReadOnlyList<long>? danhSach, int tongSoDongHienTai)
    {
        if (danhSach == null || danhSach.Count == 0)
            return Result<bool>.Loi(DomainConstants.Errors.EmptyList, "Phải chọn ít nhất 1 dòng để tách.");

        if (danhSach.Distinct().Count() != danhSach.Count)
            return Result<bool>.Loi(DomainConstants.Errors.DuplicateItems, "Danh sách dòng chọn bị trùng lặp.");

        if (danhSach.Count >= tongSoDongHienTai)
            return Result<bool>.Loi(DomainConstants.Errors.CannotSplitAll, "Không thể tách toàn bộ dòng. Phiếu gốc phải giữ lại ít nhất 1 dòng.");

        return Result<bool>.Ok(true);
    }

    /// <summary>
    /// Kiểm tra các quy tắc nghiệp vụ trước khi chốt phiếu nhận trả (Rule Engine)
    /// </summary>
    public static async Task<Result<bool>> KiemTraDieuKienChotAsync(PhieuNhanTra phieu, ApplicationDbContext context)
    {
        foreach (var ct in phieu.ChiTietNhanTras)
        {
            if (string.IsNullOrEmpty(ct.KetLuan))
                return Result<bool>.Loi(KietDomainConstants.ErrorCodes.KetLuanChuaDu, $"Thiết bị #{ct.MaChiTietBanGiao} chưa có kết luận kiểm tra.");

            if (ct.KetLuan == KietDomainConstants.KetLuanKiemTra.MatThietBi)
            {
                if (!ct.ThoiDiemDuyetMat.HasValue || !ct.MaNguoiDuyetMat.HasValue)
                {
                    return Result<bool>.Loi(KietDomainConstants.ErrorCodes.KetLuanMatChuaDu,
                        $"Thiết bị #{ct.MaChiTietBanGiao} được báo mất nhưng chưa được Quản trị viên phê duyệt kết luận mất.");
                }

                bool coPhiDuyet = await context.PhuPhis.AnyAsync(p =>
                    p.MaChiTietBanGiao == ct.MaChiTietBanGiao &&
                    p.LoaiPhi == KietDomainConstants.KetLuanKiemTra.MatThietBi &&
                    p.TrangThaiDuyet == KietDomainConstants.PhieuStatus.DaDuyet);

                if (!coPhiDuyet)
                {
                    return Result<bool>.Loi(KietDomainConstants.ErrorCodes.KetLuanMatChuaDu,
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
