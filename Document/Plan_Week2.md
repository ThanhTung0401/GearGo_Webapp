# GearGo — Kế hoạch Tuần 2: Khởi tạo dự án, Xác thực, Danh mục, Sản phẩm, Giỏ thuê & Đặt đơn

> **Tuần 1** đã chốt đặc tả, chưa đụng code. Tuần 2 này bắt đầu từ zero: khởi tạo dự án đến khi khách có thể tìm sản phẩm, đặt thuê và thanh toán; admin quản lý danh mục và sản phẩm.

**Mục tiêu tuần 2:** Dựng nền tảng dự án + xác thực (UC01) + khách duyệt danh mục / tìm sản phẩm / kiểm tra khả dụng / quản lý giỏ thuê / tạo đơn giữ chỗ / thanh toán xác nhận đơn (UC03–UC06) + admin CRUD danh mục và sản phẩm (UC21).

**Kiến trúc:** ASP.NET Core **Web API** (backend) + **React** (frontend). Backend trả JSON thuần, không có Razor Views. Frontend React gọi API qua fetch/axios kèm JWT token.

**Tech Stack:** ASP.NET Core 10 Web API · Entity Framework Core 9 · SQL Server (Docker) · JWT Bearer Authentication · BCrypt.Net-Next · React (Vite) · Bootstrap 5

---

## Phạm vi tuần 2

| Nhóm | Use Case | Tên nghiệp vụ |
|---|---|---|
| Nền tảng | — | Khởi tạo API, cấu hình EF Core, SQL Server Docker, JWT, CORS |
| Xác thực | UC01 | Đăng ký, đăng nhập, phục hồi mật khẩu |
| Khách | UC03 | Tìm kiếm, xem sản phẩm và kiểm tra khả dụng |
| Khách | UC04 | Quản lý giỏ thuê và xem báo giá |
| Khách | UC05 | Tạo đơn và giữ chỗ |
| Khách | UC06 | Thanh toán và xác nhận đơn |
| Admin | UC21 | Quản lý danh mục và sản phẩm (CRUD) |

---

## Cấu trúc file

