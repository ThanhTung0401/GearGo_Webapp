# GearGo — Week 7: Hoàn thiện đồ án (migration Postgres, frontend A2 đầy đủ 3 role, provider thật, deploy Render)

> **Design spec cho tuần hoàn thiện cuối cùng — xuất phát từ brainstorming ngày 2026-11-17, cập nhật 2026-11-17 chuyển sang mô hình 2-người thực thi gánh toàn bộ khối lượng gốc.** Week 6 đã khóa phần backend khuyến mãi/chính sách/báo cáo/nhật ký. Tuần này chuyển hệ thống từ "chạy local trên SQL Server" sang "chạy trên Render + Postgres có provider sandbox thật + frontend đầy đủ 3 role", rồi bàn giao bộ tài liệu đồ án (báo cáo PDF + video + cheat sheet vấn đáp).

**Người thực thi:** Thanh Tùng (Người 1), Kiện Minh (Người 2). Các thành viên khác trong nhóm 5 người ban đầu (Minh Tú, Kim Xuyến, Tuấn Kiệt) không được chia việc trong tuần này; 2 người Tùng + Minh gánh toàn bộ khối lượng gốc.

**⚠️ Overload cảnh báo:** Khối lượng gốc ~60 người-ngày, 2 người có ~24 người-ngày → **overload 2.5x**. Dự kiến sẽ cần cắt giảm động trong quá trình theo mục 3.4. Theo dõi mốc D3, D7 để sớm quyết định cắt tiếp.

**Hoán đổi provider:** So với phân công đầu brainstorm, **VNPay chuyển về Tùng**, **n8n+Gemini chuyển về Minh**. Các phần khác giữ nguyên.

**Tham chiếu nguồn:**
- `Plan_Week2.md` → `Plan_Week6.md`: ngữ cảnh module, bảng phân công, 32 ca nghiệm thu W6.
- `GearGo_Dac_Ta_Nghiep_Vu.md` + `GearGo_Dac_Ta_10_Phan_He_Use_Cases.md`: đặc tả nghiệp vụ gốc.
- `Swagger_API_Catalog.md`: API hiện có để map màn frontend.
- Repo: `https://github.com/ThanhTung0401/GearGo_Webapp.git`

**Phạm vi đồ án:** Loại A (học phần). Deadline báo cáo PDF: **2026-11-29 (D12)**. Live demo sau D12 (chưa cố định). Code freeze: **2026-11-27 17:00 ICT (D10)**.

**Cách đọc tài liệu:** Mục 1 chốt phạm vi; mục 2 kiến trúc; mục 3 lịch 12 ngày × 2 người; mục 4 bảng 32 ca nghiệm thu bổ sung W7; mục 5 deliverables; mục 6 rủi ro + fallback. Ca có mã `W7-<nhóm>-<số>`.

---

## 1. Phạm vi và kết quả cần đạt

### 1.1 Trong phạm vi 12 ngày (giữ nguyên khối lượng gốc 5 người)

| Phần việc | Đầu ra nghiệm thu |
|---|---|
| Migration DB SQL Server → PostgreSQL | EF Core dual provider; 2 folder migration; raw SQL dialect helper; ≥90% trong 117 unit tests pass trên Postgres |
| Deploy Render | 3 service (geargo-db Postgres managed, geargo-api .NET, geargo-web React static) chạy được, có URL public, cold start < 60s |
| Frontend A2 — 3 role đầy đủ | Khách / Nhân viên / Admin đều có menu các phân hệ chính; mỗi phân hệ có list + detail + CRUD cơ bản |
| Tích hợp VNPay sandbox | Tạo URL thanh toán, verify return hash, IPN idempotent, retry an toàn |
| Tích hợp SendGrid | 4 template email (welcome, xác nhận đơn, nhắc quá hạn, hoàn tiền); gửi thật, log bounce |
| Tích hợp n8n self-host + Gemini | 2 workflow (tư vấn thiết bị + FAQ ngắn); backend `TuVanAIService` gọi n8n webhook; fallback khi rate limit/timeout |
| Upload ảnh | Lưu local filesystem (U1); ảnh sản phẩm + bằng chứng điều chỉnh kho + bàn giao; seed ảnh demo vào repo |
| Báo cáo PDF | 13 chương, ~40–60 trang, mỗi module có screenshot + ca kiểm thử |
| Video demo | 6 clip (V0–V5), tổng 18–22 phút |
| Cheat sheet vấn đáp | 2 file Markdown (Tùng + Minh) |

### 1.2 Ngoài phạm vi (không làm trong 12 ngày)

