using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

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

    /// <summary>
    /// Kiểm tra và lấy nhân viên hợp lệ (còn làm việc, tài khoản còn hoạt động).
    /// Giúp loại bỏ boilerplate lặp lại tại các Service của Tuấn Kiệt.
    /// </summary>
    public static async Task<Result<NhanVien>> LayNhanVienDangHoatDongAsync(
        this ApplicationDbContext context,
        long actorId)
    {
        var nv = await context.NhanViens
            .Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaTaiKhoan == actorId || n.MaNhanVien == actorId);

        if (nv == null)
        {
            return Result<NhanVien>.Loi(
                DomainConstants.Errors.StaffNotFound,
                "Không tìm thấy hồ sơ nhân viên thực hiện.");
        }

        if (nv.TrangThaiLamViec != DomainConstants.StaffStatus.Working ||
            (nv.TaiKhoan != null && nv.TaiKhoan.TrangThai != DomainConstants.AccountStatus.Active))
        {
            return Result<NhanVien>.Loi(
                DomainConstants.Errors.StaffResigned,
                "Nhân viên đã nghỉ việc hoặc tài khoản đã bị tạm khóa.");
        }

        return Result<NhanVien>.Ok(nv);
    }
}