```
GearGo_Webapp/                              ← Backend ASP.NET Core Web API
├── GearGo.csproj                           (xong — Task 0)
├── Program.cs                              (xong — Task 0)
├── appsettings.json                        (xong — Task 0)
├── Migrations/                             (xong — tạo qua EF CLI, root project)
│   ├── [timestamp]_InitialCreate.cs
│   └── ApplicationDbContextModelSnapshot.cs
├── Data/
│   └── ApplicationDbContext.cs             (xong — Task 0)
├── Models/
│   ├── Entities/
│   │   ├── TaiKhoan.cs                     (xong — Task 0)
│   │   ├── KhachHang.cs                    (xong — Task 0)
│   │   ├── NhanVien.cs                     (xong — Task 0)
│   │   ├── DanhMucSanPham.cs               (mới — Task 1)
│   │   ├── SanPham.cs                      (mới — Task 1)
│   │   ├── HinhAnhSanPham.cs               (mới — Task 1)
│   │   ├── ThietBi.cs                      (mới — Task 2)
│   │   ├── GioThue.cs                      (mới — Task 2)
│   │   ├── ChiTietGioThue.cs               (mới — Task 2)
│   │   ├── GiuCho.cs                       (mới — Task 2)
│   │   ├── DonThue.cs                      (mới — Task 2)
│   │   ├── ChiTietDonThue.cs               (mới — Task 2)
│   │   ├── ThanhToan.cs                    (mới — Task 2)
│   │   ├── KhuyenMai.cs                    (mới — Task 2)
│   │   └── LuotSuDungKhuyenMai.cs          (mới — Task 2)
│   ├── Enums/
│   │   ├── TrangThaiThietBi.cs             (mới — Task 2)
│   │   └── TrangThaiDonThue.cs             (mới — Task 2)
│   └── DTOs/                               ← request/response JSON, thay ViewModels
│       ├── Auth/
│       │   ├── DangKyRequest.cs            (mới — Task 0.5)
│       │   ├── DangNhapRequest.cs          (mới — Task 0.5)
│       │   ├── QuenMatKhauRequest.cs       (mới — Task 0.5)
│       │   └── AuthResponse.cs             (mới — Task 0.5)
│       ├── SanPham/
│       │   ├── SanPhamResponse.cs          (mới — Task 5)
│       │   ├── SanPhamDetailResponse.cs    (mới — Task 5)
│       │   └── TimKiemSanPhamRequest.cs    (mới — Task 4)
│       ├── GioThue/
│       │   ├── GioThueResponse.cs          (mới — Task 6)
│       │   └── ThemVaoGioRequest.cs        (mới — Task 6)
│       ├── DonThue/
│       │   ├── TaoDonThueRequest.cs        (mới — Task 7)
│       │   └── DonThueResponse.cs          (mới — Task 7)
│       ├── ThanhToan/
│       │   ├── ThanhToanRequest.cs         (mới — Task 8)
│       │   └── ThanhToanResponse.cs        (mới — Task 8)
│       └── Admin/
│           ├── DanhMucRequest.cs           (mới — Task 9)
│           └── SanPhamAdminRequest.cs      (mới — Task 9)
├── Services/
│   ├── Interfaces/
│   │   ├── IXacThucService.cs              (mới — Task 0.5)
│   │   ├── IDanhMucService.cs              (mới — Task 4)
│   │   ├── ISanPhamService.cs              (mới — Task 4)
│   │   ├── IKhaDungService.cs              (mới — Task 3)
│   │   ├── IGioThueService.cs              (mới — Task 6)
│   │   ├── IDonThueService.cs              (mới — Task 7)
│   │   └── IThanhToanService.cs            (mới — Task 8)
│   ├── XacThucService.cs                   (mới — Task 0.5)
│   ├── DanhMucService.cs                   (mới — Task 4)
│   ├── SanPhamService.cs                   (mới — Task 4)
│   ├── KhaDungService.cs                   (mới — Task 3)
│   ├── GioThueService.cs                   (mới — Task 6)
│   ├── DonThueService.cs                   (mới — Task 7)
│   └── ThanhToanService.cs                 (mới — Task 8)
└── Controllers/
    ├── AuthController.cs                   (mới — Task 0.5)
    ├── SanPhamController.cs                (mới — Task 5)
    ├── GioThueController.cs                (mới — Task 6)
    ├── DonThueController.cs                (mới — Task 7)
    ├── ThanhToanController.cs              (mới — Task 8)
    └── Admin/
        ├── DanhMucController.cs            (mới — Task 9)
        └── SanPhamController.cs            (mới — Task 9)
```

---

## Task 0: Khởi tạo dự án và cấu hình nền tảng ✅

**Files đã tạo:**
- `GearGo.csproj` — .NET 10, EF Core 9, BCrypt, JWT Bearer
- `Program.cs` — `AddControllers`, JWT Auth, CORS cho React, Authorization policies
- `appsettings.json` — connection string SQL Server Docker (`localhost,1433`), JWT secret key
- `Data/ApplicationDbContext.cs` — DbContext với TaiKhoans, KhachHangs, NhanViens
- `Models/Entities/TaiKhoan.cs`, `KhachHang.cs`, `NhanVien.cs`
- `Migrations/[timestamp]_InitialCreate.cs`

**Các bước:**

- [x] **0.1** Tạo dự án ASP.NET Core 10 Web API, thêm packages EF Core, BCrypt, JWT Bearer.

- [x] **0.2** `Data/ApplicationDbContext.cs` kế thừa `DbContext`. DbSet: `TaiKhoans`, `KhachHangs`, `NhanViens`.

- [x] **0.3** `appsettings.json`: `ConnectionStrings:DefaultConnection` → SQL Server Docker. `Jwt:SecretKey` → chuỗi bí mật ≥ 32 ký tự.

