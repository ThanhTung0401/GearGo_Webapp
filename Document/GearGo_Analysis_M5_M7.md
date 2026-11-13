# BÁO CÁO KHẢO SÁT VÀ ĐỐI CHIẾU MÃ NGUỒN: PHÂN HỆ 5, 6, 7 (GEARGO)
**Người thực hiện:** Teamwork Explorer (Phân hệ 5 - 7)  
**Tài liệu đối chiếu:** `Document/GearGo_Dac_Ta_10_Phan_He_Use_Cases.md` (102 Use Cases)  
**Thời gian hoàn thành:** 2026-11-13  

---

## I. TỔNG QUAN VÀ ĐÍNH CHÍNH PHẠM VI NGHIỆP VỤ & CÔNG NGHỆ

### 1. Đính chính phạm vi nghiệp vụ thực tế
- **Hệ thống GearGo thực tế:** Là hệ thống cho thuê dụng cụ cắm trại và du lịch (lều, bếp ga, túi ngủ, bàn ghế dã ngoại, đèn pin, balô,...), quy mô 1 cửa hàng - 1 kho. **Không phải** hệ thống cho thuê xe ô tô hay giám sát hành trình IoT xe cộ.
- **Phân hệ 5 đến Phân hệ 7 chuẩn** (theo đặc tả `GearGo_Dac_Ta_10_Phan_He_Use_Cases.md`):
  - **Phân hệ 5: QUẢN LÝ THANH TOÁN VÀ TIỀN CỌC** (7 Use Cases: UC5.1 – UC5.7)
  - **Phân hệ 6: QUẢN LÝ SẢN PHẨM VÀ THIẾT BỊ** (20 Use Cases: 15 UC chính UC6.1 – UC6.15 + 5 UC phụ lục hỗ trợ UC6.1.1, UC6.5.1, UC6.10.1, UC6.11.1, UC6.12.1)
  - **Phân hệ 7: QUẢN LÝ NHÀ CUNG CẤP VÀ NHẬP HÀNG** (14 Use Cases: 10 UC chính UC7.1 – UC7.10 + 4 UC phụ lục hỗ trợ UC7.5.1, UC7.7.1, UC7.7.2, UC7.10.1)
  - **Tổng cộng phạm vi khảo sát:** **41 Use Cases** (chiếm 41/102 Use Cases của toàn dự án). Khi đánh số thứ tự tuần tự trong toàn bộ 10 phân hệ: M1-M4 có 36 UCs; M5-M7 có 41 UCs [tương ứng từ số 37 đến 77]; M8-M10 có 25 UCs [từ số 78 đến 102].

### 2. Đính chính nền tảng kiến trúc công nghệ
- **Backend:** Xây dựng bằng **C# / ASP.NET Core 8**, Entity Framework Core (`backend/GearGo.csproj`, `backend/Program.cs`), **không phải** Spring Boot / Java. Kiến trúc hướng dịch vụ nhiều lớp (Controllers, Services/Interfaces, Services/Implements, Models/Entities, Models/DTOs, Data/GearGoDbContext).
- **Frontend:** Xây dựng bằng **React 18 / TypeScript / Vite / TailwindCSS** kết hợp hệ thống Impeccable UI. Quản lý trạng thái thông qua `frontend/src/context/AppContext.tsx` và `frontend/src/store.ts`.

### 3. Tóm tắt kết quả đánh giá hiện trạng
| Phân hệ | Tổng số UC | Hoàn thành | Chưa hoàn thiện (Backend có, Frontend Mock) | Thiếu API / Sai lệch |
|:---|:---:|:---:|:---:|:---:|
| **Phân hệ 5: Thanh toán & Tiền cọc** | 7 | 0 | 7 | 0 |
| **Phân hệ 6: Sản phẩm & Thiết bị** | 20 | 0 | 20 | 0 |
| **Phân hệ 7: Nhà cung cấp & Nhập hàng** | 14 | 0 | 14 | 0 |
| **TỔNG CỘNG M5 - M7** | **41** | **0** | **41** | **0** |

> **Nhận định then chốt (Core Finding):**
> 1. **Phía Backend:** 100% các API và Service cốt lõi của 3 phân hệ đã được lập trình rất bài bản, kiểm soát phân quyền chặt chẽ (`AdminOnly`, `StaffOrAdmin`, `CustomerOnly`), có xử lý idempotency, chống giao dịch trùng, kiểm tra điều kiện tiên quyết và lưu vết lịch sử.
> 2. **Phía Frontend:** 100% giao diện (UI/UX) của 3 phân hệ đã được thiết kế tinh chỉnh rất trực quan, giàu tính năng Impeccable (mô phỏng đúng luồng nghiệp vụ 7 bước đối soát, kiểm nhận hàng, sổ vòng đời, kiểm kê, bảo trì). **TUY NHIÊN**, Frontend hiện đang hoạt động hoàn toàn bằng **Mock Data nội bộ** (`initial*.ts`, `localStorage`, hàm `app.*` trong `App.tsx`), chưa được nối dây (wire) vào các API endpoints của Backend.

---

## II. CHI TIẾT KHẢO SÁT & ĐỐI CHIẾU: PHÂN HỆ 5 – QUẢN LÝ THANH TOÁN VÀ TIỀN CỌC (UC5.1 – UC5.7)

### UC5.1 – Thanh toán và xác nhận đơn
- **Đặc tả nghiệp vụ:** Khách hàng thanh toán tiền thuê trả trước + tiền cọc trực tuyến. GearGo xác minh nguồn kết quả, mã giao dịch, số tiền và trạng thái đơn. Nếu hợp lệ, ghi nhận khoản thu 1 lần, phân bổ thuê/cọc và chuyển trạng thái đơn sang "Đã xác nhận". Ghi nhận các trường hợp bất thường (tiền về sau hủy/hết hạn, sai số tiền) vào danh sách đối chiếu.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/ThanhToanController.cs`
    - `POST /api/v1/thanh-toan/xac-nhan` (Xác nhận thanh toán ban đầu)
    - `GET /api/v1/thanh-toan/{id}/trang-thai` (Tra cứu trạng thái giao dịch thu)
    - `GET /api/v1/thanh-toan/can-doi-chieu` (Danh sách giao dịch bất thường cần đối chiếu)
    - `POST /api/v1/thanh-toan/{id}/doi-chieu` (Đối chiếu giao dịch ngoại lệ)
  - Service: `backend/Services/Interfaces/IThanhToanService.cs` & `backend/Services/Implements/ThanhToanService.cs`
  - Entity/DTO: `GiaoDichThanhToan.cs`, `XacNhanThanhToanRequest.cs`, `DoiChieuGiaoDichRequest.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (Component `OrderConfirmedView`, khung thanh toán VietQR)
  - Hàm thao tác: `app.payOrder(orderId, succeed)` trong `frontend/src/App.tsx`
  - Mock Data sử dụng: `INITIAL_ORDERS` trong `src/data/initialOrders.ts`, lưu trữ `localStorage`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Gap Analysis & Rủi ro kỹ thuật:**
  - Frontend gọi trực tiếp hàm giả lập `app.payOrder` đổi status đơn trong state bộ nhớ, không gửi `POST /api/v1/thanh-toan/xac-nhan` để ghi nhận `GiaoDichThanhToan` vào database.
  - Cần tích hợp webhook hoặc polling API kiểm tra trạng thái thanh toán thật.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung mock webhook gateway / Seeding mẫu VietQR sinh động.
  - [ ] **Frontend:** Tạo service `thanhToanService.ts` trong `frontend/src/services/`; thay thế `app.payOrder` bằng lệnh gọi `apiClient.post('/api/v1/thanh-toan/xac-nhan')`; hiển thị biên lai dựa trên dữ liệu giao dịch trả về từ Backend.

---

