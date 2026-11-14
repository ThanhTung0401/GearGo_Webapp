using System.Data;
using System.Security.Cryptography;
using System.Text;
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
        {
            request.MaKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, request.MaTaiKhoan.Value);
        }

        var inputCheck = DonThueValidationRules.KiemTraThoiGianVaGioHang(request);
        if (!inputCheck.ThanhCong)
            return Result<DonThueResponse>.Loi(inputCheck.MaLoi!, inputCheck.ThongDiep!);

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            // 0. Kiểm tra IdempotencyKey để chống tạo đơn trùng khi người dùng bấm đúp hoặc mạng retry
            var idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey)
                ? null
                : request.IdempotencyKey.Trim();

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
            int soNgayThue = CalculationHelpers.TinhSoNgayThue(request.GioNhanDuKien, request.GioTraDuKien);
            var now = DateTime.UtcNow;

            // W6-T1: dùng selector chung (LayDangHieuLucAsync); chặn tạo đơn nếu chưa có bản hiệu lực.
            var kqChinhSach = await _chinhSachService.LayDangHieuLucAsync(now);
            if (!kqChinhSach.ThanhCong || kqChinhSach.DuLieu is null)
                return Result<DonThueResponse>.Loi(
                    kqChinhSach.MaLoi ?? "CHUA_CO_CHINH_SACH_HIEU_LUC",
                    kqChinhSach.ThongDiep ?? "Chưa có chính sách hiệu lực để tạo đơn.");
            var chinhSachId = kqChinhSach.DuLieu.MaChinhSach;

            // Lấy thời gian giữ chỗ từ chính sách đang hiệu lực (fallback về hằng số mặc định nếu chưa cấu hình)
            int thoiGianGiuChoPhut = kqChinhSach.DuLieu.NoiDung?.ThoiGianGiuChoPhut is > 0
                ? kqChinhSach.DuLieu.NoiDung.ThoiGianGiuChoPhut.Value
                : DomainConstants.Policies.HoldTimeMinutes;
            var hanThanhToan = now.AddMinutes(thoiGianGiuChoPhut);

            decimal tongTienThueTruocGiam = request.ChiTiet.Sum(item =>
                sanPhams[item.MaSanPham].GiaThueMoiNgay * item.SoLuong * soNgayThue);
            decimal tongTienCoc = request.ChiTiet.Sum(item =>
                sanPhams[item.MaSanPham].MucCocMoiThietBi * item.SoLuong);

            decimal tongTienGiam = 0;
            KhuyenMai? khuyenMaiApDung = null;
            GearGo.Models.DTOs.KhuyenMai.KiemTraMaResult? kqKmChiTiet = null;

            if (!string.IsNullOrWhiteSpace(request.MaKhuyenMai))
            {
                try
                {
                    var kmItems = request.ChiTiet.Select(item =>
                    {
                        var sp = sanPhams[item.MaSanPham];
                        return new GearGo.Models.DTOs.KhuyenMai.DongBaoGiaItem
                        {
                            MaSanPham = item.MaSanPham,
                            MaDanhMuc = sp.MaDanhMuc,
                            SoLuong = item.SoLuong,
                            DonGiaThueMoiNgay = sp.GiaThueMoiNgay,
                            SoNgay = soNgayThue,
                            TienCocDong = sp.MucCocMoiThietBi * item.SoLuong
                        };
                    }).ToList();

                    kqKmChiTiet = await _khuyenMaiService.KiemTraApDungChiTietAsync(
                        request.MaKhuyenMai, 
                        request.MaKhachHang, 
                        kmItems);

                    if (!kqKmChiTiet.HopLe)
                    {
                        return Result<DonThueResponse>.Loi("KHUYEN_MAI_KHONG_HOP_LE", kqKmChiTiet.LyDoKhongHopLe ?? "Mã giảm giá không hợp lệ");
                    }

                    tongTienGiam = kqKmChiTiet.TongGiamGia;
                    khuyenMaiApDung = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == kqKmChiTiet.MaKhuyenMai);
                }
                catch (KhuyenMaiKhongHopLeException ex)
                {
                    return Result<DonThueResponse>.Loi(DomainConstants.Errors.InvalidPromotion, ex.Message);
                }
            }

            // 2.5. Đối chiếu báo giá kỳ vọng (UC3.2.2): nếu giá thuê/khuyến mãi thay đổi so với lúc khách xem
            // và khách chưa xác nhận DongYThayDoiGia = true, trả lỗi kèm báo giá mới để frontend hiển thị xác nhận
            var tongTienThueSauGiam = Math.Max(0m, tongTienThueTruocGiam - tongTienGiam);
            var tongThanhToanDuKien = tongTienThueSauGiam + tongTienCoc;
            var hashBaoGiaMoi = TaoHashBaoGia(request, sanPhams, soNgayThue, tongTienThueTruocGiam, tongTienGiam, tongTienCoc);

            if (!request.DongYThayDoiGia)
            {
                bool giaThayDoi = request.GiaTamTinhKyVong.HasValue
                    && Math.Abs(request.GiaTamTinhKyVong.Value - tongThanhToanDuKien) > 0.01m;
                bool hashThayDoi = !string.IsNullOrWhiteSpace(request.HashBaoGia)
                    && !string.Equals(request.HashBaoGia.Trim(), hashBaoGiaMoi, StringComparison.OrdinalIgnoreCase);

                if (giaThayDoi || hashThayDoi)
                {
                    return Result<DonThueResponse>.Loi(
                        "BAO_GIA_THAY_DOI",
                        $"Giá thuê hoặc ưu đãi đã thay đổi (tổng mới: {tongThanhToanDuKien:N0} đ). Vui lòng xác nhận báo giá mới.",
                        new
                        {
                            SoNgayThue = soNgayThue,
                            TongTienThueTruocGiam = tongTienThueTruocGiam,
                            TongTienGiam = tongTienGiam,
                            TongTienThueSauGiam = tongTienThueSauGiam,
                            TongTienCoc = tongTienCoc,
                            TongThanhToanDuKien = tongThanhToanDuKien,
                            HashBaoGia = hashBaoGiaMoi
                        });
                }
            }

            // 3. Khởi tạo Đơn thuê & Phân bổ Chi tiết + Giữ chỗ qua Rich Domain Model
            var donThueMoi = DonThue.KhoiTao(
                request,
                chinhSachId,
                now,
                tongTienThueTruocGiam,
                tongTienGiam,
                tongTienCoc,
                khuyenMaiApDung,
                hanThanhToan);

            _context.DonThues.Add(donThueMoi);
            await _context.SaveChangesAsync();

            // 8. Tạo ChiTietDonThue & GiuCho tương ứng
            // Sử dụng kết quả phân bổ từ PhanBoCacDong của IKhuyenMaiService (W6-T3)
            var mapGiamDong = kqKmChiTiet?.PhanBoCacDong.ToDictionary(p => p.MaSanPham, p => p.TienGiam)
                              ?? new Dictionary<long, decimal>();

            for (int i = 0; i < request.ChiTiet.Count; i++)
            {
                var item = request.ChiTiet[i];
                var sp = sanPhams[item.MaSanPham];
                decimal tienGiamDong = mapGiamDong.TryGetValue(item.MaSanPham, out var g) ? g : 0;

                var chiTiet = ChiTietDonThue.KhoiTao(donThueMoi.MaDonThue, sp, item.SoLuong, soNgayThue, tienGiamDong);
                var giuCho = chiTiet.TaoGiuCho(now, hanThanhToan);

                _context.ChiTietDonThues.Add(chiTiet);
                _context.GiuChos.Add(giuCho);
            }

            // 9. Giữ lượt khuyến mãi nếu có mã (kèm snapshot số tiền giảm)
            if (khuyenMaiApDung != null)
            {
                await _khuyenMaiService.GiuLuotV2Async(new GearGo.Models.DTOs.KhuyenMai.GiuLuotCommand
                {
                    MaKhuyenMai = khuyenMaiApDung.MaKhuyenMai,
                    MaDonThue = donThueMoi.MaDonThue,
                    MaKhachHang = request.MaKhachHang,
                    ThoiDiemHetHan = hanThanhToan,
                    SoTienGiamSnapshot = tongTienGiam
                });
            }

            // 4. Ghi lịch sử & Dọn giỏ hàng
            AuditLogHelper.GhiLichSuDon(
                _context,
                donThueMoi.MaDonThue,
                null,
                "KhoiTao",
                TrangThaiDonThue.ChoThanhToan.ToString(),
                "Khách hàng tạo đơn thuê thành công",
                now);

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
                return Result<bool>.Loi(DomainConstants.Errors.NotFound, "Không tìm thấy đơn thuê.");

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

            AuditLogHelper.GhiLichSuDon(
                _context,
                donThue.MaDonThue,
                maTaiKhoan,
                TrangThaiDonThue.ChoThanhToan.ToString(),
                trangThaiSau.ToString(),
                lyDo,
                now);

            return Result<bool>.Ok(true);
        }, _logger);
    }

    // Tạo chữ ký SHA256 cho báo giá dựa trên giỏ hàng, số ngày thuê, giá gốc, giảm giá và tiền cọc
    private static string TaoHashBaoGia(
        TaoDonThueRequest request,
        Dictionary<long, SanPham> sanPhams,
        int soNgayThue,
        decimal tongTienThueTruocGiam,
        decimal tongTienGiam,
        decimal tongTienCoc)
    {
        var itemsPart = string.Join("|", request.ChiTiet
            .OrderBy(c => c.MaSanPham)
            .Select(c =>
            {
                var sp = sanPhams[c.MaSanPham];
                return $"{c.MaSanPham}:{c.SoLuong}:{sp.GiaThueMoiNgay:F2}:{sp.MucCocMoiThietBi:F2}";
            }));
        var raw = $"{soNgayThue}|{tongTienThueTruocGiam:F2}|{tongTienGiam:F2}|{tongTienCoc:F2}|{request.MaKhuyenMai?.Trim().ToUpperInvariant() ?? ""}|{itemsPart}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }
}
