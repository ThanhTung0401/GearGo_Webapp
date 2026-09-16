# GearGo — Kế hoạch Tuần 2: Khởi tạo dự án, Xác thực, Danh mục, Sản phẩm, Giỏ thuê & Đặt đơn

> **Tuần 1** đã chốt đặc tả, chưa đụng code. Tuần 2 này bắt đầu từ zero: khởi tạo dự án đến khi khách có thể tìm sản phẩm, đặt thuê và thanh toán; admin quản lý danh mục và sản phẩm.

**Mục tiêu tuần 2:** Dựng nền tảng dự án + xác thực (UC01) + khách duyệt danh mục / tìm sản phẩm / kiểm tra khả dụng / quản lý giỏ thuê / tạo đơn giữ chỗ / thanh toán xác nhận đơn (UC03–UC06) + admin CRUD danh mục và sản phẩm (UC21).

**Kiến trúc:** ASP.NET Core MVC — phân lớp Model → Service → Controller → View. Mỗi tính năng có service riêng, controller gọi service, không chứa logic nghiệp vụ. Repository Pattern qua EF Core DbContext.

**Tech Stack:** ASP.NET Core 8 MVC · Entity Framework Core 8 · SQL Server · ASP.NET Core Identity · Bootstrap 5 · jQuery · VNPay SDK (hoặc mock gateway) · AutoMapper

---

## Phạm vi tuần 2

| Nhóm | Use Case | Tên nghiệp vụ |
|---|---|---|
| Nền tảng | — | Khởi tạo dự án, cấu hình EF Core, SQL Server, Identity, layout chung |
| Xác thực | UC01 | Đăng ký, đăng nhập, phục hồi mật khẩu |
| Khách | UC03 | Tìm kiếm, xem sản phẩm và kiểm tra khả dụng |
| Khách | UC04 | Quản lý giỏ thuê và xem báo giá |
| Khách | UC05 | Tạo đơn và giữ chỗ |
| Khách | UC06 | Thanh toán và xác nhận đơn |
| Admin | UC21 | Quản lý danh mục và sản phẩm (CRUD) |

---

## Cấu trúc file sẽ tạo / chỉnh sửa

```
GearGo_Webapp/
├── GearGo.csproj                       (mới — khởi tạo)
├── Program.cs                           (mới — DI, middleware, Identity)
├── appsettings.json                     (mới — connection string, JWT/Cookie config)
├── Models/
│   ├── Entities/
│   │   ├── ApplicationUser.cs          (mới — extends IdentityUser)
│   │   ├── KhachHang.cs                (mới — thông tin khách hàng)
│   │   └── NhanVien.cs                 (mới — thông tin nhân viên)
│   ├── ViewModels/
│   │   └── Auth/
│   │       ├── DangKyVM.cs             (mới)
│   │       ├── DangNhapVM.cs           (mới)
│   │       └── QuenMatKhauVM.cs        (mới)
├── Services/
│   ├── Interfaces/
│   │   └── IXacThucService.cs          (mới)
│   └── XacThucService.cs               (mới)
├── Controllers/
│   └── XacThucController.cs            (mới)
├── Views/
│   ├── Shared/
│   │   ├── _Layout.cshtml              (mới — layout chung Bootstrap 5)
│   │   └── _Header.cshtml              (mới — partial: nav + icon giỏ + user menu)
│   └── XacThuc/
│       ├── DangKy.cshtml               (mới)
│       ├── DangNhap.cshtml             (mới)
│       └── QuenMatKhau.cshtml          (mới)
├── Data/
│   ├── ApplicationDbContext.cs         (mới)
│   └── Migrations/
│       └── [timestamp]_InitialCreate.cs (tạo qua EF CLI)
│   ├── Entities/
│   │   ├── DanhMucSanPham.cs          (mới)
│   │   ├── SanPham.cs                  (mới)
│   │   ├── HinhAnhSanPham.cs           (mới)
│   │   ├── GioThue.cs                  (mới)
│   │   ├── ChiTietGioThue.cs           (mới)
│   │   ├── GiuCho.cs                   (mới)
│   │   ├── DonThue.cs                  (mới)
│   │   ├── ChiTietDonThue.cs           (mới)
│   │   ├── ThanhToan.cs                (mới)
│   │   └── KhuyenMai.cs                (mới — dùng cho giỏ thuê)
│   └── ViewModels/
│       ├── SanPham/
│       │   ├── SanPhamListVM.cs        (mới)
│       │   ├── SanPhamDetailVM.cs      (mới)
│       │   └── TimKiemSanPhamVM.cs     (mới)
│       ├── GioThue/
│       │   ├── GioThueVM.cs            (mới)
│       │   └── ThemVaoGioVM.cs         (mới)
│       ├── DonThue/
│       │   ├── TaoDonThueVM.cs         (mới)
│       │   └── XacNhanDonVM.cs         (mới)
│       ├── ThanhToan/
│       │   ├── ThanhToanVM.cs          (mới)
│       │   └── KetQuaThanhToanVM.cs    (mới)
│       └── Admin/
│           ├── DanhMucVM.cs            (mới)
│           └── SanPhamAdminVM.cs       (mới)
├── Services/
│   ├── Interfaces/
│   │   ├── ISanPhamService.cs          (mới)
│   │   ├── IGioThueService.cs          (mới)
│   │   ├── IDonThueService.cs          (mới)
│   │   ├── IKhaDungService.cs          (mới)
│   │   ├── IThanhToanService.cs        (mới)
│   │   └── IDanhMucService.cs          (mới)
│   ├── SanPhamService.cs               (mới)
│   ├── GioThueService.cs               (mới)
│   ├── DonThueService.cs               (mới)
│   ├── KhaDungService.cs               (mới)
│   ├── ThanhToanService.cs             (mới)
│   └── DanhMucService.cs               (mới)
├── Controllers/
│   ├── SanPhamController.cs            (mới)
│   ├── GioThueController.cs            (mới)
│   ├── DonThueController.cs            (mới)
│   ├── ThanhToanController.cs          (mới)
│   └── Admin/
│       ├── DanhMucController.cs        (mới)
│       └── SanPhamController.cs        (mới)
├── Views/
│   ├── SanPham/
│   │   ├── Index.cshtml                (mới — trang tìm kiếm + lọc)
│   │   └── ChiTiet.cshtml              (mới — trang chi tiết sản phẩm)
│   ├── GioThue/
│   │   └── Index.cshtml                (mới — giỏ thuê + báo giá)
│   ├── DonThue/
│   │   ├── XacNhan.cshtml              (mới — review trước khi tạo đơn)
│   │   └── ChiTiet.cshtml              (mới — chi tiết đơn đã tạo)
│   ├── ThanhToan/
│   │   ├── Index.cshtml                (mới — trang thanh toán)
│   │   └── KetQua.cshtml               (mới — kết quả thanh toán)
│   └── Admin/
│       ├── DanhMuc/
│       │   ├── Index.cshtml            (mới)
│       │   ├── TaoMoi.cshtml           (mới)
│       │   └── ChinhSua.cshtml         (mới)
│       └── SanPham/
│           ├── Index.cshtml            (mới)
│           ├── TaoMoi.cshtml           (mới)
│           └── ChinhSua.cshtml         (mới)
├── Data/
│   └── Migrations/
│       └── [timestamp]_AddCatalogAndOrderTables.cs   (tạo qua EF CLI)
└── wwwroot/
    └── js/
        ├── gio-thue.js                 (mới — AJAX cập nhật giỏ)
        └── san-pham-search.js          (mới — debounce tìm kiếm)
```