- CI/CD pipeline tự động.
- Monitoring, alerting, APM production.
- Load testing, security audit đầy đủ.
- UI riêng cho mọi 28 controller — chỉ các màn demo golden path cần cho chấm điểm.
- Refactor/rewrite code hiện có.
- Live payment (chỉ VNPay sandbox).
- Mobile app, PWA offline, i18n ngoài tiếng Việt.

### 1.3 Ràng buộc cứng

- **Không mock** VNPay / SendGrid / Gemini trong khi báo cáo rằng "đã tích hợp thật". Nếu phải fallback mock, ghi rõ trong báo cáo và video.
- **Không nhập số liệu test** cho báo cáo tài chính/kho — phải đi qua luồng nghiệp vụ thật.
- **Không commit secret** (API keys) lên repo public.
- **Không skip test** rồi báo pass. Fail có bằng chứng và lý do mở.

---

## 2. Kiến trúc và topology triển khai

### 2.1 Dual DB provider (giai đoạn transit D1–D5)

**Pattern:** `Program.cs` đọc env var `DatabaseProvider` (`SqlServer` | `Postgres`) để chọn provider EF Core tương ứng:

```csharp
var provider = builder.Configuration["DatabaseProvider"] ?? "SqlServer";
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (provider == "Postgres")
        options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"),
            opts => opts.MigrationsAssembly("GearGo.Migrations.Postgres"));
    else
        options.UseSqlServer(builder.Configuration.GetConnectionString("SqlServer"),
            opts => opts.MigrationsAssembly("GearGo.Migrations.SqlServer"));
});
```

- **Local dev** (Minh chưa migrate xong): giữ `SqlServer`, không bị chặn.
- **CI + Render**: `Postgres`.
- **Hai folder migration riêng**: `Migrations/SqlServer/`, `Migrations/Postgres/`. Scaffold bằng `dotnet ef migrations add Initial --context ApplicationDbContext --output-dir Migrations/Postgres -- --provider Postgres`.
- **Raw SQL lock** (Week 4–5 có `WITH (UPDLOCK, ROWLOCK)` trong `CheckoutService`, `DieuChinhKhoService`): bọc trong `IDatabaseDialect` helper. SqlServer giữ `UPDLOCK`; Postgres dùng `SELECT ... FOR UPDATE`.
- **Rip SqlServer khỏi main D5** sau khi tests Postgres xanh và deploy Render smoke-test xong.

### 2.2 Topology Render

| Service | Gói | Ghi chú |
|---|---|---|
| **geargo-db** (Postgres managed) | Free (1 GB, retention 90 ngày) | `DATABASE_URL` auto inject; reset password trước demo |
| **geargo-api** (.NET Web Service) | Free (spin down sau 15′ idle, cold start ~30s) | Build: `dotnet publish -c Release`; health check `/health` |
| **geargo-web** (React Static Site) | Free | Build: `pnpm install && pnpm build`; publish `dist/` |
| **n8n self-host** | Docker máy Minh, expose qua `ngrok` khi demo | Render free workspace không cho 2 web service cùng lúc |

**Cold start mitigation (Render free):**
- Backend tự re-check `GET /vnp_trans_status` sau 30s nếu không nhận IPN đầu tiên.
- Cron mỗi 5′ quét đơn `ChoThanhToan` quá 15′ → đồng bộ trạng thái với VNPay.
- Wake-up cron job từ máy Tùng mỗi 10′ gọi `/health` trong 24h trước live demo.

### 2.3 Upload ảnh — hạn chế Render free tier

Render free không có persistent disk → mọi file upload mất sau redeploy.

**Quyết định mặc định U1**: Chấp nhận mất ảnh sau redeploy; ảnh seed commit vào `backend/wwwroot/seed/`; ghi hạn chế vào báo cáo chương 12 (Triển khai).

**Fallback U2**: Chuyển sang **Cloudinary free** (25 GB bandwidth, 25k transforms/tháng). Tùng giữ sẵn nhánh `feat/w7-tung-cloudinary` từ D3; chuyển sang nếu giám khảo trừ điểm lưu trữ.

### 2.4 Secrets và config

`.env.example` ở root (giá trị để trống):

```
DatabaseProvider=Postgres
ConnectionStrings__Postgres=Host=...;Port=5432;Database=geargo;Username=...;Password=...
ConnectionStrings__SqlServer=Server=...;Database=geargo;...
Jwt__Key=
Jwt__Issuer=geargo
Jwt__Audience=geargo-web
VNPay__TmnCode=
VNPay__HashSecret=
VNPay__PaymentUrl=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPay__ReturnUrl=https://geargo-api.onrender.com/api/v1/thanh-toan/vnpay-return
VNPay__IpnUrl=https://geargo-api.onrender.com/api/v1/thanh-toan/vnpay-ipn
SendGrid__ApiKey=
SendGrid__FromEmail=
SendGrid__FromName=GearGo
Gemini__ApiKey=
Gemini__Model=gemini-2.5-flash
N8n__WebhookUrl=
FrontendUrl=https://geargo-web.onrender.com
```

