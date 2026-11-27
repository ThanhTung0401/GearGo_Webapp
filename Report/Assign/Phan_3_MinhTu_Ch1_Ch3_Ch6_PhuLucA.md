# Phần 3 — Minh Tú

**Vai trò dự án:** Khuyến mãi + Kho + Thiết bị + Khả dụng (logic giữ lượt / kiểm kê / điều chỉnh kho).
**Phụ trách viết trong báo cáo:**
- **Chương 1 — Tổng quan đề tài & Công nghệ** (toàn bộ)
- **Chương 3 — Thiết kế Cơ sở dữ liệu** (toàn bộ, 39 bảng)
- **Chương 6 — Cài đặt & Triển khai** (toàn bộ)
- **Phụ lục A — Hướng dẫn chấm điểm, Git, cấu hình**

---

## A. Chương 1 — Tổng quan đề tài & Công nghệ

### 1.1 Bối cảnh và lý do chọn đề tài
- Viết 1–2 trang: bối cảnh thị trường cho thuê đồ dã ngoại tại TP.HCM, nhu cầu số hóa quy trình thuê–giữ chỗ–đối soát cọc, lý do chọn .NET 10 + SQL Server.

### 1.2 Mục tiêu
- **End-user (khách):** đăng ký/đăng nhập, duyệt 10 phân hệ, kiểm tra khả dụng theo lịch, giữ chỗ 15 phút, thanh toán VietQR, theo dõi đơn, đánh giá.
- **Staff:** chuẩn bị, bàn giao, nhận trả, lập phụ phí, đối soát cọc, bảo trì, kiểm kê.
- **Admin (Quản trị viên):** phân quyền RBAC động `[RequirePermission]`, duyệt phụ phí/điều chỉnh kho/chính sách phiên bản, báo cáo doanh thu.

### 1.3 Phạm vi thực hiện
- **Thực hiện:** 10 phân hệ, 71 màn hình, 39 entities, tích hợp mock payment (VietQR sandbox), background job hết hạn giữ chỗ 15 phút.
- **Không thực hiện:** email thật (SendGrid chưa bật production key), chatbot AI (đã skeleton n8n + Gemini nhưng không triển khai cloud).

### 1.4 Công nghệ sử dụng
Bám bảng công nghệ trong `README.md` dòng 9–14. Mỗi mục viết 3–5 dòng giải thích vì sao chọn:
- **Backend:** ASP.NET Core Web API 10, EF Core 9, SQL Server 2022 (Docker), JWT Bearer + ASP.NET Core Identity.
- **Frontend:** React 19 + TypeScript 5.7 + Vite 8 + Tailwind CSS 4 + React Router 7.
- **Background:** `DonThueExpirationJob` (`backend/BackgroundJobs/`).
- **Kiểm thử:** xUnit, Vitest, Playwright (10 phân hệ × frontend + backend).
- **Tài liệu:** Python `python-docx` (`scripts/chuong7/`), Playwright auto-annotation `tests/playwright/capture_71_ucs.mjs`.

### 1.5 Kế hoạch & phân công
Bảng 5 thành viên × vai trò phát triển (lấy từ `Document/Plan_Week5.md` dòng 38–43 và `Document/PhanCong_Week2.md`). Cột `% đóng góp` gộp cân đối theo tuần 2 → 7. Kèm Gantt tuần 1–7 (W1 scaffolding → W7 hoàn thiện).

---

## B. Chương 3 — Thiết kế Cơ sở dữ liệu

### 3.1 Mô hình ERD
- Chèn hình ERD toàn hệ thống (xuất từ `Diagrams/ERD.dbml` — nếu chưa có .png thì dùng dbdocs.io render hoặc screenshot MySQL Workbench reverse-engineer từ SQL Server).
- **39 entities** chia 6 cụm chính, giới thiệu ngắn mỗi cụm:
  1. **Tài khoản & Nhân sự** (3): `TaiKhoan`, `KhachHang`, `NhanVien` (+ bảng phân quyền RBAC).
  2. **Danh mục & Sản phẩm** (3): `DanhMucSanPham`, `SanPham`, `HinhAnhSanPham`.
  3. **Kho & Thiết bị** (5): `NhaCungCap`, `PhieuNhapHang`, `ChiTietPhieuNhap`, `ThietBi`, `DieuChinhKho`.
  4. **Giỏ, Đơn & Giữ chỗ** (6): `GioThue`, `ChiTietGioThue`, `DonThue`, `ChiTietDonThue`, `GiuCho`, `LichSuTrangThaiDon`.
  5. **Khuyến mãi & Chính sách** (5): `KhuyenMai`, `KhuyenMaiSanPham`, `KhuyenMaiDanhMuc`, `LuotSuDungKhuyenMai`, `ChinhSach`.
  6. **Thanh toán, Phụ phí, Bàn giao, Bảo trì, Đánh giá, Thông báo, Nhật ký** (17 bảng còn lại).