---

## Task 0: Khởi tạo dự án và cấu hình nền tảng

**Files:**
- Tạo: `GearGo.csproj`
- Tạo: `Program.cs`
- Tạo: `appsettings.json`
- Tạo: `Data/ApplicationDbContext.cs`
- Tạo: `Views/Shared/_Layout.cshtml`, `_Header.cshtml`

**Các bước:**

- [ ] **0.1** Tạo dự án ASP.NET Core MVC:
  ```bash
  dotnet new mvc -n GearGo -f net8.0
  cd GearGo
  dotnet add package Microsoft.EntityFrameworkCore.SqlServer
  dotnet add package Microsoft.EntityFrameworkCore.Tools
  dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
  dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection
  ```

- [ ] **0.2** Tạo `ApplicationDbContext.cs` kế thừa `IdentityDbContext<ApplicationUser>`. Chưa có DbSet nào ngoài Identity — các bảng nghiệp vụ sẽ thêm dần qua migration.

- [ ] **0.3** Cấu hình `appsettings.json`: thêm `ConnectionStrings:DefaultConnection` trỏ đến SQL Server local. Không commit mật khẩu thật — dùng `dotnet user-secrets` cho môi trường dev.

- [ ] **0.4** Đăng ký trong `Program.cs`:
  ```csharp
  builder.Services.AddDbContext<ApplicationDbContext>(opt =>
      opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
  builder.Services.AddIdentity<ApplicationUser, IdentityRole>(opt => {
      opt.Password.RequiredLength = 8;
      opt.Lockout.MaxFailedAccessAttempts = 5;
      opt.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
  }).AddEntityFrameworkStores<ApplicationDbContext>().AddDefaultTokenProviders();
  builder.Services.ConfigureApplicationCookie(opt => {
      opt.LoginPath = "/xac-thuc/dang-nhap";
      opt.AccessDeniedPath = "/xac-thuc/tu-choi";
  });
  ```

- [ ] **0.5** Chạy migration khởi tạo:
  ```bash
  dotnet ef migrations add InitialCreate
  dotnet ef database update
  ```
  Kiểm tra bảng Identity xuất hiện trong SQL Server.

- [ ] **0.6** Tạo `_Layout.cshtml`: navbar Bootstrap 5 với logo GearGo, link Sản phẩm, icon Giỏ thuê, dropdown User (Đăng nhập / Hồ sơ / Đăng xuất). Responsive mobile. Tạo partial `_Header.cshtml` cho phần nav.

- [ ] **0.7** Chạy `dotnet run`, truy cập `https://localhost:{port}` → trang chủ hiển thị layout. Không có lỗi console.

- [ ] **0.8** Commit: `chore: initialize ASP.NET Core MVC project with EF Core and Identity`

---

## Task 0.5: Xác thực người dùng (UC01)

**Files:**
- Tạo: `Models/Entities/ApplicationUser.cs`, `KhachHang.cs`, `NhanVien.cs`
- Tạo: `Models/ViewModels/Auth/DangKyVM.cs`, `DangNhapVM.cs`, `QuenMatKhauVM.cs`
- Tạo: `Services/Interfaces/IXacThucService.cs`, `Services/XacThucService.cs`
- Tạo: `Controllers/XacThucController.cs`
- Tạo: `Views/XacThuc/DangKy.cshtml`, `DangNhap.cshtml`, `QuenMatKhau.cshtml`

**Các bước:**

- [ ] **0.5.1** Tạo `ApplicationUser.cs` kế thừa `IdentityUser`: thêm `HoTen`, `NgayTao`, `TrangThai` (enum: `HoatDong`, `BiKhoa`). Quan hệ 1-1 với `KhachHang` (nullable — nhân viên không có `KhachHang`).

- [ ] **0.5.2** Tạo `KhachHang.cs`: `Id`, `ApplicationUserId`, `HoTen`, `SoDienThoai`, `Email`, `DiaChi`, `NgaySinh` (nullable). Navigation: `ApplicationUser`.

  Tạo `NhanVien.cs`: `Id`, `ApplicationUserId`, `MaNhanVien`, `HoTen`, `SoDienThoai`, `ChucVu`, `TrangThai`. Navigation: `ApplicationUser`.

- [ ] **0.5.3** Thêm `DbSet<KhachHang>`, `DbSet<NhanVien>` vào `ApplicationDbContext`. Migration:
  ```bash
  dotnet ef migrations add AddKhachHangNhanVien
  dotnet ef database update
  ```

