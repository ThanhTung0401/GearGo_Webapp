using System.Data;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using GearGo.Services.Specifications;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class DonThueService : IDonThueService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;
    private readonly IKhuyenMaiService _khuyenMaiService;
    private readonly ILogger<DonThueService> _logger;

    public DonThueService(
        ApplicationDbContext context,
        IKhaDungService khaDungService,
        IKhuyenMaiService khuyenMaiService,
        ILogger<DonThueService> logger)
    {
        _context = context;
        _khaDungService = khaDungService;
        _khuyenMaiService = khuyenMaiService;
        _logger = logger;
    }

    public async Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request)
    {
        var inputCheck = DonThueValidationRules.KiemTraThoiGianVaGioHang(request);
        if (!inputCheck.ThanhCong)
            return Result<DonThueResponse>.Loi(inputCheck.MaLoi!, inputCheck.ThongDiep!);

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            // 1. Kiểm tra sản phẩm & tồn kho khả dụng qua Specification
            var danhSachSpIds = request.ChiTiet.Select(c => c.MaSanPham).Distinct().ToList();
            var sanPhams = await _context.SanPhams
                .Where(s => danhSachSpIds.Contains(s.MaSanPham))
                .ToDictionaryAsync(s => s.MaSanPham);

            var spCheck = DonThueValidationRules.KiemTraSanPhamVaKhaDung(request, sanPhams);
            if (!spCheck.ThanhCong)
                return Result<DonThueResponse>.Loi(spCheck.MaLoi!, spCheck.ThongDiep!);

            var khaDungData = await _khaDungService.LayKhaDungNhieuAsync(
                danhSachSpIds, request.GioNhanDuKien, request.GioTraDuKien);

            var stockCheck = DonThueValidationRules.KiemTraSanPhamVaKhaDung(request, sanPhams, khaDungData);
            if (!stockCheck.ThanhCong)
                return Result<DonThueResponse>.Loi(stockCheck.MaLoi!, stockCheck.ThongDiep!);

            // 2. Tính số ngày thuê, tiền thuê, tiền cọc và khuyến mãi
            int soNgayThue = KietCalculationHelpers.TinhSoNgayThue(request.GioNhanDuKien, request.GioTraDuKien);
            var now = DateTime.UtcNow;
            var hanThanhToan = now.AddMinutes(KietDomainConstants.PolicyConfig.ThoiGianGiuChoPhut);

            var chinhSach = await _context.ChinhSachs
                .Where(c => c.ThoiDiemApDung <= now)
                .OrderByDescending(c => c.ThoiDiemApDung)
                .FirstOrDefaultAsync();

            decimal tongTienThueTruocGiam = request.ChiTiet.Sum(item =>
                sanPhams[item.MaSanPham].GiaThueMoiNgay * item.SoLuong * soNgayThue);
            decimal tongTienCoc = request.ChiTiet.Sum(item =>
                sanPhams[item.MaSanPham].MucCocMoiThietBi * item.SoLuong);

            decimal tongTienGiam = 0;
            KhuyenMai? khuyenMaiApDung = null;

            if (!string.IsNullOrWhiteSpace(request.MaKhuyenMai))
            {
                try
                {
                    var kqKm = await _khuyenMaiService.KiemTraApDungAsync(
                        request.MaKhuyenMai, request.MaKhachHang, danhSachSpIds, tongTienThueTruocGiam);
                    tongTienGiam = kqKm.SoTienDuocGiam;
                    khuyenMaiApDung = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == kqKm.MaKhuyenMai);
                }
                catch (KhuyenMaiKhongHopLeException ex)
                {
                    return Result<DonThueResponse>.Loi("KHUYEN_MAI_KHONG_HOP_LE", ex.Message);
                }
            }

            // 3. Khởi tạo Đơn thuê & Phân bổ Chi tiết + Giữ chỗ qua Rich Domain Model
            var donThueMoi = DonThue.KhoiTao(
                request,
                chinhSach?.MaChinhSach ?? KietDomainConstants.PolicyConfig.MaChinhSachMacDinh,
                now,
                tongTienThueTruocGiam,
                tongTienGiam,
                tongTienCoc,
                khuyenMaiApDung);

            _context.DonThues.Add(donThueMoi);
            await _context.SaveChangesAsync();

            var (chiTiets, giuChos) = donThueMoi.TaoDanhSachChiTietVaGiuCho(
                request.ChiTiet, sanPhams, soNgayThue, now);

            _context.ChiTietDonThues.AddRange(chiTiets);
            _context.GiuChos.AddRange(giuChos);

            if (khuyenMaiApDung != null)
            {
                await _khuyenMaiService.GiuLuotAsync(khuyenMaiApDung.MaKhuyenMai, donThueMoi.MaDonThue, hanThanhToan);
            }

            // 4. Ghi lịch sử & Dọn giỏ hàng
            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = donThueMoi.MaDonThue,
                TrangThaiTruoc = "KhoiTao",
                TrangThaiSau = TrangThaiDonThue.ChoThanhToan.ToString(),
                ThoiDiem = now,
                LyDo = "Khách hàng tạo đơn thuê thành công"
            });

            var gioThue = await _context.GioThues
                .Include(g => g.ChiTietGioThues)
                .FirstOrDefaultAsync(g => g.MaKhachHang == request.MaKhachHang);

            if (gioThue != null && gioThue.ChiTietGioThues.Any())
            {
                _context.ChiTietGioThues.RemoveRange(gioThue.ChiTietGioThues);
                gioThue.MaKhuyenMai = null;
            }

            return Result<DonThueResponse>.Ok(donThueMoi.ToResponse(hanThanhToan));
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<bool>> HuyDonAsync(long maDonThue, string lyDo, long maTaiKhoan)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                    .ThenInclude(c => c.GiuCho)
                .FirstOrDefaultAsync(d => d.MaDonThue == maDonThue);

            if (donThue == null)
                return Result<bool>.Loi("NOT_FOUND", "Không tìm thấy đơn thuê.");

            var taiKhoan = await _context.TaiKhoans.FindAsync(maTaiKhoan);
            bool laNoiBo = taiKhoan?.VaiTro is "NhanVien" or "QuanTriVien";

            if (!laNoiBo)
            {
                var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
                if (donThue.MaKhachHang != maKhach)
                    return Result<bool>.Loi("KHONG_CO_QUYEN", "Bạn không có quyền thao tác trên đơn thuê của người khác.");
            }

            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
                return Result<bool>.Loi("INVALID_STATE", "Chỉ có thể hủy đơn khi đang ở trạng thái Chờ thanh toán.");

            var now = DateTime.UtcNow;
            var trangThaiSau = donThue.HuyDon(maTaiKhoan, laNoiBo, lyDo, now);

            await _context.SaveChangesAsync();
            await _khuyenMaiService.GiaiPhongLuotAsync(donThue.MaDonThue);

            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = donThue.MaDonThue,
                MaNguoiThucHien = maTaiKhoan,
                TrangThaiTruoc = TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiSau = trangThaiSau.ToString(),
                ThoiDiem = now,
                LyDo = lyDo
            });

            return Result<bool>.Ok(true);
        }, _logger);
    }
}
