using System.Data;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.TaiChinh;

/// <summary>
/// Dịch vụ thanh toán, thu bổ sung đối soát và đối chiếu ngoại lệ (W4-T5, W4-T8).
/// </summary>
public partial class ThanhToanService : IThanhToanService
{
    private readonly ApplicationDbContext _context;
    private readonly IHoanTienService? _hoanTienService;
    private readonly IThongBaoService? _thongBaoService;
    private readonly IKhuyenMaiService? _khuyenMaiService;
    private readonly ILogger<ThanhToanService> _logger;

    public ThanhToanService(
        ApplicationDbContext context,
        ILogger<ThanhToanService>? logger = null,
        IHoanTienService? hoanTienService = null,
        IThongBaoService? thongBaoService = null,
        IKhuyenMaiService? khuyenMaiService = null)
    {
        _context = context;
        _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<ThanhToanService>.Instance;
        _hoanTienService = hoanTienService;
        _thongBaoService = thongBaoService;
        _khuyenMaiService = khuyenMaiService;
    }

    public async Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request, long? actorId = null)
    {
        // Kiểm tra nhanh quyền sở hữu khi có actorId (UC5.1 bước 1)
        if (actorId.HasValue)
        {
            var tk = await _context.TaiKhoans.AsNoTracking().FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId.Value);
            if (tk != null && tk.VaiTro == "KhachHang")
            {
                var khId = await _context.KhachHangs.AsNoTracking()
                    .Where(k => k.MaTaiKhoan == actorId.Value).Select(k => k.MaKhachHang).FirstOrDefaultAsync();
                var donOwner = await _context.DonThues.AsNoTracking()
                    .Where(d => d.MaDonThue == request.MaDonThue).Select(d => (long?)d.MaKhachHang).FirstOrDefaultAsync();
                if (donOwner.HasValue && donOwner.Value != khId)
                    return Result<string>.Loi("KHONG_CO_QUYEN", "Bạn không có quyền thanh toán cho đơn thuê của khách hàng khác.");
            }
        }

        // Lưu lại sự cố tiền về sau hết hạn/hủy ngoài transaction bị rollback để không mất dấu vết tiền thật (UC5.1 dòng phụ 5.1)
        ThanhToan? latePaymentToRecord = null;
        string? lateOrderStatus = null;

        var txResult = await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            if (!string.IsNullOrWhiteSpace(request.MaGiaoDichDoiTac))
            {
                var giaoDichCu = await _context.ThanhToans.AsNoTracking().FirstOrDefaultAsync(t =>
                    t.MaDonThue == request.MaDonThue && t.MaGiaoDichCong == request.MaGiaoDichDoiTac
                    && t.TrangThai == DomainConstants.Status.Success);
                if (giaoDichCu != null) return Result<string>.Ok(giaoDichCu.MaYeuCau);
            }

            var donThue = await _context.DonThues.Include(d => d.ChiTietDonThues).ThenInclude(c => c.GiuCho)
                .Include(d => d.LuotSuDungKhuyenMai).FirstOrDefaultAsync(d => d.MaDonThue == request.MaDonThue);
            if (donThue == null)
                return Result<string>.Loi(DomainConstants.Errors.OrderRentalNotFound, "Không tìm thấy đơn thuê.");

            var now = DateTime.UtcNow;
            var thanhToanMoi = TaoThanhToanBanDau(donThue, request, now);

            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
            {
                thanhToanMoi.TrangThaiDoiChieu = DomainConstants.Status.ReconcileNeeded;
                thanhToanMoi.GhiChu = $"Giao dịch thu tiền khi đơn đang ở trạng thái {donThue.TrangThai} — cần đối soát/hoàn tiền.";
                latePaymentToRecord = thanhToanMoi;
                lateOrderStatus = donThue.TrangThai.ToString();
                _logger.LogWarning("Phát sinh giao dịch cần đối soát #{MaYeuCau} cho đơn #{MaDonThue} (Trạng thái đơn: {TrangThai}).",
                    thanhToanMoi.MaYeuCau, donThue.MaDonThue, donThue.TrangThai);
                return Result<string>.Loi("TRANG_THAI_KHONG_HOP_LE", $"Đơn hàng không ở trạng thái chờ thanh toán ({donThue.TrangThai}).");
            }

            // Đối chiếu số tiền thanh toán nếu client/cổng gửi kèm SoTienDaTra (UC5.1 dòng phụ 4.3)
            var tongCanThu = donThue.ChiTietDonThues.Any()
                ? donThue.ChiTietDonThues.Sum(c =>
                    (c.DonGiaThueMoiNgay * c.SoNgayTinhTien + c.MucCocMoiThietBi) * c.SoLuong - c.TienGiam)
                : (donThue.TongTienThueTruocGiam - donThue.TongTienGiam + donThue.TongTienCoc);
            if (request.SoTienDaTra > 0 && tongCanThu > 0 && Math.Abs(request.SoTienDaTra - tongCanThu) > 1m)
            {
                thanhToanMoi.TrangThaiDoiChieu = DomainConstants.Status.ReconcileNeeded;
                thanhToanMoi.GhiChu = $"Sai lệch số tiền thanh toán: nhận {request.SoTienDaTra:N0}đ / cần thu {tongCanThu:N0}đ.";
                latePaymentToRecord = thanhToanMoi;
                return Result<string>.Loi("SO_TIEN_GATEWAY_KHONG_KHOP", $"Số tiền thanh toán ({request.SoTienDaTra:N0}đ) không khớp tổng cần thu ({tongCanThu:N0}đ).");
            }

            _context.ThanhToans.Add(thanhToanMoi);
            donThue.XacNhanThanhToan();

            if (donThue.LuotSuDungKhuyenMai?.TrangThai == DomainConstants.Status.Holding)
            {
                donThue.LuotSuDungKhuyenMai.TrangThai = DomainConstants.Status.Used;
                donThue.LuotSuDungKhuyenMai.ThoiDiemSuDung = now;
            }
            if (_khuyenMaiService != null) await _khuyenMaiService.XacNhanDaSuDungAsync(donThue.MaDonThue);

            AuditLogHelper.GhiLichSuDon(_context, donThue.MaDonThue, actorId,
                TrangThaiDonThue.ChoThanhToan.ToString(), TrangThaiDonThue.DaXacNhan.ToString(),
                $"Khách hàng đã thanh toán qua {request.PhuongThucThanhToan}", now);

            return Result<string>.Ok(thanhToanMoi.MaYeuCau);
        }, _logger, IsolationLevel.Serializable);

        // Ghi bền vững giao dịch bất thường + yêu cầu hoàn tiền nếu đơn đã hết hạn/hủy (không bị rollback)
        if (!txResult.ThanhCong && latePaymentToRecord != null)
        {
            try
            {
                _context.ThanhToans.Add(latePaymentToRecord);
                await _context.SaveChangesAsync();

                if (lateOrderStatus != null && latePaymentToRecord.TongSoTien > 0)
                {
                    var chiTietGoc = latePaymentToRecord.ChiTietThanhToans.FirstOrDefault();
                    if (chiTietGoc != null && chiTietGoc.MaChiTietThanhToan > 0)
                    {
                        _context.HoanTiens.Add(new HoanTien
                        {
                            MaChiTietThanhToanGoc = chiTietGoc.MaChiTietThanhToan,
                            LoaiHoan = "ThanhToanMuon",
                            SoTien = latePaymentToRecord.TongSoTien,
                            LyDo = $"Tiền về sau khi đơn ở trạng thái {lateOrderStatus}",
                            TrangThai = "ChoXuLy",
                            MaYeuCau = $"HT-LATE-{Guid.NewGuid():N}"[..24],
                            ThoiDiemYeuCau = DateTime.UtcNow,
                            GhiChu = $"Tự động lập yêu cầu hoàn cho giao dịch #{latePaymentToRecord.MaYeuCau}."
                        });
                        await _context.SaveChangesAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không thể ghi nhận giao dịch cần đối chiếu cho đơn #{MaDonThue}", request.MaDonThue);
            }
        }

        return txResult;
    }

    public async Task<Result<YeuCauThuResponse>> LayTrangThaiGiaoDichAsync(string maYeuCau, long actorId)
    {
        var tt = await _context.ThanhToans.Include(t => t.ChiTietThanhToans).FirstOrDefaultAsync(t => t.MaYeuCau == maYeuCau);
        if (tt == null)
            return Result<YeuCauThuResponse>.Loi(DomainConstants.Errors.TransactionNotFound, "Không tìm thấy giao dịch.");

        var chiTiet = tt.ChiTietThanhToans.FirstOrDefault();
        return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
        {
            MaThanhToan = tt.MaThanhToan, MaYeuCau = tt.MaYeuCau, SoTien = tt.TongSoTien,
            MucDich = chiTiet?.MucDich ?? "", TrangThai = tt.TrangThai,
            PaymentUrl = tt.TrangThai == DomainConstants.Status.PendingPayment ? $"https://mock-gateway.geargo.vn/pay?id={tt.MaYeuCau}" : null,
            CanDoiChieu = tt.TrangThaiDoiChieu is DomainConstants.Status.VerificationNeeded or DomainConstants.Status.ReconcileNeeded
        });
    }

    public async Task<Result<List<GiaoDichCanDoiChieuResponse>>> LayDanhSachCanDoiChieuAsync(long actorId)
    {
        var list = await _context.ThanhToans
            .Where(t => t.TrangThaiDoiChieu == "CanDoiChieu" || t.TrangThai == "ChuaRoKetQua")
            .OrderByDescending(t => t.ThoiDiemTao)
            .Select(t => new GiaoDichCanDoiChieuResponse
            {
                MaThanhToan = t.MaThanhToan, MaYeuCau = t.MaYeuCau, MaDonThue = t.MaDonThue,
                TongSoTien = t.TongSoTien, PhuongThuc = t.PhuongThuc, TrangThai = t.TrangThai,
                TrangThaiDoiChieu = t.TrangThaiDoiChieu, LyDoCanDoiChieu = t.GhiChu, ThoiDiemTao = t.ThoiDiemTao
            }).ToListAsync();
        return Result<List<GiaoDichCanDoiChieuResponse>>.Ok(list);
    }

    private static ThanhToan TaoThanhToanBanDau(Models.Entities.DonThue donThue, XacNhanThanhToanRequest request, DateTime now)
    {
        var tt = new ThanhToan
        {
            MaDonThue = donThue.MaDonThue, MaYeuCau = DisplayCodeHelper.SinhMaYeuCauThanhToan(now),
            PhuongThuc = request.PhuongThucThanhToan, TongSoTien = request.SoTienDaTra,
            MaGiaoDichCong = request.MaGiaoDichDoiTac, TrangThai = DomainConstants.Status.Success,
            ThoiDiemTao = now, ThoiDiemThanhCong = now
        };
        tt.ChiTietThanhToans.Add(new ChiTietThanhToan
        {
            MucDich = DomainConstants.TransactionPurposes.RentFee,
            SoTien = Math.Max(0, donThue.TongTienThueTruocGiam - donThue.TongTienGiam), ThanhToan = tt
        });
        tt.ChiTietThanhToans.Add(new ChiTietThanhToan
        {
            MucDich = DomainConstants.TransactionPurposes.DepositFee,
            SoTien = Math.Max(0, donThue.TongTienCoc), ThanhToan = tt
        });
        return tt;
    }
}