- [ ] **0.5.4** Tạo `DangKyVM.cs`: `HoTen`, `Email`, `SoDienThoai`, `MatKhau`, `XacNhanMatKhau`. Validation attributes: `[Required]`, `[EmailAddress]`, `[Phone]`, `[MinLength(8)]`, `[Compare("MatKhau")]`.

  Tạo `DangNhapVM.cs`: `TaiKhoan` (email hoặc SĐT), `MatKhau`, `NhoToi` (bool).

  Tạo `QuenMatKhauVM.cs`: `Email` (bước 1 — nhận link); `Token + Email + MatKhauMoi + XacNhanMatKhauMoi` (bước 2 — đặt lại).

- [ ] **0.5.5** Interface `IXacThucService`:
  ```csharp
  Task<IdentityResult> DangKyAsync(DangKyVM vm);
  Task<SignInResult> DangNhapAsync(DangNhapVM vm);
  Task DangXuatAsync();
  Task<string> TaoTokenQuenMatKhauAsync(string email);
  Task<IdentityResult> DatLaiMatKhauAsync(string email, string token, string matKhauMoi);
  ```

- [ ] **0.5.6** Implement `XacThucService.DangKyAsync`:
  - Kiểm tra email và SĐT chưa tồn tại trong `ApplicationUser`.
  - Tạo `ApplicationUser`, sau đó tạo `KhachHang` liên kết.
  - Gán role `KhachHang` (`UserManager.AddToRoleAsync`).
  - Seed role `KhachHang`, `NhanVien`, `QuanTriVien` khi `Program.cs` khởi động nếu chưa có.
  - **Không được tạo role `NhanVien` hoặc `QuanTriVien` qua form đăng ký công khai.**

- [ ] **0.5.7** Implement `XacThucService.DangNhapAsync`: cho phép đăng nhập bằng email hoặc SĐT — nếu `TaiKhoan` chứa `@` thì tìm theo email, ngược lại tìm theo `SoDienThoai` trong `KhachHang` để lấy `UserName`. Kiểm tra tài khoản không bị khóa trước khi `SignInManager.PasswordSignInAsync`.

- [ ] **0.5.8** Implement `TaoTokenQuenMatKhauAsync`: dùng `UserManager.GeneratePasswordResetTokenAsync`. Hiện tại ghi token ra log (dev) — tuần sau tích hợp gửi email thật khi có SMTP config.

- [ ] **0.5.9** `XacThucController`:
  - `GET /xac-thuc/dang-ky` + `POST` → đăng ký.
  - `GET /xac-thuc/dang-nhap` + `POST` → đăng nhập, redirect về trang trước hoặc `/`.
  - `POST /xac-thuc/dang-xuat` → đăng xuất.
  - `GET /xac-thuc/quen-mat-khau` + `POST` → nhập email nhận link.
  - `GET /xac-thuc/dat-lai-mat-khau?email=&token=` + `POST` → đặt lại mật khẩu.

- [ ] **0.5.10** Views: form Bootstrap 5 có validation server-side (`asp-validation-for`) và client-side (`jquery-validate`). Trang đăng nhập có link "Quên mật khẩu?". Trang đăng ký có thông báo lỗi rõ ràng khi email / SĐT trùng.

- [ ] **0.5.11** Test thủ công:
  - Đăng ký tài khoản mới → đăng nhập thành công.
  - Đăng ký email đã tồn tại → hiện lỗi, không crash.
  - Đăng nhập sai 5 lần → tài khoản bị khóa 15 phút.
  - Quên mật khẩu → lấy token từ log → đặt lại → đăng nhập được bằng mật khẩu mới.

- [ ] **0.5.12** Commit: `feat: UC01 authentication — register, login, password reset`

---

## Task 1: Entities cho danh mục và sản phẩm

**Files:**
- Tạo: `Models/Entities/DanhMucSanPham.cs`
- Tạo: `Models/Entities/SanPham.cs`
- Tạo: `Models/Entities/HinhAnhSanPham.cs`
- Chỉnh sửa: `Data/ApplicationDbContext.cs` — thêm DbSet

**Các bước:**

- [ ] **1.1** Tạo `DanhMucSanPham.cs` với các trường: `Id`, `Ten`, `DanhMucChaId` (nullable, self-ref), `MoTa`, `ThuTu`, `HienThi` (bool), `CreatedAt`, `UpdatedAt`. Thêm navigation property `DanhMucCha`, `DanhMucCon`, `SanPhams`.

- [ ] **1.2** Tạo `SanPham.cs` với các trường: `Id`, `Ma` (unique string), `Ten`, `DanhMucId`, `ThuongHieu`, `MoTa`, `SucChuaHoacKichThuoc`, `GiaThueNgay` (decimal), `MucCocMotThietBi` (decimal), `GiaTriBoiThuong` (decimal), `TrangThaiKinhDoanh` (enum: `DangKinhDoanh`, `TamNgung`, `NgungKinhDoanh`), `CreatedAt`, `UpdatedAt`. Thêm navigation property `DanhMuc`, `HinhAnhs`, `ThietBis`.

- [ ] **1.3** Tạo `HinhAnhSanPham.cs` với `Id`, `SanPhamId`, `DuongDan`, `LaAnhChinh` (bool), `ThuTu`.

- [ ] **1.4** Thêm `DbSet<DanhMucSanPham>`, `DbSet<SanPham>`, `DbSet<HinhAnhSanPham>` vào `ApplicationDbContext`. Cấu hình Fluent API: index unique cho `SanPham.Ma`; quan hệ self-reference `DanhMucSanPham`; cascade delete `HinhAnhSanPham` theo `SanPham`.

- [ ] **1.5** Chạy migration:
  ```bash
  dotnet ef migrations add AddCatalog
  dotnet ef database update
  ```
  Kiểm tra bảng xuất hiện đúng trong SQL Server.

- [ ] **1.6** Commit: `feat: add DanhMucSanPham, SanPham, HinhAnhSanPham entities`

---

## Task 2: Entities cho thiết bị, giỏ thuê và đặt đơn

**Files:**
- Tạo: `Models/Entities/ThietBi.cs`
- Tạo: `Models/Entities/GioThue.cs`, `ChiTietGioThue.cs`
- Tạo: `Models/Entities/GiuCho.cs`
- Tạo: `Models/Entities/DonThue.cs`, `ChiTietDonThue.cs`
- Tạo: `Models/Entities/ThanhToan.cs`
- Tạo: `Models/Entities/KhuyenMai.cs`, `LuotSuDungKhuyenMai.cs`
- Chỉnh sửa: `Data/ApplicationDbContext.cs`