### UC5.2 – Lập phụ phí
- **Đặc tả nghiệp vụ:** Khi nhận trả đồ (UC4.3), nhân viên kiểm tra thiết bị hư hỏng, trễ hạn, vệ sinh, mất mát. Hệ thống gợi ý mức phí dựa trên chính sách; nhân viên bổ sung ảnh, lý do. Nếu trong hạn mức thẩm quyền thì duyệt, vượt hạn mức thì chuyển sang trạng thái "Chờ duyệt" (UC5.3).
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/PhuPhiController.cs`
    - `GET /api/v1/phu-phi/goi-y?maChiTietBanGiao=...` (Gợi ý phí tự động)
    - `POST /api/v1/phu-phi` (Lập phụ phí mới)
    - `PUT /api/v1/phu-phi/{id}` (Cập nhật phụ phí khi đang chờ duyệt)
    - `GET /api/v1/phu-phi/theo-don/{donId}` (Lấy danh sách phụ phí của đơn)
  - Service: `backend/Services/Interfaces/IPhuPhiService.cs` & `backend/Services/Implements/PhuPhiService.cs`
  - Entity/DTO: `PhuPhi.cs`, `LapPhuPhiRequest.cs`, `CapNhatPhuPhiRequest.cs`, `PhuPhiResponse.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]** (chặn trùng tổn thất, phân quyền `StaffOrAdmin`).
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (Component `ReturnTab`, phần "Phụ phí bồi thường & trễ hạn")
  - Hàm thao tác: `app.createReturnReceipt` sinh tự động phụ phí vào mảng `order.surcharges`.
  - Mock Data sử dụng: Mảng `surcharges` bên trong từng đơn ở `initialOrders.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Gap Analysis & Rủi ro kỹ thuật:**
  - Frontend tự tính phụ phí và nhét vào order object trên client. Không gọi `GET /api/v1/phu-phi/goi-y` hay `POST /api/v1/phu-phi`.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra phân quyền tạo phụ phí theo vai trò `StaffOrAdmin`.
  - [ ] **Frontend:** Kết nối `ReturnTab` gọi `apiClient.get('/api/v1/phu-phi/goi-y')` khi phát hiện thiết bị hỏng/trễ; gọi `apiClient.post('/api/v1/phu-phi')` khi nhân viên xác nhận lập phiếu.

---

### UC5.3 – Duyệt và xử lý tranh chấp phụ phí
- **Đặc tả nghiệp vụ:** Quản trị viên duyệt các khoản phụ phí vượt quyền hoặc khoản bồi thường mất mát lớn. Khách hàng có quyền mở tranh chấp/khiếu nại phụ phí từ cổng khách hàng. Quản trị viên đối chiếu chứng cứ trước/sau thuê để kết luận chấp nhận, giảm mức hoặc bác bỏ.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/PhuPhiController.cs`
    - `POST /api/v1/phu-phi/{id}/duyet` (Duyệt phụ phí - Policy `StaffOrAdmin`)
    - `POST /api/v1/phu-phi/{id}/tu-choi` (Từ chối phụ phí)
    - `POST /api/v1/phu-phi/{id}/tranh-chap` (Khách khiếu nại - Policy `CustomerOnly`)
    - `POST /api/v1/phu-phi/{id}/giai-quyet-tranh-chap` (Admin giải quyết tranh chấp - Policy `AdminOnly`)
  - Service: `backend/Services/Interfaces/IPhuPhiService.cs` & `backend/Services/Implements/PhuPhiService.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component:
    - Khách hàng: `frontend/src/views/CustomerPortal.tsx` (Modal khiếu nại phụ phí: `disputeSurchargeTarget`)
    - Quản trị/Nhân viên: `frontend/src/views/AdminView.tsx` (phần phụ phí chờ duyệt & tranh chấp), `StaffView.tsx` (nút Duyệt phụ phí), `ReconciliationSheet.tsx`.
  - Hàm thao tác: `app.approveSurcharge`, `app.rejectSurcharge`, `app.disputeSurcharge`, `app.resolveDisputedSurcharge`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Gap Analysis & Rủi ro kỹ thuật:**
  - Logic UI Impeccable đã vẽ đầy đủ các trạng thái và modal, nhưng đều sửa trực tiếp trên state mảng `order.surcharges`. Cần chuyển đổi sang gọi API RESTful tương ứng.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo audit log ghi lại lý do giải quyết tranh chấp của Admin.
  - [ ] **Frontend:** Đấu nối các nút Duyệt/Từ chối/Khiếu nại/Kết luận tranh chấp với 4 endpoint của `PhuPhiController`.

---

### UC5.4 – Đối soát cọc và hoàn tất đơn
- **Đặc tả nghiệp vụ:** Xác định và giải quyết phần cọc phải hoàn hoặc tiền thiếu trước khi kết thúc đơn. Kiểm tra 100% thiết bị đã nhận trả/kết luận mất; phụ phí đã duyệt xong. Tính chênh lệch: `Cọc thực thu - Tổng phụ phí đã duyệt - Các khoản đã xử lý trước đó`. Nếu chênh lệch = 0: Chốt Hoàn tất (Dòng 5.1). Nếu chênh lệch > 0: Gọi UC5.6 Hoàn cọc (EP5.4-HOAN). Nếu chênh lệch < 0: Gọi UC5.5 Thu bổ sung (EP5.4-THU). Sau khi tiền đã xử lý xong, khóa đối soát và chuyển đơn sang "Hoàn tất".
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/DoiSoatController.cs`
    - `GET /api/v1/doi-soat/theo-don/{donId}/xem-truoc` (Xem trước bảng tính & kiểm tra điều kiện tiên quyết)
    - `POST /api/v1/doi-soat/theo-don/{donId}` (Lập phiếu đối soát ban đầu)
    - `POST /api/v1/doi-soat/{id}/xac-nhan` (Xác nhận bảng tính đối soát, khóa phụ phí)
    - `POST /api/v1/doi-soat/{id}/xu-ly-tien` (Phát lệnh xử lý hoàn tiền hoặc thu thêm)
    - `POST /api/v1/doi-soat/{id}/chot` (Chốt đối soát, chuyển trạng thái đơn sang HoanTat)
  - Service: `backend/Services/Interfaces/IDoiSoatService.cs` & `backend/Services/Implements/DoiSoatService.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]** (Logic khóa bi-directional rất chặt chẽ).
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/ReconciliationSheet.tsx` (Component chuyên biệt dài > 1200 dòng thể hiện hoàn hảo toàn bộ 7 bước nghiệp vụ, dòng sự kiện phụ 1.1, 5.1, 5.2).
  - Hàm thao tác: `app.confirmReconciliation`, `app.finalizeOrderWithoutPayment`, `app.settleOrder`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Gap Analysis & Rủi ro kỹ thuật:**
  - UI `ReconciliationSheet.tsx` cực kỳ xuất sắc nhưng chưa gọi các endpoint `/api/v1/doi-soat/*`.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra tích hợp giữa DoiSoatService và HoanTienService/ThanhToanService khi phát lệnh `xu-ly-tien`.
  - [ ] **Frontend:** Trong `ReconciliationSheet.tsx`, thay thế việc đọc dữ liệu từ local state bằng gọi `apiClient.get('/api/v1/doi-soat/theo-don/{donId}/xem-truoc')`; đấu nối các nút Xác nhận bảng tính, Thu tiền, Hoàn tiền, Chốt đối soát vào API.

---

