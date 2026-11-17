using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Specifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.DonThue;

/// <summary>
/// Dịch vụ tạo mới và hủy đơn thuê (trước khi thanh toán).
/// </summary>
public partial class DonThueService : IDonThueService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;
    private readonly IKhuyenMaiService _khuyenMaiService;
    private readonly IChinhSachService _chinhSachService;
    private readonly ILogger<DonThueService> _logger;

    public DonThueService(
        ApplicationDbContext context,
        IKhaDungService khaDungService,
        IKhuyenMaiService khuyenMaiService,
        IChinhSachService chinhSachService,
        ILogger<DonThueService> logger)
    {
        _context = context;
        _khaDungService = khaDungService;
        _khuyenMaiService = khuyenMaiService;
        _chinhSachService = chinhSachService;
        _logger = logger;
    }

    public async Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request)
    {
        if (request.MaTaiKhoan.HasValue)
            request.MaKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, request.MaTaiKhoan.Value);

        var inputCheck = DonThueValidationRules.KiemTraThoiGianVaGioHang(request);
        if (!inputCheck.ThanhCong) return Result<DonThueResponse>.Loi(inputCheck.MaLoi!, inputCheck.ThongDiep!);

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim();
            if (idempotencyKey != null)
            {
                var donDaCo = await _context.DonThues
                    .FirstOrDefaultAsync(d => d.MaKhachHang == request.MaKhachHang && d.IdempotencyKey == idempotencyKey);
                if (donDaCo != null)
                {
                    var hanCu = donDaCo.HanThanhToan ?? donDaCo.NgayDat.AddMinutes(DomainConstants.Policies.HoldTimeMinutes);
                    return Result<DonThueResponse>.Ok(donDaCo.ToResponse(hanCu));
                }
            }

            var danhSachSpIds = request.ChiTiet.Select(c => c.MaSanPham).Distinct().ToList();
            var sanPhams = await _context.SanPhams.Where(s => danhSachSpIds.Contains(s.MaSanPham)).ToDictionaryAsync(s => s.MaSanPham);
            var spCheck = DonThueValidationRules.KiemTraSanPhamVaKhaDung(request, sanPhams);
            if (!spCheck.ThanhCong) return Result<DonThueResponse>.Loi(spCheck.MaLoi!, spCheck.ThongDiep!);

            var khaDungData = await _khaDungService.LayKhaDungNhieuAsync(danhSachSpIds, request.GioNhanDuKien, request.GioTraDuKien);
            var stockCheck = DonThueValidationRules.KiemTraSanPhamVaKhaDung(request, sanPhams, khaDungData);
            if (!stockCheck.ThanhCong) return Result<DonThueResponse>.Loi(stockCheck.MaLoi!, stockCheck.ThongDiep!);

            var now = DateTime.UtcNow;
            var kqChinhSach = await _chinhSachService.LayDangHieuLucAsync(now);
            if (!kqChinhSach.ThanhCong || kqChinhSach.DuLieu is null)
                return Result<DonThueResponse>.Loi(
                    kqChinhSach.MaLoi ?? "CHUA_CO_CHINH_SACH_HIEU_LUC",
                    kqChinhSach.ThongDiep ?? "Chưa có chính sách hiệu lực để tạo đơn.");

            int soNgayThue = CalculationHelpers.TinhSoNgayThue(request.GioNhanDuKien, request.GioTraDuKien);
            int thoiGianGiuChoPhut = kqChinhSach.DuLieu.NoiDung?.ThoiGianGiuChoPhut is > 0
                ? kqChinhSach.DuLieu.NoiDung.ThoiGianGiuChoPhut.Value
                : DomainConstants.Policies.HoldTimeMinutes;
            var hanThanhToan = now.AddMinutes(thoiGianGiuChoPhut);

            decimal tongTienThueTruocGiam = request.ChiTiet.Sum(item => sanPhams[item.MaSanPham].GiaThueMoiNgay * item.SoLuong * soNgayThue);
            decimal tongTienCoc = request.ChiTiet.Sum(item => sanPhams[item.MaSanPham].MucCocMoiThietBi * item.SoLuong);

            var kmResult = await KiemTraVaApDungKhuyenMaiAsync(request, sanPhams, soNgayThue);
            if (!kmResult.ThanhCong) return Result<DonThueResponse>.Loi(kmResult.MaLoi!, kmResult.ThongDiep!);
            var (tongTienGiam, khuyenMaiApDung, kqKmChiTiet) = kmResult.DuLieu!;

            var baoGiaCheck = KiemTraBaoGiaThayDoi(request, sanPhams, soNgayThue, tongTienThueTruocGiam, tongTienGiam, tongTienCoc);
            if (baoGiaCheck != null) return baoGiaCheck;

            var donThueMoi = Models.Entities.DonThue.KhoiTao(
                request, kqChinhSach.DuLieu.MaChinhSach, now, tongTienThueTruocGiam,
                tongTienGiam, tongTienCoc, khuyenMaiApDung, hanThanhToan);
            _context.DonThues.Add(donThueMoi);
            await _context.SaveChangesAsync();

            await LuuChiTietVaDonGioHangAsync(donThueMoi, request, sanPhams, soNgayThue, tongTienGiam, khuyenMaiApDung, kqKmChiTiet, now, hanThanhToan);
            return Result<DonThueResponse>.Ok(donThueMoi.ToResponse(hanThanhToan));
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<bool>> HuyDonAsync(long maDonThue, string lyDo, long maTaiKhoan)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.GiuCho)
                .FirstOrDefaultAsync(d => d.MaDonThue == maDonThue);
            if (donThue == null) return Result<bool>.Loi(DomainConstants.Errors.NotFound, "Không tìm thấy đơn thuê.");

            var taiKhoan = await _context.TaiKhoans.FindAsync(maTaiKhoan);
            bool laNoiBo = taiKhoan?.VaiTro is "NhanVien" or "QuanTriVien";
            if (!laNoiBo)
            {
                var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
                if (donThue.MaKhachHang != maKhach)
                    return Result<bool>.Loi(DomainConstants.Errors.Forbidden, "Bạn không có quyền thao tác trên đơn thuê của người khác.");
            }

            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
                return Result<bool>.Loi(DomainConstants.Errors.InvalidState, "Chỉ có thể hủy đơn khi đang ở trạng thái Chờ thanh toán.");

            var now = DateTime.UtcNow;
            var trangThaiSau = donThue.HuyDon(maTaiKhoan, laNoiBo, lyDo, now);
            await _context.SaveChangesAsync();
            await _khuyenMaiService.GiaiPhongLuotAsync(donThue.MaDonThue);

            AuditLogHelper.GhiLichSuDon(_context, donThue.MaDonThue, maTaiKhoan,
                TrangThaiDonThue.ChoThanhToan.ToString(), trangThaiSau.ToString(), lyDo, now);
            return Result<bool>.Ok(true);
        }, _logger);
    }

    /// <summary>
    /// Điều phối hủy đơn tương thích ngược: đơn đã xác nhận/đang thuê đi qua quy trình hoàn tiền Week 4, còn lại đi qua HuyDonAsync.
    /// </summary>
    public async Task<Result<object>> HuyDonTuongThichAsync(
        long maDonThue,
        string lyDo,
        long maTaiKhoan,
        IHuyDonService huyDonService,
        CancellationToken ct = default)
    {
        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == maDonThue, ct);
        if (don == null)
            return Result<object>.Loi(DomainConstants.Errors.NotFound, "Không tìm thấy đơn thuê.");

        if (don.TrangThai == TrangThaiDonThue.DaXacNhan || don.TrangThai == TrangThaiDonThue.DangThue)
        {
            var kqWeek4 = await huyDonService.KhachHuyAsync(maDonThue, new Models.DTOs.HuyDon.HuyDonRequest(lyDo), maTaiKhoan, ct);
            return Result<object>.Ok(kqWeek4);
        }

        var result = await HuyDonAsync(maDonThue, lyDo, maTaiKhoan);
        if (!result.ThanhCong)
            return Result<object>.Loi(result.MaLoi ?? "BAD_REQUEST", result.ThongDiep ?? "Không thể hủy đơn.");

        return Result<object>.Ok(new { message = "Đã hủy đơn thành công!", result.DuLieu });
    }
}
