using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Entities;
using GearGo.Models.DTOs.GioThue;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements
{
    public class GioThueService : IGioThueService
    {
        private readonly ApplicationDbContext _context;
        private readonly IBaoGiaService _baoGiaService;
        
        // TODO: Mở comment 2 dòng này khi team gộp code (Người 2, Người 3)
        // private readonly IKhaDungService _khaDungService;
        // private readonly IKhuyenMaiService _khuyenMaiService;

        public GioThueService(ApplicationDbContext context, IBaoGiaService baoGiaService)
        {
            _context = context;
            _baoGiaService = baoGiaService;
        }

        // Chuyển đổi linh hoạt giữa MaTaiKhoan hoặc MaKhachHang để đảm bảo ràng buộc ngoại khóa KHACH_HANG
        private async Task<long> ResolveMaKhachHangAsync(long actorId)
        {
            // 1. Kiểm tra trực tiếp xem actorId có phải là MaKhachHang hợp lệ đã tồn tại
            var khByMa = await _context.KhachHangs.FirstOrDefaultAsync(k => k.MaKhachHang == actorId);
            if (khByMa != null) return khByMa.MaKhachHang;

            // 2. Kiểm tra xem actorId có phải là MaTaiKhoan (từ JWT claim) không
            var khByTk = await _context.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == actorId);
            if (khByTk != null) return khByTk.MaKhachHang;

            // 3. Nếu tài khoản tồn tại trong TAI_KHOAN nhưng chưa có bản ghi KHACH_HANG
            var tk = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);
            if (tk != null)
            {
                var newKh = new KhachHang
                {
                    MaTaiKhoan = tk.MaTaiKhoan,
                    HoTen = tk.Email?.Split('@')[0] ?? "KhachHang"
                };
                _context.KhachHangs.Add(newKh);
                await _context.SaveChangesAsync();
                return newKh.MaKhachHang;
            }

            return actorId;
        }

        // Hàm dùng chung: Lấy Giỏ hoặc Tạo mới nếu chưa có
        private async Task<GioThue> GetOrCreateGioAsync(long maKhachHang)
        {
            var trueMaKhachHang = await ResolveMaKhachHangAsync(maKhachHang);

            var gio = await _context.GioThues
                .Include(g => g.ChiTietGioThues)
                    .ThenInclude(c => c.SanPham) // Lấy kèm thông tin giá sản phẩm
                .Include(g => g.KhuyenMai)
                .FirstOrDefaultAsync(g => g.MaKhachHang == trueMaKhachHang);

            if (gio == null)
            {
                gio = new GioThue { MaKhachHang = trueMaKhachHang, NgayCapNhat = DateTime.UtcNow };
                _context.GioThues.Add(gio);
                await _context.SaveChangesAsync();
            }
            return gio;
        }

        // Hàm dùng chung: Đóng gói Response và gọi IBaoGiaService
        private async Task<GioThueResponse> BuildResponseAsync(GioThue gio)
        {
            var response = new GioThueResponse
            {
                MaGioThue = gio.MaGioThue,
                GioNhanDuKien = gio.GioNhanDuKien,
                GioTraDuKien = gio.GioTraDuKien,
                MaKhuyenMaiApDung = gio.KhuyenMai?.MaGiamGia
            };

            // Nếu chưa chọn ngày hoặc giỏ rỗng thì chỉ trả về thông tin cơ bản
            if (gio.GioNhanDuKien == null || gio.GioTraDuKien == null || !gio.ChiTietGioThues.Any())
            {
                return response;
            }

            // 1. Chuẩn bị dữ liệu tính báo giá
            var danhSachDong = gio.ChiTietGioThues.Select(c => new ChiTietBaoGiaRequest
            {
                MaSanPham = c.MaSanPham,
                SoLuong = c.SoLuong,
                DonGiaThueMoiNgay = c.SanPham.GiaThueMoiNgay,
                MucCocMoiThietBi = c.SanPham.MucCocMoiThietBi
            }).ToList();

            // 2. Tính toán tiền giảm khuyến mãi (Giả lập chờ KhuyenMaiService)
            decimal tienGiamTuKhuyenMai = 0; 
            // TODO: tienGiamTuKhuyenMai = await _khuyenMaiService.KiemTraApDungAsync(...);

            // 3. Gọi IBaoGiaService tính toán xương sống
            var baoGia = _baoGiaService.TinhBaoGia(gio.GioNhanDuKien.Value, gio.GioTraDuKien.Value, danhSachDong, tienGiamTuKhuyenMai);
            response.BaoGia = baoGia;

            // 4. Map chi tiết giỏ thuê và cắm cờ Ngừng Kinh Doanh
            foreach (var ct in gio.ChiTietGioThues)
            {
                var ctBaoGia = baoGia.ChiTiet.First(x => x.MaSanPham == ct.MaSanPham);
                response.ChiTiet.Add(new ChiTietGioThueResponse
                {
                    MaChiTietGio = ct.MaChiTietGio,
                    MaSanPham = ct.MaSanPham,
                    TenSanPham = ct.SanPham.TenSanPham,
                    SoLuong = ct.SoLuong,
                    DonGiaThueMoiNgay = ct.SanPham.GiaThueMoiNgay,
                    MucCocMoiThietBi = ct.SanPham.MucCocMoiThietBi,
                    TienThue = ctBaoGia.TienThue,
                    TienCoc = ctBaoGia.TienCoc,
                    TienGiam = ctBaoGia.TienGiam,
                    NgungKinhDoanh = ct.SanPham.TrangThaiKinhDoanh.ToString() != "DangKinhDoanh",// Cắm cờ bắt khách xoá dòng
                    SoLuongKhaDung = 999 // TODO: await _khaDungService.LayKhaDungAsync(...)
                });
            }

            return response;
        }

        public async Task<GioThueResponse> LayGioAsync(long maKhachHang)
        {
            var gio = await GetOrCreateGioAsync(maKhachHang);
            return await BuildResponseAsync(gio);
        }

        public async Task<GioThueResponse> ThemAsync(long maKhachHang, ThemVaoGioRequest req)
        {
            var gio = await GetOrCreateGioAsync(maKhachHang);
            var chiTiet = gio.ChiTietGioThues.FirstOrDefault(c => c.MaSanPham == req.MaSanPham);

            if (chiTiet != null)
            {
                chiTiet.SoLuong += req.SoLuong; // Cộng dồn
            }
            else
            {
                var sp = await _context.Set<SanPham>().FindAsync(req.MaSanPham);
                if (sp == null) throw new KhongTimThayException("Không tìm thấy sản phẩm");

                gio.ChiTietGioThues.Add(new ChiTietGioThue
                {
                    MaSanPham = req.MaSanPham,
                    SoLuong = req.SoLuong
                });
            }

            gio.NgayCapNhat = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return await BuildResponseAsync(gio);
        }

        public async Task<GioThueResponse> CapNhatSoLuongAsync(long maKhachHang, long maChiTiet, CapNhatSoLuongRequest req)
        {
            var gio = await GetOrCreateGioAsync(maKhachHang);
            var chiTiet = gio.ChiTietGioThues.FirstOrDefault(c => c.MaChiTietGio == maChiTiet);
            
            if (chiTiet == null) throw new KhongTimThayException("Không tìm thấy dòng trong giỏ");

            chiTiet.SoLuong = req.SoLuongMoi;
            gio.NgayCapNhat = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await BuildResponseAsync(gio);
        }

        public async Task XoaChiTietAsync(long maKhachHang, long maChiTiet)
        {
            var gio = await GetOrCreateGioAsync(maKhachHang);
            var chiTiet = gio.ChiTietGioThues.FirstOrDefault(c => c.MaChiTietGio == maChiTiet);
            
            if (chiTiet != null)
            {
                _context.ChiTietGioThues.Remove(chiTiet);
                gio.NgayCapNhat = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<GioThueResponse> DatThoiGianAsync(long maKhachHang, DatThoiGianRequest req)
        {
            var gio = await GetOrCreateGioAsync(maKhachHang);
            gio.GioNhanDuKien = req.GioNhan;
            gio.GioTraDuKien = req.GioTra;
            gio.NgayCapNhat = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return await BuildResponseAsync(gio);
        }

        public async Task<GioThueResponse> ApMaKhuyenMaiAsync(long maKhachHang, ApKhuyenMaiRequest req)
        {
            var gio = await GetOrCreateGioAsync(maKhachHang);
            
            var km = await _context.Set<KhuyenMai>().FirstOrDefaultAsync(k => k.MaGiamGia == req.MaGiamGia);
            if (km == null) throw new DuLieuKhongHopLeException("MA_GIAM_GIA_KHONG_HOP_LE", "Mã giảm giá không hợp lệ");

            gio.MaKhuyenMai = km.MaKhuyenMai;
            gio.NgayCapNhat = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return await BuildResponseAsync(gio);
        }
    }
}