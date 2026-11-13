# KẾ HOẠCH TRIỂN KHAI VÀ BÁO CÁO KHOẢNG CÁCH CHI TIẾT 10 PHÂN HỆ (102 USE CASES)
## HỆ THỐNG QUẢN TRỊ & CHO THUÊ DỤNG CỤ DÃ NGOẠI GEARGO (GEARGO WEBAPP)

> **Tài liệu tham chiếu chuẩn hóa:**
> - Đặc tả nghiệp vụ 10 phân hệ: `Document/GearGo_Dac_Ta_10_Phan_He_Use_Cases.md` (102 Use Cases)
> - Báo cáo khảo sát Phân hệ 1 - 4: `Document/GearGo_Analysis_M1_M4.md` (36 Use Cases)
> - Báo cáo khảo sát Phân hệ 5 - 7: `C:\Users\DELL\.gemini\antigravity\brain\c01570a4-1eba-41cb-8aa1-bc719f5a169a\analysis.md` (41 Use Cases)
> - Báo cáo khảo sát Phân hệ 8 - 10: `Document/GearGo_Analysis_M8_M10.md` (25 Use Cases)
> - Danh mục API & Đồ thị mã nguồn: `Document/Swagger_API_Catalog.md` & `graphify-out/graph.json`
>
> **Phiên bản tài liệu:** v1.0 — Chuẩn hóa Kế hoạch Triển khai Toàn diện  
> **Thời điểm ban hành:** 2026-11-13  
> **Đơn vị thực hiện:** Teamwork Architecture Synthesis Group

---

# PHẦN I: TỔNG QUAN HỆ THỐNG & ĐÍNH CHÍNH KIẾN TRÚC KỸ THUẬT

## 1. Đính chính thực tế Công nghệ & Nghiệp vụ cốt lõi