Render dashboard set toàn bộ secret. Frontend dùng `VITE_API_URL` build-time.

### 2.5 CORS và URL

- Dev: allow `http://localhost:5173`.
- Prod: allow `https://geargo-web.onrender.com`.
- VNPay return/IPN URL public — test local phải dùng `ngrok` hoặc deploy sớm.

### 2.6 UI library và state management

- UI: **shadcn/ui + Radix** (Tailwind 4 đã cài).
- Server state: **TanStack Query**.
- Form + validate: **react-hook-form + zod**.
- Routing: giữ `react-router-dom`.
- Auth: JWT trong `localStorage` + interceptor.

---

## 3. Lịch 12 ngày × 2 người

### 3.1 Phân công tổng

| Người | DB track | Module BE | Module FE | Provider mới | Deliverable phụ |
|---|---|---|---|---|---|
| **Thanh Tùng** | **Owner duy nhất**: Postgres migration, Npgsql, dialect helper, raw SQL audit, Render deploy | Chính sách, nhật ký, báo cáo vận hành, báo cáo kho, bảo trì, điều chỉnh kho, thanh toán, hoàn tiền | FE Admin: chính sách, nhật ký, báo cáo (vận hành + kho), điều chỉnh kho; FE Nhân viên toàn bộ: danh sách công việc, bàn giao, nhận trả, điều chỉnh kho; FE Khách: trang thanh toán + lịch sử đơn | **VNPay sandbox** (create-url, return, IPN) + **Upload ảnh local** (sản phẩm + bằng chứng điều chỉnh + bàn giao) | Hướng dẫn chạy/triển khai, 12 chương báo cáo, 4 video (V0, V2, V3, V5) |
| **Kiện Minh** | User (đợi Tùng deploy D4) | Khuyến mãi, báo cáo tài chính | FE Khách: register, duyệt SP, giỏ, checkout (áp mã KM), chat tư vấn AI; FE Admin: khuyến mãi (CRUD + phạm vi), báo cáo tài chính | **SendGrid** (4 template) + **n8n self-host + Gemini** (2 workflow: tư vấn + FAQ) | Seed data demo, E2E test runner, 1 chương báo cáo (6), 2 video (V1, V4) |

### 3.2 Lịch chi tiết theo ngày

**D0 (17/11 Mon) — Kickoff 1h (Tùng + Minh)**

- Chốt branching: `main` + `feat/w7-tung-<module>` + `feat/w7-minh-<module>` + `chore/postgres-migration`.
- Chốt UI lib: shadcn/ui.
- Chốt commit convention: Conventional Commits.
- Tùng: TODO list FE Admin + FE Nhân viên + FE Khách thanh toán + VNPay + ops.
- Minh: TODO list FE Khách + FE Admin khuyến mãi/tài chính + SendGrid + n8n.

**D1 (18/11 Tue)**

- Tùng: Thêm `Npgsql.EntityFrameworkCore.PostgreSQL`; thêm `DatabaseProvider` env; scaffold `IDatabaseDialect` + 2 implementation. Audit raw SQL Week 4–5 (`CheckoutService`, `DieuChinhKhoService`, `KhoService`, `QuaHanService`) → `Document/W7_RawSQL_Audit.md`. Cấu hình VNPay sandbox env; viết `VNPayService` khung (`CreatePaymentUrl`).
- Minh: FE scaffold — cài shadcn/ui, TanStack Query, react-hook-form + zod; dựng layout + routing cho **3 role** (Khách + Nhân viên + Admin). Setup n8n Docker local (`docker run -d --name n8n -p 5678:5678 n8nio/n8n`).

**D2 (19/11 Wed)**

- Tùng: `dotnet ef migrations add InitialPostgres --output-dir Migrations/Postgres`; apply local Postgres; debug type mismatches (datetime2 → timestamptz, nvarchar → text). Viết `IImageStorage` wrapper local + preview UI. `VNPayService.VerifyReturnHash` + test unit HmacSHA512.
- Minh: Cấu hình SendGrid; viết `IEmailSender` + `SendGridEmailSender` + 2 template HTML (`welcome.html`, `order-confirm.html`). 1 workflow n8n test gọi Gemini với prompt cố định.

**D3 (20/11 Thu)**

