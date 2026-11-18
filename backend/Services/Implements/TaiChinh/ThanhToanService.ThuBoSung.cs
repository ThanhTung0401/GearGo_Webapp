using System.Text.RegularExpressions;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.TaiChinh;

public partial class ThanhToanService
{
    public async Task<Result<YeuCauThuResponse>> TaoThuBoSungAsync(TaoThuBoSungRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var doiSoat = await _context.DoiSoatTienCocs.Include(ds => ds.DonThue)
                .FirstOrDefaultAsync(ds => ds.MaDoiSoat == request.MaDoiSoat);
            if (doiSoat == null)
                return Result<YeuCauThuResponse>.Loi(DomainConstants.Errors.ReconciliationNotFound, "Không tìm thấy bảng đối soát.");

            var errQuyen = await KiemTraQuyenThuBoSungAsync(doiSoat.DonThue.MaKhachHang, actorId);
            if (errQuyen != null) return errQuyen;

            if (doiSoat.SoTienCanThuThem <= 0)
                return Result<YeuCauThuResponse>.Loi(DomainConstants.Errors.NoSupplementaryDuty, "Bảng tính không thiếu hoặc chưa được xác nhận.");

            var existing = await _context.ThanhToans.Include(t => t.ChiTietThanhToans)
                .FirstOrDefaultAsync(t => t.MaDonThue == doiSoat.MaDonThue
                    && (t.TrangThai == DomainConstants.Status.PendingPayment || t.TrangThai == DomainConstants.Status.Success)
                    && t.GhiChu != null && t.GhiChu.Contains($"DoiSoat_{request.MaDoiSoat}"));
            if (existing != null)
                return Result<YeuCauThuResponse>.Ok(MapYeuCauThuResponse(existing, existing.ChiTietThanhToans.FirstOrDefault()?.MucDich));

            var now = DateTime.UtcNow;
            var maYeuCau = DisplayCodeHelper.SinhMaYeuCauThanhToan(now);
            var thanhToanMoi = new ThanhToan
            {
                MaDonThue = doiSoat.MaDonThue, MaYeuCau = maYeuCau,
                PhuongThuc = string.IsNullOrEmpty(request.PhuongThucDuocHoTro) ? "VNPAY" : request.PhuongThucDuocHoTro,
                TongSoTien = doiSoat.SoTienCanThuThem, TrangThai = DomainConstants.Status.PendingPayment,
                TrangThaiDoiChieu = "ChuaDoiChieu", ThoiDiemTao = now, GhiChu = $"ThuBoSung_DoiSoat_{request.MaDoiSoat}"
            };
            thanhToanMoi.ChiTietThanhToans.Add(new ChiTietThanhToan
            {
                MucDich = DomainConstants.TransactionPurposes.SupplementaryFee,
                SoTien = doiSoat.SoTienCanThuThem, ThanhToan = thanhToanMoi
            });
            _context.ThanhToans.Add(thanhToanMoi);
            await _context.SaveChangesAsync();

            return Result<YeuCauThuResponse>.Ok(MapYeuCauThuResponse(thanhToanMoi, DomainConstants.TransactionPurposes.SupplementaryFee, false));
        }, _logger);
    }

    public async Task<Result<YeuCauThuResponse>> XuLyCallbackThuBoSungAsync(XuLyCallbackRequest request)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var tt = await _context.ThanhToans.Include(t => t.ChiTietThanhToans).Include(t => t.DonThue)
                .FirstOrDefaultAsync(t => t.MaYeuCau == request.MaYeuCau);
            if (tt == null) return Result<YeuCauThuResponse>.Loi("GIAO_DICH_NOT_FOUND", "Không tìm thấy giao dịch.");

            var chiTiet = tt.ChiTietThanhToans.FirstOrDefault();
            if (tt.TrangThai == "ThanhCong")
            {
                await transaction.CommitAsync();
                return Result<YeuCauThuResponse>.Ok(MapYeuCauThuResponse(tt, chiTiet?.MucDich ?? "ThuBoSung", includeUrl: false));
            }

            var ngoaiLe = await KiemTraNgoaiLeCallbackAsync(tt, request, transaction);
            if (ngoaiLe != null) return ngoaiLe;

            tt.TrangThai = "ThanhCong";
            tt.ThoiDiemThanhCong = DateTime.UtcNow;
            tt.MaGiaoDichCong = request.MaGiaoDichCong ?? $"GATEWAY_{DateTime.UtcNow.Ticks}";

            await LienKetDoiSoatTuGhiChuAsync(tt, chiTiet);
            if (_thongBaoService != null)
                await _thongBaoService.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
                    tt.MaDonThue, LoaiSuKienThongBao.ThanhToanBoSung, MaSuKienThongBao.ThanhToanBoSung(tt.MaThanhToan),
                    "Thanh toán thu bổ sung thành công",
                    $"Bạn đã thanh toán thành công số tiền thu bổ sung {tt.TongSoTien:N0} đ cho đơn hàng #{tt.MaDonThue}."));

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Result<YeuCauThuResponse>.Ok(MapYeuCauThuResponse(tt, chiTiet?.MucDich ?? "ThuBoSung", canDoiChieuOverride: false, includeUrl: false));
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<YeuCauThuResponse>.Loi("SYS_ERROR", $"Lỗi hệ thống khi xử lý callback: {e.Message}");
        }
    }

    private async Task<Result<YeuCauThuResponse>?> KiemTraQuyenThuBoSungAsync(long maKhachChuDon, long actorId)
    {
        try
        {
            var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, actorId);
            if (tk.VaiTro is "NhanVien" or "QuanTriVien") { await ActorGuard.EnsureVanHanhAsync(_context, actorId); return null; }
            var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, actorId);
            return maKhachChuDon != maKhach
                ? Result<YeuCauThuResponse>.Loi("KHONG_CO_QUYEN", "Bạn không có quyền tạo yêu cầu thu bổ sung cho đơn thuê này.") : null;
        }
        catch (NghiepVuException ex) when (ex is KhongCoQuyenException or TaiKhoanBiKhoaException)
        {
            return Result<YeuCauThuResponse>.Loi("KHONG_CO_QUYEN", ex.Message);
        }
    }

    private async Task<Result<YeuCauThuResponse>?> KiemTraNgoaiLeCallbackAsync(
        ThanhToan tt, XuLyCallbackRequest request, Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction tx)
    {
        if (request.SoTien != tt.TongSoTien)
        {
            tt.TrangThaiDoiChieu = "CanDoiChieu";
            tt.TrangThai = "ChuaRoKetQua";
            tt.GhiChu += $" [Ngoại lệ W4-T8: Sai số tiền callback. Yêu cầu: {tt.TongSoTien}, Thực nhận: {request.SoTien}]";
            await _context.SaveChangesAsync(); await tx.CommitAsync();
            return Result<YeuCauThuResponse>.Loi("SO_TIEN_GATEWAY_KHONG_KHOP", "Số tiền gateway không khớp, đã chuyển sang trạng thái cần đối chiếu.");
        }

        if (tt.DonThue.TrangThai is TrangThaiDonThue.KhachHuy or TrangThaiDonThue.CuaHangHuy or TrangThaiDonThue.HetHan)
        {
            tt.TrangThaiDoiChieu = "CanDoiChieu";
            tt.TrangThai = "ChuaRoKetQua";
            tt.ThoiDiemThanhCong = DateTime.UtcNow;
            tt.MaGiaoDichCong = request.MaGiaoDichCong;
            tt.GhiChu += " [Ngoại lệ W4-T8: Tiền về sau khi đơn đã hủy hoặc hết hạn. Cần hoàn tiền thừa.]";
            await _context.SaveChangesAsync(); await tx.CommitAsync();
            return Result<YeuCauThuResponse>.Loi("TIEN_VE_SAU_HUY", "Đơn đã hủy/hết hạn, khoản tiền được ghi nhận và đưa vào danh sách đối chiếu hoàn tiền.");
        }

        if (request.TrangThai == "ThatBai")
        {
            tt.TrangThai = "ThatBai";
            await _context.SaveChangesAsync(); await tx.CommitAsync();
            return Result<YeuCauThuResponse>.Loi("THANH_TOAN_THAT_BAI", "Giao dịch thanh toán thất bại từ cổng thanh toán.");
        }
        return null;
    }

    private async Task LienKetDoiSoatTuGhiChuAsync(ThanhToan tt, ChiTietThanhToan? chiTiet)
    {
        if (chiTiet == null || string.IsNullOrEmpty(tt.GhiChu)) return;
        var match = Regex.Match(tt.GhiChu, @"DoiSoat_(\d+)");
        if (!match.Success || !long.TryParse(match.Groups[1].Value, out long maDoiSoat)) return;
        if (await _context.DoiSoatTienCocs.FindAsync(maDoiSoat) == null) return;
        if (!await _context.GiaoDichDoiSoats.AnyAsync(g => g.MaDoiSoat == maDoiSoat && g.MaChiTietThanhToan == chiTiet.MaChiTietThanhToan))
            _context.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat { MaDoiSoat = maDoiSoat, MaChiTietThanhToan = chiTiet.MaChiTietThanhToan });
    }

    private static YeuCauThuResponse MapYeuCauThuResponse(
        ThanhToan tt, string? mucDich, bool? canDoiChieuOverride = null, bool includeUrl = true) => new()
    {
        MaThanhToan = tt.MaThanhToan, MaYeuCau = tt.MaYeuCau, SoTien = tt.TongSoTien,
        MucDich = mucDich ?? DomainConstants.TransactionPurposes.SupplementaryFee, TrangThai = tt.TrangThai,
        PaymentUrl = includeUrl ? $"https://mock-gateway.geargo.vn/pay?id={tt.MaYeuCau}" : null,
        CanDoiChieu = canDoiChieuOverride ?? (tt.TrangThaiDoiChieu == DomainConstants.Status.VerificationNeeded)
    };
}