**Các bước:**

- [ ] **2.1** Tạo enum `TrangThaiThietBi` trong `Models/Enums/TrangThaiThietBi.cs`:
  `SanSang`, `DangThue`, `DangBaoTri`, `ThatLac`, `NgungSuDung`.

- [ ] **2.2** Tạo enum `TrangThaiDonThue` trong `Models/Enums/TrangThaiDonThue.cs`:
  `ChoThanhToan`, `DaXacNhan`, `DangChuanBi`, `SanSangNhan`, `DangThue`, `DaNhanTra`, `ChoDoiSoat`, `HoanTat`, `HetHan`, `KhachHuy`, `CuaHangHuy`.

- [ ] **2.3** Tạo `ThietBi.cs` với: `Id`, `Ma`, `SanPhamId`, `NgayNhap`, `GiaNhap`, `TinhTrang` (enum `TrangThaiThietBi`), `PhuKienDiKem`, `SoLanChoThue`, `GhiChu`. Navigation: `SanPham`.

- [ ] **2.4** Tạo `GioThue.cs` với: `Id`, `KhachHangId`, `GioNhan` (DateTime?), `GioTra` (DateTime?), `MaGiamGia` (string?), `UpdatedAt`. Navigation: `KhachHang`, `ChiTiets`.

  Tạo `ChiTietGioThue.cs`: `Id`, `GioThueId`, `SanPhamId`, `SoLuong`, `DonGiaThamKhao`.

- [ ] **2.5** Tạo `GiuCho.cs`: `Id`, `DonThueId`, `SanPhamId`, `SoLuong`, `ThoiDiemHetHan`.

- [ ] **2.6** Tạo `DonThue.cs` với đầy đủ các trường nghiệp vụ: `Id`, `Ma`, `KhachHangId`, `TenNguoiNhan`, `SdtNguoiNhan`, `GioNhanDuKien`, `GioTraDuKien`, `TienThue`, `GiamGia`, `TienCoc`, `TrangThai` (enum), `HanGiuCho`, `ChinhSachApDung` (JSON string), `MaKhuyenMaiId` (nullable), `CreatedAt`, `NguoiHuyId`, `LyDoHuy`, `ThoiDiemHuy`.

- [ ] **2.7** Tạo `ChiTietDonThue.cs`: `Id`, `DonThueId`, `SanPhamId`, `SoLuong`, `SoNgayTinhTien`, `DonGia`, `TienThue`, `MucCoc`, `GiaTriBoiThuong`.

- [ ] **2.8** Tạo `ThanhToan.cs`: `Id`, `DonThueId`, `SoTien`, `MucDich` (enum: `TienThue`, `TienCoc`, `ThuBoSung`), `PhuongThuc`, `MaGiaoDich`, `ThoiDiem`, `TrangThai` (enum: `ThanhCong`, `ThatBai`, `DangXuLy`), `GhiChu`.

- [ ] **2.9** Tạo `KhuyenMai.cs`: `Id`, `Ma`, `LoaiGiam` (enum: `PhanTram`, `SoTien`), `GiaTri`, `GiaTriThueToiThieu`, `GiamToiDa` (nullable), `NgayBatDau`, `NgayKetThuc`, `TongLuotToiDa` (int?), `GioiHanMoiKhach` (int), `TrangThai`. Tạo `LuotSuDungKhuyenMai.cs`: `Id`, `KhuyenMaiId`, `KhachHangId`, `DonThueId`, `ThoiDiem`.

- [ ] **2.10** Đăng ký tất cả DbSet mới vào `ApplicationDbContext`. Cấu hình Fluent API quan trọng: index unique `DonThue.Ma`; `GioThue` quan hệ 1-1 với `KhachHang`; `DonThue` không cascade delete khi xóa `KhachHang`.

- [ ] **2.11** Migration và update:
  ```bash
  dotnet ef migrations add AddOrderAndCartTables
  dotnet ef database update
  ```

- [ ] **2.12** Commit: `feat: add ThietBi, GioThue, DonThue, ThanhToan, KhuyenMai entities`

---

## Task 3: Service tính khả dụng (IKhaDungService)

**Files:**
- Tạo: `Services/Interfaces/IKhaDungService.cs`
- Tạo: `Services/KhaDungService.cs`

**Mục tiêu nghiệp vụ:** Trả về số lượng thiết bị còn nhận đặt của một sản phẩm trong khoảng thời gian cho trước (tính theo UC03 và mục 8.1 đặc tả).

**Các bước:**

- [ ] **3.1** Định nghĩa interface `IKhaDungService`:
  ```csharp
  Task<int> LayKhaDungAsync(int sanPhamId, DateTime gioNhan, DateTime gioTra);
  Task<Dictionary<int, int>> LayKhaDungNhieuSanPhamAsync(
      IEnumerable<int> sanPhamIds, DateTime gioNhan, DateTime gioTra);
  ```

- [ ] **3.2** Implement `KhaDungService.LayKhaDungAsync`:
  - Đếm `ThietBi` theo `SanPhamId` thuộc trạng thái `SanSang` hoặc `DangThue`.
  - Loại trừ thiết bị đang `DangBaoTri`, `ThatLac`, `NgungSuDung`.
  - Trừ đi số lượng đã bị giữ bởi đơn trạng thái `ChoThanhToan` (còn trong `HanGiuCho`) + `DaXacNhan` + `DangChuanBi` + `SanSangNhan` + `DangThue` có giao khoảng thời gian với `[gioNhan, gioTra]`.
  - Lịch trùng khi: `gioNhanDon < gioTra` **VÀ** `gioTraDon > gioNhan` (theo mục 8.1).
  - Thiết bị đã được gán (PhânCôngThiếtBị) không đếm thêm một lần.

- [ ] **3.3** Đăng ký `IKhaDungService` / `KhaDungService` vào DI container trong `Program.cs` (Scoped).