### UC5.5 – Thu tiền bổ sung
- **Đặc tả nghiệp vụ:** Khi phụ phí lớn hơn tiền cọc, khách nộp thêm khoản tiền thiếu tại quầy bằng tiền mặt hoặc chuyển khoản/POS có mã đối chiếu. Ghi nhận khoản thu 1 lần vào đơn và đối soát, tính lại số dư nghĩa vụ.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/ThanhToanController.cs`
    - `POST /api/v1/thanh-toan/doi-soat/{doiSoatId}/thu-bo-sung`
    - `POST /api/v1/thanh-toan/callback/thu-bo-sung`
  - Service: `backend/Services/Interfaces/IThanhToanService.cs`
  - Entity/DTO: `TaoThuBoSungRequest.cs`, `YeuCauThuResponse.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/ReconciliationSheet.tsx` (Modal Thu tiền bổ sung tại quầy: `showCollectModal`, hỗ trợ tiền mặt/POS/QR).
  - Hàm thao tác: `app.settleOrder(orderId, true, { method, amount, note })`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Gap Analysis & Rủi ro kỹ thuật:**
  - Cần chuyển đổi modal thu tiền từ ghi nhận transaction vào mảng `order.transactions` trên client sang gọi `POST /api/v1/thanh-toan/doi-soat/{doiSoatId}/thu-bo-sung`.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra cập nhật số tiền đã thanh toán và cập nhật trạng thái phiếu đối soát.
  - [ ] **Frontend:** Kết nối nút "Xác nhận đã nhận tiền" trong modal thu tiền với API thu bổ sung.

---

### UC5.6 – Thực hiện hoàn tiền
- **Đặc tả nghiệp vụ:** Hoàn tiền cho khách (hoàn tiền cọc sau đối soát hoặc hoàn tiền thuê khi khách hủy đơn hợp lệ). Kiểm tra nguồn thu gốc, không vượt số thực thu, hỗ trợ chuyển khoản có chứng từ hoặc cổng thanh toán. Ghi nhận giao dịch hoàn 1 lần với mã tham chiếu.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/HoanTienController.cs`
    - `GET /api/v1/hoan-tien/theo-don/{donId}` (Lấy danh sách yêu cầu hoàn của đơn)
    - `POST /api/v1/hoan-tien/{id}/xu-ly` (API nhân viên vận hành xử lý lệnh hoàn)
    - `POST /api/v1/hoan-tien/{id}/doi-chieu` (Đối chiếu kết quả hoàn tiền)
    - `POST /api/v1/hoan-tien/ket-qua` (Callback từ Payment Gateway)
  - Service: `backend/Services/Interfaces/IHoanTienService.cs` & `backend/Services/Implements/HoanTienService.cs`
  - Entity/DTO: `HoanTien.cs`, `XuLyHoanRequest.cs`, `HoanTienResponse.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]** (Quản lý phân bổ nguồn gốc rất chặt).
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/ReconciliationSheet.tsx` (Modal Hoàn tiền cọc: `showRefundModal`, hỗ trợ nhập thông tin ngân hàng thụ hưởng).
  - Hàm thao tác: `app.settleOrder(orderId, true, { method: "bank", amount, note })`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Gap Analysis & Rủi ro kỹ thuật:**
  - Frontend mô phỏng lệnh hoàn tiền bằng cách tạo transaction "Hoàn cọc" trong bộ nhớ. Cần gọi API backend để sinh bản ghi `HoanTien` và liên kết với chi tiết thanh toán ban đầu.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Hoàn thiện mock adapter cho banking/gateway refund nếu chưa có gateway thật.
  - [ ] **Frontend:** Đấu nối form xác nhận hoàn tiền cọc vào `POST /api/v1/hoan-tien/{id}/xu-ly`.

---

### UC5.7 – Điều chỉnh tài chính sau chốt
- **Đặc tả nghiệp vụ:** Sửa sai sót tài chính phát hiện sau khi đơn và đối soát đã chốt hoàn tất. Quản trị viên lập hồ sơ điều chỉnh liên kết chứng từ gốc (không ghi đè/xóa chứng từ gốc), tính số chênh lệch phải thu bù hoặc hoàn trả có lưu vết truy cứu.
- **Hiện trạng Backend:**
  - File Controller:
    - `backend/Controllers/DoiSoatController.cs` (`POST /api/v1/doi-soat/{id}/dieu-chinh`)
    - `backend/Controllers/PhuPhiController.cs` (`POST /api/v1/phu-phi/{id}/dieu-chinh`)
  - Service: `IDoiSoatService.LapDoiSoatDieuChinhAsync`, `IPhuPhiService.LapDieuChinhPhiAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component:
    - `frontend/src/views/ReconciliationSheet.tsx` (Modal Điều chỉnh tài chính sau chốt: `showAdjustmentModal`)
    - `frontend/src/views/AdminExtendedTabs.tsx` (Tab `AdjustmentsTab` - Quản lý hồ sơ điều chỉnh tài chính).
  - Mock Data sử dụng: `INITIAL_FINANCIAL_ADJUSTMENTS` trong `src/data/initialFinancialAdjustments.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Gap Analysis & Rủi ro kỹ thuật:**
  - Tab `AdjustmentsTab` và modal trong `ReconciliationSheet` đều thao tác với mảng `financialAdjustments` trong `AppContext`. Chưa gửi dữ liệu về Backend.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo báo cáo tài chính đọc đúng số liệu sau điều chỉnh của `DoiSoatDieuChinh`.
  - [ ] **Frontend:** Kết nối form lập điều chỉnh tài chính và tab danh sách hồ sơ điều chỉnh với `apiClient.post('/api/v1/doi-soat/{id}/dieu-chinh')`.

---

## III. CHI TIẾT KHẢO SÁT & ĐỐI CHIẾU: PHÂN HỆ 6 – QUẢN LÝ SẢN PHẨM VÀ THIẾT BỊ (UC6.1 – UC6.15 & PHỤ LỤC)

### UC6.1 – Thêm danh mục sản phẩm (kèm UC6.1.1 Kiểm tra cấu trúc danh mục)
- **Đặc tả nghiệp vụ:** Quản trị viên tạo danh mục sản phẩm mới. Hệ thống kiểm tra hợp lệ, bắt buộc danh mục cha phải tồn tại nếu có, không tạo vòng lặp cha-con (UC6.1.1).
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/Admin/DanhMucController.cs` (`POST /api/admin/danh-muc`)
  - Service: `IAdminDanhMucService.TaoMoiAsync` & `AdminDanhMucService.cs`
  - Entity/DTO: `DanhMuc.cs`, `TaoDanhMucRequest.cs`, `DanhMucDto.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (Component `CategoriesTab`, Modal thêm danh mục)
  - Hàm thao tác: `app.saveCategory` trong `App.tsx`
  - Mock Data sử dụng: `INITIAL_CATEGORIES` trong `src/data/initialCategories.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra validate logic chống vòng lặp phân cấp đa tầng.
  - [ ] **Frontend:** Kết nối form tạo danh mục với `apiClient.post('/api/admin/danh-muc')`.

---

### UC6.2 – Cập nhật danh mục sản phẩm
- **Đặc tả nghiệp vụ:** Quản trị viên sửa tên, mô tả, danh mục cha. Bảo đảm tính toàn vẹn, không cho danh mục làm cha của chính nó.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/Admin/DanhMucController.cs` (`PUT /api/admin/danh-muc/{id}`)
  - Service: `IAdminDanhMucService.CapNhatAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (Component `CategoriesTab`, Modal chỉnh sửa)
  - Hàm thao tác: `app.saveCategory`
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Giữ nguyên chứng từ lịch sử khi đổi tên danh mục.
  - [ ] **Frontend:** Đấu nối form sửa danh mục với `apiClient.put('/api/admin/danh-muc/{id}')`.

---

### UC6.3 – Tra cứu danh mục sản phẩm
- **Đặc tả nghiệp vụ:** Khách hàng xem cây danh mục đang hiển thị; Quản trị viên tra cứu toàn bộ danh mục (bao gồm cả trạng thái ẩn).
- **Hiện trạng Backend:**
  - File Controller:
    - `backend/Controllers/DanhMucController.cs` (`GET /api/danh-muc`, `GET /api/danh-muc/{id}`) - Công khai
    - `backend/Controllers/Admin/DanhMucController.cs` (`GET /api/admin/danh-muc`) - Quản trị
  - Service: `IDanhMucService` & `IAdminDanhMucService`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `LandingView.tsx`, `ProductsView.tsx`, `AdminView.tsx` (`CategoriesTab`)
  - Mock Data sử dụng: `app.categories` (từ `initialCategories.ts`).
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo caching cây danh mục công khai để tối ưu tải.
  - [ ] **Frontend:** Bật cờ `isRealApiEnabled` và đồng bộ tải danh mục từ `apiClient.get('/api/danh-muc')`.

---

### UC6.4 – Thay đổi trạng thái danh mục
- **Đặc tả nghiệp vụ:** Quản trị viên chuyển trạng thái danh mục (Hiển thị / Tạm ẩn). Ẩn danh mục bảo đảm quản lý được các sản phẩm liên quan.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/Admin/DanhMucController.cs` (`PATCH /api/admin/danh-muc/{id}/trang-thai`)
  - Service: `IAdminDanhMucService.DoiTrangThaiAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`CategoriesTab`, switch toggle trạng thái)
  - Hàm thao tác: `app.setCategoryStatus`
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra cảnh báo nếu ẩn danh mục đang có sản phẩm kinh doanh.
  - [ ] **Frontend:** Kết nối switch toggle với `apiClient.patch('/api/admin/danh-muc/{id}/trang-thai')`.

---

### UC6.5 – Thêm sản phẩm (kèm UC6.5.1 Kiểm tra giá thuê và cọc)
- **Đặc tả nghiệp vụ:** Quản trị viên tạo sản phẩm mới (mã, tên, danh mục, giá thuê/ngày, tiền cọc, thông số, hình ảnh). Kiểm tra hợp lệ giá thuê > 0, cọc >= 0 (UC6.5.1).
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/Admin/SanPhamController.cs` (`POST /api/admin/san-pham`, `POST /api/admin/san-pham/{id}/hinh-anh`)
  - Service: `IAdminSanPhamService.TaoMoiAsync`, `ThemHinhAnhAsync`
  - Entity/DTO: `SanPham.cs`, `HinhAnhSanPham.cs`, `TaoSanPhamRequest.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`ProductsTab`, modal thêm sản phẩm)
  - Hàm thao tác: `app.saveProduct`
  - Mock Data sử dụng: `INITIAL_PRODUCTS` trong `src/data/initialProducts.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Hỗ trợ upload ảnh Multipart Form Data lưu trữ local/cloud.
  - [ ] **Frontend:** Kết nối form tạo sản phẩm với `apiClient.post('/api/admin/san-pham')`.

