using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.GioThue;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class GioThueService : IGioThueService
{
    private readonly ApplicationDbContext _context;
    private readonly IBaoGiaService _baoGiaService;
    private readonly IKhuyenMaiService _khuyenMaiService;
    private readonly IKhaDungService _khaDungService;

    public GioThueService(
        ApplicationDbContext context,
        IBaoGiaService baoGiaService,
        IKhuyenMaiService khuyenMaiService,
        IKhaDungService khaDungService)
    {
        _context = context;
        _baoGiaService = baoGiaService;
        _khuyenMaiService = khuyenMaiService;
        _khaDungService = khaDungService;
    }

    // Chuyển đổi linh hoạt giữa MaTaiKhoan hoặc MaKhachHang để đảm bảo ràng buộc ngoại khóa KHACH_HANG
    private async Task<long> ResolveMaKhachHangAsync(long actorId)
    {
        // Ưu tiên tra theo MaTaiKhoan từ JWT trước để tránh trùng ID với MaKhachHang của khách hàng khác (IDOR)
        var khByTk = await _context.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == actorId);
        if (khByTk != null) return khByTk.MaKhachHang;

        var khByMa = await _context.KhachHangs.FirstOrDefaultAsync(k => k.MaKhachHang == actorId);
        if (khByMa != null) return khByMa.MaKhachHang;

        var tk = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);
        if (tk == null) return actorId;

        var newKh = new KhachHang
        {
            MaTaiKhoan = tk.MaTaiKhoan,
            HoTen = tk.Email?.Split('@')[0] ?? "KhachHang"
        };
        _context.KhachHangs.Add(newKh);
        await _context.SaveChangesAsync();
        return newKh.MaKhachHang;
    }

    // Lấy giỏ hiện có hoặc khởi tạo giỏ mới cho khách hàng
    private async Task<GioThue> GetOrCreateGioAsync(long maKhachHang)
    {
        var trueMaKhachHang = await ResolveMaKhachHangAsync(maKhachHang);
        var gio = await _context.GioThues
            .Include(g => g.ChiTietGioThues)
                .ThenInclude(c => c.SanPham)
            .Include(g => g.KhuyenMai)
            .FirstOrDefaultAsync(g => g.MaKhachHang == trueMaKhachHang);

        if (gio != null) return gio;

        gio = new GioThue { MaKhachHang = trueMaKhachHang, NgayCapNhat = DateTime.UtcNow };
        _context.GioThues.Add(gio);
        await _context.SaveChangesAsync();
        return gio;
    }

    public async Task<GioThueResponse> LayGioAsync(long maKhachHang)
    {
        var gio = await GetOrCreateGioAsync(maKhachHang);
        return await BuildResponseAsync(gio);
    }

    public async Task<GioThueResponse> ThemAsync(long maKhachHang, ThemVaoGioRequest req)
    {
        if (req.SoLuong <= 0)
            throw new DuLieuKhongHopLeException(DomainConstants.Errors.InvalidQuantity, "Số lượng thêm vào giỏ phải lớn hơn 0.");

        var sp = await _context.Set<SanPham>().FindAsync(req.MaSanPham)
            ?? throw new KhongTimThayException("Không tìm thấy sản phẩm");

        if (sp.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh)
        {
            throw new DuLieuKhongHopLeException(DomainConstants.Errors.ProductDiscontinued,
                "Sản phẩm đã ngừng kinh doanh hoặc tạm ngừng cho thuê, không thể thêm vào giỏ.");
        }

        var gio = await GetOrCreateGioAsync(maKhachHang);
        var chiTiet = gio.ChiTietGioThues.FirstOrDefault(c => c.MaSanPham == req.MaSanPham);
        if (chiTiet != null)
            chiTiet.SoLuong += req.SoLuong;
        else
            gio.ChiTietGioThues.Add(new ChiTietGioThue { MaSanPham = req.MaSanPham, SoLuong = req.SoLuong });

        gio.NgayCapNhat = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await BuildResponseAsync(gio);
    }

    public async Task<GioThueResponse> CapNhatSoLuongAsync(long maKhachHang, long maChiTiet, CapNhatSoLuongRequest req)
    {
        if (req.SoLuongMoi <= 0)
            throw new DuLieuKhongHopLeException(DomainConstants.Errors.InvalidQuantity, "Số lượng phải lớn hơn 0.");

        var gio = await GetOrCreateGioAsync(maKhachHang);
        var chiTiet = gio.ChiTietGioThues.FirstOrDefault(c => c.MaChiTietGio == maChiTiet)
            ?? throw new KhongTimThayException("Không tìm thấy dòng trong giỏ");

        chiTiet.SoLuong = req.SoLuongMoi;
        gio.NgayCapNhat = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await BuildResponseAsync(gio);
    }

    public async Task XoaChiTietAsync(long maKhachHang, long maChiTiet)
    {
        var gio = await GetOrCreateGioAsync(maKhachHang);
        var chiTiet = gio.ChiTietGioThues.FirstOrDefault(c => c.MaChiTietGio == maChiTiet);
        if (chiTiet == null) return;

        _context.ChiTietGioThues.Remove(chiTiet);
        gio.NgayCapNhat = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<GioThueResponse> DatThoiGianAsync(long maKhachHang, DatThoiGianRequest req)
    {
        if (req.GioNhan >= req.GioTra)
            throw new DuLieuKhongHopLeException(DomainConstants.Errors.InvalidRentalPeriod, "Giờ trả phải sau giờ nhận.");

        var gio = await GetOrCreateGioAsync(maKhachHang);
        gio.GioNhanDuKien = req.GioNhan;
        gio.GioTraDuKien = req.GioTra;
        gio.NgayCapNhat = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BuildResponseAsync(gio);
    }
}