- [x] **0.4** `Program.cs`:
  - `AddControllers()` (không Views)
  - `AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(...)`
  - `AddAuthorization` — 3 policies: `AdminOnly`, `StaffOrAdmin`, `CustomerOnly`
  - `AddCors("ReactApp")` → `localhost:5173` và `localhost:3000`

- [x] **0.5** `dotnet ef migrations add InitialCreate && dotnet ef database update`

- [x] **0.6** Commit: `feat: Task 0 — khởi tạo ASP.NET Core Web API với EF Core, JWT và CORS`

---

## Task 0.5: Xác thực người dùng (UC01)

**Files:**
- Tạo: `Models/DTOs/Auth/DangKyRequest.cs`, `DangNhapRequest.cs`, `QuenMatKhauRequest.cs`, `AuthResponse.cs`
- Tạo: `Services/Interfaces/IXacThucService.cs`, `Services/XacThucService.cs`
- Tạo: `Controllers/AuthController.cs`

**Lưu ý:** Không dùng ASP.NET Identity. Xác thực thủ công qua `TAI_KHOAN`. BCrypt hash mật khẩu. Trả **JWT token** — không trả cookie hay View.

**Luồng đăng nhập:**
```
React POST /api/auth/dang-nhap { taiKhoan, matKhau }
        │
        ▼
AuthController → XacThucService
        │  BCrypt.Verify → tạo JWT claims: MaTaiKhoan, Email, VaiTro
        ▼
Response: { token, loaiToken: "Bearer", hetHanSau, vaiTro, hoTen }
        │
        ▼
React lưu token, gửi mỗi request:
Authorization: Bearer <token>
```

**Các bước:**

- [ ] **0.5.1** DTOs:
  - `DangKyRequest`: `HoTen`, `Email`, `SoDienThoai`, `MatKhau`, `XacNhanMatKhau`
  - `DangNhapRequest`: `TaiKhoan` (email hoặc SĐT), `MatKhau`
  - `QuenMatKhauRequest`: `Email`
  - `AuthResponse`: `Token`, `LoaiToken = "Bearer"`, `HetHanSau`, `VaiTro`, `HoTen`

- [ ] **0.5.2** Interface `IXacThucService`:
  ```csharp
  Task<(bool ThanhCong, string? LoiLam)> DangKyAsync(DangKyRequest req);
  Task<(bool ThanhCong, AuthResponse? Data, string? LoiLam)> DangNhapAsync(DangNhapRequest req);
  Task<(bool ThanhCong, string? Token)> TaoTokenQuenMatKhauAsync(string email);
  Task<(bool ThanhCong, string? LoiLam)> DatLaiMatKhauAsync(string email, string token, string matKhauMoi);
  ```

- [ ] **0.5.3** Implement `DangKyAsync`:
  - Kiểm tra email và SĐT chưa tồn tại.
  - `BCrypt.Net.BCrypt.HashPassword(req.MatKhau)`.
  - Tạo `TaiKhoan` (`VaiTro = "KhachHang"`) + `KhachHang` liên kết.
  - Không cho đăng ký `NhanVien` / `QuanTriVien` qua endpoint công khai.

- [ ] **0.5.4** Implement `DangNhapAsync`:
  - Tìm theo email hoặc SĐT → `BCrypt.Verify` → kiểm tra `TrangThai`.
  - Tạo JWT token với claims `MaTaiKhoan`, `Email`, `VaiTro`, hết hạn 7 ngày.
  - Theo dõi số lần sai → khóa sau N lần (đọc từ `AppSettings`).

- [ ] **0.5.5** `AuthController` — `[Route("api/auth")]`:
  - `POST /api/auth/dang-ky` → `201 Created`
  - `POST /api/auth/dang-nhap` → `{ token, ... }`
  - `POST /api/auth/quen-mat-khau` → `200 OK`
  - `POST /api/auth/dat-lai-mat-khau` → đặt lại mật khẩu
  - `GET /api/auth/toi` `[Authorize]` → thông tin user từ JWT claims

