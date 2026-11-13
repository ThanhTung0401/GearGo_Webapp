# BÁO CÁO KHẢO SÁT, ĐỐI CHIẾU MÃ NGUỒN VÀ GAP ANALYSIS PHÂN HỆ 8, 9, 10 (UC80 - UC102)

> **Dự án:** Hệ thống cho thuê đồ cắm trại & dã ngoại GearGo  
> **Người thực hiện:** Teamwork Explorer (Phân hệ 8 - 10)  
> **Tài liệu tham chiếu:**  
> - `Document/GearGo_Dac_Ta_10_Phan_He_Use_Cases.md`  
> - `Document/GearGo_Dac_Ta_Nghiep_Vu.md`  
> - `Document/Swagger_API_Catalog.md`  
> - `graphify-out/graph.json`  
> - Toàn bộ mã nguồn Backend (`backend/`) và Frontend (`frontend/src/`)

---

## I. TỔNG QUAN KHẢO SÁT & ĐÍNH CHÍNH NỀN TẢNG KỸ THUẬT

### 1. Đính chính kiến trúc Backend thực tế
- **Đặc tả khảo sát yêu cầu:** Kiểm tra mã nguồn Backend Spring Boot.
- **Thực tế mã nguồn dự án:** Backend của GearGo được xây dựng 100% bằng **ASP.NET Core (.NET 8/9 C#)**, sử dụng Entity Framework Core (`ApplicationDbContext`), SQL Server, ASP.NET Core Identity và JWT Bearer Authentication. Không sử dụng Java Spring Boot.
- Toàn bộ Controller, Service, DTO, Entity trong báo cáo này được đối chiếu chính xác theo mã nguồn C# thực tế tại thư mục `backend/`.

### 2. Ánh xạ giữa 2 hệ thống mã số Use Case
Trong dự án GearGo tồn tại hai cách định danh tương đương:
1. **Mã số phân hệ theo tài liệu chuẩn hóa 10 phân hệ (`GearGo_Dac_Ta_10_Phan_He_Use_Cases.md`)**:
   - **Phân hệ 8:** Quản lý Chính sách & Khuyến mãi (Gồm các UC chính: UC8.1 - UC8.5 và phụ lục: UC8.1.1, UC8.2.1, UC8.3.1) kết hợp nghiệp vụ Quản lý Bảo dưỡng, Sửa chữa & Vòng đời thiết bị (UC16).
   - **Phân hệ 9:** Quản lý Đánh giá & Thông báo (Gồm các UC chính: UC9.1 - UC9.4 và phụ lục: UC9.1.1, UC9.1.2, UC9.2.1, UC9.4.1, UC9.3.1).
   - **Phân hệ 10:** Báo cáo, Thống kê & Tra cứu Lịch sử (Gồm các UC chính: UC10.1 - UC10.4 và phụ lục: UC10.1.1, UC10.2.1, UC10.4.1, UC10.4.2).
2. **Mã số tuần tự trong phân công nhiệm vụ (UC80 - UC102)**:
   - **Nhóm 8 (UC80 - UC89):** Quản lý Bảo dưỡng, Sửa chữa, Vòng đời thiết bị, Chính sách giá/phạt & Khuyến mãi.
   - **Nhóm 9 (UC90 - UC97):** Đánh giá sản phẩm, Kiểm duyệt phản hồi & Hệ thống Thông báo đa kênh.
   - **Nhóm 10 (UC98 - UC102):** Báo cáo vận hành kho, Doanh thu thuần, Dòng tiền thực tế, Báo cáo nhập hàng & Nhật ký kiểm toán (Audit Log).

---

## II. ĐỐI CHIẾU CHI TIẾT TỪNG USE CASE (UC80 - UC102)

### =========================================================================
### PHÂN HỆ 8: BẢO DƯỠNG, VÒNG ĐỜI THIẾT BỊ, CHÍNH SÁCH & KHUYẾN MÃI (UC80 - UC89)
### =========================================================================

---

#### 1. UC80 (Tương ứng UC16 / BaoTri) – Lập phiếu bảo dưỡng, vệ sinh & sửa chữa thiết bị
- **Tác nhân:** Nhân viên kho, Quản trị viên.
- **Tóm tắt:** Phát hiện thiết bị bẩn hoặc hư hỏng sau kiểm tra nhận trả/kiểm kê; lập phiếu bảo trì ghi loại xử lý (vệ sinh đặc biệt, sửa chữa nhẹ, sửa chữa nặng), loại thiết bị khỏi danh sách sẵn sàng cho thuê.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/BaoTriController.cs` (`api/v1/bao-tri`)
  - Endpoint: `POST /api/v1/bao-tri` (gọi `IBaoTriService.LapPhieuAsync`)
  - DTO: `LapBaoTriRequest` (MaThietBi, LoaiBaoTri, MoTaLoi, DuKienHoanThanh, MaDonThueLienQuan, ChiPhiUocTinh).
  - Entity: `PhieuBaoTri` liên kết `ThietBi`, chuyển trạng thái `ThietBi.TrangThai = DangBaoTri`.
  - Phân quyền: `[Authorize(Policy = "StaffOrAdmin")]`.
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/StaffView.tsx` (Tab Bảo trì).
  - Component: Modal tạo phiếu bảo dưỡng / sửa chữa.
  - Mock data: `INITIAL_MAINTENANCE_RECEIPTS` trong `src/data/initialMaintenance.ts`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]** (Đang ghi vào context local state, chưa gọi `POST /api/v1/bao-tri`).
- **Gap & Rủi ro:**
  - Frontend chưa gọi endpoint backend thật khi bật `isRealApiEnabled()`. Khi reload trang dữ liệu bảo trì quay về mock data ban đầu.
- **Checklist công việc Subagent:**
  - *Backend:* Đã hoàn thiện, chỉ cần viết thêm integration test xác nhận trạng thái thiết bị chuyển sang `DangBaoTri`.
  - *Frontend:* Tạo `maintenanceService.ts` trong `src/services/`, gắn API call `POST /api/v1/bao-tri` vào form lập phiếu của `StaffView.tsx`.

---

#### 2. UC81 – Phân công kỹ thuật viên & Cập nhật tiến độ bảo trì
- **Tác nhân:** Quản trị viên, Nhân viên phụ trách kỹ thuật.
- **Tóm tắt:** Chỉ định người thực hiện bảo dưỡng/sửa chữa; cập nhật tiến độ từng giai đoạn, chi phí phát sinh thực tế, ảnh linh kiện thay thế.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/BaoTriController.cs`
  - Endpoints:
    - `POST /api/v1/bao-tri/{id}/phan-cong` (gọi `PhanCongXuLyAsync`, DTO: `PhanCongBaoTriRequest`)
    - `PUT /api/v1/bao-tri/{id}/tien-do` (gọi `CapNhatTienDoAsync`, DTO: `CapNhatTienDoRequest`)
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/StaffView.tsx` (Danh sách phiếu bảo trì, nút Phân công & Cập nhật tiến độ).
  - Mock data: Cập nhật trực tiếp `app.maintenanceReceipts`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Thêm các hàm `assignStaff(id, data)` và `updateProgress(id, data)` vào `maintenanceService.ts`, tích hợp vào form cập nhật tiến độ.

