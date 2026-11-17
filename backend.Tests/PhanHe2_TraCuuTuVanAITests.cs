using GearGo.Integrations.AI;
using GearGo.Models.DTOs.SanPham;
using GearGo.Models.DTOs.TuVan;
using GearGo.Services.Implements.Kho;
using GearGo.Services.Implements.NoiDung;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử Phân hệ 2: Tra cứu và tư vấn dụng cụ (UC2.1 – UC2.4.2).
/// </summary>
public class PhanHe2_TraCuuTuVanAITests
{
    [Fact]
    public async Task UC2_1_Den_UC2_3_TimKiemSanPham_Va_KiemTraKhaDung()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        var khaDungSvc = new KhaDungService(db);
        var spSvc = new SanPhamService(db, khaDungSvc);

        var list = await spSvc.TimKiemAsync(new TimKiemSanPhamRequest { TuKhoa = "Lều" });
        Assert.True(list.ThanhCong);
        Assert.Single(list.DuLieu!.Items);

        var detail = await spSvc.LayChiTietAsync(seed.SanPham.MaSanPham, new TimKiemSanPhamRequest
        {
            GioNhan = DateTime.UtcNow.AddDays(1),
            GioTra = DateTime.UtcNow.AddDays(3)
        });
        Assert.True(detail.ThanhCong);
        Assert.Equal(2, detail.DuLieu!.SoLuongKhaDung);
    }

    [Fact]
    public async Task UC2_4_TuVanBoDoAI_FallbackMock_TraVeGoiYVaThemVaoGio()
    {
        await using var db = TestDbFactory.CreateDb();
        var seed = await TestHelpers.SeedCoBanAsync(db);
        var khaDungSvc = new KhaDungService(db);
        var aiProvider = new AIProviderAdapter(
            Options.Create(new Configuration.TuVanOptions { Provider = "Mock" }),
            new DummyHttpClientFactory(),
            TestHelpers.CreateHttpContextAccessor(),
            NullLogger<AIProviderAdapter>.Instance);
        var goiYSvc = new GoiYBoDoService();
        var tuVanSvc = new TuVanAIService(db, aiProvider, goiYSvc, khaDungSvc, NullLogger<TuVanAIService>.Instance);

        var res = await tuVanSvc.TuVanAsync(new TuVanBoDoRequest
        {
            SoNguoi = 4,
            DiemDen = "Đà Lạt",
            GioNhan = DateTime.UtcNow.AddDays(2),
            GioTra = DateTime.UtcNow.AddDays(4)
        });

        Assert.NotNull(res);
        Assert.NotEmpty(res.CacDong);

        var added = await tuVanSvc.ThemBoDoVaoGioAsync(seed.KhachTk.MaTaiKhoan, new ThemBoDoRequest
        {
            GioNhan = DateTime.UtcNow.AddDays(2),
            GioTra = DateTime.UtcNow.AddDays(4),
            CacDong = res.CacDong.Select(x => new DongThemBoDoRequest { MaSanPham = x.MaSanPham, SoLuong = x.SoLuong }).ToList()
        });
        Assert.True(added);
    }

    private sealed class DummyHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }
}