- [ ] **3.4** Viết unit test `Tests/Services/KhaDungServiceTests.cs` cho ít nhất 3 trường hợp: không có đơn nào trùng lịch, có đơn trùng một phần, tất cả thiết bị đều bị giữ.

- [ ] **3.5** Commit: `feat: add KhaDungService with availability calculation logic`

---

## Task 4: Service danh mục và sản phẩm (IDanhMucService, ISanPhamService)

**Files:**
- Tạo: `Services/Interfaces/IDanhMucService.cs`, `Services/DanhMucService.cs`
- Tạo: `Services/Interfaces/ISanPhamService.cs`, `Services/SanPhamService.cs`
- Tạo: `Models/ViewModels/SanPham/TimKiemSanPhamVM.cs`

**Các bước:**

- [ ] **4.1** Interface `IDanhMucService`:
  ```csharp
  Task<List<DanhMucSanPham>> LayTatCaAsync(bool chiLayHienThi = true);
  Task<DanhMucSanPham?> LayTheoIdAsync(int id);
  Task<DanhMucSanPham> TaoMoiAsync(DanhMucSanPham entity);
  Task CapNhatAsync(DanhMucSanPham entity);
  Task XoaAsync(int id); // chỉ được xóa nếu không có sản phẩm
  ```

- [ ] **4.2** Interface `ISanPhamService`:
  ```csharp
  Task<(List<SanPham> Items, int Total)> TimKiemAsync(TimKiemSanPhamVM filter);
  Task<SanPham?> LayChiTietAsync(int id);
  Task<SanPham> TaoMoiAsync(SanPham entity, List<IFormFile> hinhs);
  Task CapNhatAsync(SanPham entity, List<IFormFile>? hinhsMoi);
  Task DoiTrangThaiAsync(int id, TrangThaiKinhDoanh trangThai);
  ```

- [ ] **4.3** Tạo `TimKiemSanPhamVM.cs` với các thuộc tính lọc: `TuKhoa` (string?), `DanhMucId` (int?), `ThuongHieu` (string?), `GiaThueCaoNhat` (decimal?), `GiaThueThapNhat` (decimal?), `GioNhan` (DateTime?), `GioTra` (DateTime?), `SapXepTheo` (enum: `Ten`, `GiaThap`, `GiaCao`, `DanhGia`), `Trang` (int = 1), `SoMoiTrang` (int = 12).

- [ ] **4.4** Implement `SanPhamService.TimKiemAsync`: build query IQueryable theo từng filter, gọi `IKhaDungService` nếu có `GioNhan` + `GioTra` để lọc sản phẩm không còn hàng, áp dụng phân trang. Chỉ trả về sản phẩm `DangKinhDoanh` cho khách.

- [ ] **4.5** Implement `SanPhamService.TaoMoiAsync`: validate `Ma` không trùng, lưu ảnh vào `wwwroot/uploads/sanpham/`, tạo bản ghi `HinhAnhSanPham`. Chỉ chấp nhận extension `.jpg`, `.jpeg`, `.png`, `.webp`; giới hạn 5MB/file.

- [ ] **4.6** Đăng ký cả hai service vào DI (Scoped).

- [ ] **4.7** Commit: `feat: add DanhMucService and SanPhamService`

---

## Task 5: Controller và View — Tìm kiếm sản phẩm (UC03)

**Files:**
- Tạo: `Controllers/SanPhamController.cs`
- Tạo: `Views/SanPham/Index.cshtml`
- Tạo: `Views/SanPham/ChiTiet.cshtml`
- Tạo: `Models/ViewModels/SanPham/SanPhamListVM.cs`, `SanPhamDetailVM.cs`
- Tạo: `wwwroot/js/san-pham-search.js`

**Các bước:**

- [ ] **5.1** Tạo `SanPhamListVM.cs`: chứa `TimKiemSanPhamVM Filter`, `List<SanPhamCardVM> Items`, `int TotalCount`, `int TotalPages`, `List<DanhMucSanPham> DanhMucs`. Tạo `SanPhamCardVM`: `Id`, `Ten`, `AnhChinh`, `GiaThueNgay`, `MucCoc`, `ThuongHieu`, `SoLuongKhaDung` (int, -1 nếu chưa chọn ngày).

- [ ] **5.2** Tạo `SanPhamDetailVM.cs`: đầy đủ thông tin sản phẩm + `List<HinhAnhSanPham>` + `SoLuongKhaDung` + `List<DanhGiaVM>` (tóm tắt đánh giá).

- [ ] **5.3** `SanPhamController`:
  - `GET /san-pham` → `Index(TimKiemSanPhamVM filter)`: gọi `ISanPhamService.TimKiemAsync`; nếu filter có ngày hợp lệ thì kèm khả dụng; trả view.
  - `GET /san-pham/{id}` → `ChiTiet(int id)`: gọi `ISanPhamService.LayChiTietAsync`; nếu có query param `?gioNhan=&gioTra=` thì kiểm tra khả dụng.

- [ ] **5.4** View `Index.cshtml`:
  - Panel lọc bên trái: chọn danh mục (tree), khoảng giá, thương hiệu (checkbox).
  - Trên cùng: date-time picker chọn `GioNhan` / `GioTra` (submit form GET).
  - Grid sản phẩm: card hiển thị ảnh, tên, giá/ngày, mức cọc, badge khả dụng.
  - Phân trang với `asp-route-*`.

- [ ] **5.5** View `ChiTiet.cshtml`:
  - Carousel ảnh.
  - Thông tin: mô tả, sức chứa, thương hiệu, giá thuê/ngày, mức cọc, giá trị bồi thường.
  - Ô chọn ngày + số lượng + nút "Thêm vào giỏ" (POST AJAX).
  - Hiển thị số lượng khả dụng realtime sau khi chọn ngày.
  - Phần đánh giá bên dưới.

- [ ] **5.6** `san-pham-search.js`: debounce 400ms khi nhập từ khóa; tự submit form khi thay đổi filter; cập nhật URL bằng `history.pushState`.

- [ ] **5.7** Test thủ công: truy cập `/san-pham`, lọc danh mục, chọn ngày, kiểm tra số lượng khả dụng thay đổi đúng.

- [ ] **5.8** Commit: `feat: UC03 product search and availability check views`

---

