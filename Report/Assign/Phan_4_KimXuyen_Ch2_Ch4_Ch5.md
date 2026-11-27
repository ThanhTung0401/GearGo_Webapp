# Phần 4 — Kim Xuyến

**Vai trò dự án:** Giỏ thuê + Admin CRUD (sản phẩm, danh mục) + Báo giá dùng chung + Tư vấn AI + FE Admin.
**Phụ trách viết trong báo cáo:**
- **Chương 2 — Phân tích hệ thống** (toàn bộ)
- **Chương 4 — Thiết kế giao diện người dùng** (toàn bộ: nhánh Khách + nhánh Staff/Admin)
- **Chương 5 — Thiết kế xử lý & Kiến trúc source** (toàn bộ)

---

## A. Chương 2 — Phân tích hệ thống

### 2.1 Đối tượng sử dụng (4 actors)
Viết chi tiết, mỗi actor 5–8 dòng:
- **Guest (khách vãng lai):** xem SP, lọc, chi tiết, khả dụng, tư vấn AI (chưa đăng nhập).
- **Customer (khách đã đăng nhập):** giỏ, giữ chỗ 15', thanh toán, theo dõi/hủy đơn, đánh giá.
- **Staff (nhân viên, RBAC):** chuẩn bị, bàn giao, nhận trả, phụ phí, bảo trì, kiểm kê.
- **Admin (QuanTriVien):** full quyền + phân quyền, duyệt, báo cáo, chính sách.

**Nguồn:** `Document/BB_DoAn_ChucNangtheoDSDK_Nhom10.docx.md` toàn bộ 4 nhóm (I-IV).

### 2.2 Danh sách chức năng — tổng hợp theo 10 phân hệ × 4 actors
Bảng tổng hợp (rút gọn từ `BB_DoAn_ChucNangtheoDSDK_Nhom10.docx.md`):

| Phân hệ | Admin | Staff | Customer | Guest |
|---|---|---|---|---|
| PH1 Tài khoản | X | X | X | Đăng ký |
| PH2 Tư vấn & Khả dụng | – | X | X | X |
| PH3 Giỏ + Giữ chỗ + Hủy | – | – | X | – |
| PH4 Bàn giao/Nhận trả | X | X | theo dõi | – |
| PH5 Thanh toán/Phụ phí | X | X | thanh toán | – |
| PH6 Sản phẩm/Thiết bị/Bảo trì | X | X | – | – |
| PH7 NCC/Nhập kho | X | X | – | – |
| PH8 Khuyến mãi/Chính sách | X | – | áp mã | – |
| PH9 Đánh giá/Thông báo | duyệt | – | X | – |
| PH10 Báo cáo/Nhật ký | X | theo quyền | – | – |

### 2.3 Đặc tả chi tiết Use Case (>= 10 UC)
**Nguồn chính:** `Document/GearGo_Dac_Ta_10_Phan_He_Use_Cases.md` — đã có đầy đủ UC. Chọn 10–12 UC quan trọng, mỗi UC viết theo mẫu khung:
- Tên chức năng, Mục tiêu, Người thực hiện
- Dữ liệu vào / Dữ liệu ra
- Điều kiện trước
- Luồng chính (bước 1 -> bước 2 -> ...)
- Luồng lỗi/ngoại lệ
- Quy tắc/ràng buộc (`SoLuong > 0`, FIFO, chính sách phiên bản đang hiệu lực, giữ chỗ hết hạn không chiếm lịch...)

**Gợi ý chọn 12 UC cốt lõi:**
1. **UC1.1** Đăng ký tài khoản khách hàng
2. **UC1.2** Đăng nhập 2 cổng + khóa tạm 15' sau 5 lần sai
3. **UC2.1** Tìm kiếm + lọc sản phẩm (phân trang 12)
4. **UC2.3** Kiểm tra khả dụng theo lịch (Sweep Line)
5. **UC3.1** Thêm vào giỏ + tính báo giá
6. **UC3.2** Tạo đơn + giữ chỗ 15' (transaction Serializable)
7. **UC3.4** Hủy đơn chưa thanh toán
8. **UC4.2** Phân công mã thiết bị thực tế
9. **UC4.3** Bàn giao thiết bị
10. **UC5.1** Thanh toán VietQR + callback idempotent
11. **UC8.1** Áp mã khuyến mãi (quy tắc giữ lượt)
12. **UC9.1** Đánh giá sau thuê

> Mỗi UC viết đầy đủ các mục trên — tham chiếu rõ: API path, service, validator (ví dụ `backend/Services/Implements/DonThueService.cs:TaoDonAsync`).

---

## B. Chương 4 — Thiết kế giao diện người dùng

### 4.1 Sitemap tổng thể (2 nhánh)

