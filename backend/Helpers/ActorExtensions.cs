using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.Entities;

namespace GearGo.Helpers;

public static class ActorExtensions
{
    /// <summary>
    /// Kiểm tra và lấy thông tin nhân viên theo Actor ID.
    /// Nếu không tìm thấy, trả về lỗi chuẩn NHAN_VIEN_NOT_FOUND.
    /// </summary>
    public static async Task<Result<NhanVien>> LayNhanVienHopLeAsync(
        this ApplicationDbContext context, long actorId)
    {
        var nhanVien = await context.LayNhanVienAsync(actorId);
        if (nhanVien == null)
        {
            return Result<NhanVien>.Loi(
                DomainConstants.Errors.StaffNotFound,
                "Không tìm thấy thông tin nhân viên thao tác.");
        }
        return Result<NhanVien>.Ok(nhanVien);
    }
}
