using GearGo.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ── MVC ─────────────────────────────────────────────────────────────────
builder.Services.AddControllersWithViews();

// ── Database ─────────────────────────────────────────────────────────────
builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Authentication — Cookie thuần, không dùng ASP.NET Identity ───────────
builder.Services.AddAuthentication("GearGoCookies")
    .AddCookie("GearGoCookies", opt =>
    {
        opt.LoginPath = "/xac-thuc/dang-nhap";
        opt.LogoutPath = "/xac-thuc/dang-xuat";
        opt.AccessDeniedPath = "/xac-thuc/tu-choi-truy-cap";
        opt.ExpireTimeSpan = TimeSpan.FromDays(7);
        opt.SlidingExpiration = true;
        opt.Cookie.HttpOnly = true;
        opt.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        opt.Cookie.SameSite = SameSiteMode.Lax;
        opt.Cookie.Name = "GearGo.Auth";
    });

// ── Authorization ─────────────────────────────────────────────────────────
builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("AdminOnly", p => p.RequireRole("QuanTriVien"));
    opt.AddPolicy("StaffOrAdmin", p => p.RequireRole("NhanVien", "QuanTriVien"));
    opt.AddPolicy("CustomerOnly", p => p.RequireRole("KhachHang"));
});

// ── Session (giỏ thuê) ────────────────────────────────────────────────────
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(opt =>
{
    opt.IdleTimeout = TimeSpan.FromMinutes(30);
    opt.Cookie.HttpOnly = true;
    opt.Cookie.IsEssential = true;
    opt.Cookie.Name = "GearGo.Session";
});

// ── Application Services ── (uncomment khi hoàn thành từng task)
// builder.Services.AddScoped<IXacThucService, XacThucService>();
// builder.Services.AddScoped<IDanhMucService, DanhMucService>();
// builder.Services.AddScoped<ISanPhamService, SanPhamService>();
// builder.Services.AddScoped<IKhaDungService, KhaDungService>();
// builder.Services.AddScoped<IGioThueService, GioThueService>();
// builder.Services.AddScoped<IDonThueService, DonThueService>();
// builder.Services.AddScoped<IThanhToanService, ThanhToanService>();

// builder.Services.AddAutoMapper(typeof(Program)); // bật lại khi thêm AutoMapper package

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/loi");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseSession();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "areas",
    pattern: "{area:exists}/{controller=Home}/{action=Index}/{id?}");

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
