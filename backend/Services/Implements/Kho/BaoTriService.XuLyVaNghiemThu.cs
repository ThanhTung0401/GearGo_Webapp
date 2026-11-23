using System.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

public partial class BaoTriService
{
    public async Task<Result<BaoTriResponse>> PhanCongXuLyAsync(long maPhieuBaoTri, PhanCongBaoTriRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu bảo trì.");
            if (DaKetThuc(phieu))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.MaintenanceTicketClosed, "Phiếu bảo trì đã kết thúc, không thể phân công lại.");

            // FN6-02: Frontend gửi lên MaNhanVien (từ app.staffAccounts) chứ KHÔNG phải MaTaiKhoan.
            // Ưu tiên tìm theo MaNhanVien trước, chỉ fallback sang MaTaiKhoan để tránh gán nhầm người.
            NhanVien? nv = await _context.NhanViens.Include(n => n.TaiKhoan)
                .FirstOrDefaultAsync(n => n.MaNhanVien == request.MaNguoiXuLy)
                ?? await _context.NhanViens.Include(n => n.TaiKhoan)
                    .FirstOrDefaultAsync(n => n.MaTaiKhoan == request.MaNguoiXuLy);
            if (nv == null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.StaffNotFound,
                    "Không tìm thấy nhân viên được phân công.");
            if (nv.TrangThaiLamViec != DomainConstants.StaffStatus.Working ||
                (nv.TaiKhoan != null && nv.TaiKhoan.TrangThai != DomainConstants.AccountStatus.Active))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.StaffResigned,
                    "Nhân viên được phân công không còn làm việc hoặc tài khoản đã khóa.");

            phieu.MaNguoiXuLy = nv.MaNhanVien;
            if (phieu.TrangThai == DomainConstants.Status.PendingProcessing)
                phieu.TrangThai = DomainConstants.Status.InProgress;

            await _context.SaveChangesAsync();
            return Result<BaoTriResponse>.Ok((await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri))!.ToResponse());
        }, _logger);
    }

    public async Task<Result<BaoTriResponse>> CapNhatTienDoAsync(long maPhieuBaoTri, CapNhatTienDoRequest request, long actorId)
    {
        if (request.ChiPhi.HasValue && request.ChiPhi.Value < 0)
            return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InvalidCost, "Chi phí bảo trì không được âm.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu bảo trì.");
            if (DaKetThuc(phieu))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.MaintenanceTicketClosed, "Phiếu bảo trì đã kết thúc, không thể sửa tiến độ.");
            if (!await KiemTraQuyenXuLyAsync(phieu, actorId))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.NotAssignedStaff, "Bạn không phải người được phân công xử lý phiếu bảo trì này.");

            if (request.KetQua != null) phieu.KetQua = request.KetQua;
            if (request.ChiPhi.HasValue) phieu.ChiPhi = request.ChiPhi.Value;
            if (request.BangChung != null) phieu.BangChung = request.BangChung;
            if (request.NgayDuKienHoanThanh.HasValue) phieu.NgayDuKienHoanThanh = request.NgayDuKienHoanThanh.Value;
            if (phieu.TrangThai == DomainConstants.Status.PendingProcessing)
                phieu.TrangThai = DomainConstants.Status.InProgress;

            await _context.SaveChangesAsync();
            return Result<BaoTriResponse>.Ok((await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri))!.ToResponse());
        }, _logger);
    }

    public async Task<Result<BaoTriResponse>> GuiKiemTraAsync(long maPhieuBaoTri, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu bảo trì.");
            if (DaKetThuc(phieu))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.MaintenanceTicketClosed, "Phiếu bảo trì đã kết thúc.");
            if (!await KiemTraQuyenXuLyAsync(phieu, actorId))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.NotAssignedStaff, "Bạn không phải người được phân công xử lý phiếu bảo trì này.");
            // FN6-03: Nếu chưa cập nhật kết quả, tự gán mặc định thay vì bắn 400 chặn đứng luồng Gửi KT.
            if (string.IsNullOrWhiteSpace(phieu.KetQua))
                phieu.KetQua = "Đã hoàn thành xử lý kỹ thuật, chờ kiểm tra nghiệm thu";

            phieu.TrangThai = DomainConstants.Status.PendingInspection;
            await _context.SaveChangesAsync();
            return Result<BaoTriResponse>.Ok((await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri))!.ToResponse());
        }, _logger);
    }

    public async Task<Result<BaoTriResponse>> XacNhanHoanThanhAsync(long maPhieuBaoTri, XacNhanBaoTriRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.KetQuaKiemTra))
            return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InspectionResultIncomplete, "Phải có kết luận kiểm tra nghiệm thu.");
        if (request.ChiPhi.HasValue && request.ChiPhi.Value < 0)
            return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InvalidCost, "Chi phí bảo trì không được âm.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu bảo trì.");
            if (phieu.TrangThai == DomainConstants.Status.Completed)
                return Result<BaoTriResponse>.Ok(phieu.ToResponse());
            if (phieu.TrangThai == DomainConstants.Status.Failed)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.MaintenanceTicketClosed, "Phiếu bảo trì đã kết thúc với kết luận Không Đạt.");

            var ngayHoanThanh = request.NgayHoanThanhThucTe ?? DateTime.UtcNow;
            if (ngayHoanThanh > DateTime.UtcNow.AddMinutes(DomainConstants.Policies.ToleranceMinutes))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InspectionResultIncomplete, "Thời điểm hoàn thành thực tế không được ở tương lai.");
            if (phieu.NgayBatDau.HasValue && ngayHoanThanh < phieu.NgayBatDau.Value.AddMinutes(-DomainConstants.Policies.ToleranceMinutes))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InspectionResultIncomplete, "Thời điểm hoàn thành không được trước thời điểm bắt đầu.");

            var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
            if (!nvCheck.ThanhCong)
                return Result<BaoTriResponse>.Loi(nvCheck.MaLoi!, "Không tìm thấy hồ sơ nhân viên xác nhận.");

            phieu.TrangThai = DomainConstants.Status.Completed;
            phieu.MaNguoiXacNhanHoanThanh = nvCheck.DuLieu!.MaNhanVien;
            phieu.NgayHoanThanhThucTe = ngayHoanThanh;
            phieu.KetQua = request.KetQuaKiemTra;
            if (request.BangChung != null) phieu.BangChung = request.BangChung;
            if (request.ChiPhi.HasValue) phieu.ChiPhi = request.ChiPhi.Value;

            var trangThaiCu = phieu.ThietBi.TrangThaiSuDung;
            phieu.ThietBi.TrangThaiSuDung = TrangThaiThietBi.SanSang;

            AuditLogHelper.GhiLichSuThietBi(_context, phieu.ThietBi.MaThietBi, actorId, trangThaiCu.ToString(),
                TrangThaiThietBi.SanSang.ToString(), phieu.MoTaLoi, request.KetQuaKiemTra,
                $"Hoàn thành nghiệm thu bảo trì #{phieu.MaPhieuBaoTri}: {request.KetQuaKiemTra}");

            await _context.SaveChangesAsync();
            return Result<BaoTriResponse>.Ok((await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri))!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<BaoTriResponse>> KetThucKhongDatAsync(long maPhieuBaoTri, XacNhanBaoTriRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.KetQuaKiemTra))
            return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InspectionResultIncomplete, "Phải nêu rõ lý do/kết luận không đạt.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
            if (phieu == null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu bảo trì.");
            if (DaKetThuc(phieu))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.MaintenanceTicketClosed, "Phiếu bảo trì đã kết thúc.");

            var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
            if (!nvCheck.ThanhCong)
                return Result<BaoTriResponse>.Loi(nvCheck.MaLoi!, "Không tìm thấy hồ sơ nhân viên xác nhận.");

            phieu.TrangThai = DomainConstants.Status.Failed;
            phieu.MaNguoiXacNhanHoanThanh = nvCheck.DuLieu!.MaNhanVien;
            phieu.NgayHoanThanhThucTe = request.NgayHoanThanhThucTe ?? DateTime.UtcNow;
            phieu.KetQua = request.KetQuaKiemTra;
            if (request.BangChung != null) phieu.BangChung = request.BangChung;
            if (request.ChiPhi.HasValue) phieu.ChiPhi = request.ChiPhi.Value;

            // FN6-04: Khi nghiệm thu kết luận "Không thể sửa", chuyển thiết bị sang NgungSuDung
            // (khớp mô tả UI: "Không thể sửa — Hư hỏng nặng, chuyển sang Ngừng sử dụng").
            var trangThaiCu = phieu.ThietBi.TrangThaiSuDung;
            phieu.ThietBi.TrangThaiSuDung = TrangThaiThietBi.NgungSuDung;

            AuditLogHelper.GhiLichSuThietBi(_context, phieu.MaThietBi, actorId, trangThaiCu.ToString(),
                TrangThaiThietBi.NgungSuDung.ToString(), phieu.MoTaLoi, request.KetQuaKiemTra,
                $"Kết thúc bảo trì #{phieu.MaPhieuBaoTri} KHÔNG ĐẠT: {request.KetQuaKiemTra}");

            await _context.SaveChangesAsync();
            return Result<BaoTriResponse>.Ok((await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri))!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }
}
