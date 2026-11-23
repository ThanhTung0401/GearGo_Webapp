# Phần 5 — Tuấn Kiệt

**Vai trò dự án:** Đơn thuê + Thanh toán + Hết hạn + Bảo trì + Vòng đời thiết bị + Playwright E2E.
**Phụ trách viết trong báo cáo:**
- **Chương 7 — Kiểm thử** (toàn bộ)
- **Kết luận & Hướng phát triển**
- **Phụ lục B** — Danh mục 71 UC screenshots + SQL seed

---

## A. Chương 7 — Kiểm thử

### 7.1 Chiến lược kiểm thử — ba tầng
1. **Unit test (xUnit)** — `backend/test/GearGo.Tests/` — test domain service độc lập.
2. **Component test (Vitest)** — `frontend/` — test React component + hook.
3. **End-to-end test (Playwright)** — `tests/playwright/` — test luồng thật qua browser + API thật.

### 7.2 Playwright E2E — 10 phân hệ × 2 nhánh (frontend UI + backend API)
**Cấu trúc:** `tests/playwright/frontend/phan_he_XX_*/phan_he_XX.spec.ts` × 10 + `tests/playwright/backend/phan_he_XX_*/phan_he_XX.spec.ts` × 10.

**Cách chạy** (từ `README.md` dòng 104–117):
```powershell
npm --prefix tests/playwright run test:frontend
npm --prefix tests/playwright run test:backend
npm --prefix tests/playwright test
```

**Môi trường test:** Backend `:5000` thật + Frontend `:8443` thật + SQL Server Docker `:11433`. Mỗi test tự seed/cleanup.

### 7.3 Bảng Test Cases (>= 20 TC)
**Cách lấy dữ liệu:** mỗi file `phan_he_XX.spec.ts` có nhiều `test(...)` — map 1-1 vào bảng TC. Tổng ~30–40 test -> chọn 20 TC bao phủ các luồng cốt lõi + ngoại lệ.

| TC | Phân hệ | Chức năng | Bước thực hiện | Dữ liệu | KQ mong đợi | KQ thực tế |
|---|---|---|---|---|---|---|
| TC-01 | PH1 | Đăng ký khách hàng thành công | 1. Mở `/dang-ky` · 2. Nhập đủ field · 3. Submit | email `test@geargo.vn`, mật khẩu `Abc@12345` | 201 + redirect `/login` | Pass |
| TC-02 | PH1 | Đăng nhập sai 5 lần -> khóa 15' | Submit sai 5 lần | mk sai | HTTP 429 "Tạm khóa 15 phút" | Pass |
| TC-03 | PH1 | Đăng nhập cổng nội bộ với role KhachHang bị từ chối | `/staff/login` với `customer@geargo.vn` | | 403 | Pass |
| TC-04 | PH2 | Tìm kiếm SP phân trang | `/san-pham?page=1&size=12` | | 12 SP, totalPages > 1 | Pass |
| TC-05 | PH2 | Khả dụng theo lịch — Sweep Line | GET `/san-pham/{id}?gioNhan=...&gioTra=...` | 2 lịch giao nhau | Khả dụng = tổng − max chồng | Pass |
| TC-06 | PH2 | SP `TamNgung` không xuất hiện API khách | | | Không có trong list | Pass |
| TC-07 | PH3 | Thêm SP đã có -> cộng dồn SL | `POST /gio-thue/them` 2 lần | SL 1 + 2 | 1 dòng, SL = 3 | Pass |
| TC-08 | PH3 | Áp mã `TEST10` -> giảm 10% khi >= 500k | | tiền thuê 600k | giảm 60k | Pass |
| TC-09 | PH3 | Tạo đơn -> trạng thái `ChoThanhToan` + 1 `GiuCho` mỗi dòng | `POST /don-thue` | | 3 GiuCho `DangGiu`, hạn 15' | Pass |
| TC-10 | PH3 | Hủy đơn chưa thanh toán -> giải phóng giữ chỗ | `POST /don-thue/{id}/huy` | | GiuCho `DaGiaiPhong` | Pass |
| TC-11 | PH3 | Đơn quá 15' -> job tự `HetHan` | chờ 60s + job tick | | `DonThue.TrangThai = HetHan` | Pass |
| TC-12 | PH4 | Phân công serial thiết bị | admin login -> bàn giao | | ChiTietDonThue có `MaThietBi` | Pass |
| TC-13 | PH4 | Nhận trả một phần | Staff submit 2/3 thiết bị | | Đơn giữ `DangThue` + nhãn Trả một phần | Pass |
| TC-14 | PH5 | Thanh toán mock -> `DaXacNhan` + 2 ChiTietThanhToan | `POST /thanh-toan/{id}/tao-url` -> callback | | 1 ThanhToan.ThanhCong, 2 CT (Thue + Coc) | Pass |
| TC-15 | PH5 | Callback trùng `MaYeuCau` -> idempotent | gọi callback 2 lần | | KHÔNG tạo CT trùng, trả kết quả cũ | Pass |
| TC-16 | PH5 | Phụ phí tranh chấp -> Admin duyệt | Staff lập -> Admin duyệt | | TrangThai `DaDuyet` | Pass |
| TC-17 | PH6 | Admin thay đổi quyền -> middleware invalidate cache | Admin thu hồi quyền -> staff gọi API | | 403 ngay lần gọi kế | Pass |
| TC-18 | PH7 | Nhập kho xác nhận -> sinh ThietBi | Admin xác nhận PhieuNhap | | N ThietBi `SanSang` tạo mới | Pass |
| TC-19 | PH8 | Mã KM vượt tổng lượt -> từ chối | khách thứ N+1 áp mã giới hạn N | | HTTP 400 `KhuyenMaiKhongHopLeException` | Pass |
| TC-20 | PH8 | Lượt `DangGiu` hết hạn không chiếm lượt | tạo đơn -> quá 15' chưa trả | | Khách kế tiếp dùng được mã | Pass |
| TC-21 | PH9 | Đánh giá 1 SP / 1 đơn chỉ 1 lần | POST `/danh-gia` 2 lần | | Lần 2 -> 409 Conflict | Pass |
| TC-22 | PH10 | Báo cáo doanh thu tách thuê/cọc/phụ phí/hủy | GET `/bao-cao/doanh-thu?tu=...&den=...` | | 4 cột tổng riêng biệt | Pass |