### 3.2 Lược đồ cơ sở dữ liệu (RDM — Relational Data Model)
Vẽ bằng ký hiệu PK (gạch chân) / FK (nghiêng). Chia 6 trang theo 6 cụm trên để tránh rối.

### 3.3 Data Dictionary — mô tả chi tiết từng bảng
**Nguồn chính:** `Document/GearGo_Giai_Thich_Entities.md` (đã có sẵn giải thích 39 entities).

Mỗi bảng trình bày:
- **Mục đích:** 2–3 dòng.
- **Bảng cột:** `Tên cột | Kiểu | PK/FK | Nullable | Ràng buộc | Mô tả`.
- **Index:** unique keys (ví dụ `DonThue.MaDonHienThi` unique, `ThanhToan.MaYeuCau` unique — idempotency).
- **Dữ liệu mẫu:** 2–3 bản ghi (có thể lấy từ `backend/Data/Seeders/`).

**Format gợi ý — ví dụ bảng DON_THUE:**

| Cột | Kiểu | PK/FK | Mô tả |
|---|---|---|---|
| `MaDonThue` | bigint | PK | Khóa chính tự tăng |
| `MaDonHienThi` | varchar(20) | UNIQUE | Mã người dùng thấy (`GG-241123-0001`) |
| `MaKhachHang` | bigint | FK -> KHACH_HANG | Khách đặt đơn |
| `MaChinhSach` | bigint | FK -> CHINH_SACH | Bản chính sách đang hiệu lực |
| `GioNhanDuKien` | datetime2 | NOT NULL | UTC |
| `GioTraDuKien` | datetime2 | NOT NULL | UTC, phải > GioNhan |
| `HanThanhToan` | datetime2 | NOT NULL | GiuCho hết hạn cùng mốc |
| `TrangThai` | varchar(30) | NOT NULL | Enum `TrangThaiDonThue` |
| `TongTienThue` / `TongTienCoc` / `TongTienGiam` | decimal(18,2) | NOT NULL | Snapshot |
| `KhuyenMaiLucDat` | nvarchar(max) | NULL | JSON snapshot |

**Không cần viết đủ 39 bảng dày đặc** — chi tiết ~15 bảng cốt lõi (TaiKhoan, KhachHang, SanPham, ThietBi, DonThue, ChiTietDonThue, GiuCho, LuotSuDungKhuyenMai, ThanhToan, KhuyenMai, ChinhSach, PhieuNhapHang, DanhGia, LichSuTrangThaiDon, DieuChinhKho). Các bảng còn lại gộp bảng "Tóm tắt phụ" (bảng nối, ảnh, thông báo…).

### 3.4 Quy tắc dữ liệu quan trọng
Rút từ `Document/GearGo_Dac_Ta_Nghiep_Vu.md` và `PhanCong_Week2.md`:

1. **Quy tắc ẩn/ngừng SP:** `TrangThaiKinhDoanh` thuộc {`DangKinhDoanh`, `TamNgung`, `NgungKinhDoanh`}. Khách chỉ thấy `DangKinhDoanh`. Chuyển `NgungKinhDoanh` chỉ khi không còn thiết bị đang thuê / lịch đặt trước.
2. **FIFO nhập kho:** `ThietBi.MaChiTietPhieuNhap` tham chiếu phiếu nhập `DaNhapKho`, ưu tiên lô nhập trước khi phân công thiết bị.
3. **Quy tắc giữ chỗ 15':** `DonThue.HanThanhToan = GiuCho.ThoiDiemHetHan = LuotSuDungKhuyenMai.ThoiDiemHetHan` — cùng mốc, gán 1 lần khi tạo đơn.
4. **Chính sách phiên bản:** chọn bản `ThoiDiemApDung <= Now` phiên bản mới nhất thỏa, không áp hồi tố đơn cũ (snapshot vào `DonThue.KhuyenMaiLucDat` + `ChiTietDonThue.PhuKienVaMucBoiThuongLucDat`).
5. **Khả dụng (Sweep Line):** `Tổng thiết bị đủ điều kiện − max(số chiếm đồng thời trên [GioNhan, GioTra])`. Giữ chỗ hết hạn không chiếm lịch dù job chưa quét.
6. **Idempotency thanh toán:** `ThanhToan.MaYeuCau` UNIQUE -> callback trùng không ghi 2 lần.
7. **Lịch sử chuyển trạng thái:** mọi chuyển trạng thái đơn ghi vào `LICH_SU_TRANG_THAI_DON` (người thực hiện, thời điểm, lý do, trước -> sau).
8. **Audit RBAC:** `TaiKhoan.PermissionVersion` tăng khi admin thay quyền -> cache middleware invalidate.

