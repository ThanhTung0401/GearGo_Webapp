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

            // 3. Xác nhận thanh toán
            donThue.XacNhanThanhToan();

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

    public async Task<Result<YeuCauThuResponse>> TaoThuBoSungAsync(TaoThuBoSungRequest request, long actorId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Kiểm tra đối soát
            var doiSoat = await _context.Set<Models.Entities.DoiSoatTienCoc>()
                .Include(ds => ds.DonThue)
                .FirstOrDefaultAsync(ds => ds.MaDoiSoat == request.MaDoiSoat);

            if (doiSoat == null)
                return Result<YeuCauThuResponse>.Loi("DOI_SOAT_NOT_FOUND", "Không tìm thấy bảng đối soát.");

            if (doiSoat.SoTienCanThuThem <= 0)
                return Result<YeuCauThuResponse>.Loi("KHONG_CO_NGHIA_VU_THU_THEM", "Bảng tính không thiếu hoặc chưa được xác nhận.");

            // Kiểm tra xem đã có giao dịch nào đang chờ cho đối soát này chưa (mock logic: kiểm tra ThanhToan qua Metadata)
            var existingThanhToan = await _context.ThanhToans
                .FirstOrDefaultAsync(t => t.MaDonThue == doiSoat.MaDonThue && t.TrangThai == "ChoThanhToan" && t.GhiChu != null && t.GhiChu.Contains(request.MaDoiSoat.ToString()));

            if (existingThanhToan != null)
                return Result<YeuCauThuResponse>.Loi("THU_THEM_DANG_CHO", "Đã có yêu cầu thu bổ sung đang chờ xử lý.");

            var maYeuCau = $"PAY_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";

            var thanhToanMoi = new Models.Entities.ThanhToan
            {
                MaDonThue = doiSoat.MaDonThue,
                MaYeuCau = maYeuCau,
                PhuongThuc = request.PhuongThucDuocHoTro,
                TongSoTien = doiSoat.SoTienCanThuThem,
                TrangThai = "ChoThanhToan",
                ThoiDiemTao = DateTime.UtcNow,
                GhiChu = $"ThuBoSung_DoiSoat_{request.MaDoiSoat}" // Metadata tạm thời
            };

            var chiTietThanhToan = new Models.Entities.ChiTietThanhToan
            {
                MucDich = "ThuBoSung",
                SoTien = doiSoat.SoTienCanThuThem,
                ThanhToan = thanhToanMoi
            };
            
            thanhToanMoi.ChiTietThanhToans.Add(chiTietThanhToan);
            _context.ThanhToans.Add(thanhToanMoi);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
            {
                MaThanhToan = thanhToanMoi.MaThanhToan,
                MaYeuCau = maYeuCau,
                SoTien = doiSoat.SoTienCanThuThem,
                MucDich = "ThuBoSung",
                TrangThai = "ChoThanhToan",
                PaymentUrl = "https://mock-gateway.com/pay?id=" + maYeuCau,
                CanDoiChieu = false
            });
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<YeuCauThuResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống: {e.Message}");
        }
    }

    public async Task<Result<YeuCauThuResponse>> LayTrangThaiGiaoDichAsync(string maYeuCau, long actorId)
    {
        var thanhToan = await _context.ThanhToans
            .Include(t => t.ChiTietThanhToans)
            .FirstOrDefaultAsync(t => t.MaYeuCau == maYeuCau);

        if (thanhToan == null)
            return Result<YeuCauThuResponse>.Loi("GIAO_DICH_NOT_FOUND", "Không tìm thấy giao dịch.");

        var chiTiet = thanhToan.ChiTietThanhToans.FirstOrDefault();

        return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
        {
            MaThanhToan = thanhToan.MaThanhToan,
            MaYeuCau = thanhToan.MaYeuCau,
            SoTien = thanhToan.TongSoTien,
            MucDich = chiTiet?.MucDich ?? "",
            TrangThai = thanhToan.TrangThai,
            CanDoiChieu = thanhToan.TrangThaiDoiChieu == "CanDoiChieu"
        });
    }
}
