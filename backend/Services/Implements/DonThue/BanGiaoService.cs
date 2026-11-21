using System.Data;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BanGiao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Specifications;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public class BanGiaoService : IBanGiaoService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BanGiaoService>? _logger;

    public BanGiaoService(ApplicationDbContext context, ILogger<BanGiaoService>? logger = null)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<PhieuBanGiaoResponse>> LayTheoDonAsync(long maDonThue)
    {
        var phieu = await _context.PhieuBanGiaos
            .Include(p => p.ChiTietBanGiaos)
            .FirstOrDefaultAsync(p => p.MaDonThue == maDonThue);

        if (phieu == null)
            return Result<PhieuBanGiaoResponse>.Loi(DomainConstants.Errors.NotFound, "Đơn thuê này chưa có biên bản bàn giao.");

        return Result<PhieuBanGiaoResponse>.Ok(phieu.ToResponse());
    }

    public async Task<Result<PhieuBanGiaoResponse>> TaoHoacLayPhieuBanGiaoNhapAsync(long maDonThue, long maNhanVienTao)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                .FirstOrDefaultAsync(d => d.MaDonThue == maDonThue);

            if (donThue == null)
                return Result<PhieuBanGiaoResponse>.Loi(DomainConstants.Errors.OrderNotFound, "Không tìm thấy đơn thuê.");
            if (donThue.TrangThai != TrangThaiDonThue.SanSangNhan)
                return Result<PhieuBanGiaoResponse>.Loi(DomainConstants.Errors.InvalidState, "Đơn thuê chưa sẵn sàng bàn giao.");

            var phieuDaCo = await _context.PhieuBanGiaos
                .Include(p => p.ChiTietBanGiaos)
                .FirstOrDefaultAsync(p => p.MaDonThue == maDonThue);
            if (phieuDaCo != null)
                return Result<PhieuBanGiaoResponse>.Ok(phieuDaCo.ToResponse());

            var nhanVienTao = await _context.LayNhanVienAsync(maNhanVienTao);
            var phieuMoi = new PhieuBanGiao
            {
                MaDonThue = maDonThue,
                MaNhanVien = nhanVienTao?.MaNhanVien ?? maNhanVienTao,
                TrangThai = DomainConstants.Status.PendingDelivery,
                ThoiDiemLap = DateTime.UtcNow
            };
            _context.PhieuBanGiaos.Add(phieuMoi);

            var chiTietDonIds = donThue.ChiTietDonThues.Select(c => c.MaChiTietDon).ToList();
            var phanCongs = await _context.PhanCongThietBis
                .Where(pc => chiTietDonIds.Contains(pc.MaChiTietDon)
                             && pc.TrangThai == DomainConstants.Status.Assigned)
                .ToListAsync();

            foreach (var phanCong in phanCongs)
            {
                _context.ChiTietBanGiaos.Add(new ChiTietBanGiao
                {
                    PhieuBanGiao = phieuMoi,
                    MaPhanCong = phanCong.MaPhanCong,
                    TinhTrangTruocThue = DomainConstants.Status.DefaultHandoverCondition
                });
            }

            return Result<PhieuBanGiaoResponse>.Ok(phieuMoi.ToResponse());
        }, _logger);
    }

    public async Task<Result<PhieuBanGiaoResponse>> CapNhatPhieuBanGiaoNhapAsync(long maPhieuBanGiao, CapNhatPhieuBanGiaoRequest request)
    {
        var phieu = await _context.PhieuBanGiaos
            .Include(p => p.ChiTietBanGiaos)
            .FirstOrDefaultAsync(p => p.MaPhieuBanGiao == maPhieuBanGiao);

        if (phieu == null)
            return Result<PhieuBanGiaoResponse>.Loi(DomainConstants.Errors.NotFound, "Không tìm thấy phiếu.");
        if (phieu.TrangThai == DomainConstants.Status.Delivered)
            return Result<PhieuBanGiaoResponse>.Loi(DomainConstants.Errors.Locked, "Phiếu đã chốt không thể sửa.");

        phieu.TenNguoiNhanThucTe = request.TenNguoiNhanThucTe;
        phieu.ThoiDiemKhachXacNhan = request.ThoiDiemKhachXacNhan;
        phieu.BangChungXacNhan = request.BangChungXacNhan;
        phieu.GhiChu = request.GhiChu;

        foreach (var reqChiTiet in request.ChiTiet)
        {
            var dbChiTiet = phieu.ChiTietBanGiaos.FirstOrDefault(c => c.MaPhanCong == reqChiTiet.MaPhanCong);
            if (dbChiTiet == null) continue;

            dbChiTiet.TinhTrangTruocThue = reqChiTiet.TinhTrangTruocThue;
            dbChiTiet.PhuKienThucGiao = reqChiTiet.PhuKienThucGiao;
            dbChiTiet.DanhSachAnh = reqChiTiet.DanhSachAnh;
            dbChiTiet.GhiChu = reqChiTiet.GhiChu;
        }

        await _context.SaveChangesAsync();
        return Result<PhieuBanGiaoResponse>.Ok(phieu.ToResponse());
    }

    public async Task<Result<bool>> ChotBanGiaoAsync(long maPhieuBanGiao, ChotBanGiaoRequest request, long maNhanVienChot)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _context.PhieuBanGiaos
                .Include(p => p.DonThue).ThenInclude(d => d.ChiTietDonThues)
                .Include(p => p.ChiTietBanGiaos).ThenInclude(c => c.PhanCongThietBi).ThenInclude(pc => pc.ThietBi)
                .FirstOrDefaultAsync(p => p.MaPhieuBanGiao == maPhieuBanGiao);

            if (phieu == null)
                return Result<bool>.Loi(DomainConstants.Errors.NotFound, "Không tìm thấy phiếu.");
            if (phieu.TrangThai == DomainConstants.Status.Delivered)
                return Result<bool>.Loi(DomainConstants.Errors.Locked, "Phiếu đã chốt.");

            // Kiểm tra đơn thuê phải ở trạng thái Sẵn sàng nhận và đủ số lượng thiết bị bàn giao (UC4.2)
            if (phieu.DonThue.TrangThai != TrangThaiDonThue.SanSangNhan)
                return Result<bool>.Loi(DomainConstants.Errors.InvalidState, "Đơn thuê chưa ở trạng thái Sẵn sàng nhận để chốt bàn giao.");

            var tongSoLuongDon = phieu.DonThue.ChiTietDonThues.Sum(c => c.SoLuong);
            if (phieu.ChiTietBanGiaos.Count < tongSoLuongDon)
                return Result<bool>.Loi(DomainConstants.Errors.InvalidData, $"Chưa đủ thiết bị bàn giao ({phieu.ChiTietBanGiaos.Count}/{tongSoLuongDon}).");

            var nhanVienThucHien = await _context.LayNhanVienAsync(maNhanVienChot);
            var tenNhanVien = nhanVienThucHien?.HoTen ?? $"Nhân viên {maNhanVienChot}";

            phieu.ChotPhieu(request.TenNguoiNhanThucTe, tenNhanVien);
            if (nhanVienThucHien != null)
                phieu.MaNhanVien = nhanVienThucHien.MaNhanVien;

            // Kiểm tra điều kiện thanh toán qua Specification (bắt buộc nhân đủ SoLuong mỗi dòng — UC4.2)
            decimal tongTienYeuCau = phieu.DonThue.ChiTietDonThues.Sum(c =>
                (c.DonGiaThueMoiNgay * c.SoNgayTinhTien + c.MucCocMoiThietBi) * c.SoLuong - c.TienGiam);
            decimal tongDaDong = await _context.ThanhToans
                .Where(t => t.MaDonThue == phieu.MaDonThue && t.TrangThai == DomainConstants.Status.Success)
                .SumAsync(t => t.TongSoTien);

            var validationResult = BanGiaoValidationRules.KiemTraThanhToan(tongTienYeuCau, tongDaDong);
            if (!validationResult.ThanhCong)
                return validationResult;

            AuditLogHelper.GhiLichSuDon(
                _context,
                phieu.MaDonThue,
                nhanVienThucHien?.MaTaiKhoan ?? maNhanVienChot,
                TrangThaiDonThue.SanSangNhan.ToString(),
                TrangThaiDonThue.DangThue.ToString(),
                "Khách hàng đã nhận thiết bị thành công");

            return Result<bool>.Ok(true);
        }, _logger, IsolationLevel.Serializable);
    }
}
