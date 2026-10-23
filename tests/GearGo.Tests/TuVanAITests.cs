using GearGo.Configuration;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Integrations.AI;
using GearGo.Models.DTOs.TuVan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Implements;
using GearGo.Services.Interfaces;
using GearGo.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace GearGo.Tests;

public class TuVanAITests : IDisposable
{
    private readonly TestDb _db;

    public TuVanAITests()
    {
        _db = new TestDb();
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    private async Task SeedDataAsync(ApplicationDbContext context)
    {
        var dm = new DanhMucSanPham
        {
            MaDanhMuc = 1,
            TenDanhMuc = "Lều cắm trại",
            TrangThai = "HoatDong"
        };
        var dmGhe = new DanhMucSanPham
        {
            MaDanhMuc = 2,
            TenDanhMuc = "Bàn ghế dã ngoại",
            TrangThai = "HoatDong"
        };
        context.DanhMucSanPhams.AddRange(dm, dmGhe);

        var leu2 = new SanPham
        {
            MaSanPham = 1,
            MaDanhMuc = 1,
            MaSanPhamHienThi = "LEU-02",
            TenSanPham = "Lều cắm trại 2 người",
            SucChua = 2,
            GiaThueMoiNgay = 100000,
            MucCocMoiThietBi = 300000,
            GiaTriBoiThuong = 800000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };

        var leu4 = new SanPham
        {
            MaSanPham = 2,
            MaDanhMuc = 1,
            MaSanPhamHienThi = "LEU-04",
            TenSanPham = "Lều cắm trại 4 người",
            SucChua = 4,
            GiaThueMoiNgay = 180000,
            MucCocMoiThietBi = 500000,
            GiaTriBoiThuong = 1500000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };

        var ghe = new SanPham
        {
            MaSanPham = 3,
            MaDanhMuc = 2,
            MaSanPhamHienThi = "GHE-01",
            TenSanPham = "Ghế xếp dã ngoại",
            SucChua = null,
            GiaThueMoiNgay = 25000,
            MucCocMoiThietBi = 100000,
            GiaTriBoiThuong = 250000,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };

        context.SanPhams.AddRange(leu2, leu4, ghe);

        var taiKhoan = new TaiKhoan
        {
            MaTaiKhoan = 100,
            Email = "test@geargo.vn",
            SoDienThoai = "0987654321",
            VaiTro = "KhachHang",
            TrangThai = "HoatDong"
        };
        context.TaiKhoans.Add(taiKhoan);

        var khach = new KhachHang
        {
            MaKhachHang = 100,
            MaTaiKhoan = 100,
            HoTen = "Nguyễn Văn Test"
        };
        context.KhachHangs.Add(khach);

        await context.SaveChangesAsync();
    }

    private class MockKhaDungService : IKhaDungService
    {
        private readonly Dictionary<long, int> _stock;

        public MockKhaDungService(Dictionary<long, int>? stock = null)
        {
            _stock = stock ?? new Dictionary<long, int> { { 1, 10 }, { 2, 10 }, { 3, 20 } };
        }

        public Task<int> LayKhaDungAsync(long maSanPham, DateTime gioNhan, DateTime gioTra)
        {
            return Task.FromResult(_stock.TryGetValue(maSanPham, out var qty) ? qty : 0);
        }

        public Task<Dictionary<long, int>> LayKhaDungNhieuAsync(IEnumerable<long> maSanPhams, DateTime gioNhan, DateTime gioTra)
        {
            var dict = maSanPhams.ToDictionary(id => id, id => _stock.TryGetValue(id, out var qty) ? qty : 0);
            return Task.FromResult(dict);
        }
    }

    private class TestAiProvider : IAIProvider
    {
        public Func<TuVanBoDoRequest, List<AiCandidate>, AiProviderResult>? CustomHandler { get; set; }

        public Task<AiProviderResult> GoiAsync(TuVanBoDoRequest request, List<AiCandidate> candidates, CancellationToken cancellationToken = default)
        {
            if (CustomHandler != null)
            {
                return Task.FromResult(CustomHandler(request, candidates));
            }

            return Task.FromResult(new AiProviderResult
            {
                ThanhCong = true,
                ProviderUsed = "Mock",
                Selections = new List<AiSelection>
                {
                    new AiSelection { MaSanPham = 2, SoLuong = 1, LyDo = "Lều 4 người" },
                    new AiSelection { MaSanPham = 3, SoLuong = 4, LyDo = "4 ghế xếp" }
                }
            });
        }
    }

    [Fact]
    public async Task W5_T7_A01_CapacityProtection_WhenAiReturnsInsufficientTent_ShouldFallbackToRuleBased()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var provider = new TestAiProvider
        {
            // Model gợi ý lều 2 người trong khi khách cần 4 người
            CustomHandler = (req, cands) => new AiProviderResult
            {
                ThanhCong = true,
                ProviderUsed = "Mock",
                Selections = new List<AiSelection>
                {
                    new AiSelection { MaSanPham = 1, SoLuong = 1, LyDo = "Lều 2 người" }
                }
            }
        };

        var service = new TuVanAIService(
            ctx,
            provider,
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var res = await service.TuVanAsync(new TuVanBoDoRequest
        {
            SoNguoi = 4,
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(3)
        });

        // Server không chấp nhận lều 2 người, phải cung cấp giải pháp đủ sức chứa >= 4
        var tongSucChua = res.CacDong
            .Where(d => d.TenSanPham.Contains("Lều") && d.SucChua.HasValue)
            .Sum(d => d.SucChua!.Value * d.SoLuong);

        Assert.True(tongSucChua >= 4, $"Tổng sức chứa phải >= 4 người nhưng nhận được {tongSucChua}");
    }

    [Fact]
    public async Task W5_T7_A02_FilterInvalidModelOutput_WhenAiReturnsInvalidIdOrNegativeQty_ShouldFilterOut()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var provider = new TestAiProvider
        {
            // Model trả mã lạ 999999 và số lượng -1
            CustomHandler = (req, cands) => new AiProviderResult
            {
                ThanhCong = true,
                ProviderUsed = "Mock",
                Selections = new List<AiSelection>
                {
                    new AiSelection { MaSanPham = 999999, SoLuong = -1, LyDo = "Hàng bịa" }
                }
            }
        };

        var service = new TuVanAIService(
            ctx,
            provider,
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var res = await service.TuVanAsync(new TuVanBoDoRequest
        {
            SoNguoi = 2,
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(3)
        });

        // Đảm bảo không chứa mã lạ 999999 hoặc số lượng âm
        Assert.DoesNotContain(res.CacDong, d => d.MaSanPham == 999999 || d.SoLuong <= 0);
        Assert.NotEmpty(res.CacDong); // Fallback sang quy tắc thành công
    }

    [Fact]
    public async Task W5_T7_A03_RentalBudgetCheck_ShouldCompareOnlyRent_AndStillShowDeposit()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var service = new TuVanAIService(
            ctx,
            new TestAiProvider(),
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var res = await service.TuVanAsync(new TuVanBoDoRequest
        {
            SoNguoi = 4,
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(3), // 2 ngày
            NganSach = 600000,
            LoaiNganSach = "TienThue"
        });

        Assert.Equal("ThanhCong", res.TrangThai);
        Assert.NotNull(res.TongTienThue);
        Assert.NotNull(res.TongTienCoc);
        Assert.True(res.TongTienThue <= 600000);
        Assert.Equal(res.TongTienThue + res.TongTienCoc, res.TongBanDau);
    }

    [Fact]
    public async Task W5_T7_A04_InitialTotalBudgetCheck_ShouldCompareRentPlusDeposit()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var service = new TuVanAIService(
            ctx,
            new TestAiProvider(),
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var res = await service.TuVanAsync(new TuVanBoDoRequest
        {
            SoNguoi = 4,
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(3),
            NganSach = 100000, // Quá thấp cho cả thuê + cọc 4 người
            LoaiNganSach = "TongBanDau"
        });

        Assert.Equal("KhongTimThayPhuongAn", res.TrangThai);
        Assert.Contains("ngân sách", res.ThongBaoPhanThieu, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task W5_T7_A05_MissingRentalDates_ShouldReturnDailyEstimate_AndNullTotalRent()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var service = new TuVanAIService(
            ctx,
            new TestAiProvider(),
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var res = await service.TuVanAsync(new TuVanBoDoRequest
        {
            SoNguoi = 4
            // Không truyền GioNhan, GioTra
        });

        Assert.Equal("CanBoSungThongTin", res.TrangThai);
        Assert.Null(res.TongTienThue);
        Assert.Null(res.ThoiGianThueNgay);
        Assert.NotNull(res.TongTienCoc);
        Assert.NotNull(res.ThongBaoPhanThieu);
    }

    [Fact]
    public async Task W5_T7_A06_ProviderFallbackOnTimeoutOrError_ShouldUseRuleBased()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var provider = new TestAiProvider
        {
            CustomHandler = (req, cands) => new AiProviderResult
            {
                ThanhCong = false,
                Loi = "TIMEOUT_PROVIDER",
                ProviderUsed = "Mock"
            }
        };

        var service = new TuVanAIService(
            ctx,
            provider,
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var res = await service.TuVanAsync(new TuVanBoDoRequest
        {
            SoNguoi = 2,
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(2)
        });

        Assert.Equal("QuyTac", res.NguonGoiY);
        Assert.Equal("ThanhCong", res.TrangThai);
        Assert.NotEmpty(res.CacDong);
    }

    [Fact]
    public async Task W5_T7_A07_OutOfStockCartAdditionRollback_ShouldThrowException_AndNotAddPartially()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        // Khả dụng lều 4 người chỉ có 1 chiếc
        var stock = new Dictionary<long, int> { { 2, 1 }, { 3, 10 } };
        var service = new TuVanAIService(
            ctx,
            new TestAiProvider(),
            new GoiYBoDoService(),
            new MockKhaDungService(stock),
            NullLogger<TuVanAIService>.Instance);

        var req = new ThemBoDoRequest
        {
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(3),
            CacDong = new List<DongThemBoDoRequest>
            {
                new DongThemBoDoRequest { MaSanPham = 3, SoLuong = 2 },
                new DongThemBoDoRequest { MaSanPham = 2, SoLuong = 5 } // Cần 5 lều nhưng kho chỉ còn 1
            }
        };

        var ex = await Assert.ThrowsAsync<XungDotDuLieuException>(() => service.ThemBoDoVaoGioAsync(100, req));
        Assert.Equal("BO_DO_KHONG_CON_PHU_HOP", ex.MaLoi);

        // Kiểm tra không bị thêm dở dang 2 ghế vào giỏ
        var gio = await ctx.GioThues.Include(g => g.ChiTietGioThues).FirstOrDefaultAsync(g => g.MaKhachHang == 100);
        if (gio != null)
        {
            Assert.Empty(gio.ChiTietGioThues);
        }
    }

    [Fact]
    public async Task W5_T7_A08_DateConflictCartAddition_ShouldThrowException_WhenNotReplacing()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var service = new TuVanAIService(
            ctx,
            new TestAiProvider(),
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var ngayA1 = DateTime.UtcNow.AddDays(5);
        var ngayA2 = DateTime.UtcNow.AddDays(7);

        // 1. Thêm món với lịch A
        await service.ThemBoDoVaoGioAsync(100, new ThemBoDoRequest
        {
            GioNhan = ngayA1,
            GioTra = ngayA2,
            CacDong = new List<DongThemBoDoRequest> { new DongThemBoDoRequest { MaSanPham = 2, SoLuong = 1 } }
        });

        // 2. Thêm bộ đồ khác với lịch B và chọn GiuNguyen
        var ngayB1 = DateTime.UtcNow.AddDays(15);
        var ngayB2 = DateTime.UtcNow.AddDays(18);

        var ex = await Assert.ThrowsAsync<XungDotDuLieuException>(() => service.ThemBoDoVaoGioAsync(100, new ThemBoDoRequest
        {
            GioNhan = ngayB1,
            GioTra = ngayB2,
            CacDong = new List<DongThemBoDoRequest> { new DongThemBoDoRequest { MaSanPham = 3, SoLuong = 2 } },
            XuLyXungDotLich = "GiuNguyen"
        }));

        Assert.Equal("NGAY_GIO_KHAC_GIO_HIEN_TAI", ex.MaLoi);
    }

    [Fact]
    public async Task W5_T7_A09_NoHoldOnCartAddition_ShouldNotCreateGiuChoOrDonThue()
    {
        using var ctx = _db.NewContext();
        await SeedDataAsync(ctx);

        var service = new TuVanAIService(
            ctx,
            new TestAiProvider(),
            new GoiYBoDoService(),
            new MockKhaDungService(),
            NullLogger<TuVanAIService>.Instance);

        var req = new ThemBoDoRequest
        {
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(3),
            CacDong = new List<DongThemBoDoRequest>
            {
                new DongThemBoDoRequest { MaSanPham = 2, SoLuong = 1 },
                new DongThemBoDoRequest { MaSanPham = 3, SoLuong = 2 }
            }
        };

        var result = await service.ThemBoDoVaoGioAsync(100, req);
        Assert.True(result);

        // Khẳng định giỏ hàng không giữ chỗ kho (GIU_CHO) và không tạo đơn thuê (DON_THUE)
        Assert.Empty(await ctx.GiuChos.ToListAsync());
        Assert.Empty(await ctx.DonThues.ToListAsync());
    }
}
