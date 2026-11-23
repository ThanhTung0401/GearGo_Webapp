# Phần 4 — Kim Xuyến

**Vai trò dự án:** Giỏ thuê + Admin CRUD (sản phẩm, danh mục) + Báo giá dùng chung + Tư vấn AI + FE Admin.
**Phụ trách viết trong báo cáo:**
- **Chương 4 (phần B)** — UI & luồng màn hình **nhánh Staff + Admin**
- **Chương 5 — Thiết kế xử lý & Kiến trúc source** (toàn bộ)

---

## A. Chương 4 (phần B) — UI nhánh Staff + Admin

### 4.B.1 Sitemap nhánh staff/admin
```
/staff/login -> /staff (dashboard)
                   |
    +------+-------+----------+---------+----------+
    v      v       v          v         v          v
/staff  /staff  /staff    /staff    /staff    /staff
/don-thue /thiet-bi /nhap-kho /khuyen-mai /chinh-sach /bao-cao
    |
    v
/staff/don-thue/:id -> [Chuan bi] [Ban giao] [Nhan tra] [Phu phi]

/admin (full quyen them 3 trang):
  /admin/tai-khoan + /nhan-vien + /phan-quyen
  /admin/danh-gia (duyet an/hien)
  /admin/kiem-ke + /dieu-chinh-kho (duyet)
```

### 4.B.2 Danh sách màn hình nhánh staff/admin (~40 màn hình)
Bảng rút gọn, mã theo prefix `SC-ST-xx` (staff) + `SC-AD-xx` (admin):

| Mã | Tên màn hình | Đối tượng | Mô tả |
|---|---|---|---|
| SC-AD-01 | Dashboard admin | Admin | KPI 10 PH, biểu đồ doanh thu |
| SC-AD-02 | Quản lý tài khoản | Admin | CRUD + khóa/mở khóa |
| SC-AD-03 | Quản lý nhân viên | Admin | CRUD + gán quyền |
| SC-AD-04 | Phân quyền động | Admin | Matrix nhân viên × quyền `[RequirePermission]` |
| SC-AD-05 | CRUD danh mục | Admin | Tree view, kéo thả thứ tự |
| SC-AD-06 | CRUD sản phẩm | Admin | Form + upload ảnh (magic bytes check) |
| SC-AD-07 | Duyệt điều chỉnh kho | Admin | Danh sách đề nghị từ staff |
| SC-AD-08 | Duyệt phụ phí tranh chấp | Admin | Bằng chứng + quyết định |
| SC-AD-09 | Chính sách phiên bản | Admin | Timeline bản đang hiệu lực |
| SC-AD-10 | CRUD khuyến mãi | Admin | Phạm vi SP/DM, giới hạn lượt |
| SC-AD-11 | Duyệt đánh giá | Admin | Ẩn/hiện + lý do |
| SC-AD-12 | Báo cáo doanh thu | Admin | Lọc kỳ, tách thuê/phụ phí/hủy |
| SC-AD-13 | Báo cáo nhập hàng | Admin | Theo kỳ/NCC/SP |
| SC-AD-14 | Nhật ký hệ thống | Admin | Audit log |
| SC-ST-01 | Dashboard staff | Staff | KPI theo quyền |
| SC-ST-02 | Danh sách đơn vận hành | Staff | Lọc theo trạng thái/QR |
| SC-ST-03 | Chuẩn bị đơn — phân công thiết bị | Staff | Chọn serial cho từng dòng |
| SC-ST-04 | Phiếu bàn giao | Staff | Checklist, ảnh trước thuê |
| SC-ST-05 | Phiếu nhận trả | Staff | Đợt, trả một phần |
| SC-ST-06 | Lập phụ phí | Staff | Loại, bằng chứng, chuyển duyệt |
| SC-ST-07 | Bảng đối soát cọc | Staff | Thu/hoàn, chốt Hoàn tất |
| SC-ST-08 | Lập phiếu bảo trì | Staff | Loại, chi phí, tiến độ |
| SC-ST-09 | Kiểm kê & đề nghị điều chỉnh | Staff | Mã thiết bị thực tế |
| SC-ST-10 | Lập phiếu nhập nháp | Staff | Chọn NCC, dòng SP |

