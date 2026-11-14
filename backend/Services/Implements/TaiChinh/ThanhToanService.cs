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

    public async Task<Result<string>> XacNhanThanhToanAsync(XacNhanThanhToanRequest request)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            if (!string.IsNullOrWhiteSpace(request.MaGiaoDichDoiTac))
            {
                var giaoDichCu = await _context.ThanhToans.AsNoTracking().FirstOrDefaultAsync(t =>
                    t.MaDonThue == request.MaDonThue && t.MaGiaoDichCong == request.MaGiaoDichDoiTac
                    && t.TrangThai == KietDomainConstants.PhieuStatus.ThanhCong);
                if (giaoDichCu != null) return Result<string>.Ok(giaoDichCu.MaYeuCau);
            }

            var donThue = await _context.DonThues.Include(d => d.ChiTietDonThues).ThenInclude(c => c.GiuCho)
                .Include(d => d.LuotSuDungKhuyenMai).FirstOrDefaultAsync(d => d.MaDonThue == request.MaDonThue);
            if (donThue == null)
                return Result<string>.Loi(KietDomainConstants.ErrorCodes.DonThueNotFound, "Không tìm thấy đơn thuê.");

            var now = DateTime.UtcNow;
            var thanhToanMoi = TaoThanhToanBanDau(donThue, request, now);

            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
            {
                thanhToanMoi.TrangThaiDoiChieu = KietDomainConstants.PhieuStatus.CanDoiSoat;
                thanhToanMoi.GhiChu = $"Giao dịch thu tiền khi đơn đang ở trạng thái {donThue.TrangThai} — cần đối soát/hoàn tiền.";
                _context.ThanhToans.Add(thanhToanMoi);
                _logger.LogWarning("Phát sinh giao dịch cần đối soát #{MaYeuCau} cho đơn #{MaDonThue} (Trạng thái đơn: {TrangThai}).",
                    thanhToanMoi.MaYeuCau, donThue.MaDonThue, donThue.TrangThai);
                return Result<string>.Loi("TRANG_THAI_KHONG_HOP_LE", $"Đơn hàng không ở trạng thái chờ thanh toán ({donThue.TrangThai}).");
            }

            _context.ThanhToans.Add(thanhToanMoi);
            donThue.XacNhanThanhToan();

            if (donThue.LuotSuDungKhuyenMai?.TrangThai == KietDomainConstants.PhieuStatus.DangGiu)
            {
                donThue.LuotSuDungKhuyenMai.TrangThai = KietDomainConstants.PhieuStatus.DaSuDung;
                donThue.LuotSuDungKhuyenMai.ThoiDiemSuDung = now;
            }
            if (_khuyenMaiService != null) await _khuyenMaiService.XacNhanDaSuDungAsync(donThue.MaDonThue);

            AuditLogHelper.GhiLichSuDon(_context, donThue.MaDonThue, null,
                TrangThaiDonThue.ChoThanhToan.ToString(), TrangThaiDonThue.DaXacNhan.ToString(),
                $"Khách hàng đã thanh toán qua {request.PhuongThucThanhToan}", now);

            return Result<string>.Ok(thanhToanMoi.MaYeuCau);
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<YeuCauThuResponse>> LayTrangThaiGiaoDichAsync(string maYeuCau, long actorId)
    {
        var tt = await _context.ThanhToans.Include(t => t.ChiTietThanhToans).FirstOrDefaultAsync(t => t.MaYeuCau == maYeuCau);
        if (tt == null)
            return Result<YeuCauThuResponse>.Loi(KietDomainConstants.ErrorCodes.GiaoDichNotFound, "Không tìm thấy giao dịch.");

        var chiTiet = tt.ChiTietThanhToans.FirstOrDefault();
        return Result<YeuCauThuResponse>.Ok(new YeuCauThuResponse
        {
            MaThanhToan = tt.MaThanhToan, MaYeuCau = tt.MaYeuCau, SoTien = tt.TongSoTien,
            MucDich = chiTiet?.MucDich ?? "", TrangThai = tt.TrangThai,
            PaymentUrl = tt.TrangThai == KietDomainConstants.PhieuStatus.ChoThanhToan ? $"https://mock-gateway.geargo.vn/pay?id={tt.MaYeuCau}" : null,
            CanDoiChieu = tt.TrangThaiDoiChieu is KietDomainConstants.PhieuStatus.CanDoiChieu or KietDomainConstants.PhieuStatus.CanDoiSoat
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
            MaGiaoDichCong = request.MaGiaoDichDoiTac, TrangThai = KietDomainConstants.PhieuStatus.ThanhCong,
            ThoiDiemTao = now, ThoiDiemThanhCong = now
        };
        tt.ChiTietThanhToans.Add(new ChiTietThanhToan
        {
            MucDich = KietDomainConstants.MucDichGiaoDich.TienThue,
            SoTien = Math.Max(0, donThue.TongTienThueTruocGiam - donThue.TongTienGiam), ThanhToan = tt
        });
        tt.ChiTietThanhToans.Add(new ChiTietThanhToan
        {
            MucDich = KietDomainConstants.MucDichGiaoDich.TienCoc,
            SoTien = Math.Max(0, donThue.TongTienCoc), ThanhToan = tt
        });
        return tt;
    }
}
