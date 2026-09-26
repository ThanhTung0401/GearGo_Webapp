using GearGo.Data;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class ThanhToanService : IThanhToanService
{
    private readonly ApplicationDbContext _context;

    public ThanhToanService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // 1. Tìm đơn thuê
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                .ThenInclude(c => c.GiuCho)
                .FirstOrDefaultAsync(d => d.MaDonThue == request.MaDonThue);

            if (donThue == null)
                return Result<string>.Loi("DON_THUE_NOT_FOUND", "Không tìm thấy đơn thuê.");

            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
                return Result<string>.Loi("INVALID_STATE",
                    "Đơn thuê không ở trạng thái Chờ thanh toán.");

            // 2. Tạo bản ghi Thanh toán theo đúng chuẩn thuộc tính ERD (ma_yeu_cau, tong_so_tien, phuong_thuc, ma_giao_dich_cong)
            var maYeuCau = $"PAY_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";
            var thanhToanMoi = new Models.Entities.ThanhToan
            {
                MaDonThue = donThue.MaDonThue,
                MaYeuCau = maYeuCau,
                PhuongThuc = request.PhuongThucThanhToan,
                TongSoTien = request.SoTienDaTra,
                MaGiaoDichCong = request.MaGiaoDichDoiTac,
                TrangThai = "ThanhCong",
                ThoiDiemTao = DateTime.UtcNow,
                ThoiDiemThanhCong = DateTime.UtcNow
            };
            _context.ThanhToans.Add(thanhToanMoi);

            // 3. Cập nhật trạng thái Đơn Thuê
            donThue.TrangThai = TrangThaiDonThue.DaXacNhan;

            // 4. Cập nhật trạng thái Giữ Chỗ thành Đã Xác Nhận
            foreach (var chiTiet in donThue.ChiTietDonThues)
            {
                if (chiTiet.GiuCho != null)
                {
                    chiTiet.GiuCho.TrangThai = TrangThaiGiuCho.DaXacNhan;
                }
            }

            // 5. Lưu vào Lịch sử đơn
            var lichSu = new Models.Entities.LichSuTrangThaiDon
            {
                MaDonThue = donThue.MaDonThue,
                TrangThaiTruoc = TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiSau = TrangThaiDonThue.DaXacNhan.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Khách hàng đã thanh toán qua {request.PhuongThucThanhToan}"
            };
            _context.LichSuTrangThaiDons.Add(lichSu);

            // 6. Lưu toàn bộ vào DB và Commit
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<string>.Ok(thanhToanMoi.MaYeuCau);
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<string>.Loi("SYS_ERROR", $"Lỗi hệ thống: {e.Message}");
        }
    }
}