## Task 6: Service và Controller giỏ thuê (UC04)

**Files:**
- Tạo: `Services/Interfaces/IGioThueService.cs`, `Services/GioThueService.cs`
- Tạo: `Controllers/GioThueController.cs`
- Tạo: `Views/GioThue/Index.cshtml`
- Tạo: `Models/ViewModels/GioThue/GioThueVM.cs`, `ThemVaoGioVM.cs`
- Tạo: `wwwroot/js/gio-thue.js`

**Các bước:**

- [ ] **6.1** Interface `IGioThueService`:
  ```csharp
  Task<GioThueVM> LayGioThueAsync(int khachHangId);
  Task<GioThueVM> ThemSanPhamAsync(int khachHangId, int sanPhamId, int soLuong);
  Task<GioThueVM> CapNhatSoLuongAsync(int khachHangId, int chiTietId, int soLuongMoi);
  Task<GioThueVM> XoaChiTietAsync(int khachHangId, int chiTietId);
  Task<GioThueVM> CapNhatThoiGianAsync(int khachHangId, DateTime gioNhan, DateTime gioTra);
  Task<GioThueVM> ApMaGiamGiaAsync(int khachHangId, string ma);
  Task<bool> KiemTraHopLeAsync(int khachHangId);
  ```

- [ ] **6.2** Tạo `GioThueVM.cs`: `DateTime? GioNhan`, `DateTime? GioTra`, `List<ChiTietGioThueVM> ChiTiets`, `string? MaGiamGia`, `decimal TongTienThue`, `decimal TienGiam`, `decimal TienCoc`, `decimal TongThanhToan`, `List<string> LoiKhaDung`.

- [ ] **6.3** Implement `GioThueService.LayGioThueAsync`: lấy hoặc tạo `GioThue` cho `KhachHangId`. Tính báo giá tạm tính theo mục 8.2: số ngày = `Ceiling((gioTra - gioNhan).TotalHours / 24)`, tối thiểu 1. Áp dụng khuyến mãi nếu có mã hợp lệ.

- [ ] **6.4** Implement `GioThueService.ThemSanPhamAsync`: nếu sản phẩm đã có trong giỏ thì cộng số lượng; nếu chưa thì thêm mới. Kiểm tra sản phẩm `DangKinhDoanh`.

- [ ] **6.5** `GioThueController` (yêu cầu đăng nhập — `[Authorize]`):
  - `GET /gio-thue` → `Index()`: hiển thị giỏ.
  - `POST /gio-thue/them` → AJAX, trả JSON `{success, soLuongGio, thongBao}`.
  - `POST /gio-thue/cap-nhat-so-luong` → AJAX.
  - `POST /gio-thue/xoa` → AJAX.
  - `POST /gio-thue/cap-nhat-thoi-gian` → AJAX, trả lại báo giá mới.
  - `POST /gio-thue/ap-ma-giam-gia` → AJAX.

- [ ] **6.6** View `GioThue/Index.cshtml`:
  - Date-time picker chọn giờ nhận / trả (gọi AJAX cập nhật báo giá).
  - Bảng chi tiết: ảnh, tên, số lượng (stepper +/-), đơn giá, số ngày, thành tiền, nút xóa.
  - Panel báo giá bên phải: tổng tiền thuê, giảm giá, tổng cọc, **tổng thanh toán ban đầu**.
  - Ô nhập mã giảm giá.
  - Nút "Đặt thuê" → POST `/don-thue/xac-nhan`.
  - Hiển thị cảnh báo nếu sản phẩm không còn đủ khả dụng.

- [ ] **6.7** `gio-thue.js`: xử lý tất cả AJAX của giỏ thuê; cập nhật DOM không reload trang; cập nhật badge số lượng trên icon giỏ ở header.

- [ ] **6.8** Test: thêm 2 sản phẩm vào giỏ, đổi số lượng, kiểm tra báo giá tính đúng theo công thức mục 8.2.

- [ ] **6.9** Commit: `feat: UC04 cart management with real-time quote calculation`

---

## Task 7: Tạo đơn và giữ chỗ (UC05)

**Files:**
- Tạo: `Services/Interfaces/IDonThueService.cs`, `Services/DonThueService.cs`
- Tạo: `Controllers/DonThueController.cs`
- Tạo: `Views/DonThue/XacNhan.cshtml`, `Views/DonThue/ChiTiet.cshtml`
- Tạo: `Models/ViewModels/DonThue/TaoDonThueVM.cs`, `XacNhanDonVM.cs`

**Các bước:**

- [ ] **7.1** Interface `IDonThueService`:
  ```csharp
  Task<XacNhanDonVM> ChuanBiXacNhanAsync(int khachHangId);
  Task<DonThue> TaoDonThueAsync(int khachHangId, TaoDonThueVM vm);
  Task<DonThue?> LayChiTietAsync(int id, int khachHangId);
  Task HuyDonAsync(int donThueId, int nguoiHuyId, string lyDo);
  Task XuLyHetHanGiuChoAsync();
  ```

- [ ] **7.2** Tạo `TaoDonThueVM.cs`: `TenNguoiNhan`, `SdtNguoiNhan`, `GhiChu`, `DaXacNhanBaogiaThayDoi` (bool). Tạo `XacNhanDonVM.cs`: toàn bộ thông tin giỏ để khách review + `bool BaogiaThayDoi`.

- [ ] **7.3** Implement `DonThueService.TaoDonThueAsync` — nghiệp vụ cốt lõi:
  1. Kiểm tra lại khả dụng toàn bộ giỏ trong transaction (`IsolationLevel.Serializable`).
  2. Nếu báo giá thay đổi và `DaXacNhanBaogiaThayDoi = false` → throw `BaogiaThayDoiException`.
  3. Nếu đủ hàng: tạo `DonThue` trạng thái `ChoThanhToan`; tạo `GiuCho` từng dòng; tạo `ChiTietDonThue` **snapshot giá** từ `SanPham` tại thời điểm đặt; set `HanGiuCho = Now + 15 phút`; tạm giữ lượt `KhuyenMai`.
  4. Xóa giỏ thuê.
  5. Nếu thiếu hàng bất kỳ một dòng → rollback toàn bộ, throw `KhongDuHangException`.