- Tùng: Chạy 117 tests trên Postgres. Mục tiêu: ≥108/117 pass (≥90%). Fail priority: transaction, datetime, decimal. Fail còn lại ghi `Document/W7_Test_Fail.md`. VNPay create-payment-url + redirect + return chạy end-to-end với sandbox.
- Minh: Bind SendGrid vào `GuiThongBaoService`; welcome email thật sau register. n8n workflow `tu-van-thiet-bi` + backend `TuVanAIService` gọi n8n webhook. FE Khách — register, login, duyệt SP (bind API).

**D4 (21/11 Fri) — DEPLOY RENDER**

- Tùng (sáng): Push repo; kết nối Render; tạo `geargo-db` (Postgres), `geargo-api` (.NET), `geargo-web` (React); set secrets từ `.env.example`.
- Tùng (chiều): Deploy lần đầu; EF Core auto-migrate + seed trên Postgres Render; smoke test — login admin, list sản phẩm. Viết `/health` endpoint. UI upload ảnh sản phẩm (bind admin/san-pham).
- Minh: FE Khách — giỏ hàng, nhập mã KM, trang checkout khung. Email xác nhận đơn template (template 2).

**D5 (22/11 Sat)**

- Tùng: Rip SqlServer khỏi `main` config mặc định (chỉ còn Postgres). Document hướng dẫn chạy Postgres local + Render vào `README.md`. Test VNPay IPN callback đi qua Render URL (`https://geargo-api.onrender.com/api/v1/thanh-toan/vnpay-ipn`). FE Khách — trang thanh toán gọi VNPay URL.
- Minh: FE Khách — lịch sử đơn + hoàn thiện checkout áp mã. Email template 3 (nhắc quá hạn).

**D6 (23/11 Sun) — Frontend sprint 1 (weekend push)**

- Tùng: FE Admin — chính sách (CRUD + phiên bản). FE Nhân viên — danh sách công việc (đơn cần giao, cần nhận trả).
- Minh: FE Admin — khuyến mãi (CRUD + gán phạm vi SP) + FE Khách chat tư vấn AI wire-up.

**D7 (24/11 Mon) — Frontend sprint 2**

- Tùng: FE Admin — báo cáo vận hành + báo cáo kho (bảng số, không chart phức tạp) + nhật ký (list + filter). FE Nhân viên — bàn giao (upload ảnh bằng chứng), nhận trả.
- Minh: FE Admin — báo cáo tài chính. Email template 4 (hoàn tiền). n8n workflow 2 (FAQ ngắn).

**D8 (25/11 Tue) — Integration & provider polish**

- Tùng: Edge cases VNPay (callback mất mạng, retry, timeout). Upload ảnh bằng chứng điều chỉnh kho UI. FE Nhân viên — điều chỉnh kho (nháp, gửi duyệt). Chạy hồi quy Week 2–6 trên Render.
- Minh: n8n workflow edge (Gemini rate limit, webhook down fallback). Test E2E luồng khách đầu-đến-cuối trên Render. Hoàn thiện 4 email template HTML.

**D9 (26/11 Wed) — Finishing + seed demo**

- Fix bug tổng hợp từ D8.
- Minh: Chuẩn bị seed data demo — 3 user role, 10 sản phẩm, 5 danh mục, 3 mã khuyến mãi, 2 chính sách, 5 đơn mẫu các trạng thái.
- Tùng: Chạy 32 ca W7 (mục 4); mục tiêu ≥90% pass trước D10.

**D10 (27/11 Thu) — CODE FREEZE 17:00 ICT**

- Sáng: Buffer fix cuối cùng.
- Chiều: Freeze `main`; tag `v1.0-rc`. Chỉ hotfix critical qua PR `hotfix/w7-*`.
- Cả hai: Chụp screenshot, lấy log API, chuẩn bị asset báo cáo.

**D11 (28/11 Fri) — Báo cáo PDF**

- Tùng: Viết 12 chương (1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13). Render PDF bằng `pandoc`. Bắt đầu quay V0 (intro).
- Minh: Viết 1 chương (6 — khuyến mãi). Bắt đầu quay V1 (luồng khách).

**D12 (29/11 Sat) — Nộp báo cáo + video**

- Tùng submit PDF trước 23:00. Quay V2 (nhân viên), V3 (admin), V5 (outro).
- Minh hoàn thành V1, quay V4 (AI tư vấn). Cùng viết cheat sheet vấn đáp.

### 3.3 Daily sync (2 người)

Mỗi tối trước 22:00, tin nhắn ngắn trong channel 2 người:

```
D<n>
- Tùng: <done | blocker>
- Minh: <done | blocker>
```

