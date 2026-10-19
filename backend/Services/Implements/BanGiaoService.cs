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

namespace GearGo.Services.Implements;

public class BanGiaoService : IBanGiaoService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BanGiaoService> _logger;

    public BanGiaoService(ApplicationDbContext context, ILogger<BanGiaoService> logger)
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
            return Result<PhieuBanGiaoResponse>.Loi(KietDomainConstants.ErrorCodes.NotFound, "Đơn thuê này chưa có biên bản bàn giao.");

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
                return Result<PhieuBanGiaoResponse>.Loi(KietDomainConstants.ErrorCodes.DonNotFound, "Không tìm thấy đơn thuê.");

            if (donThue.TrangThai != TrangThaiDonThue.SanSangNhan)
                return Result<PhieuBanGiaoResponse>.Loi(KietDomainConstants.ErrorCodes.InvalidState, "Đơn thuê chưa sẵn sàng bàn giao.");

            // Nếu đã có phiếu nháp thì lấy lên
            var phieuDaCo = await _context.PhieuBanGiaos
                .Include(p => p.ChiTietBanGiaos)
                .FirstOrDefaultAsync(p => p.MaDonThue == maDonThue);

            if (phieuDaCo != null)
                return Result<PhieuBanGiaoResponse>.Ok(phieuDaCo.ToResponse());

            // Khởi tạo phiếu nháp qua Actor Helper
            var nhanVienTao = await _context.LayNhanVienAsync(maNhanVienTao);
            var maNv = nhanVienTao?.MaNhanVien ?? maNhanVienTao;

            var phieuMoi = new PhieuBanGiao
            {
                MaDonThue = maDonThue,
                MaNhanVien = maNv,
                TrangThai = KietDomainConstants.PhieuStatus.ChoGiao,
                ThoiDiemLap = DateTime.UtcNow
            };

            _context.PhieuBanGiaos.Add(phieuMoi);

            var chiTietDonIds = donThue.ChiTietDonThues.Select(c => c.MaChiTietDon).ToList();
            var phanCongs = await _context.PhanCongThietBis
                .Where(pc => chiTietDonIds.Contains(pc.MaChiTietDon)
                             && pc.TrangThai == KietDomainConstants.PhieuStatus.DaPhanCong)
                .ToListAsync();

            foreach (var phanCong in phanCongs)
            {
                _context.ChiTietBanGiaos.Add(new ChiTietBanGiao
                {
                    PhieuBanGiao = phieuMoi,
                    MaPhanCong = phanCong.MaPhanCong,
                    TinhTrangTruocThue = KietDomainConstants.PhieuStatus.TinhTrangMacDinhBanGiao
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
            return Result<PhieuBanGiaoResponse>.Loi(KietDomainConstants.ErrorCodes.NotFound, "Không tìm thấy phiếu.");
        if (phieu.TrangThai == KietDomainConstants.PhieuStatus.DaGiao)
            return Result<PhieuBanGiaoResponse>.Loi(KietDomainConstants.ErrorCodes.Locked, "Phiếu đã chốt không thể sửa.");

        phieu.TenNguoiNhanThucTe = request.TenNguoiNhanThucTe;
        phieu.ThoiDiemKhachXacNhan = request.ThoiDiemKhachXacNhan;
        phieu.BangChungXacNhan = request.BangChungXacNhan;
        phieu.GhiChu = request.GhiChu;

        foreach (var reqChiTiet in request.ChiTiet)
        {
            var dbChiTiet = phieu.ChiTietBanGiaos
                .FirstOrDefault(c => c.MaPhanCong == reqChiTiet.MaPhanCong);

            if (dbChiTiet != null)
            {
                dbChiTiet.TinhTrangTruocThue = reqChiTiet.TinhTrangTruocThue;
                dbChiTiet.PhuKienThucGiao = reqChiTiet.PhuKienThucGiao;
                dbChiTiet.DanhSachAnh = reqChiTiet.DanhSachAnh;
                dbChiTiet.GhiChu = reqChiTiet.GhiChu;
            }
        }

        await _context.SaveChangesAsync();
        return Result<PhieuBanGiaoResponse>.Ok(phieu.ToResponse());
    }

    public async Task<Result<bool>> ChotBanGiaoAsync(long maPhieuBanGiao, ChotBanGiaoRequest request, long maNhanVienChot)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _context.PhieuBanGiaos
                .Include(p => p.DonThue)
                    .ThenInclude(d => d.ChiTietDonThues)
                .Include(p => p.ChiTietBanGiaos)
                    .ThenInclude(c => c.PhanCongThietBi)
                        .ThenInclude(pc => pc.ThietBi)
                .FirstOrDefaultAsync(p => p.MaPhieuBanGiao == maPhieuBanGiao);

            if (phieu == null)
                return Result<bool>.Loi(KietDomainConstants.ErrorCodes.NotFound, "Không tìm thấy phiếu.");
            if (phieu.TrangThai == KietDomainConstants.PhieuStatus.DaGiao)
                return Result<bool>.Loi(KietDomainConstants.ErrorCodes.Locked, "Phiếu đã chốt.");

            var nhanVienThucHien = await _context.LayNhanVienAsync(maNhanVienChot);
            var tenNhanVien = nhanVienThucHien?.HoTen ?? $"Nhân viên {maNhanVienChot}";

            // Chốt phiếu qua Rich Domain Method
            phieu.ChotPhieu(request.TenNguoiNhanThucTe, tenNhanVien);
            if (nhanVienThucHien != null)
            {
                phieu.MaNhanVien = nhanVienThucHien.MaNhanVien;
            }

            // Kiểm tra điều kiện thanh toán qua Specification
            decimal tongTienYeuCau = phieu.DonThue.ChiTietDonThues.Sum(c =>
                c.DonGiaThueMoiNgay * c.SoNgayTinhTien + c.MucCocMoiThietBi - c.TienGiam);
            decimal tongDaDong = await _context.ThanhToans
                .Where(t => t.MaDonThue == phieu.MaDonThue && t.TrangThai == KietDomainConstants.PhieuStatus.ThanhCong)
                .SumAsync(t => t.TongSoTien);

            var validationResult = BanGiaoValidationRules.KiemTraThanhToan(tongTienYeuCau, tongDaDong);
            if (!validationResult.ThanhCong)
                return validationResult;

            // Ghi lịch sử đơn
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