- [ ] **0.5.6** Đăng ký `IXacThucService` (Scoped) trong `Program.cs`.

- [ ] **0.5.7** Test bằng Postman hoặc curl:
  ```bash
  # Đăng ký
  curl -X POST http://localhost:5000/api/auth/dang-ky \
    -H "Content-Type: application/json" \
    -d '{"hoTen":"Test","email":"test@test.com","soDienThoai":"0901234567","matKhau":"12345678","xacNhanMatKhau":"12345678"}'

  # Đăng nhập → lấy token
  curl -X POST http://localhost:5000/api/auth/dang-nhap \
    -H "Content-Type: application/json" \
    -d '{"taiKhoan":"test@test.com","matKhau":"12345678"}'
  ```

- [ ] **0.5.8** Commit: `feat: UC01 — JWT authentication API`

---

## Task 1: Entities cho danh mục và sản phẩm

**Files:**
- Tạo: `Models/Entities/DanhMucSanPham.cs`, `SanPham.cs`, `HinhAnhSanPham.cs`
- Chỉnh sửa: `Data/ApplicationDbContext.cs`

**Các bước:**

- [ ] **1.1** `DanhMucSanPham.cs`: `Id`, `Ten`, `DanhMucChaId` (nullable, self-ref), `MoTa`, `ThuTu`, `HienThi`, `CreatedAt`, `UpdatedAt`.

- [ ] **1.2** `SanPham.cs`: `Id`, `Ma` (unique), `Ten`, `DanhMucId`, `ThuongHieu`, `MoTa`, `SucChuaHoacKichThuoc`, `GiaThueNgay`, `MucCocMotThietBi`, `GiaTriBoiThuong`, `TrangThaiKinhDoanh` (enum), `CreatedAt`, `UpdatedAt`.

- [ ] **1.3** `HinhAnhSanPham.cs`: `Id`, `SanPhamId`, `DuongDan`, `LaAnhChinh`, `ThuTu`.

- [ ] **1.4** Fluent API: unique index `SanPham.Ma`, self-reference `DanhMucSanPham`, cascade delete `HinhAnhSanPham`.

- [ ] **1.5** `dotnet ef migrations add AddCatalog && dotnet ef database update`

- [ ] **1.6** Commit: `feat: add DanhMucSanPham, SanPham, HinhAnhSanPham entities`

---

## Task 2: Entities cho thiết bị, giỏ thuê và đặt đơn

**Files:**
- Tạo: `Models/Entities/ThietBi.cs`, `GioThue.cs`, `ChiTietGioThue.cs`, `GiuCho.cs`, `DonThue.cs`, `ChiTietDonThue.cs`, `ThanhToan.cs`, `KhuyenMai.cs`, `LuotSuDungKhuyenMai.cs`
- Tạo: `Models/Enums/TrangThaiThietBi.cs`, `TrangThaiDonThue.cs`
- Chỉnh sửa: `Data/ApplicationDbContext.cs`

**Các bước:**

- [ ] **2.1** Enum `TrangThaiThietBi`: `SanSang`, `DangThue`, `DangBaoTri`, `ThatLac`, `NgungSuDung`.

- [ ] **2.2** Enum `TrangThaiDonThue`: `ChoThanhToan`, `DaXacNhan`, `DangChuanBi`, `SanSangNhan`, `DangThue`, `DaNhanTra`, `ChoDoiSoat`, `HoanTat`, `HetHan`, `KhachHuy`, `CuaHangHuy`.

- [ ] **2.3–2.9** Tạo các entities theo ERD: `ThietBi`, `GioThue`, `ChiTietGioThue`, `GiuCho`, `DonThue`, `ChiTietDonThue`, `ThanhToan`, `KhuyenMai`, `LuotSuDungKhuyenMai`.

