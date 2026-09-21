using GearGo.Data;
  using GearGo.Models.Common;
  using GearGo.Models.DTOs.Auth;
  using GearGo.Models.Entities;
  using GearGo.Services.Interfaces;
  using Microsoft.EntityFrameworkCore;
  using Microsoft.Extensions.Caching.Memory;

  namespace GearGo.Services.Implements;
  public class XacThucService : IXacThucService
  {
      private readonly ApplicationDbContext _db;
      private readonly IJwtService _jwt;
      private readonly IMemoryCache _cache;
      private readonly IConfiguration _config;
      private readonly ILogger<XacThucService> _logger;

      public XacThucService(ApplicationDbContext db, IJwtService jwt, IMemoryCache cache,
          IConfiguration config, ILogger<XacThucService> logger)
      { _db = db; _jwt = jwt; _cache = cache; _config = config; _logger = logger; }

      public async Task<Result<AuthResponse>> DangKyAsync(DangKyRequest req)
      {
          if (await _db.TaiKhoans.AnyAsync(t => t.Email == req.Email))
              return Result<AuthResponse>.Loi("EMAIL_DA_TON_TAI", "Email đã được đăng ký.");
          if (await _db.TaiKhoans.AnyAsync(t => t.SoDienThoai == req.SoDienThoai))
              return Result<AuthResponse>.Loi("SDT_DA_TON_TAI", "Số điện thoại đã được đăng ký.");

          var matKhauBam = BCrypt.Net.BCrypt.HashPassword(req.MatKhau, workFactor: 12);

          await using var tx = await _db.Database.BeginTransactionAsync();
          try
          {
              var taiKhoan = new TaiKhoan
              {
                  Email = req.Email, SoDienThoai = req.SoDienThoai, MatKhauBam = matKhauBam,
                  VaiTro = "KhachHang", TrangThai = "HoatDong",
                  NgayTao = DateTime.UtcNow, NgayCapNhat = DateTime.UtcNow
              };
              _db.TaiKhoans.Add(taiKhoan);
              await _db.SaveChangesAsync();

              var khachHang = new KhachHang
              {
                  MaTaiKhoan = taiKhoan.MaTaiKhoan,
                  HoTen = req.HoTen, DiaChi = req.DiaChi, NgaySinh = req.NgaySinh
              };
              _db.KhachHangs.Add(khachHang);
              await _db.SaveChangesAsync();
              await tx.CommitAsync();

              var (token, hetHanSau) = _jwt.TaoToken(taiKhoan);
              return Result<AuthResponse>.Ok(new AuthResponse
              {
                  Token = token, HetHanSau = hetHanSau, MaTaiKhoan = taiKhoan.MaTaiKhoan,
                  VaiTro = taiKhoan.VaiTro, HoTen = khachHang.HoTen, Email = taiKhoan.Email
              });
          }
          catch { await tx.RollbackAsync(); throw; }
      }

      public async Task<Result<AuthResponse>> DangNhapAsync(DangNhapRequest req)
      {
          var taiKhoan = req.TaiKhoan.Contains('@')
              ? await _db.TaiKhoans.FirstOrDefaultAsync(t => t.Email == req.TaiKhoan)
              : await _db.TaiKhoans.FirstOrDefaultAsync(t => t.SoDienThoai == req.TaiKhoan);

          if (taiKhoan == null)
              return Result<AuthResponse>.Loi("DANG_NHAP_SAI", "Tài khoản hoặc mật khẩu không đúng.");

          if (taiKhoan.TrangThai == "BiKhoa")
              return Result<AuthResponse>.Loi("TAI_KHOAN_BI_KHOA", taiKhoan.LyDoKhoa ?? "Tài khoản đã bị khóa.");

          var maxLanSai = _config.GetValue<int>("AppSettings:KhoaTaiKhoanSauSoLanSai");
          var thoiGianKhoaPhut = _config.GetValue<int>("AppSettings:ThoiGianKhoaPhut");
          var cacheKey = $"login_fail:{taiKhoan.MaTaiKhoan}";

          if (_cache.TryGetValue(cacheKey, out LoginFailRecord? record) && record?.LockUntil > DateTime.UtcNow)
              return Result<AuthResponse>.Loi("TAM_KHOA",
                  $"Tài khoản bị khóa tạm. Thử lại sau {(int)(record.LockUntil - DateTime.UtcNow).TotalMinutes + 1} phút.");

          if (!BCrypt.Net.BCrypt.Verify(req.MatKhau, taiKhoan.MatKhauBam))
          {
              var r = _cache.Get<LoginFailRecord>(cacheKey) ?? new LoginFailRecord();
              r.Count++;
              if (r.Count >= maxLanSai) r.LockUntil = DateTime.UtcNow.AddMinutes(thoiGianKhoaPhut);
              _cache.Set(cacheKey, r, TimeSpan.FromHours(24));
              return Result<AuthResponse>.Loi("DANG_NHAP_SAI", "Tài khoản hoặc mật khẩu không đúng.");
          }

          _cache.Remove(cacheKey);

          var hoTen = taiKhoan.VaiTro == "KhachHang"
              ? (await _db.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == taiKhoan.MaTaiKhoan))?.HoTen
              : (await _db.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == taiKhoan.MaTaiKhoan))?.HoTen;

          var (token, hetHanSau) = _jwt.TaoToken(taiKhoan);
          return Result<AuthResponse>.Ok(new AuthResponse
          {
              Token = token, HetHanSau = hetHanSau, MaTaiKhoan = taiKhoan.MaTaiKhoan,
              VaiTro = taiKhoan.VaiTro, HoTen = hoTen, Email = taiKhoan.Email
          });
      }

      public async Task<Result<string>> TaoTokenQuenMatKhauAsync(string email)
      {
          var taiKhoan = await _db.TaiKhoans.FirstOrDefaultAsync(t => t.Email == email);
          var msg = "(mock) Nếu email tồn tại, bạn sẽ nhận được hướng dẫn.";
          if (taiKhoan == null) return Result<string>.Ok(msg);

          var resetToken = Guid.NewGuid().ToString("N");
          _cache.Set($"reset_token:{resetToken}", taiKhoan.MaTaiKhoan, TimeSpan.FromMinutes(30));
          _logger.LogInformation("[Mock Email] Reset token for {Email}: {Token}", email, resetToken);
          return Result<string>.Ok(msg);
      }

      public async Task<Result> DatLaiMatKhauAsync(DatLaiMatKhauRequest req)
      {
          if (!_cache.TryGetValue($"reset_token:{req.Token}", out long maTaiKhoan))
              return Result.Loi("TOKEN_KHONG_HOP_LE", "Token không hợp lệ hoặc đã hết hạn.");

          var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
          if (taiKhoan == null) return Result.Loi("KHONG_TIM_THAY", "Tài khoản không tồn tại.");

          taiKhoan.MatKhauBam = BCrypt.Net.BCrypt.HashPassword(req.MatKhauMoi, workFactor: 12);
          taiKhoan.NgayCapNhat = DateTime.UtcNow;
          await _db.SaveChangesAsync();
          _cache.Remove($"reset_token:{req.Token}");
          return Result.Ok();
      }

      public async Task<Result<AuthResponse>> LayThongTinToiAsync(long maTaiKhoan)
      {
          var taiKhoan = await _db.TaiKhoans.FindAsync(maTaiKhoan);
          if (taiKhoan == null) return Result<AuthResponse>.Loi("KHONG_TIM_THAY", "Tài khoản không tồn tại.");

          var hoTen = taiKhoan.VaiTro == "KhachHang"
              ? (await _db.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == maTaiKhoan))?.HoTen
              : (await _db.NhanViens.FirstOrDefaultAsync(n => n.MaTaiKhoan == maTaiKhoan))?.HoTen;

          return Result<AuthResponse>.Ok(new AuthResponse
          {
              Token = "", HetHanSau = DateTime.MinValue,
              MaTaiKhoan = taiKhoan.MaTaiKhoan, VaiTro = taiKhoan.VaiTro,
              HoTen = hoTen, Email = taiKhoan.Email
          });
      }

      private sealed class LoginFailRecord
      {
          public int Count { get; set; }
          public DateTime LockUntil { get; set; }
      }
  }