> Yêu cầu khung giảng viên tối thiểu 20 TC -> đáp ứng 22.

### 7.4 Race condition & concurrency tests
Trích từ `PhanCong_Week2.md` task 12.4–12.6:
- **2 user cùng đặt thiết bị cuối** -> chỉ 1 thành công (Serializable + sweep line).
- **Thanh toán + job hết hạn chạy cùng lúc** -> không ghi đè nhau (UPDATE có điều kiện WHERE).
- **Callback trùng** -> không ghi 2 chi tiết thanh toán.

### 7.5 Backend Unit test (xUnit)
- `dotnet test GearGo_Webapp.sln` — chạy toàn bộ test suite backend.
- Liệt kê các test class quan trọng từ `backend/test/GearGo.Tests/`.

### 7.6 Kết quả tổng hợp
- Số TC: 22 + ~30 unit + ~15 component.
- Tỷ lệ pass: nêu con số từ Playwright report cuối cùng (có `tests/playwright/playwright-report/`).
- Screenshot `playwright-report/index.html` kèm vào.

---

## B. Kết luận & Hướng phát triển

### B.1 Kết quả đạt được
Checklist theo 10 phân hệ (bám `README.md` mục 5):
- PH1: 2 cổng, RBAC `[RequirePermission]`, khóa 5 lần sai, phân quyền động.
- PH2: Sweep line, lọc 7 tiêu chí, tư vấn AI mock.
- PH3: Giỏ, giữ chỗ 15' đồng bộ UTC, áp mã.
- PH4: Phân công serial, phiếu bàn giao, nhận trả một phần.
- PH5: VietQR 15', idempotent callback, phụ phí/duyệt/đối soát.
- PH6-7: Vòng đời thiết bị, nhập kho FIFO, kiểm kê.
- PH8: KhuyenMai + ChinhSach phiên bản.
- PH9: Đánh giá, phản hồi cửa hàng, thông báo deep link.
- PH10: Báo cáo tách thuê/cọc/phụ phí/hủy, nhật ký audit.

### B.2 Hạn chế
- Email chưa production (chỉ log console).
- VietQR sandbox — chưa ký hợp đồng cổng thanh toán thật.
- Chatbot AI chưa deploy (đã có skeleton n8n + Gemini).
- Chưa load test 1000 user đồng thời.
- Mobile responsive 320px chưa polish.

### B.3 Hướng phát triển
1. Tích hợp VietQR / VNPay / MoMo production.
2. SendGrid / Firebase Cloud Messaging push notification.
3. Chatbot n8n + Gemini production, kèm RAG trên knowledge base nghiệp vụ.
4. Phân tích ML: dự báo nhu cầu theo mùa, gợi ý khuyến mãi động.
5. App Mobile React Native.
6. Multi-tenant: nhiều chi nhánh, đồng bộ kho liên chi nhánh.

---

## C. Phụ lục B

- **B.1** Toàn bộ 71 UC screenshots (`Document/screenshots_uc/` + `manifest_71_ucs.json`) — mỗi trang 4 ảnh.
- **B.2** SQL seed đầy đủ: `scripts/SeedData_GearGo_Full.sql`.
- **B.3** Playwright report cuối cùng (ảnh `tests/playwright/playwright-report/index.html`).
- **B.4** Video demo: 2 video `V1` khách + `V4` admin (xem `Plan_Week7_HoanThien.md` mục 4).

---

## Nguồn dữ liệu trong repo
- `tests/playwright/frontend/phan_he_01_*/` -> `phan_he_10_*/` — spec file gốc.
- `tests/playwright/backend/phan_he_01_*/` -> `phan_he_10_*/`.
- `tests/playwright/helpers/{auth.ts, testData.ts, subsystemVideo.ts}`.
- `tests/playwright/playwright-report/`, `tests/playwright/videos/`, `test-results/`.
- `backend/test/GearGo.Tests/`.
- `README.md` mục 6 — hướng dẫn chạy test.
- `Document/screenshots_uc/manifest_71_ucs.json`.

## Hình ảnh cần chuẩn bị
- Screenshot Playwright HTML report.
- Biểu đồ: phân phối TC pass/fail theo phân hệ.
- 71 UC screenshots gộp phụ lục (dạng grid 4 ảnh/trang).

## Độ dài ước lượng
- Chương 7: ~10–12 trang.
- Kết luận: ~3 trang.
- Phụ lục B: ~25–30 trang (71 ảnh).