Không cần ceremony go/no-go. Blocker giải quyết trực tiếp sáng D+1.

### 3.4 Quy tắc giảm scope khi slip

**Theo thứ tự ưu tiên bị cắt trước** (dự kiến sẽ phải dùng vì overload 2.5x):

1. **Email template 3, 4** (nhắc quá hạn, hoàn tiền) → giữ welcome + xác nhận đơn.
2. **n8n workflow 2 (FAQ)** → giữ 1 workflow tư vấn.
3. **FE Admin báo cáo kho UI** (bảng số phức tạp) → demo Swagger.
4. **FE Admin nhật ký filter nâng cao** → list đơn giản + demo filter qua Swagger.
5. **FE Nhân viên điều chỉnh kho chi tiết** → giữ 2 luồng (giao, trả); điều chỉnh kho demo Swagger.
6. **Upload ảnh bằng chứng bàn giao + điều chỉnh** → chỉ upload ảnh sản phẩm.
7. **Video V4 (AI)** → gộp vào V3.
8. **Video V2 (nhân viên)** → gộp vào V3 với demo backend.
9. **Giảm 32 ca W7 xuống 24** → bỏ các ca FE Nhân viên và email template 3–4.
10. **Giảm chương báo cáo 13 → 11** (gộp 5+10, 8+9).

**Không được cắt trong bất kỳ trường hợp nào:**
- Luồng khách: register → đặt → VNPay → email xác nhận.
- Admin tạo chính sách + khuyến mãi mới (UI).
- Migration Postgres + Deploy Render.
- 117 unit tests + 32 ca W6 hồi quy trên Postgres.
- Báo cáo PDF cơ bản (ít nhất 10 chương) + video V0, V1, V5.

**Checkpoint quyết định cắt:**
- **D3 tối**: Nếu tests < 85% hoặc FE scaffold chưa xong → cắt mục 1, 2 ngay.
- **D7 tối**: Nếu FE Nhân viên < 50% → cắt mục 5, 6.
- **D9 tối**: Nếu E2E chưa chạy xanh → cắt mục 3, 4, 7, 8.

---

## 4. Danh sách 32 ca nghiệm thu bổ sung W7

**Naming:** `W7-<nhóm>-<số>`. Ghi Pass/Fail/Blocked + bằng chứng. Mục tiêu: **≥90% pass trước D10**.

### 4.1 DB migration (6 ca — Thanh Tùng)

| Mã | Ca | Kết quả cần đạt |
|---|---|---|
| W7-DB-01 | Chạy 117 tests trên Postgres với cùng seed | ≥108/117 pass; fail có issue mở |
| W7-DB-02 | Transaction Serializable khi 2 request duyệt điều chỉnh kho đồng thời (W5-T5) | 1 thắng, 1 nhận 40001 conflict, không double-apply |
| W7-DB-03 | `FOR UPDATE` thay `UPDLOCK` trong giữ chỗ/thanh toán (W2-T6, W4-T2) | Không deadlock; không oversell 10 request song song |
| W7-DB-04 | Timezone — insert `DateTimeOffset` UTC, filter ngày VN | Không lệch 1 ngày ở biên 00:00 ICT |
| W7-DB-05 | Unique mã (danh mục, KM, SP) với chữ hoa/thường | Khớp policy đã thống nhất |
| W7-DB-06 | Decimal VND tổng tiền giữ nguyên qua Postgres | Không rounding drift |

### 4.2 Deploy Render (4 ca — Thanh Tùng)

| Mã | Ca | Kết quả |
|---|---|---|
| W7-DEP-01 | Cold start sau 15′ idle → `/health` 200 | < 60s, không timeout migration |
| W7-DEP-02 | Lần deploy đầu — EF auto-migrate + seed | DB có 3 role, 3 user mẫu |
| W7-DEP-03 | CORS từ `https://geargo-web.onrender.com` | Không block preflight |
| W7-DEP-04 | Rollback — deploy bản hỏng, revert commit | Render auto-redeploy bản trước, DB không corrupt |

### 4.3 VNPay sandbox (4 ca — Thanh Tùng)

| Mã | Ca | Kết quả |
|---|---|---|
| W7-PAY-01 | Tạo URL thanh toán từ giỏ → VNPay sandbox → thẻ test → return | Hash hợp lệ, đơn `DaThanhToan` |
| W7-PAY-02 | Verify `vnp_SecureHash` SHA512; hash sai → 400 | Không ghi thanh toán |
| W7-PAY-03 | IPN callback lặp 2 lần cùng `vnp_TxnRef` | Chỉ ghi 1 lần (idempotent) |
| W7-PAY-04 | Timeout IPN lần đầu (Render cold start) → VNPay retry | Không double credit |

