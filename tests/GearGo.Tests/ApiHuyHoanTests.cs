using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using GearGo.Data;
using GearGo.Integrations.Payments;
using GearGo.Models.Enums;
using GearGo.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace GearGo.Tests;

/// <summary>
/// Kiểm thử qua HTTP: route, policy JWT, ExceptionHandlingMiddleware ({maLoi, thongDiep, chiTiet}) và mã trạng thái.
/// Database là SQLite in-memory thay cho SQL Server; job nền bị tắt để không chạy song song với test.
/// </summary>
public class ApiHuyHoanTests : IDisposable
{
    private const string JwtSecret = "GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!";
    private readonly TestDb _db = new();
    private readonly DuLieuMau _du;
    private readonly WebApplicationFactory<Program> _app;

    public ApiHuyHoanTests()
    {
        using (var ctx = _db.NewContext()) _du = Seed.CoBan(ctx);
        _app = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseEnvironment("Development");
            b.UseSetting("Jwt:SecretKey", JwtSecret);
            b.ConfigureServices(services =>
            {
                services.RemoveAll<IHostedService>();
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<ApplicationDbContext>();
                services.AddScoped<ApplicationDbContext>(_ => _db.NewContext());
                services.RemoveAll<IRefundGateway>();
                services.AddSingleton<IRefundGateway>(_db.Gateway);
                services.RemoveAll<TimeProvider>();
                services.AddSingleton<TimeProvider>(_db.Clock);
            });
        });
    }

    public void Dispose()
    {
        _app.Dispose();
        _db.Dispose();
    }

    private HttpClient Client(long? maTaiKhoan = null, string? vaiTro = null)
    {
        var c = _app.CreateClient();
        if (maTaiKhoan.HasValue)
        {
            var token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
                claims: new[] { new Claim("MaTaiKhoan", maTaiKhoan.Value.ToString()), new Claim(ClaimTypes.Role, vaiTro!) },
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret)), SecurityAlgorithms.HmacSha256)));
            c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        return c;
    }

    private HttpClient KhachA => Client(_du.TkKhachA, "KhachHang");
    private HttpClient KhachB => Client(_du.TkKhachB, "KhachHang");
    private HttpClient NhanVien => Client(_du.TkNhanVien, "NhanVien");
    private HttpClient QuanTri => Client(_du.TkQuanTri, "QuanTriVien");

    private Seed.DonMau Don(TimeSpan truocNhan)
    {
        using var ctx = _db.NewContext();
        return Seed.Don(ctx, _du, _db.Clock.Utc + truocNhan, TrangThaiDonThue.DaXacNhan);
    }

    private static async Task<JsonElement> Json(HttpResponseMessage r) => JsonDocument.Parse(await r.Content.ReadAsStringAsync()).RootElement;

    [Fact]
    public async Task HuyDon_LuongDayDu_QuaHttp()
    {
        var don = Don(TimeSpan.FromHours(36));

        Assert.Equal(HttpStatusCode.Unauthorized, (await Client().GetAsync($"/api/v1/don-thue/{don.MaDon}/huy/xem-truoc")).StatusCode);

        var xem = await KhachA.GetAsync($"/api/v1/don-thue/{don.MaDon}/huy/xem-truoc");
        Assert.Equal(HttpStatusCode.OK, xem.StatusCode);
        var bang = await Json(xem);
        Assert.Equal(300_000, bang.GetProperty("tienThueGiuLai").GetDecimal());
        var dau = bang.GetProperty("dauVanTay").GetString();

        // Dấu sai → 409 kèm bảng mới trong chiTiet.
        var sai = await KhachA.PostAsJsonAsync($"/api/v1/don-thue/{don.MaDon}/huy", new { lyDo = "x", xacNhanChiPhi = true, dauVanTayXemTruoc = "cu" });
        Assert.Equal(HttpStatusCode.Conflict, sai.StatusCode);
        var loi = await Json(sai);
        Assert.Equal("CHI_PHI_HUY_DA_THAY_DOI", loi.GetProperty("maLoi").GetString());
        Assert.Equal(dau, loi.GetProperty("chiTiet").GetProperty("DauVanTay").GetString());

        // Khách B: 404 không lộ đơn.
        var b = await KhachB.PostAsJsonAsync($"/api/v1/don-thue/{don.MaDon}/huy", new { lyDo = "x", xacNhanChiPhi = true, dauVanTayXemTruoc = dau });
        Assert.Equal(HttpStatusCode.NotFound, b.StatusCode);
        Assert.Equal("DON_KHONG_TIM_THAY", (await Json(b)).GetProperty("maLoi").GetString());

        var ok = await KhachA.PostAsJsonAsync($"/api/v1/don-thue/{don.MaDon}/huy", new { lyDo = "Bận", xacNhanChiPhi = true, dauVanTayXemTruoc = dau });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var kq = await Json(ok);
        Assert.Equal("KhachHuy", kq.GetProperty("trangThai").GetString());
        Assert.Equal(2, kq.GetProperty("yeuCauHoan").GetArrayLength());

        var ds = await Json(await KhachA.GetAsync($"/api/v1/hoan-tien/theo-don/{don.MaDon}"));
        Assert.Equal(1_300_000, ds.GetProperty("tongDaHoan").GetDecimal());
        Assert.Equal(HttpStatusCode.NotFound, (await KhachB.GetAsync($"/api/v1/hoan-tien/theo-don/{don.MaDon}")).StatusCode);

        var chiTiet = await Json(await KhachA.GetAsync($"/api/v1/don-thue/{don.MaDon}"));
        Assert.Equal("KhachHuy", chiTiet.GetProperty("taiChinh").GetProperty("huy").GetProperty("loaiHuy").GetString());
    }

    [Fact]
    public async Task PhanQuyen_CuaHangHuyVaThaoTacHoan()
    {
        var don = Don(TimeSpan.FromHours(5));
        Assert.Equal(HttpStatusCode.Forbidden, (await KhachA.PostAsJsonAsync($"/api/v1/van-hanh/don-thue/{don.MaDon}/cua-hang-huy", new { lyDo = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await NhanVien.PostAsJsonAsync($"/api/v1/van-hanh/don-thue/{don.MaDon}/cua-hang-huy", new { lyDo = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await KhachA.PostAsync("/api/v1/hoan-tien/1/xu-ly", null)).StatusCode);

        var dau = (await Json(await QuanTri.GetAsync($"/api/v1/van-hanh/don-thue/{don.MaDon}/cua-hang-huy/xem-truoc"))).GetProperty("dauVanTay").GetString();
        var r = await QuanTri.PostAsJsonAsync($"/api/v1/van-hanh/don-thue/{don.MaDon}/cua-hang-huy", new { lyDo = "Thiếu lều", xacNhanChiPhi = true, dauVanTayXemTruoc = dau });
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("CuaHangHuy", (await Json(r)).GetProperty("trangThai").GetString());

        // Đã hủy bởi quyết định khác → 409.
        var lai = await KhachA.PostAsJsonAsync($"/api/v1/don-thue/{don.MaDon}/huy", new { lyDo = "x" });
        Assert.Equal(HttpStatusCode.Conflict, lai.StatusCode);
        Assert.Equal("DON_DA_HUY_KHAC_Y_DINH", (await Json(lai)).GetProperty("maLoi").GetString());
    }

    [Fact]
    public async Task Callback_KhongXacThucJwt_NhungPhaiCoChuKy()
    {
        var don = Don(TimeSpan.FromHours(72));
        _db.Gateway.MacDinh = GatewayGia.DaTiepNhan;
        var dau = (await Json(await KhachA.GetAsync($"/api/v1/don-thue/{don.MaDon}/huy/xem-truoc"))).GetProperty("dauVanTay").GetString();
        var kq = await Json(await KhachA.PostAsJsonAsync($"/api/v1/don-thue/{don.MaDon}/huy", new { lyDo = "x", xacNhanChiPhi = true, dauVanTayXemTruoc = dau }));
        var ma = kq.GetProperty("yeuCauHoan")[0].GetProperty("maYeuCau").GetString()!;
        var soTien = kq.GetProperty("yeuCauHoan")[0].GetProperty("soTien").GetDecimal();

        var gia = await Client().PostAsJsonAsync("/api/v1/hoan-tien/ket-qua", new { maYeuCau = ma, soTien, trangThai = "ThanhCong", chuKy = "gia" });
        Assert.Equal(HttpStatusCode.BadRequest, gia.StatusCode);
        Assert.Equal("KET_QUA_HOAN_KHONG_KHOP", (await Json(gia)).GetProperty("maLoi").GetString());

        var that = await Client().PostAsJsonAsync("/api/v1/hoan-tien/ket-qua",
            new { maYeuCau = ma, maGiaoDichHoanCong = "GD-9", soTien, trangThai = "ThanhCong", chuKy = GatewayGia.Ky(ma, "GD-9", soTien, "ThanhCong") });
        Assert.Equal(HttpStatusCode.OK, that.StatusCode);
        Assert.Equal("ThanhCong", (await Json(that)).GetProperty("trangThai").GetString());

        // Khoản còn lại đang chờ: nhân viên bấm xử lý → 409 phải đối chiếu trước.
        var conLai = kq.GetProperty("yeuCauHoan")[1].GetProperty("maHoanTien").GetInt64();
        var xl = await NhanVien.PostAsync($"/api/v1/hoan-tien/{conLai}/xu-ly", null);
        Assert.Equal(HttpStatusCode.Conflict, xl.StatusCode);
        Assert.Equal("HOAN_CHUA_RO_KET_QUA", (await Json(xl)).GetProperty("maLoi").GetString());
    }

    [Fact]
    public async Task PutHuyTuan2_DonDaThanhToan_YeuCauXacNhanBang()
    {
        var don = Don(TimeSpan.FromHours(72));
        Assert.Equal(HttpStatusCode.Unauthorized, (await Client().PutAsJsonAsync($"/api/v1/don-thue/{don.MaDon}/huy", "lý do")).StatusCode);
        var r = await KhachA.PutAsJsonAsync($"/api/v1/don-thue/{don.MaDon}/huy", "lý do");
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal("CHI_PHI_HUY_DA_THAY_DOI", (await Json(r)).GetProperty("maLoi").GetString());
    }
}
