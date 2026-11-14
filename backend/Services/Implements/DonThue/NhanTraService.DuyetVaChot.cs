using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Models.Enums;
using GearGo.Services.Specifications;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class NhanTraService
{
    public async Task<Result<ChiTietNhanTraResponse>> DuyetKetLuanMatAsync(
        long phieuId, long chiTietId, DuyetMatRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieu == null)
                return Result<ChiTietNhanTraResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu nhận trả.");
            if (phieu.TrangThai == TrangThaiPhieuNhanTra.DaChot)
                return Result<ChiTietNhanTraResponse>.Loi(DomainConstants.Errors.ReceiptFinalized, "Phiếu nhận trả đã chốt.");

            var ct = phieu.ChiTietNhanTras.FirstOrDefault(c => c.MaChiTietNhanTra == chiTietId);
            if (ct == null)
                return Result<ChiTietNhanTraResponse>.Loi(DomainConstants.Errors.DetailNotFound, "Không tìm thấy chi tiết nhận trả.");
            if (ct.KetLuan != DomainConstants.InspectionConclusions.Lost)
                return Result<ChiTietNhanTraResponse>.Loi(DomainConstants.Errors.NotLostEquipment, "Dòng kiểm tra này không có kết luận mất thiết bị.");

            var phuPhi = await _context.PhuPhis.FirstOrDefaultAsync(p =>
                p.MaPhuPhi == request.MaPhuPhiBoiThuong && p.MaDonThue == phieu.MaDonThue &&
                p.MaChiTietBanGiao == ct.MaChiTietBanGiao && p.LoaiPhi == DomainConstants.InspectionConclusions.Lost);
            if (phuPhi == null)
                return Result<ChiTietNhanTraResponse>.Loi(DomainConstants.Errors.SurchargeNotFound,
                    "Không tìm thấy khoản phụ phí bồi thường mất thiết bị hợp lệ cho dòng này.");
            if (phuPhi.TrangThaiDuyet != DomainConstants.Status.Approved)
                return Result<ChiTietNhanTraResponse>.Loi(DomainConstants.Errors.LostConclusionIncomplete,
                    "Khoản phụ phí bồi thường mất thiết bị chưa được phê duyệt.");

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong)
                return Result<ChiTietNhanTraResponse>.Loi(nvResult.MaLoi!, "Không tìm thấy hồ sơ nhân viên của quản trị viên.");

            ct.MaNguoiDuyetMat = nvResult.DuLieu!.MaNhanVien;
            ct.ThoiDiemDuyetMat = DateTime.UtcNow;
            ct.TrangThaiXuLy = DomainConstants.Status.ApprovedLost;
            if (!string.IsNullOrEmpty(request.LyDo))
                ct.GhiChu = (ct.GhiChu != null ? ct.GhiChu + "; " : "") + $"[Admin duyệt mất]: {request.LyDo}";
            ct.ChiTietBanGiao.PhanCongThietBi.ThietBi.TrangThaiSuDung = TrangThaiThietBi.ThatLac;

            await _context.SaveChangesAsync();
            var reloaded = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            return Result<ChiTietNhanTraResponse>.Ok(reloaded!.ChiTietNhanTras.First(c => c.MaChiTietNhanTra == chiTietId).ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<NhanTraResponse>> ChotNhanTraAsync(long phieuId, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieu == null)
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu nhận trả.");
            if (phieu.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            {
                int soConNoHienTai = await _truyVanService.DemThietBiConNoAsync(phieu.MaDonThue);
                return Result<NhanTraResponse>.Ok(phieu.ToResponse(soConNoHienTai));
            }

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong)
                return Result<NhanTraResponse>.Loi(nvResult.MaLoi!, "Không tìm thấy thông tin nhân viên chốt phiếu.");
            var nhanVien = nvResult.DuLieu!;

            var validation = await NhanTraValidationRules.KiemTraDieuKienChotAsync(phieu, _context);
            if (!validation.ThanhCong)
                return Result<NhanTraResponse>.Loi(validation.MaLoi ?? "VALIDATION_FAILED", validation.ThongDiep ?? "Điều kiện kiểm tra không hợp lệ.");

            var canhBaoDonSau = new List<string>();
            foreach (var ct in phieu.ChiTietNhanTras)
            {
                var thietBi = ct.ChiTietBanGiao.PhanCongThietBi.ThietBi;
                var trangThaiCu = thietBi.TrangThaiSuDung;

                var strategy = _strategyFactory.GetStrategy(ct.KetLuan);
                if (strategy != null) await strategy.XuLySauKiemTraAsync(ct, thietBi, nhanVien, phieu.MaDonThue);

                AuditLogHelper.GhiLichSuThietBi(_context, thietBi.MaThietBi, actorId, trangThaiCu.ToString(),
                    thietBi.TrangThaiSuDung.ToString(), ct.ChiTietBanGiao.TinhTrangTruocThue, ct.TinhTrangSauThue,
                    $"Nhận trả đợt {phieu.LanTra}: Kết luận {ct.KetLuan}");

                if (thietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
                    canhBaoDonSau.AddRange(await _conflictDetector.KiemTraXungDotDonTuongLaiAsync(
                        thietBi.MaThietBi, thietBi.MaThietBiHienThi, ct.KetLuan ?? "", phieu.MaDonThue));
            }

            int soConNo = await _truyVanService.DemThietBiConNoAsync(phieu.MaDonThue, phieu.MaPhieuNhanTra);
            phieu.ChotPhieu(nhanVien.HoTen ?? "Nhân viên", soConNo == 0);
            phieu.DonThue.TrangThai = soConNo > 0 ? TrangThaiDonThue.DangThue : TrangThaiDonThue.ChoDoiSoat;

            if (soConNo == 0)
                AuditLogHelper.GhiLichSuDon(_context, phieu.MaDonThue, actorId, TrangThaiDonThue.DangThue.ToString(),
                    TrangThaiDonThue.ChoDoiSoat.ToString(), $"Hoàn tất nhận trả toàn bộ thiết bị (Đợt cuối - Phiếu {phieu.MaPhieuHienThi})");

            return Result<NhanTraResponse>.Ok(phieu.ToResponse(soConNo, canhBaoDonSau));
        }, _logger, IsolationLevel.Serializable);
    }
}