**Nhánh public/customer:**
```
/ (Home) -> /san-pham -> /san-pham/:id
   |                        |
   |                        v
   |                    [Them gio] -> /login (neu guest)
   |                                      |
   v                                      v
/dang-ky                              /gio-thue
/login                                    |
                                          v
                                   /don-thue/xac-nhan
                                          |
                                          v
                                   /thanh-toan/:id
                                          |
                                          v
                                   /don-thue (lich su)
                                          |
                                          v
                                   /don-thue/:id -> /danh-gia
```

**Nhánh staff/admin:**
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

### 4.2 Danh sách màn hình nhánh Khách (~16 màn hình)

| Mã màn hình | Tên màn hình | Đối tượng | Mô tả ngắn |
|---|---|---|---|
| SC-GU-01 | Trang chủ công khai | Guest | Hero banner, sản phẩm nổi bật |
| SC-GU-02 | Danh sách SP + lọc | Guest/Customer | Filter TuKhoa/DanhMuc/SucChua/Gia |
| SC-GU-03 | Chi tiết SP | Guest/Customer | Hình, phụ kiện, chính sách, đánh giá |
| SC-GU-04 | Kiểm tra khả dụng | Guest/Customer | DatePicker GioNhan/GioTra |
| SC-GU-05 | Tư vấn AI bộ đồ | Guest/Customer | Form nhu cầu chuyến đi |
| SC-CS-01 | Đăng ký | Guest | Form họ tên, email, SĐT, mật khẩu |
| SC-CS-02 | Đăng nhập khách | Guest | Email/SĐT + mật khẩu, quên MK |
| SC-CS-03 | Hồ sơ cá nhân | Customer | Xem/sửa thông tin |
| SC-CS-04 | Giỏ thuê | Customer | Dòng SP, số lượng, GioNhan/GioTra, áp mã |
| SC-CS-05 | Xác nhận đơn | Customer | Preview báo giá + chính sách |
| SC-CS-06 | Thanh toán VietQR | Customer | QR + đếm ngược 15' |
| SC-CS-07 | Danh sách đơn | Customer | Lọc theo trạng thái |
| SC-CS-08 | Chi tiết đơn | Customer | Lịch sử bàn giao/nhận trả/phụ phí |
| SC-CS-09 | Hủy đơn | Customer | Form lý do + preview hoàn tiền |
| SC-CS-10 | Đánh giá SP | Customer | Chọn SP đơn hoàn tất, chấm sao |
| SC-CS-11 | Thông báo | Customer | Danh sách, mark read, deep link |

### 4.3 Danh sách màn hình nhánh Staff + Admin (~24 màn hình)

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

### 4.4 Screenshot + mô tả chi tiết
- Lấy từ `Document/screenshots_uc/` + `manifest_71_ucs.json` — chọn 20–25 màn hình tiêu biểu (cả hai nhánh).
- Mỗi màn hình: ảnh + 4–6 dòng mô tả input/nút/validate, kèm callout đánh số bước.

---

## C. Chương 5 — Thiết kế xử lý & Kiến trúc source

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
- `Document/BB_DoAn_ChucNangtheoDSDK_Nhom10.docx.md` — ma trận chức năng × actor.
- `Document/GearGo_Dac_Ta_10_Phan_He_Use_Cases.md` — đặc tả 71 UC chi tiết.
- `Document/GearGo_Dac_Ta_Nghiep_Vu.md` — quy tắc nghiệp vụ gốc.
- `Document/screenshots_uc/` + `manifest_71_ucs.json` — 80 ảnh thực tế.
- `backend/Controllers/`, `Services/`, `Data/`, `Models/`, `Middleware/`, `BackgroundJobs/`, `Helpers/`.
- `backend/Program.cs` — cấu hình DI.
- `frontend/src/` — toàn bộ.
- `frontend/AGENTS.md`, `CLAUDE.md`, `DESIGN.md` — ghi chú kiến trúc FE.
- `Document/Swagger_API_Catalog.md` — list API theo module.

## Hình ảnh cần chuẩn bị
- Sơ đồ actor (UML Use Case Diagram) — 4 actors + 10 PH.
- Sitemap tổng thể 2 nhánh (Mermaid).
- 20–25 screenshot kèm callout đánh số bước.
- Sơ đồ C4 Context + Container.
- Sơ đồ layer backend.
- Sơ đồ module frontend.
- Sequence diagram "Tạo đơn + giữ chỗ 15' + thanh toán callback" (bắt buộc — core flow).
- Sequence diagram "Job hết hạn race với callback thanh toán".

## Độ dài ước lượng
- Chương 2: ~15–20 trang · Chương 4: ~20–25 trang · Chương 5: ~15–18 trang.