---

### UC6.6 – Cập nhật sản phẩm
- **Đặc tả nghiệp vụ:** Chỉnh sửa thông tin, giá thuê, tiền cọc, hình ảnh. Giá mới không làm thay đổi giá đã chốt của đơn thuê cũ.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/Admin/SanPhamController.cs` (`PUT /api/admin/san-pham/{id}`)
  - Service: `IAdminSanPhamService.CapNhatAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`ProductsTab`, modal sửa sản phẩm)
  - Hàm thao tác: `app.saveProduct`
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bảo toàn lịch sử snapshot giá của đơn thuê cũ.
  - [ ] **Frontend:** Kết nối form sửa sản phẩm với `apiClient.put('/api/admin/san-pham/{id}')`.

---

### UC6.7 – Tra cứu sản phẩm
- **Đặc tả nghiệp vụ:** Khách hàng tìm kiếm, lọc theo danh mục, mức giá; Quản trị viên tra cứu toàn bộ sản phẩm kèm trạng thái kinh doanh.
- **Hiện trạng Backend:**
  - File Controller:
    - `backend/Controllers/SanPhamController.cs` (`GET /api/san-pham`, `GET /api/san-pham/{id}`)
    - `backend/Controllers/Admin/SanPhamController.cs` (`GET /api/admin/san-pham`)
  - Service: `ISanPhamService` & `IAdminSanPhamService`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/ProductsView.tsx`, `LandingView.tsx`, `AdminView.tsx` (`ProductsTab`)
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Thêm indexing full-text tìm kiếm tên và nhãn hiệu sản phẩm.
  - [ ] **Frontend:** Đồng bộ `ProductsView` gọi API `GET /api/san-pham?maDanhMuc=...&tuKhoa=...`.

---

### UC6.8 – Thay đổi trạng thái kinh doanh sản phẩm
- **Đặc tả nghiệp vụ:** Chuyển trạng thái kinh doanh (DangKinhDoanh, TamNgung, NgungKinhDoanh). Ngừng kinh doanh không xóa thiết bị vật lý và các đơn thuê đang chạy.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/Admin/SanPhamController.cs` (`PATCH /api/admin/san-pham/{id}/trang-thai`)
  - Service: `IAdminSanPhamService.DoiTrangThaiAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`ProductsTab`, dropdown trạng thái kinh doanh)
  - Hàm thao tác: `app.saveProduct` đổi thuộc tính `status`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra logic không cho đặt thuê sản phẩm đã ngừng kinh doanh.
  - [ ] **Frontend:** Kết nối thao tác đổi trạng thái với `apiClient.patch('/api/admin/san-pham/{id}/trang-thai')`.

---

### UC6.9 – Tra cứu thiết bị và lịch sử sử dụng
- **Đặc tả nghiệp vụ:** Tra cứu vòng đời từng vật phẩm (mã Barcode/Serial, nguồn nhập, tình trạng hao mòn, số lần thuê, lịch sử giao nhận, bảo trì, điều chuyển). Phân biệt quyền xem chứng từ giữa nhân viên và quản trị viên.
- **Hiện trạng Backend:**
  - File Controller:
    - `backend/Controllers/ThietBiController.cs` (`GET /api/thiet-bi`, `GET /api/thiet-bi/{id}`, `GET /api/thiet-bi/{id}/lich`)
    - `backend/Controllers/VongDoiThietBiController.cs` (`GET /api/vong-doi-thiet-bi/{id}` - phân quyền xem giá trị chứng từ tài chính nếu là Admin)
  - Service: `IThietBiService`, `IVongDoiThietBiService`
  - Entity/DTO: `ThietBi.cs`, `LichSuThietBi.cs`, `HoSoVongDoiResponse.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component:
    - `frontend/src/views/StaffView.tsx` (`inventory` subtab, modal "Sổ đời thiết bị": `EquipmentLifecycleModal`)
    - `frontend/src/views/AdminView.tsx` (`equipment` tab, `inventory` tab)
  - Mock Data sử dụng: `INITIAL_EQUIPMENT` trong `src/data/initialEquipment.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung timeline events chi tiết cho các lần nhận trả.
  - [ ] **Frontend:** Kết nối `EquipmentLifecycleModal` gọi `apiClient.get('/api/vong-doi-thiet-bi/{id}')`.

---

### UC6.10 – Kiểm kê và đề nghị điều chỉnh kho (kèm UC6.10.1 Đối chiếu kiểm kê thực tế)
- **Đặc tả nghiệp vụ:** Đối chiếu từng thiết bị thực tế với hồ sơ sổ sách tại kho, phân biệt thiết bị đang cho thuê hợp lệ. Nếu phát hiện sai lệch (mất mát, thừa, hỏng), lập đề nghị điều chỉnh kho ở trạng thái "Chờ duyệt" (UC6.10.1). Đề nghị chưa duyệt không tác động kho.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/DieuChinhKhoController.cs`
    - `POST /api/dieu-chinh-kho` (Lập phiếu điều chỉnh kho mới)
    - `PUT /api/dieu-chinh-kho/{id}` (Cập nhật phiếu nháp)
    - `POST /api/dieu-chinh-kho/{id}/gui-duyet` (Gửi duyệt phiếu điều chỉnh)
  - Service: `IDieuChinhKhoService.LapPhieuAsync`, `GuiDuyetAsync`
  - Entity/DTO: `PhieuDieuChinhKho.cs`, `ChiTietDieuChinhKho.cs`, `LapDieuChinhKhoRequest.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (Nút "📋 Kiểm kê kho (UC6.10)", modal `InventoryAuditModal`), `AdminView.tsx` (`stock-adjust` tab).
  - Mock Data sử dụng: `INITIAL_STOCK_ADJUSTMENTS` trong `src/data/initialStockAdjustments.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo tự động tách đồ đang thuê khỏi danh sách cảnh báo thiếu kho.
  - [ ] **Frontend:** Kết nối `InventoryAuditModal` gửi danh sách kiểm kê qua `apiClient.post('/api/dieu-chinh-kho')`.