- [ ] **7.4** `DonThueController`:
  - `GET /don-thue/xac-nhan` → `XacNhan()`: hiển thị màn hình review.
  - `POST /don-thue/tao` → `TaoDon(TaoDonThueVM vm)`: nếu `BaogiaThayDoiException` redirect về xác nhận với flag cảnh báo; thành công redirect `/don-thue/{id}`.
  - `GET /don-thue/{id}` → `ChiTiet(int id)`: chỉ xem đơn của mình.

- [ ] **7.5** View `XacNhan.cshtml`:
  - Bảng tóm tắt: sản phẩm, số lượng, khoảng thuê, đơn giá snapshot.
  - Form nhập `TenNguoiNhan`, `SdtNguoiNhan`.
  - Nếu `BaogiaThayDoi = true`: banner cảnh báo màu vàng + checkbox bắt buộc xác nhận trước khi submit.
  - Nút "Xác nhận đặt thuê".

- [ ] **7.6** View `ChiTiet.cshtml`: badge trạng thái đơn + countdown timer hạn thanh toán (JS) + bảng chi tiết + nút "Thanh toán ngay" + nút "Hủy đơn".

- [ ] **7.7** Đăng ký `IHostedService` chạy `XuLyHetHanGiuChoAsync` mỗi 1 phút: tìm đơn `ChoThanhToan` có `HanGiuCho < Now`, chuyển sang `HetHan`, xóa `GiuCho`, trả lại lượt `KhuyenMai`.

- [ ] **7.8** Test: tạo đơn → kiểm tra trạng thái `ChoThanhToan`; set hạn ngắn → kiểm tra chuyển `HetHan`, khả dụng được giải phóng.

- [ ] **7.9** Commit: `feat: UC05 order creation with 15-minute reservation hold`

---

## Task 8: Thanh toán và xác nhận đơn (UC06)

**Files:**
- Tạo: `Services/Interfaces/IThanhToanService.cs`, `Services/ThanhToanService.cs`
- Tạo: `Controllers/ThanhToanController.cs`
- Tạo: `Views/ThanhToan/Index.cshtml`, `Views/ThanhToan/KetQua.cshtml`
- Tạo: `Models/ViewModels/ThanhToan/ThanhToanVM.cs`, `KetQuaThanhToanVM.cs`

**Lưu ý:** Nếu chưa có tài khoản VNPay, implement mock gateway trả về thành công để unblock các feature khác. Để lại comment `// TODO: Replace with VNPay SDK` tại điểm cần thay thế.

**Các bước:**

- [ ] **8.1** Interface `IThanhToanService`:
  ```csharp
  Task<string> TaoUrlThanhToanAsync(int donThueId, string returnUrl);
  Task<KetQuaThanhToanVM> XuLyKetQuaAsync(IQueryCollection queryParams);
  Task<bool> KiemTraDaThanhToanAsync(int donThueId);
  ```

- [ ] **8.2** Mock gateway: `TaoUrlThanhToanAsync` → trả `/thanh-toan/ket-qua?donId={id}&ketQua=success&maGD={Guid.NewGuid()}`.

- [ ] **8.3** Implement `XuLyKetQuaAsync`:
  1. Validate chữ ký (mock: bỏ qua).
  2. Kiểm tra đơn còn `ChoThanhToan` và chưa hết hạn.
  3. Kiểm tra số tiền trả về đúng `TienThue + TienCoc`.
  4. **Idempotency:** nếu `MaGiaoDich` đã tồn tại → bỏ qua, không ghi trùng.
  5. Nếu hợp lệ: tạo 2 bản ghi `ThanhToan` (tiền thuê + cọc), chuyển đơn sang `DaXacNhan`, xóa `GiuCho`.
  6. Nếu tiền đến sau khi đơn `HetHan` / `KhachHuy`: tạo `ThanhToan` trạng thái `CanHoanTien`, **không khôi phục đơn**.

- [ ] **8.4** `ThanhToanController`:
  - `GET /thanh-toan/{donId}` → kiểm tra đơn thuộc về khách; hiển thị tóm tắt và nút chuyển hướng thanh toán.
  - `GET /thanh-toan/ket-qua` → nhận callback, gọi `XuLyKetQuaAsync`, redirect về `/don-thue/{id}`.

- [ ] **8.5** View `Index.cshtml`: tóm tắt đơn, số tiền = tiền thuê + cọc, countdown hạn giữ chỗ, nút "Thanh toán".

- [ ] **8.6** View `KetQua.cshtml`: spinner "Đang kiểm tra kết quả..." → redirect về chi tiết đơn sau 2 giây.

- [ ] **8.7** Test: tạo đơn → thanh toán (mock) → kiểm tra `DaXacNhan`, có 2 bản ghi `ThanhToan`; gọi callback lần 2 với cùng `MaGiaoDich` → không tạo thêm bản ghi.

- [ ] **8.8** Commit: `feat: UC06 payment processing with idempotency guard`

---

## Task 9: Admin — Quản lý danh mục và sản phẩm (UC21)

**Files:**
- Tạo: `Controllers/Admin/DanhMucController.cs`
- Tạo: `Controllers/Admin/SanPhamController.cs`
- Tạo: `Views/Admin/DanhMuc/Index.cshtml`, `TaoMoi.cshtml`, `ChinhSua.cshtml`
- Tạo: `Views/Admin/SanPham/Index.cshtml`, `TaoMoi.cshtml`, `ChinhSua.cshtml`
- Tạo: `Models/ViewModels/Admin/DanhMucVM.cs`, `SanPhamAdminVM.cs`

**Các bước:**

- [ ] **9.1** Thêm Authorization Policy `AdminOnly` trong `Program.cs`:
  ```csharp
  builder.Services.AddAuthorization(opt =>
      opt.AddPolicy("AdminOnly", p => p.RequireRole("QuanTriVien")));
  ```
  Đặt `[Authorize(Policy = "AdminOnly")]` trên toàn bộ `Controllers/Admin/`.

