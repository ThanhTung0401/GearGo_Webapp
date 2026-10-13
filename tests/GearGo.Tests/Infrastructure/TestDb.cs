using GearGo.Data;
using GearGo.Integrations.Payments;
using GearGo.Services.Implements;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace GearGo.Tests.Infrastructure;

/// <summary>Đồng hồ kiểm thử: mọi service Week 4 đọc giờ qua TimeProvider.</summary>
public sealed class DongHoGia : TimeProvider
{
    public DateTimeOffset Hien { get; set; } = new(2026, 10, 1, 3, 0, 0, TimeSpan.Zero);
    public DateTime Utc => Hien.UtcDateTime;
    public override DateTimeOffset GetUtcNow() => Hien;
    public void Tien(TimeSpan t) => Hien += t;
}

/// <summary>
/// Gateway hoàn giả lập có kịch bản theo từng lần gửi; ghi lại mọi yêu cầu để kiểm tra "không gửi mã mới / không hoàn hai lần".
/// </summary>
public sealed class GatewayGia : IRefundGateway
{
    public const string Secret = "test-secret";

    public Queue<Func<YeuCauHoanGateway, PhanHoiHoanGateway>> KichBan { get; } = new();
    public Func<YeuCauHoanGateway, PhanHoiHoanGateway> MacDinh { get; set; } = ThanhCong;
    public List<YeuCauHoanGateway> DaGui { get; } = new();
    public List<string> DaTraCuu { get; } = new();
    public Dictionary<string, PhanHoiHoanGateway> KetQuaTraCuu { get; } = new();
    public bool TraCuuLoi { get; set; }

    public static PhanHoiHoanGateway ThanhCong(YeuCauHoanGateway y)
        => new(KetQuaHoanGateway.ThanhCong, "GD-" + y.MaYeuCau, y.SoTien, null, null);
    public static PhanHoiHoanGateway ThatBai(YeuCauHoanGateway y)
        => new(KetQuaHoanGateway.ThatBai, null, y.SoTien, null, "Từ chối");
    public static PhanHoiHoanGateway DaTiepNhan(YeuCauHoanGateway y)
        => new(KetQuaHoanGateway.DaTiepNhan, null, null, null, null);

    /// <summary>Gateway đã hoàn thật nhưng phản hồi bị mất (A04).</summary>
    public Func<YeuCauHoanGateway, PhanHoiHoanGateway> DaHoanNhungTimeout => y =>
    {
        KetQuaTraCuu[y.MaYeuCau] = new(KetQuaHoanGateway.ThanhCong, "GD-" + y.MaYeuCau, y.SoTien, null, null);
        throw new RefundGatewayKhongRoKetQuaException("timeout");
    };

    public Task<PhanHoiHoanGateway> GuiYeuCauHoanAsync(YeuCauHoanGateway yeuCau, CancellationToken ct = default)
    {
        DaGui.Add(yeuCau);
        var f = KichBan.Count > 0 ? KichBan.Dequeue() : MacDinh;
        return Task.FromResult(f(yeuCau));
    }

    public Task<PhanHoiHoanGateway> TraCuuAsync(string maYeuCau, CancellationToken ct = default)
    {
        DaTraCuu.Add(maYeuCau);
        if (TraCuuLoi) throw new RefundGatewayKhongRoKetQuaException("tra cứu timeout");
        return Task.FromResult(KetQuaTraCuu.TryGetValue(maYeuCau, out var kq)
            ? kq
            : new PhanHoiHoanGateway(KetQuaHoanGateway.KhongTimThay, null, null, null, null));
    }

    public bool XacMinhChuKy(string maYeuCau, string? maGiaoDichHoanCong, decimal soTien, string trangThai, string? chuKy)
        => chuKy == Ky(maYeuCau, maGiaoDichHoanCong, soTien, trangThai);

    public static string Ky(string maYeuCau, string? maGd, decimal soTien, string trangThai)
        => MockRefundGateway.KyChuKy(Secret, maYeuCau, maGd, soTien, trangThai);
}

/// <summary>Một "request": DbContext riêng + các service như DI scoped dựng.</summary>
public sealed class PhamVi : IDisposable
{
    public ApplicationDbContext Ctx { get; }
    public LichSuNghiepVuService LichSu { get; }
    public ThongBaoService ThongBao { get; }
    public HoanTienService HoanTien { get; }
    public HuyDonService HuyDon { get; }
    public TruyVanDonThueService TruyVan { get; }

    public PhamVi(ApplicationDbContext ctx, IRefundGateway gateway, TimeProvider clock)
    {
        Ctx = ctx;
        LichSu = new LichSuNghiepVuService(ctx);
        ThongBao = new ThongBaoService(ctx);
        HoanTien = new HoanTienService(ctx, gateway, LichSu, ThongBao, clock, NullLogger<HoanTienService>.Instance);
        HuyDon = new HuyDonService(ctx, HoanTien, LichSu, ThongBao, clock, NullLogger<HuyDonService>.Instance);
        TruyVan = new TruyVanDonThueService(ctx, clock);
    }

    public void Dispose() => Ctx.Dispose();
}

/// <summary>
/// DbContext cho SQLite: giữ nguyên model thật, chỉ đổi các kiểu cột riêng SQL Server ("nvarchar(max)") sang TEXT
/// để EnsureCreated chạy được. Không sửa mapping/migration của ứng dụng.
/// </summary>
public sealed class SqliteTestDbContext : ApplicationDbContext
{
    public SqliteTestDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        foreach (var p in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetProperties()))
            if (p.GetColumnType() is { } t && t.Contains("(max)", StringComparison.OrdinalIgnoreCase))
                p.SetColumnType("TEXT");
    }
}

/// <summary>SQLite in-memory dùng chung một kết nối cho cả test; mỗi PhamVi là một DbContext mới.</summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _conn;
    public DongHoGia Clock { get; } = new();
    public GatewayGia Gateway { get; } = new();

    public TestDb()
    {
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();
        using var ctx = NewContext();
        ctx.Database.EnsureCreated();
    }

    public ApplicationDbContext NewContext()
        => new SqliteTestDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(_conn).Options);

    public PhamVi Mo() => new(NewContext(), Gateway, Clock);

    public void Dispose() => _conn.Dispose();
}