---

### UC6.11 – Duyệt điều chỉnh kho (kèm UC6.11.1 Kiểm tra ảnh hưởng lịch thuê)
- **Đặc tả nghiệp vụ:** Quản trị viên duyệt đề nghị điều chỉnh kho. Trước khi duyệt giảm/loại bỏ thiết bị, hệ thống bắt buộc kiểm tra ảnh hưởng đến các đơn thuê đã xác nhận hoặc có lịch tương lai (UC6.11.1). Nếu có cam kết, chặn duyệt cho đến khi có thiết bị thay thế hợp lệ.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/DieuChinhKhoController.cs`
    - `POST /api/dieu-chinh-kho/{id}/duyet-ap-dung` (Admin duyệt & áp dụng nguyên tử)
    - `POST /api/dieu-chinh-kho/{id}/tu-choi` (Admin từ chối phiếu)
  - Service: `IDieuChinhKhoService.DuyetVaApDungAsync`, `TuChoiAsync` (Tích hợp kiểm tra cam kết đơn thuê).
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (Tab `stock-adjust`, modal xem chi tiết phiếu điều chỉnh và duyệt)
  - Hàm thao tác: Cập nhật trực tiếp vào state `app.stockAdjustments` và `app.equipment`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra atomic transaction khi áp dụng thay đổi trạng thái thiết bị hàng loạt.
  - [ ] **Frontend:** Đấu nối nút "Phê duyệt & Áp dụng" với `apiClient.post('/api/dieu-chinh-kho/{id}/duyet-ap-dung')`.

---

### UC6.12 – Lập và theo dõi bảo trì (kèm UC6.12.1 Loại thiết bị bảo trì khỏi khả dụng)
- **Đặc tả nghiệp vụ:** Đưa thiết bị hư hỏng/cần vệ sinh ra khỏi kho cho thuê, lập phiếu bảo trì, ghi nhận chi phí dự tính. Hệ thống tự động loại thiết bị khỏi danh sách sẵn sàng (UC6.12.1) và cảnh báo các đơn tương lai bị ảnh hưởng.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/BaoTriController.cs`
    - `POST /api/bao-tri` (Lập phiếu bảo trì mới)
    - `POST /api/bao-tri/{id}/phan-cong` (Phân công người xử lý)
    - `PUT /api/bao-tri/{id}/tien-do` (Cập nhật tiến độ & chi phí)
    - `POST /api/bao-tri/{id}/gui-kiem-tra` (Gửi yêu cầu nghiệm thu)
  - Service: `IBaoTriService` & `BaoTriService.cs`
  - Entity/DTO: `PhieuBaoTri.cs`, `LapBaoTriRequest.cs`, `CapNhatTienDoRequest.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`maintenance` subtab, modal tạo phiếu bảo trì `showCreateMaintenanceModal`).
  - Mock Data sử dụng: `INITIAL_MAINTENANCE_RECEIPTS` trong `src/data/initialMaintenance.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đồng bộ trạng thái thiết bị thành `DangBaoTri` ngay khi lập phiếu.
  - [ ] **Frontend:** Kết nối form tạo phiếu bảo trì với `apiClient.post('/api/bao-tri')`.

---

### UC6.13 – Nghiệm thu bảo trì
- **Đặc tả nghiệp vụ:** Sau khi sửa chữa/vệ sinh xong, nhân viên/quản trị viên kiểm tra thực tế. Nếu Đạt: đóng phiếu bảo trì, ghi nhận chi phí thực tế và đưa thiết bị về trạng thái "Sẵn sàng". Nếu Không thể sửa: chuyển sang đề nghị Ngừng sử dụng (UC6.14).
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/BaoTriController.cs`
    - `POST /api/bao-tri/{id}/hoan-thanh` (Nghiệm thu đạt, chuyển Sẵn sàng)
    - `POST /api/bao-tri/{id}/ket-thuc-khong-dat` (Nghiệm thu không đạt, giữ bảo trì hoặc chuyển thanh lý)
  - Service: `IBaoTriService.XacNhanHoanThanhAsync`, `KetThucKhongDatAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`maintenance` subtab, modal "Nghiệm thu (UC6.13) →")
  - Hàm thao tác: `app.updateMaintenanceStatus`
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra cập nhật chi phí bảo trì vào báo cáo chi phí vận hành.
  - [ ] **Frontend:** Kết nối modal nghiệm thu bảo trì với 2 endpoint nghiệm thu của `BaoTriController`.

---

### UC6.14 – Ngừng sử dụng thiết bị
- **Đặc tả nghiệp vụ:** Loại bỏ thiết bị hư hỏng không thể phục hồi hoặc mất mát khỏi hoạt động kinh doanh. Quản trị viên nhập lý do, kiểm tra giải quyết dứt điểm cam kết thuê tương lai trước khi đổi trạng thái "Ngừng sử dụng". Bảo toàn lịch sử và mã vật phẩm.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/VongDoiThietBiController.cs`
    - `POST /api/vong-doi-thiet-bi/{id}/de-nghi-ngung-su-dung`
    - `POST /api/vong-doi-thiet-bi/de-nghi/{maPhieuDieuChinh}/duyet` (Admin duyệt)
  - Service: `IVongDoiThietBiService.DeNghiNgungSuDungAsync`, `DuyetDeNghiVongDoiAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (Tab `equipment`, nút chuyển trạng thái sang "Ngừng sử dụng")
  - Hàm thao tác: Sửa thuộc tính `equipmentStatus = "Ngừng sử dụng"` trong `app.equipment`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo không cho phép phân công thiết bị đã ngừng sử dụng vào đơn thuê.
  - [ ] **Frontend:** Kết nối thao tác ngừng sử dụng với API đề nghị và duyệt ngừng sử dụng.

---

### UC6.15 – Điều chuyển thiết bị sang sản phẩm khác
- **Đặc tả nghiệp vụ:** Điều chuyển thiết bị khấu hao/giáng cấp sang sản phẩm khác (ví dụ: Lều tiêu chuẩn sau nhiều lần thuê giáng cấp sang Lều tiết kiệm). Giữ nguyên mã thiết bị, dòng nhập nguồn và lịch sử; cập nhật khả dụng theo sản phẩm mới.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/VongDoiThietBiController.cs`
    - `POST /api/vong-doi-thiet-bi/{id}/dieu-chuyen-san-pham`
    - `POST /api/vong-doi-thiet-bi/{id}/xem-anh-huong` (Xem trước đơn bị ảnh hưởng)
    - `POST /api/vong-doi-thiet-bi/de-nghi/{maPhieuDieuChinh}/duyet`
  - Service: `IVongDoiThietBiService.DeNghiGiangCapAsync`, `XemAnhHuongThayDoiAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`inventory` subtab, modal "Chuyển loại thiết bị: {id}", nút "Xác nhận chuyển")
  - Hàm thao tác: `app.transferEquipment(equipmentId, targetProductId)`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra điều kiện sản phẩm đích phải cùng loại thiết bị và đang kinh doanh.
  - [ ] **Frontend:** Kết nối modal chuyển loại thiết bị với `apiClient.post('/api/vong-doi-thiet-bi/{id}/dieu-chuyen-san-pham')`.

---

