# Phần 1 — Thanh Tùng

**Vai trò dự án:** Lead, Auth/Infra, điều phối migration.
**Phụ trách viết trong báo cáo:**
- **Chương 1 — Tổng quan đề tài & Công nghệ** (toàn bộ)
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

## B. Chương 6 — Cài đặt & Triển khai

### 6.1 Môi trường phát triển
- OS: Windows 11 / Ubuntu 22.04 (nhóm phát triển hỗn hợp).
- **.NET SDK 10** · **Node.js ≥ 20** · **Docker Desktop** · **Python 3.10+** (tùy chọn).
- IDE: Visual Studio 2022 / JetBrains Rider / VS Code + C# Dev Kit.

### 6.2 Môi trường triển khai (demo)
- SQL Server 2022 Docker container `geargo-sql` host port **11433**.
- Backend `http://localhost:5000` · Swagger `http://localhost:5000/swagger`.
- Frontend `http://localhost:8443` (Vite dev server).
- *(Nếu kịp deploy Render:* chèn URL + hướng dẫn truy cập, lấy từ `Document/Plan_Week7_HoanThien.md` mục 4.2.*)*

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

## C. Phụ lục A

- **A.1 Link Git:** https://github.com/ThanhTung0401/GearGo_Webapp + cấu trúc thư mục (copy `README.md` phần 7).
- **A.2 File SQL mẫu:** `scripts/SeedData_GearGo_Full.sql`.
- **A.3 Danh sách migrations EF Core:** 7 migrations (`backend/Migrations/`).
- **A.4 Docker-compose** (copy nguyên `docker-compose.yml`).
- **A.5 Bảng phân công chi tiết theo tuần** (link các Plan_WeekX.md trong `Document/`).

---

## Nguồn dữ liệu trong repo
- `README.md` — toàn bộ phần 1–7.
- `Document/Plan_Week2.md` → `Plan_Week7_HoanThien.md` — tiến độ & phân công.
- `backend/appsettings.json`, `docker-compose.yml`, `frontend/.env.development`.
- `backend/Migrations/` — lịch sử migration.
- `backend/Program.cs` — DI, JWT, CORS, UtcDateTimeJsonConverter.

## Hình ảnh cần chuẩn bị
- Sơ đồ công nghệ (3 lớp: React → .NET API → SQL Server + Docker) — vẽ bằng draw.io hoặc Mermaid.
- Gantt chart tuần 1–7 (có trong `Document/Plan_Week7_HoanThien.md`).
- Screenshot Swagger UI tại `/swagger`.

## Độ dài ước lượng
- Chương 1: ~8–10 trang · Chương 6: ~5–7 trang · Phụ lục A: ~3 trang.
