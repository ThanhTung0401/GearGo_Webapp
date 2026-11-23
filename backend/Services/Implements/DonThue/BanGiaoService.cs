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
            {
                // [HO-02] Đồng bộ lại ChiTietBanGiaos của phiếu nháp với các PhanCongThietBi hiệu lực.
                // Nếu nhân viên đã hủy gán rồi gán thiết bị mới, tránh để phiếu nháp giữ lại dòng cũ
                // khiến ChotBanGiaoAsync báo 400 "Chưa đủ thiết bị bàn giao".
                if (phieuDaCo.TrangThai == DomainConstants.Status.PendingDelivery)
                {
                    var chiTietDonIdsCu = await _context.ChiTietDonThues
                        .Where(c => c.MaDonThue == maDonThue)
                        .Select(c => c.MaChiTietDon)
                        .ToListAsync();
                    var phanCongHieuLuc = await _context.PhanCongThietBis
                        .Where(pc => chiTietDonIdsCu.Contains(pc.MaChiTietDon)
                                     && pc.TrangThai == DomainConstants.Status.Assigned)
                        .Select(pc => pc.MaPhanCong)
                        .ToListAsync();
                    var phanCongHieuLucSet = phanCongHieuLuc.ToHashSet();
                    var dangCo = phieuDaCo.ChiTietBanGiaos.Select(c => c.MaPhanCong).ToHashSet();

                    // Xóa các dòng tham chiếu đến phân công không còn hiệu lực.
                    var canXoa = phieuDaCo.ChiTietBanGiaos
                        .Where(c => !phanCongHieuLucSet.Contains(c.MaPhanCong))
                        .ToList();
                    if (canXoa.Count > 0)
                        _context.ChiTietBanGiaos.RemoveRange(canXoa);

                    // Thêm các MaPhanCong mới còn thiếu.
                    foreach (var maPcMoi in phanCongHieuLuc.Where(id => !dangCo.Contains(id)))
                    {
                        _context.ChiTietBanGiaos.Add(new ChiTietBanGiao
                        {
                            MaPhieuBanGiao = phieuDaCo.MaPhieuBanGiao,
                            MaPhanCong = maPcMoi,
                            TinhTrangTruocThue = DomainConstants.Status.DefaultHandoverCondition
                        });
                    }

                    if (canXoa.Count > 0 || phanCongHieuLuc.Any(id => !dangCo.Contains(id)))
                    {
                        await _context.SaveChangesAsync();
                        // Nạp lại bản đồ để ToResponse() phản ánh đúng.
                        await _context.Entry(phieuDaCo).Collection(p => p.ChiTietBanGiaos).LoadAsync();
                    }
                }
                return Result<PhieuBanGiaoResponse>.Ok(phieuDaCo.ToResponse());
            }

            var nhanVienTao = await _context.LayNhanVienAsync(maNhanVienTao);
            // [HO-03] Nếu tài khoản không có bản ghi trong bảng NHAN_VIEN (ví dụ Admin), fallback
            // lấy một nhân viên đang làm việc để tránh lỗi FK_PHIEU_BAN_GIAO_NHAN_VIEN khi gán
            // thẳng ma_tai_khoan vào cột ma_nhan_vien.
            long maNhanVienHopLe;
            if (nhanVienTao != null)
            {
                maNhanVienHopLe = nhanVienTao.MaNhanVien;
            }
            else
            {
                var fallbackMaNhanVien = await _context.NhanViens
                    .Where(n => n.TrangThaiLamViec == "DangLamViec")
                    .Select(n => (long?)n.MaNhanVien)
                    .FirstOrDefaultAsync();
                if (!fallbackMaNhanVien.HasValue)
                {
                    return Result<PhieuBanGiaoResponse>.Loi(
                        DomainConstants.Errors.InvalidState,
                        "Tài khoản hiện tại không phải nhân viên và không có nhân viên đang làm việc để lập phiếu bàn giao.");
                }
                maNhanVienHopLe = fallbackMaNhanVien.Value;
            }
            var phieuMoi = new PhieuBanGiao
            {
                MaDonThue = maDonThue,
                MaNhanVien = maNhanVienHopLe,
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

            // [HO-01] CRITICAL: SaveChangesAsync TRƯỚC khi gọi ToResponse() để EF Core sinh
            // MaPhieuBanGiao và MaChiTietBanGiao thực. Nếu không, Frontend sẽ nhận maPhieuBanGiao = 0
            // và PUT /api/ban-giao/nhap/0 trả 404 Không tìm thấy phiếu.
            await _context.SaveChangesAsync();

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