## IV. CHI TIẾT KHẢO SÁT & ĐỐI CHIẾU: PHÂN HỆ 7 – QUẢN LÝ NHÀ CUNG CẤP VÀ NHẬP HÀNG (UC7.1 – UC7.10 & PHỤ LỤC)

### UC7.1 – Thêm nhà cung cấp
- **Đặc tả nghiệp vụ:** Quản trị viên tạo nhà cung cấp mới (mã NCC, tên, người liên hệ, số điện thoại, email, địa chỉ, ghi chú). Kiểm tra mã duy nhất, trạng thái ban đầu là "Đang hợp tác".
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/NhaCungCapController.cs` (`POST /api/nha-cung-cap`) - Policy `AdminOnly`
  - Service: `INhaCungCapService.TaoAsync` & `NhaCungCapService.cs`
  - Entity/DTO: `NhaCungCap.cs`, `TaoNhaCungCapRequest.cs`, `NhaCungCapDto.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`SuppliersTab`, modal "Thêm nhà cung cấp")
  - Hàm thao tác: `app.saveSupplier`
  - Mock Data sử dụng: `INITIAL_SUPPLIERS` trong `src/data/initialSuppliers.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung validation kiểm tra định dạng email và số điện thoại nhà cung cấp.
  - [ ] **Frontend:** Kết nối form tạo nhà cung cấp với `apiClient.post('/api/nha-cung-cap')`.

---

### UC7.2 – Cập nhật nhà cung cấp
- **Đặc tả nghiệp vụ:** Quản trị viên cập nhật thông tin liên hệ. Bảo toàn lịch sử các phiếu nhập đã chốt từ trước.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/NhaCungCapController.cs` (`PUT /api/nha-cung-cap/{id}`) - Policy `AdminOnly`
  - Service: `INhaCungCapService.CapNhatAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`SuppliersTab`, modal sửa thông tin NCC)
  - Hàm thao tác: `app.saveSupplier`
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra tính toàn vẹn tham chiếu khóa ngoại trong phiếu nhập cũ.
  - [ ] **Frontend:** Kết nối form sửa với `apiClient.put('/api/nha-cung-cap/{id}')`.

---

### UC7.3 – Tra cứu nhà cung cấp
- **Đặc tả nghiệp vụ:** Nhân viên và Quản trị viên tìm kiếm NCC theo từ khóa, trạng thái hợp tác; xem hồ sơ chi tiết và lịch sử các phiếu nhập hàng thực tế.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/NhaCungCapController.cs`
    - `GET /api/nha-cung-cap` (Tìm kiếm, phân trang)
    - `GET /api/nha-cung-cap/{id}` (Xem chi tiết)
    - `GET /api/nha-cung-cap/{id}/lich-su-nhap` (Tra cứu lịch sử nhập hàng thực tế)
  - Service: `INhaCungCapService.TimKiemAsync`, `LayChiTietAsync`, `LayLichSuNhapAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component:
    - `frontend/src/views/AdminView.tsx` (`SuppliersTab`)
    - `frontend/src/views/StaffView.tsx` (`import` subtab, modal "👁 Xem hồ sơ NCC (UC7.3)": `SupplierProfileModal`)
  - Mock Data sử dụng: `app.suppliers` (từ `initialSuppliers.ts`).
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Tối ưu truy vấn phân trang lịch sử nhập theo NCC.
  - [ ] **Frontend:** Kết nối `SupplierProfileModal` với `apiClient.get('/api/nha-cung-cap/{id}/lich-su-nhap')`.

---

### UC7.4 – Thay đổi tình trạng hợp tác
- **Đặc tả nghiệp vụ:** Quản trị viên chuyển trạng thái đối tác sang "Ngừng hợp tác" hoặc mở lại "Đang hợp tác". Nhà cung cấp ngừng hợp tác bị chặn không cho lập phiếu nhập mới; các phiếu đã xác nhận quá khứ giữ nguyên.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/NhaCungCapController.cs` (`PUT /api/nha-cung-cap/{id}/trang-thai-hop-tac`)
  - Service: `INhaCungCapService.DoiTrangThaiHopTacAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`SuppliersTab`, switch toggle trạng thái hợp tác)
  - Hàm thao tác: `app.saveSupplier` cập nhật trường `status`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung rule chặn tạo phiếu nhập nháp khi nhà cung cấp có trạng thái `NgungHopTac`.
  - [ ] **Frontend:** Kết nối switch trạng thái với `apiClient.put('/api/nha-cung-cap/{id}/trang-thai-hop-tac')`.

---

### UC7.5 – Lập phiếu nhập nháp (kèm UC7.5.1 Kiểm tra nhà cung cấp và tính tiền nhập)
- **Đặc tả nghiệp vụ:** Nhân viên/quản trị lập phiếu mua hàng dự kiến. Chọn nhà cung cấp còn hợp tác, thêm danh mục sản phẩm, số lượng, đơn giá nhập. Hệ thống tự động kiểm tra, tính thành tiền từng dòng và tổng giá trị (UC7.5.1). Phiếu ở trạng thái "Nháp", chưa ghi tăng tồn kho.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/PhieuNhapController.cs` (`POST /api/phieu-nhap`) - Policy `StaffOrAdmin`
  - Service: `IPhieuNhapService.TaoNhapAsync` & `PhieuNhapService.cs`
  - Entity/DTO: `PhieuNhap.cs`, `ChiTietPhieuNhap.cs`, `TaoPhieuNhapRequest.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (phần Nhập hàng), `StaffView.tsx` (`import` subtab, modal tạo phiếu nhập nháp).
  - Hàm thao tác: `app.saveImportReceipt`
  - Mock Data sử dụng: `INITIAL_IMPORT_RECEIPTS` trong `src/data/initialImportReceipts.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra validate đơn giá nhập >= 0, số lượng nguyên dương.
  - [ ] **Frontend:** Kết nối form lập phiếu với `apiClient.post('/api/phieu-nhap')`.

---

### UC7.6 – Sửa phiếu nhập nháp
- **Đặc tả nghiệp vụ:** Chỉnh sửa thông tin phiếu nhập khi còn ở trạng thái "Nháp" (thêm, sửa, xóa dòng hàng, thay đổi đơn giá, số lượng). Tự động gộp dòng nếu trùng sản phẩm, đơn giá và tình trạng.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/PhieuNhapController.cs`
    - `PUT /api/phieu-nhap/{id}` (Cập nhật đầu phiếu)
    - `POST /api/phieu-nhap/{id}/chi-tiet` (Thêm dòng hàng)
    - `PUT /api/phieu-nhap/{id}/chi-tiet/{chiTietId}` (Sửa dòng hàng)
    - `DELETE /api/phieu-nhap/{id}/chi-tiet/{chiTietId}` (Xóa dòng hàng)
  - Service: `IPhieuNhapService`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` & `StaffView.tsx` (Modal sửa phiếu nhập)
  - Hàm thao tác: `app.saveImportReceipt`
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Chặn sửa tuyệt đối nếu phiếu đã chuyển trạng thái `DaNhapKho` hoặc `DaHuy`.
  - [ ] **Frontend:** Kết nối các thao tác chỉnh sửa dòng hàng với các endpoint con của `PhieuNhapController`.

---

