# GearGo Webapp

Nền tảng quản lý và cho thuê thiết bị dã ngoại & cắm trại (**10 phân hệ nghiệp vụ / 71 màn hình**), xây dựng theo kiến trúc **ASP.NET Core Web API (.NET 10)** kết hợp **React 19 + TypeScript + Vite 8**.

---

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ chính |
|---|---|
| **Backend** | ASP.NET Core Web API (`.NET 10`), Entity Framework Core 9, SQL Server 2022 (`Docker`), JWT Bearer + ASP.NET Core Identity (RBAC động `[RequirePermission]`), `DonThueExpirationJob` (quét hết hạn giữ chỗ 15 phút) |
| **Frontend** | React 19, TypeScript 5.7, Vite 8, Tailwind CSS 4, React Router DOM 7 (`BrowserRouter`) |
| **Kiểm thử** | xUnit (`backend/test/GearGo.Tests`), Vitest (`frontend`), Playwright E2E 10 phân hệ (`tests/playwright`) |
| **Tài liệu & Automation** | Python `python-docx` (`scripts/chuong7`), Playwright auto-annotation (`capture_71_ucs.mjs`) |

---

## 2. Yêu cầu môi trường

- **.NET SDK 10** (`dotnet --version` ≥ 10)
- **Node.js ≥ 20** (`npm` / `pnpm`)
- **Docker & Docker Compose** (SQL Server 2022)
- **Python ≥ 3.10** *(tùy chọn, dùng để build/audit tài liệu Chương 7)*

---

## 3. Hướng dẫn khởi chạy dự án

### Bước 1: Khởi tạo SQL Server (Docker)
Tại thư mục gốc dự án:
```powershell
docker compose up -d
```
- Container: `geargo-sql` (SQL Server 2022 Developer)
- Host port: **`11433`** → Container port: `1433` (tránh xung đột port `1433` mặc định)
- Tài khoản `sa`: mật khẩu `GearGo@123` (đã cấu hình sẵn trong `backend/appsettings.json`)
- Dừng container: `docker compose down` · Xóa dữ liệu volume: `docker compose down -v`

### Bước 2: Chạy Backend (Port `5000`)
```powershell
dotnet restore backend/GearGo.csproj
dotnet run --project backend/GearGo.csproj --urls http://localhost:5000
```
- Lần đầu khởi động, hệ thống tự động apply toàn bộ EF Core Migrations và chạy `DbSeeder.SeedAllAsync` để khởi tạo danh mục, sản phẩm, thiết bị (`SanSang`), chính sách, khuyến mãi, đơn mẫu và phân quyền mặc định.
- **Swagger UI:** `http://localhost:5000/swagger`

Reset & seed lại từ đầu khi cần:
```powershell
dotnet ef database drop -f --project backend/GearGo.csproj
dotnet run --project backend/GearGo.csproj --urls http://localhost:5000
```

### Bước 3: Chạy Frontend (Port `8443`)
```powershell
npm --prefix frontend install
npm --prefix frontend run dev -- --port 8443 --host
```
- File `frontend/.env.development` đã cấu hình sẵn `VITE_API_URL=http://localhost:5000` và `VITE_USE_MOCK=false` để kết nối trực tiếp Backend & SQL Server thật.
- Để tạm chạy chế độ Demo offline (localStorage), đặt `VITE_USE_MOCK=true` trong `frontend/.env.local`.

---

## 4. Cổng đăng nhập & Tài khoản Seed

Hệ thống tách riêng 2 cổng đăng nhập với đường dẫn độc lập:
- **Cổng Khách hàng:** `http://localhost:8443/login`
- **Cổng Nhân viên / Quản trị:** `http://localhost:8443/staff/login` (sau khi đăng nhập chuyển vào `/staff`)

Mật khẩu chung cho toàn bộ tài khoản seed: **`GearGo@2026`**