### 1.1. Công nghệ Backend
- **Thực tế mã nguồn Backend:** Được xây dựng 100% bằng **ASP.NET Core 10.0 (C# / .NET 10)**, sử dụng **Entity Framework Core 9**, hệ quản trị cơ sở dữ liệu **Microsoft SQL Server**, cơ chế bảo mật xác thực **JWT Bearer Authentication 2 lớp** (Blacklist In-Memory Cache `revoked_token:{hash}` + Kiểm tra trạng thái tài khoản thời gian thực tại `JwtBearerEvents.OnTokenValidated`), kiến trúc phân tầng đa lớp (Web API Controllers, Services/Interfaces, Services/Implements, DTOs, Entities, Background Hosted Services).
- **ĐÍNH CHÍNH BẮT BUỘC:** Backend **KHÔNG PHẢI Spring Boot / Java** như một số ghi chú ban đầu. Tất cả các Subagent triển khai Backend bắt buộc phải lập trình bằng **C# / .NET 10**, tuân thủ triệt để cấu trúc thư mục tại `backend/Controllers/`, `backend/Services/`, `backend/Models/DTOs/`, `backend/Models/Entities/`.

### 1.2. Công nghệ Frontend
- **Thực tế mã nguồn Frontend:** Được xây dựng bằng **React 18, TypeScript, Vite, TailwindCSS** kết hợp hệ thống giao diện **Impeccable UI Design System** (giao diện hiện đại, trực quan, hỗ trợ đầy đủ các modal, timeline, drill-down và validation trạng thái).
- **Hiện trạng luồng dữ liệu Frontend:** 100% màn hình UI đã được xây dựng hoàn thiện. Tuy nhiên, **~90% dữ liệu đang vận hành trên Mock Data cục bộ** (`src/data/initial*.ts`, `localStorage` với khóa `geargo-demo-state-v2` và cơ chế giả lập qua `src/services/fakeApi.ts`). Mới chỉ có luồng Đăng nhập (`LoginView`), Đổi mật khẩu và một số endpoint quản trị thông báo đã được kết nối API thật.

### 1.3. Nghiệp vụ thực tế hệ thống GearGo
- GearGo là giải pháp công nghệ phục vụ mô hình **Cho thuê dụng cụ dã ngoại, cắm trại và du lịch khám phá** (Lều cắm trại, bếp ga dã ngoại, túi ngủ, bàn ghế gấp gọn, đèn bão, balô trợ lực...).
- Hệ thống áp dụng mô hình 1 Cửa hàng trung tâm - 1 Kho tập trung. Khách hàng nhận và trả thiết bị trực tiếp tại quầy hoặc thông qua đối tác giao vận công nghệ. Hệ thống **không sở hữu** đội xe tải hay tài xế vận chuyển riêng.

---

## 2. Bảng tổng hợp thống kê hiện trạng 102 Use Cases theo 10 Phân hệ

| STT | Phân hệ Nghiệp vụ | Mã số UC Phân hệ | Dải đánh số Kế hoạch | Số lượng UC | Hoàn thành (Done) | Chưa hoàn thiện (Incomplete) | Thiếu API / UI (Missing) | Tỷ lệ Backend sẵn sàng |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **Phân hệ 1:** Quản lý Tài khoản & Nhân viên | UC1.1 – UC1.13 (+ 3 phụ lục) | UC01 – UC16 | **16** | 5 | 11 | 0 | **100%** |
| 2 | **Phân hệ 2:** Tra cứu & Tư vấn Dụng cụ AI | UC2.1 – UC2.4 (+ 2 phụ lục) | UC17 – UC22 | **6** | 3 | 3 | 0 | **100%** |
| 3 | **Phân hệ 3:** Quản lý Giỏ hàng & Đặt thuê | UC3.1 – UC3.4 (+ 4 phụ lục) | UC23 – UC30 | **8** | 0 | 8 | 0 | **100%** |
| 4 | **Phân hệ 4:** Giao nhận, Bàn giao BBBG, Nhận trả PNT | UC4.1 – UC4.5 (+ 1 phụ lục) | UC31 – UC36 | **6** | 0 | 6 | 0 | **100%** |
| 5 | **Phân hệ 5:** Quản lý Thanh toán & Tiền cọc | UC5.1 – UC5.7 | UC37 – UC43 | **7** | 0 | 7 | 0 | **100%** |
| 6 | **Phân hệ 6:** Quản lý Sản phẩm & Thiết bị | UC6.1 – UC6.15 (+ 5 phụ lục) | UC44 – UC63 | **20** | 0 | 20 | 0 | **100%** |
| 7 | **Phân hệ 7:** Nhà cung cấp & Nhập hàng | UC7.1 – UC7.10 (+ 4 phụ lục) | UC64 – UC77 | **14** | 0 | 14 | 0 | **100%** |
| 8 | **Phân hệ 8:** Chính sách, Khuyến mãi & Vòng đời | UC8.1 – UC8.5, UC16 (+ 3 phụ lục) | UC78 – UC87 (UC80-UC89) | **10** | 0 | 10 | 0 | **100%** |
| 9 | **Phân hệ 9:** Đánh giá & Thông báo đa kênh | UC9.1 – UC9.4 (+ 5 phụ lục) | UC88 – UC95 (UC90-UC97) | **8** | 1 | 5 | 2 | **87.5%** |
| 10 | **Phân hệ 10:** Báo cáo, Thống kê & Kiểm toán | UC10.1 – UC10.4 (+ 4 phụ lục) | UC96 – UC102 (UC98-UC102) | **7** | 0 | 5 | 2 (sai quyền) | **100%** |
| | **TỔNG CỘNG TOÀN HỆ THỐNG** | **10 Phân hệ chuẩn** | **UC01 – UC102** | **102** | **9** | **89** | **4** | **98.0%** |

> **NHẬN ĐỊNH THEN CHỐT TỪ KIẾN TRÚC SƯ TRIỂN KHAI:**
> 1. **Backend cực kỳ vững chắc (~98% hoàn tất):** Đã có sẵn trên 25 Controller, 35 Service chuyên biệt, hơn 70 DTO, 160+ API endpoints. Hầu hết các nghiệp vụ phức tạp như kiểm tra khả dụng tồn kho theo khoảng thời gian (`KhaDungService`), thuật toán chống giữ chỗ quá hạn 15 phút (`DonThueExpirationJob`), Strategy Pattern nghiệm thu nhận trả (`NhanTraService`), phát hiện xung đột lịch thiết bị (`DeviceConflictDetector`), khóa đối soát cọc bi-directional (`DoiSoatService`) đều đã được code hoàn chỉnh tại Backend.
> 2. **Frontend sở hữu UX/UI vượt trội nhưng tồn tại "Khoảng cách ngắt kết nối" (Disconnection Gap):** 100% giao diện đã hoàn thiện theo đặc tả Impeccable, các form kiểm tra, modal xác nhận, quy trình 7 bước đối soát đều đã trực quan. Tuy nhiên, gần như toàn bộ Frontend đang chạy độc lập trên `localStorage` và mock data.
> 3. **Trọng tâm Kế hoạch triển khai:** Thiết lập tầng API Client đồng bộ (`src/services/api/`), cấu trúc Adapter chuyển đổi kiểu dữ liệu giữa C# DTO và React State, đấu nối toàn bộ UI vào Backend, thay thế dứt điểm Mock Data và kiểm thử E2E liên phân hệ.

---

# PHẦN II: BÁO CÁO KHOẢNG CÁCH (GAP ANALYSIS) CHI TIẾT 10 PHÂN HỆ (102 USE CASES)

---

## 1. PHÂN HỆ 1: QUẢN LÝ TÀI KHOẢN VÀ NHÂN VIÊN (16 USE CASES: UC01 – UC16)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC01** | UC1.1 | Đăng ký tài khoản khách hàng | `AuthController.cs` (`POST /api/auth/dang-ky`), `XacThucService.DangKyAsync`, Entity `TaiKhoan`, `KhachHang`. Hash BCrypt. | `AuthViews.tsx` (`RegisterView`), lưu local qua `app.saveCustomer()`, mock `initialCustomers.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend chưa có Rate Limiting IP chống spam bot. Frontend chưa gọi API qua `apiClient.post()`, chưa hiển thị mã lỗi `EMAIL_DA_TON_TAI`. |
| **UC02** | UC1.2, UC1.2.1 | Đăng nhập & Cấp JWT Token | `AuthController.cs` (`POST /api/auth/dang-nhap`), `JwtService.TaoJwtToken`, `OnTokenValidated` kiểm tra tài khoản hoạt động. | `AuthViews.tsx` (`LoginView`), gọi `fakeApi.auth.login`, lưu token qua `apiClient.setAuthToken`. | **Hoàn thành** | Đã kết nối API thật khi bật `isRealApiEnabled()`. Cần bổ sung xử lý sự kiện tự động đăng xuất khi token hết hạn. |
| **UC03** | UC1.3 | Đăng xuất & Thu hồi Token | `AuthController.cs` (`POST /api/auth/dang-xuat`), lưu SHA-256 hash của JWT vào `IMemoryCache` blacklist đến khi hết hạn. | `DashboardLayout.tsx`, `PublicLayout.tsx`, `fakeApi.auth.logout` xóa token local và gọi API thu hồi. | **Hoàn thành** | Hoạt động chính xác trên cả client và server. |
| **UC04** | UC1.4, UC1.4.1 | Khôi phục mật khẩu & Mã OTP | `AuthController.cs` (`POST quen-mat-khau`, `POST dat-lai-mat-khau`), lưu OTP trong MemoryCache 15 phút. | `AuthViews.tsx` (`ForgotPasswordView`), 3 bước giao diện (Email -> OTP -> Mật khẩu mới). | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend chưa có adapter gửi Email OTP thật (`IEmailNotificationAdapter` đang mock). Frontend đang so khớp OTP giả lập tĩnh. |
| **UC05** | UC1.5 | Xem thông tin cá nhân | `HoSoController.cs` (`GET /api/v1/ho-so/toi`), lấy ID từ JWT Claim, chống IDOR tuyệt đối. | `CustomerPortal.tsx` (`ProfileView`), đọc từ `app.currentUser`. | **Hoàn thành** | Đã tích hợp qua `fakeApi.auth.me`. |
| **UC06** | UC1.6 | Cập nhật hồ sơ cá nhân | `HoSoController.cs` (`PUT /api/v1/ho-so/toi`), `HoSoService.CapNhatHoSoCuaToiAsync`, DTO `CapNhatHoSoRequest`. | `CustomerPortal.tsx` (`ProfileView`), form lưu thông tin, gọi `fakeApi.auth.updateProfile`. | **Hoàn thành** | Đã hỗ trợ cập nhật thông tin cá nhân cơ bản. |
| **UC07** | UC1.7, UC1.7.1 | Tạo tài khoản nhân viên & Gán quyền | `Admin/NhanVienController.cs` (`POST /api/v1/admin/nhan-vien`), Policy `AdminOnly`, DTO `TaoNhanVienRequest`. | `AdminView.tsx` (`StaffTab`, modal Thêm nhân viên), ghi vào `app.staffAccounts` local. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend chưa kết nối endpoint `POST /api/v1/admin/nhan-vien`, đang cập nhật mảng mock `initialStaff.ts`. |
| **UC08** | UC1.8 | Cập nhật hồ sơ nhân viên | `Admin/NhanVienController.cs` (`PUT /api/v1/admin/nhan-vien/{id}`), Policy `AdminOnly`. | `AdminView.tsx` (`StaffTab`, form sửa thông tin nhân viên). | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang gọi hàm `app.saveStaffAccount` sửa state client. |
| **UC09** | UC1.9 | Tra cứu danh sách nhân viên | `Admin/NhanVienController.cs` (`GET /api/v1/admin/nhan-vien`), hỗ trợ phân trang, lọc vai trò, trạng thái. | `AdminView.tsx` (`StaffTab`, thanh tìm kiếm và bộ lọc client). | **Chưa hoàn thiện** (Frontend dùng Mock) | Chưa kết nối server-side pagination và server-side filtering. |
| **UC10** | UC1.10 | Phân quyền vai trò nhân viên | `Admin/NhanVienController.cs` (`POST .../{id}/doi-vai-tro`), `PermissionAuthorizationHandler.cs`. | `AdminView.tsx` (`StaffTab`, modal `permStaff`), `PermissionsTab.tsx`. | **Chưa hoàn thiện** (Frontend dùng Mock) | UI có đầy đủ checkbox nhóm quyền chi tiết nhưng chưa gọi endpoint thay đổi vai trò backend. |
| **UC11** | UC1.11 | Khóa & Mở khóa tài khoản | `Admin/TaiKhoanController.cs` (`POST .../khoa`, `POST .../mo-khoa`), từ chối token bị khóa ngay tại middleware. | `AdminView.tsx` (modal khóa NV), `AdminExtendedTabs.tsx` (modal khóa Khách), `app.toggleStaffLock`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Chưa gọi API backend; cần chuyển đổi sang gọi API kèm lý do khóa tài khoản bắt buộc. |
| **UC12** | UC1.12 | Đổi mật khẩu trong phiên | `AuthController.cs` (`POST /api/auth/doi-mat-khau`), kiểm tra mật khẩu cũ, thu hồi token cũ. | `CustomerPortal.tsx` (`ProfileView` tab bảo mật), `fakeApi.auth.changePassword`. | **Hoàn thành** | Đã kết nối API backend thật. |
| **UC13** | UC1.13 | Tra cứu tài khoản khách hàng | `Admin/TaiKhoanController.cs` (`GET /api/v1/admin/tai-khoan?vaiTro=KhachHang`), DTO `TimTaiKhoanRequest`. | `AdminExtendedTabs.tsx` (`CustomersTab`), hiển thị lịch sử đơn, tiền cọc đang giữ. | **Chưa hoàn thiện** (Frontend dùng Mock) | Đang đọc dữ liệu từ mảng `app.customers` (`initialCustomers.ts`). |
| **UC14** | UC1.2.1 | Kiểm tra trạng thái tài khoản khi đăng nhập | `XacThucService.DangNhapAsync` kiểm tra `TrangThai == HoatDong`, chặn tài khoản bị khóa và quá 5 lần sai. | Tích hợp trong `LoginView`. | **Hoàn thành** | Backend đã có cơ chế khóa tạm thời và cảnh báo đúng chuẩn. |
| **UC15** | UC1.4.1 | Sinh mã xác minh khôi phục mật khẩu | `XacThucService.TaoTokenQuenMatKhauAsync`, lưu mã trong cache có hạn 15 phút. | Tích hợp trong `ForgotPasswordView`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần tích hợp adapter gửi mail thực tế qua SMTP / SendGrid. |
| **UC16** | UC1.7.1 | Cấp quyền nghiệp vụ ban đầu cho nhân viên | `NhanVienService.TaoNhanVienAsync`, gán vai trò `NhanVienKho`, `NhanVienCSKH`, `QuanLy`. | Tích hợp trong modal tạo nhân viên mới. | **Chưa hoàn thiện** (Frontend dùng Mock) | Chưa truyền nhóm quyền khởi tạo lên API backend. |

---

## 2. PHÂN HỆ 2: TRA CỨU SẢN PHẨM & TƯ VẤN BỘ DỤNG CỤ AI (6 USE CASES: UC17 – UC22)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC17** | UC2.1 | Tìm kiếm và lọc sản phẩm | `SanPhamController.cs` (`GET /api/san-pham`), lọc theo từ khóa, danh mục, khoảng giá, sức chứa, lịch thuê `[gioNhan, gioTra]`. | `ProductsView.tsx`, thanh tìm kiếm, bộ lọc đa năng, gọi `fakeApi.catalog.getProducts`. | **Hoàn thành** | Đã tương thích hoàn toàn giữa frontend service và backend endpoint. |
| **UC18** | UC2.2 | Xem chi tiết sản phẩm | `SanPhamController.cs` (`GET /api/san-pham/{id}`), DTO `SanPhamResponse` đầy đủ thông số kỹ thuật, phụ kiện, cọc, bồi thường. | `ProductsView.tsx` (`product-detail`), tabs: Thông số, Phụ kiện đi kèm, Chính sách cọc/hủy. | **Hoàn thành** | UI hiển thị phong phú, khớp 100% với DTO trả về. |
| **UC19** | UC2.3 | Kiểm tra khả dụng theo lịch thuê | `KhaDungService.KiemTraKhaDungAsync`, quét đơn trùng lịch, giữ chỗ 15 phút, bảo dưỡng, thất lạc; background job quét mỗi phút. | `ProductsView.tsx`, `CartView`, badge "Còn X chiếc / Hết hàng", helper `app.getAvailable(productId)`. | **Hoàn thành** | Thuật toán backend tối ưu. Cần đảm bảo frontend truyền đúng `startDate` và `endDate` khi kiểm tra khả dụng. |
| **UC20** | UC2.4 | Tư vấn combo dụng cụ AI | `TuVanController.cs` (`POST /api/tu-van/bo-do`), `TuVanAIService`, `AIProviderAdapter` (hỗ trợ OpenAI/Gemini và fallback rules). | `CustomerPortal.tsx` (`AIAdvisorView`), giao diện chọn phong cách, địa hình, ngân sách. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang dùng `setTimeout` giả lập combo tĩnh. Cần cấu hình API Key LLM tại backend `appsettings.json` và kết nối API client. |
| **UC21** | UC2.4.1 | Gợi ý bộ combo mẫu có sẵn (Fallback) | `GoiYBoDoService.cs`, fallback dựa trên quy tắc chuyên gia khi AI timeout hoặc mất kết nối. | `CustomerPortal.tsx` (`AIAdvisorView` tab "Combo mẫu có sẵn"). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần đồng bộ các bộ combo mẫu chuẩn giữa backend database và frontend presets. |
| **UC22** | UC2.4.2 | Thêm trọn bộ dụng cụ vào giỏ | `TuVanController.cs` (`POST /api/tu-van/bo-do/them-vao-gio`), kiểm tra khả dụng từng món trước khi gộp vào giỏ hàng. | `CustomerPortal.tsx` (`AIAdvisorView`, nút "Thêm vào giỏ hàng"). | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang lặp mảng để thêm từng item vào state giỏ hàng local; cần gọi endpoint gộp nguyên tử của backend. |

---

## 3. PHÂN HỆ 3: QUẢN LÝ ĐẶT THUÊ THIẾT BỊ (8 USE CASES: UC23 – UC30)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC23** | UC3.1 | Quản lý giỏ hàng & Báo giá thuê | `GioThueController.cs` (7 endpoints: GET, POST them, PUT so-luong, DELETE món, PUT thoi-gian), `BaoGiaService.cs`. | `CustomerPortal.tsx` (`CartView`), store `app.cart`, tính block 24h làm tròn lên, tách cọc và tiền thuê. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang quản lý giỏ hàng hoàn toàn trong `localStorage`. Cần chuyển đổi sang đồng bộ giỏ hàng với `GioThueController`. |
| **UC24** | UC3.1.1 | Tính giá thuê theo block 24 giờ | `BaoGiaService.cs`, tính toán số ngày = `Ceil((gioTra - gioNhan) / 24h)`, áp dụng bảng giá bậc thang. | Code trực tiếp trong `CartView` và `app.cartQuote`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Logic nghiệp vụ đã khớp 100%, cần nhận bảng báo giá chính thức do backend tính toán để đảm bảo tính pháp lý. |
| **UC25** | UC3.1.2 | Áp dụng mã khuyến mãi vào giỏ | `GioThueController.cs` (`POST /api/gio-thue/ma-giam-gia`), `KhuyenMaiService.cs`, ràng buộc: KHÔNG giảm trên tiền cọc. | `CartView`, ô nhập mã ưu đãi, `app.evaluatePromotion`, `app.appliedPromoCode`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi API backend để kiểm tra điều kiện áp dụng, giới hạn lượt dùng và khóa ưu đãi tạm thời. |
| **UC26** | UC3.2 | Tạo đơn thuê chính thức | `DonThueController.cs` (`POST /api/v1/don-thue`), Policy `CustomerOnly`, chống IDOR từ token claim, snapshot giá và chính sách. | `CustomerPortal.tsx` (`CheckoutView`), `app.createOrder`, lưu vào `localStorage`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang tự sinh mã đơn `DT...` giả lập. Cần gọi `POST /api/v1/don-thue` nhận ID thật từ database. |
| **UC27** | UC3.2.1 | Giữ chỗ số lượng thiết bị trong 15 phút | `DonThueService.cs`, tạo bản ghi `GiuChoThietBi`, `DonThueExpirationJob.cs` quét định kỳ 1 phút hủy đơn quá hạn. | `CustomerPortal.tsx` (`OrderConfirmedView`), hiển thị đồng hồ đếm ngược 15 phút. | **Chưa hoàn thiện** (Frontend dùng Mock) | Đồng hồ đếm ngược trên frontend đang tính theo client time. Cần đồng bộ `hanThanhToan` (UTC) từ API backend. |
| **UC28** | UC3.2.2 | Lưu bản chụp snapshot chính sách | Entity `DonThue` lưu `MaChinhSachSnapshotId`, snapshot giá thuê, giá cọc, tỷ lệ bồi thường tại thời điểm chốt đơn. | `CheckoutView` hiển thị điều khoản chính sách. | **Chưa hoàn thiện** (Frontend dùng Mock) | Đảm bảo backend lưu trữ toàn vẹn JSON snapshot chính sách để làm căn cứ pháp lý đối soát sau này. |
| **UC29** | UC3.3 | Theo dõi vòng đời đơn thuê của tôi | `DonThueController.cs` (`GET /api/v1/don-thue`, `GET {id}`, `GET {id}/lich-su`, `GET {id}/ban-giao`, `GET {id}/chinh-sach`). | `CustomerPortal.tsx` (`MyOrdersView`), tab lọc trạng thái, xem BBBG, PNT, bảng đối soát cọc. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang lọc mảng `app.orders` (`initialOrders.ts`). Cần đấu nối trọn bộ 5 endpoint truy vấn của backend. |
| **UC30** | UC3.4 | Hủy đơn thuê & Hoàn tiền theo chính sách | `DonThueController.cs` (`GET .../huy/xem-truoc`, `POST .../huy`), `VanHanh/DonThueController.cs` (`POST cua-hang-huy`), `HuyDonService.cs`. | `MyOrdersView` (modal hủy đơn, xem trước tiền hoàn theo các mốc >48h, 24-48h, <24h), `app.cancelOrder`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đã có modal tính tiền hoàn khớp chính sách. Cần gọi `GET xem-truoc` lấy bảng tính backend và gọi `POST huy` để giải phóng giữ chỗ. |

---

## 4. PHÂN HỆ 4: QUẢN LÝ GIAO NHẬN, BÀN GIAO & NHẬN TRẢ (6 USE CASES: UC31 – UC36)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC31** | UC4.1 | Chuẩn bị đơn & Phân công serial | `ChuanBiDonController.cs` (6 endpoints: bat-dau, phan-cong, huy, thay-the, san-sang), `DeviceConflictDetector.cs`. | `StaffView.tsx` (`HandoverTab` sub-tab prep), chọn dropdown serial, nút đổi mã, nút báo thiếu đồ gửi Admin. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend có hệ thống chống xung đột serial cực mạnh. Frontend đang gán mã vào state client; cần nối với `ChuanBiDonController`. |
| **UC32** | UC4.2 | Bàn giao thiết bị & Lập biên bản BBBG | `BanGiaoController.cs` (4 endpoints: nhap, cap-nhat, chot, xem), chuyển đơn và thiết bị sang `DangThue`. | `StaffView.tsx` (`HandoverTab` sub-tab handover), quét QR, đối chiếu CCCD, checklist 4 mục, chụp ảnh trước thuê, in BBBG. | **Chưa hoàn thiện** (Frontend dùng Mock) | Quy trình 4 bước rất chỉn chu trên UI. Cần gọi `POST .../nhap` khi mở đơn, `PUT` lưu checklist và `POST .../chot` khi hoàn tất. |
| **UC33** | UC4.3 | Nhận trả thiết bị & Nghiệm thu | `NhanTraController.cs` (7 endpoints: GET con-no, POST theo-don, PUT phieu, POST tach-cho-xu-ly, POST chot), Strategy Pattern. | `StaffView.tsx` (`ReturnTab`), hiển thị đồ đã giao / còn nợ, chọn tình trạng hỏng/mất/vệ sinh, tự động tính phụ phí. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend áp dụng Strategy Pattern cho từng loại tổn thất. Frontend đang lưu vào `order.returnReceipts`; cần nối API `NhanTraController`. |
| **UC34** | UC4.3.1 | Nhận trả nhiều đợt (Multi-round Return) | `TruyVanNhanTraService.cs`, quản lý mã đợt `PNT-xxx-D1`, `PNT-xxx-D2`, giữ đơn `DangThue` (Trả một phần) đến khi hết đồ nợ. | `StaffView.tsx` (`ReturnTab`), hỗ trợ nhận trả nhiều đợt, xem lịch sử các đợt trả trước. | **Chưa hoàn thiện** (Frontend dùng Mock) | Đã có UI hoàn hảo, cần lưu trữ các đợt nhận trả vào bảng `PhieuNhanTra` của backend. |
| **UC35** | UC4.4 | Xử lý đơn quá hạn & Nhật ký liên hệ | `QuaHanController.cs` (`GET qua-han`, `GET chi-tiet`, `GET don-bi-anh-huong`, `POST quet-nhac`), tính phạt trễ 150%. | `StaffView.tsx` (`ReturnTab`, nhãn Quá hạn, modal Nhật ký liên hệ, bảng cảnh báo xung đột đơn tương lai). | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã có endpoint quét đơn tương lai bị ảnh hưởng bởi thiết bị trễ hạn. Cần kết nối UI gọi `QuaHanController`. |
| **UC36** | UC4.5 | Tra cứu đơn thuê cho vận hành | `VanHanh/DonThueController.cs` (`GET van-hanh/don-thue`, `GET {id}`, `POST khong-den-nhan`). | `StaffView.tsx` (`OrdersTab`), bảng danh sách đơn, lọc theo trạng thái, modal chi tiết tích hợp 3 tab, audit timeline. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối bảng vận hành gọi API server-side search thay vì lọc trên state `app.orders`. |

---

## 5. PHÂN HỆ 5: QUẢN LÝ THANH TOÁN VÀ TIỀN CỌC (7 USE CASES: UC37 – UC43 / UC5.1 – UC5.7)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC37** | UC5.1 | Thanh toán đơn thuê & Xác nhận cọc | `ThanhToanController.cs` (`POST /api/v1/thanh-toan/xac-nhan`, `GET {id}/trang-thai`, `GET can-doi-chieu`, `POST {id}/doi-chieu`), Entity `GiaoDichThanhToan`. | `CustomerPortal.tsx` (`OrderConfirmedView`, khung VietQR), hàm `app.payOrder(orderId, succeed)`, mock `initialOrders.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang gọi hàm giả lập `app.payOrder` đổi status trong bộ nhớ. Cần gọi `POST .../xac-nhan` lưu giao dịch thật và tích hợp polling/webhook. |
| **UC38** | UC5.2 | Lập đề xuất phụ phí bồi thường & trễ hạn | `PhuPhiController.cs` (`GET /api/v1/phu-phi/goi-y`, `POST /api/v1/phu-phi`, `PUT {id}`, `GET theo-don/{donId}`), chặn trùng tổn thất, Policy `StaffOrAdmin`. | `StaffView.tsx` (`ReturnTab`, phần phụ phí), tự sinh phụ phí vào mảng `order.surcharges`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend tự tính phụ phí và đẩy vào object client. Cần gọi `GET goi-y` từ backend và gửi `POST` lưu phiếu phụ phí có đính kèm ảnh bằng chứng. |
| **UC39** | UC5.3 | Duyệt và giải quyết tranh chấp phụ phí | `PhuPhiController.cs` (`POST {id}/duyet`, `POST {id}/tu-choi`, `POST {id}/tranh-chap` - Customer, `POST {id}/giai-quyet-tranh-chap` - Admin). | `CustomerPortal.tsx` (modal khiếu nại), `AdminView.tsx` (duyệt/từ chối), `ReconciliationSheet.tsx`, `app.disputeSurcharge`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Giao diện đã có đầy đủ nút Duyệt, Từ chối, Khiếu nại và Kết luận tranh chấp của Admin. Cần chuyển từ sửa mảng local sang 4 endpoint của `PhuPhiController`. |
| **UC40** | UC5.4 | Đối soát cọc và chốt hoàn tất đơn thuê | `DoiSoatController.cs` (`GET theo-don/{donId}/xem-truoc`, `POST theo-don/{donId}`, `POST {id}/xac-nhan`, `POST {id}/xu-ly-tien`, `POST {id}/chot`), kiểm tra tiên quyết 100% đồ đã trả/kết luận mất. | `ReconciliationSheet.tsx` (>1200 dòng, quy trình 7 bước đối soát hoàn hảo), `app.confirmReconciliation`, `app.settleOrder`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Giao diện `ReconciliationSheet.tsx` được xây dựng cực kỳ công phu nhưng đang đọc từ state bộ nhớ. Cần nối chuỗi API đối soát của `DoiSoatController`. |
| **UC41** | UC5.5 | Thu tiền bổ sung tại quầy | `ThanhToanController.cs` (`POST /api/v1/thanh-toan/doi-soat/{doiSoatId}/thu-bo-sung`, `POST callback/thu-bo-sung`), DTO `TaoThuBoSungRequest`. | `ReconciliationSheet.tsx` (modal Thu tiền bổ sung `showCollectModal`: tiền mặt / POS / QR), `app.settleOrder`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần chuyển đổi modal thu tiền từ việc thêm transaction local sang gọi API thu bổ sung backend, cập nhật trạng thái phiếu đối soát. |
| **UC42** | UC5.6 | Thực hiện hoàn tiền cọc & Hoàn hủy | `HoanTienController.cs` (`GET theo-don/{donId}`, `POST {id}/xu-ly`, `POST {id}/doi-chieu`, `POST ket-qua`), kiểm tra nguồn thu gốc, không vượt số thực thu. | `ReconciliationSheet.tsx` (modal Hoàn tiền cọc `showRefundModal`, form STK ngân hàng thụ hưởng), `app.settleOrder`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Frontend đang mô phỏng hoàn tiền trong bộ nhớ. Cần gọi `POST /api/v1/hoan-tien/{id}/xu-ly` lưu chứng từ hoàn tiền và liên kết giao dịch thu gốc. |
| **UC43** | UC5.7 | Điều chỉnh tài chính sau chốt hoàn tất | `DoiSoatController.cs` (`POST /api/v1/doi-soat/{id}/dieu-chinh`), `PhuPhiController.cs` (`POST /api/v1/phu-phi/{id}/dieu-chinh`), giữ nguyên chứng từ gốc, lưu vết chênh lệch. | `ReconciliationSheet.tsx` (modal điều chỉnh `showAdjustmentModal`), `AdminExtendedTabs.tsx` (`AdjustmentsTab`), mock `initialFinancialAdjustments.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | UI quản lý hồ sơ điều chỉnh đã hoàn chỉnh. Cần kết nối API backend để đảm bảo báo cáo tài chính ghi nhận đúng số liệu sau điều chỉnh. |

---

## 6. PHÂN HỆ 6: QUẢN LÝ SẢN PHẨM VÀ THIẾT BỊ VẬT LÝ (20 USE CASES: UC44 – UC63 / UC6.1 – UC6.15 & PHỤ LỤC)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC44** | UC6.1 | Thêm danh mục sản phẩm | `Admin/DanhMucController.cs` (`POST /api/admin/danh-muc`), Policy `AdminOnly`, DTO `TaoDanhMucRequest`. | `AdminView.tsx` (`CategoriesTab`, modal Thêm danh mục), `app.saveCategory`, mock `initialCategories.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối form tạo danh mục với API backend thay vì lưu local. |
| **UC45** | UC6.1.1 | Kiểm tra cấu trúc danh mục & Chống lặp | `AdminDanhMucService.TaoMoiAsync`, validate danh mục cha phải tồn tại, thuật toán chống tạo vòng lặp cha-con. | Tích hợp trong modal chọn danh mục cha. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã có logic validate chặn vòng lặp phân cấp đa tầng. |
| **UC46** | UC6.2 | Cập nhật danh mục sản phẩm | `Admin/DanhMucController.cs` (`PUT /api/admin/danh-muc/{id}`), bảo toàn tính toàn vẹn dữ liệu đơn cũ. | `AdminView.tsx` (`CategoriesTab`, modal sửa danh mục). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi `PUT /api/admin/danh-muc/{id}` khi lưu chỉnh sửa. |
| **UC47** | UC6.3 | Tra cứu danh mục sản phẩm | `DanhMucController.cs` (`GET /api/danh-muc` - công khai), `Admin/DanhMucController.cs` (`GET /api/admin/danh-muc` - cả mục ẩn). | `LandingView.tsx`, `ProductsView.tsx`, `AdminView.tsx` (`CategoriesTab`), đọc từ `app.categories`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần bật cờ `isRealApiEnabled` và tải danh mục trực tiếp từ API backend. |
| **UC48** | UC6.4 | Thay đổi trạng thái hiển thị danh mục | `Admin/DanhMucController.cs` (`PATCH /api/admin/danh-muc/{id}/trang-thai`), cảnh báo nếu còn sản phẩm kinh doanh. | `AdminView.tsx` (`CategoriesTab`, switch toggle trạng thái), `app.setCategoryStatus`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối switch toggle với endpoint PATCH của backend. |
| **UC49** | UC6.5 | Thêm sản phẩm cho thuê mới | `Admin/SanPhamController.cs` (`POST /api/admin/san-pham`, `POST {id}/hinh-anh`), DTO `TaoSanPhamRequest`. | `AdminView.tsx` (`ProductsTab`, modal thêm sản phẩm), `app.saveProduct`, mock `initialProducts.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần đấu nối form tạo sản phẩm với API backend và hỗ trợ upload ảnh qua Multipart Form Data. |
| **UC50** | UC6.5.1 | Kiểm tra hợp lệ giá thuê và tiền cọc | `AdminSanPhamService.TaoMoiAsync`, bắt buộc giá thuê > 0, tiền cọc >= 0, tỷ lệ bồi thường hợp lý. | Validate trực tiếp trên UI modal thêm sản phẩm. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend và frontend đều có validation, cần đồng bộ thông báo lỗi trả về. |
| **UC51** | UC6.6 | Cập nhật thông tin & Giá sản phẩm | `Admin/SanPhamController.cs` (`PUT /api/admin/san-pham/{id}`), giá mới không làm đổi giá đã chốt của đơn cũ. | `AdminView.tsx` (`ProductsTab`, modal sửa sản phẩm). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi `PUT /api/admin/san-pham/{id}` khi lưu cập nhật. |
| **UC52** | UC6.7 | Tra cứu sản phẩm quản trị | `Admin/SanPhamController.cs` (`GET /api/admin/san-pham`), hỗ trợ lọc theo trạng thái kinh doanh, danh mục, tồn kho. | `AdminView.tsx` (`ProductsTab`, bảng quản trị sản phẩm). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối bảng quản trị với API server-side phân trang và tìm kiếm. |
| **UC53** | UC6.8 | Thay đổi trạng thái kinh doanh sản phẩm | `Admin/SanPhamController.cs` (`PATCH /api/admin/san-pham/{id}/trang-thai`), không xóa thiết bị vật lý và đơn đang chạy. | `AdminView.tsx` (`ProductsTab`, dropdown trạng thái kinh doanh). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi API PATCH cập nhật trạng thái (`DangKinhDoanh`, `TamNgung`, `NgungKinhDoanh`). |
| **UC54** | UC6.9 | Tra cứu thiết bị & Sổ đời thiết bị | `ThietBiController.cs` (`GET /api/thiet-bi`, `GET {id}`), `VongDoiThietBiController.cs` (`GET /api/vong-doi-thiet-bi/{id}`). | `StaffView.tsx` (`inventory` subtab, modal `EquipmentLifecycleModal`), mock `initialEquipment.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã có endpoint sổ đời phân quyền Admin (xem giá nhập) và Nhân viên. Cần nối modal vào API thật. |
| **UC55** | UC6.10 | Lập phiếu kiểm kê kho | `DieuChinhKhoController.cs` (`POST /api/dieu-chinh-kho`, `PUT {id}`, `POST {id}/gui-duyet`), DTO `LapDieuChinhKhoRequest`. | `StaffView.tsx` (nút "Kiểm kê kho", modal `InventoryAuditModal`), mock `initialStockAdjustments.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối `InventoryAuditModal` gửi danh sách kiểm kê thực tế lên backend lưu phiếu nháp. |
| **UC56** | UC6.10.1 | Đối chiếu kiểm kê thực tế & Đề xuất lệch | `DieuChinhKhoService.LapPhieuAsync`, tự động tách thiết bị đang cho thuê hợp lệ khỏi danh sách thiếu kho. | Tích hợp trong `InventoryAuditModal` (hiển thị lệch thừa/thiếu). | **Chưa hoàn thiện** (Frontend dùng Mock) | Logic loại trừ đồ đang thuê đã có ở backend, cần hiển thị cảnh báo rõ ràng trên UI. |
| **UC57** | UC6.11 | Phê duyệt điều chỉnh kho | `DieuChinhKhoController.cs` (`POST {id}/duyet-ap-dung`, `POST {id}/tu-choi`), Policy `AdminOnly`, giao dịch nguyên tử. | `AdminView.tsx` (`stock-adjust` tab, modal duyệt phiếu kiểm kê). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi `POST .../duyet-ap-dung` để cập nhật trạng thái thiết bị hàng loạt trong database. |
| **UC58** | UC6.11.1 | Kiểm tra ảnh hưởng cam kết đơn thuê | `DieuChinhKhoService.DuyetVaApDungAsync`, tích hợp `IDeviceConflictDetector`, chặn duyệt giảm nếu thiếu đồ cho đơn tương lai. | UI hiển thị bảng cảnh báo đơn bị ảnh hưởng trước khi duyệt. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi endpoint kiểm tra tác động trước khi Quản trị viên bấm xác nhận duyệt. |
| **UC59** | UC6.12 | Lập phiếu bảo dưỡng / sửa chữa | `BaoTriController.cs` (`POST /api/bao-tri`, `POST phan-cong`, `PUT tien-do`, `POST gui-kiem-tra`), DTO `LapBaoTriRequest`. | `StaffView.tsx` (`maintenance` subtab, modal `showCreateMaintenanceModal`), mock `initialMaintenance.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối form tạo phiếu bảo trì với API backend, tự động chuyển thiết bị sang `DangBaoTri`. |
| **UC60** | UC6.12.1 | Loại thiết bị bảo trì khỏi tồn khả dụng | `BaoTriService.LapPhieuAsync` cập nhật `ThietBi.TrangThai = DangBaoTri`, `KhaDungService` tự động loại trừ. | UI tự động cập nhật số lượng khả dụng. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã loại trừ thiết bị bảo trì trong tính toán khả dụng thời gian thực. |
| **UC61** | UC6.13 | Nghiệm thu bảo trì & Hoàn tất | `BaoTriController.cs` (`POST {id}/hoan-thanh` -> Sẵn sàng; `POST {id}/ket-thuc-khong-dat` -> Giữ lỗi/Thanh lý). | `StaffView.tsx` (`maintenance` subtab, modal Nghiệm thu bảo trì). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối modal nghiệm thu với 2 endpoint hoàn thành hoặc kết thúc không đạt của backend. |
| **UC62** | UC6.14 | Đề nghị & Duyệt ngừng sử dụng thiết bị | `VongDoiThietBiController.cs` (`POST {id}/de-nghi-ngung-su-dung`, `POST de-nghi/{maPhieu}/duyet`), bảo toàn mã vật phẩm và lịch sử. | `AdminView.tsx` (`equipment` tab, nút đổi trạng thái Ngừng sử dụng). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần chuyển từ đổi string local sang quy trình đề xuất và duyệt ngừng sử dụng của backend. |
| **UC63** | UC6.15 | Giáng cấp & Điều chuyển sản phẩm khác | `VongDoiThietBiController.cs` (`POST {id}/dieu-chuyen-san-pham`, `POST {id}/xem-anh-huong`), giữ nguyên serial và nguồn nhập. | `StaffView.tsx` (`inventory` subtab, modal "Chuyển loại thiết bị: {id}"). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi API kiểm tra ảnh hưởng đơn tương lai trước khi điều chuyển mã sản phẩm cho thiết bị cũ. |

---

## 7. PHÂN HỆ 7: QUẢN LÝ NHÀ CUNG CẤP VÀ NHẬP HÀNG (14 USE CASES: UC64 – UC77 / UC7.1 – UC7.10 & PHỤ LỤC)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC64** | UC7.1 | Thêm nhà cung cấp mới | `NhaCungCapController.cs` (`POST /api/nha-cung-cap`), Policy `AdminOnly`, DTO `TaoNhaCungCapRequest`. | `AdminView.tsx` (`SuppliersTab`, modal Thêm nhà cung cấp), mock `initialSuppliers.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối form thêm nhà cung cấp với API backend thay vì cập nhật mảng local. |
| **UC65** | UC7.2 | Cập nhật thông tin nhà cung cấp | `NhaCungCapController.cs` (`PUT /api/nha-cung-cap/{id}`), bảo toàn lịch sử phiếu nhập cũ. | `AdminView.tsx` (`SuppliersTab`, modal sửa thông tin NCC). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi `PUT /api/nha-cung-cap/{id}` khi lưu chỉnh sửa. |
| **UC66** | UC7.3 | Tra cứu danh sách & Hồ sơ NCC | `NhaCungCapController.cs` (`GET /api/nha-cung-cap`, `GET {id}`, `GET {id}/lich-su-nhap`). | `AdminView.tsx` (`SuppliersTab`), `StaffView.tsx` (modal `SupplierProfileModal`), đọc từ `app.suppliers`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối `SupplierProfileModal` với endpoint xem lịch sử nhập hàng thực tế của nhà cung cấp. |
| **UC67** | UC7.4 | Thay đổi tình trạng hợp tác | `NhaCungCapController.cs` (`PUT /api/nha-cung-cap/{id}/trang-thai-hop-tac`), chặn tạo phiếu nhập mới nếu ngừng hợp tác. | `AdminView.tsx` (`SuppliersTab`, switch toggle trạng thái hợp tác). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối switch với API cập nhật tình trạng hợp tác backend. |
| **UC68** | UC7.5 | Lập phiếu nhập hàng nháp | `PhieuNhapController.cs` (`POST /api/phieu-nhap`), Policy `StaffOrAdmin`, DTO `TaoPhieuNhapRequest`. | `StaffView.tsx` (`import` subtab, modal tạo phiếu nhập nháp), mock `initialImportReceipts.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối form tạo phiếu nhập nháp với API backend, lưu phiếu ở trạng thái `Nhap`. |
| **UC69** | UC7.5.1 | Kiểm tra NCC & Tính tiền nhập hàng | `PhieuNhapService.TaoNhapAsync`, kiểm tra NCC đang hợp tác, tính thành tiền từng dòng và tổng giá trị tự động. | UI modal nhập hàng tự động tính tổng tiền theo số lượng và đơn giá. | **Chưa hoàn thiện** (Frontend dùng Mock) | Logic tính tiền đã khớp, cần lưu trữ chính thức vào bảng `ChiTietPhieuNhap`. |
| **UC70** | UC7.6 | Chỉnh sửa phiếu nhập nháp | `PhieuNhapController.cs` (`PUT {id}`, `POST {id}/chi-tiet`, `PUT chi-tiet/{id}`, `DELETE chi-tiet/{id}`), tự động gộp dòng trùng. | `StaffView.tsx` & `AdminView.tsx` (modal sửa phiếu nhập nháp). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối các thao tác thêm, sửa, xóa dòng hàng với các endpoint con của `PhieuNhapController`. |
| **UC71** | UC7.7 | Kiểm tra & Xác nhận nhập kho | `PhieuNhapController.cs` (`POST /api/phieu-nhap/{id}/xac-nhan`), Policy `AdminOnly`, `NhapKhoService.XacNhanNhapKhoAsync`. | `StaffView.tsx` (`import` subtab, modal "Kiểm nhận hàng thực tế: {id}"), nút "Xác nhận nhập kho". | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend sử dụng transaction nguyên tử để sinh mã serial và tăng tồn kho. Cần nối modal kiểm nhận vào API này. |
| **UC72** | UC7.7.1 | Tự động sinh mã Serial/Barcode một lần | `NhapKhoService.XacNhanNhapKhoAsync`, sinh mã định danh vật lý duy nhất cho từng thiết bị được duyệt đạt chuẩn. | UI mô phỏng sinh mã thiết bị vào `app.equipment`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã có cơ chế sinh mã thiết bị duy nhất. Cần nhận danh sách serial thật từ backend để hỗ trợ in tem nhãn. |
| **UC73** | UC7.7.2 | Xử lý phân loại hàng lỗi khi nhận | `NhapKhoService`, phân loại: hàng đạt chuẩn -> `SanSang`, hàng lỗi nhận xử lý -> `DangBaoTri`, hàng từ chối -> không nhập kho. | UI modal kiểm nhận có 3 cột: Đạt chuẩn, Lỗi nhận sửa, Từ chối trả NCC. | **Chưa hoàn thiện** (Frontend dùng Mock) | Giao diện đã phân loại hoàn hảo, cần truyền đúng cấu trúc mảng phân loại lên API xác nhận nhập kho. |
| **UC74** | UC7.8 | Tra cứu và lọc danh sách phiếu nhập | `PhieuNhapController.cs` (`GET /api/phieu-nhap`, `GET {id}`), lọc theo NCC, trạng thái, khoảng ngày, phân trang. | `StaffView.tsx` (`import` subtab), `AdminView.tsx` (bảng quản lý phiếu nhập). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối bảng danh sách với API `GET /api/phieu-nhap` server-side filtering. |
| **UC75** | UC7.9 | Hủy phiếu nhập nháp | `PhieuNhapController.cs` (`POST /api/phieu-nhap/{id}/huy`), Policy `StaffOrAdmin`, DTO `HuyNhapRequest`. | `StaffView.tsx` & `AdminView.tsx` (nút "Hủy phiếu" trong modal xem phiếu nhập nháp). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối nút hủy phiếu với API backend, chặn không cho hủy phiếu đã nhập kho. |
| **UC76** | UC7.10 | Xử lý sai lệch phiếu đã nhập kho | `DieuChinhKhoController.cs` (`POST /api/dieu-chinh-kho` loại `SaiLechPhieuNhap`, `POST {id}/duyet-ap-dung`). | `AdminView.tsx` (`stock-adjust` tab, modal điều chỉnh sai lệch phiếu nhập). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối quy trình lập và duyệt phiếu điều chỉnh sai lệch giá/số lượng phiếu nhập với API backend. |
| **UC77** | UC7.10.1 | Lập bản điều chỉnh & Tính giá trị hiệu lực | `DieuChinhKhoService.TinhGiaTriSauDieuChinhAsync` (`GET .../hieu-luc/{maPhieuNhap}`), giữ nguyên phiếu gốc. | UI hiển thị bảng so sánh giá trị trước và sau điều chỉnh. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã có hàm tính giá trị và số lượng hiệu lực lũy kế sau điều chỉnh. Cần hiển thị trên báo cáo tài sản kho. |

---

## 8. PHÂN HỆ 8: CHÍNH SÁCH, KHUYẾN MÃI & BẢO DƯỠNG THIẾT BỊ (10 USE CASES: UC78 – UC87 / UC80 – UC89)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC78** (UC80) | UC16 / BaoTri | Lập phiếu bảo dưỡng, vệ sinh & sửa chữa | `BaoTriController.cs` (`POST /api/v1/bao-tri`), `IBaoTriService.LapPhieuAsync`, DTO `LapBaoTriRequest`, Policy `StaffOrAdmin`. | `StaffView.tsx` (Tab Bảo trì, modal tạo phiếu bảo dưỡng), mock `initialMaintenance.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã hoàn thiện logic tự động chuyển thiết bị sang `DangBaoTri`. Frontend đang ghi vào context local; cần gọi `POST /api/v1/bao-tri`. |
| **UC79** (UC81) | UC16 / BaoTri | Phân công kỹ thuật & Cập nhật tiến độ | `BaoTriController.cs` (`POST {id}/phan-cong`, `PUT {id}/tien-do`), ghi nhận chi phí thực tế và tiến độ từng giai đoạn. | `StaffView.tsx` (danh sách phiếu, form cập nhật tiến độ, ảnh linh kiện thay thế). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối form tiến độ với 2 endpoint phân công và cập nhật tiến độ của `BaoTriController`. |
| **UC80** (UC82) | UC16 / BaoTri | Nghiệm thu hoàn thành bảo trì | `BaoTriController.cs` (`POST {id}/gui-kiem-tra` - Staff, `POST {id}/hoan-thanh` - Admin, `POST {id}/ket-thuc-khong-dat` - Admin). | `AdminView.tsx` (quản lý kho), `StaffView.tsx` (nút Nghiệm thu / Trả về kho sẵn sàng). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần nối các nút Nghiệm thu vào API backend, kiểm tra quyền Admin khi xác nhận hoàn thành đưa đồ về `SanSang`. |
| **UC81** (UC83) | UC6.15 / VongDoi | Đề nghị giáng cấp & Điều chuyển thiết bị cũ | `VongDoiThietBiController.cs` (`GET {id}`, `POST {id}/xem-anh-huong`, `POST {id}/de-nghi-giang-cap`, `POST de-nghi/{id}/duyet`). | `EquipmentLifecycleModal.tsx` (hồ sơ vòng đời, nút đề nghị giáng cấp, cảnh báo đơn tương lai). | **Chưa hoàn thiện** (Frontend dùng Mock) | Đã có giao diện modal vòng đời thiết bị, cần gọi API kiểm tra ảnh hưởng đơn tương lai và duyệt giáng cấp của Admin. |
| **UC82** (UC84) | UC16 / VongDoi | Đề nghị ngừng sử dụng & Thanh lý thiết bị | `VongDoiThietBiController.cs` (`POST {id}/de-nghi-ngung-su-dung`, `POST de-nghi/{id}/duyet`), chuyển trạng thái `NgungSuDung`. | `EquipmentLifecycleModal.tsx` và Tab `equipment` của `AdminView.tsx`, mock `initialStockAdjustments.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi API backend khi xác nhận ngừng sử dụng thiết bị hư hại không thể phục hồi. |
| **UC83** (UC85) | UC8.1, UC8.1.1 | Cấu hình chính sách thuê, hủy & phiên bản | `Admin/ChinhSachController.cs` (`GET chinh-sach`, `GET {id}`, `POST kiem-tra`, `POST chinh-sach`), tạo phiên bản mới không hồi tố. | `AdminExtendedTabs.tsx` (`PoliciesTab`, modal so sánh diff cũ-mới, lý do ban hành), mock `initialPolicies.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | UI `PoliciesTab` cực kỳ hiện đại với diff trực quan. Cần kết nối API backend để tải phiên bản và lưu phiên bản chính sách mới. |
| **UC84** (UC86) | UC8.2, UC8.2.1 | Tạo chiến dịch khuyến mãi & Ràng buộc cọc | `Admin/KhuyenMaiController.cs` (`POST /api/v1/admin/khuyen-mai`), Policy `AdminOnly`, ràng buộc: KHÔNG giảm cọc. | `AdminView.tsx` (`promotions` tab, modal tạo mã ưu đãi), mock `initialPromotions.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã có validation chặn giảm tiền cọc và kiểm tra trùng mã. Cần kết nối form tạo khuyến mãi với API. |
| **UC85** (UC87) | UC8.3, UC8.3.1 | Cập nhật khuyến mãi & Khóa ưu đãi đã chốt | `Admin/KhuyenMaiController.cs` (`PUT {id}`), khóa không cho sửa mức giảm/tiền thuê tối thiểu nếu đã có đơn chốt, lỗi 409. | `AdminView.tsx` (`promotions` tab, form sửa khuyến mãi). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần gọi `PUT .../khuyen-mai/{id}`, bắt mã lỗi 409 Conflict từ backend để hiển thị cảnh báo vi phạm cam kết đơn cũ. |
| **UC86** (UC88) | UC8.4 | Tra cứu khuyến mãi & Thống kê sử dụng | `Admin/KhuyenMaiController.cs` (`GET khuyen-mai`, `GET {id}`, `GET {id}/su-dung`), danh sách đơn thuê đã dùng mã. | `AdminView.tsx` (`promotions` tab), `PromotionDetailModal.tsx` (danh sách đơn đã dùng mã). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối bảng danh sách và modal chi tiết với các endpoint thống kê lượt sử dụng của backend. |
| **UC87** (UC89) | UC8.5 | Tạm ẩn / Ngừng kích hoạt khuyến mãi | `Admin/KhuyenMaiController.cs` (`POST {id}/tam-an`, `POST {id}/hien-thi`), bảo toàn quyền lợi đơn đã thanh toán. | `AdminView.tsx` (`promotions` tab, nút toggle tạm ẩn / kích hoạt). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối nút toggle với endpoint `tam-an` và `hien-thi` của backend. |

---

## 9. PHÂN HỆ 9: ĐÁNH GIÁ, CHĂM SÓC KHÁCH HÀNG & THÔNG BÁO (8 USE CASES: UC88 – UC95 / UC90 – UC97)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC88** (UC90) | UC9.1, UC9.1.1 | Gửi đánh giá sản phẩm sau khi thuê | `DanhGiaController.cs` (`POST /api/v1/danh-gia`, `GET du-dieu-kien`), ràng buộc: chỉ đơn Hoàn tất mới được đánh giá, 1 lần/món. | `CustomerPortal.tsx` (Tab Đơn hàng & Tab Đánh giá chuyến đi), mock `initialReviews.ts`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã có logic kiểm tra điều kiện sở hữu đơn hoàn tất. Cần kết nối form gửi đánh giá với API backend. |
| **UC89** (UC91) | UC9.1.2 | Đính kèm hình ảnh trải nghiệm | `TaoDanhGiaRequest.DanhSachAnh` (hỗ trợ mảng tối đa 5 URL ảnh chụp thực tế chuyến đi). | `CustomerPortal.tsx`, form viết đánh giá có input chọn ảnh và thumbnail xem trước. | **Chưa hoàn thiện** (Frontend dùng Mock) | UI đã có thumbnail preview. Cần đảm bảo payload gửi lên `POST /api/v1/danh-gia` chứa mảng link ảnh đầy đủ. |
| **UC90** (UC92) | UC9.1 | Xem đánh giá công khai & Phân bố sao | `DanhGiaController.cs` (`GET san-pham/{id}`, `GET san-pham/{id}/tong-hop`), `[AllowAnonymous]`, lọc sao, phân bố 1-5 sao. | `ProductsView.tsx` (modal chi tiết sản phẩm, widget đánh giá sao, danh sách review khách). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối 2 endpoint truy vấn đánh giá công khai vào giao diện chi tiết sản phẩm. |
| **UC91** (UC93) | UC9.2, UC9.2.1 | Kiểm duyệt đánh giá vi phạm & Lý do ẩn | `Admin/DanhGiaController.cs` (`GET danh-gia`, `POST {id}/an`, `POST {id}/khoi-phuc`), Policy `AdminOnly`, lưu căn cứ vi phạm. | `AdminExtendedTabs.tsx` (`ReviewsTab`, modal chọn căn cứ vi phạm: Thô tục/Spam/Phản cảm, nút Khôi phục). | **Chưa hoàn thiện** (Frontend dùng Mock) | Giao diện kiểm duyệt đầy đủ tính năng. Cần kết nối các thao tác Ẩn/Khôi phục vào API backend. |
| **UC92** (UC94) | Nghiệp vụ mở rộng | Phản hồi đánh giá từ phía cửa hàng | Entity `DanhGia` đã có các trường `PhanHoiCuaHang`, `ThoiDiemPhanHoi`, `NguoiPhanHoi`. **Thiếu endpoint controller**. | `ReviewsTab` đã có nút "💬 Phản hồi" và form nhập nội dung phản hồi chính thức của cửa hàng. | **Chưa hoàn thiện / Thiếu API** | Backend cần bổ sung endpoint `POST /api/v1/admin/danh-gia/{id}/phan-hoi` trong `Admin/DanhGiaController.cs`. Sau đó nối form vào endpoint này. |
| **UC93** (UC95) | UC9.3, UC9.3.1 | Xem thông báo nghiệp vụ & Deep-link | `ThongBaoController.cs` (`GET thong-bao`, `GET chua-doc/dem`, `POST {id}/da-doc`, `POST da-doc-tat-ca`). | Navbar Bell icon, dropdown thông báo, trang xem chi tiết tại `CustomerPortal.tsx` và `StaffView.tsx`. | **Chưa hoàn thiện** (Frontend dùng Mock) | Đã có giao diện chuông và deep-link click mở đơn/đánh giá. Cần kết nối các thao tác đánh dấu đã đọc vào API backend. |
| **UC94** (UC96) | UC9.4, UC9.4.1 | Quản trị & Phát hành thông báo hệ thống | `Admin/ThongBaoController.cs` (`POST /api/v1/admin/thong-bao`), Policy `AdminOnly`, DTO `GuiThongBaoAdminRequest`. | `AdminExtendedTabs.tsx` (`NotificationsTab`, form soạn thông báo, chọn nhóm nhận, cấu hình deep-link). | **Hoàn thành** | Đã kết nối API qua `fakeApi.notifications.sendAdmin()`. Cần kiểm thử E2E phân phối thông báo đến client. |
| **UC95** (UC97) | Nghiệp vụ mở rộng | Quản lý hàng chờ thông báo lỗi & Gửi lại | `Admin/ThongBaoController.cs` (`GET gui-loi`, `POST {id}/thu-lai`), chống duplicate send. | **Thiếu UI** hàng chờ gửi lỗi trong `NotificationsTab`. | **Chưa hoàn thiện / Thiếu UI** | Backend đã sẵn sàng 2 API. Cần dựng thêm sub-tab hoặc modal "Hàng chờ gửi lỗi" trong `NotificationsTab` và nút Thử lại. |

---

## 10. PHÂN HỆ 10: BÁO CÁO, PHÂN TÍCH KINH DOANH & KIỂM TOÁN (7 USE CASES: UC96 – UC102 / UC98 – UC102)

| Mã Kế hoạch | Mã Đặc tả | Tên Nghiệp vụ Use Case | Hiện trạng Backend (API / Service / Entity / Policy) | Hiện trạng Frontend (View / Component / Store / Mock) | Đánh giá Hiện trạng | Khoảng cách Kỹ thuật & Gaps cần xử lý |
|:---:|:---:|:---|:---|:---|:---:|:---|
| **UC96** (UC98) | UC10.1, UC10.1.1 | Xem báo cáo vận hành kho & Hiệu suất | `BaoCaoVanHanhController.cs`, `BaoCaoKhoController.cs`. **GAP:** Đang gắn `[Authorize(Policy = "AdminOnly")]`. | `AdminView.tsx` (Sub-tab `operational` trong `reports`, 6 chỉ tiêu, bar công suất, drill-down). | **Chưa hoàn thiện / Sai phân quyền** | Backend cần sửa policy thành `[Authorize(Policy = "StaffOrAdmin")]` vì Nhân viên cần xem vận hành kho. Frontend cần nối API báo cáo thay vì tính nhẩm local. |
| **UC97** (UC99) | UC10.2, UC10.2.1 | Báo cáo doanh thu thuần (không cộng cọc) | `Admin/BaoCaoTaiChinhController.cs` (`doanh-thu-hoan-tat`, `phi-huy`, `dieu-chinh`, `xuat-csv`), chuẩn kế toán 100%. | `AdminView.tsx` (Sub-tab `revenue` trong `reports`, thẻ doanh thu thuần, widget tỷ lệ hủy đơn & khách quay lại). | **Chưa hoàn thiện** (Frontend dùng Mock) | Backend đã tuân thủ triệt để nguyên tắc không tính cọc vào doanh thu. Frontend cần gọi API lấy số liệu chính xác từ backend. |
| **UC98** (UC100) | UC10.2.1 | Báo cáo phân tích dòng tiền (Cashflow) | `Admin/BaoCaoTaiChinhController.cs` (`thu-hoan`, `can-xu-ly`), tính theo ngày giao dịch tiền thật (Inflow - Outflow). | `AdminView.tsx` (Sub-tab `cashflow` trong `reports`, thẻ Inflow xanh lá, Outflow đỏ, Net Cashflow, bảng giao dịch). | **Chưa hoàn thiện** (Frontend dùng Mock) | Phân biệt rõ ràng giữa Doanh thu và Dòng tiền. Frontend cần kết nối API `thu-hoan` để hiển thị dòng tiền thực tế. |
| **UC99** (UC101) | UC10.3 | Báo cáo nhập hàng & Giá trị tài sản kho | `Admin/BaoCaoKhoController.cs` (`nhap-hang`, `dieu-chinh-nhap`, `lich-su-don-gia`, `xuat-csv`). | `AdminView.tsx` (Sub-tab `inventory` trong `reports`, tổng tài sản kho, lọc theo NCC, danh sách lô nhập). | **Chưa hoàn thiện** (Frontend dùng Mock) | Cần kết nối sub-tab nhập kho với các endpoint báo cáo kho và lịch sử đơn giá nhập bình quân của backend. |
| **UC100** (UC102) | UC10.4 | Tra cứu nhật ký hệ thống (Audit Log) | `Admin/NhatKyController.cs` (`GET /api/v1/admin/nhat-ky`), Read-only bất biến. **GAP:** Đang gắn `[Authorize(Policy = "AdminOnly")]`. | `AdminExtendedTabs.tsx` (`AuditLogTab`, bảng timeline kiểm toán, bộ lọc theo người thực hiện, thời gian). | **Chưa hoàn thiện / Sai phân quyền** | Cần sửa phân quyền `NhatKyController.cs` cho phép `StaffOrAdmin` (nhân viên tra cứu log công việc cá nhân). Cần kết nối phân trang server-side qua fakeApi. |
| **UC101** | UC10.4.1 | Lọc & Xuất nhật ký kiểm toán hệ thống | `Admin/NhatKyController.cs`, hỗ trợ lọc đa tiêu chí (`maTaiKhoan`, `hanhDong`, `loaiDoiTuong`, `tuNgay`, `denNgay`, `tuKhoa`). | Tích hợp trong thanh công cụ lọc của `AuditLogTab`. | **Chưa hoàn thiện** (Frontend dùng Mock) | API backend đã hỗ trợ đầy đủ các tham số lọc phân trang `PagedResult`. |
| **UC102** | UC10.4.2 | Mở xem chứng từ liên quan từ Audit Log | `Admin/NhatKyController.cs`, trường `ThamChieuUrl` trỏ đến API chứng từ gốc (`DON_THUE`, `PHIEU_NHAP`, `PHIEU_BAO_TRI`...). | `AuditLogTab`, click mã chứng từ mở modal xem chứng từ gốc (`inspectDoc`) và modal chi tiết biến động. | **Hoàn thành UI** / **Cần đồng bộ API** | UI đã hỗ trợ click mở modal xem chứng từ rất trực quan. Cần đảm bảo dữ liệu log trả về từ API backend map đúng với URL chứng từ. |

---

# PHẦN III: DANH MỤC MOCK DATA FRONTEND CẦN THAY THẾ TOÀN DIỆN & KIẾN TRÚC API CLIENT

## 1. Bảng đối chiếu toàn diện các tệp Mock Data tại Frontend

Hệ thống Frontend GearGo hiện đang tồn tại **16 tệp dữ liệu Mock** đặt tại thư mục `frontend/src/data/` cùng cơ chế lưu trữ cục bộ tại `App.tsx` (`STORAGE_KEY = "geargo-demo-state-v2"`). Để đưa hệ thống vận hành thực tế 100% với Backend ASP.NET Core, toàn bộ danh mục dưới đây phải được thay thế tuần tự theo bảng ánh xạ:

| STT | Tệp Mock Data nguồn | Biến dữ liệu / Đối tượng Mock | Phân hệ liên quan | Use Cases chịu tác động | API Endpoints Backend thay thế chính thức | Hướng xử lý chuyển đổi |
|:---:|:---|:---|:---:|:---:|:---|:---|
| 1 | `src/data/initialCustomers.ts` | `INITIAL_CUSTOMERS` | M1 | UC01, UC02, UC04, UC05, UC11, UC13 | `POST /api/auth/dang-ky`<br>`POST /api/auth/dang-nhap`<br>`GET /api/v1/admin/tai-khoan?vaiTro=KhachHang` | Thay thế bằng API xác thực và quản trị tài khoản; giữ lại tệp mock làm seed data cho unit test. |
| 2 | `src/data/initialStaff.ts` | `INITIAL_STAFF_ACCOUNTS` | M1 | UC02, UC07, UC08, UC09, UC10, UC11 | `POST /api/v1/admin/nhan-vien`<br>`PUT /api/v1/admin/nhan-vien/{id}`<br>`GET /api/v1/admin/nhan-vien`<br>`POST .../doi-vai-tro` | Chuyển đổi bảng Nhân viên sang gọi trực tiếp `NhanVienController`. |
| 3 | `src/data/initialProducts.ts` | `INITIAL_PRODUCTS` | M2, M6 | UC17, UC18, UC19, UC49, UC51, UC52, UC53 | `GET /api/san-pham`<br>`GET /api/san-pham/{id}`<br>`POST /api/admin/san-pham`<br>`PUT /api/admin/san-pham/{id}` | Kích hoạt API thật trong `fakeApi.catalog.getProducts()` và các tab quản trị sản phẩm. |
| 4 | `src/data/initialCategories.ts` | `INITIAL_CATEGORIES` | M2, M6 | UC17, UC44, UC45, UC46, UC47, UC48 | `GET /api/danh-muc`<br>`POST /api/admin/danh-muc`<br>`PUT /api/admin/danh-muc/{id}`<br>`PATCH .../trang-thai` | Tải cây danh mục trực tiếp từ backend; áp dụng cơ chế In-Memory Cache ở client. |
| 5 | `src/data/initialEquipment.ts` | `INITIAL_EQUIPMENT` | M4, M6 | UC31, UC32, UC33, UC54, UC62, UC63 | `GET /api/thiet-bi`<br>`GET /api/vong-doi-thiet-bi/{id}`<br>`POST /api/chuan-bi-don/{id}/phan-cong` | Chuyển toàn bộ danh sách thiết bị vật lý, mã serial, barcode sang đọc từ database qua `ThietBiController`. |
| 6 | `src/data/initialOrders.ts` | `INITIAL_ORDERS`, `DEMO_ORDER`, `DEMO_ORDER_COMPLETED` | M3, M4, M5 | UC26, UC29, UC30, UC31 – UC43 | `GET /api/v1/don-thue`<br>`POST /api/v1/don-thue`<br>`GET /api/v1/van-hanh/don-thue`<br>`POST /api/v1/thanh-toan/*`<br>`POST /api/v1/doi-soat/*` | **File mock trọng yếu nhất**: Thay thế toàn bộ thao tác đặt đơn, bàn giao, nhận trả, đối soát sang các Controller nghiệp vụ. |
| 7 | `src/data/initialStockAdjustments.ts` | `INITIAL_STOCK_ADJUSTMENTS` | M6, M7 | UC55, UC56, UC57, UC58, UC76, UC77 | `POST /api/dieu-chinh-kho`<br>`POST /api/dieu-chinh-kho/{id}/duyet-ap-dung` | Thay thế quy trình kiểm kê kho và sai lệch phiếu nhập sang `DieuChinhKhoController`. |
| 8 | `src/data/initialMaintenance.ts` | `INITIAL_MAINTENANCE_RECEIPTS` | M6, M8 | UC59, UC60, UC61, UC78, UC79, UC80 | `GET /api/v1/bao-tri`<br>`POST /api/v1/bao-tri`<br>`PUT .../tien-do`<br>`POST .../hoan-thanh` | Kết nối quy trình bảo dưỡng, sửa chữa và nghiệm thu vật tư vào `BaoTriController`. |
| 9 | `src/data/initialSuppliers.ts` | `INITIAL_SUPPLIERS` | M7 | UC64, UC65, UC66, UC67 | `GET /api/nha-cung-cap`<br>`POST /api/nha-cung-cap`<br>`PUT /api/nha-cung-cap/{id}`<br>`PUT .../trang-thai-hop-tac` | Kết nối CRUD và lịch sử nhập hàng nhà cung cấp qua `NhaCungCapController`. |
| 10 | `src/data/initialImportReceipts.ts` | `INITIAL_IMPORT_RECEIPTS` | M7 | UC68, UC69, UC70, UC71, UC74, UC75 | `GET /api/phieu-nhap`<br>`POST /api/phieu-nhap`<br>`POST /api/phieu-nhap/{id}/xac-nhan`<br>`POST .../huy` | Kết nối chuỗi nhập kho, phân loại hàng lỗi và sinh serial tự động qua `PhieuNhapController`. |
| 11 | `src/data/initialPromotions.ts` | `INITIAL_PROMOTIONS` | M3, M8 | UC25, UC84, UC85, UC86, UC87 | `GET /api/v1/admin/khuyen-mai`<br>`POST /api/v1/admin/khuyen-mai`<br>`PUT .../{id}`<br>`POST /api/gio-thue/ma-giam-gia` | Đồng bộ mã giảm giá giữa giỏ thuê khách hàng và màn hình quản trị chiến dịch ưu đãi. |
| 12 | `src/data/initialPolicies.ts` | `INITIAL_POLICIES`, `INITIAL_POLICY_VERSIONS` | M3, M8 | UC28, UC83 | `GET /api/v1/admin/chinh-sach`<br>`POST /api/v1/admin/chinh-sach`<br>`GET /api/v1/don-thue/{id}/chinh-sach` | Tải phiên bản chính sách đang hiệu lực và lịch sử các snapshot chính sách từ backend. |
| 13 | `src/data/initialReviews.ts` | `INITIAL_REVIEWS` | M9 | UC88, UC89, UC90, UC91, UC92 | `GET /api/v1/danh-gia/san-pham/{id}`<br>`POST /api/v1/danh-gia`<br>`POST /api/v1/admin/danh-gia/{id}/an` | Kết nối đánh giá khách hàng và kiểm duyệt vi phạm qua `DanhGiaController`. |
| 14 | `src/data/initialNotifications.ts` | `INITIAL_NOTIFICATIONS` | M9 | UC93, UC94, UC95 | `GET /api/v1/thong-bao`<br>`POST .../{id}/da-doc`<br>`POST /api/v1/admin/thong-bao` | Kết nối chuông thông báo người dùng và cổng phát thông báo quản trị hệ thống. |
| 15 | `src/data/initialAuditLogs.ts` | `INITIAL_AUDIT_LOGS` | M10 | UC100, UC101, UC102 | `GET /api/v1/admin/nhat-ky` | Kết nối bảng timeline kiểm toán và mở chứng từ liên quan qua `NhatKyController`. |
| 16 | `src/data/initialFinancialAdjustments.ts` | `INITIAL_FINANCIAL_ADJUSTMENTS` | M5, M10 | UC43, UC97 | `GET /api/v1/admin/bao-cao/tai-chinh/dieu-chinh`<br>`POST /api/v1/doi-soat/{id}/dieu-chinh` | Kết nối hồ sơ điều chỉnh tài chính sau chốt và đồng bộ vào báo cáo doanh thu. |
| 17 | `src/services/fakeApi.ts` | Object `fakeApi` | Toàn bộ 10 phân hệ | Toàn bộ 102 Use Cases | Toàn bộ 160+ Endpoints | Chuyển đổi cờ mặc định `isRealApiEnabled() = true`. Thay thế logic mock delay nội hàm bằng gọi trực tiếp `apiClient`. |
| 18 | `src/App.tsx` | Khóa `STORAGE_KEY = "geargo-demo-state-v2"` | Toàn bộ 10 phân hệ | Toàn bộ 102 Use Cases | Database SQL Server thông qua ASP.NET Core API | **Loại bỏ lưu trữ toàn bộ thực thể kinh doanh vào localStorage**. Chỉ duy trì lưu trữ: `auth_token`, `user_session`, `theme_mode`. |

---

## 2. Kiến trúc Data Mapper & Adapter tầng API Client

### 2.1. Vấn đề lệch chuẩn dữ liệu (Data Impedance Mismatch)
- **Backend ASP.NET Core:** Sử dụng C# Model thuộc tính PascalCase (`MaDonThue`, `TongTien`, `TrangThaiDonThue`, `NgayNhanDuKien`). Khi serialize sang JSON qua System.Text.Json, các trường được chuyển sang camelCase tiếng Việt không dấu (`maDonThue`, `tongTien`, `trangThai`, `ngayNhanDuKien`). Khóa chính sử dụng kiểu số nguyên `long` (Int64).
- **Frontend React 18:** Hiện đang sử dụng TypeScript Interface theo phong cách tiếng Anh camelCase (`orderId`, `totalAmount`, `status`, `rentalStartDate`, `depositTotal`). Nhiều nơi coi ID là kiểu `string` (ví dụ `"DT-001"`, `"KH-102"`).

### 2.2. Thiết kế tầng Data Mappers (`frontend/src/services/mappers/`)
Để không làm xáo trộn cấu trúc component UI hiện tại mà vẫn đảm bảo tích hợp 100% với Backend, triển khai các bộ chuyển đổi chuẩn:
1. `orderMapper.ts`: Chuyển đổi giữa `DonThueDto` (Backend) và `Order` (Frontend UI Type). Tự động parse `id` số nguyên thành chuỗi mã đơn hiển thị `DT{id.PadLeft(6, '0')}` và ngược lại.
2. `equipmentMapper.ts`: Chuyển đổi `ThietBiDto` <-> `EquipmentItem`.
3. `reconciliationMapper.ts`: Chuyển đổi `PhieuDoiSoatDto` <-> `ReconciliationRecord`.
4. `authMapper.ts`: Chuyển đổi `ThongTinToiDto` <-> `CurrentUser`.

```
                    ┌─────────────────────────┐
                    │   React UI Components   │ (Giữ nguyên Types hiện tại)
                    └────────────▲────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Service Data Mappers  │ (Chuyển đổi kiểu & chuẩn hóa)
                    │ (orderMapper, etc.)     │
                    └────────────▲────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     apiClient.ts        │ (Axios / Fetch + JWT Interceptors)
                    └────────────▲────────────┘
                                 │ HTTP Bearer
                    ┌────────────▼────────────┐
                    │ ASP.NET Core Controllers│ (C# 10 / Web API)
                    └─────────────────────────┘
```

---

# PHẦN IV: KẾ HOẠCH PHÂN BỔ SUBAGENT & LỘ TRÌNH TRIỂN KHAI CHI TIẾT

Khối lượng công việc tích hợp 102 Use Cases được cấu trúc thành **10 Gói công việc độc lập (Work Packages - WP)** tương ứng với 10 Phân hệ, triển khai theo **4 Đợt (Phases)** tuần tự và song song nhằm triệt tiêu xung đột mã nguồn.

```
TIẾN TRÌNH TRIỂN KHAI THEO ĐỢT (PHASE ROADMAP):

[ĐỢT 1: NỀN TẢNG CỐT LÕI (FOUNDATION)]
├── WP-M01: Phân hệ 1 (Xác thực, Tài khoản & Phân quyền - 16 UCs)
├── WP-M06: Phân hệ 6 (Quản lý Danh mục, Sản phẩm & Thiết bị - 20 UCs)
└── WP-M07: Phân hệ 7 (Nhà cung cấp & Nhập kho Thiết bị - 14 UCs)
         │
         ▼
[ĐỢT 2: NGHIỆP VỤ ĐẶT THUÊ & VẬN HÀNH KHO (BOOKING & OPERATIONS)]
├── WP-M02: Phân hệ 2 (Tra cứu Sản phẩm & Tư vấn Dụng cụ AI - 6 UCs)
├── WP-M03: Phân hệ 3 (Giỏ hàng, Báo giá & Đặt thuê - 8 UCs)
└── WP-M04: Phân hệ 4 (Giao nhận, Bàn giao BBBG & Nhận trả PNT - 6 UCs)
         │
         ▼
[ĐỢT 3: TÀI CHÍNH, ĐỐI SOÁT CỌC & CHÍNH SÁCH (SETTLEMENT & POLICIES)]
├── WP-M05: Phân hệ 5 (Thanh toán, Lập phụ phí & Đối soát cọc - 7 UCs)
└── WP-M08: Phân hệ 8 (Chính sách, Khuyến mãi & Bảo dưỡng thiết bị - 10 UCs)
         │
         ▼
[ĐỢT 4: CHĂM SÓC KHÁCH HÀNG, BÁO CÁO & KIỂM TOÁN (ANALYTICS & ENGAGEMENT)]
├── WP-M09: Phân hệ 9 (Đánh giá sau thuê, CSKH & Thông báo đa kênh - 8 UCs)
└── WP-M10: Phân hệ 10 (Báo cáo doanh thu, Dòng tiền & Audit Log - 7 UCs)
```

---

## 1. Gói 1: Subagent WP-M01 (Phân hệ 1: Tài khoản & Nhân viên – 16 UCs: UC01 – UC16)
- **Phụ trách:** Xác thực, Hồ sơ cá nhân, Quản trị nhân viên, Phân quyền & Khóa tài khoản.
- **Phụ thuộc (Dependencies):** Không phụ thuộc (Khởi chạy đầu tiên).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung Rate Limiting cho `POST /api/auth/dang-ky` (chống spam).
  - [ ] **Backend:** Hoàn thiện `EmailNotificationAdapter` gửi mã OTP khôi phục mật khẩu thật.
  - [ ] **Frontend:** Xây dựng `src/services/api/authApi.ts` và `staffApi.ts`.
  - [ ] **Frontend:** Đấu nối `RegisterView` gọi `POST /api/auth/dang-ky`, bắt lỗi trùng email/SĐT.
  - [ ] **Frontend:** Đấu nối `ForgotPasswordView` (3 bước) với API quên mật khẩu và đặt lại mật khẩu.
  - [ ] **Frontend:** Kết nối `StaffTab` (`AdminView.tsx`) với `/api/v1/admin/nhan-vien` (Thêm, Sửa, Đổi vai trò, Khóa/Mở).
  - [ ] **Frontend:** Kết nối `CustomersTab` (`AdminExtendedTabs.tsx`) với `/api/v1/admin/tai-khoan?vaiTro=KhachHang`.
  - [ ] **Tiêu chí nghiệm thu (Verification):** Đăng ký tài khoản mới thành công -> Đăng nhập nhận JWT -> Sửa hồ sơ -> Khóa tài khoản thử đăng nhập bị chặn ngay lập tức.

---

## 2. Gói 2: Subagent WP-M06 (Phân hệ 6: Sản phẩm & Thiết bị – 20 UCs: UC44 – UC63)
- **Phụ trách:** Quản lý cây danh mục, Sản phẩm, Sổ đời thiết bị, Kiểm kê kho, Bảo trì & Vòng đời.
- **Phụ thuộc:** Cần hoàn thành WP-M01 (để có Token Admin/Staff).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra validate chống vòng lặp danh mục cha-con (`DanhMucService`).
  - [ ] **Backend:** Hoàn thiện API Upload ảnh sản phẩm `POST /api/admin/san-pham/{id}/hinh-anh`.
  - [ ] **Frontend:** Xây dựng `catalogApi.ts`, `equipmentApi.ts`, `inventoryApi.ts`.
  - [ ] **Frontend:** Nối `CategoriesTab` với CRUD `Admin/DanhMucController.cs`.
  - [ ] **Frontend:** Nối `ProductsTab` với CRUD `Admin/SanPhamController.cs`.
  - [ ] **Frontend:** Nối `EquipmentLifecycleModal` (Sổ đời) với `GET /api/vong-doi-thiet-bi/{id}`.
  - [ ] **Frontend:** Nối quy trình Kiểm kê kho (`InventoryAuditModal`) và Duyệt kiểm kê với `DieuChinhKhoController`.
  - [ ] **Frontend:** Nối quy trình Lập phiếu bảo dưỡng và Nghiệm thu bảo dưỡng với `BaoTriController`.
  - [ ] **Frontend:** Nối chức năng Điều chuyển sản phẩm / Giáng cấp với `VongDoiThietBiController`.
  - [ ] **Tiêu chí nghiệm thu:** Tạo danh mục -> Tạo sản phẩm kèm ảnh -> Quản lý serial thiết bị -> Lập phiếu kiểm kê và duyệt điều chỉnh kho thành công.

---

## 3. Gói 3: Subagent WP-M07 (Phân hệ 7: Nhà cung cấp & Nhập hàng – 14 UCs: UC64 – UC77)
- **Phụ trách:** Quản trị đối tác NCC, Phiếu nhập hàng nháp, Kiểm nhận hàng thực tế, Sinh mã serial một lần & Xử lý sai lệch nhập.
- **Phụ thuộc:** Cần hoàn thành WP-M01 và WP-M06 (có danh mục sản phẩm để nhập).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo tính nguyên tử của `NhapKhoService.XacNhanNhapKhoAsync` (tự động sinh mã Serial/Barcode và tăng tồn kho).
  - [ ] **Backend:** Bổ sung rule chặn tạo phiếu nhập khi NCC có trạng thái `NgungHopTac`.
  - [ ] **Frontend:** Xây dựng `supplierApi.ts` và `importReceiptApi.ts`.
  - [ ] **Frontend:** Nối `SuppliersTab` với `NhaCungCapController` (CRUD, Đổi trạng thái hợp tác).
  - [ ] **Frontend:** Nối modal `SupplierProfileModal` với `GET /api/nha-cung-cap/{id}/lich-su-nhap`.
  - [ ] **Frontend:** Nối form Lập phiếu nhập nháp, Sửa nháp, Hủy nháp với `PhieuNhapController`.
  - [ ] **Frontend:** Nối modal Kiểm nhận hàng thực tế và Xác nhận nhập kho với `POST /api/phieu-nhap/{id}/xac-nhan`.
  - [ ] **Frontend:** Nối chức năng Điều chỉnh sai lệch phiếu nhập kho với `DieuChinhKhoController`.
  - [ ] **Tiêu chí nghiệm thu:** Tạo NCC -> Lập phiếu nhập nháp -> Xác nhận nhập kho -> Kiểm tra thiết bị mới tự động xuất hiện trong kho với mã serial duy nhất.

---

## 4. Gói 4: Subagent WP-M02 (Phân hệ 2: Tra cứu & Tư vấn Dụng cụ AI – 6 UCs: UC17 – UC22)
- **Phụ trách:** Tìm kiếm, lọc sản phẩm công khai, kiểm tra tồn kho khả dụng theo ngày thuê & Trợ lý tư vấn AI.
- **Phụ thuộc:** Cần hoàn thành WP-M06 (đã có sản phẩm và tồn kho trong database).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Cấu hình API Key dịch vụ AI trong `appsettings.json` (OpenAI / Gemini) cho `AIProviderAdapter`.
  - [ ] **Backend:** Tối ưu hóa truy vấn kiểm tra khả dụng `KhaDungService.KiemTraKhaDungAsync`.
  - [ ] **Frontend:** Xây dựng `aiAdvisorApi.ts`.
  - [ ] **Frontend:** Nối `ProductsView.tsx` với `GET /api/san-pham` kèm tham số lọc từ khóa, danh mục, khoảng giá và ngày thuê.
  - [ ] **Frontend:** Nối `AIAdvisorView` với `POST /api/tu-van/bo-do` và `POST /api/tu-van/bo-do/them-vao-gio`.
  - [ ] **Tiêu chí nghiệm thu:** Tìm kiếm sản phẩm theo lịch thuê hiển thị đúng số lượng khả dụng -> Hỏi AI tư vấn combo đồ -> Bấm thêm trọn bộ vào giỏ hàng thành công.

---

## 5. Gói 5: Subagent WP-M03 (Phân hệ 3: Quản lý Đặt thuê – 8 UCs: UC23 – UC30)
- **Phụ trách:** Giỏ hàng, Tính báo giá block 24h, Áp mã ưu đãi, Tạo đơn thuê, Giữ chỗ 15 phút, Snapshot chính sách & Hủy đơn.
- **Phụ thuộc:** Cần hoàn thành WP-M01 (khách đăng nhập) và WP-M02 (sản phẩm trong giỏ).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Đảm bảo `DonThueExpirationJob` giải phóng giữ chỗ và hoàn trả mã khuyến mãi chuẩn xác sau 15 phút.
  - [ ] **Backend:** Kiểm tra Snapshot chính sách lưu trữ toàn vẹn JSON tại thời điểm tạo đơn.
  - [ ] **Frontend:** Xây dựng `rentalCartApi.ts` và `orderApi.ts`.
  - [ ] **Frontend:** Nối `CartView` với 7 endpoints của `GioThueController`.
  - [ ] **Frontend:** Nối `CheckoutView` với `POST /api/v1/don-thue`, nhận `maDonThue` và `hanThanhToan`.
  - [ ] **Frontend:** Khởi tạo đồng hồ đếm ngược 15 phút trên UI dựa trên `hanThanhToan` từ API response.
  - [ ] **Frontend:** Nối `MyOrdersView` với trọn bộ 5 API truy vấn đơn thuê của tôi.
  - [ ] **Frontend:** Nối modal Hủy đơn với `GET .../huy/xem-truoc` và `POST .../huy`.
  - [ ] **Tiêu chí nghiệm thu:** Thêm đồ vào giỏ -> Áp mã giảm giá -> Tạo đơn thành công -> Đơn ở trạng thái `ChoThanhToan` kèm đồng hồ đếm ngược 15 phút.

---

## 6. Gói 6: Subagent WP-M04 (Phân hệ 4: Giao nhận & Nhận trả – 6 UCs: UC31 – UC36)
- **Phụ trách:** Phân công serial kho, Bàn giao BBBG, Nhận trả PNT (nhiều đợt), Quá hạn & Tra cứu vận hành.
- **Phụ thuộc:** Cần hoàn thành WP-M03 (có đơn thuê đã xác nhận) và WP-M06 (có thiết bị vật lý).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Kiểm tra tích hợp `DeviceConflictDetector` khi nhân viên phân công serial cụ thể.
  - [ ] **Backend:** Kiểm tra Strategy Pattern nghiệm thu nhận trả (`NhanTraService`).
  - [ ] **Frontend:** Xây dựng `handoverApi.ts` và `returnApi.ts`.
  - [ ] **Frontend:** Nối `HandoverTab` (sub-tab prep) với 6 endpoints của `ChuanBiDonController`.
  - [ ] **Frontend:** Nối `HandoverTab` (sub-tab handover) với 4 endpoints của `BanGiaoController` (Tạo nháp, Lưu checklist, Chốt BBBG).
  - [ ] **Frontend:** Nối `ReturnTab` với 7 endpoints của `NhanTraController` (Hỗ trợ nhận trả nhiều đợt `UC4.3.1`).
  - [ ] **Frontend:** Nối màn hình Quá hạn với `QuaHanController` (xem danh sách đơn tương lai bị ảnh hưởng).
  - [ ] **Frontend:** Nối `OrdersTab` với `VanHanh/DonThueController` (tìm kiếm vận hành đa tiêu chí).
  - [ ] **Tiêu chí nghiệm thu:** Phân công serial cho đơn -> Bàn giao tại quầy chốt BBBG (đơn đổi sang `DangThue`) -> Nhận trả kiểm tra đồ và chốt PNT (đơn chuyển sang `ChoDoiSoat`).

---

## 7. Gói 7: Subagent WP-M05 (Phân hệ 5: Thanh toán & Đối soát cọc – 7 UCs: UC37 – UC43)
- **Phụ trách:** Xác nhận thanh toán VietQR, Lập phụ phí tổn thất, Duyệt/Tranh chấp phụ phí, Đối soát cọc 7 bước, Thu bổ sung, Hoàn tiền & Điều chỉnh sau chốt.
- **Phụ thuộc:** Cần hoàn thành WP-M03 (đơn chờ thanh toán) và WP-M04 (đơn đã nhận trả chờ đối soát).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Hoàn thiện mock adapter gateway thanh toán / hoàn tiền cho môi trường dev.
  - [ ] **Backend:** Kiểm tra tính toàn vẹn của logic khóa hai chiều trong `DoiSoatService` (khóa không cho tạo thêm phụ phí khi đã chốt đối soát).
  - [ ] **Frontend:** Xây dựng `paymentApi.ts`, `surchargeApi.ts`, `reconciliationApi.ts`, `refundApi.ts`.
  - [ ] **Frontend:** Nối `OrderConfirmedView` (khung VietQR) với `POST /api/v1/thanh-toan/xac-nhan`.
  - [ ] **Frontend:** Nối quy trình Lập và Duyệt/Từ chối/Khiếu nại phụ phí trong `ReturnTab` và `CustomerPortal` với `PhuPhiController`.
  - [ ] **Frontend:** Nối giao diện `ReconciliationSheet.tsx` (7 bước) với chuỗi API `DoiSoatController` (Xem trước, Lập, Xác nhận, Xử lý tiền, Chốt).
  - [ ] **Frontend:** Nối modal Thu thêm và Hoàn tiền cọc với API thanh toán bổ sung và xử lý hoàn tiền.
  - [ ] **Frontend:** Nối modal Điều chỉnh tài chính sau chốt và tab `AdjustmentsTab` với API điều chỉnh.
  - [ ] **Tiêu chí nghiệm thu:** Thanh toán đơn chuyển `DaXacNhan` -> Khi nhận trả phát sinh hỏng lập phụ phí -> Đối soát cọc tính đúng `Cọc - Phụ phí` -> Hoàn tiền cọc thừa -> Chốt đơn thành `HoanTat`.

---

## 8. Gói 8: Subagent WP-M08 (Phân hệ 8: Chính sách, Khuyến mãi & Vòng đời – 10 UCs: UC78 – UC87)
- **Phụ trách:** Cấu hình phiên bản chính sách, Quản lý chiến dịch ưu đãi, Khóa ưu đãi đã cam kết, Bảo dưỡng vật tư & Thanh lý/Giáng cấp thiết bị.
- **Phụ thuộc:** Chạy song song sau khi hoàn thành Đợt 2.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Viết Integration test kiểm tra ràng buộc không cho sửa mã ưu đãi đã có khách áp dụng (`DIEU_KHOAN_MA_DA_CAM_KET`).
  - [ ] **Frontend:** Xây dựng `policyApi.ts` và `promotionApi.ts`.
  - [ ] **Frontend:** Nối `PoliciesTab` (`AdminExtendedTabs.tsx`) với `Admin/ChinhSachController` (tải phiên bản, diff so sánh, ban hành mới).
  - [ ] **Frontend:** Nối Tab `promotions` với CRUD và Tạm ẩn/Kích hoạt của `Admin/KhuyenMaiController`.
  - [ ] **Frontend:** Nối `PromotionDetailModal` với endpoint thống kê lượt sử dụng `GET .../su-dung`.
  - [ ] **Frontend:** Hoàn thiện tích hợp quy trình sửa chữa thiết bị hỏng và thanh lý thiết bị trong `StaffView.tsx` và `EquipmentLifecycleModal`.
  - [ ] **Tiêu chí nghiệm thu:** Tạo khuyến mãi -> Áp dụng thử vào đơn thuê -> Sửa điều khoản chính bị chặn lỗi 409 -> Ban hành phiên bản chính sách mới thành công.

---

## 9. Gói 9: Subagent WP-M09 (Phân hệ 9: Đánh giá & Thông báo đa kênh – 8 UCs: UC88 – UC95)
- **Phụ trách:** Khách đánh giá sau thuê (kèm ảnh), Xem điểm sao công khai, Admin kiểm duyệt vi phạm, Cửa hàng phản hồi, Chuông thông báo, Phát thông báo hệ thống & Hàng chờ lỗi.
- **Phụ thuộc:** Cần hoàn thành WP-M05 (đơn đã đạt trạng thái `HoanTat`).
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Bổ sung endpoint `POST /api/v1/admin/danh-gia/{id}/phan-hoi` trong `Admin/DanhGiaController.cs` và service.
  - [ ] **Frontend:** Xây dựng `reviewApi.ts` và `notificationApi.ts`.
  - [ ] **Frontend:** Nối `CustomerPortal.tsx` (Tab Đánh giá chuyến đi) với `POST /api/v1/danh-gia` (kiểm tra đơn hoàn tất, upload tối đa 5 ảnh).
  - [ ] **Frontend:** Nối `ProductsView.tsx` với 2 endpoint xem đánh giá và biểu đồ phân bố sao.
  - [ ] **Frontend:** Nối `ReviewsTab` (`AdminExtendedTabs.tsx`) với API Ẩn vi phạm, Khôi phục và Phản hồi cửa hàng.
  - [ ] **Frontend:** Nối Navbar Bell icon và trang thông báo với API đánh dấu đã đọc của `ThongBaoController`.
  - [ ] **Frontend:** Dựng thêm UI "Hàng chờ gửi lỗi" và nút "Thử lại" trong `NotificationsTab` (UC95 / UC97).
  - [ ] **Tiêu chí nghiệm thu:** Đơn hoàn tất xuất hiện trong danh sách đủ điều kiện đánh giá -> Khách gửi review 5 sao kèm ảnh -> Review hiển thị tại trang sản phẩm -> Admin phát thông báo hệ thống nhận được tức thì.

---

## 10. Gói 10: Subagent WP-M10 (Phân hệ 10: Báo cáo, Tài chính & Kiểm toán – 7 UCs: UC96 – UC102)
- **Phụ trách:** Báo cáo vận hành kho (6 chỉ tiêu, drill-down), Báo cáo doanh thu thuần (chuẩn kế toán, không cộng cọc), Phân tích dòng tiền (Inflow/Outflow), Báo cáo nhập hàng tài sản kho & Tra cứu Audit Log mở chứng từ.
- **Phụ thuộc:** Cần hoàn thành toàn bộ dữ liệu từ M1 đến M9.
- **Checklist công việc độc lập:**
  - [ ] **Backend:** Sửa phân quyền tại `BaoCaoVanHanhController.cs` và `NhatKyController.cs` từ `[Authorize(Policy = "AdminOnly")]` thành `[Authorize(Policy = "StaffOrAdmin")]` (cho phép nhân viên xem vận hành và log cá nhân).
  - [ ] **Frontend:** Xây dựng `reportApi.ts` và `auditApi.ts`.
  - [ ] **Frontend:** Nối 4 sub-tab trong Tab `reports` (`AdminView.tsx`):
    - Sub-tab Vận hành -> `GET /api/v1/admin/bao-cao-van-hanh`.
    - Sub-tab Doanh thu thuần -> `GET /api/v1/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat` và `phi-huy`.
    - Sub-tab Dòng tiền -> `GET /api/v1/admin/bao-cao/tai-chinh/thu-hoan`.
    - Sub-tab Nhập kho -> `GET /api/v1/admin/bao-cao/kho/nhap-hang` và `lich-su-don-gia`.
  - [ ] **Frontend:** Nối `AuditLogTab` với `GET /api/v1/admin/nhat-ky`, đảm bảo tính năng click mở chứng từ liên quan (`UC10.4.2`) điều hướng chính xác.
  - [ ] **Tiêu chí nghiệm thu:** Báo cáo doanh thu chỉ ghi nhận từ đơn Hoàn tất, cọc tách riêng thành khoản nợ phải trả -> Báo cáo dòng tiền khớp các giao dịch thu/hoàn tiền mặt và ngân hàng -> Audit Log ghi nhận đầy đủ mọi thao tác nghiệp vụ.

---

# PHẦN V: TIÊU CHÍ NGHIỆM THU & CHIẾN LƯỢC KIỂM THỬ (VERIFICATION STRATEGY)

## 1. Tiêu chí nghiệm thu kỹ thuật theo 4 cấp độ

1. **Cấp độ 1: Unit & Domain Integrity (Cơ chế toàn vẹn nghiệp vụ)**
   - Không chứa bất kỳ dữ liệu hardcoded hoặc facade giả lập kết quả.
   - 100% logic nghiệp vụ được thực thi thực tế trong Database SQL Server thông qua Entity Framework Core.
   - Concurrency Check: Thao tác đặt thuê, phân công serial, đối soát cọc không bị Race Condition khi có 2 tác nhân cùng thao tác tại 1 mili-giây.

2. **Cấp độ 2: API Contract Compliance (Tuân thủ hợp đồng API)**
   - 100% các endpoint trả về đúng HTTP Status Code: `200 OK`, `201 Created`, `400 Bad Request` (kèm danh sách lỗi validation tiếng Việt), `401 Unauthorized`, `403 Forbidden` (khi vi phạm RBAC), `404 Not Found`, `409 Conflict` (khi vi phạm cam kết chính sách/khuyến mãi).
   - Bảo mật IDOR: Tuyệt đối không cho phép tài khoản A truy cập đơn thuê hoặc thông tin của tài khoản B bằng cách sửa ID trên request.

3. **Cấp độ 3: UI/UX & State Transition Consistency (Trải nghiệm người dùng)**
   - Vô hiệu hóa hoàn toàn `geargo-demo-state-v2` trong `localStorage` đối với dữ liệu nghiệp vụ. Khi refresh trình duyệt (F5), dữ liệu hiển thị phải đồng nhất với dữ liệu lưu trữ tại Database.
   - Xử lý trạng thái Loading Spinner và Error Boundary mượt mà tại tất cả các bảng và form submit.

4. **Cấp độ 4: Kịch bản kiểm thử tích hợp xuyên suốt E2E Flow (12 Bước nghiệp vụ vàng)**

```
KỊCH BẢN KIỂM THỬ TÍCH HỢP XUYÊN SUỐT VÒNG ĐỜI THỰC TẾ:

[Bước 01] Đăng ký khách hàng mới -> Đăng nhập nhận JWT Token hợp lệ (M1).
    │
[Bước 02] Admin tạo danh mục "Lều dã ngoại" & Sản phẩm "Lều Eureka 4P" kèm ảnh (M6).
    │
[Bước 03] Admin lập phiếu nhập kho 10 chiếc Lều từ NCC -> Xác nhận nhập kho, sinh 10 mã serial duy nhất (M7).
    │
[Bước 04] Khách hàng dùng Trợ lý AI tư vấn combo cắm trại -> Thêm Lều vào giỏ thuê (M2).
    │
[Bước 05] Khách chọn lịch thuê 3 ngày, nhập mã giảm giá 10% -> Tạo đơn thuê thành công (M3).
    │
[Bước 06] Đơn ở trạng thái ChoThanhToan -> Đồng hồ đếm ngược 15 phút kích hoạt giữ chỗ (M3).
    │
[Bước 07] Khách quét VietQR thanh toán tiền thuê + cọc -> Đơn chuyển DaXacNhan (M5).
    │
[Bước 08] Nhân viên kho kiểm tra đồ -> Phân công mã serial cụ thể -> Báo SanSangNhan (M4).
    │
[Bước 09] Khách đến quầy -> Đối chiếu CCCD, kiểm tra đồ, chụp ảnh -> Chốt BBBG -> Đơn chuyển DangThue (M4).
    │
[Bước 10] Khách hoàn trả đồ -> Nhân viên kiểm tra phát hiện rách lều -> Lập PNT + Phụ phí đền bù (M4, M5).
    │
[Bước 11] Đối soát cọc 7 bước -> Cấn trừ cọc vào phụ phí rách lều -> Hoàn trả phần cọc thừa -> Chốt HoanTat (M5).
    │
[Bước 12] Khách đánh giá 5 sao chuyến đi kèm ảnh (M9) -> Báo cáo tài chính ghi nhận doanh thu thuần đúng chuẩn (M10).
```

---

## 2. Kế hoạch kiểm thử tải & Độ an toàn đồng thời (Concurrency & Stress Testing)

1. **Kiểm tra giữ chỗ 15 phút (Expiration Concurrency):**
   - Khởi tạo 2 phiên khách hàng cùng đặt thuê chiếc lều cuối cùng trong kho tại cùng một thời điểm.
   - Kết quả mong đợi: Khách hàng bấm trước giữ chỗ thành công; khách hàng bấm sau nhận mã lỗi thân thiện `SAN_PHAM_VUA_DUOC_GIU_CHO`. Sau 15 phút nếu khách trước không thanh toán, Background Job giải phóng giữ chỗ và món đồ hiển thị khả dụng trở lại.
2. **Kiểm tra tính bất biến của Snapshot chính sách và chứng từ đã chốt:**
   - Sau khi đơn hoàn tất, Admin sửa giá thuê sản phẩm hoặc ban hành phiên bản chính sách mới.
   - Kết quả mong đợi: Đơn cũ và biên bản đối soát cũ giữ nguyên 100% giá trị và điều khoản đã chốt tại thời điểm giao dịch, không bị hồi tố.
3. **Kiểm tra thu hồi Token (Logout & Password Change Security):**
   - Người dùng đăng xuất hoặc đổi mật khẩu.
   - Sử dụng lại token cũ để gọi API.
   - Kết quả mong đợi: Hệ thống từ chối ngay lập tức với mã lỗi `401 Unauthorized` do token đã nằm trong Blacklist Cache.

---

# PHẦN VI: TỔNG KẾT VÀ BÀN GIAO THỰC THI

Kế hoạch triển khai toàn diện cho 10 phân hệ (102 Use Cases) của Hệ thống Quản trị & Cho thuê Dụng cụ Dã ngoại GearGo đã được cấu trúc chi tiết, phân định ranh giới kỹ thuật rạch ròi giữa Backend C# ASP.NET Core và Frontend React 18 TypeScript.

Tài liệu này là căn cứ kỹ thuật tối cao để Orchestrator phê duyệt và phân bổ các Subagent chuyên trách bắt tay vào lập trình theo từng gói công việc độc lập. Toàn bộ mã nguồn sau triển khai sẽ được teamwork_auditor độc lập rà soát và kiểm chứng tính toàn vẹn.
