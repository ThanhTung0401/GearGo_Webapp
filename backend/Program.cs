using GearGo.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GearGo.BackgroundJobs;
using GearGo.Services.Implements;
using GearGo.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// ── 1. API Controllers ────────────────────────────────────────────────────────
// Sử dụng AddControllers cho kiến trúc Web API (React) thay vì AddControllersWithViews (MVC)
builder.Services.AddControllers();
// Hỗ trợ sinh tài liệu Swagger/OpenAPI (nếu cài thêm Swagger)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── 2. Database Context ───────────────────────────────────────────────────────
// Cấu hình kết nối SQL Server thông qua Entity Framework Core
builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── 3. Xác thực (Authentication - JWT) ────────────────────────────────────────
// Cấu hình JWT Bearer thay cho Cookie thuần vì React SPA ưu tiên dùng Token
var secretKey = builder.Configuration["Jwt:SecretKey"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = false, // Có thể bật lên true trong môi trường Production
            ValidateAudience = false, // Có thể bật lên true trong môi trường Production
            ClockSkew = TimeSpan.Zero
        };
    });

// ── 4. Phân quyền (Authorization) ─────────────────────────────────────────────
// Cấu hình các chính sách (Policy) dựa trên Roles
builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("AdminOnly", p => p.RequireRole("QuanTriVien"));
    opt.AddPolicy("StaffOrAdmin", p => p.RequireRole("NhanVien", "QuanTriVien"));
    opt.AddPolicy("CustomerOnly", p => p.RequireRole("KhachHang"));
});

// ── 5. CORS (Dành cho React Frontend) ─────────────────────────────────────────
// Cấu hình cho phép các domain của React truy cập API
builder.Services.AddCors(opt =>
    opt.AddPolicy("ReactApp", p =>
        p.WithOrigins(
            "http://localhost:5173",   // Cổng mặc định của Vite (React)
            "http://localhost:3000"    // Cổng mặc định của Create React App
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials())); // Cho phép gửi kèm cookie/token (nếu có)

// ── 6. Application Services (Dependency Injection) ────────────────────────────
// Bỏ comment khi hoàn thành từng Task tương ứng theo Plan
// builder.Services.AddScoped<IXacThucService, XacThucService>();
// builder.Services.AddScoped<IDanhMucService, DanhMucService>();
// builder.Services.AddScoped<ISanPhamService, SanPhamService>();
// builder.Services.AddScoped<IKhaDungService, KhaDungService>();
// builder.Services.AddScoped<IGioThueService, GioThueService>();
builder.Services.AddScoped<IDonThueService, DonThueService>();
builder.Services.AddScoped<IThanhToanService, ThanhToanService>();
builder.Services.AddScoped<IKhuyenMaiService, KhuyenMaiService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ICheckoutService, CheckoutService>();

builder.Services.AddHostedService<DonThueExpirationJob>();

// Bật lại khi thêm AutoMapper package
// builder.Services.AddAutoMapper(typeof(Program));

// ==============================================================================
builder.Services.AddMemoryCache();
builder.Services.AddScoped<GearGo.Services.Interfaces.IJwtService, GearGo.Services.Implements.JwtService>();
builder.Services.AddScoped<GearGo.Services.Interfaces.IXacThucService, GearGo.Services.Implements.XacThucService>();
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(); // Sinh ra giao diện web để test API
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

 app.UseMiddleware<GearGo.Middleware.ExceptionHandlingMiddleware>();
// CORS phải đặt trước Authentication & Authorization
app.UseCors("ReactApp");

app.UseAuthentication(); // Kích hoạt middleware Xác thực (JWT)
app.UseAuthorization();  // Kích hoạt middleware Phân quyền

// Khai báo các route cho API Controllers
app.MapControllers();

// Endpoint mẫu để kiểm tra backend đã chạy thành công chưa
app.MapGet("/", () => new
{
    message = "GearGo backend is running",
    testEndpoint = "/api/test"
});

app.MapGet("/api/test", () => new {
    message = "Backend API is running thành công cho React!",
    timestamp = DateTime.Now
});

app.Run();