### 4.4 SendGrid email (3 ca — Kiện Minh)

| Mã | Ca | Kết quả |
|---|---|---|
| W7-MAIL-01 | Đăng ký → nhận welcome email trong 10s | Delivered trong SendGrid Activity |
| W7-MAIL-02 | Thanh toán xong → nhận email xác nhận đơn (mã đơn, tổng tiền, chi tiết) | Email có đủ field |
| W7-MAIL-03 | Email tới địa chỉ invalid → bounce | Service ghi log bounce, không crash |

### 4.5 n8n + Gemini (3 ca — Kiện Minh)

| Mã | Ca | Kết quả |
|---|---|---|
| W7-AI-01 | Khách chat "tư vấn bộ đồ quay vlog ngoài trời" → n8n gọi Gemini | Trả gợi ý ≤ 15s; mention ≥2 SP thật |
| W7-AI-02 | Gemini rate limit (429) | Fallback message tĩnh, không mất request |
| W7-AI-03 | n8n webhook down | Backend trả 503 kèm thông điệp; không giữ transaction |

### 4.6 Frontend A2 (9 ca — ai sở hữu module đó phụ trách)

| Mã | Role | Luồng | Phụ trách |
|---|---|---|---|
| W7-FE-KH-01 | Khách | Register → Login → Duyệt SP → Giỏ → Checkout → VNPay → Email xác nhận | Minh (register–checkout) + Tùng (thanh toán VNPay) |
| W7-FE-KH-02 | Khách | Xem lịch sử đơn + yêu cầu hoàn tiền | Minh (lịch sử UI) + Tùng (hoàn tiền BE) |
| W7-FE-KH-03 | Khách | Chat tư vấn AI | Minh |
| W7-FE-NV-01 | Nhân viên | Xem đơn cần giao → bàn giao → upload ảnh bằng chứng | Tùng |
| W7-FE-NV-02 | Nhân viên | Nhận trả → đối soát → tạo phiếu điều chỉnh kho | Tùng |
| W7-FE-AD-01 | Admin | 3 báo cáo (vận hành, tài chính, kho) có filter + export | Tùng (vận hành + kho) + Minh (tài chính) |
| W7-FE-AD-02 | Admin | Tạo khuyến mãi + gán phạm vi SP + bật/tắt | Minh |
| W7-FE-AD-03 | Admin | Tạo chính sách phiên bản mới + xem lịch hiệu lực | Tùng |
| W7-FE-AD-04 | Admin | Xem nhật ký thao tác, filter theo loại/người/thời gian | Tùng |

### 4.7 E2E tổng hợp (3 ca — Minh điều phối, chạy trên Render D9)

| Mã | Ca | Kết quả |
|---|---|---|
| W7-E2E-01 | Luồng tổng (W6-30) chạy trên Render + VNPay sandbox + SendGrid thật | Trạng thái, tiền, thiết bị, nhật ký khớp; email nhận được |
| W7-E2E-02 | 2 khách đặt cùng thiết bị cuối cùng | 1 thắng, 1 nhận hết hàng; không oversell |
| W7-E2E-03 | Hồi quy 32 ca Week 6 trên Postgres + Render | ≥90% pass |

---

## 5. Deliverables cuối tuần

### 5.1 Báo cáo PDF — cấu trúc (nộp D12)

Mục tiêu: ~40–60 trang.

| # | Chương | Owner | Nội dung tối thiểu |
|---|---|---|---|
| 1 | Giới thiệu + mục tiêu đề tài | Tùng | Vấn đề cho thuê thiết bị, phạm vi 10 phân hệ, công nghệ |
| 2 | Khảo sát & phân tích nghiệp vụ | Tùng | Tham chiếu `GearGo_Dac_Ta_Nghiep_Vu.md`; 10 phân hệ; 26 entities |
| 3 | Thiết kế CSDL | Tùng | ERD; migrate SQL Server → Postgres; dialect helper |
| 4 | Kiến trúc hệ thống | Tùng | .NET 10 + React 19 + Postgres + Render; dual provider |
| 5 | Phân hệ Chính sách & Nhật ký | Tùng | API, flow, screenshot, dẫn chương 6 cho AI |
| 6 | Phân hệ Khuyến mãi + AI tư vấn (SendGrid + n8n+Gemini) | Minh | API khuyến mãi, quota, email KM; n8n workflow + Gemini |
| 7 | Phân hệ Thuê & Thanh toán | Tùng | Luồng checkout, VNPay sandbox, đối soát, hoàn tiền |
| 8 | Phân hệ Kho & Bảo trì | Tùng | Kiểm kê, điều chỉnh kho, báo cáo kho, upload ảnh bằng chứng |
| 9 | Phân hệ Vận hành & Báo cáo | Tùng | Dashboard vận hành; chỉ số thuê; báo cáo tài chính (dẫn Minh) |
| 10 | Bảo mật & phân quyền | Tùng | JWT, dynamic permission, role tương ứng frontend |
| 11 | Kiểm thử | Tùng | 117 unit tests + 32 ca W6 + 32 ca W7 — Pass/Fail |
| 12 | Triển khai | Tùng | Hướng dẫn chạy local + Render; URLs; env vars; rollback; hạn chế free tier |
| 13 | Kết luận & hướng phát triển | Tùng + Minh | Hạn chế hiện tại; công việc tương lai |
| Phụ lục | API catalog + user manual | Tùng + Minh | Dẫn từ `Swagger_API_Catalog.md` + screenshot màn chính |