- [ ] **2.10** Fluent API: unique index `DonThue.Ma`; `GioThue` 1-1 `KhachHang`; không cascade delete `DonThue` khi xóa `KhachHang`.

- [ ] **2.11** `dotnet ef migrations add AddOrderAndCartTables && dotnet ef database update`

- [ ] **2.12** Commit: `feat: add ThietBi, GioThue, DonThue, ThanhToan, KhuyenMai entities`

---

## Task 3: Service tính khả dụng (IKhaDungService)

**Files:**
- Tạo: `Services/Interfaces/IKhaDungService.cs`, `Services/KhaDungService.cs`

**Các bước:**

- [ ] **3.1** Interface:
  ```csharp
  Task<int> LayKhaDungAsync(int sanPhamId, DateTime gioNhan, DateTime gioTra);
  Task<Dictionary<int, int>> LayKhaDungNhieuSanPhamAsync(IEnumerable<int> ids, DateTime gioNhan, DateTime gioTra);
  ```

- [ ] **3.2** Implement: đếm `ThietBi` trạng thái `SanSang`/`DangThue`, trừ số đang bị giữ. Lịch trùng: `gioNhanDon < gioTra` VÀ `gioTraDon > gioNhan`.

- [ ] **3.3** Đăng ký DI (Scoped). Unit test 3 trường hợp: không trùng, trùng một phần, tất cả bị giữ.

- [ ] **3.4** Commit: `feat: add KhaDungService`

---

## Task 4: Service danh mục và sản phẩm

**Files:**
- Tạo: `Services/Interfaces/IDanhMucService.cs`, `DanhMucService.cs`
- Tạo: `Services/Interfaces/ISanPhamService.cs`, `SanPhamService.cs`
- Tạo: `Models/DTOs/SanPham/TimKiemSanPhamRequest.cs`

**Các bước:**

- [ ] **4.1** `IDanhMucService`: LayTatCa, LayTheoId, TaoMoi, CapNhat, Xoa (chỉ xóa nếu không có sản phẩm).

- [ ] **4.2** `ISanPhamService`: TimKiem (phân trang + filter), LayChiTiet, TaoMoi (upload ảnh), CapNhat, DoiTrangThai.

- [ ] **4.3** `TimKiemSanPhamRequest`: `TuKhoa`, `DanhMucId`, `ThuongHieu`, `GiaThueCaoNhat`, `GiaThueThapNhat`, `GioNhan`, `GioTra`, `SapXepTheo`, `Trang=1`, `SoMoiTrang=12`.

- [ ] **4.4** Upload ảnh: chỉ `.jpg/.jpeg/.png/.webp`, tối đa 5MB, lưu `wwwroot/uploads/sanpham/`.

- [ ] **4.5** Đăng ký DI. Commit: `feat: add DanhMucService and SanPhamService`

---

## Task 5: Controller sản phẩm (UC03)

**Files:**
- Tạo: `Controllers/SanPhamController.cs`
- Tạo: `Models/DTOs/SanPham/SanPhamResponse.cs`, `SanPhamDetailResponse.cs`

**Các bước:**

- [ ] **5.1** `SanPhamController` — `[Route("api/san-pham")]`:
  - `GET /api/san-pham` → `([FromQuery] TimKiemSanPhamRequest filter)` → JSON danh sách + phân trang
  - `GET /api/san-pham/{id}` → chi tiết + `SoLuongKhaDung` nếu có query `?gioNhan=&gioTra=`

- [ ] **5.2** `SanPhamResponse`: `Id`, `Ten`, `AnhChinh`, `GiaThueNgay`, `MucCoc`, `ThuongHieu`, `SoLuongKhaDung`.

- [ ] **5.3** `SanPhamDetailResponse`: đầy đủ thông tin + `List<string> HinhAnhs` + `SoLuongKhaDung`.

- [ ] **5.4** Commit: `feat: UC03 product search API`

