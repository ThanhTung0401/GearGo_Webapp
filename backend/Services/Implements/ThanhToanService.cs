using GearGo.Data;
using GearGo.Helpers;
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
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            // 1. Tìm đơn thuê
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                    .ThenInclude(c => c.GiuCho)
                .FirstOrDefaultAsync(d => d.MaDonThue == request.MaDonThue);

            if (donThue == null)
                return Result<string>.Loi(KietDomainConstants.ErrorCodes.DonThueNotFound, "Không tìm thấy đơn thuê.");

            // 2. Tạo bản ghi Thanh toán theo đúng chuẩn thuộc tính ERD
            var maYeuCau = $"PAY_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";
            var thanhToanMoi = new Models.Entities.ThanhToan
            {
                MaDonThue = donThue.MaDonThue,
                MaYeuCau = maYeuCau,
                PhuongThuc = request.PhuongThucThanhToan,
                TongSoTien = request.SoTienDaTra,
                MaGiaoDichCong = request.MaGiaoDichDoiTac,
                TrangThai = KietDomainConstants.PhieuStatus.ThanhCong,
                ThoiDiemTao = DateTime.UtcNow,
                ThoiDiemThanhCong = DateTime.UtcNow
            };
            _context.ThanhToans.Add(thanhToanMoi);

            // 3. Xác nhận thanh toán
            donThue.XacNhanThanhToan();

            // 4. Lưu vào Lịch sử đơn
            var lichSu = new Models.Entities.LichSuTrangThaiDon
            {
                MaDonThue = donThue.MaDonThue,
                TrangThaiTruoc = TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiSau = TrangThaiDonThue.DaXacNhan.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = $"Khách hàng đã thanh toán qua {request.PhuongThucThanhToan}"
            };
            _context.LichSuTrangThaiDons.Add(lichSu);

            return Result<string>.Ok(thanhToanMoi.MaYeuCau);
        });
    }

    public async Task<Result<YeuCauThuResponse>> TaoThuBoSungAsync(TaoThuBoSungRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            // Kiểm tra đối soát
            var doiSoat = await _context.Set<Models.Entities.DoiSoatTienCoc>()
                .Include(ds => ds.DonThue)
                .FirstOrDefaultAsync(ds => ds.MaDoiSoat == request.MaDoiSoat);

            if (doiSoat == null)
                return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.DoiSoatNotFound, "Không tìm thấy bảng đối soát.");

            if (doiSoat.SoTienCanThuThem <= 0)
                return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.KhongCoNghiaVuThuThem, "Bảng tính không thiếu hoặc chưa được xác nhận.");

            // Kiểm tra xem đã có giao dịch nào đang chờ cho đối soát này chưa
            var existingThanhToan = await _context.ThanhToans
                .FirstOrDefaultAsync(t => t.MaDonThue == doiSoat.MaDonThue
                                          && t.TrangThai == KietDomainConstants.PhieuStatus.ChoThanhToan
                                          && t.GhiChu != null
                                          && t.GhiChu.Contains(request.MaDoiSoat.ToString()));

            if (existingThanhToan != null)
                return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.ThuThemDangCho, "Đã có yêu cầu thu bổ sung đang chờ xử lý.");

            var maYeuCau = $"PAY_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";

            var thanhToanMoi = new Models.Entities.ThanhToan
            {
                MaDonThue = doiSoat.MaDonThue,
                MaYeuCau = maYeuCau,
                PhuongThuc = request.PhuongThucDuocHoTro,
                TongSoTien = doiSoat.SoTienCanThuThem,
                TrangThai = KietDomainConstants.PhieuStatus.ChoThanhToan,
                ThoiDiemTao = DateTime.UtcNow,
                GhiChu = $"ThuBoSung_DoiSoat_{request.MaDoiSoat}"
            };

            var chiTietThanhToan = new Models.Entities.ChiTietThanhToan
            {
                MucDich = KietDomainConstants.MucDichGiaoDich.ThuBoSung,
                SoTien = doiSoat.SoTienCanThuThem,
                ThanhToan = thanhToanMoi
            };

            thanhToanMoi.ChiTietThanhToans.Add(chiTietThanhToan);
            _context.ThanhToans.Add(thanhToanMoi);

            await _context.SaveChangesAsync();

            return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
            {
                MaThanhToan = thanhToanMoi.MaThanhToan,
                MaYeuCau = maYeuCau,
                SoTien = doiSoat.SoTienCanThuThem,
                MucDich = KietDomainConstants.MucDichGiaoDich.ThuBoSung,
                TrangThai = KietDomainConstants.PhieuStatus.ChoThanhToan,
                PaymentUrl = "https://mock-gateway.com/pay?id=" + maYeuCau,
                CanDoiChieu = false
            });
        });
    }

    public async Task<Result<YeuCauThuResponse>> LayTrangThaiGiaoDichAsync(string maYeuCau, long actorId)
    {
        var thanhToan = await _context.ThanhToans
            .Include(t => t.ChiTietThanhToans)
            .FirstOrDefaultAsync(t => t.MaYeuCau == maYeuCau);

        if (thanhToan == null)
            return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.GiaoDichNotFound, "Không tìm thấy giao dịch.");

        var chiTiet = thanhToan.ChiTietThanhToans.FirstOrDefault();

        return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
        {
            MaThanhToan = thanhToan.MaThanhToan,
            MaYeuCau = thanhToan.MaYeuCau,
            SoTien = thanhToan.TongSoTien,
            MucDich = chiTiet?.MucDich ?? "",
            TrangThai = thanhToan.TrangThai,
            CanDoiChieu = thanhToan.TrangThaiDoiChieu == KietDomainConstants.PhieuStatus.CanDoiChieu
        });
    }
}