**Mỗi chương module (5, 6, 7, 8, 9) bắt buộc có:**
1. Mô tả nghiệp vụ (dẫn từ đặc tả).
2. Danh sách API + role.
3. Luồng xử lý chính (sequence diagram hoặc text).
4. Screenshot frontend ≥3 màn.
5. Ca kiểm thử + kết quả.
6. Lỗi thường gặp + cách xử lý.

**Render PDF:** `pandoc` từ `Document/BaoCao/chuong-XX-<tên>.md`. Tùng tổng hợp.

### 5.2 Video demo — 6 clip (tổng 18–22 phút)

| Video | Nội dung | Thời lượng | Owner |
|---|---|---|---|
| V0 Intro | Mục tiêu đồ án, kiến trúc tổng, URL Render | 2′ | Tùng |
| V1 | Luồng khách — register → SP → giỏ → áp mã KM → VNPay → email | 3′ | Minh |
| V2 | Luồng nhân viên — đơn cần giao → bàn giao → upload ảnh → nhận trả → điều chỉnh kho | 2′ | Tùng |
| V3 | Luồng admin — tạo chính sách phiên bản → 3 báo cáo | 2′ | Tùng |
| V4 | Tư vấn AI (n8n + Gemini) qua chat | 1′ | Minh |
| V5 Outro | Kết quả test + hạn chế + hướng phát triển | 1′ | Tùng |

**Công cụ:** OBS Studio (free, screen recording) hoặc screen recorder sẵn có. Dùng `gh` CLI + Claude phụ viết script lồng tiếng.

### 5.3 Cheat sheet vấn đáp cá nhân (D11–D12)

2 file `Document/VanDap/<ten>.md`:

**Thanh Tùng** — nội dung:
1. Module tôi phụ trách — liệt kê API + file code chính (ví dụ `backend/Services/Implements/ChinhSachService.cs:123`).
2. Thuật ngữ nghiệp vụ.
3. 3 quyết định kỹ thuật: tại sao migrate Postgres, dialect helper hoạt động thế nào, VNPay hash SHA512 + idempotent IPN.
4. Lỗi gặp + xử lý — 3–5 case.
5. Nếu làm lại tôi sẽ đổi gì.
6. Section bonus: Postgres migration + Render deploy ops + VNPay flow + upload ảnh + hạn chế free tier.

**Kiện Minh** — nội dung:
1. Module tôi phụ trách — liệt kê API + file code chính.
2. Thuật ngữ nghiệp vụ (khuyến mãi, snapshot, đối soát, báo cáo tài chính).
3. 3 quyết định kỹ thuật: snapshot điều kiện KM lúc đặt, SendGrid template + bounce, n8n+Gemini flow.
4. Lỗi gặp + xử lý — 3–5 case.
5. Nếu làm lại tôi sẽ đổi gì.
6. Section bonus: SendGrid delivery + n8n workflow + Gemini fallback.

### 5.4 Code & repo bàn giao (D12)

- Commit cuối trên `main` có tag `v1.0-report`.
- `README.md` cập nhật: URL Render, env vars, hướng dẫn chạy Postgres local.
- `.env.example` sạch secret.
- `Document/BaoCao/` + `Document/VanDap/` + video links.
- `Document/NghiemThu/W6-W7.md` — bảng 32 ca W6 + 32 ca W7 với Pass/Fail/evidence.

### 5.5 Điều kiện đánh dấu hoàn tất

