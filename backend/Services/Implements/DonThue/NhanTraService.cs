using System;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Specifications;
using GearGo.Services.Strategies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.DonThue;

/// <summary>
/// Dịch vụ nhận trả thiết bị nhiều đợt và kết luận mất thiết bị.
/// </summary>
public partial class NhanTraService : INhanTraService
{
    private readonly ApplicationDbContext _context;
    private readonly ITruyVanNhanTraService _truyVanService;
    private readonly IInspectionStrategyFactory _strategyFactory;
    private readonly IDeviceConflictDetector _conflictDetector;
    private readonly ILogger<NhanTraService> _logger;

    public NhanTraService(
        ApplicationDbContext context,
        ITruyVanNhanTraService truyVanService,
        IInspectionStrategyFactory strategyFactory,
        IDeviceConflictDetector conflictDetector,
        ILogger<NhanTraService> logger)
    {
        _context = context;
        _truyVanService = truyVanService;
        _strategyFactory = strategyFactory;
        _conflictDetector = conflictDetector;
        _logger = logger;
    }

    public async Task<Result<NhanTraResponse>> TaoPhieuNhanTraNhapAsync(long donId, TaoNhanTraRequest request, long actorId)
    {
        var inputCheck = NhanTraValidationRules.KiemTraDanhSachNhanTra(request.DanhSachChiTietBanGiao);
        if (!inputCheck.ThanhCong)
            return Result<NhanTraResponse>.Loi(inputCheck.MaLoi!, inputCheck.ThongDiep!);

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var donThue = await _context.DonThues
                .Include(d => d.PhieuBanGiao).ThenInclude(pb => pb!.ChiTietBanGiaos)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId);
            if (donThue == null)
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.OrderNotFound, "Không tìm thấy đơn thuê.");
            if (donThue.PhieuBanGiao == null || donThue.PhieuBanGiao.TrangThai != DomainConstants.Status.Delivered)
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.OrderNotDelivered, "Đơn chưa hoàn tất bàn giao thiết bị.");

            var validCtbIds = donThue.PhieuBanGiao.ChiTietBanGiaos.Select(c => c.MaChiTietBanGiao).ToHashSet();
            if (request.DanhSachChiTietBanGiao.Any(id => !validCtbIds.Contains(id)))
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.EquipmentNotInHandover, "Một số thiết bị không thuộc biên bản bàn giao của đơn thuê.");

            if (await _context.ChiTietNhanTras.AnyAsync(ct =>
                request.DanhSachChiTietBanGiao.Contains(ct.MaChiTietBanGiao) && ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot))
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.EquipmentAlreadyReturned, "Một số thiết bị đã được chốt nhận trả ở đợt trước.");

            var existingDraft = await _context.ChiTietNhanTras.Include(ct => ct.PhieuNhanTra)
                .Where(ct => request.DanhSachChiTietBanGiao.Contains(ct.MaChiTietBanGiao) && ct.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.Nhap)
                .ToListAsync();
            if (existingDraft.Count > 0)
            {
                var phieuId = existingDraft.First().MaPhieuNhanTra;
                var phieuHienCo = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
                if (phieuHienCo != null && phieuHienCo.ChiTietNhanTras.Count == request.DanhSachChiTietBanGiao.Count)
                    return Result<NhanTraResponse>.Ok(phieuHienCo.ToResponse());
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.LineAlreadyHasDraftReceipt,
                    $"Thiết bị đã nằm trong phiếu nhận trả nháp #{phieuId}.", new { MaPhieu = phieuId });
            }

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong)
                return Result<NhanTraResponse>.Loi(nvResult.MaLoi!, "Không tìm thấy thông tin nhân viên tiếp nhận.");

            int lanTra = await _context.PhieuNhanTras.CountAsync(p => p.MaDonThue == donId) + 1;
            var phieuMoi = new PhieuNhanTra
            {
                MaDonThue = donId, MaNhanVien = nvResult.DuLieu!.MaNhanVien,
                MaPhieuHienThi = DisplayCodeHelper.SinhMaPhieuNhanTra(donThue.MaDonThue, lanTra),
                LanTra = lanTra, ThoiDiemLap = DateTime.UtcNow, TrangThai = TrangThaiPhieuNhanTra.Nhap, GhiChu = request.GhiChu
            };
            _context.PhieuNhanTras.Add(phieuMoi);
            foreach (var ctbId in request.DanhSachChiTietBanGiao)
            {
                _context.ChiTietNhanTras.Add(new ChiTietNhanTra
                {
                    PhieuNhanTra = phieuMoi, MaChiTietBanGiao = ctbId, TrangThaiXuLy = DomainConstants.Status.PendingProcessing
                });
            }

            await _context.SaveChangesAsync();
            var resultPhieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuMoi.MaPhieuNhanTra);
            return Result<NhanTraResponse>.Ok(resultPhieu!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<NhanTraResponse>> CapNhatPhieuNhanTraNhapAsync(
        long phieuId, CapNhatPhieuNhanTraRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieu == null)
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu nhận trả.");
            if (phieu.TrangThai == TrangThaiPhieuNhanTra.DaChot)
                return Result<NhanTraResponse>.Loi(DomainConstants.Errors.ReceiptFinalized, "Phiếu đã chốt, không được sửa.");

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong) return Result<NhanTraResponse>.Loi(nvResult.MaLoi!, nvResult.ThongDiep!);

            if (request.DanhSachDong != null && request.DanhSachDong.Count > 0)
            {
                var ctDict = phieu.ChiTietNhanTras.ToDictionary(c => c.MaChiTietBanGiao);
                foreach (var dong in request.DanhSachDong)
                {
                    if (!ctDict.TryGetValue(dong.MaChiTietBanGiao, out var ctnt))
                        return Result<NhanTraResponse>.Loi(DomainConstants.Errors.DetailNotFound, $"Không tìm thấy chi tiết bàn giao #{dong.MaChiTietBanGiao} trong phiếu này.");
                    if (dong.ThoiDiemTraThucTe.HasValue && dong.ThoiDiemTraThucTe.Value > DateTime.UtcNow.AddMinutes(DomainConstants.Policies.ToleranceMinutes))
                        return Result<NhanTraResponse>.Loi(DomainConstants.Errors.InvalidReturnTime, "Thời điểm trả thực tế không được ở tương lai.");
                    if (!string.IsNullOrEmpty(dong.KetLuan) && !_strategyFactory.IsValidConclusion(dong.KetLuan))
                        return Result<NhanTraResponse>.Loi(DomainConstants.Errors.InvalidConclusion, $"Kết luận '{dong.KetLuan}' không hợp lệ.");

                    ctnt.ThoiDiemTraThucTe = dong.ThoiDiemTraThucTe;
                    ctnt.KetLuan = dong.KetLuan;
                    ctnt.TinhTrangSauThue = dong.TinhTrangSauThue;
                    ctnt.BienBanMat = dong.BienBanMat;
                    ctnt.GhiChu = dong.GhiChu;
                    if (dong.PhuKienThucNhan != null) ctnt.PhuKienThucNhan = JsonSerializer.Serialize(dong.PhuKienThucNhan);
                    if (dong.PhuKienConThieu != null) ctnt.PhuKienConThieu = JsonSerializer.Serialize(dong.PhuKienConThieu);
                    if (dong.DanhSachAnh != null) ctnt.DanhSachAnh = JsonSerializer.Serialize(dong.DanhSachAnh);
                    ctnt.TrangThaiXuLy = DomainConstants.Status.Inspected;
                }
            }

            if (!string.IsNullOrEmpty(request.GhiChu)) phieu.GhiChu = request.GhiChu;
            await _context.SaveChangesAsync();
            return Result<NhanTraResponse>.Ok((await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId))!.ToResponse());
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<TachDongResponse>> TachDongChoXuLyAsync(long phieuId, TachDongChoXuLyRequest request, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieuGoc = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuId);
            if (phieuGoc == null)
                return Result<TachDongResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu nhận trả gốc.");
            if (phieuGoc.TrangThai == TrangThaiPhieuNhanTra.DaChot)
                return Result<TachDongResponse>.Loi(DomainConstants.Errors.ReceiptFinalized, "Không thể tách dòng từ phiếu đã chốt.");

            var validTach = NhanTraValidationRules.KiemTraTachDong(request.DanhSachChiTietNhanTra, phieuGoc.ChiTietNhanTras.Count);
            if (!validTach.ThanhCong) return Result<TachDongResponse>.Loi(validTach.MaLoi!, validTach.ThongDiep!);

            var nvResult = await _context.LayNhanVienHopLeAsync(actorId);
            if (!nvResult.ThanhCong) return Result<TachDongResponse>.Loi(nvResult.MaLoi!, nvResult.ThongDiep!);

            int lanTraMoi = await _context.PhieuNhanTras.CountAsync(p => p.MaDonThue == phieuGoc.MaDonThue) + 1;
            var phieuMoi = new PhieuNhanTra
            {
                MaDonThue = phieuGoc.MaDonThue, MaNhanVien = nvResult.DuLieu!.MaNhanVien,
                MaPhieuHienThi = DisplayCodeHelper.SinhMaPhieuNhanTra(phieuGoc.MaDonThue, lanTraMoi),
                LanTra = lanTraMoi, ThoiDiemLap = DateTime.UtcNow, TrangThai = TrangThaiPhieuNhanTra.Nhap,
                GhiChu = $"Tách từ phiếu #{phieuGoc.MaPhieuHienThi}. Lý do: {request.LyDo}"
            };
            _context.PhieuNhanTras.Add(phieuMoi);

            var dongCanTach = phieuGoc.ChiTietNhanTras.Where(ct => request.DanhSachChiTietNhanTra.Contains(ct.MaChiTietNhanTra)).ToList();
            foreach (var ct in dongCanTach)
            {
                ct.PhieuNhanTra = phieuMoi;
                ct.GhiChu = (ct.GhiChu != null ? ct.GhiChu + "; " : "") + $"Tách từ phiếu #{phieuGoc.MaPhieuHienThi}: {request.LyDo}";
            }
            phieuGoc.GhiChu = (phieuGoc.GhiChu != null ? phieuGoc.GhiChu + "; " : "") +
                              $"Đã tách {dongCanTach.Count} thiết bị sang phiếu #{phieuMoi.MaPhieuHienThi}";

            await _context.SaveChangesAsync();
            var loadedGoc = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuGoc.MaPhieuNhanTra);
            var loadedMoi = await _truyVanService.LayPhieuNhanTraTheoIdAsync(phieuMoi.MaPhieuNhanTra);
            return Result<TachDongResponse>.Ok(new TachDongResponse { PhieuGoc = loadedGoc!.ToResponse(), PhieuMoi = loadedMoi!.ToResponse() });
        }, _logger, IsolationLevel.Serializable);
    }
}