- [ ] **9.2** `Admin/DanhMucController`:
  - `GET /admin/danh-muc` → danh sách dạng tree.
  - `GET /admin/danh-muc/tao-moi` + `POST` → tạo mới với validation.
  - `GET /admin/danh-muc/chinh-sua/{id}` + `POST` → sửa. Không cho đặt danh mục cha là chính nó hoặc con của nó.
  - `POST /admin/danh-muc/doi-trang-thai/{id}` → ẩn/hiện.

- [ ] **9.3** `Admin/SanPhamController`:
  - `GET /admin/san-pham` → danh sách + filter theo danh mục, trạng thái; hiển thị số thiết bị thực tế.
  - `GET /admin/san-pham/tao-moi` + `POST` → tạo mới với upload ảnh. Validate: `Ma` unique, giá và cọc ≥ 0, giá trị bồi thường > 0. **Không có trường nhập số lượng kho** (nhập hàng phải qua phiếu nhập — tuần sau).
  - `GET /admin/san-pham/chinh-sua/{id}` + `POST` → sửa. Đổi giá chỉ tác động đơn mới; hiển thị cảnh báo nếu đang có đơn `ChoThanhToan` / `DaXacNhan`.
  - `POST /admin/san-pham/doi-trang-thai/{id}` → chuyển trạng thái kinh doanh.

- [ ] **9.4** View `Admin/SanPham/Index.cshtml`: table với cột Mã, Tên, Danh mục, Giá thuê/ngày, Cọc, Số thiết bị (tổng / sẵn sàng), Trạng thái, Hành động. Phân trang server-side.

- [ ] **9.5** View `Admin/SanPham/TaoMoi.cshtml` và `ChinhSua.cshtml`: form đầy đủ với upload ảnh preview, validation client-side (jQuery Validate).

- [ ] **9.6** Test: tạo danh mục cha → con, tạo sản phẩm thuộc danh mục con, đổi giá → kiểm tra đơn cũ không đổi.

- [ ] **9.7** Commit: `feat: UC21 admin category and product management`

---

## Task 10: Seed data, kiểm thử tích hợp và review

**Files:**
- Tạo/Chỉnh sửa: `Data/SeedData.cs`
- Tạo: `Tests/Integration/DonThueFlowTests.cs`

**Các bước:**

- [ ] **10.1** Viết seed data tối thiểu để test toàn bộ flow:
  - 3 danh mục: "Lều trại", "Bàn ghế", "Phụ kiện".
  - 5 sản phẩm với ảnh placeholder, giá và cọc hợp lệ.
  - 10 thiết bị (mỗi sản phẩm 2 chiếc) trạng thái `SanSang`.
  - 1 khuyến mãi `TEST10` giảm 10%, tối thiểu 500.000đ, hết hạn +30 ngày.
  - Tài khoản admin và 1 khách hàng test.

- [ ] **10.2** Integration test `DonThueFlowTests.cs` — happy path:
  1. Tìm sản phẩm → có khả dụng.
  2. Thêm vào giỏ → báo giá đúng.
  3. Tạo đơn → `ChoThanhToan`, có `GiuCho`.
  4. Thanh toán mock → `DaXacNhan`, có 2 `ThanhToan`.
  5. Sản phẩm cùng khoảng thời gian → số khả dụng giảm đúng.

- [ ] **10.3** Kiểm tra race condition: 2 user đặt cùng lúc sản phẩm cuối cùng → chỉ 1 tạo được đơn (xác nhận transaction `Serializable` trong `TaoDonThueAsync`).

- [ ] **10.4** Chạy toàn bộ test:
  ```bash
  dotnet test --logger "console;verbosity=normal"
  ```
  Tất cả phải pass.

- [ ] **10.5** Security check: xác nhận không có raw SQL nào nhận trực tiếp user input; file upload chỉ cho phép `.jpg`, `.jpeg`, `.png`, `.webp`, tối đa 5MB.

- [ ] **10.6** Commit cuối tuần: `feat: week-2 complete — catalog, cart, order, payment, admin CRUD`

---

## Checklist nghiệm thu tuần 2

- [ ] Dự án build thành công, `dotnet run` không lỗi.
- [ ] Đăng ký tài khoản mới → đăng nhập được; email trùng → báo lỗi rõ.
- [ ] Đăng nhập sai 5 lần → bị khóa 15 phút.
- [ ] Quên mật khẩu → token hợp lệ → đổi được mật khẩu mới.
- [ ] Khách vãng lai truy cập `/san-pham`, lọc danh mục, chọn ngày → thấy số lượng khả dụng.
- [ ] Khách đăng nhập thêm sản phẩm vào giỏ → báo giá hiển thị đúng (tiền thuê + cọc).
- [ ] Khách tạo đơn → trạng thái `ChoThanhToan`, có hạn 15 phút.
- [ ] Khách thanh toán → đơn chuyển `DaXacNhan`.
- [ ] Đơn hết hạn chưa thanh toán → tự chuyển `HetHan`.
- [ ] Admin tạo danh mục mới → xuất hiện trên trang tìm kiếm khách.
- [ ] Admin tạo sản phẩm → số thiết bị = 0 (chưa nhập hàng qua phiếu nhập).
- [ ] Admin sửa giá → đơn cũ không thay đổi.
- [ ] Không có lỗi console JS, không có exception 500 trên các luồng chính.
- [ ] Tất cả automated test pass.

---

## Ghi chú kỹ thuật

| Điểm | Lưu ý |
|---|---|
| Race condition đặt hàng | Dùng `IsolationLevel.Serializable` trong transaction `TaoDonThueAsync` |
| Idempotency thanh toán | Unique index trên `ThanhToan.MaGiaoDich`; bỏ qua callback trùng |
| Snapshot giá đơn | Copy `GiaThueNgay`, `MucCocMotThietBi`, `GiaTriBoiThuong` vào `ChiTietDonThue` khi tạo |
| Không xóa lịch sử | Soft-delete cho `SanPham`, `DanhMuc` nếu có giao dịch liên quan |
| Giỏ không giữ hàng | Chỉ `DonThue` mới giữ qua `GiuCho`; giỏ chỉ là draft |
| Admin không nhập kho trực tiếp | Số lượng thiết bị chỉ tăng qua `PhieuNhapHang` — sẽ làm tuần 3 |