| Cổng | Email / SĐT | Vai trò | Ghi chú |
|---|---|---|---|
| Khách hàng (`/login`) | `customer@geargo.vn` (`0901000003`) | `KhachHang` | Nguyễn Văn An |
| Khách hàng (`/login`) | `quang.kh@geargo.vn` | `KhachHang` | Trần Minh Quang |
| Khách hàng (`/login`) | `locked.kh@geargo.vn` | `KhachHang` | Tài khoản bị khóa (kiểm thử UC1.2) |
| Nội bộ (`/staff/login`) | `admin@geargo.vn` (`0901000001`) | `QuanTriVien` | Nguyễn Văn Quản Trị (Full quyền) |
| Nội bộ (`/staff/login`) | `staff@geargo.vn` (`0901000002`) | `NhanVien` | Lê Thị Mai |
| Nội bộ (`/staff/login`) | `tuan.staff@geargo.vn` (`0901000005`) | `NhanVien` | Trần Tuấn |

---

## 5. Tổng quan 10 Phân hệ nghiệp vụ

1. **PH1 – Tài khoản & Nhân viên (`UC1.1`–`UC1.13`):** Đăng ký, đăng nhập 2 cổng, quên mật khẩu OTP, hồ sơ cá nhân, quản lý khách hàng/nhân viên và phân quyền RBAC động (`[RequirePermission]`).
2. **PH2 – Tư vấn, Danh mục & Khả dụng (`UC2.1`–`UC2.4.2`):** Lọc/tìm kiếm thiết bị, tính tồn kho khả dụng theo lịch thuê (`Sweep Line`), ràng buộc ngày nhận/trả hợp lệ, tư vấn bộ đồ AI.
3. **PH3 – Giỏ thuê, Đặt giữ chỗ & Hủy đơn (`UC3.1`–`UC3.4`):** Báo giá theo block 24h, áp mã khuyến mãi, tạo đơn giữ chỗ 15 phút (`HanThanhToan` chuẩn UTC), theo dõi & hủy đơn.
4. **PH4 – Chuẩn bị, Bàn giao & Nhận trả (`UC4.1`–`UC4.5`):** Phân công mã thiết bị thực tế, xuất phiếu bàn giao, nhận trả một phần/toàn phần, xử lý quá hạn & không đến nhận.
5. **PH5 – Thanh toán, Phụ phí, Đối soát & Hoàn tiền (`UC5.1`–`UC5.7`):** Thanh toán VietQR 15 phút, lập/duyệt/tranh chấp phụ phí, đối soát tiền cọc, thu bổ sung, hoàn tiền & điều chỉnh tài chính sau chốt.
6. **PH6 – Sản phẩm, Thiết bị & Bảo trì (`UC6.1`–`UC6.15`):** Quản lý danh mục/sản phẩm/hình ảnh, vòng đời từng thiết bị, phiếu bảo trì sửa chữa.
7. **PH7 – Nhà cung cấp, Nhập kho & Kiểm kê (`UC7.1`–`UC7.10`):** Quản lý nhà cung cấp, phiếu nhập hàng, điều chỉnh kho & đối chiếu kiểm kê mã vạch.
8. **PH8 – Khuyến mãi & Chính sách (`UC8.1`–`UC8.5`):** Tạo/tạm dừng mã giảm giá, quản lý chính sách thuê theo phiên bản (`PolicyVersion`).
9. **PH9 – Đánh giá & Thông báo (`UC9.1`–`UC9.4`):** Đánh giá sau thuê, phản hồi đánh giá, thông báo thời gian thực cho khách và nhân viên.
10. **PH10 – Báo cáo & Nhật ký (`UC10.1`–`UC10.4`):** Báo cáo doanh thu, tỷ lệ sử dụng thiết bị, nhật ký vận hành & đối soát giao dịch.

---

## 6. Kiểm thử & Script tiện ích

### Backend Unit / Integration Tests (xUnit)
```powershell
dotnet test GearGo_Webapp.sln
```

