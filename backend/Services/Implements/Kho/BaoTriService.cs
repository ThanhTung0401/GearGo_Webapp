using System.Data;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ quản lý phiếu bảo trì, vệ sinh và nghiệm thu thiết bị.
/// </summary>
public partial class BaoTriService : IBaoTriService
{
    private readonly ApplicationDbContext _context;
    private readonly IDeviceConflictDetector _conflictDetector;
    private readonly ILogger<BaoTriService> _logger;

    public BaoTriService(
        ApplicationDbContext context,
        IDeviceConflictDetector conflictDetector,
        ILogger<BaoTriService> logger)
    {
        _context = context;
        _conflictDetector = conflictDetector;
        _logger = logger;
    }

    public async Task<Result<PhieuBaoTri>> TaoPhieuBaoTriToiThieuAsync(
        long maThietBi, long? maDonThue, long maNhanVienLap, string loaiXuLy, string moTaLoi, string mucDo)
    {
        var thietBi = await _context.ThietBis.FindAsync(maThietBi);
        if (thietBi == null)
            return Result<PhieuBaoTri>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị để lập phiếu bảo trì.");

        var phieuDangMo = await TimPhieuDangMoAsync(maThietBi);
        if (phieuDangMo != null)
            return Result<PhieuBaoTri>.Ok(phieuDangMo);

        var phieuMoi = new PhieuBaoTri
        {
            MaThietBi = maThietBi, MaDonThue = maDonThue, MaNguoiLap = maNhanVienLap,
            LoaiXuLy = loaiXuLy, MoTaLoi = moTaLoi, MucDo = mucDo,
            NgayBatDau = DateTime.UtcNow, TrangThai = DomainConstants.Status.PendingProcessing
        };
        thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;
        _context.PhieuBaoTris.Add(phieuMoi);
        await _context.SaveChangesAsync();

        return Result<PhieuBaoTri>.Ok(phieuMoi);
    }

    public async Task<Result<DanhSachBaoTriResponse>> TimKiemAsync(TimKiemBaoTriRequest request)
    {
        var (trang, soMoiTrang) = CalculationHelpers.ChuanHoaPhanTrang(request.Trang, request.SoMoiTrang);
        var query = _context.PhieuBaoTris.AsNoTracking()
            .Include(p => p.ThietBi).ThenInclude(tb => tb.SanPhamHienTai)
            .Include(p => p.NguoiLap).Include(p => p.NguoiXuLy).Include(p => p.NguoiXacNhanHoanThanh)
            .AsQueryable();

        if (request.MaThietBi.HasValue) query = query.Where(p => p.MaThietBi == request.MaThietBi.Value);
        if (request.MaNguoiXuLy.HasValue) query = query.Where(p => p.MaNguoiXuLy == request.MaNguoiXuLy.Value);
        if (!string.IsNullOrWhiteSpace(request.TrangThai)) query = query.Where(p => p.TrangThai == request.TrangThai);
        if (!string.IsNullOrWhiteSpace(request.LoaiXuLy)) query = query.Where(p => p.LoaiXuLy == request.LoaiXuLy);
        if (request.TuNgay.HasValue) query = query.Where(p => p.NgayBatDau >= request.TuNgay.Value);
        if (request.DenNgay.HasValue) query = query.Where(p => p.NgayBatDau <= request.DenNgay.Value);

        var tongSo = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.MaPhieuBaoTri)
            .Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToListAsync();