---

#### 3. UC82 – Nghiệm thu hoàn thành bảo trì & Tái kích hoạt thiết bị sẵn sàng
- **Tác nhân:** Quản trị viên (AdminOnly).
- **Tóm tắt:** Kỹ thuật viên gửi yêu cầu kiểm tra (`POST gui-kiem-tra`); Quản trị viên kiểm tra chất lượng thực tế. Nếu đạt, xác nhận hoàn thành, ghi nhận chi phí thực tế, chuyển thiết bị về trạng thái "Sẵn sàng". Nếu không đạt, chuyển sang phương án kết thúc không đạt để thanh lý hoặc giáng cấp.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/BaoTriController.cs`
  - Endpoints:
    - `POST /api/v1/bao-tri/{id}/gui-kiem-tra` (`StaffOrAdmin`)
    - `POST /api/v1/bao-tri/{id}/hoan-thanh` (`AdminOnly`, DTO: `XacNhanBaoTriRequest`)
    - `POST /api/v1/bao-tri/{id}/ket-thuc-khong-dat` (`AdminOnly`, DTO: `XacNhanBaoTriRequest`)
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/AdminView.tsx` (Quản lý thiết bị & kho), `StaffView.tsx`.
  - Mock data: Thay đổi trạng thái thiết bị trong `app.equipment`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Nối các nút Nghiệm thu / Trả về kho vào endpoint backend; thêm kiểm tra vai trò admin khi thao tác nút nghiệm thu.

---