### UC7.7 – Kiểm tra và xác nhận nhập kho (kèm UC7.7.1 Tạo mã thiết bị một lần & UC7.7.2 Xử lý hàng lỗi)
- **Đặc tả nghiệp vụ:** Xe hàng đến kho, nhân viên kiểm đếm số lượng, chất lượng thực tế. Phân loại: hàng đạt chuẩn (chuyển Sẵn sàng), hàng lỗi nhận xử lý (chuyển Bảo trì - UC7.7.2), hàng từ chối (không nhập kho). Quản trị viên duyệt xác nhận nhập kho: chốt phiếu, tự động sinh mã định danh Barcode/Serial duy nhất cho từng vật phẩm chấp nhận đúng 1 lần (UC7.7.1), tăng tồn kho nguyên tử.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/PhieuNhapController.cs` (`POST /api/phieu-nhap/{id}/xac-nhan`) - Policy `AdminOnly`
  - Service: `INhapKhoService.XacNhanNhapKhoAsync` & `NhapKhoService.cs`
  - Entity/DTO: `XacNhanNhapKhoRequest.cs`, `ThietBi.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]** (Sinh mã Barcode/Serial tự động, giao dịch TransactionScope nguyên tử).
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`import` subtab, modal "Kiểm nhận hàng thực tế: {id}")
  - Hàm thao tác: Cập nhật `receipt.status = "Đã nhập kho"` và sinh các phần tử mới vào mảng `app.equipment`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung in danh sách tem nhãn Barcode sau khi xác nhận nhập kho thành công.
  - [ ] **Frontend:** Kết nối modal kiểm nhận thực tế với `apiClient.post('/api/phieu-nhap/{id}/xac-nhan')`.

---

### UC7.8 – Tra cứu phiếu nhập
- **Đặc tả nghiệp vụ:** Tìm kiếm phiếu nhập theo mã phiếu, nhà cung cấp, khoảng thời gian lập, trạng thái (Nháp, Đã nhập kho, Đã hủy). Xem chi tiết các dòng hàng và lịch sử kiểm nhận.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/PhieuNhapController.cs`
    - `GET /api/phieu-nhap` (Tìm kiếm phân trang có lọc)
    - `GET /api/phieu-nhap/{id}` (Xem chi tiết phiếu)
  - Service: `IPhieuNhapService.TimKiemAsync`, `LayChiTietAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`import` subtab), `AdminView.tsx` (bảng quản lý phiếu nhập)
  - Mock Data sử dụng: `app.importReceipts` (từ `initialImportReceipts.ts`).
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung tính năng xuất file Excel danh sách phiếu nhập.
  - [ ] **Frontend:** Kết nối bộ lọc và bảng danh sách với `apiClient.get('/api/phieu-nhap')`.

---

### UC7.9 – Hủy phiếu nhập nháp
- **Đặc tả nghiệp vụ:** Nhân viên/quản trị viên hủy bỏ phiếu mua hàng chưa thực hiện. Nhập lý do hủy. Hệ thống đánh dấu trạng thái "Đã hủy", không tác động kho và bảo toàn lịch sử.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/PhieuNhapController.cs` (`POST /api/phieu-nhap/{id}/huy`) - Policy `StaffOrAdmin`
  - Service: `IPhieuNhapService.HuyNhapAsync`
  - Entity/DTO: `HuyNhapRequest.cs`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` & `StaffView.tsx` (Nút "Hủy phiếu" trong modal phiếu nhập)
  - Hàm thao tác: `app.cancelImportReceipt(receiptId, reason)`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Chặn không cho phép hủy phiếu đã ở trạng thái `DaNhapKho`.
  - [ ] **Frontend:** Kết nối nút hủy phiếu với `apiClient.post('/api/phieu-nhap/{id}/huy')`.

---

### UC7.10 – Xử lý sai lệch phiếu nhập (kèm UC7.10.1 Lập bản điều chỉnh phiếu nhập)
- **Đặc tả nghiệp vụ:** Khi phát hiện sai lệch trên phiếu đã nhập kho (sai đơn giá hoặc sai lệch vật phẩm), nhân viên lập đề nghị điều chỉnh ở trạng thái "Chờ duyệt" (UC7.10.1). Quản trị viên kiểm tra chứng từ và cam kết thuê trước khi phê duyệt áp dụng. Giữ nguyên phiếu gốc, hiển thị lịch sử trước/sau điều chỉnh và cập nhật giá trị hiệu lực.
- **Hiện trạng Backend:**
  - File Controller: `backend/Controllers/DieuChinhKhoController.cs`
    - `POST /api/dieu-chinh-kho` (Lập phiếu điều chỉnh với loại `SaiLechPhieuNhap`)
    - `POST /api/dieu-chinh-kho/{id}/duyet-ap-dung` (Admin duyệt áp dụng)
    - `GET /api/dieu-chinh-kho/hieu-luc/{maPhieuNhap}` (Tính giá trị và số lượng nhập hiệu lực sau điều chỉnh)
  - Service: `IDieuChinhKhoService.TinhGiaTriSauDieuChinhAsync`
  - Đánh giá Backend: **[Hoàn thành 100%]**
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (Tab `stock-adjust`, modal điều chỉnh sai lệch phiếu nhập).
  - Mock Data sử dụng: Mảng `adjustments` bên trong từng phiếu ở `initialImportReceipts.ts`.
  - Đánh giá Frontend: **[Chưa hoàn thiện - Đang dùng Mock]**
- **Trạng thái tổng thể:** `[Chưa hoàn thiện]`
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo báo cáo nhập hàng đọc đúng giá trị hiệu lực từ `TinhGiaTriSauDieuChinhAsync`.
  - [ ] **Frontend:** Kết nối giao diện lập và duyệt điều chỉnh sai lệch với `DieuChinhKhoController`.

---

## V. TỔNG HỢP DANH MỤC MOCK DATA CẦN THAY THẾ Ở FRONTEND

Dưới đây là danh sách toàn bộ các file và biến Mock Data tại Frontend liên quan trực tiếp đến Phân hệ 5, 6, 7 cần được chuyển đổi sang gọi API Backend thật:

| File nguồn Mock Data | Biến / Dữ liệu Mock | Phân hệ liên quan | API Backend tương ứng thay thế |
|:---|:---|:---:|:---|
| `frontend/src/data/initialCategories.ts` | `INITIAL_CATEGORIES` | Phân hệ 6 (UC6.1 – UC6.4) | `GET /api/danh-muc`, `GET /api/admin/danh-muc` |
| `frontend/src/data/initialProducts.ts` | `INITIAL_PRODUCTS` | Phân hệ 6 (UC6.5 – UC6.8) | `GET /api/san-pham`, `GET /api/admin/san-pham` |
| `frontend/src/data/initialEquipment.ts` | `INITIAL_EQUIPMENT` | Phân hệ 6 (UC6.9, UC6.14, UC6.15) | `GET /api/thiet-bi`, `GET /api/vong-doi-thiet-bi/{id}` |
| `frontend/src/data/initialStockAdjustments.ts` | `INITIAL_STOCK_ADJUSTMENTS` | Phân hệ 6 (UC6.10, UC6.11) | `GET /api/dieu-chinh-kho` |
| `frontend/src/data/initialMaintenance.ts` | `INITIAL_MAINTENANCE_RECEIPTS` | Phân hệ 6 (UC6.12, UC6.13) | `GET /api/bao-tri` |
| `frontend/src/data/initialSuppliers.ts` | `INITIAL_SUPPLIERS` | Phân hệ 7 (UC7.1 – UC7.4) | `GET /api/nha-cung-cap` |
| `frontend/src/data/initialImportReceipts.ts` | `INITIAL_IMPORT_RECEIPTS` | Phân hệ 7 (UC7.5 – UC7.10) | `GET /api/phieu-nhap` |
| `frontend/src/data/initialOrders.ts` | `INITIAL_ORDERS` (các trường `transactions`, `surcharges`, `reconciliation`) | Phân hệ 5 (UC5.1 – UC5.6) | `GET /api/v1/thanh-toan/*`, `GET /api/v1/phu-phi/*`, `GET /api/v1/doi-soat/*`, `GET /api/v1/hoan-tien/*` |
| `frontend/src/data/initialFinancialAdjustments.ts` | `INITIAL_FINANCIAL_ADJUSTMENTS` | Phân hệ 5 (UC5.7) | `GET /api/v1/doi-soat/{id}/dieu-chinh` |
| `frontend/src/services/fakeApi.ts` | Toàn bộ object `fakeApi` (chế độ giả lập fallback) | Toàn bộ M5 - M7 | Chuyển đổi cờ `isRealApiEnabled() = true` và hoàn thiện HTTP wrapper |
| `frontend/src/App.tsx` | Khóa `STORAGE_KEY = "geargo-demo-state-v2"` | Toàn bộ M5 - M7 | Loại bỏ lưu trữ local state cho dữ liệu nghiệp vụ sau khi kết nối Backend |

