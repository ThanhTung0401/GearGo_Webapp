using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.BaoCao.TaiChinh;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Tests.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Bộ kiểm thử Báo cáo tài chính và số dư cần xử lý (W6-T5 - Kim Xuyến, UC25).
/// Kiểm thử các ca W6-T5-A01 đến W6-T5-A09 và các quy tắc nghiệp vụ cốt lõi:
/// - Doanh thu đơn hoàn tất, phí hủy, điều chỉnh sau hoàn tất, thu/hoàn thực tế, số dư cọc.
/// - Không fan-out số tiền khi có nhiều dòng đơn, nhiều đợt trả, nhiều phụ phí.
/// - Phân quyền quản trị viên, an toàn CSV.
/// </summary>
public class BaoCaoTaiChinhTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<ApplicationDbContext> _options;
    private readonly DongHoGia _clock = new();

    public BaoCaoTaiChinhTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    private ApplicationDbContext CreateContext() => new SqliteTestDbContext(_options);

    public void Dispose()
    {
        _connection.Dispose();
    }

    private async Task SeedUsersAsync(ApplicationDbContext context)
    {
        var adminTk = new TaiKhoan
        {
            MaTaiKhoan = 1,
            Email = "admin@geargo.vn",
            SoDienThoai = "0901000001",
            VaiTro = "QuanTriVien",
            TrangThai = "HoatDong"
        };
        var staffTk = new TaiKhoan
        {
            MaTaiKhoan = 2,
            Email = "staff@geargo.vn",
            SoDienThoai = "0901000002",
            VaiTro = "NhanVien",
            TrangThai = "HoatDong"
        };

        var adminNv = new NhanVien
        {
            MaNhanVien = 1,
            MaTaiKhoan = 1,
            HoTen = "Admin Quản Trị",
            TrangThaiLamViec = "DangLamViec"
        };

        var kh = new KhachHang
        {
            MaKhachHang = 1,
            MaTaiKhoan = 3,
            HoTen = "Khách Hàng A"
        };

        var cs = new ChinhSach
        {
            MaChinhSach = 1,
            MaNguoiTao = 1,
            TenChinhSach = "Chính sách chuẩn V1",
            PhienBan = 1,
            ThoiDiemApDung = _clock.Utc.AddMonths(-3),
            NoiDungChinhSach = "{\"TienCocPhanTram\": 100}"
        };

        var dm = new DanhMucSanPham
        {
            MaDanhMuc = 1,
            TenDanhMuc = "Lều cắm trại",
            TrangThai = "HoatDong"
        };

        var sp1 = new SanPham { MaSanPham = 1, MaSanPhamHienThi = "SP-01", TenSanPham = "Lều A", MaDanhMuc = 1, GiaThueMoiNgay = 100_000, MucCocMoiThietBi = 500_000, GiaTriBoiThuong = 2_000_000, TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh };
        var sp2 = new SanPham { MaSanPham = 2, MaSanPhamHienThi = "SP-02", TenSanPham = "Lều B", MaDanhMuc = 1, GiaThueMoiNgay = 100_000, MucCocMoiThietBi = 500_000, GiaTriBoiThuong = 2_000_000, TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh };
        var sp3 = new SanPham { MaSanPham = 3, MaSanPhamHienThi = "SP-03", TenSanPham = "Lều C", MaDanhMuc = 1, GiaThueMoiNgay = 100_000, MucCocMoiThietBi = 500_000, GiaTriBoiThuong = 2_000_000, TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh };

        context.TaiKhoans.AddRange(adminTk, staffTk, new TaiKhoan { MaTaiKhoan = 3, Email = "khach@geargo.vn", VaiTro = "KhachHang", TrangThai = "HoatDong" });
        context.NhanViens.Add(adminNv);
        context.KhachHangs.Add(kh);
        context.ChinhSachs.Add(cs);
        context.DanhMucSanPhams.Add(dm);
        context.SanPhams.AddRange(sp1, sp2, sp3);
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task W6_T5_A01_ThuThueVaCoc_PhiVaHoanCoc_DoanhThuVaDongTienDung()
    {
        // Thu thuê 400.000 + cọc 1.000.000, phí 200.000, hoàn cọc 800.000 và hoàn tất
        // Doanh thu: 600.000 (400k thuê + 200k phí); Thu: 1.400.000; Hoàn: 800.000; Cọc chưa tất toán: 0.
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 101,
            MaDonHienThi = "DH-101",
            MaKhachHang = 1,
            MaChinhSach = 1,
            NgayDat = now.AddDays(-5),
            TongTienThueTruocGiam = 400_000,
            TongTienGiam = 0,
            TongTienCoc = 1_000_000,
            TrangThai = TrangThaiDonThue.HoanTat,
            ThoiDiemHoanTat = now.AddDays(-1)
        };
        context.DonThues.Add(don);

        // Thanh toán thu ban đầu: 1.400.000
        var tt = new ThanhToan
        {
            MaThanhToan = 201,
            MaDonThue = 101,
            MaYeuCau = "REQ-201",
            TongSoTien = 1_400_000,
            PhuongThuc = "VNPay",
            TrangThai = "ThanhCong",
            ThoiDiemThanhCong = now.AddDays(-5)
        };
        context.ThanhToans.Add(tt);

        var ctThue = new ChiTietThanhToan
        {
            MaChiTietThanhToan = 301,
            MaThanhToan = 201,
            MucDich = "TienThue",
            SoTien = 400_000
        };
        var ctCoc = new ChiTietThanhToan
        {
            MaChiTietThanhToan = 302,
            MaThanhToan = 201,
            MucDich = "TienCoc",
            SoTien = 1_000_000
        };
        context.ChiTietThanhToans.AddRange(ctThue, ctCoc);

        // Đối soát gốc đã chốt: cọc 1.000.000, phụ phí 200.000, cần hoàn 800.000
        var dsGoc = new DoiSoatTienCoc
        {
            MaDoiSoat = 401,
            MaDonThue = 101,
            MaNguoiLap = 1,
            LoaiDoiSoat = "BanDau",
            TienCocDuocDoiSoat = 1_000_000,
            TongPhuPhiDuocDuyet = 200_000,
            SoTienCanHoan = 800_000,
            SoTienCanThuThem = 0,
            TrangThai = "DaChot",
            ThoiDiemLap = now.AddDays(-1),
            ThoiDiemChot = now.AddDays(-1)
        };
        context.DoiSoatTienCocs.Add(dsGoc);

        // Hoàn cọc 800.000 thành công
        var hoan = new HoanTien
        {
            MaHoanTien = 501,
            MaChiTietThanhToanGoc = 302,
            MaDoiSoat = 401,
            SoTien = 800_000,
            TrangThai = "ThanhCong",
            ThoiDiemYeuCau = now.AddDays(-1),
            ThoiDiemThanhCong = now.AddDays(-1)
        };
        context.HoanTiens.Add(hoan);
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        // 1. Kiểm tra doanh thu hoàn tất
        var dt = await service.LayDoanhThuHoanTatAsync(new LocTaiChinhRequest(), 1);
        Assert.True(dt.ThanhCong);
        Assert.Equal(400_000, dt.DuLieu!.TongDoanhThuThueSauGiam);
        Assert.Equal(200_000, dt.DuLieu.TongPhuPhiDoiSoatBanDau);
        Assert.Equal(600_000, dt.DuLieu.TongDoanhThuHoanTat);

        // 2. Kiểm tra dòng tiền thu / hoàn
        var th = await service.LayThuHoanAsync(new LocTaiChinhRequest(), 1);
        Assert.True(th.ThanhCong);
        Assert.Equal(1_400_000, th.DuLieu!.TongThuThucTe);
        Assert.Equal(800_000, th.DuLieu.TongHoanThucTe);
        Assert.Equal(600_000, th.DuLieu.DongTienRong);

        // 3. Kiểm tra cọc chưa tất toán
        var coc = await service.LayCocChuaTatToanAsync(new LocTaiChinhRequest(), 1);
        Assert.True(coc.ThanhCong);
        Assert.Equal(0, coc.DuLieu!.TongCocChuaTatToan);
        Assert.Equal(0, coc.DuLieu.SoDonConGiuCoc);
    }

    [Fact]
    public async Task W6_T5_A02_CungDonCoNhieuChiTiet_KhongFanOutSoTien()
    {
        // Cùng đơn có 3 dòng thuê, nhiều đợt thanh toán, tổng doanh thu vẫn giữ nguyên, không nhân đôi
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 102,
            MaDonHienThi = "DH-102",
            MaKhachHang = 1,
            MaChinhSach = 1,
            TongTienThueTruocGiam = 600_000,
            TongTienGiam = 50_000,
            TongTienCoc = 500_000,
            TrangThai = TrangThaiDonThue.HoanTat,
            ThoiDiemHoanTat = now.AddDays(-1)
        };
        context.DonThues.Add(don);

        // 3 dòng chi tiết đơn
        context.ChiTietDonThues.AddRange(
            new ChiTietDonThue { MaChiTietDon = 1, MaDonThue = 102, MaSanPham = 1, SoLuong = 1, DonGiaThueMoiNgay = 200_000, SoNgayTinhTien = 1, TienGiam = 20_000, MucCocMoiThietBi = 200_000 },
            new ChiTietDonThue { MaChiTietDon = 2, MaDonThue = 102, MaSanPham = 2, SoLuong = 1, DonGiaThueMoiNgay = 200_000, SoNgayTinhTien = 1, TienGiam = 20_000, MucCocMoiThietBi = 200_000 },
            new ChiTietDonThue { MaChiTietDon = 3, MaDonThue = 102, MaSanPham = 3, SoLuong = 1, DonGiaThueMoiNgay = 200_000, SoNgayTinhTien = 1, TienGiam = 10_000, MucCocMoiThietBi = 100_000 }
        );

        // Đối soát gốc đã chốt
        context.DoiSoatTienCocs.Add(new DoiSoatTienCoc
        {
            MaDoiSoat = 402,
            MaDonThue = 102,
            MaNguoiLap = 1,
            LoaiDoiSoat = "BanDau",
            TienCocDuocDoiSoat = 500_000,
            TongPhuPhiDuocDuyet = 50_000,
            SoTienCanHoan = 450_000,
            TrangThai = "DaChot",
            ThoiDiemChot = now.AddDays(-1)
        });

        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var dt = await service.LayDoanhThuHoanTatAsync(new LocTaiChinhRequest(), 1);
        Assert.True(dt.ThanhCong);
        // Doanh thu thuê sau giảm = 600.000 - 50.000 = 550.000; phụ phí = 50.000 => tổng = 600.000
        Assert.Equal(550_000, dt.DuLieu!.TongDoanhThuThueSauGiam);
        Assert.Equal(50_000, dt.DuLieu.TongPhuPhiDoiSoatBanDau);
        Assert.Equal(600_000, dt.DuLieu.TongDoanhThuHoanTat);
        Assert.Single(dt.DuLieu.Items);
    }

    [Fact]
    public async Task W6_T5_A03_DieuChinhPhi_DeltaCoDauTheoKyChot()
    {
        // Điều chỉnh phí -50.000 chốt ở kỳ: đối soát con TongPhuPhi = 150.000, đối soát gốc = 200.000 => Delta = -50.000
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 103,
            MaDonHienThi = "DH-103",
            MaKhachHang = 1,
            MaChinhSach = 1,
            TrangThai = TrangThaiDonThue.HoanTat,
            ThoiDiemHoanTat = now.AddDays(-10)
        };
        context.DonThues.Add(don);

        var dsGoc = new DoiSoatTienCoc
        {
            MaDoiSoat = 403,
            MaDonThue = 103,
            MaNguoiLap = 1,
            LoaiDoiSoat = "BanDau",
            TongPhuPhiDuocDuyet = 200_000,
            TrangThai = "DaChot",
            ThoiDiemChot = now.AddDays(-10)
        };
        context.DoiSoatTienCocs.Add(dsGoc);

        var dsDieuChinh = new DoiSoatTienCoc
        {
            MaDoiSoat = 404,
            MaDonThue = 103,
            MaDoiSoatGoc = 403,
            MaNguoiLap = 1,
            LoaiDoiSoat = "DieuChinh",
            TongPhuPhiDuocDuyet = 150_000,
            LyDoDieuChinh = "Giảm phí trễ do lỗi hệ thống",
            TrangThai = "DaChot",
            ThoiDiemChot = now.AddDays(-2)
        };
        context.DoiSoatTienCocs.Add(dsDieuChinh);
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var dc = await service.LayDieuChinhDoanhThuAsync(new LocTaiChinhRequest(), 1);
        Assert.True(dc.ThanhCong);
        Assert.Equal(-50_000, dc.DuLieu!.TongDeltaDoanhThu);
        Assert.Single(dc.DuLieu.Items);
        Assert.Equal(-50_000, dc.DuLieu.Items[0].DeltaPhuPhi);
    }

    [Fact]
    public async Task W6_T5_A04_CocThuThangTruocChuaTra_ReportSoDuHomNayVanHien()
    {
        // Cọc thu tháng trước 1.000.000 chưa trả/đối soát
        // Báo cáo số dư cọc hiện tại vẫn phải có 1.000.000
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 104,
            MaDonHienThi = "DH-104",
            MaKhachHang = 1,
            MaChinhSach = 1,
            NgayDat = now.AddDays(-40),
            TongTienCoc = 1_000_000,
            TrangThai = TrangThaiDonThue.DangThue
        };
        context.DonThues.Add(don);

        var tt = new ThanhToan
        {
            MaThanhToan = 204,
            MaDonThue = 104,
            TongSoTien = 1_000_000,
            PhuongThuc = "ChuyenKhoan",
            TrangThai = "ThanhCong",
            ThoiDiemThanhCong = now.AddDays(-40)
        };
        context.ThanhToans.Add(tt);

        context.ChiTietThanhToans.Add(new ChiTietThanhToan
        {
            MaChiTietThanhToan = 304,
            MaThanhToan = 204,
            MucDich = "TienCoc",
            SoTien = 1_000_000
        });
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var coc = await service.LayCocChuaTatToanAsync(new LocTaiChinhRequest(), 1);
        Assert.True(coc.ThanhCong);
        Assert.Equal(1_000_000, coc.DuLieu!.TongCocChuaTatToan);
        Assert.Single(coc.DuLieu.Items);
        Assert.Equal(1_000_000, coc.DuLieu.Items[0].CocConGiu);
    }

    [Fact]
    public async Task W6_T5_A05_ThuCanDoiChieuVaChuaPhanLoai_XuatHienTrongCanXuLy()
    {
        // Giao dịch 100.000 có cờ CanDoiChieu hoặc chưa phân loại đủ chi tiết
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 105,
            MaDonHienThi = "DH-105",
            MaKhachHang = 1,
            MaChinhSach = 1,
            TrangThai = TrangThaiDonThue.ChoDoiSoat
        };
        context.DonThues.Add(don);

        var tt = new ThanhToan
        {
            MaThanhToan = 205,
            MaDonThue = 105,
            MaYeuCau = "REQ-CAN-DOI-CHIEU",
            TongSoTien = 100_000,
            PhuongThuc = "VNPay",
            TrangThai = "ThanhCong",
            TrangThaiDoiChieu = "CanDoiChieu",
            ThoiDiemThanhCong = now.AddDays(-1),
            GhiChu = "Giao dịch lệch số tiền với đơn hàng"
        };
        context.ThanhToans.Add(tt);
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var cx = await service.LayKhoanCanXuLyAsync(new LocTaiChinhRequest(), 1);
        Assert.True(cx.ThanhCong);
        Assert.True(cx.DuLieu!.SoKhoanThuCanDoiChieu >= 1);
        Assert.Contains(cx.DuLieu.ThuCanDoiChieuItems, t => t.MaThanhToan == 205);
    }

    [Fact]
    public async Task W6_T5_A06_HoanPending_ChuaCongTongHoanThucTe()
    {
        // Hoàn 800.000 pending (ChoXuLy) -> chưa tính vào tổng hoàn thực tế; xuất hiện trong khoản đang chờ
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 106,
            MaDonHienThi = "DH-106",
            MaKhachHang = 1,
            MaChinhSach = 1,
            TrangThai = TrangThaiDonThue.ChoDoiSoat
        };
        context.DonThues.Add(don);

        var tt = new ThanhToan { MaThanhToan = 206, MaDonThue = 106, TongSoTien = 800_000, TrangThai = "ThanhCong", ThoiDiemThanhCong = now.AddDays(-3) };
        var ct = new ChiTietThanhToan { MaChiTietThanhToan = 306, MaThanhToan = 206, MucDich = "TienCoc", SoTien = 800_000 };
        context.ThanhToans.Add(tt);
        context.ChiTietThanhToans.Add(ct);

        var hoan = new HoanTien
        {
            MaHoanTien = 506,
            MaChiTietThanhToanGoc = 306,
            SoTien = 800_000,
            TrangThai = "ChoXuLy",
            ThoiDiemYeuCau = now.AddDays(-1)
        };
        context.HoanTiens.Add(hoan);
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var th = await service.LayThuHoanAsync(new LocTaiChinhRequest(), 1);
        Assert.True(th.ThanhCong);
        Assert.Equal(0, th.DuLieu!.TongHoanThucTe);

        var cx = await service.LayKhoanCanXuLyAsync(new LocTaiChinhRequest(), 1);
        Assert.True(cx.ThanhCong);
        Assert.Equal(1, cx.DuLieu!.SoKhoanHoanDangCho);
        Assert.Equal(800_000, cx.DuLieu.TongTienHoanDangCho);
    }

    [Fact]
    public async Task W6_T5_A07_CocDaBuPhi200kVaHoan800k_KhongBaoConGiuCoc()
    {
        // Cọc đã bù phí 200.000 và hoàn 800.000 -> Không báo còn giữ cọc 200.000
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 107,
            MaDonHienThi = "DH-107",
            MaKhachHang = 1,
            MaChinhSach = 1,
            TongTienCoc = 1_000_000,
            TrangThai = TrangThaiDonThue.HoanTat,
            ThoiDiemHoanTat = now.AddDays(-1)
        };
        context.DonThues.Add(don);

        var tt = new ThanhToan { MaThanhToan = 207, MaDonThue = 107, TongSoTien = 1_000_000, TrangThai = "ThanhCong", ThoiDiemThanhCong = now.AddDays(-5) };
        var ct = new ChiTietThanhToan { MaChiTietThanhToan = 307, MaThanhToan = 207, MucDich = "TienCoc", SoTien = 1_000_000 };
        context.ThanhToans.Add(tt);
        context.ChiTietThanhToans.Add(ct);

        var ds = new DoiSoatTienCoc
        {
            MaDoiSoat = 407,
            MaDonThue = 107,
            MaNguoiLap = 1,
            LoaiDoiSoat = "BanDau",
            TienCocDuocDoiSoat = 1_000_000,
            TongPhuPhiDuocDuyet = 200_000,
            SoTienCanHoan = 800_000,
            TrangThai = "DaChot",
            ThoiDiemChot = now.AddDays(-1)
        };
        context.DoiSoatTienCocs.Add(ds);

        var hoan = new HoanTien
        {
            MaHoanTien = 507,
            MaChiTietThanhToanGoc = 307,
            MaDoiSoat = 407,
            SoTien = 800_000,
            TrangThai = "ThanhCong",
            ThoiDiemThanhCong = now.AddDays(-1)
        };
        context.HoanTiens.Add(hoan);
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var coc = await service.LayCocChuaTatToanAsync(new LocTaiChinhRequest(), 1);
        Assert.True(coc.ThanhCong);
        Assert.Equal(0, coc.DuLieu!.TongCocChuaTatToan);
    }

    [Fact]
    public async Task W6_T5_A08_DonHoanTatThieuDoiSoat_XuatHienNgoaiLe()
    {
        // Đơn HoanTat nhưng thiếu đối soát gốc đã chốt
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 108,
            MaDonHienThi = "DH-108",
            MaKhachHang = 1,
            MaChinhSach = 1,
            TongTienThueTruocGiam = 500_000,
            TongTienGiam = 0,
            TrangThai = TrangThaiDonThue.HoanTat,
            ThoiDiemHoanTat = now.AddDays(-2)
        };
        context.DonThues.Add(don);
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var dt = await service.LayDoanhThuHoanTatAsync(new LocTaiChinhRequest(), 1);
        Assert.True(dt.ThanhCong);
        Assert.Single(dt.DuLieu!.Items);
        Assert.True(dt.DuLieu.Items[0].CoNgoaiLeThieuDoiSoat);

        var cx = await service.LayKhoanCanXuLyAsync(new LocTaiChinhRequest(), 1);
        Assert.True(cx.ThanhCong);
        Assert.Equal(1, cx.DuLieu!.SoDonHoanTatThieuDoiSoat);
    }

    [Fact]
    public async Task W6_T5_A09_NhanVienKhongCoQuyen_TraVeLoi403()
    {
        // Nhân viên gọi API báo cáo tài chính -> Bị chặn KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        // actorId = 2 (NhanVien)
        var dt = await service.LayDoanhThuHoanTatAsync(new LocTaiChinhRequest(), 2);
        Assert.False(dt.ThanhCong);
        Assert.Equal("KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH", dt.MaLoi);

        var csv = await service.XuatCsvAsync(new XuatCsvTaiChinhRequest { LoaiBaoCao = "DoanhThuHoanTat" }, 2);
        Assert.False(csv.ThanhCong);
        Assert.Equal("KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH", csv.MaLoi);
    }

    [Fact]
    public async Task XuatCsv_AnToanCongThucVaUtf8Bom()
    {
        // Xuất CSV an toàn chống injection: nếu ô bắt đầu bằng =,+,-,@ thì được bọc nháy đơn
        using var context = CreateContext();
        await SeedUsersAsync(context);

        var now = _clock.Utc;
        var don = new DonThue
        {
            MaDonThue = 110,
            MaDonHienThi = "=SUM(1,2)",
            MaKhachHang = 1,
            MaChinhSach = 1,
            TongTienThueTruocGiam = 300_000,
            TongTienGiam = 0,
            TrangThai = TrangThaiDonThue.HoanTat,
            ThoiDiemHoanTat = now.AddDays(-1)
        };
        context.DonThues.Add(don);
        await context.SaveChangesAsync();

        var doiSoatService = new DoiSoatService(context, null!, null!);
        var service = new BaoCaoTaiChinhService(context, doiSoatService, _clock);

        var result = await service.XuatCsvAsync(new XuatCsvTaiChinhRequest { LoaiBaoCao = LoaiBaoCaoTaiChinhXuat.DoanhThuHoanTat }, 1);
        Assert.True(result.ThanhCong);
        Assert.NotNull(result.DuLieu);
        Assert.NotEmpty(result.DuLieu!.NoiDung);

        var text = Encoding.UTF8.GetString(result.DuLieu.NoiDung);
        Assert.Contains("'=SUM(1,2)", text);
    }
}