#### 4. UC83 (Tương ứng VongDoiThietBi) – Đề nghị giáng cấp & điều chuyển sản phẩm thiết bị cũ
- **Tác nhân:** Nhân viên kho đề nghị, Quản trị viên phê duyệt.
- **Tóm tắt:** Thiết bị sau nhiều lần cho thuê hoặc sửa chữa bị hao mòn (còn 70-80% độ mới). Cho phép chuyển thiết bị sang mã sản phẩm giá thấp hơn mà vẫn giữ nguyên lịch sử nhập kho ban đầu; kiểm tra xung đột với các đơn thuê tương lai.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/VongDoiThietBiController.cs` (`api/v1/vong-doi-thiet-bi`)
  - Endpoints:
    - `GET /api/v1/vong-doi-thiet-bi/{id}` (Lấy hồ sơ vòng đời thiết bị)
    - `POST /api/v1/vong-doi-thiet-bi/{id}/xem-anh-huong` (Kiểm tra xem thiết bị có dính lịch đơn tương lai không)
    - `POST /api/v1/vong-doi-thiet-bi/{id}/de-nghi-giang-cap` (DTO: `DeNghiGiangCapRequest`)
    - `POST /api/v1/vong-doi-thiet-bi/{id}/dieu-chuyen-san-pham`
    - `POST /api/v1/vong-doi-thiet-bi/de-nghi/{maPhieuDieuChinh}/duyet` (`AdminOnly`)
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - Component: `frontend/src/components/EquipmentLifecycleModal.tsx`.
  - View: Modal mở hồ sơ vòng đời, xem lịch sử sửa chữa, nút đề nghị giáng cấp và cảnh báo đơn tương lai bị ảnh hưởng.
  - Mock data: Đang thao tác giả lập trên state.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Tạo `lifecycleService.ts`, kết nối `EquipmentLifecycleModal.tsx` với các endpoint `/api/v1/vong-doi-thiet-bi/*`.

---

#### 5. UC84 – Đề nghị ngừng sử dụng & Thanh lý thiết bị hư hại không thể phục hồi
- **Tác nhân:** Nhân viên kho đề nghị, Quản trị viên duyệt.
- **Tóm tắt:** Thiết bị hỏng nặng, mất phụ kiện không thể thay thế hoặc có chi phí sửa chữa vượt quá giá trị bồi thường. Lập phiếu điều chỉnh ngừng sử dụng, chuyển trạng thái `NgungSuDung` hoặc `ThatLac`, không tính vào khả dụng kho.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/VongDoiThietBiController.cs`
  - Endpoint: `POST /api/v1/vong-doi-thiet-bi/{id}/de-nghi-ngung-su-dung` (DTO: `DeNghiNgungSuDungRequest`), duyệt qua `/de-nghi/{id}/duyet`.
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `EquipmentLifecycleModal.tsx` và Tab `equipment` của `AdminView.tsx`.
  - Mock data: `INITIAL_STOCK_ADJUSTMENTS`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Gọi API `/api/v1/vong-doi-thiet-bi/{id}/de-nghi-ngung-su-dung` khi bấm xác nhận ngừng sử dụng.

---

#### 6. UC85 (Tương ứng UC8.1 & UC8.1.1) – Cấu hình chính sách cho thuê, giờ nhận trả & biểu phí phạt trễ
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Cấu hình các quy tắc nghiệp vụ: hạn giữ chỗ (15 phút), giờ nhận/trả tiêu chuẩn, hệ số phạt trễ (150%), mốc phạt hủy (>48h, 24-48h, <24h), ngưỡng duyệt phụ phí của Admin, lịch nhắc khách. Mỗi lần đổi tạo 1 phiên bản chính sách mới có hiệu lực từ mốc thời gian xác định, không tính hồi tố cho đơn cũ.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/ChinhSachController.cs` (`api/v1/admin/chinh-sach`)
  - Endpoints:
    - `GET /api/v1/admin/chinh-sach` (phân trang, sắp xếp theo phiên bản và thời điểm giảm dần)
    - `GET /api/v1/admin/chinh-sach/{id}`
    - `POST /api/v1/admin/chinh-sach/kiem-tra` (xem trước tác động)
    - `POST /api/v1/admin/chinh-sach` (tạo phiên bản mới, DTO: `TaoChinhSachRequest`)
  - Service: `ChinhSachService.cs` (kiểm tra xung đột phiên bản, mốc hiệu lực hồi tố, validate miền giá trị).
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/AdminExtendedTabs.tsx` (`PoliciesTab`).
  - Giao diện: Đầy đủ các input chỉnh sửa thông số, modal diff so sánh giá trị cũ và mới, nhập lý do ban hành phiên bản mới, sub-tab xem snapshot các phiên bản cũ trong lịch sử.
  - Mock data: `INITIAL_POLICIES` và `INITIAL_POLICY_VERSIONS` trong `src/data/initialPolicies.ts`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]** (Chưa kết nối API `ChinhSachController.cs`).
- **Checklist công việc Subagent:**
  - *Frontend:* Tạo `policyService.ts`, kết nối `PoliciesTab` để `GET` danh sách phiên bản và `POST` ban hành phiên bản mới từ Backend.

---

#### 7. UC86 (Tương ứng UC8.2 & UC8.2.1) – Tạo chiến dịch khuyến mãi & Kiểm tra điều kiện giảm giá
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Tạo mã giảm giá theo phần trăm hoặc số tiền cố định; cấu hình thời hạn hiệu lực, tiền thuê tối thiểu, phạm vi áp dụng (theo danh mục hoặc sản phẩm cụ thể), giới hạn tổng lượt dùng và số lượt mỗi khách. Ràng buộc: chỉ giảm trên tiền thuê, tuyệt đối không giảm cọc.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/KhuyenMaiController.cs` (`api/v1/admin/khuyen-mai`)
  - Endpoint: `POST /api/v1/admin/khuyen-mai` (DTO: `TaoKhuyenMaiRequest`)
  - Service: `QuanTriKhuyenMaiService.cs` (kiểm tra mã trùng, validate cấu hình giảm giá, không cho giảm cọc).
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/AdminView.tsx` (Tab `promotions`).
  - Component: Modal tạo khuyến mãi mới với đầy đủ trường dữ liệu.
  - Mock data: `INITIAL_PROMOTIONS` trong `src/data/initialPromotions.ts`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Tạo `promotionService.ts`, thay thế hàm lưu local bằng `POST /api/v1/admin/khuyen-mai`.

---

#### 8. UC87 (Tương ứng UC8.3 & UC8.3.1) – Cập nhật khuyến mãi & Khóa ràng buộc ưu đãi đã cam kết
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Chỉnh sửa thông tin khuyến mãi. Ràng buộc bất biến: nếu chương trình đã có lượt giữ chỗ hoặc đơn đã chốt, hệ thống khóa không cho sửa các điều khoản cốt lõi (mức giảm, điều kiện tiền thuê tối thiểu) và không cho giảm tổng số lượt xuống dưới số lượt đang chiếm.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/KhuyenMaiController.cs`
  - Endpoint: `PUT /api/v1/admin/khuyen-mai/{id}` (DTO: `CapNhatKhuyenMaiRequest`)
  - Service: Kiểm tra `DIEU_KHOAN_MA_DA_CAM_KET` và `HAN_MUC_THAP_HON_DANG_CHIEM` trả mã lỗi 409 Conflict chuẩn mực.
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: Tab `promotions` của `AdminView.tsx`.
  - Mock data: Sửa trực tiếp trên `app.promotions`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Gọi `PUT /api/v1/admin/khuyen-mai/{id}`, bắt mã lỗi 409 để hiển thị cảnh báo vi phạm cam kết đơn cũ cho người dùng.

---

#### 9. UC88 (Tương ứng UC8.4) – Tra cứu danh sách & Thống kê lượt sử dụng khuyến mãi
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Tìm kiếm khuyến mãi theo mã, từ khóa, trạng thái; xem chi tiết số lượt đã dùng, danh sách các đơn hàng đã áp dụng mã và tổng tiền giảm.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/KhuyenMaiController.cs`
  - Endpoints:
    - `GET /api/v1/admin/khuyen-mai` (phân trang và bộ lọc `TimKiemKhuyenMaiRequest`)
    - `GET /api/v1/admin/khuyen-mai/{id}` (chi tiết)
    - `GET /api/v1/admin/khuyen-mai/{id}/su-dung` (danh sách đơn thuê và lịch sử dùng mã)
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: Tab `promotions`, component `PromotionDetailModal.tsx`.
  - Mock data: `INITIAL_PROMOTIONS`, `promotionUsages`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Tích hợp API `GET /api/v1/admin/khuyen-mai` vào bảng danh sách và `GET /api/v1/admin/khuyen-mai/{id}/su-dung` vào modal chi tiết.

---

#### 10. UC89 (Tương ứng UC8.5) – Ngừng kích hoạt / Tạm ẩn chương trình khuyến mãi
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Ngừng áp dụng chương trình khuyến mãi trước hạn hoặc tạm ẩn để điều chỉnh; không ảnh hưởng đến các đơn đã thanh toán hoặc đã giữ chỗ hợp lệ. Cho phép mở lại khi cần.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/KhuyenMaiController.cs`
  - Endpoints:
    - `POST /api/v1/admin/khuyen-mai/{id}/tam-an` (DTO: `DoiHienThiKhuyenMaiRequest`)
    - `POST /api/v1/admin/khuyen-mai/{id}/hien-thi`
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: Tab `promotions`, nút "Tạm ẩn" / "Kích hoạt lại".
  - Mock data: Đổi thuộc tính `status` trong `app.promotions`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Gắn API call `tam-an` và `hien-thi` vào các nút tương ứng trên UI.

---

### =========================================================================
### PHÂN HỆ 9: ĐÁNH GIÁ, CHĂM SÓC KHÁCH HÀNG & THÔNG BÁO (UC90 - UC97)
### =========================================================================

---

#### 11. UC90 (Tương ứng UC9.1 & UC9.1.1) – Gửi đánh giá sản phẩm sau khi hoàn tất thuê đồ
- **Tác nhân:** Khách hàng.
- **Tóm tắt:** Sau khi đơn thuê hoàn tất đối soát cọc, khách hàng chọn sản phẩm trong đơn để chấm 1-5 sao và viết nhận xét. Ràng buộc: chỉ khách sở hữu đơn thuê đã "Hoàn tất" và có sản phẩm đó mới được đánh giá; mỗi sản phẩm trong 1 đơn chỉ đánh giá 1 lần duy nhất.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/DanhGiaController.cs` (`api/v1/danh-gia`)
  - Endpoints:
    - `POST /api/v1/danh-gia` (DTO: `TaoDanhGiaRequest`)
    - `GET /api/v1/danh-gia/du-dieu-kien` (lấy danh sách sản phẩm đủ điều kiện đánh giá của khách)
  - Service: `DanhGiaService.cs` (kiểm tra quyền sở hữu đơn, trạng thái hoàn tất, kiểm tra trùng đánh giá `DANH_GIA_DA_TON_TAI`).
  - Phân quyền: `[Authorize]`.
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/CustomerPortal.tsx` (Tab Đơn hàng & Tab Đánh giá chuyến đi).
  - Mock data: `INITIAL_REVIEWS` trong `src/data/initialReviews.ts`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Tạo `reviewService.ts`, gọi `GET /api/v1/danh-gia/du-dieu-kien` để hiển thị sản phẩm cần đánh giá và `POST /api/v1/danh-gia` khi khách bấm gửi.

---

#### 12. UC91 (Tương ứng UC9.1.2) – Đính kèm hình ảnh trải nghiệm vào đánh giá
- **Tác nhân:** Khách hàng.
- **Tóm tắt:** Cho phép khách hàng tải lên tối đa 5 hình ảnh thực tế trải nghiệm cắm trại cùng sản phẩm. Hệ thống kiểm tra định dạng và lưu trữ link ảnh đính kèm bản đánh giá.
- **Hiện trạng Backend:**
  - DTO: `TaoDanhGiaRequest.DanhSachAnh` (mảng URL ảnh).
  - Service: Hỗ trợ lưu danh sách ảnh vào entity `DanhGia`.
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: Form viết đánh giá tại `CustomerPortal.tsx` đã có input tải ảnh và preview thumbnail.
  - Mock data: Lưu mảng ảnh vào object review local.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]** (Cần endpoint upload ảnh hoặc tích hợp link ảnh vào payload `TaoDanhGiaRequest`).
- **Checklist công việc Subagent:**
  - *Frontend:* Đảm bảo payload gửi lên `POST /api/v1/danh-gia` chứa mảng `danhSachAnh`.

---

#### 13. UC92 – Xem đánh giá công khai & Biểu đồ phân bố sao của sản phẩm
- **Tác nhân:** Khách vãng lai, Khách hàng.
- **Tóm tắt:** Người dùng xem danh sách đánh giá của sản phẩm tại trang chi tiết (chỉ hiển thị đánh giá công khai, không hiển thị đánh giá đã bị ẩn); xem điểm trung bình và biểu đồ phân bố 1 đến 5 sao.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/DanhGiaController.cs`
  - Endpoints:
    - `GET /api/v1/danh-gia/san-pham/{sanPhamId}` (`[AllowAnonymous]`, lọc số sao, phân trang, sắp xếp)
    - `GET /api/v1/danh-gia/san-pham/{sanPhamId}/tong-hop` (điểm trung bình, tổng lượt, phân bố sao)
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/ProductsView.tsx` (Phần chi tiết sản phẩm hiển thị sao, reviews list).
  - Mock data: Lọc từ `INITIAL_REVIEWS`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Gọi 2 endpoint trên khi mở modal chi tiết sản phẩm tại `ProductsView.tsx`.

---

#### 14. UC93 (Tương ứng UC9.2 & UC9.2.1) – Kiểm duyệt đánh giá vi phạm & Ghi nhận lý do
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Quản trị viên duyệt danh sách đánh giá. Khi phát hiện ngôn từ phản cảm, thô tục hoặc spam, admin thực hiện ẩn đánh giá kèm lý do bắt buộc. Ràng buộc cốt lõi: điểm đánh giá thấp (1-2 sao) tự nó không phải là lý do ẩn; không được sửa điểm hoặc nội dung gốc của khách hàng. Cho phép khôi phục khi cần.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/DanhGiaController.cs` (`api/v1/admin/danh-gia`)
  - Endpoints:
    - `GET /api/v1/admin/danh-gia` (tra cứu toàn bộ kèm lọc trạng thái)
    - `POST /api/v1/admin/danh-gia/{id}/an` (DTO: `AnDanhGiaRequest`, lưu lý do và actorId)
    - `POST /api/v1/admin/danh-gia/{id}/khoi-phuc` (DTO: `KhoiPhucDanhGiaRequest`)
  - Phân quyền: `[Authorize(Policy = "AdminOnly")]`.
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/AdminExtendedTabs.tsx` (`ReviewsTab`).
  - Giao diện: Đã có bảng kiểm duyệt, nút xem căn cứ đơn thuê, modal chọn căn cứ vi phạm chuẩn (Thô tục, Spam, Phản cảm...), nút Khôi phục hiển thị.
  - Mock data: Thao tác trên mảng `app.reviews`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Kết nối các action Ẩn / Khôi phục vào các endpoint `/api/v1/admin/danh-gia/*`.

---

#### 15. UC94 – Phản hồi đánh giá của khách hàng từ phía cửa hàng
- **Tác nhân:** Quản trị viên, Nhân viên CSKH.
- **Tóm tắt:** Cửa hàng gửi phản hồi chính thức giải thích hoặc cảm ơn đánh giá của khách hàng. Phản hồi hiển thị công khai ngay dưới đánh giá gốc.
- **Hiện trạng Backend:**
  - Entity: `DanhGia` có trường `PhanHoiCuaHang`, `ThoiDiemPhanHoi`, `NguoiPhanHoi`.
  - Service: Cần bổ sung endpoint chính thức cập nhật trường phản hồi trong `DanhGiaController.cs`.
  - Trạng thái: **[Chưa hoàn thiện]** (Backend thiếu endpoint `POST /api/v1/admin/danh-gia/{id}/phan-hoi`).
- **Hiện trạng Frontend:**
  - View: `ReviewsTab` đã có nút "💬 Phản hồi" và form nhập nội dung phản hồi của cửa hàng.
  - Trạng thái: **[Hoàn thành UI]** / **[Thiếu Backend API]**.
- **Checklist công việc Subagent:**
  - *Backend:* Bổ sung endpoint `POST /api/v1/admin/danh-gia/{id}/phan-hoi` trong `Admin/DanhGiaController.cs` và service.
  - *Frontend:* Nối form phản hồi vào endpoint mới này.

---

#### 16. UC95 (Tương ứng UC9.3 & UC9.3.1) – Xem thông báo nghiệp vụ & Điều hướng Deep-link
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên.
- **Tóm tắt:** Xem danh sách thông báo gửi riêng cho tài khoản (xác nhận đơn, sẵn sàng nhận, nhắc trả, phát sinh phụ phí, hoàn cọc...); đếm số chưa đọc; đánh dấu đã đọc. Hỗ trợ Deep-link: bấm vào thông báo mở trực tiếp màn hình chi tiết đơn thuê hoặc sản phẩm tương ứng, có kiểm tra quyền truy cập đích ở thời điểm mở.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/ThongBaoController.cs` (`api/v1/thong-bao`)
  - Endpoints:
    - `GET /api/v1/thong-bao`
    - `GET /api/v1/thong-bao/chua-doc/dem`
    - `POST /api/v1/thong-bao/{id}/da-doc`
    - `POST /api/v1/thong-bao/da-doc-tat-ca`
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - Component: Bell icon & Dropdown thông báo ở Header navbar, view chi tiết thông báo tại `CustomerPortal.tsx` và `StaffView.tsx`.
  - Deep-link: Đã hỗ trợ click mở trang đơn hàng hoặc đánh giá.
  - fakeApi: Đã có `fakeApi.notifications.getMine()`, nhưng chưa nối các nút đánh dấu đã đọc vào backend.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Thêm các hàm `markAsRead(id)`, `markAllAsRead()` vào `notificationService.ts` và gọi backend thật.

---

#### 17. UC96 (Tương ứng UC9.4 & UC9.4.1) – Quản trị nội dung & Phát hành thông báo hệ thống
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Quản trị viên chủ động soạn thông báo nghiệp vụ, chọn đối tượng nhận (toàn bộ, khách hàng, nhân viên, hoặc cá nhân cụ thể), chọn mức độ ưu tiên, danh mục và gắn liên kết hành động (Deep-link).
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/ThongBaoController.cs` (`api/v1/admin/thong-bao`)
  - Endpoint: `POST /api/v1/admin/thong-bao` (DTO: `GuiThongBaoAdminRequest`)
  - Background Job: `ThongBaoJob.cs` quét và phát thông báo.
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/AdminExtendedTabs.tsx` (`NotificationsTab`).
  - Giao diện: Form soạn thảo, chọn đối tượng nhận, độ ưu tiên, cấu hình Deep-link action, xem trước trực quan.
  - fakeApi: Đã có `fakeApi.notifications.sendAdmin()` gọi `POST /api/v1/admin/thong-bao`.
  - Trạng thái: **[Hoàn thành]** (Đã tích hợp qua fakeApi client).
- **Checklist công việc Subagent:**
  - *Frontend:* Kiểm thử end-to-end đảm bảo khi gửi từ tab Admin, notification xuất hiện ở tài khoản khách nhận tương ứng.

---

#### 18. UC97 – Quản lý hàng chờ thông báo lỗi & Kích hoạt gửi lại (Retry mechanism)
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Tra cứu danh sách các thông báo tự động gửi qua email hoặc push bị thất bại (do rớt mạng, email sai...); xem nguyên nhân lỗi và bấm kích hoạt gửi lại có kiểm soát, tránh gửi trùng lặp.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/ThongBaoController.cs`
  - Endpoints:
    - `GET /api/v1/admin/thong-bao/gui-loi` (lấy danh sách thông báo gửi lỗi có phân trang)
    - `POST /api/v1/admin/thong-bao/{id}/thu-lai` (DTO: `ThuLaiThongBaoRequest`)
  - Service: `GuiThongBaoService.cs` (kiểm tra trạng thái đang xử lý để chống duplicate send).
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `NotificationsTab` hiện mới chỉ có form gửi và lịch sử thông báo đã phát chung, **chưa có giao diện danh sách hàng chờ gửi lỗi và nút Thử lại**.
  - Trạng thái: **[Chưa hoàn thiện UI / Thiếu]**
- **Gap & Rủi ro:**
  - Backend đã sẵn sàng 2 endpoint nhưng Frontend chưa dựng bảng hàng chờ gửi lỗi.
- **Checklist công việc Subagent:**
  - *Frontend:* Thêm sub-tab hoặc modal "Hàng chờ gửi lỗi" trong `NotificationsTab`, kết nối với `GET /api/v1/admin/thong-bao/gui-loi` và `POST .../thu-lai`.

---

### =========================================================================
### PHÂN HỆ 10: BÁO CÁO, PHÂN TÍCH KINH DOANH & KIỂM TOÁN (UC98 - UC102)
### =========================================================================

---

#### 19. UC98 (Tương ứng UC10.1 & UC10.1.1) – Xem báo cáo vận hành kho & Hiệu suất sử dụng thiết bị
- **Tác nhân:** Nhân viên kho, Quản trị viên.
- **Tóm tắt:** Lọc dữ liệu theo kỳ báo cáo; tính toán 6 chỉ tiêu vận hành: số đơn cần giao, đơn cần nhận trả, đơn quá hạn hiện tại, đơn chờ đối soát, số lượt đã bàn giao, số lần hỏng có kết luận; xem công suất sử dụng thiết bị (% đang thuê, sẵn sàng, bảo trì, mất) và top thiết bị cho thuê nhiều nhất. Hỗ trợ Drill-down nhấn vào chỉ tiêu mở danh sách đơn cấu thành.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/BaoCaoVanHanhController.cs` (`api/v1/admin/bao-cao-van-hanh`) và `backend/Controllers/BaoCaoKhoController.cs` (`api/v1/bao-cao/kho/hien-trang`, `api/v1/bao-cao/kho/bao-tri`).
  - Service: `BaoCaoVanHanhService.cs`, `BaoCaoKhoService.cs`.
  - GAP PHÂN QUYỀN: `BaoCaoVanHanhController.cs` đang để `[Authorize(Policy = "AdminOnly")]`. Trong khi theo đặc tả UC10.1, **Nhân viên (Staff)** có quyền xem báo cáo vận hành công việc của mình.
  - Trạng thái: **[Chưa hoàn thiện / Sai phân quyền]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/AdminView.tsx` (Sub-tab `operational` trong Tab `reports`).
  - Giao diện: Rất chi tiết, có lưới 6 chỉ tiêu, thanh bar công suất kho, top thiết bị, modal Drill-down danh sách cấu thành.
  - Mock data: Tính toán trực tiếp trên React state `app.orders` và `app.equipment`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Backend:* Sửa policy `BaoCaoVanHanhController.cs` thành `[Authorize(Policy = "StaffOrAdmin")]`; nếu là nhân viên thì lọc dữ liệu theo phạm vi công việc.
  - *Frontend:* Tạo `reportService.ts`, gọi `GET /api/v1/admin/bao-cao-van-hanh` thay vì tính nhẩm trên mảng local.

---

#### 20. UC99 (Tương ứng UC10.2 & UC10.2.1) – Xem báo cáo doanh thu thuần & Phân tích kinh doanh
- **Tác nhân:** Quản trị viên (AdminOnly).
- **Tóm tắt:** Báo cáo doanh thu tuân thủ nguyên tắc kế toán: Chỉ ghi nhận doanh thu từ đơn "Hoàn tất" theo ngày hoàn tất thực tế (tiền thuê sau giảm giá + phụ phí bồi thường được duyệt); tách riêng phí hủy đơn; **tuyệt đối không cộng tiền cọc vào doanh thu**; tính tỷ lệ hủy đơn (theo quy tắc BR22 loại trừ đơn hết hạn) và số lượng khách quay lại (≥2 lượt hoàn tất).
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/BaoCaoTaiChinhController.cs` (`api/v1/admin/bao-cao/tai-chinh`)
  - Endpoints:
    - `GET .../doanh-thu-hoan-tat`: Doanh thu thuê thuần
    - `GET .../phi-huy`: Phí hủy giữ lại
    - `GET .../dieu-chinh`: Điều chỉnh doanh thu sau chốt
    - `GET .../coc-chua-tat-toan`: Số dư cọc còn phải xử lý
    - `GET .../xuat-csv`: Xuất file CSV UTF-8 có bảo vệ chống CSV Injection
  - Service: `BaoCaoTaiChinhService.cs` (logic hoàn hảo, tuân thủ 100% chuẩn kế toán).
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `AdminView.tsx` (Sub-tab `revenue` trong `reports`).
  - Giao diện: Hiển thị 3 thẻ doanh thu cốt lõi, alert cảnh báo nguyên tắc cọc, phân bổ danh mục, widget tỷ lệ hủy đơn & khách quay lại.
  - Mock data: Tính toán từ `app.orders`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Kết nối các endpoint `/api/v1/admin/bao-cao/tai-chinh/*` vào Sub-tab doanh thu của `AdminView.tsx`.

---

#### 21. UC100 (Tương ứng UC10.2.1) – Xem báo cáo phân tích dòng tiền thực tế (Cashflow)
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Phân biệt rạch ròi giữa Doanh thu và Dòng tiền. Dòng tiền tính theo ngày giao dịch thanh toán/hoàn tiền thực tế thành công: Tổng dòng tiền vào (Inflow: tiền thuê + cọc ban đầu + phụ phí thu thêm) trừ Tổng dòng tiền ra (Outflow: hoàn cọc + hoàn hủy) = Dòng tiền ròng (Net Cashflow).
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/BaoCaoTaiChinhController.cs`
  - Endpoints:
    - `GET .../thu-hoan` (hoặc `dong-tien`)
    - `GET .../can-xu-ly` (các khoản pending, chênh lệch giao dịch)
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `AdminView.tsx` (Sub-tab `cashflow` trong `reports`).
  - Giao diện: Hiển thị thẻ Inflow xanh lá, Outflow đỏ, Net Cashflow, bảng chi tiết các dòng giao dịch tiền vào/ra.
  - Mock data: Tính từ `order.transactions`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Nối API `GET /api/v1/admin/bao-cao/tai-chinh/thu-hoan` vào Sub-tab Cashflow.

---

#### 22. UC101 (Tương ứng UC10.3) – Xem báo cáo nhập hàng, giá trị tài sản kho & Lịch sử đơn giá
- **Tác nhân:** Quản trị viên.
- **Tóm tắt:** Tổng hợp số lượng và giá trị thiết bị thực tế nhập kho theo các phiếu nhập đã xác nhận trong kỳ; xem phát sinh điều chỉnh nhập và lịch sử biến động đơn giá mua theo từng nhà cung cấp và sản phẩm; xuất file báo cáo.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/BaoCaoKhoController.cs` (`api/v1/admin/bao-cao/kho`)
  - Endpoints:
    - `GET .../nhap-hang` (theo lô nhập, chỉ tính phiếu đã nhập kho)
    - `GET .../dieu-chinh-nhap` (phát sinh điều chỉnh nhập trong kỳ)
    - `GET .../lich-su-don-gia` (lịch sử đơn giá nhập và đơn giá bình quân gia quyền)
    - `GET .../xuat-csv`
  - Trạng thái: **[Hoàn thành]**
- **Hiện trạng Frontend:**
  - View: `AdminView.tsx` (Sub-tab `inventory` trong `reports`).
  - Giao diện: Hiển thị tổng giá trị tài sản nhập kho, danh sách phiếu nhập đã xác nhận, lọc theo nhà cung cấp.
  - Mock data: Lấy từ `app.importReceipts`.
  - Trạng thái: **[Chưa hoàn thiện kết nối API]**
- **Checklist công việc Subagent:**
  - *Frontend:* Nối API `GET /api/v1/admin/bao-cao/kho/nhap-hang` và `lich-su-don-gia` vào Sub-tab Nhập kho.

---

#### 23. UC102 (Tương ứng UC10.4, UC10.4.1 & UC10.4.2) – Tra cứu nhật ký hệ thống (Audit Log) & Mở chứng từ đối chiếu
- **Tác nhân:** Nhân viên (tra cứu lịch sử công việc), Quản trị viên (toàn quyền tra cứu kiểm toán).
- **Tóm tắt:** Truy vết toàn bộ biến động: người thực hiện, vai trò, thời điểm, hành động, đối tượng tác động, dữ liệu trước/sau và lý do. Bất biến: Nhật ký là Read-only, tuyệt đối không cho sửa hoặc xóa. Tính năng UC10.4.2: nhấn vào mã chứng từ trong nhật ký mở xem chi tiết chứng từ gốc ở chế độ tra cứu.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/NhatKyController.cs` (`api/v1/admin/nhat-ky`)
  - Endpoint: `GET /api/v1/admin/nhat-ky`
  - Hỗ trợ: Phân trang `PagedResult`, lọc theo `maTaiKhoan`, `hanhDong`, `loaiDoiTuong`, `maDoiTuong`, `tuNgay`, `denNgay`, `tuKhoa`.
  - Tính năng UC10.4.2: Tự động sinh trường `ThamChieuUrl` trỏ đến API chứng từ gốc tương ứng (`DON_THUE`, `PHIEU_NHAP`, `PHIEU_BAO_TRI`, `DOI_SOAT`...).
  - GAP PHÂN QUYỀN: Controller hiện gắn `[Authorize(Policy = "AdminOnly")]`. Theo đặc tả UC10.4, Nhân viên cũng có quyền tra cứu nhật ký liên quan đến công việc của mình.
  - Trạng thái: **[Chưa hoàn thiện / Sai phân quyền]**
- **Hiện trạng Frontend:**
  - View: `frontend/src/views/AdminExtendedTabs.tsx` (`AuditLogTab`).
  - Giao diện: Bảng timeline kiểm toán, bộ lọc theo người thực hiện, vai trò, khoảng thời gian.
  - UC10.4.2: Đã có chức năng click vào mã đối tượng mở modal xem chứng từ liên quan (`inspectDoc` cho đơn hàng, phiếu nhập, thiết bị) và modal xem chi tiết sự kiện biến động (Bước 4).
  - fakeApi: Đã có `fakeApi.audit.getLogs()` gọi endpoint `/api/v1/admin/nhat-ky`.
  - Trạng thái: **[Hoàn thành UI]** / **[Tích hợp một phần qua fakeApi]**.
- **Checklist công việc Subagent:**
  - *Backend:* Điều chỉnh phân quyền tại `NhatKyController.cs` để cho phép `StaffOrAdmin` truy cập, trong đó nhân viên chỉ xem được các log nghiệp vụ trong phạm vi vận hành.
  - *Frontend:* Đảm bảo phân trang động hoạt động mượt mà khi kết nối backend thật qua `fakeApi.audit.getLogs`.

---

## III. MA TRẬN ĐỐI CHIẾU & ĐÁNH GIÁ TRẠNG THÁI (UC80 - UC102)

| Mã UC (Kế hoạch) | Mã UC (Đặc tả) | Tên Use Case | Backend Hiện Trạng | Frontend Hiện Trạng | Đánh giá Trạng thái |
|:---:|:---:|:---|:---|:---|:---:|
| **UC80** | UC16 / BaoTri | Lập phiếu bảo dưỡng, vệ sinh & sửa chữa | `BaoTriController.cs` (`POST /api/v1/bao-tri`) | `StaffView.tsx` (Modal lập phiếu, mock data) | **Chưa hoàn thiện kết nối API** |
| **UC81** | UC16 / BaoTri | Phân công & Cập nhật tiến độ bảo trì | `BaoTriController.cs` (`POST phan-cong`, `PUT tien-do`) | `StaffView.tsx` (Form tiến độ, mock data) | **Chưa hoàn thiện kết nối API** |
| **UC82** | UC16 / BaoTri | Nghiệm thu hoàn thành bảo trì & Sẵn sàng kho | `BaoTriController.cs` (`POST hoan-thanh`, `ket-thuc`) | `AdminView.tsx`, `StaffView.tsx` (mock data) | **Chưa hoàn thiện kết nối API** |
| **UC83** | UC6.15 / VongDoi | Giáng cấp & điều chuyển sản phẩm thiết bị cũ | `VongDoiThietBiController.cs` (5 endpoints) | `EquipmentLifecycleModal.tsx` (mock data) | **Chưa hoàn thiện kết nối API** |
| **UC84** | UC16 / VongDoi | Ngừng sử dụng & Thanh lý thiết bị hư hại | `VongDoiThietBiController.cs` (`de-nghi-ngung-su-dung`) | `EquipmentLifecycleModal.tsx` (mock data) | **Chưa hoàn thiện kết nối API** |
| **UC85** | UC8.1, 8.1.1 | Cấu hình chính sách thuê, hủy & phiên bản | `Admin/ChinhSachController.cs` (4 endpoints) | `PoliciesTab` (Diff modal, snapshot, mock data) | **Chưa hoàn thiện kết nối API** |
| **UC86** | UC8.2, 8.2.1 | Tạo chiến dịch khuyến mãi & Kiểm tra điều kiện | `Admin/KhuyenMaiController.cs` (`POST khuyen-mai`) | `AdminView.tsx` (Tab promotions, modal tạo mới) | **Chưa hoàn thiện kết nối API** |
| **UC87** | UC8.3, 8.3.1 | Cập nhật khuyến mãi & Khóa ưu đãi đã chốt | `Admin/KhuyenMaiController.cs` (`PUT khuyen-mai/{id}`) | `AdminView.tsx` (Tab promotions, form sửa) | **Chưa hoàn thiện kết nối API** |
| **UC88** | UC8.4 | Tra cứu khuyến mãi & Thống kê lượt sử dụng | `Admin/KhuyenMaiController.cs` (`GET`, `GET {id}/su-dung`) | `PromotionDetailModal.tsx` (mock data) | **Chưa hoàn thiện kết nối API** |
| **UC89** | UC8.5 | Ngừng kích hoạt / Tạm ẩn khuyến mãi | `Admin/KhuyenMaiController.cs` (`tam-an`, `hien-thi`) | `AdminView.tsx` (Nút toggle tạm ẩn) | **Chưa hoàn thiện kết nối API** |
| **UC90** | UC9.1, 9.1.1 | Gửi đánh giá sản phẩm sau khi hoàn tất thuê | `DanhGiaController.cs` (`POST /api/v1/danh-gia`) | `CustomerPortal.tsx` (Tab đơn hàng & đánh giá) | **Chưa hoàn thiện kết nối API** |
| **UC91** | UC9.1.2 | Đính kèm hình ảnh trải nghiệm vào đánh giá | Hỗ trợ mảng ảnh trong `TaoDanhGiaRequest` | `CustomerPortal.tsx` (Input ảnh & thumbnail) | **Chưa hoàn thiện kết nối API** |
| **UC92** | UC9.1 | Xem đánh giá công khai & Biểu đồ sao | `DanhGiaController.cs` (`san-pham/{id}`, `tong-hop`) | `ProductsView.tsx` (Chi tiết SP, sao, reviews) | **Chưa hoàn thiện kết nối API** |
| **UC93** | UC9.2, 9.2.1 | Kiểm duyệt đánh giá vi phạm & Lý do ẩn | `Admin/DanhGiaController.cs` (`GET`, `an`, `khoi-phuc`) | `ReviewsTab` (Modal lý do vi phạm, bỏ ẩn) | **Chưa hoàn thiện kết nối API** |
| **UC94** | Nghiệp vụ mở rộng | Phản hồi đánh giá khách hàng từ cửa hàng | **Thiếu endpoint** `POST .../phan-hoi` | `ReviewsTab` (Nút và form phản hồi hoàn chỉnh) | **Chưa hoàn thiện / Thiếu API** |
| **UC95** | UC9.3, 9.3.1 | Xem thông báo nghiệp vụ & Deep-link | `ThongBaoController.cs` (4 endpoints) | Navbar Bell icon, dropdown & CustomerPortal | **Chưa hoàn thiện kết nối API** |
| **UC96** | UC9.4, 9.4.1 | Quản trị & Phát hành thông báo hệ thống | `Admin/ThongBaoController.cs` (`POST thong-bao`) | `NotificationsTab` (Form, preview, fakeApi nối) | **Hoàn thành** |
| **UC97** | Nghiệp vụ mở rộng | Quản lý hàng chờ thông báo lỗi & Gửi lại | `Admin/ThongBaoController.cs` (`gui-loi`, `thu-lai`) | **Thiếu UI** hàng chờ gửi lỗi trong Admin | **Chưa hoàn thiện / Thiếu UI** |
| **UC98** | UC10.1, 10.1.1 | Xem báo cáo vận hành kho & Hiệu suất | `BaoCaoVanHanhController.cs` (Sai `AdminOnly`) | `AdminView.tsx` (6 chỉ tiêu, drill-down, mock) | **Chưa hoàn thiện / Sai quyền** |
| **UC99** | UC10.2, 10.2.1 | Báo cáo doanh thu thuần (không cộng cọc) | `Admin/BaoCaoTaiChinhController.cs` (Chuẩn kế toán) | `AdminView.tsx` (Doanh thu thuần, tỷ lệ hủy) | **Chưa hoàn thiện kết nối API** |
| **UC100** | UC10.2.1 | Báo cáo phân tích dòng tiền thực tế (Cashflow) | `Admin/BaoCaoTaiChinhController.cs` (`thu-hoan`) | `AdminView.tsx` (Inflow, Outflow, Net, mock) | **Chưa hoàn thiện kết nối API** |
| **UC101** | UC10.3 | Báo cáo nhập hàng & Giá trị tài sản kho | `Admin/BaoCaoKhoController.cs` (4 endpoints) | `AdminView.tsx` (Sub-tab inventory, mock data) | **Chưa hoàn thiện kết nối API** |
| **UC102** | UC10.4, 10.4.2 | Tra cứu Audit Log & Mở chứng từ liên quan | `Admin/NhatKyController.cs` (Sai `AdminOnly`) | `AuditLogTab` (Timeline, mở chứng từ, fakeApi) | **Chưa hoàn thiện / Sai quyền** |

---

## IV. DANH MỤC CÁC TỆP MOCK DATA CẦN THAY THẾ Ở FRONTEND

Để đưa hệ thống lên môi trường production chạy dữ liệu thật 100%, các tệp mock sau tại `frontend/src/data/` cần được chuyển đổi sang gọi API Backend:

1. **`src/data/initialPromotions.ts`** (`INITIAL_PROMOTIONS`):
   - Thay thế bằng API: `GET /api/v1/admin/khuyen-mai` (Admin) và `GET /api/gio-thue/ma-giam-gia` (Khách).
2. **`src/data/initialPolicies.ts`** (`INITIAL_POLICIES`, `INITIAL_POLICY_VERSIONS`):
   - Thay thế bằng API: `GET /api/v1/admin/chinh-sach` và `GET /api/v1/admin/chinh-sach/{id}`.
3. **`src/data/initialReviews.ts`** (`INITIAL_REVIEWS`):
   - Thay thế bằng API: `GET /api/v1/danh-gia/san-pham/{id}` và `GET /api/v1/admin/danh-gia`.
4. **`src/data/initialNotifications.ts`** (`INITIAL_NOTIFICATIONS`):
   - Thay thế bằng API: `GET /api/v1/thong-bao` và `GET /api/v1/thong-bao/chua-doc/dem`.
5. **`src/data/initialMaintenance.ts`** (`INITIAL_MAINTENANCE_RECEIPTS`):
   - Thay thế bằng API: `GET /api/v1/bao-tri`.
6. **`src/data/initialAuditLogs.ts`** (`INITIAL_AUDIT_LOGS`):
   - Thay thế bằng API: `GET /api/v1/admin/nhat-ky`.
7. **`src/data/initialFinancialAdjustments.ts`** (`INITIAL_FINANCIAL_ADJUSTMENTS`):
   - Thay thế bằng API: `GET /api/v1/admin/bao-cao/tai-chinh/dieu-chinh`.

---

## V. KẾ HOẠCH TRIỂN KHAI & PHÂN CHIA CÔNG VIỆC CHO CÁC SUBAGENTS

Dựa trên kết quả khảo sát, khối lượng công việc của Phân hệ 8 đến 10 được chia thành 4 gói công việc độc lập (Work Packages - WP):

### 📦 Gói 1: Subagent M8-A (Bảo dưỡng, Sửa chữa & Vòng đời thiết bị - UC80 đến UC84)
- **Mục tiêu:** Hoàn thiện tích hợp quy trình sửa chữa thiết bị hỏng và quản lý vòng đời giữa Backend và Frontend.
- **Phạm vi Backend:**
  - Viết Unit / Integration test cho `BaoTriController.cs` và `VongDoiThietBiController.cs`.
- **Phạm vi Frontend:**
  - Xây dựng `src/services/maintenanceService.ts` và `src/services/lifecycleService.ts`.
  - Thay thế mock data trong `StaffView.tsx` (Tab bảo trì) và `EquipmentLifecycleModal.tsx` bằng API thật.

### 📦 Gói 2: Subagent M8-B (Chính sách cho thuê & Khuyến mãi - UC85 đến UC89)
- **Mục tiêu:** Kết nối toàn diện hệ thống cấu hình chính sách theo phiên bản và quản trị chiến dịch khuyến mãi.
- **Phạm vi Backend:**
  - Viết Integration test kiểm tra ràng buộc `DIEU_KHOAN_MA_DA_CAM_KET` (không cho sửa mã đã chốt trên đơn cũ).
- **Phạm vi Frontend:**
  - Xây dựng `src/services/policyService.ts` và `src/services/promotionService.ts`.
  - Thay thế mock data trong `PoliciesTab` (`AdminExtendedTabs.tsx`) và Tab `promotions` (`AdminView.tsx`).

### 📦 Gói 3: Subagent M9 (Đánh giá & Hệ thống Thông báo - UC90 đến UC97)
- **Mục tiêu:** Hoàn thiện tính năng khách gửi đánh giá, admin kiểm duyệt, phát thông báo và xử lý hàng chờ lỗi.
- **Phạm vi Backend:**
  - Bổ sung endpoint `POST /api/v1/admin/danh-gia/{id}/phan-hoi` để cửa hàng phản hồi đánh giá.
- **Phạm vi Frontend:**
  - Xây dựng `src/services/reviewService.ts` và hoàn thiện `src/services/notificationService.ts`.
  - Thay thế mock data trong `CustomerPortal.tsx` (đánh giá sau thuê), `ProductsView.tsx` (sao sản phẩm), `ReviewsTab` (kiểm duyệt).
  - Dựng thêm UI danh sách hàng chờ gửi thông báo lỗi và nút "Thử lại" trong `NotificationsTab` (UC97).

### 📦 Gói 4: Subagent M10 (Báo cáo thống kê, Tài chính & Nhật ký kiểm toán - UC98 đến UC102)
- **Mục tiêu:** Sửa lỗi phân quyền Backend và kết nối giao diện báo cáo chuyên sâu với dữ liệu thật.
- **Phạm vi Backend:**
  - Sửa policy phân quyền tại `BaoCaoVanHanhController.cs` và `NhatKyController.cs` từ `AdminOnly` thành `StaffOrAdmin`, có kiểm soát phạm vi dữ liệu theo vai trò.
- **Phạm vi Frontend:**
  - Xây dựng `src/services/reportService.ts` và `src/services/auditService.ts`.
  - Kết nối 4 sub-tab trong Tab `reports` của `AdminView.tsx` (Vận hành, Doanh thu thuần, Dòng tiền, Nhập kho) với các endpoint `/api/v1/admin/bao-cao/*`.
  - Nối `AuditLogTab` với endpoint `/api/v1/admin/nhat-ky`, đảm bảo tính năng mở chứng từ liên quan (UC10.4.2) hoạt động chính xác với URL thực tế.