### 4.B.3 Screenshot admin/staff
- Lấy từ `Document/screenshots_uc/` + `manifest_71_ucs.json` — chọn 12–15 màn hình tiêu biểu.
- Mỗi màn hình kèm callout đánh số bước (1, 2, 3...) — lấy từ `tests/playwright/capture_71_ucs.mjs` output.

---

## B. Chương 5 — Thiết kế xử lý & Kiến trúc source

### 5.1 Kiến trúc tổng thể (3-tier)
Vẽ sơ đồ (Mermaid C4 context hoặc draw.io):
```
+-------------------+   HTTPS   +-------------------+   EF Core   +-------------+
| Frontend React 19 | --------> | Backend .NET 10   | ----------> | SQL Server  |
| Vite + Tailwind   | <-------- | Controllers/      | <---------- | 2022 Docker |
| React Router 7    |  JWT      | Services/Data     |  Migrations |             |
+-------------------+           +-------------------+             +-------------+
                                         |
                                         +--> DonThueExpirationJob (HostedService)
```

### 5.2 Kiến trúc Backend — Layered Architecture
Trình bày 5 lớp:
1. **Controllers** (`backend/Controllers/`) — HTTP routing, DTO validation, gọi service, map response.
2. **Services** (`backend/Services/`) — logic nghiệp vụ, giao dịch, kiểm tra quyền.
3. **Data** (`backend/Data/ApplicationDbContext.cs`) — EF Core DbContext, Fluent API, seed.
4. **Models** (`backend/Models/Entities, DTOs, Enums`) — entity/DTO/enum.
5. **Cross-cutting:** `Middleware/ExceptionHandlingMiddleware.cs`, `Helpers/*`, `BackgroundJobs/DonThueExpirationJob.cs`, `Configuration/`.

**Quy ước đặt tên C# (PascalCase <-> snake_case SQL):**
- Entity: `DonThue` <-> bảng `DON_THUE`, cột `MaDonThue` <-> `ma_don_thue`.
- Interface: `IDonThueService`, implement `DonThueService`.
- Enum lưu dạng chuỗi (`EnumToString` conversion).

**Danh sách Controller theo domain** (lấy từ `backend/Controllers/`):
- `Auth/` — JWT, OTP.
- `Catalog/` — SanPham, DanhMuc, KhaDung.
- `Order/` — DonThue, GioThue, BanGiao, NhanTra.
- `Finance/` — ThanhToan, PhuPhi, DoiSoat, HoanTien.
- `Inventory/` — NhaCungCap, PhieuNhap, KiemKe, DieuChinhKho, ThietBi, BaoTri.
- `Marketing/` — KhuyenMai, ChinhSach.
- `Communication/` — ThongBao, DanhGia.
- `Report/` — BaoCao, NhatKy.
- `Debug/` — tiện ích dev-only.

### 5.3 Kiến trúc Frontend — Modular
**Cấu trúc `frontend/src/`:**
```
src/
├── components/          # UI chung (Button, Modal, Table…)
├── context/             # AppContext, AppState types
├── features/permissions # RBAC PermissionsContext + usePermission hook
├── hooks/               # useAppStoreState, useBootstrapData, useAppEffects
├── layouts/             # PublicLayout / AuthLayout / WorkspaceLayout
├── modules/             # auth, catalog, orders, inventory, marketing, reports, notifications
├── routes/              # routeMap.ts + AppRouterView.tsx
├── services/            # apiClient, api/*, mappers/*
├── views/               # CustomerPortal, WorkspaceView
└── App.tsx
```

- **State:** React Context + Zustand `store.ts`.
- **Routing:** React Router 7 `BrowserRouter` — 2 nhánh portal: `/` (khách) vs `/staff` (nội bộ).
- **API:** `apiClient` wrap fetch + inject JWT từ localStorage, map error chung `{maLoi, thongDiep, chiTiet}`.
- **RBAC FE:** `<RequirePermission permission="..."/>` component — ẩn nút theo quyền.

### 5.4 Thiết kế module theo khung nghiệp vụ

