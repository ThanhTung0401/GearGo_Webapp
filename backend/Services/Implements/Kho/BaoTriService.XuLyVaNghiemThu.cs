using System.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Models.Enums;

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

            var nvCheck = await _context.LayNhanVienDangHoatDongAsync(request.MaNguoiXuLy);
            if (!nvCheck.ThanhCong)
            {
                string msg = nvCheck.MaLoi == DomainConstants.Errors.StaffNotFound
                    ? "Không tìm thấy nhân viên được phân công."
                    : "Nhân viên được phân công không còn làm việc hoặc tài khoản đã khóa.";
                return Result<BaoTriResponse>.Loi(nvCheck.MaLoi!, msg);
            }

            phieu.MaNguoiXuLy = nvCheck.DuLieu!.MaNhanVien;
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
            if (string.IsNullOrWhiteSpace(phieu.KetQua))
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InspectionResultIncomplete, "Cần cập nhật kết quả xử lý trước khi gửi kiểm tra nghiệm thu.");

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

            // Giữ trạng thái DangBaoTri để chờ đề nghị giáng cấp hoặc ngừng sử dụng.
            phieu.ThietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;

            AuditLogHelper.GhiLichSuThietBi(_context, phieu.MaThietBi, actorId, TrangThaiThietBi.DangBaoTri.ToString(),
                TrangThaiThietBi.DangBaoTri.ToString(), phieu.MoTaLoi, request.KetQuaKiemTra,
                $"Kết thúc bảo trì #{phieu.MaPhieuBaoTri} KHÔNG ĐẠT: {request.KetQuaKiemTra}");

            await _context.SaveChangesAsync();
            return Result<BaoTriResponse>.Ok((await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri))!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }
}