---

## VI. PHÂN TÍCH KHOẢNG CÁCH (GAP ANALYSIS) VÀ RỦI RO KỸ THUẬT

### 1. Khoảng cách cấu trúc dữ liệu (Data Contract Gaps)
- **Quy tắc đặt tên trường (Naming Convention):** Backend ASP.NET Core sử dụng chuẩn PascalCase cho C# DTO (`MaDonThue`, `TongTien`, `TrangThai`) và serialize sang camelCase JSON (`maDonThue`, `tongTien`, `trangThai`), sử dụng tiếng Việt không dấu. Trong khi đó, Frontend hiện tại đang sử dụng tiếng Anh camelCase (`orderId`, `rental`, `depositTotal`, `status`).
  - *Giải pháp:* Cần xây dựng tầng Data Mapper (Adapter) ở Frontend trong thư mục `src/services/mappers/` để chuyển đổi giữa Model Backend và Type Frontend mà không làm vỡ các UI components hiện tại.
- **Quản lý khóa định danh (ID Typing):** Backend sử dụng kiểu `long` (Int64), Frontend một số nơi dùng kiểu `string` (ví dụ `"DT-001"`, `"NCC-01"`).
  - *Giải pháp:* Chuẩn hóa ID trong API client: chấp nhận parse `BigInt`/`number` hoặc duy trì trường `displayCode` cho hiển thị người dùng và `id` dạng số nguyên cho API.

### 2. Rủi ro kỹ thuật và Biện pháp kiểm soát
1. **Rủi ro bất đồng bộ trạng thái khi thanh toán/hoàn tiền (Payment Concurrency):**
   - *Rủi ro:* Khách bấm thanh toán hoặc nhân viên bấm hoàn tiền nhiều lần liên tiếp gây trùng giao dịch.
   - *Kiểm soát:* Backend đã có Idempotency Key và kiểm tra trạng thái nguồn tiền. Frontend cần vô hiệu hóa nút bấm (disable button) và hiển thị loading spinner ngay khi submit.
2. **Rủi ro phá vỡ cam kết đơn thuê khi điều chỉnh kho/bảo trì (Booking Conflict):**
   - *Rủi ro:* Giảm số lượng thiết bị hoặc đưa thiết bị vào bảo trì làm thiếu đồ cho các đơn khách đã thanh toán giữ chỗ trong tương lai.
   - *Kiểm soát:* Backend đã tích hợp `IDeviceConflictDetector` và `VongDoiThietBiService.XemAnhHuongThayDoiAsync`. Cần đảm bảo Frontend luôn gọi API kiểm tra ảnh hưởng trước khi hiển thị popup xác nhận cho Quản trị viên.
3. **Phân quyền truy cập và bảo vệ chứng từ gốc (RBAC & Audit Trail):**
   - *Rủi ro:* Nhân viên có thể vô tình xem dữ liệu tài chính nhạy cảm hoặc sửa đổi chứng từ đã chốt.
   - *Kiểm soát:* Backend áp dụng chặt chẽ các Policy `AdminOnly`, `StaffOrAdmin`, `CustomerOnly`. Frontend cần ẩn/hiện các nút bấm theo `permissions.tsx` dựa trên vai trò người dùng hiện tại.

---

## VII. KẾ HOẠCH TRIỂN KHAI VÀ PHÂN CHIA SUBAGENT ĐỘC LẬP

Kế hoạch chia thành 3 gói công việc (Work Packages) độc lập tương ứng với 3 Phân hệ, sẵn sàng giao cho 3 Subagent thực thi:

### Gói 1: Tích hợp Phân hệ 5 (Subagent-M5: Thanh toán & Tiền cọc)
- **Phạm vi:** UC5.1 đến UC5.7 (7 Use Cases)
- **Checklist công việc:**
  1. Xây dựng `thanhToanService.ts`, `phuPhiService.ts`, `doiSoatService.ts`, `hoanTienService.ts` trong `frontend/src/services/`.
  2. Nối giao diện `OrderConfirmedView` (VietQR) với `POST /api/v1/thanh-toan/xac-nhan`.
  3. Nối các thao tác duyệt/từ chối/khiếu nại phụ phí trong `ReturnTab` và `CustomerPortal` với `PhuPhiController`.
  4. Nối `ReconciliationSheet.tsx` với chuỗi API `DoiSoatController` (Xem trước, Lập, Xác nhận, Xử lý tiền, Chốt hoàn tất).
  5. Nối modal Thu thêm và Hoàn tiền cọc với API thu bổ sung và lệnh hoàn tiền.
  6. Thay thế dữ liệu mock trong `initialOrders.ts` và `initialFinancialAdjustments.ts`.

### Gói 2: Tích hợp Phân hệ 6 (Subagent-M6: Sản phẩm & Thiết bị)
- **Phạm vi:** UC6.1 đến UC6.15 và các phụ lục hỗ trợ (20 Use Cases)
- **Checklist công việc:**
  1. Xây dựng `danhMucService.ts`, `sanPhamService.ts`, `thietBiService.ts`, `dieuChinhKhoService.ts`, `baoTriService.ts`.
  2. Nối `CategoriesTab` và `ProductsTab` trong `AdminView.tsx` với API CRUD Danh mục và Sản phẩm của Quản trị.
  3. Nối `ProductsView.tsx` và `LandingView.tsx` với API danh mục và sản phẩm công khai.
  4. Nối `EquipmentLifecycleModal` (Sổ đời) với `GET /api/vong-doi-thiet-bi/{id}`.
  5. Nối quy trình Kiểm kê kho (`InventoryAuditModal`) và Duyệt điều chỉnh kho với `DieuChinhKhoController`.
  6. Nối quy trình Lập phiếu bảo trì và Nghiệm thu bảo trì trong `StaffView.tsx` với `BaoTriController`.
  7. Nối thao tác Ngừng sử dụng và Chuyển loại thiết bị (Điều chuyển sản phẩm) với `VongDoiThietBiController`.
  8. Thay thế dữ liệu mock trong `initialCategories.ts`, `initialProducts.ts`, `initialEquipment.ts`, `initialMaintenance.ts`, `initialStockAdjustments.ts`.

### Gói 3: Tích hợp Phân hệ 7 (Subagent-M7: Nhà cung cấp & Nhập hàng)
- **Phạm vi:** UC7.1 đến UC7.10 và các phụ lục hỗ trợ (14 Use Cases)
- **Checklist công việc:**
  1. Xây dựng `nhaCungCapService.ts`, `phieuNhapService.ts`.
  2. Nối `SuppliersTab` trong `AdminView.tsx` với API CRUD và Đổi trạng thái hợp tác của `NhaCungCapController`.
  3. Nối `SupplierProfileModal` trong `StaffView.tsx` với `GET /api/nha-cung-cap/{id}/lich-su-nhap`.
  4. Nối quy trình Lập phiếu nhập nháp, Sửa nháp, Hủy nháp trong `StaffView.tsx` với `PhieuNhapController`.
  5. Nối modal Kiểm nhận hàng thực tế và Xác nhận nhập kho với `POST /api/phieu-nhap/{id}/xac-nhan` (tạo mã thiết bị tự động một lần).
  6. Nối chức năng Điều chỉnh sai lệch phiếu nhập với `DieuChinhKhoController`.
  7. Thay thế dữ liệu mock trong `initialSuppliers.ts` và `initialImportReceipts.ts`.

---
*Báo cáo được lập đầy đủ, khách quan và sẵn sàng bàn giao cho Orchestrator để đưa vào Implementation Plan tổng thể.*
