using GearGo.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── API ───────────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── JWT Authentication ────────────────────────────────────────────────────────
var secretKey = builder.Configuration["Jwt:SecretKey"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

// ── Authorization ─────────────────────────────────────────────────────────────
builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("AdminOnly", p => p.RequireRole("QuanTriVien"));
    opt.AddPolicy("StaffOrAdmin", p => p.RequireRole("NhanVien", "QuanTriVien"));
    opt.AddPolicy("CustomerOnly", p => p.RequireRole("KhachHang"));
});

// ── CORS (React frontend) ─────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
    opt.AddPolicy("ReactApp", p =>
        p.WithOrigins(
            "http://localhost:5173",   // Vite
            "http://localhost:3000"    // Create React App
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials()));

// ── Application Services ── (uncomment khi hoàn thành từng task)
// builder.Services.AddScoped<IXacThucService, XacThucService>();
// builder.Services.AddScoped<IDanhMucService, DanhMucService>();
// builder.Services.AddScoped<ISanPhamService, SanPhamService>();
// builder.Services.AddScoped<IKhaDungService, KhaDungService>();
// builder.Services.AddScoped<IGioThueService, GioThueService>();
// builder.Services.AddScoped<IDonThueService, DonThueService>();
// builder.Services.AddScoped<IThanhToanService, ThanhToanService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseCors("ReactApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