---

## Task 6: Service và Controller giỏ thuê (UC04)

**Files:**
- Tạo: `Services/Interfaces/IGioThueService.cs`, `GioThueService.cs`
- Tạo: `Controllers/GioThueController.cs`
- Tạo: `Models/DTOs/GioThue/GioThueResponse.cs`, `ThemVaoGioRequest.cs`

**Các bước:**

- [ ] **6.1** `GioThueController` — `[Authorize]`, `[Route("api/gio-thue")]`:
  - `GET /api/gio-thue` → lấy giỏ
  - `POST /api/gio-thue/them` → thêm sản phẩm
  - `PUT /api/gio-thue/cap-nhat-so-luong` → cập nhật số lượng
  - `DELETE /api/gio-thue/{chiTietId}` → xóa dòng
  - `PUT /api/gio-thue/thoi-gian` → cập nhật giờ nhận/trả
  - `POST /api/gio-thue/ma-giam-gia` → áp mã

- [ ] **6.2** Tính báo giá: `SoNgay = Ceiling((gioTra - gioNhan).TotalHours / 24)`, tối thiểu 1.

- [ ] **6.3** `GioThueResponse`: `GioNhan`, `GioTra`, `ChiTiets`, `MaGiamGia`, `TongTienThue`, `TienGiam`, `TienCoc`, `TongThanhToan`, `LoiKhaDung`.

- [ ] **6.4** Commit: `feat: UC04 cart management API`

---

## Task 7: Tạo đơn và giữ chỗ (UC05)

**Files:**
- Tạo: `Services/Interfaces/IDonThueService.cs`, `DonThueService.cs`
- Tạo: `Controllers/DonThueController.cs`
- Tạo: `Models/DTOs/DonThue/TaoDonThueRequest.cs`, `DonThueResponse.cs`

**Các bước:**

- [ ] **7.1** `DonThueController` — `[Authorize]`, `[Route("api/don-thue")]`:
  - `GET /api/don-thue/xac-nhan` → preview giỏ trước khi đặt
  - `POST /api/don-thue` → tạo đơn
  - `GET /api/don-thue/{id}` → chi tiết đơn của mình
  - `POST /api/don-thue/{id}/huy` → hủy đơn

- [ ] **7.2** `TaoDonThueAsync` (`IsolationLevel.Serializable`):
  1. Kiểm tra khả dụng toàn bộ giỏ.
  2. Tạo `DonThue` (`ChoThanhToan`) + `GiuCho` + snapshot giá vào `ChiTietDonThue`.
  3. `HanGiuCho = Now + 15 phút`. Xóa giỏ thuê.

- [ ] **7.3** `IHostedService` mỗi 1 phút: đơn `ChoThanhToan` hết hạn → `HetHan`, xóa `GiuCho`.

- [ ] **7.4** Commit: `feat: UC05 order creation API with 15-minute hold`

---

## Task 8: Thanh toán (UC06)

**Files:**
- Tạo: `Services/Interfaces/IThanhToanService.cs`, `ThanhToanService.cs`
- Tạo: `Controllers/ThanhToanController.cs`
- Tạo: `Models/DTOs/ThanhToan/ThanhToanRequest.cs`, `ThanhToanResponse.cs`

**Lưu ý:** Mock gateway trước, để lại `// TODO: Replace with VNPay SDK`.

**Các bước:**

- [ ] **8.1** Mock: `TaoUrlThanhToanAsync` → trả URL callback với `donId` và `maGD`.

- [ ] **8.2** `XuLyKetQuaAsync`: idempotency check `MaGiaoDich` → tạo 2 `ThanhToan` → đơn `DaXacNhan` → xóa `GiuCho`.

- [ ] **8.3** `ThanhToanController` — `[Route("api/thanh-toan")]`:
  - `POST /api/thanh-toan/{donId}/tao-url` → trả URL thanh toán
  - `GET /api/thanh-toan/ket-qua` → nhận callback từ gateway

