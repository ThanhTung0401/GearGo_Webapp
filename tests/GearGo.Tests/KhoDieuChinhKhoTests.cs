using System.Text.Json;
using GearGo.Data;
using GearGo.Models.DTOs.DieuChinhKho;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Services.Queries;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

using GearGo.Tests.Infrastructure;

namespace GearGo.Tests;

public class KhoDieuChinhKhoTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<ApplicationDbContext> _options;

    public KhoDieuChinhKhoTests()
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

    private async Task SeedBasicDataAsync(ApplicationDbContext context)
    {
        var tkNv = new TaiKhoan
        {
            MaTaiKhoan = 10,
            Email = "minhtu@geargo.vn",
            SoDienThoai = "0901234567",
            VaiTro = "Staff",
            TrangThai = "HoatDong"
        };

        var tkQt = new TaiKhoan
        {
            MaTaiKhoan = 1,
            Email = "admin@geargo.vn",
            SoDienThoai = "0909999999",
            VaiTro = "Admin",
            TrangThai = "HoatDong"
        };

        context.TaiKhoans.AddRange(tkNv, tkQt);
        await context.SaveChangesAsync();

        var nhanVien = new NhanVien
        {
            MaNhanVien = 10,
            MaTaiKhoan = 10,
            HoTen = "Minh Tú (Kho)"
        };

        var quanTri = new NhanVien
        {
            MaNhanVien = 1,
            MaTaiKhoan = 1,
            HoTen = "Admin Minh"
        };

        var ncc = new NhaCungCap
        {
            MaNhaCungCap = 1,
            MaNhaCungCapHienThi = "NCC-SONY",
            TenNhaCungCap = "Sony Vietnam",
            SoDienThoai = "0908888888",
            DiaChi = "TP.HCM"
        };

        var dm = new DanhMucSanPham
        {
            MaDanhMuc = 1,
            TenDanhMuc = "Máy ảnh Mirrorless",
            TrangThai = "HienThi"
        };

        context.NhanViens.AddRange(nhanVien, quanTri);
        context.NhaCungCaps.Add(ncc);
        context.DanhMucSanPhams.Add(dm);
        await context.SaveChangesAsync();

        var sp = new SanPham
        {
            MaSanPham = 100,
            MaSanPhamHienThi = "SP-SONY-A7M4",
            TenSanPham = "Sony A7 IV",
            MaDanhMuc = 1,
            GiaThueMoiNgay = 400_000,
            MucCocMoiThietBi = 10_000_000,
            GiaTriBoiThuong = 50_000_000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };

        context.SanPhams.Add(sp);
        await context.SaveChangesAsync();

        var pn = new PhieuNhapHang
        {
            MaPhieuNhap = 1,
            MaNhaCungCap = 1,
            MaNguoiLap = 10,
            MaPhieuHienThi = "PN-202610-001",
            NgayLap = DateTime.UtcNow.AddDays(-10),
            NgayNhapThucTe = DateTime.UtcNow.AddDays(-10),
            TrangThai = TrangThaiPhieuNhap.DaNhapKho,
            TongTien = 90_000_000
        };

        var ctpn = new ChiTietPhieuNhap
        {
            MaChiTietPhieuNhap = 1,
            MaPhieuNhap = 1,
            MaSanPham = 100,
            SoLuong = 2,
            DonGiaNhap = 45_000_000
        };

        var tb1 = new ThietBi
        {
            MaThietBi = 101,
            MaChiTietPhieuNhap = 1,
            MaSanPhamHienTai = 100,
            MaThietBiHienThi = "SN-SONY-001",
            TrangThaiSuDung = TrangThaiThietBi.SanSang,
            GiaNhap = 45_000_000,
            NgayNhap = DateTime.UtcNow.AddDays(-10)
        };

        var tb2 = new ThietBi
        {
            MaThietBi = 102,
            MaChiTietPhieuNhap = 1,
            MaSanPhamHienTai = 100,
            MaThietBiHienThi = "SN-SONY-002",
            TrangThaiSuDung = TrangThaiThietBi.DangThue,
            GiaNhap = 45_000_000,
            NgayNhap = DateTime.UtcNow.AddDays(-10)
        };

        var tb3 = new ThietBi
        {
            MaThietBi = 103,
            MaChiTietPhieuNhap = 1,
            MaSanPhamHienTai = 100,
            MaThietBiHienThi = "SN-SONY-003",
            TrangThaiSuDung = TrangThaiThietBi.DangBaoTri,
            GiaNhap = 45_000_000,
            NgayNhap = DateTime.UtcNow.AddDays(-10)
        };

        context.PhieuNhapHangs.Add(pn);
        context.ChiTietPhieuNhaps.Add(ctpn);
        context.ThietBis.AddRange(tb1, tb2, tb3);

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task KhoService_LayTongQuanKho_ThongKeChinhXac()
    {
        using var context = CreateContext();
        await SeedBasicDataAsync(context);

        var service = new KhoService(context);
        var res = await service.LayTongQuanKhoAsync(new LocKhoRequest(), 1, true);

        Assert.True(res.ThanhCong);
        var data = res.DuLieu!;
        Assert.Equal(3, data.TongHoSoThietBi);
        Assert.Equal(1, data.SanSangTaiKho);
        Assert.Equal(1, data.DangChoThue);
        Assert.Equal(1, data.DangBaoTri);
        Assert.Equal(135_000_000, data.TongGiaTriNhap);
    }

    [Fact]
    public async Task KhoService_DoiChieuKiemKe_PhanBietDungDangThueVaBaoTri()
    {
        using var context = CreateContext();
        await SeedBasicDataAsync(context);

        var service = new KhoService(context);

        // Quét thực tế: chỉ quét SN-SONY-001 (tại kho) và mã lạ SN-UNKNOWN-999
        // SN-SONY-002 đang thuê, SN-SONY-003 đang bảo trì -> thuộc DanhSachDangLuuHanhNgoaiKho
        var req = new DoiChieuKiemKeRequest
        {
            DanhSachMaQuet = new List<string> { "SN-SONY-001", "SN-UNKNOWN-999" }
        };

        var res = await service.LayDoiChieuKiemKeAsync(req, 10);

        Assert.True(res.ThanhCong);
        var data = res.DuLieu!;
        Assert.Single(data.DanhSachKhop);
        Assert.Empty(data.DanhSachThieu);
        Assert.Single(data.DanhSachMaLa);
        Assert.Equal(2, data.DanhSachDangLuuHanhNgoaiKho.Count);

        Assert.Contains("SN-UNKNOWN-999", data.DanhSachMaLa);
        Assert.Contains(data.DanhSachDangLuuHanhNgoaiKho, x => x.MaThietBiHienThi == "SN-SONY-002");
    }

    [Fact]
    public async Task DieuChinhKhoService_TaoPhieuVaDuyet_CapNhatThietBi()
    {
        using var context = CreateContext();
        await SeedBasicDataAsync(context);

        var service = new DieuChinhKhoService(context);

        // 1. Lập phiếu điều chỉnh ngừng sử dụng cho SN-SONY-001
        var req = new LapDieuChinhKhoRequest
        {
            LoaiDieuChinh = "NgungSuDung",
            LyDo = "Phát hiện nứt kính khi kiểm kê kho",
            ChiTiet = new List<DongDieuChinhRequest>
            {
                new DongDieuChinhRequest
                {
                    MaThietBi = 101,
                    GiaTriDeNghiSau = new { GhiChu = "Bể kính ngắm" },
                    GhiChu = "Bể kính ngắm viewfinder"
                }
            }
        };

        var taoRes = await service.LapPhieuAsync(req, 10);
        Assert.True(taoRes.ThanhCong);
        var maPhieu = taoRes.DuLieu!.MaPhieuDieuChinh;

        // 2. Gửi duyệt
        var guiRes = await service.GuiDuyetAsync(maPhieu, 10);
        Assert.True(guiRes.ThanhCong);
        Assert.Equal("ChoDuyet", guiRes.DuLieu!.TrangThai);

        // 3. Quản trị duyệt và áp dụng
        var duyetRes = await service.DuyetVaApDungAsync(maPhieu, 1);
        Assert.True(duyetRes.ThanhCong);
        Assert.Equal("DaApDung", duyetRes.DuLieu!.TrangThai);

        // 4. Kiểm tra trạng thái thiết bị trong DB đã chuyển thành NgungSuDung
        using var verifyCtx = CreateContext();
        var tb = await verifyCtx.ThietBis.FindAsync(101L);
        Assert.NotNull(tb);
        Assert.Equal(TrangThaiThietBi.NgungSuDung, tb.TrangThaiSuDung);
    }

    [Fact]
    public async Task GiaTriNhapHieuLucQuery_TinhDungDeltaGiaNhap()
    {
        using var context = CreateContext();
        await SeedBasicDataAsync(context);

        // Tạo một phiếu điều chỉnh đã duyệt giảm giá nhập 5.000.000 cho CTPN #1
        var phieu = new PhieuDieuChinhKho
        {
            MaPhieuDieuChinh = 99,
            MaPhieuNhapLienQuan = 1,
            LoaiDieuChinh = "SaiGiaNhap",
            LyDo = "NCC chiết khấu bổ sung 5tr",
            TrangThai = "DaApDung",
            MaNguoiLap = 10,
            MaNguoiDuyet = 1,
            ThoiDiemLap = DateTime.UtcNow,
            ThoiDiemApDung = DateTime.UtcNow
        };

        phieu.ChiTietDieuChinhKhos.Add(new ChiTietDieuChinhKho
        {
            MaChiTietDieuChinh = 1,
            MaPhieuDieuChinh = 99,
            MaChiTietPhieuNhap = 1,
            GiaTriTruoc = JsonSerializer.Serialize(new { DonGiaNhap = 45000000m }),
            GiaTriSau = JsonSerializer.Serialize(new { DonGiaNhap = 40000000m }),
            GhiChu = "Chiết khấu sau nghiệm thu"
        });

        context.PhieuDieuChinhKhos.Add(phieu);
        await context.SaveChangesAsync();

        var kq = await GiaTriNhapHieuLucQuery.TinhGiaTriHieuLucPhieuNhapAsync(context, 1);

        Assert.NotNull(kq);
        Assert.Equal(90_000_000, kq.TongTienGoc);
        Assert.Equal(-10_000_000, kq.TongChenhLechGiaTri); // 2 máy * (-5.000.000)
        Assert.Equal(80_000_000, kq.TongTienHieuLuc);
        Assert.Equal(2, kq.TongSoLuongHieuLuc);
        Assert.Single(kq.ChuoiDieuChinhDaApDung);
    }
}
