using System.Text.Json;
using GearGo.Data;
using GearGo.Integrations.Notifications;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace GearGo.Tests;

/// <summary>
/// Hỗ trợ tạo cấu hình, bộ nhớ đệm và dữ liệu nền dùng chung cho bộ test 10 phân hệ.
/// </summary>
public static class TestHelpers
{
    public static IConfiguration CreateConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "GearGo_Super_Secret_Key_For_Testing_Only_1234567890!",
                ["Jwt:ExpiryMinutes"] = "60",
                ["TuVan:Provider"] = "Mock"
            })
            .Build();

    public static IMemoryCache CreateCache() => new MemoryCache(new MemoryCacheOptions());

    public static IHttpContextAccessor CreateHttpContextAccessor() =>
        new HttpContextAccessor { HttpContext = new DefaultHttpContext() };

    public static IEmailNotificationAdapter CreateMockEmailAdapter() =>
        new MockEmailNotificationAdapter(Microsoft.Extensions.Logging.Abstractions.NullLogger<MockEmailNotificationAdapter>.Instance);

    /// <summary>
    /// Khởi tạo dữ liệu nền gồm Admin, Nhân viên, Khách hàng, Chính sách hiệu lực, Danh mục, Sản phẩm và Thiết bị.
    /// </summary>
    public static async Task<SeedBundle> SeedCoBanAsync(ApplicationDbContext db)
    {
        var adminTk = new TaiKhoan
        {
            Email = "admin@geargo.vn",
            SoDienThoai = "0900000001",
            MatKhauBam = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            VaiTro = "QuanTriVien",
            TrangThai = "HoatDong"
        };
        var staffTk = new TaiKhoan
        {
            Email = "staff@geargo.vn",
            SoDienThoai = "0900000002",
            MatKhauBam = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
            VaiTro = "NhanVien",
            TrangThai = "HoatDong"
        };
        var khachTk = new TaiKhoan
        {
            Email = "khach@geargo.vn",
            SoDienThoai = "0900000003",
            MatKhauBam = BCrypt.Net.BCrypt.HashPassword("Khach@123"),
            VaiTro = "KhachHang",
            TrangThai = "HoatDong"
        };
        db.TaiKhoans.AddRange(adminTk, staffTk, khachTk);
        await db.SaveChangesAsync();

        var adminNv = new NhanVien
        {
            MaTaiKhoan = adminTk.MaTaiKhoan,
            HoTen = "Quản Trị Viên",
            TrangThaiLamViec = "DangLamViec"
        };
        var staffNv = new NhanVien
        {
            MaTaiKhoan = staffTk.MaTaiKhoan,
            HoTen = "Nhân Viên Vận Hành",
            TrangThaiLamViec = "DangLamViec"
        };
        var khach = new KhachHang
        {
            MaTaiKhoan = khachTk.MaTaiKhoan,
            HoTen = "Nguyễn Văn Khách",
            DiaChi = "123 Lê Lợi, Q.1, TP.HCM"
        };
        db.NhanViens.AddRange(adminNv, staffNv);
        db.KhachHangs.Add(khach);
        await db.SaveChangesAsync();

        var chinhSachJson = JsonSerializer.Serialize(new
        {
            phiHuyTruocGioNhan = 0.2m,
            gioMienPhiHuy = 48,
            phiTreHanMoiGio = 50000m,
            thoiHanThanhToanPhut = 30,
            gioDuTruVeSinh = 2,
            tyLeCocMacDinh = 0.5m
        });
        var chinhSach = new ChinhSach
        {
            MaNguoiTao = adminNv.MaNhanVien,
            TenChinhSach = "Chính sách chuẩn v1",
            PhienBan = 1,
            ThoiDiemApDung = DateTime.UtcNow.AddDays(-10),
            NoiDungChinhSach = chinhSachJson,
            NgayTao = DateTime.UtcNow.AddDays(-10)
        };
        db.ChinhSachs.Add(chinhSach);

        var danhMuc = new DanhMucSanPham
        {
            TenDanhMuc = "Lều cắm trại",
            ThuTuHienThi = 1,
            TrangThai = "HienThi"
        };
        db.DanhMucSanPhams.Add(danhMuc);
        await db.SaveChangesAsync();

        var sanPham = new SanPham
        {
            MaDanhMuc = danhMuc.MaDanhMuc,
            MaSanPhamHienThi = "SP-LEU-01",
            TenSanPham = "Lều 4 người chống mưa",
            ThuongHieu = "Naturehike",
            SucChua = 4,
            GiaThueMoiNgay = 200000m,
            MucCocMoiThietBi = 500000m,
            GiaTriBoiThuong = 2000000m,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };
        db.SanPhams.Add(sanPham);

        var ncc = new NhaCungCap
        {
            TenNhaCungCap = "Công ty Đồ Dã Ngoại VN",
            MaNhaCungCapHienThi = "NCC-001",
            SoDienThoai = "0281234567",
            Email = "ncc@geargo.vn",
            TrangThaiHopTac = "DangHopTac"
        };
        db.NhaCungCaps.Add(ncc);
        await db.SaveChangesAsync();

        var phieuNhap = new PhieuNhapHang
        {
            MaNhaCungCap = ncc.MaNhaCungCap,
            MaNguoiLap = adminNv.MaNhanVien,
            MaPhieuHienThi = "PN-001",
            NgayLap = DateTime.UtcNow.AddDays(-5),
            NgayNhapThucTe = DateTime.UtcNow.AddDays(-5),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 3000000m
        };
        db.PhieuNhapHangs.Add(phieuNhap);
        await db.SaveChangesAsync();

        var ctNhap = new ChiTietPhieuNhap
        {
            MaPhieuNhap = phieuNhap.MaPhieuNhap,
            MaSanPham = sanPham.MaSanPham,
            TenSanPhamLucNhap = sanPham.TenSanPham,
            SoLuong = 3,
            DonGiaNhap = 1000000m
        };
        db.ChiTietPhieuNhaps.Add(ctNhap);
        await db.SaveChangesAsync();

        var tb1 = new ThietBi
        {
            MaChiTietPhieuNhap = ctNhap.MaChiTietPhieuNhap,
            MaSanPhamHienTai = sanPham.MaSanPham,
            MaThietBiHienThi = "TB-LEU-001",
            NgayNhap = DateTime.UtcNow.AddDays(-5),
            GiaNhap = 1000000m,
            TinhTrang = "Moi",
            TrangThaiSuDung = TrangThaiThietBi.SanSang
        };
        var tb2 = new ThietBi
        {
            MaChiTietPhieuNhap = ctNhap.MaChiTietPhieuNhap,
            MaSanPhamHienTai = sanPham.MaSanPham,
            MaThietBiHienThi = "TB-LEU-002",
            NgayNhap = DateTime.UtcNow.AddDays(-5),
            GiaNhap = 1000000m,
            TinhTrang = "Moi",
            TrangThaiSuDung = TrangThaiThietBi.SanSang
        };
        db.ThietBis.AddRange(tb1, tb2);
        await db.SaveChangesAsync();

        return new SeedBundle(adminTk, staffTk, khachTk, adminNv, staffNv, khach, chinhSach, danhMuc, sanPham, ncc, phieuNhap, tb1, tb2);
    }
}

public record SeedBundle(
    TaiKhoan AdminTk,
    TaiKhoan StaffTk,
    TaiKhoan KhachTk,
    NhanVien AdminNv,
    NhanVien StaffNv,
    KhachHang Khach,
    ChinhSach ChinhSach,
    DanhMucSanPham DanhMuc,
    SanPham SanPham,
    NhaCungCap NhaCungCap,
    PhieuNhapHang PhieuNhap,
    ThietBi ThietBi1,
    ThietBi ThietBi2);