- [ ] API trong phạm vi ưu tiên chạy được trên Render.
- [ ] 32 ca W7 ≥90% pass; lỗi còn có issue mở.
- [ ] Báo cáo PDF nộp D12; 13 chương đầy đủ.
- [ ] 6 video sẵn sàng; URL công khai.
- [ ] 2 cheat sheet vấn đáp.
- [ ] Repo tag `v1.0-report` và `README.md` cập nhật URL Render.
- [ ] VNPay/SendGrid/Gemini chạy đầu-đến-cuối có log/screenshot bằng chứng.

---

## 6. Rủi ro và fallback

### 6.1 Top 8 rủi ro (xếp theo impact × likelihood, tăng mạnh do 2 người gánh khối lượng gốc)

| # | Rủi ro | Dấu hiệu sớm | Mitigation |
|---|---|---|---|
| R1 | **Overload tổng thể — 2 người không kịp 60 ngày-người** | D5 chậm 1+ ngày so với kế hoạch | Kích hoạt mục 3.4 theo thứ tự ưu tiên; checkpoint D3/D7/D9 bắt buộc quyết định cắt |
| R2 | **Postgres tests < 90% pass D3** | D2 fail nhiều nhóm transaction | Minh dừng FE 1 ngày hỗ trợ Tùng fix tests ưu tiên; hoãn deploy D5 |
| R3 | **Render cold start timeout VNPay IPN** | D5 test IPN mất 2 lần | Backend re-check `vnp_trans_status` sau 30s; cron 5′ quét `ChoThanhToan > 15′` |
| R4 | **Tùng quá tải cực đoan** (DB + Render + VNPay + upload ảnh + FE Nhân viên + FE Admin + 12 chương + 4 video) | D4 slip | Hoán việc nhẹ sang Minh: Minh tiếp quản chương 10 (bảo mật) + video V3 admin |
| R5 | **FE A2 không đủ 3 role trước D10** | D7 < 50% màn xong | Theo mục 3.4 bước 3–6: cắt FE báo cáo kho UI, nhật ký filter, điều chỉnh kho chi tiết, upload ảnh bằng chứng |
| R6 | **VNPay sandbox lỗi xác thực** | D5 tạo URL lỗi | Config env riêng; test với `vnp_TmnCode` demo mặc định; fallback cuối: callback giả lập + ghi rõ trong báo cáo + video |
| R7 | **n8n self-host không expose được khi demo** | D3 webhook timeout | `ngrok` miễn phí expose n8n ra public URL; nếu Minh offline → chuyển gọi Gemini trực tiếp từ backend (0.5 ngày) |
| R8 | **Minh chưa quen SendGrid + n8n + Gemini** (3 provider mới trong 1 người) | D2 không xong khung | Tùng pair-program 0.5 ngày; dùng sample code SDK có sẵn; ưu tiên SendGrid > n8n tư vấn > n8n FAQ |

### 6.2 Fallback bắt buộc cho D10 freeze

Nếu D10 còn lỗi → ưu tiên theo thứ tự không-được-bỏ:

1. Luồng khách đặt thuê + thanh toán VNPay sandbox + email xác nhận chạy đầu-đến-cuối.
2. 1 báo cáo tài chính + 1 báo cáo vận hành hiển thị số đúng.
3. Admin tạo được chính sách mới + khuyến mãi mới (UI).
4. Nếu n8n/Gemini chưa ổn → tạm thay bằng gọi Gemini trực tiếp từ `TuVanAIService` (giữ interface).
5. Nếu Postgres tests < 100% → ghi rõ trong báo cáo (chương 11), miễn luồng demo không chạm case fail.
6. Nếu Render cold start đau → wake-up cron Tùng mỗi 10′.

### 6.3 Bất biến không được hy sinh

- Không mock VNPay/SendGrid/Gemini trong khi báo cáo "thật". Nếu phải mock, ghi rõ trong báo cáo và video.
- Không nhập số liệu test cho báo cáo tài chính/kho — đi qua luồng thật.
- Không skip test báo pass. Fail có bằng chứng.
- Không commit secret.

---

## 7. Tham chiếu nhanh

- Backend code: `backend/`.
- Frontend code: `frontend/src/`.
- Tài liệu nghiệp vụ: `Document/GearGo_Dac_Ta_*.md`.
- Plan tuần trước: `Document/Plan_Week2.md` → `Plan_Week6.md`.
- Repo: `https://github.com/ThanhTung0401/GearGo_Webapp.git`.
- Render dashboard: (Tùng chia sẻ sau D4).
- VNPay sandbox: `https://sandbox.vnpayment.vn`.
- SendGrid dashboard: (Minh chia sẻ sau khi tạo API key).
- Gemini API: `https://ai.google.dev` (Google AI Studio).
- n8n self-host: `http://localhost:5678` (máy Minh) + ngrok tunnel khi demo.