- [ ] **8.4** Commit: `feat: UC06 payment API with idempotency`

---

## Task 9: Admin — Quản lý danh mục và sản phẩm (UC21)

**Files:**
- Tạo: `Controllers/Admin/DanhMucController.cs`, `Controllers/Admin/SanPhamController.cs`
- Tạo: `Models/DTOs/Admin/DanhMucRequest.cs`, `SanPhamAdminRequest.cs`

**Các bước:**

- [ ] **9.1** `[Authorize(Policy = "AdminOnly")]` trên toàn bộ `Controllers/Admin/`.

- [ ] **9.2** `Admin/DanhMucController` — `[Route("api/admin/danh-muc")]`: CRUD + ẩn/hiện. Không cho đặt cha là chính nó hoặc con của nó.

- [ ] **9.3** `Admin/SanPhamController` — `[Route("api/admin/san-pham")]`: CRUD + upload ảnh. Không nhập kho trực tiếp (tuần 3).

- [ ] **9.4** Commit: `feat: UC21 admin category and product API`

---

## Task 10: Seed data và kiểm thử

**Files:**
- Tạo: `Data/SeedData.cs`
- Tạo: `Tests/Integration/DonThueFlowTests.cs`

**Các bước:**

- [ ] **10.1** Seed: 3 danh mục, 5 sản phẩm, 10 thiết bị (`SanSang`), 1 khuyến mãi `TEST10`, 1 tài khoản `QuanTriVien` + 1 `KhachHang`.

- [ ] **10.2** Integration test happy path: đăng nhập → JWT token → thêm giỏ → tạo đơn → thanh toán mock → `DaXacNhan`.

- [ ] **10.3** Race condition: 2 user đặt cùng lúc sản phẩm cuối → chỉ 1 tạo được (`Serializable`).

- [ ] **10.4** Security: không raw SQL nhận user input; upload chỉ `.jpg/.jpeg/.png/.webp`, 5MB.

- [ ] **10.5** Commit: `feat: week-2 complete`

---

## Checklist nghiệm thu tuần 2

- [ ] `dotnet build` — 0 errors.
- [ ] `POST /api/auth/dang-ky` → `201`, tạo tài khoản thành công.
- [ ] `POST /api/auth/dang-nhap` → trả JWT token hợp lệ.
- [ ] Gọi API `[Authorize]` không có token → `401 Unauthorized`.
- [ ] Gọi API `AdminOnly` bằng token `KhachHang` → `403 Forbidden`.
- [ ] `GET /api/san-pham` → JSON danh sách + phân trang.
- [ ] Thêm giỏ → báo giá đúng công thức mục 8.2.
- [ ] Tạo đơn → `ChoThanhToan`, hạn 15 phút.
- [ ] Thanh toán mock → `DaXacNhan`.
- [ ] Đơn hết hạn → tự `HetHan`.
- [ ] Admin CRUD danh mục và sản phẩm qua API.
- [ ] Tất cả test pass.

---

## Ghi chú kỹ thuật

| Điểm | Lưu ý |
|---|---|
| Xác thực | JWT Bearer — React gửi `Authorization: Bearer <token>` mỗi request |
| Hash mật khẩu | `BCrypt.Net.BCrypt.HashPassword/Verify` |
| CORS | `AllowCredentials()` bắt buộc khi React gửi header Authorization |
| Race condition | `IsolationLevel.Serializable` trong `TaoDonThueAsync` |
| Idempotency thanh toán | Unique index `ThanhToan.MaGiaoDich` |
| Snapshot giá đơn | Copy giá vào `ChiTietDonThue` tại thời điểm đặt |
| Migrations | EF Core tạo `Migrations/` ở root project |
| Database | SQL Server trong Docker container `geargo-sqlserver` (`localhost,1433`) |
| Không có Views | Backend trả JSON thuần — UI hoàn toàn do React xử lý |
