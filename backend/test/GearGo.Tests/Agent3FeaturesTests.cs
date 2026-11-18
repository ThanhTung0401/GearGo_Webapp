using System.Text;
using GearGo.Controllers.Public;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements.DonThue;
using GearGo.Services.Implements.HeThong;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.KhuyenMai;
using GearGo.Services.Implements.NoiDung;
using GearGo.Services.Implements.TaiChinh;
using GearGo.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Xunit;

namespace GearGo.Tests;

public class Agent3FeaturesTests
{
    private static (DuLieuMau Du, long MaDoiSoat) SeedDoiSoatThuBoSung(GearGo.Data.ApplicationDbContext ctx)
    {
        var du = Seed.CoBan(ctx);
        var don = new DonThue
        {
            MaKhachHang = du.KhachA,
            MaChinhSach = du.ChinhSach,
            MaDonHienThi = $"DT-{Guid.NewGuid():N}"[..12],
            GioNhanDuKien = DateTime.UtcNow.AddDays(-2),
            GioTraDuKien = DateTime.UtcNow.AddDays(-1),
            TrangThai = TrangThaiDonThue.DangThue
        };
        ctx.DonThues.Add(don);
        ctx.SaveChanges();

        var doiSoat = new DoiSoatTienCoc
        {
            MaDonThue = don.MaDonThue,
            MaNguoiLap = du.NhanVien,
            LoaiDoiSoat = "ThuBoSung",
            TienCocDuocDoiSoat = 500_000,
            TongPhuPhiDuocDuyet = 800_000,
            SoTienCanHoan = 0,
            SoTienCanThuThem = 300_000,
            TrangThai = "DaChot"
        };
        ctx.DoiSoatTienCocs.Add(doiSoat);
        ctx.SaveChanges();

        return (du, doiSoat.MaDoiSoat);
    }

    [Fact]
    public async Task TaoThuBoSung_ChuDonVaNhanVienHoatDong_ThanhCong_KhachKhacVaNghiViec_TraKhongCoQuyen()
    {
        using var db = new TestDb();
        using var ctx = db.NewContext();
        var (du, maDoiSoat) = SeedDoiSoatThuBoSung(ctx);

        // Tạo nhân viên đã nghỉ việc
        var tkNvNghi = new TaiKhoan
        {
            Email = "nvnghi_uc55@test.vn",
            SoDienThoai = "0900000088",
            VaiTro = "NhanVien",
            TrangThai = "HoatDong"
        };
        ctx.TaiKhoans.Add(tkNvNghi);
        ctx.SaveChanges();
        ctx.NhanViens.Add(new NhanVien
        {
            MaTaiKhoan = tkNvNghi.MaTaiKhoan,
            HoTen = "NV Nghỉ",
            TrangThaiLamViec = "DaNghiViec"
        });
        ctx.SaveChanges();

        var service = new ThanhToanService(ctx);
        var req = new TaoThuBoSungRequest { MaDoiSoat = maDoiSoat, PhuongThucDuocHoTro = "VNPAY" };

        // 1. Khách hàng khác đơn (KhachB) -> phải trả KHONG_CO_QUYEN (HTTP 403)
        var resKhachKhac = await service.TaoThuBoSungAsync(req, du.TkKhachB);
        Assert.False(resKhachKhac.ThanhCong);
        Assert.Equal("KHONG_CO_QUYEN", resKhachKhac.MaLoi);

        // 2. Nhân viên đã nghỉ việc -> phải trả KHONG_CO_QUYEN (HTTP 403)
        var resNvNghi = await service.TaoThuBoSungAsync(req, tkNvNghi.MaTaiKhoan);
        Assert.False(resNvNghi.ThanhCong);
        Assert.Equal("KHONG_CO_QUYEN", resNvNghi.MaLoi);

        // 3. Chủ đơn (KhachA) -> thành công
        var resChuDon = await service.TaoThuBoSungAsync(req, du.TkKhachA);
        Assert.True(resChuDon.ThanhCong);
        Assert.Equal(300_000, resChuDon.DuLieu!.SoTien);

        // 4. Nhân viên đang hoạt động -> thành công (idempotent trả giao dịch đang chờ)
        var resNv = await service.TaoThuBoSungAsync(req, du.TkNhanVien);
        Assert.True(resNv.ThanhCong);
    }

    [Fact]
    public async Task UploadHinhAnhDanhGia_AnhHopLe_Tra201_FileGiaMao_Tra400()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"geargo-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);
        try
        {
            var env = new FakeWebHostEnvironment(tempRoot);
            var controller = new DanhGiaController(null!, env);

            // 1. File PNG hợp lệ (magic bytes 89 50 4E 47 0D 0A 1A 0A)
            var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D };
            var validFile = new FormFile(new MemoryStream(pngBytes), 0, pngBytes.Length, "file", "review.png");
            var okRes = await controller.UploadHinhAnh(validFile) as ObjectResult;
            Assert.NotNull(okRes);
            Assert.Equal(201, okRes!.StatusCode);

            // 2. File giả mạo đuôi .png nhưng nội dung text
            var fakeBytes = Encoding.UTF8.GetBytes("not-a-real-png-file");
            var fakeFile = new FormFile(new MemoryStream(fakeBytes), 0, fakeBytes.Length, "file", "fake.png");
            var badRes = await controller.UploadHinhAnh(fakeFile) as BadRequestObjectResult;
            Assert.NotNull(badRes);
            Assert.Equal(400, badRes!.StatusCode);
        }
        finally
        {
            if (Directory.Exists(tempRoot)) Directory.Delete(tempRoot, recursive: true);
        }
    }

    private sealed class FakeWebHostEnvironment(string webRootPath) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "GearGo.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = webRootPath;
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = webRootPath;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