### Playwright E2E (10 phân hệ)
*(Yêu cầu Backend đang chạy tại `:5000` và Frontend đang chạy tại `:8443`)*
```powershell
# Chạy toàn bộ test Playwright Frontend (10 phân hệ)
npm --prefix tests/playwright run test:frontend

# Chạy toàn bộ test Playwright Backend API (10 phân hệ)
npm --prefix tests/playwright run test:backend

# Chạy cả Frontend + Backend
npm --prefix tests/playwright test

# Chạy riêng một phân hệ (ví dụ Phân hệ 3)
Push-Location tests/playwright; npx playwright test frontend/phan_he_03_dat_thue_thanh_toan_huy/phan_he_03.spec.ts; Pop-Location
```

### Cập nhật ảnh & Tài liệu Chương 7
```powershell
# Chụp 71 màn hình thực tế & xuất manifest_71_ucs.json
node tests/playwright/capture_71_ucs.mjs

# Rebuild file Word Chương 7 & kiểm tra audit 100%
python scripts/chuong7/rebuild_chuong7_71_ucs.py
python scripts/chuong7/audit_chuong7.py
```

---

## 7. Cấu trúc thư mục

```text
GearGo_Webapp/
├── backend/
│   ├── BackgroundJobs/          # DonThueExpirationJob (tự động hết hạn giữ chỗ 15p)
│   ├── Controllers/             # API Controllers theo domain (Auth, Catalog, Order, Finance, Inventory...)
│   ├── Data/
│   │   ├── ApplicationDbContext.cs
│   │   ├── DbSeeder.cs
│   │   └── Seeders/             # Seeders chuẩn theo bảng & nghiệp vụ
│   ├── Helpers/                 # DomainConstants, CalculationHelpers, AuditLogHelper...
│   ├── Middleware/              # ExceptionHandlingMiddleware
│   ├── Migrations/              # EF Core Migrations
│   ├── Models/                  # Entities (39 bảng), DTOs, Enums
│   ├── Services/                # Interfaces & Implements theo từng phân hệ
│   ├── test/GearGo.Tests/       # xUnit tests
│   └── Program.cs               # Cấu hình DI, JWT, CORS, UtcDateTimeJsonConverter
├── frontend/
│   ├── src/
│   │   ├── components/          # UI components dùng chung
│   │   ├── context/             # AppContext & AppState types
│   │   ├── features/permissions/# RBAC PermissionsContext & hooks
│   │   ├── hooks/               # useAppStoreState, useAppEffects, useAppProviderValue, useBootstrapData...
│   │   ├── layouts/             # PublicLayout, AuthLayout, WorkspaceLayout
│   │   ├── modules/             # Các module nghiệp vụ (auth, catalog, orders, inventory, marketing, reports...)
│   │   ├── routes/              # routeMap.ts, AppRouterView.tsx
│   │   ├── services/            # apiClient, api/*, mappers/*
│   │   ├── views/               # CustomerPortal, WorkspaceView
│   │   └── App.tsx              # Root component
│   ├── .env.development         # Cấu hình kết nối Backend thật mặc định
│   └── package.json
├── tests/
│   └── playwright/
│       ├── backend/             # 10 phân hệ API E2E tests
│       ├── frontend/            # 10 phân hệ UI E2E tests
│       ├── helpers/             # auth.ts, testData.ts, subsystemVideo.ts
│       └── capture_71_ucs.mjs   # Script chụp & đánh số 71 màn hình Chương 7
├── scripts/
│   ├── chuong7/                 # Package Python phân hệ hóa dựng & audit tài liệu Chương 7
│   ├── export_swagger.mjs
│   └── SeedData_GearGo_Full.sql
├── Document/
│   ├── GearGo_Chuong_7_Thiet_Ke_Giao_Dien_Day_Du_ReactJS.docx
│   ├── GearGo_Dac_Ta_10_Phan_He_Use_Cases.md
│   ├── GearGo_Dac_Ta_Nghiep_Vu.md
│   ├── GearGo_Giai_Thich_39_Entities.md
│   ├── Swagger_API_Catalog.md
│   └── screenshots_uc/          # 80 ảnh chụp thực tế & manifest_71_ucs.json
├── docker-compose.yml
├── GearGo_Webapp.sln
└── README.md
```
