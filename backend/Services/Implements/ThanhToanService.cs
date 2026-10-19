using System.Data;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class ThanhToanService : IThanhToanService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ThanhToanService> _logger;

    public ThanhToanService(ApplicationDbContext context, ILogger<ThanhToanService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            // 1. Idempotency ưu tiên trước: nếu giao dịch đối tác cho đơn này đã được ghi nhận ThanhCong -> trả kết quả cũ ngay
            if (!string.IsNullOrWhiteSpace(request.MaGiaoDichDoiTac))
            {
                var giaoDichCu = await _context.ThanhToans
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.MaDonThue == request.MaDonThue
                                              && t.MaGiaoDichCong == request.MaGiaoDichDoiTac
                                              && t.TrangThai == KietDomainConstants.PhieuStatus.ThanhCong);

                if (giaoDichCu != null)
                {
                    return Result<string>.Ok(giaoDichCu.MaYeuCau);
                }
            }

            // 2. Tìm đơn thuê kèm Giữ chỗ và Lượt sử dụng khuyến mãi
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                    .ThenInclude(c => c.GiuCho)
                .Include(d => d.LuotSuDungKhuyenMai)
                .FirstOrDefaultAsync(d => d.MaDonThue == request.MaDonThue);

            if (donThue == null)
                return Result<string>.Loi(KietDomainConstants.ErrorCodes.DonThueNotFound, "Không tìm thấy đơn thuê.");

            var now = DateTime.UtcNow;
            var maYeuCau = DisplayCodeHelper.SinhMaYeuCauThanhToan(now);

            var thanhToanMoi = new ThanhToan
            {
                MaDonThue = donThue.MaDonThue,
                MaYeuCau = maYeuCau,
                PhuongThuc = request.PhuongThucThanhToan,
                TongSoTien = request.SoTienDaTra,
                MaGiaoDichCong = request.MaGiaoDichDoiTac,
                TrangThai = KietDomainConstants.PhieuStatus.ThanhCong,
                ThoiDiemTao = now,
                ThoiDiemThanhCong = now
            };

            // 3. Tách 2 dòng ChiTietThanhToan (TienThue và TienCoc) theo đặc tả UC06
            decimal tienThue = Math.Max(0, donThue.TongTienThueTruocGiam - donThue.TongTienGiam);
            decimal tienCoc = Math.Max(0, donThue.TongTienCoc);

            thanhToanMoi.ChiTietThanhToans.Add(new ChiTietThanhToan
            {
                MucDich = KietDomainConstants.MucDichGiaoDich.TienThue,
                SoTien = tienThue,
                ThanhToan = thanhToanMoi
            });

            thanhToanMoi.ChiTietThanhToans.Add(new ChiTietThanhToan
            {
                MucDich = KietDomainConstants.MucDichGiaoDich.TienCoc,
                SoTien = tienCoc,
                ThanhToan = thanhToanMoi
            });

            // 4. Kiểm tra nhánh đối soát nâng cao (UC06 mục 10.11):
            // Nếu đơn đã chuyển sang HetHan / KhachHuy / CuaHangHuy hoặc đã DaXacNhan bởi giao dịch khác mà tiền vẫn thu ở gateway
            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
            {
                thanhToanMoi.TrangThaiDoiChieu = KietDomainConstants.PhieuStatus.CanDoiSoat;
                thanhToanMoi.GhiChu = $"Giao dịch thu tiền khi đơn đang ở trạng thái {donThue.TrangThai} — cần đối soát/hoàn tiền.";
                _context.ThanhToans.Add(thanhToanMoi);

                _logger.LogWarning(
                    "Phát sinh giao dịch cần đối soát #{MaYeuCau} cho đơn #{MaDonThue} (Trạng thái đơn: {TrangThai}).",
                    maYeuCau, donThue.MaDonThue, donThue.TrangThai);

                return Result<string>.Ok(thanhToanMoi.MaYeuCau);
            }

            // 5. Luồng chuẩn: Đơn đang ChoThanhToan -> Xác nhận đơn + Giữ chỗ + Khuyến mãi + Lịch sử
            _context.ThanhToans.Add(thanhToanMoi);
            donThue.XacNhanThanhToan();

            if (donThue.LuotSuDungKhuyenMai != null && donThue.LuotSuDungKhuyenMai.TrangThai == KietDomainConstants.PhieuStatus.DangGiu)
            {
                donThue.LuotSuDungKhuyenMai.TrangThai = KietDomainConstants.PhieuStatus.DaSuDung;
                donThue.LuotSuDungKhuyenMai.ThoiDiemSuDung = now;
            }

            AuditLogHelper.GhiLichSuDon(
                _context,
                donThue.MaDonThue,
                null,
                TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiDonThue.DaXacNhan.ToString(),
                $"Khách hàng đã thanh toán qua {request.PhuongThucThanhToan}",
                now);

            return Result<string>.Ok(thanhToanMoi.MaYeuCau);
        }, _logger, IsolationLevel.Serializable);
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

            var maYeuCau = DisplayCodeHelper.SinhMaYeuCauThanhToan(DateTime.UtcNow);

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
        }, _logger);
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
                          || thanhToan.TrangThaiDoiChieu == KietDomainConstants.PhieuStatus.CanDoiSoat
        });
    }
}