| Module | Backend Service | Controller | FE Module |
|---|---|---|---|
| Auth | `XacThucService`, `JwtService` | `AuthController` | `modules/auth` |
| Catalog | `SanPhamService`, `DanhMucService`, `KhaDungService` | `SanPham*`, `DanhMuc*` | `modules/catalog` |
| Cart & Quote | `GioThueService`, `BaoGiaService` | `GioThueController` | `modules/catalog/cart` |
| Order | `DonThueService`, `GiuChoService` | `DonThueController` | `modules/orders` |
| Payment | `ThanhToanService` + gateway adapter | `ThanhToanController` | `modules/orders/payment` |
| Inventory | `PhieuNhapService`, `ThietBiService`, `KhoService` | `Inventory/*` | `modules/inventory` |
| Marketing | `KhuyenMaiService`, `ChinhSachService` | `Marketing/*` | `modules/marketing` |
| Review & Notify | `DanhGiaService`, `ThongBaoService` | `Communication/*` | `modules/notifications` |
| Report | `BaoCaoService` | `BaoCao*` | `modules/reports` |

### 5.5 Mười truy vấn LINQ / SQL tiêu biểu
Chọn 10 query gai góc nhất, mỗi truy vấn trình bày: **Mục đích / Input / Output / LINQ code / SQL EF Core sinh ra (dùng `ToQueryString()`)**.

1. **Phân trang sản phẩm công khai + lọc trạng thái kinh doanh** — `SanPhamService.TimKiemAsync`.
2. **Khả dụng thiết bị theo lịch (Sweep Line)** — `KhaDungService.LayKhaDungAsync` + GROUP BY thời gian overlap.
3. **Tạo đơn + snapshot trong transaction Serializable** — `DonThueService.TaoDonAsync` (12 bước).
4. **Nhập kho FIFO: phân công serial thiết bị** — `BanGiaoService.PhanCongThietBiAsync`.
5. **Báo cáo doanh thu: tách tiền thuê / cọc / phụ phí / hoàn** — `BaoCaoService.DoanhThuKyAsync`.
6. **Idempotency callback thanh toán** — `ThanhToanService.XuLyKetQuaAsync` (UPDATE có điều kiện + xử lý callback trùng).
7. **Job hết hạn 15' — UPDATE có điều kiện** — `DonThueExpirationJob.ExecuteAsync`.
8. **Kiểm tra mã KM + loại lượt hết hạn khỏi đếm** — `KhuyenMaiService.KiemTraApDungAsync`.
9. **Cập nhật quyền động + invalidate cache (`PermissionVersion`)** — `QuanTriTaiKhoanService.CapNhatQuyenAsync`.
10. **Lịch sử chuyển trạng thái (write-side) + truy vấn audit** — `LichSuTrangThaiDon` INSERT + SELECT theo đơn.

### 5.6 Background Jobs
- **`DonThueExpirationJob`** (`backend/BackgroundJobs/`) — `IHostedService`, chạy mỗi 1 phút, UPDATE có điều kiện 3 bảng (`DonThue`, `GiuCho`, `LuotSuDungKhuyenMai`) -> tránh race với callback thanh toán.

### 5.7 Cross-cutting: Exception handling + RBAC
- **`ExceptionHandlingMiddleware`:** map `NghiepVuException` -> 400/403/404/409, format `{maLoi, thongDiep, chiTiet}`.
- **`[RequirePermission("ten_quyen")]` attribute** — đọc quyền động từ DB qua `IPermissionChecker`, cache theo `TaiKhoan.PermissionVersion`.

---

## Nguồn dữ liệu trong repo
- `backend/Controllers/`, `Services/`, `Data/`, `Models/`, `Middleware/`, `BackgroundJobs/`, `Helpers/`.
- `backend/Program.cs` — cấu hình DI.
- `frontend/src/` — toàn bộ.
- `frontend/AGENTS.md`, `CLAUDE.md`, `DESIGN.md` — ghi chú kiến trúc FE.
- `Document/Swagger_API_Catalog.md` — list API theo module.
- `Document/screenshots_uc/` + `manifest_71_ucs.json`.

## Hình ảnh cần chuẩn bị
- Sơ đồ C4 Context + Container.
- Sơ đồ layer backend.
- Sơ đồ module frontend.
- Sequence diagram "Tạo đơn + giữ chỗ 15' + thanh toán callback" (bắt buộc — core flow).
- Sequence diagram "Job hết hạn race với callback thanh toán".

## Độ dài ước lượng
- Chương 4 (phần B): ~12–15 trang.
- Chương 5: ~15–18 trang.
