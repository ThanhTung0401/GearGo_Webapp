# Phần 2 — Kiện Minh

**Vai trò dự án:** Catalog + Tìm kiếm + Khả dụng + Đánh giá/Thông báo + FE Khách.
**Phụ trách viết trong báo cáo:**
- **Chương 2 — Phân tích hệ thống** (toàn bộ)
- **Chương 4 (phần A)** — UI & luồng màn hình **nhánh Khách vãng lai + Khách hàng (customer)**

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

## B. Chương 4 (phần A) — UI nhánh Khách vãng lai & Customer

### 4.A.1 Sitemap nhánh public/customer
Vẽ sơ đồ (Mermaid flowchart hoặc draw.io):

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

### 4.A.2 Danh sách màn hình nhánh khách (lấy từ 71 UC screenshot)
Bảng danh sách ~30 màn hình khách (lọc từ `tests/playwright/frontend/phan_he_01` -> `phan_he_03`, `phan_he_09`):

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

### 4.A.3 Screenshot + mô tả chi tiết
- Mỗi màn hình: ảnh (lấy từ `Document/screenshots_uc/` — đã có sẵn 80 ảnh thực tế + `manifest_71_ucs.json`) + 4–6 dòng mô tả input/nút/validate.
- Ưu tiên 10–12 màn hình quan trọng nhất.

---

## Nguồn dữ liệu trong repo
- `Document/BB_DoAn_ChucNangtheoDSDK_Nhom10.docx.md` — ma trận chức năng × actor.
- `Document/GearGo_Dac_Ta_10_Phan_He_Use_Cases.md` — đặc tả 71 UC chi tiết.
- `Document/GearGo_Dac_Ta_Nghiep_Vu.md` — quy tắc nghiệp vụ gốc.
- `Document/screenshots_uc/` + `manifest_71_ucs.json` — 80 ảnh thực tế.
- `backend/Controllers/Catalog/`, `Services/Implements/KhaDungService.cs`, `SanPhamService.cs` — API nguồn.
- `frontend/src/modules/catalog/` — UI tương ứng.

## Hình ảnh cần chuẩn bị
- Sơ đồ actor (UML Use Case Diagram) — 4 actors + 10 PH.
- Sitemap nhánh public/customer (Mermaid).
- 10–12 screenshot kèm callout (số bước lưu luồng).

## Độ dài ước lượng
- Chương 2: ~15–20 trang (phần UC đặc tả dày).
- Chương 4 (phần A): ~10–12 trang.