### 3.5 Cài đặt CSDL
- **Migration:** EF Core, 7 migrations tại `backend/Migrations/`:
  1. `20260924045627_FullERDInitialCreate`
  2. `20260924060134_RemoveRedundantDonThueForeignKey`
  3. `20261110084459_AddPermissionIdentity`
  4. `20261113163000_AddDanhGiaPhanHoiCuaHang`
  5. `20261114062923_AddIdempotencyAndQuaHanContactLog`
  6. `20261119062659_AddTaiKhoanPermissionVersion`
- **Seed:** `backend/Data/DbSeeder.cs` + `backend/Data/Seeders/*` — tự chạy khi app khởi động Development.
- **Script SQL dump:** `scripts/SeedData_GearGo_Full.sql`.
- **Reset:** `dotnet ef database drop -f --project backend/GearGo.csproj`.

---

## C. Chương 6 — Cài đặt & Triển khai

### 6.1 Môi trường phát triển
- OS: Windows 11 / Ubuntu 22.04 (nhóm phát triển hỗn hợp).
- **.NET SDK 10** · **Node.js ≥ 20** · **Docker Desktop** · **Python 3.10+** (tùy chọn).
- IDE: Visual Studio 2022 / JetBrains Rider / VS Code + C# Dev Kit.

### 6.2 Môi trường triển khai (demo)
- SQL Server 2022 Docker container `geargo-sql` host port **11433**.
- Backend `http://localhost:5000` · Swagger `http://localhost:5000/swagger`.
- Frontend `http://localhost:8443` (Vite dev server).
- *(Nếu kịp deploy Render: chèn URL + hướng dẫn truy cập, lấy từ `Document/Plan_Week7_HoanThien.md` mục 4.2.)*

### 6.3 Hướng dẫn cài đặt & chạy
Sao chép và chạy chuỗi lệnh từ `README.md` phần **3. Hướng dẫn khởi chạy**:
1. `docker compose up -d` (khởi SQL Server).
2. `dotnet restore backend/GearGo.csproj && dotnet run --project backend/GearGo.csproj --urls http://localhost:5000` (auto migrate + seed).
3. `npm --prefix frontend install && npm --prefix frontend run dev -- --port 8443 --host`.

### 6.4 Tài khoản seed & 2 cổng đăng nhập
Trích nguyên bảng `README.md` dòng 71–78. Cổng khách `/login`, cổng nội bộ `/staff/login`, mật khẩu seed `GearGo@2026`.

### 6.5 Reset & seed lại
Lệnh `dotnet ef database drop -f --project backend/GearGo.csproj` → chạy lại backend.

### 6.6 Cấu hình quan trọng
- `backend/appsettings.json`: connection string, JWT secret, VietQR config.
- `frontend/.env.development`: `VITE_API_URL=http://localhost:5000`, `VITE_USE_MOCK=false`.
- Lưu ý: KHÔNG hard-code đường dẫn tuyệt đối theo máy.

---

## D. Phụ lục A

- **A.1 Link Git:** https://github.com/ThanhTung0401/GearGo_Webapp + cấu trúc thư mục (copy `README.md` phần 7).
- **A.2 File SQL mẫu:** `scripts/SeedData_GearGo_Full.sql`.
- **A.3 Danh sách migrations EF Core:** 7 migrations (`backend/Migrations/`).
- **A.4 Docker-compose** (copy nguyên `docker-compose.yml`).
- **A.5 Bảng phân công chi tiết theo tuần** (link các Plan_WeekX.md trong `Document/`).

---

## Nguồn dữ liệu trong repo
- `README.md` — toàn bộ phần 1–7.
- `Document/Plan_Week2.md` → `Plan_Week7_HoanThien.md` — tiến độ & phân công.
- `Document/GearGo_Giai_Thich_Entities.md` — giải thích 39 entities (nguồn chính ch.3).
- `backend/Models/Entities/*.cs` — code entity + Fluent API.
- `backend/Data/ApplicationDbContext.cs` — DbSet + OnModelCreating.
- `backend/Migrations/` — lịch sử migration.
- `backend/Data/Seeders/` — dữ liệu mẫu.
- `backend/appsettings.json`, `docker-compose.yml`, `frontend/.env.development`.
- `backend/Program.cs` — DI, JWT, CORS, UtcDateTimeJsonConverter.

## Hình ảnh cần chuẩn bị
- Sơ đồ công nghệ (3 lớp: React → .NET API → SQL Server + Docker) — vẽ bằng draw.io hoặc Mermaid.
- Gantt chart tuần 1–7 (có trong `Document/Plan_Week7_HoanThien.md`).
- ERD tổng thể (A3 scale, 39 bảng) — export từ dbdocs / MySQL Workbench reverse-engineer.
- ERD chi tiết 6 cụm (6 ảnh nhỏ).
- Lược đồ RDM.
- Screenshot Swagger UI tại `/swagger`.

## Độ dài ước lượng
- Chương 1: ~8–10 trang · Chương 3: ~20–25 trang · Chương 6: ~5–7 trang · Phụ lục A: ~3 trang.