        return Result<DanhSachBaoTriResponse>.Ok(new DanhSachBaoTriResponse
        {
            Items = items.Select(p => p.ToResponse()).ToList(),
            TongSo = tongSo, Trang = trang, SoMoiTrang = soMoiTrang
        });
    }

    public async Task<Result<BaoTriResponse>> LayChiTietAsync(long maPhieuBaoTri)
    {
        var phieu = await LayPhieuBaoTriDayDuAsync(maPhieuBaoTri);
        if (phieu == null)
            return Result<BaoTriResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu bảo trì.");

        var canhBao = await _conflictDetector.KiemTraXungDotDonTuongLaiAsync(
            phieu.MaThietBi, phieu.ThietBi?.MaThietBiHienThi ?? "", phieu.LoaiXuLy ?? "BaoTri", phieu.MaDonThue ?? 0);
        return Result<BaoTriResponse>.Ok(phieu.ToResponse(canhBao));
    }

    public async Task<Result<BaoTriResponse>> LapPhieuAsync(LapBaoTriRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.MoTaLoi))
            return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InvalidData, "Mô tả lỗi không được để trống.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var thietBi = await _context.ThietBis.Include(tb => tb.SanPhamHienTai)
                .FirstOrDefaultAsync(tb => tb.MaThietBi == request.MaThietBi);
            if (thietBi == null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");
            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.EquipmentWithCustomer, "Thiết bị đang ở khách, chưa thể tiếp nhận bảo trì tại kho.");
            if (thietBi.TrangThaiSuDung is TrangThaiThietBi.ThatLac or TrangThaiThietBi.NgungSuDung)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.InvalidState, "Thiết bị đang thất lạc hoặc đã ngừng sử dụng.");

            var phieuDangMo = await TimPhieuDangMoAsync(request.MaThietBi);
            if (phieuDangMo != null)
                return Result<BaoTriResponse>.Loi(DomainConstants.Errors.ActiveMaintenanceExists,
                    $"Thiết bị đã có phiếu bảo trì đang mở #{phieuDangMo.MaPhieuBaoTri}. Vui lòng tiếp tục trên phiếu hiện có.");

            var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
            if (!nvCheck.ThanhCong)
                return Result<BaoTriResponse>.Loi(nvCheck.MaLoi!, "Không tìm thấy hồ sơ nhân viên thao tác.");

            var trangThaiCu = thietBi.TrangThaiSuDung;
            thietBi.TrangThaiSuDung = TrangThaiThietBi.DangBaoTri;
            var phieuMoi = new PhieuBaoTri
            {
                MaThietBi = request.MaThietBi, MaDonThue = request.MaDonThue, MaNguoiLap = nvCheck.DuLieu!.MaNhanVien,
                LoaiXuLy = string.IsNullOrWhiteSpace(request.LoaiXuLy) ? DomainConstants.Maintenance.TypeRepair : request.LoaiXuLy,
                MoTaLoi = request.MoTaLoi,
                MucDo = string.IsNullOrWhiteSpace(request.MucDo) ? DomainConstants.Maintenance.LevelMinor : request.MucDo,
                NgayBatDau = DateTime.UtcNow, NgayDuKienHoanThanh = request.NgayDuKienHoanThanh,
                BangChung = request.BangChung, TrangThai = DomainConstants.Status.PendingProcessing
            };
            _context.PhieuBaoTris.Add(phieuMoi);

            AuditLogHelper.GhiLichSuThietBi(_context, thietBi.MaThietBi, actorId, trangThaiCu.ToString(),
                TrangThaiThietBi.DangBaoTri.ToString(), thietBi.TinhTrang, request.MoTaLoi,
                $"Lập phiếu bảo trì ({phieuMoi.LoaiXuLy}): {request.MoTaLoi}");

            await _context.SaveChangesAsync();
            var canhBao = await _conflictDetector.KiemTraXungDotDonTuongLaiAsync(
                thietBi.MaThietBi, thietBi.MaThietBiHienThi, phieuMoi.LoaiXuLy, request.MaDonThue ?? 0);
            var fullPhieu = await LayPhieuBaoTriDayDuAsync(phieuMoi.MaPhieuBaoTri);
            return Result<BaoTriResponse>.Ok(fullPhieu!.ToResponse(canhBao));
        }, _logger, IsolationLevel.Serializable);
    }

    private Task<PhieuBaoTri?> TimPhieuDangMoAsync(long maThietBi) =>
        _context.PhieuBaoTris.FirstOrDefaultAsync(p =>
            p.MaThietBi == maThietBi &&
            (p.TrangThai == DomainConstants.Status.PendingProcessing ||
             p.TrangThai == DomainConstants.Status.InProgress ||
             p.TrangThai == DomainConstants.Status.PendingInspection));

    private static bool DaKetThuc(PhieuBaoTri phieu) =>
        phieu.TrangThai == DomainConstants.Status.Completed ||
        phieu.TrangThai == DomainConstants.Status.Failed;

    private async Task<PhieuBaoTri?> LayPhieuBaoTriDayDuAsync(long maPhieuBaoTri) =>
        await _context.PhieuBaoTris
            .Include(p => p.ThietBi).ThenInclude(tb => tb.SanPhamHienTai)
            .Include(p => p.NguoiLap).Include(p => p.NguoiXuLy).Include(p => p.NguoiXacNhanHoanThanh)
            .FirstOrDefaultAsync(p => p.MaPhieuBaoTri == maPhieuBaoTri);

    private async Task<bool> KiemTraQuyenXuLyAsync(PhieuBaoTri phieu, long actorId)
    {
        var taiKhoan = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);
        if (taiKhoan?.VaiTro == "QuanTriVien") return true;

        var nhanVien = await _context.LayNhanVienAsync(actorId);
        if (nhanVien == null) return false;

        // FN6-02: Cho phép người lập phiếu hoặc nhân viên tự nhận xử lý khi phiếu chưa phân công ai
        // (tự động gán MaNguoiXuLy cho người đầu tiên thao tác), hoặc người đã được phân công.
        if (!phieu.MaNguoiXuLy.HasValue)
        {
            phieu.MaNguoiXuLy = nhanVien.MaNhanVien;
            return true;
        }
        if (phieu.MaNguoiXuLy.Value == nhanVien.MaNhanVien) return true;
        if (phieu.MaNguoiLap == nhanVien.MaNhanVien) return true;
        return false;
    }
}
