using System.Data;
using System.Text.Json;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class DonThueService : IDonThueService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService _khaDungService;
    private readonly IKhuyenMaiService _khuyenMaiService;

    public DonThueService(
        ApplicationDbContext context,
        IKhaDungService khaDungService,
        IKhuyenMaiService khuyenMaiService)
    {
        _context = context;
        _khaDungService = khaDungService;
        _khuyenMaiService = khuyenMaiService;
    }

    public async Task<Result<DonThueResponse>> TaoDonThueAsync(TaoDonThueRequest request)
    {
        if (request.ChiTiet == null || request.ChiTiet.Count == 0)
            return Result<DonThueResponse>.Loi("GIO_HANG_RONG", "Đơn thuê phải có ít nhất 1 sản phẩm.");

        if (request.GioTraDuKien <= request.GioNhanDuKien)
            return Result<DonThueResponse>.Loi("THOI_GIAN_KHONG_HOP_LE", "Thời gian trả phải sau thời gian nhận.");

        if (request.GioNhanDuKien < DateTime.UtcNow.AddMinutes(-5))
            return Result<DonThueResponse>.Loi("THOI_GIAN_QUA_KHU", "Không thể đặt thuê với thời gian bắt đầu trong quá khứ.");

        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            // 1. Kiểm tra tồn tại và trạng thái kinh doanh của sản phẩm
            var danhSachSpIds = request.ChiTiet.Select(c => c.MaSanPham).Distinct().ToList();
            var sanPhams = await _context.SanPhams
                .Where(s => danhSachSpIds.Contains(s.MaSanPham))
                .ToDictionaryAsync(s => s.MaSanPham);

            foreach (var item in request.ChiTiet)
            {
                if (!sanPhams.TryGetValue(item.MaSanPham, out var sp))
                    return Result<DonThueResponse>.Loi("SAN_PHAM_NOT_FOUND", $"Không tìm thấy sản phẩm #{item.MaSanPham}");

                if (sp.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh)
                    return Result<DonThueResponse>.Loi("SAN_PHAM_NGUNG_KINH_DOANH", 
                        $"Sản phẩm '{sp.TenSanPham}' hiện đang tạm ngừng hoặc ngừng kinh doanh.");

                if (item.SoLuong <= 0)
                    return Result<DonThueResponse>.Loi("SO_LUONG_KHONG_HOP_LE", "Số lượng thuê phải lớn hơn 0.");
            }

            // 2. Kiểm tra tồn kho khả dụng
            var khaDungData = await _khaDungService.LayKhaDungNhieuAsync(danhSachSpIds, request.GioNhanDuKien, request.GioTraDuKien);
            foreach (var item in request.ChiTiet)
            {
                if (!khaDungData.TryGetValue(item.MaSanPham, out var slKhaDung) || slKhaDung < item.SoLuong)
                {
                    var sp = sanPhams[item.MaSanPham];
                    return Result<DonThueResponse>.Loi("HET_HANG", 
                        $"Sản phẩm '{sp.TenSanPham}' không đủ số lượng khả dụng trong khoảng thời gian đã chọn.");
                }
            }

            // 3. Tính số ngày thuê (Tối thiểu 1 ngày, làm tròn lên theo mốc 24h)
            var soGio = (request.GioTraDuKien - request.GioNhanDuKien).TotalHours;
            int soNgayThue = (int)Math.Ceiling(soGio / 24.0);
            if (soNgayThue < 1) soNgayThue = 1;

            // 4. Lấy chính sách đang có hiệu lực tại thời điểm hiện tại
            var now = DateTime.UtcNow;
            var chinhSach = await _context.ChinhSachs
                .Where(c => c.ThoiDiemApDung <= now)
                .OrderByDescending(c => c.ThoiDiemApDung)
                .FirstOrDefaultAsync();

            var hanThanhToan = now.AddMinutes(15);

            // 5. Tính toán tiền thuê gốc và tiền cọc
            decimal tongTienThueTruocGiam = 0;
            decimal tongTienCoc = 0;

            foreach (var item in request.ChiTiet)
            {
                var sp = sanPhams[item.MaSanPham];
                tongTienThueTruocGiam += sp.GiaThueMoiNgay * item.SoLuong * soNgayThue;
                tongTienCoc += sp.MucCocMoiThietBi * item.SoLuong;
            }

            // 6. Xử lý khuyến mãi nếu có
            decimal tongTienGiam = 0;
            KhuyenMai? khuyenMaiApDung = null;

            if (!string.IsNullOrWhiteSpace(request.MaKhuyenMai))
            {
                try
                {
                    var kqKm = await _khuyenMaiService.KiemTraApDungAsync(
                        request.MaKhuyenMai, 
                        request.MaKhachHang, 
                        danhSachSpIds, 
                        tongTienThueTruocGiam);

                    tongTienGiam = kqKm.SoTienDuocGiam;
                    khuyenMaiApDung = await _context.KhuyenMais.FirstOrDefaultAsync(k => k.MaKhuyenMai == kqKm.MaKhuyenMai);
                }
                catch (KhuyenMaiKhongHopLeException ex)
                {
                    await transaction.RollbackAsync();
                    return Result<DonThueResponse>.Loi("KHUYEN_MAI_KHONG_HOP_LE", ex.Message);
                }
            }

            // 7. Khởi tạo thực thể DonThue
            var donThueMoi = new DonThue
            {
                MaKhachHang = request.MaKhachHang,
                MaChinhSach = chinhSach?.MaChinhSach ?? 1,
                MaDonHienThi = $"DH{now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..4].ToUpper()}",
                NgayDat = now,
                GioNhanDuKien = request.GioNhanDuKien,
                GioTraDuKien = request.GioTraDuKien,
                HanThanhToan = hanThanhToan,
                TenNguoiNhan = request.TenNguoiNhan,
                SoDienThoaiNguoiNhan = request.SoDienThoaiNguoiNhan,
                EmailLienHe = request.EmailLienHe,
                GhiChu = request.GhiChu,
                TongTienThueTruocGiam = tongTienThueTruocGiam,
                TongTienGiam = tongTienGiam,
                TongTienCoc = tongTienCoc,
                TrangThai = TrangThaiDonThue.ChoThanhToan,
                KhuyenMaiLucDat = khuyenMaiApDung != null ? JsonSerializer.Serialize(new
                {
                    khuyenMaiApDung.MaGiamGia,
                    khuyenMaiApDung.TenKhuyenMai,
                    khuyenMaiApDung.LoaiGiam,
                    khuyenMaiApDung.GiaTriGiam,
                    SoTienGiam = tongTienGiam
                }) : null
            };

            _context.DonThues.Add(donThueMoi);
            await _context.SaveChangesAsync();

            // 8. Tạo ChiTietDonThue & GiuCho tương ứng
            // Phân bổ tiền giảm cho từng dòng
            decimal tienGiamConLai = tongTienGiam;
            for (int i = 0; i < request.ChiTiet.Count; i++)
            {
                var item = request.ChiTiet[i];
                var sp = sanPhams[item.MaSanPham];
                var tienThueDong = sp.GiaThueMoiNgay * item.SoLuong * soNgayThue;

                decimal tienGiamDong = 0;
                if (tongTienThueTruocGiam > 0 && tongTienGiam > 0)
                {
                    if (i == request.ChiTiet.Count - 1)
                    {
                        tienGiamDong = tienGiamConLai; // Dòng cuối nhận phần làm tròn còn lại
                    }
                    else
                    {
                        tienGiamDong = Math.Round((tienThueDong / tongTienThueTruocGiam) * tongTienGiam, 0);
                        tienGiamConLai -= tienGiamDong;
                    }
                }

                var chiTiet = new ChiTietDonThue
                {
                    MaDonThue = donThueMoi.MaDonThue,
                    MaSanPham = item.MaSanPham,
                    TenSanPhamLucDat = sp.TenSanPham,
                    DonGiaThueMoiNgay = sp.GiaThueMoiNgay,
                    MucCocMoiThietBi = sp.MucCocMoiThietBi,
                    GiaTriBoiThuongMoiThietBi = sp.GiaTriBoiThuong,
                    SoLuong = item.SoLuong,
                    SoNgayTinhTien = soNgayThue,
                    TienGiam = tienGiamDong,
                    PhuKienVaMucBoiThuongLucDat = sp.ThongSo
                };

                _context.ChiTietDonThues.Add(chiTiet);

                var giuCho = new GiuCho
                {
                    ChiTietDonThue = chiTiet,
                    ThoiDiemTao = now,
                    ThoiDiemHetHan = hanThanhToan,
                    TrangThai = TrangThaiGiuCho.DangGiu
                };

                _context.GiuChos.Add(giuCho);
            }

            // 9. Giữ lượt khuyến mãi nếu có mã
            if (khuyenMaiApDung != null)
            {
                await _khuyenMaiService.GiuLuotAsync(
                    khuyenMaiApDung.MaKhuyenMai,
                    donThueMoi.MaDonThue,
                    hanThanhToan);
            }

            // 10. Ghi nhận Lịch sử chuyển trạng thái đơn khởi tạo
            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = donThueMoi.MaDonThue,
                TrangThaiTruoc = "KhoiTao",
                TrangThaiSau = TrangThaiDonThue.ChoThanhToan.ToString(),
                ThoiDiem = now,
                LyDo = "Khách hàng tạo đơn thuê thành công"
            });

            // 11. Dọn dẹp giỏ thuê của khách hàng
            var gioThue = await _context.GioThues
                .Include(g => g.ChiTietGioThues)
                .FirstOrDefaultAsync(g => g.MaKhachHang == request.MaKhachHang);

            if (gioThue != null && gioThue.ChiTietGioThues.Any())
            {
                _context.ChiTietGioThues.RemoveRange(gioThue.ChiTietGioThues);
                gioThue.MaKhuyenMai = null;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var response = new DonThueResponse(
                donThueMoi.MaDonThue,
                donThueMoi.MaDonHienThi,
                donThueMoi.TongTienThueTruocGiam - donThueMoi.TongTienGiam,
                donThueMoi.TongTienCoc,
                donThueMoi.TrangThai.ToString(),
                donThueMoi.HanThanhToan ?? hanThanhToan
            );

            return Result<DonThueResponse>.Ok(response);
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<DonThueResponse>.Loi("LOI_HE_THONG", $"Lỗi tạo đơn thuê: {e.Message}");
        }
    }

    public async Task<Result<bool>> HuyDonAsync(long maDonThue, string lyDo, long maTaiKhoan)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var donThue = await _context.DonThues
                .Include(d => d.ChiTietDonThues)
                    .ThenInclude(c => c.GiuCho)
                .FirstOrDefaultAsync(d => d.MaDonThue == maDonThue);

            if (donThue == null)
                return Result<bool>.Loi("NOT_FOUND", "Không tìm thấy đơn thuê.");

            // 🔒 BẢO MẬT: Kiểm tra quyền sở hữu đơn (Chủ đơn hoặc Nhân viên/Admin)
            var taiKhoan = await _context.TaiKhoans.FindAsync(maTaiKhoan);
            bool laNoiBo = taiKhoan?.VaiTro is "NhanVien" or "QuanTriVien";

            if (!laNoiBo)
            {
                var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
                if (donThue.MaKhachHang != maKhach)
                {
                    return Result<bool>.Loi("KHONG_CO_QUYEN", "Bạn không có quyền thao tác trên đơn thuê của người khác.");
                }
            }

            // Chỉ cho phép hủy khi đang Chờ thanh toán
            if (donThue.TrangThai != TrangThaiDonThue.ChoThanhToan)
                return Result<bool>.Loi("INVALID_STATE", "Chỉ có thể hủy đơn khi đang ở trạng thái Chờ thanh toán.");

            var now = DateTime.UtcNow;
            var trangThaiSau = laNoiBo ? TrangThaiDonThue.CuaHangHuy : TrangThaiDonThue.KhachHuy;

            // 1. Cập nhật trạng thái đơn
            donThue.TrangThai = trangThaiSau;
            donThue.ThoiDiemHuy = now;
            donThue.LyDoHuy = lyDo;
            donThue.MaNguoiHuy = maTaiKhoan;

            // 2. Giải phóng giữ chỗ thiết bị
            foreach (var ct in donThue.ChiTietDonThues)
            {
                if (ct.GiuCho != null && ct.GiuCho.TrangThai == TrangThaiGiuCho.DangGiu)
                {
                    ct.GiuCho.TrangThai = TrangThaiGiuCho.DaGiaiPhong;
                    ct.GiuCho.ThoiDiemGiaiPhong = now;
                }
            }

            // Lưu thay đổi trạng thái đơn để IKhuyenMaiService.GiaiPhongLuotAsync kiểm tra thấy đơn đã hủy
            await _context.SaveChangesAsync();

            // 3. Giải phóng lượt khuyến mãi
            await _khuyenMaiService.GiaiPhongLuotAsync(donThue.MaDonThue);

            // 4. Ghi log lịch sử trạng thái
            _context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = donThue.MaDonThue,
                MaNguoiThucHien = maTaiKhoan,
                TrangThaiTruoc = TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiSau = trangThaiSau.ToString(),
                ThoiDiem = now,
                LyDo = lyDo
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Result<bool>.Ok(true);
        }
        catch (Exception e)
        {
            await transaction.RollbackAsync();
            return Result<bool>.Loi("SYS_ERROR", "Lỗi hủy đơn: " + e.Message);
        }
    }
}
