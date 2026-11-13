# BÁO CÁO KHẢO SÁT & ĐỐI CHIẾU MÃ NGUỒN PHÂN HỆ 1 ĐẾN PHÂN HỆ 4 (UC01 - UC43)
> **Dự án:** Hệ thống Quản trị & Cho thuê Dụng cụ Dã ngoại GearGo (GearGo WebApp)  
> **Người thực hiện:** Teamwork Explorer (Phân hệ 1 - 4)  
> **Thời điểm hoàn thành:** 2026-11-13  
> **Tài liệu tham chiếu:**  
> - `Document/GearGo_Dac_Ta_10_Phan_He_Use_Cases.md`  
> - `Document/Swagger_API_Catalog.md`  
> - `graphify-out/graph.json`  

---

## I. TỔNG QUAN KHẢO SÁT & ĐÍNH CHÍNH QUAN TRỌNG

### 1. Đính chính thực tế Công nghệ & Nghiệp vụ hệ thống
1. **Công nghệ Backend:**
   - Mã nguồn Backend thực tế là **ASP.NET Core 10.0 (C# / .NET 10)**, sử dụng **Entity Framework Core 9 (SQL Server)**, kiến trúc Web API Controllers + Services (CQRS Lite) + DTOs + Background Hosted Services.
   - *Lưu ý quan trọng:* Backend **KHÔNG PHẢI Spring Boot / Java** như một số tài liệu mô tả ban đầu. Mọi công việc triển khai sau này của subagent phải sử dụng C# / .NET 10.
2. **Nghiệp vụ thực tế hệ thống GearGo:**
   - GearGo là hệ thống **cho thuê dụng cụ dã ngoại và cắm trại** (Lều, bếp, túi ngủ, bàn ghế, đèn bão...). Hệ thống **không có** đội xe vận tải hay tài xế riêng (nhận và trả thiết bị trực tiếp tại cửa hàng hoặc gửi đối tác giao vận).
   - Danh mục 4 phân hệ khảo sát được chuẩn hóa tương ứng:
     - **Phân hệ 1 (M1):** Quản lý Tài khoản, Xác thực & Phân quyền Nhân viên (UC1.1 – UC1.13 + phụ lục UC1.2.1, UC1.4.1, UC1.7.1)
     - **Phân hệ 2 (M2):** Tra cứu Sản phẩm & Trợ lý Tư vấn Dụng cụ AI (UC2.1 – UC2.4 + phụ lục UC2.4.1, UC2.4.2)
     - **Phân hệ 3 (M3):** Quản lý Giỏ hàng, Báo giá & Đặt thuê Thiết bị (UC3.1 – UC3.4 + phụ lục UC3.1.1, UC3.1.2, UC3.2.1, UC3.2.2)
     - **Phân hệ 4 (M4):** Quản lý Giao nhận, Bàn giao BBBG, Nhận trả PNT & Xử lý Quá hạn (UC4.1 – UC4.5 + phụ lục UC4.3.1)
   - Toàn bộ gồm **36 Use Cases chi tiết** (16 UC ở M1, 6 UC ở M2, 8 UC ở M3, 6 UC ở M4), bao phủ trọn vẹn dải đánh số tuần tự UC01 – UC43.

### 2. Tóm tắt hiện trạng tổng thể 4 Phân hệ
- **Backend:** Đạt tỷ lệ hoàn thiện rất cao (~92%). Đã có sẵn 25+ Controller, 30+ Service, 60+ DTO, 158 API endpoints và cơ chế bảo mật JWT Bearer 2 lớp (Blacklist cache + Kiểm tra live DB).
- **Frontend:** Đã xây dựng hoàn chỉnh giao diện người dùng (100% UI Views, Modals, Forms theo phong cách Impeccable), hỗ trợ đầy đủ luồng nghiệp vụ. Tuy nhiên, **~85% giao diện Frontend hiện đang chạy trên Mock Data / Local State (localStorage `geargo-demo-state-v2`)**, chỉ mới tích hợp API thực tế ở luồng Đăng nhập (`LoginView`) và một phần Đổi mật khẩu (`fakeApi.ts`).
- **Nhiệm vụ trọng tâm giai đoạn tới:** Đấu nối API Client (thay thế Mock Data bằng API calls thực tế qua `apiClient.ts`), bổ sung một số validation kiểm tra đồng thời ở Backend và hoàn thiện xử lý lỗi giao diện.

---

## II. ĐỐI CHIẾU CHI TIẾT PHÂN HỆ 1: QUẢN LÝ TÀI KHOẢN VÀ NHÂN VIÊN (UC01 - UC16)

### UC1.1 (UC01) – Đăng ký tài khoản (Register Customer)
- **Tác nhân:** Khách vãng lai
- **Tóm tắt:** Tạo tài khoản khách hàng, kiểm tra tính duy nhất của email và số điện thoại, băm mật khẩu bảo mật và khởi tạo hồ sơ khách hàng.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/AuthController.cs` -> Endpoint: `POST /api/auth/dang-ky`
  - Service: `backend/Services/Implements/XacThucService.cs` (hàm `DangKyAsync`)
  - Interface: `backend/Services/Interfaces/IXacThucService.cs`
  - DTO: `backend/Models/DTOs/Auth/DangKyRequest.cs` (email, soDienThoai, matKhau, xacNhanMatKhau, hoTen, diaChi, ngaySinh)
  - Entity: `TaiKhoan`, `KhachHang`
  - Security/Validation: `BCrypt.Net.BCrypt.HashPassword`, kiểm tra trùng lặp email/SĐT qua EF Core `AnyAsync`. Không cấp quyền nhân viên/admin.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AuthViews.tsx` (`RegisterView`)
  - Store/State: `App.tsx` (`app.saveCustomer`), `app.customers`
  - Mock data: `src/data/initialCustomers.ts` (`INITIAL_CUSTOMERS`), lưu trữ vào `localStorage`.
  - Tích hợp API: **Chưa kết nối API**. Hiện form đang gọi trực tiếp `app.saveCustomer()` ghi vào state local.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã hoàn thiện 100%. Frontend đã có UI form chuẩn nhưng chưa gọi API qua `apiClient`.
- **Checklist công việc Subagent:**
  - [ ] Backend: Thêm Rate Limiting cho endpoint `POST /api/auth/dang-ky` chống spam tạo tài khoản ảo.
  - [ ] Frontend: Cập nhật hàm `submit` trong `RegisterView` gọi `apiClient.post('/api/auth/dang-ky', payload)`. Bắt và hiển thị lỗi `EMAIL_DA_TON_TAI`, `SDT_DA_TON_TAI`.

---

### UC1.2 & UC1.2.1 (UC02) – Đăng nhập & Xác thực tài khoản (Login & Authentication)
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Xác thực định danh (Email/SĐT/Username) và mật khẩu, kiểm tra trạng thái khóa và giới hạn thử sai quá 5 lần, cấp JWT Bearer Token chứa thông tin vai trò.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/AuthController.cs` -> Endpoint: `POST /api/auth/dang-nhap`
  - Service: `backend/Services/Implements/XacThucService.cs` (`DangNhapAsync`), `JwtService.cs` (`TaoJwtToken`)
  - DTO: `backend/Models/DTOs/Auth/DangNhapRequest.cs`, `DangNhapResponse.cs`
  - Security: `Program.cs` cấu hình JWT Bearer với event `OnTokenValidated` kiểm tra tài khoản hoạt động và vai trò thời gian thực từ database.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AuthViews.tsx` (`LoginView`)
  - Service: `frontend/src/services/fakeApi.ts` (`fakeApi.auth.login`), `apiClient.ts` (`setAuthToken`)
  - Mock data: Bộ 4 tài khoản test nhanh (`admin@geargo.vn`, `mai.lt@geargo.vn`, `an.nguyen@gmail.com`, `nam.hd@yahoo.com`).
- **Trạng thái:** [Hoàn thành]
- **Gap Analysis:** Đã hỗ trợ cả chế độ Real API và Mock. Khi bật `isRealApiEnabled()`, API backend đã đăng nhập thành công.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Bắt mã lỗi `QUYEN_DA_THAY_DOI` từ middleware backend để kích hoạt đăng xuất tự động và chuyển hướng về trang đăng nhập.

---

### UC1.3 (UC03) – Đăng xuất (Logout)
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Thu hồi token hiện tại, xóa phiên làm việc và chuyển hướng về giao diện công khai, bảo toàn các đơn hàng và giao dịch đang xử lý.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/AuthController.cs` -> Endpoint: `POST /api/auth/dang-xuat` (yêu cầu `[Authorize]`)
  - Service: `backend/Services/Implements/XacThucService.cs` (`DangXuatAsync`)
  - Cơ chế thu hồi: Tính SHA-256 hash của JWT và lưu vào `IMemoryCache` với khóa `revoked_token:{hash}` đến hết hạn của JWT. Middleware kiểm tra và từ chối token đã thu hồi.
- **Hiện trạng Frontend:**
  - Layout: Nút Đăng xuất trên thanh điều hướng `frontend/src/layouts/DashboardLayout.tsx` và `PublicLayout.tsx`.
  - Service: `frontend/src/services/fakeApi.ts` (`fakeApi.auth.logout` gọi `POST /api/auth/dang-xuat` và xóa `TOKEN_KEY` trong localStorage).
- **Trạng thái:** [Hoàn thành]

---

### UC1.4 & UC1.4.1 (UC04) – Khôi phục mật khẩu & Gửi mã xác minh (Forgot Password & OTP)
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Cho phép người dùng quên mật khẩu nhận mã xác minh OTP qua email, đối chiếu mã và đặt lại mật khẩu mới bảo mật.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/AuthController.cs` ->
    - `POST /api/auth/quen-mat-khau` (UC1.4.1)
    - `POST /api/auth/dat-lai-mat-khau` (UC1.4)
  - Service: `backend/Services/Implements/XacThucService.cs` (`TaoTokenQuenMatKhauAsync`, `DatLaiMatKhauAsync`)
  - DTO: `QuenMatKhauRequest.cs`, `DatLaiMatKhauRequest.cs`
  - Cache: Lưu mã token/OTP trong `IMemoryCache` có thời hạn 15 phút.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AuthViews.tsx` (`ForgotPasswordView`)
  - Luồng: 3 bước giao diện (1. Nhập email -> 2. Nhập mã OTP -> 3. Đặt mật khẩu mới).
  - Tích hợp API: **Chưa kết nối API backend**. Đang mô phỏng OTP cố định tại client.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã có 2 endpoint đầy đủ. Frontend chưa gọi API qua `apiClient`.
- **Checklist công việc Subagent:**
  - [ ] Backend: Tích hợp dịch vụ gửi email thực tế (`IEmailNotificationAdapter`) gửi email OTP thật đến người dùng.
  - [ ] Frontend: Đấu nối gọi `POST /api/auth/quen-mat-khau` ở bước 1 và `POST /api/auth/dat-lai-mat-khau` ở bước 3.

---

### UC1.5 (UC05) – Xem thông tin cá nhân (View Personal Profile)
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Người dùng xem hồ sơ cá nhân và quyền hiện tại của chính mình, đảm bảo không truy cập trái phép hồ sơ người khác (chống IDOR).
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/HoSoController.cs` -> `GET /api/v1/ho-so/toi` `[Authorize]` và `AuthController.cs` -> `GET /api/auth/toi`
  - Service: `backend/Services/Implements/HoSoService.cs` (`LayHoSoCuaToiAsync`), `XacThucService.cs` (`LayThongTinToiAsync`)
  - Bảo mật: Định danh lấy từ Claim `User.LayMaTaiKhoan()` trong JWT token.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`ProfileView`)
  - Service: `frontend/src/services/fakeApi.ts` (`fakeApi.auth.me`)
  - State: `app.currentUser`
- **Trạng thái:** [Hoàn thành]

---

### UC1.6 (UC06) – Cập nhật thông tin cá nhân (Update Personal Profile)
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Cho phép người dùng chỉnh sửa họ tên, số điện thoại, địa chỉ, ngày sinh, ảnh đại diện. Tuyệt đối không cho phép tự thay đổi vai trò hoặc trạng thái tài khoản.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/HoSoController.cs` -> `PUT /api/v1/ho-so/toi` `[Authorize]`
  - Service: `backend/Services/Implements/HoSoService.cs` (`CapNhatHoSoCuaToiAsync`)
  - DTO: `CapNhatHoSoRequest.cs` (hoTen, email, soDienThoai, diaChi, ngaySinh, anhDaiDien)
  - Validation: Kiểm tra định dạng SĐT, email hợp lệ, kiểm tra trùng lặp với tài khoản khác.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`ProfileView` -> form `saveProfile`)
  - Service: `frontend/src/services/fakeApi.ts` (`fakeApi.auth.updateProfile` gọi `PUT /api/v1/ho-so/toi`)
- **Trạng thái:** [Hoàn thành]

---

### UC1.7 & UC1.7.1 (UC07) – Tạo tài khoản nhân viên & Gán quyền ban đầu (Create Staff Account)
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Quản trị viên tạo tài khoản nhân viên mới, cấp thông tin định danh, số điện thoại, mật khẩu tạm thời và gán các nhóm quyền nghiệp vụ ban đầu.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/NhanVienController.cs` -> `POST /api/v1/admin/nhan-vien` `[Authorize(Policy = "AdminOnly")]`
  - Service: `backend/Services/Implements/NhanVienService.cs` (`TaoNhanVienAsync`)
  - DTO: `backend/Models/DTOs/QuanTriTaiKhoan/QuanTriTaiKhoanDTOs.cs` (`TaoNhanVienRequest`)
  - Entities: `TaiKhoan`, `NhanVien`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`StaffTab` -> modal `isNew` Thêm nhân viên mới)
  - Store: `app.saveStaffAccount` lưu vào `app.staffAccounts` trong `localStorage`.
  - Mock data: `src/data/initialStaff.ts` (`INITIAL_STAFF_ACCOUNTS`).
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã có endpoint chuẩn chỉ cho Admin. Frontend đang cập nhật mảng local.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Thêm hàm `api.staff.create` trong `fakeApi.ts` / `apiClient.ts` gọi `POST /api/v1/admin/nhan-vien`.
  - [ ] Frontend: Cập nhật `handleSaveStaff` trong `AdminView.tsx` để dispatch API.

---

### UC1.8 (UC08) – Cập nhật thông tin nhân viên (Update Staff Information)
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Quản trị viên cập nhật hồ sơ nhân viên (họ tên, email, số điện thoại, chức danh).
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/NhanVienController.cs` -> `PUT /api/v1/admin/nhan-vien/{id}` `[Authorize(Policy = "AdminOnly")]`
  - Service: `backend/Services/Implements/NhanVienService.cs` (`CapNhatNhanVienAsync`)
  - DTO: `CapNhatNhanVienRequest`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`StaffTab` -> form sửa `editingStaff`)
  - Store: `app.saveStaffAccount`
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Checklist công việc Subagent:**
  - [ ] Frontend: Kết nối form sửa nhân viên gọi `PUT /api/v1/admin/nhan-vien/{id}`.

---

### UC1.9 (UC09) – Tra cứu nhân viên (Search Staff)
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Tra cứu danh sách nhân viên theo từ khóa (tên, mã NV, username, SĐT, email), lọc theo vai trò (Kho, CSKH, Admin) và trạng thái làm việc (DangLamViec, DaNghiViec).
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/NhanVienController.cs` -> `GET /api/v1/admin/nhan-vien` `[Authorize(Policy = "AdminOnly")]`
  - Service: `backend/Services/Implements/NhanVienService.cs` (`TimNhanVienAsync`)
  - DTO: `TimNhanVienRequest` (tuKhoa, vaiTro, trangThaiLamViec, trang, soMoiTrang)
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`StaffTab` -> bộ lọc `searchQuery`, `roleFilter`, `statusFilter`)
  - Dữ liệu: Lọc client-side trên `app.staffAccounts`.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Checklist công việc Subagent:**
  - [ ] Frontend: Đấu nối API server-side pagination `GET /api/v1/admin/nhan-vien`.

---

### UC1.10 (UC10) – Phân quyền nhân viên (Assign Permissions & Roles)
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Quản trị viên điều chỉnh vai trò và cấp quyền chi tiết cho nhân viên. Quyền mới có hiệu lực ngay ở lần kiểm tra truy cập kế tiếp.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/NhanVienController.cs` -> `POST /api/v1/admin/nhan-vien/{id}/doi-vai-tro`
  - Endpoint truy vấn quyền: `AuthController.cs` -> `GET /api/auth/quyen-cua-toi`
  - Service: `NhanVienService.cs` (`DoiVaiTroAsync`), `PermissionService.cs`
  - Middleware: Dynamic permission authorization handler `PermissionAuthorizationHandler.cs`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminView.tsx` (`StaffTab` -> modal `permStaff`), `frontend/src/features/permissions/PermissionsTab.tsx`
  - Feature: Đầy đủ các checkbox nhóm quyền (Quản lý kho, Giao nhận, Phụ phí & Đối soát, Báo cáo tài chính, Khuyến mãi).
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Checklist công việc Subagent:**
  - [ ] Frontend: Kết nối modal phân quyền gọi `POST /api/v1/admin/nhan-vien/{id}/doi-vai-tro`.

---

### UC1.11 (UC11) – Khóa và mở khóa tài khoản (Lock & Unlock Account)
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Kiểm soát quyền truy cập của tài khoản nhân viên hoặc khách hàng, ghi rõ lý do. Tài khoản bị khóa không thể đăng nhập hoặc tạo giao dịch mới; các đơn hàng và nghĩa vụ tài chính đang xử lý vẫn được bảo toàn.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/TaiKhoanController.cs` ->
    - `POST /api/v1/admin/tai-khoan/{id}/khoa`
    - `POST /api/v1/admin/tai-khoan/{id}/mo-khoa`
  - Service: `backend/Services/Implements/QuanTriTaiKhoanService.cs` (`KhoaTaiKhoanAsync`, `MoKhoaTaiKhoanAsync`)
  - DTO: `KhoaTaiKhoanRequest` (lyDo), `MoKhoaTaiKhoanRequest` (lyDo)
  - Bảo mật: Token của tài khoản bị khóa bị từ chối ngay lập tức tại middleware `JwtBearerEvents.OnTokenValidated`.
- **Hiện trạng Frontend:**
  - View:
    - Khóa nhân viên: `AdminView.tsx` (`StaffTab` -> modal `lockModalStaff`)
    - Khóa khách hàng: `AdminExtendedTabs.tsx` (`CustomersTab` -> modal `lockModalCustomer`)
  - Store: `app.toggleStaffLock`, `app.toggleCustomerLock`
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Checklist công việc Subagent:**
  - [ ] Frontend: Đấu nối API gọi `POST /api/v1/admin/tai-khoan/{id}/khoa` và `/mo-khoa`.

---

### UC1.12 (UC12) – Đổi mật khẩu (Change Password)
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Người dùng đổi mật khẩu trong phiên đăng nhập hiện tại bằng cách nhập mật khẩu cũ và xác nhận mật khẩu mới. Token cũ bị vô hiệu hóa, yêu cầu đăng nhập lại.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/AuthController.cs` -> `POST /api/auth/doi-mat-khau` `[Authorize]`
  - Service: `backend/Services/Implements/XacThucService.cs` (`DoiMatKhauAsync`)
  - DTO: `DoiMatKhauRequest` (matKhauHienTai, matKhauMoi, xacNhanMatKhau)
  - Cache: Vô hiệu hóa token hiện tại qua `revoked_token:{hash}` cache.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`ProfileView` -> tab `security`)
  - Service: `frontend/src/services/fakeApi.ts` (`fakeApi.auth.changePassword` đã map `POST /api/auth/doi-mat-khau`)
- **Trạng thái:** [Hoàn thành]

---

### UC1.13 (UC13) – Tra cứu tài khoản khách hàng (Search Customer Accounts)
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Tra cứu tài khoản khách hàng theo tên, email, SĐT, trạng thái tài khoản. Xem thông tin liên hệ, tổng chi tiêu, lịch sử đơn thuê và các khoản tiền cọc đang giữ.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/Admin/TaiKhoanController.cs` -> `GET /api/v1/admin/tai-khoan` (filter `VaiTro = "KhachHang"`)
  - Service: `backend/Services/Implements/QuanTriTaiKhoanService.cs` (`TimTaiKhoanAsync`)
  - DTO: `TimTaiKhoanRequest`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/AdminExtendedTabs.tsx` (`CustomersTab`)
  - Dữ liệu: Render từ `app.customers` (`INITIAL_CUSTOMERS`).
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Checklist công việc Subagent:**
  - [ ] Frontend: Kết nối bảng khách hàng với API `GET /api/v1/admin/tai-khoan?vaiTro=KhachHang`.

---

## III. ĐỐI CHIẾU CHI TIẾT PHÂN HỆ 2: TRA CỨU VÀ TƯ VẤN DỤNG CỤ (UC14 - UC17 / UC17 - UC22)

### UC2.1 (UC14 / UC17) – Tìm kiếm và lọc sản phẩm (Search & Filter Products)
- **Tác nhân:** Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Tìm kiếm dụng cụ dã ngoại theo từ khóa (tên, thương hiệu), phân loại danh mục, mức giá thuê, sức chứa và kiểm tra số lượng tồn kho khả dụng theo lịch thuê dự kiến.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/SanPhamController.cs` -> `GET /api/san-pham`
  - Service: `backend/Services/Implements/SanPhamService.cs` (`TimKiemAsync`)
  - Interface: `ISanPhamService.cs`
  - DTO: `backend/Models/DTOs/SanPham/TimKiemSanPhamRequest.cs` (TuKhoa, MaDanhMuc, ThuongHieu, SucChua, GiaMin, GiaMax, GioNhan, GioTra, SapXep, Trang, SoMoiTrang)
  - Entity: `SanPham`, `DanhMuc`, `HinhAnhSanPham`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/ProductsView.tsx` (Thanh tìm kiếm, bộ lọc Danh mục, Thương hiệu, sắp xếp giá/đánh giá)
  - Service: `frontend/src/services/fakeApi.ts` (`fakeApi.catalog.getProducts` đã map sẵn `/api/san-pham`)
  - Mock data: `src/data/initialProducts.ts` (`INITIAL_PRODUCTS`), `src/data/initialCategories.ts` (`INITIAL_CATEGORIES`).
- **Trạng thái:** [Hoàn thành]
- **Gap Analysis:** Mã nguồn API và Frontend đã tương thích hoàn toàn. Khi bật cờ API thật, hệ thống gọi đúng endpoint backend.

---

### UC2.2 (UC15 / UC18) – Xem chi tiết sản phẩm (View Product Details)
- **Tác nhân:** Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Hiển thị chi tiết hình ảnh, thương hiệu, sức chứa, kích thước, thông số kỹ thuật, phụ kiện đi kèm, giá thuê theo ngày, tiền cọc bảo đảm, chính sách bồi thường và đánh giá của khách hàng.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/SanPhamController.cs` -> `GET /api/san-pham/{id}`
  - Service: `backend/Services/Implements/SanPhamService.cs` (`LayChiTietAsync`)
  - DTO: `backend/Models/DTOs/SanPham/SanPhamResponse.cs`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/ProductsView.tsx` (giao diện `app.page === "product-detail"`)
  - Tabs: Thông số kỹ thuật (`specs`), Phụ kiện đi kèm (`accessories`), Chính sách cọc/hủy (`policy`).
  - Dữ liệu: `p.specifications`, `p.images`, `p.deposit`, `p.compensation`.
- **Trạng thái:** [Hoàn thành]

---

### UC2.3 (UC16 / UC19) – Kiểm tra khả dụng thiết bị (Check Equipment Availability)
- **Tác nhân:** Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Tính toán chính xác số lượng thiết bị vật lý có thể phục vụ trong suốt khoảng thời gian thuê `[gioNhan, gioTra]`. Loại trừ các thiết bị đang có đơn thuê chồng chéo, đang được giữ chỗ trong hạn 15 phút, đang bảo dưỡng bảo trì hoặc thất lạc.
- **Hiện trạng Backend:**
  - Service: `backend/Services/Implements/KhaDungService.cs` (`KiemTraKhaDungAsync`), `SanPhamService.cs`
  - Thuật toán: Quét bảng `PhanCongThietBi`, `ChiTietDonThue`, `GiuChoThietBi` và bảng `ThietBi` (loại trạng thái `DangBaoTri`, `ThatLac`, `HongNang`).
  - Background Job: `backend/BackgroundJobs/DonThueExpirationJob.cs` giải phóng giữ chỗ hết hạn mỗi phút.
- **Hiện trạng Frontend:**
  - View: `ProductsView.tsx` (hiển thị badge "Còn X chiếc" hoặc "Hết hàng" tương ứng với ngày đã chọn), `CartView` (cảnh báo vượt tồn kho dòng sản phẩm).
  - Helper: `App.tsx` (`app.getAvailable(productId)`).
- **Trạng thái:** [Hoàn thành]

---

### UC2.4, UC2.4.1, UC2.4.2 (UC17 / UC20 - UC22) – Tư vấn bộ dụng cụ bằng AI (AI Kit Advisor & Add to Cart)
- **Tác nhân:** Khách vãng lai, Khách hàng, Dịch vụ AI
- **Tóm tắt:** Đề xuất combo thiết bị dã ngoại tối ưu dựa trên nhu cầu (địa hình ven hồ/rừng núi/glamping, điểm đến, quy mô đoàn, thời gian thuê, ngân sách). Sử dụng AI kết hợp quy tắc đối chiếu danh mục sản phẩm GearGo đang kinh doanh thực tế. Khách hàng có thể tùy chỉnh thêm/bớt và bấm thêm toàn bộ bộ đồ vào giỏ thuê.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/TuVanController.cs` ->
    - `POST /api/tu-van/bo-do` (UC2.4, UC2.4.1 - Gợi ý AI hoặc fallback rule-based)
    - `POST /api/tu-van/bo-do/kiem-tra` (UC2.4 - Tính lại giá và khả dụng khi khách chỉnh sửa)
    - `POST /api/tu-van/bo-do/them-vao-gio` (UC2.4.2 - Thêm trọn bộ vào giỏ)
  - Service: `backend/Services/Implements/TuVanAIService.cs`, `GoiYBoDoService.cs`, `AIProviderAdapter.cs`
  - DTO: `backend/Models/DTOs/TuVan/TuVanBoDoRequest.cs`, `TuVanBoDoResponse.cs`, `ThemBoDoRequest.cs`
  - Bảo mật & Hiệu năng: Rate limiting 30 req/phút; kiểm tra khả dụng tồn kho thời gian thực; loại trừ sản phẩm ngừng kinh doanh.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`AIAdvisorView`, lines 2000-2400)
  - Chế độ: Tab 1 "AI tư vấn thông minh" (chọn phong cách, điểm đến, số người, ngân sách) + Tab 2 "Bộ combo mẫu có sẵn" (fallback preset combos).
  - Tích hợp API: **Chưa kết nối API backend**. Đang chạy mô phỏng qua `setTimeout` client-side.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã hoàn thiện đầy đủ cả AI provider lẫn rule fallback và endpoint thêm giỏ hàng. Frontend đang dùng logic mô phỏng tĩnh.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Thêm `fakeApi.ai.getRecommendations` gọi `POST /api/tu-van/bo-do`.
  - [ ] Frontend: Đấu nối nút "Thêm vào giỏ" trong `AIAdvisorView` gọi `POST /api/tu-van/bo-do/them-vao-gio`.

---

## IV. ĐỐI CHIẾU CHI TIẾT PHÂN HỆ 3: QUẢN LÝ ĐẶT THUÊ (UC18 - UC21 / UC23 - UC30)

### UC3.1, UC3.1.1, UC3.1.2 (UC18 / UC23 - UC25) – Quản lý giỏ thuê & Báo giá & Khuyến mãi (Cart, Quote, Promo)
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Khách hàng quản lý danh sách thiết bị cần thuê trong giỏ, điều chỉnh số lượng, đặt khoảng thời gian nhận/trả. Hệ thống tính báo giá tách riêng tiền thuê (theo block 24 giờ làm tròn lên) và tiền cọc bảo đảm. Khách nhập mã ưu đãi: giảm giá chỉ áp dụng trên tiền thuê đủ điều kiện, tuyệt đối không giảm tiền cọc.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/GioThueController.cs` ->
    - `GET /api/gio-thue`: Lấy thông tin giỏ hàng và bảng tính giá
    - `POST /api/gio-thue/them`: Thêm thiết bị vào giỏ
    - `PUT /api/gio-thue/{maChiTiet}/so-luong`: Cập nhật số lượng
    - `DELETE /api/gio-thue/{maChiTiet}`: Xóa món khỏi giỏ
    - `PUT /api/gio-thue/thoi-gian`: Cập nhật lịch nhận và trả
    - `POST /api/gio-thue/ma-giam-gia`: Áp dụng mã khuyến mãi
    - `DELETE /api/gio-thue/ma-giam-gia`: Bỏ mã khuyến mãi
  - Service: `backend/Services/Implements/GioThueService.cs`, `BaoGiaService.cs`, `KhuyenMaiService.cs`
  - DTO: `ThemVaoGioRequest.cs`, `CapNhatSoLuongRequest.cs`, `DatThoiGianRequest.cs`, `ApKhuyenMaiRequest.cs`
  - Entity: `GioThue`, `ChiTietGioThue`, `KhuyenMai`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`CartView`)
  - Store: `app.cart`, `app.addToCart`, `app.updateCartQty`, `app.removeFromCart`, `app.evaluatePromotion`, `app.appliedPromoCode`
  - Quy tắc nghiệp vụ: Tính toán block 24h, cọc tách riêng, giảm giá không áp dụng cọc đã được code chính xác ở client.
  - Tích hợp API: **Chưa kết nối API backend**. Giỏ hàng đang lưu trong state và `localStorage`.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend có trọn vẹn 7 endpoints cho giỏ hàng. Frontend đã có UI hoàn chỉnh nhưng chưa đồng bộ với database qua `/api/gio-thue`.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Xây dựng service `rentalService.ts` kết nối đầy đủ các endpoint của `GioThueController`.

---

### UC3.2, UC3.2.1, UC3.2.2 (UC19 / UC26 - UC28) – Tạo đơn thuê & Giữ chỗ thiết bị (Create Order & 15m Reservation)
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Chuyển giỏ hàng thành đơn thuê chính thức ở trạng thái `Chờ thanh toán`. Kích hoạt giữ chỗ số lượng thiết bị và đồng hồ đếm ngược 15 phút. Lưu snapshot giá và chính sách tại thời điểm tạo đơn. Chống tấn công giả mạo người dùng (chống IDOR).
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/DonThueController.cs` -> `POST /api/v1/don-thue` `[Authorize(Policy = "CustomerOnly")]`
  - Service: `backend/Services/Implements/DonThueService.cs` (`TaoDonThueAsync`), `CheckoutService.cs`, `ChinhSachService.cs`
  - DTO: `backend/Models/DTOs/DonThue/TaoDonThueRequest.cs`
  - Cơ chế an toàn: Gán đè `request.MaTaiKhoan = User.LayMaTaiKhoan()` từ JWT claim, chống IDOR tuyệt đối.
  - Entity: `DonThue` (`TrangThai = ChoThanhToan`, `HanThanhToan = UtcNow + 15 phut`, `MaChinhSachSnapshotId`), `GiuChoThietBi`.
  - Background Job: `DonThueExpirationJob.cs` quét định kỳ giải phóng giữ chỗ khi quá hạn 15 phút.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`CheckoutView`, `OrderConfirmedView`)
  - Store: `app.createOrder`, `orders` state
  - Service: `fakeApi.rental.createOrder`
  - Tích hợp API: **Chưa kết nối API backend**. Frontend đang tạo ID đơn giả lập `DT...` và lưu vào localStorage.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã hoàn thiện logic transaction, concurrency check và snapshot chính sách. Frontend cần gọi API thật `POST /api/v1/don-thue`.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Cập nhật hàm `handleConfirm` trong `CheckoutView` gọi `apiClient.post('/api/v1/don-thue', payload)`.
  - [ ] Frontend: Nhận `maDonThue` và `hanThanhToan` từ API response để khởi tạo bộ đếm ngược trên UI `OrderConfirmedView`.

---

### UC3.3 (UC20 / UC29) – Theo dõi đơn thuê (Track My Orders)
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Khách hàng tra cứu danh sách đơn thuê của mình, theo dõi tiến độ theo vòng đời đơn (Chờ thanh toán, Đã xác nhận, Đang chuẩn bị, Sẵn sàng nhận, Đang thuê, Đã nhận trả, Chờ đối soát, Hoàn tất, Hết hạn, Đã hủy). Xem biên bản bàn giao BBBG, phiếu nhận trả PNT, chi tiết phụ phí và bảng đối soát cọc.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/DonThueController.cs` ->
    - `GET /api/v1/don-thue`: Lấy danh sách đơn của tôi (lọc theo trạng thái, phân trang)
    - `GET /api/v1/don-thue/{id}`: Chi tiết đơn hàng
    - `GET /api/v1/don-thue/{id}/lich-su`: Lịch sử trạng thái và sự kiện
    - `GET /api/v1/don-thue/{id}/ban-giao`: Biên bản bàn giao của khách
    - `GET /api/v1/don-thue/{id}/chinh-sach`: Bản chụp chính sách chốt của đơn
  - Service: `backend/Services/Implements/TruyVanDonThueService.cs`
  - Bảo mật: Bắt buộc `CustomerOnly`, lọc theo `User.LayMaTaiKhoan()`.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`MyOrdersView`)
  - Giao diện: Tabs lọc theo trạng thái, nút xem BBBG, PNT, bảng đối soát cọc, đồng hồ giữ chỗ 15 phút.
  - Dữ liệu: `app.orders` (`INITIAL_ORDERS`, `DEMO_ORDER`, `DEMO_ORDER_COMPLETED`).
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã có bộ 5 API truy vấn đầy đủ. Frontend đang lọc từ mock data local.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Kết nối `MyOrdersView` với `GET /api/v1/don-thue` và `GET /api/v1/don-thue/{id}`.

---

### UC3.4 (UC21 / UC30) – Hủy đơn thuê & Hoàn tiền theo chính sách (Cancel Order & Refund Policy)
- **Tác nhân:** Khách hàng, Quản trị viên
- **Tóm tắt:** Khách hàng hoặc Quản trị viên hủy đơn chưa bàn giao. Hệ thống tính tiền hoàn và phí hủy theo chính sách đã lưu:
  - Chưa thanh toán: Hủy miễn phí ngay lập tức.
  - Trước giờ nhận >= 48h: Hoàn 100% tiền thuê + 100% cọc.
  - Trong vòng 24h - 48h: Giữ 30% tiền thuê, hoàn 70% tiền thuê + 100% cọc.
  - Dưới 24h: Giữ 100% tiền thuê, hoàn lại 100% cọc.
  - Cửa hàng hủy: Hoàn 100% toàn bộ khoản đã thu.
  - Giải phóng toàn bộ thiết bị giữ chỗ và tạo lệnh hoàn tiền.
- **Hiện trạng Backend:**
  - Controller:
    - Khách hủy: `backend/Controllers/DonThueController.cs` ->
      - `GET /api/v1/don-thue/{id}/huy/xem-truoc`: Xem trước bảng tính tiền hoàn và phí giữ lại
      - `POST /api/v1/don-thue/{id}/huy`: Xác nhận hủy đơn
      - `PUT /api/v1/don-thue/{id}/huy`: Tương thích ngược
    - Cửa hàng hủy: `backend/Controllers/VanHanh/DonThueController.cs` ->
      - `GET /api/v1/van-hanh/don-thue/{id}/cua-hang-huy/xem-truoc`
      - `POST /api/v1/van-hanh/don-thue/{id}/cua-hang-huy`
  - Service: `backend/Services/Implements/HuyDonService.cs`, `HoanTienService.cs`
  - DTO: `backend/Models/DTOs/HuyDon/HuyDonRequest.cs`, `XemTruocHuyResponse.cs`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/CustomerPortal.tsx` (`MyOrdersView` -> modal Xác nhận hủy đơn)
  - Helper: `app.getCancellationQuote(orderId)` hiển thị dự tính tiền hoàn/phí giữ lại.
  - Store: `app.cancelOrder(orderId, reason)`
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Logic chính sách hủy trên frontend khớp 100% với backend. Cần kết nối gọi endpoint xem trước và chốt hủy API.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Khi bấm "Hủy đơn", gọi `GET /api/v1/don-thue/{id}/huy/xem-truoc` lấy bảng tính từ backend. Khi xác nhận, gọi `POST /api/v1/don-thue/{id}/huy`.

---

## V. ĐỐI CHIẾU CHI TIẾT PHÂN HỆ 4: QUẢN LÝ GIAO NHẬN (UC22 - UC26 / UC31 - UC36)

### UC4.1 (UC22 / UC31) – Chuẩn bị và phân công thiết bị (Equipment Prep & Assignment)
- **Tác nhân:** Nhân viên kho, Quản trị viên
- **Tóm tắt:** Nhân viên nhận đơn đã xác nhận thanh toán (`DaXacNhan` -> `DangChuanBi`), tiến hành phân công mã serial/barcode thiết bị vật lý cụ thể cho từng dòng sản phẩm. Kiểm tra phụ kiện, tình trạng dùng thực tế. Nếu mã thiết bị hỏng hoặc chưa trả, thực hiện thay thế mã khác cùng loại hoặc báo Quản trị viên xử lý. Khi đủ bộ và đạt kiểm tra, chuyển sang trạng thái `Sẵn sàng nhận` và gửi thông báo cho khách.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/ChuanBiDonController.cs` ->
    - `GET /api/chuan-bi-don/{donId}`: Xem tình trạng phân công từng dòng
    - `POST /api/chuan-bi-don/{donId}/bat-dau`: Bắt đầu chuẩn bị đơn
    - `POST /api/chuan-bi-don/{donId}/phan-cong`: Gán một hoặc nhiều serial vào dòng đơn
    - `POST /api/chuan-bi-don/{donId}/phan-cong/{phanCongId}/huy`: Hủy phân công một thiết bị
    - `POST /api/chuan-bi-don/{donId}/phan-cong/{phanCongId}/thay-the`: Đổi mã thiết bị khác kèm lý do
    - `POST /api/chuan-bi-don/{donId}/san-sang`: Xác nhận đủ bộ và chuyển sang `SanSangNhan`
  - Service: `backend/Services/Implements/ChuanBiDonService.cs`, `PhanCongThietBiService.cs`, `DeviceConflictDetector.cs`
  - DTO: `backend/Models/DTOs/ChuanBiDon/` (`GanThietBiRequest.cs`, `ThayTheRequest.cs`, `HuyPhanCongRequest.cs`, `XacNhanSanSangRequest.cs`)
  - Entity: `PhanCongThietBi`, `ThietBi`
  - Kiểm tra xung đột: `DeviceConflictDetector` kiểm tra thiết bị không bị trùng lịch với bất kỳ đơn nào khác trước khi gán.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`HandoverTab` -> sub-tab `prep` "Chuẩn bị đơn & Phân công serial")
  - Tính năng: Danh sách đơn cần chuẩn bị, chọn dropdown mã serial từng món, nút đổi serial thiết bị, nút báo thiếu thiết bị gửi Admin, nút hoàn tất chuẩn bị.
  - Store: `app.completePreparation`, `app.changeAssignedEquipment`, `app.reportEquipmentShortage`
  - Mock data: `INITIAL_EQUIPMENT` trong `src/data/initialEquipment.ts`.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend có 6 endpoints chuyên biệt và dịch vụ phát hiện xung đột `DeviceConflictDetector`. Frontend giao diện trực quan nhưng đang cập nhật state local.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Xây dựng `handoverService.ts` kết nối gọi `/api/chuan-bi-don/{donId}/*`.

---

### UC4.2 (UC23 / UC32) – Bàn giao thiết bị & Lập biên bản BBBG (Handover & Handover Record)
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Tiếp khách tại quầy, tra mã đơn hoặc quét mã QR. Kiểm tra trạng thái đơn (`SanSangNhan`), khoản tiền đã thanh toán đủ và thời điểm nhận. Đối chiếu người nhận thực tế (CCCD, SĐT). Kiểm tra cùng khách từng món và phụ kiện, chụp ảnh hiện trạng trước thuê. Chốt bàn giao: tạo Biên bản bàn giao BBBG, chuyển đơn và thiết bị sang trạng thái `Đang thuê`.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/BanGiaoController.cs` ->
    - `GET /api/v1/ban-giao/don-thue/{maDonThue}`: Lấy phiếu bàn giao theo đơn
    - `POST /api/v1/ban-giao/nhap/{maDonThue}`: Khởi tạo/lấy phiếu bàn giao nháp
    - `PUT /api/v1/ban-giao/{maPhieuBanGiao}`: Cập nhật chi tiết hiện trạng, phụ kiện và ảnh chụp
    - `POST /api/v1/ban-giao/{maPhieuBanGiao}/chot`: Chốt bàn giao đơn hàng
  - Service: `backend/Services/Implements/BanGiaoService.cs`
  - DTO: `backend/Models/DTOs/BanGiao/BanGiaoDTO.cs` (`CapNhatPhieuBanGiaoRequest`, `ChotBanGiaoRequest`)
  - Entity: `PhieuBanGiao`, `ChiTietBanGiao`, cập nhật `DonThue.TrangThai = DangThue`, `ThietBi.TrangThai = DangThue`.
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`HandoverTab` -> sub-tab `handover` "Bàn giao tại quầy")
  - Tính năng: Ô quét QR/tìm mã đơn, form thông tin người nhận thực tế + CCCD, checklist 4 hạng mục tiêu chuẩn, ảnh bằng chứng ngoại quan trước thuê, modal xem và in Biên bản bàn giao BBBG.
  - Store: `app.handoverOrder`
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã có quy trình 4 bước hoàn chỉnh (Tạo nháp -> Cập nhật chi tiết & ảnh -> Chốt). Frontend cần kết nối API qua `BanGiaoController`.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Đấu nối gọi `POST /api/v1/ban-giao/nhap/{maDonThue}` khi mở đơn, `PUT /api/v1/ban-giao/{id}` khi lưu checklist và `POST /api/v1/ban-giao/{id}/chot` khi hoàn tất.

---

### UC4.3 & UC4.3.1 (UC24 / UC33 - UC34) – Nhận trả thiết bị, Nghiệm thu & Trả một phần (Return, Inspection & Multi-round)
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Tiếp nhận thiết bị khách hoàn trả (có thể trả thành nhiều đợt, UC4.3.1). Lập Phiếu nhận trả (mã `PNT-xxx-D1`, `PNT-xxx-D2`...). Kiểm tra phụ kiện, tình trạng thiết bị (Bình thường, Cần vệ sinh, Hỏng nhẹ, Hỏng nặng, Mất thiết bị). Đồ đạt chuẩn chuyển về `Sẵn sàng`, đồ lỗi chuyển sang `Bảo trì`. Nếu có hư hỏng/mất, tự động lập đề xuất phụ phí (UC5.2). Nếu còn thiết bị chưa trả, giữ đơn `Đang thuê` với nhãn `Trả một phần`. Khi toàn bộ thiết bị đã trả xong hoặc có kết luận mất được duyệt, chuyển đơn sang `Đã nhận trả` rồi `Chờ đối soát`.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/NhanTraController.cs` ->
    - `GET /api/v1/nhan-tra/theo-don/{donId}`: Lấy danh sách các đợt trả
    - `GET /api/v1/nhan-tra/theo-don/{donId}/con-no`: Danh sách thiết bị khách còn nợ
    - `POST /api/v1/nhan-tra/theo-don/{donId}`: Tạo phiếu nhận trả nháp đợt mới
    - `PUT /api/v1/nhan-tra/{phieuId}`: Cập nhật kết quả kiểm tra từng món
    - `POST /api/v1/nhan-tra/{phieuId}/tach-cho-xu-ly`: Tách dòng cần kiểm định/vệ sinh
    - `POST /api/v1/nhan-tra/{phieuId}/chi-tiet/{chiTietId}/duyet-mat`: Duyệt kết luận mất (Chỉ Admin)
    - `POST /api/v1/nhan-tra/{phieuId}/chot`: Chốt phiếu nhận trả
  - Service: `backend/Services/Implements/NhanTraService.cs`, `TruyVanNhanTraService.cs`
  - Inspection Strategy Pattern: `PassInspectionStrategy`, `CleaningInspectionStrategy`, `DamageInspectionStrategy`, `LostInspectionStrategy`
  - Entity: `PhieuNhanTra`, `ChiTietNhanTra`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`ReturnTab` "Nhận trả & Phụ phí")
  - Tính năng:
    - Hiển thị thiết bị đã giao, số lượng đã trả và danh sách còn nợ rõ ràng.
    - Tick chọn thiết bị trả trong đợt, chọn tình trạng (Bình thường, Vệ sinh, Hỏng nhẹ, Hỏng nặng, Thiếu phụ kiện, Mất đồ).
    - Tự động gợi ý phụ phí bồi thường theo % giá trị bồi thường (`compensation`).
    - Hỗ trợ xem lại lịch sử các đợt trả trước và in phiếu PNT.
  - Store: `app.createReturnReceipt`
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend có kiến trúc Strategy Pattern rất mạnh mẽ. Frontend giao diện đầy đủ nghiệp vụ nhưng đang lưu cục bộ trong `order.returnReceipts`.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Kết nối `ReturnTab` với các endpoint của `NhanTraController`.

---

### UC4.4 (UC25 / UC35) – Xử lý đơn quá hạn & Nhật ký gọi khách (Overdue Handling & Contact Logs)
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hệ thống tự động phát hiện các đơn chưa hoàn trả sau giờ hẹn (`returnTime`). Tính số giờ/ngày trễ hạn và ước tính phí phạt trễ theo từng thiết bị. Nhân viên liên hệ với khách, ghi nhật ký kết quả (Hẹn giờ mới, Xin gia hạn, Không nghe máy, Khách báo mất). Kiểm tra danh sách các đơn tương lai bị ảnh hưởng do thiếu thiết bị và điều phối thiết bị thay thế.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/QuaHanController.cs` ->
    - `GET /api/v1/qua-han`: Danh sách đơn quá hạn kèm bộ lọc và phân trang
    - `GET /api/v1/qua-han/{donId}`: Chi tiết quá hạn và phí trễ từng thiết bị
    - `GET /api/v1/qua-han/{donId}/don-bi-anh-huong`: Danh sách đơn tương lai bị ảnh hưởng xung đột lịch
    - `POST /api/v1/qua-han/quet-nhac`: Kích hoạt quét và gửi thông báo nhắc nhở
  - Service: `backend/Services/Implements/QuaHanService.cs`
  - DTO: `backend/Models/DTOs/QuaHan/` (`LocQuaHanRequest.cs`, `ChiTietQuaHanDto.cs`, `DonBiAnhHuongDto.cs`)
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`ReturnTab` -> nhãn "Quá hạn hẹn trả", modal "Nhật ký liên hệ khách hàng", bảng cảnh báo xung đột đơn thuê tương lai).
  - Helper: `app.checkOrderOverdue(order)`, `app.getOverdueConflicts(orderId)`, `app.addContactLog(orderId, log)`.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Gap Analysis:** Backend đã có toàn bộ logic tính phí trễ và quét đơn bị ảnh hưởng. Frontend đang tính toán client-side.
- **Checklist công việc Subagent:**
  - [ ] Frontend: Kết nối gọi `GET /api/v1/qua-han` và `GET /api/v1/qua-han/{donId}/don-bi-anh-huong`.

---

### UC4.5 (UC26 / UC36) – Tra cứu đơn thuê cho vận hành (Operational Order Search)
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Nhân viên tra cứu đơn thuê phục vụ công việc hàng ngày: tìm kiếm theo mã đơn, mã QR, tên khách hàng, số điện thoại, ngày nhận/trả; lọc theo các trạng thái nghiệp vụ (Cần chuẩn bị, Cần giao, Đang thuê, Quá hạn, Chờ đối soát). Xem chi tiết phân công serial, biên bản giao nhận BBBG/PNT, lịch sử trạng thái và thao tác nhanh.
- **Hiện trạng Backend:**
  - Controller: `backend/Controllers/VanHanh/DonThueController.cs` ->
    - `GET /api/v1/van-hanh/don-thue`: Tìm kiếm đơn vận hành đa tiêu chí
    - `GET /api/v1/van-hanh/don-thue/{id}`: Xem chi tiết toàn diện của đơn
    - `POST /api/v1/van-hanh/don-thue/{id}/khong-den-nhan`: Ghi nhận khách không đến nhận hàng
  - Service: `backend/Services/Implements/TruyVanDonThueService.cs` (`TimDonVanHanhAsync`, `LayChiTietDonVanHanhAsync`)
  - DTO: `backend/Models/DTOs/DonThue/TimDonVanHanhRequest.cs`, `ChiTietDonVanHanhDto.cs`
- **Hiện trạng Frontend:**
  - View/Component: `frontend/src/views/StaffView.tsx` (`OrdersTab`, lines 60-450)
  - Giao diện: Bảng danh sách đơn, thanh tìm kiếm từ khóa, tab lọc nhanh theo trạng thái, modal chi tiết đơn tích hợp 3 tab (Thông tin đơn, Biên bản bàn giao & nhận trả, Nhật ký trạng thái Audit timeline).
  - Điều hướng: Phím tắt chuyển nhanh sang tab Chuẩn bị/Bàn giao hoặc Nhận trả.
- **Trạng thái:** [Chưa hoàn thiện / Đang dùng Mock ở Frontend]
- **Checklist công việc Subagent:**
  - [ ] Frontend: Đấu nối gọi `GET /api/v1/van-hanh/don-thue` và `GET /api/v1/van-hanh/don-thue/{id}`.

---

## VI. BẢNG TỔNG HỢP MOCK DATA FRONTEND CẦN THAY THẾ (M1 - M4)

| STT | File Mock Data | Biến Mock / Dữ liệu | Use Cases liên quan | Trạng thái thay thế / Hướng xử lý |
|:---:|:---|:---|:---|:---|
| 1 | `src/data/initialCustomers.ts` | `INITIAL_CUSTOMERS` | UC1.1, UC1.2, UC1.4, UC1.11, UC1.13 | Thay bằng API `AuthController`, `TaiKhoanController`. Giữ làm fallback kiểm thử độc lập. |
| 2 | `src/data/initialStaff.ts` | `INITIAL_STAFF_ACCOUNTS` | UC1.2, UC1.7, UC1.8, UC1.9, UC1.10, UC1.11 | Thay bằng API `NhanVienController` (`/api/v1/admin/nhan-vien`). |
| 3 | `src/data/initialProducts.ts` | `INITIAL_PRODUCTS` | UC2.1, UC2.2, UC2.3, UC2.4, UC3.1, UC3.2 | Đã có sẵn client trong `fakeApi.catalog.getProducts()`. Chuyển sang kích hoạt API thật. |
| 4 | `src/data/initialCategories.ts`| `INITIAL_CATEGORIES` | UC2.1, UC2.2, UC3.1 | Đã có sẵn `fakeApi.catalog.getCategories()` gọi `/api/danh-muc`. |
| 5 | `src/data/initialEquipment.ts` | `INITIAL_EQUIPMENT` | UC2.3, UC4.1, UC4.2, UC4.3, UC4.4 | Thay bằng API `ThietBiController` (`/api/thiet-bi`) và `ChuanBiDonController`. |
| 6 | `src/data/initialOrders.ts` | `INITIAL_ORDERS`, `DEMO_ORDER`, `DEMO_ORDER_COMPLETED` | UC3.2, UC3.3, UC3.4, UC4.1, UC4.2, UC4.3, UC4.4, UC4.5 | Thay bằng API `DonThueController` (`/api/v1/don-thue`) và `VanHanh/DonThueController`. |
| 7 | `src/services/fakeApi.ts` | `fakeApi` object | UC1.1 - UC4.5 | Giữ nguyên method signature, chuyển đổi implementation bên trong gọi thẳng `apiClient` thay vì mock delay. |
| 8 | `src/App.tsx` | `persistedState` (`geargo-demo-state-v2`) | Toàn bộ M1 - M4 | Thay vì lưu toàn bộ danh sách thực thể vào `localStorage`, chỉ lưu `TOKEN_KEY` và User Session; toàn bộ dữ liệu nghiệp vụ tải từ API. |

---

## VII. ĐÁNH GIÁ RỦI RO KỸ THUẬT & GIẢI PHÁP KIẾN TRÚC

1. **Rủi ro lệch công nghệ (Technology Mismatch Risk):**
   - *Phát hiện:* Một số tài liệu nhầm lẫn Backend là Spring Boot / Java.
   - *Thực tế:* Backend là ASP.NET Core 10 (C# / EF Core 9).
   - *Giải pháp:* Subagent thực hiện backend bắt buộc sử dụng C# (.NET 10), tuân thủ đúng namespace `GearGo.Controllers`, `GearGo.Services`, `GearGo.Models`.

2. **Rủi ro bảo mật IDOR (Insecure Direct Object Reference):**
   - *Rủi ro:* Khách hàng có thể truyền ID người khác để xem đơn hoặc sửa thông tin.
   - *Hiện trạng:* Backend đã phòng chống triệt để bằng cách bỏ qua `MaKhachHang` gửi từ client, luôn trích xuất `User.LayMaTaiKhoan()` từ JWT claim đã xác thực.
   - *Khuyến nghị:* Mọi endpoint mới phát sinh ở M1 - M3 phải tuyệt đối tuân thủ nguyên tắc này.

3. **Rủi ro tranh chấp giữ chỗ đồng thời (Concurrency & Race Condition):**
   - *Rủi ro:* Hai khách hàng cùng bấm đặt món cuối cùng cùng lúc.
   - *Hiện trạng:* `DonThueService` sử dụng transaction có kiểm tra lại khả dụng ngay trước khi lưu và gán thời hạn `HanThanhToan` 15 phút.
   - *Khuyến nghị:* Bổ sung xử lý `DbUpdateConcurrencyException` bắt lỗi đồng thời và trả về thông báo thân thiện `SAN_PHAM_VUA_HET_HANG` thay vì lỗi 500.

4. **Rủi ro lệch trạng thái đồng bộ giữa Serial vật lý và Giữ chỗ số lượng:**
   - *Quy tắc:* Khách đặt đơn chỉ giữ chỗ về MẶT SỐ LƯỢNG (Quantity Reservation). Khi nhân viên kho chuẩn bị đơn (UC4.1), mới gán MÃ SERIAL CỤ THỂ.
   - *Kiểm soát:* Bắt buộc chạy `DeviceConflictDetector` để đảm bảo thiết bị không bị trùng lịch bàn giao hoặc trả trễ từ đơn trước.

---

## VIII. KẾ HOẠCH TRIỂN KHAI VÀ PHÂN CHIA SUBAGENT ĐỘC LẬP

Dựa trên kết quả khảo sát, khối lượng công việc được chia thành 4 gói Subagent độc lập, thực thi theo lộ trình tuần tự và song song:

### Gói 1: Subagent Phân hệ 1 (UC01 - UC16 / M1)
- **Phạm vi:** Xác thực, Phân quyền, Hồ sơ Cá nhân, Quản trị Nhân viên & Khách hàng.
- **Nhiệm vụ chính:**
  - Frontend: Đấu nối `RegisterView` với `POST /api/auth/dang-ky`.
  - Frontend: Đấu nối `ForgotPasswordView` với `POST /api/auth/quen-mat-khau` và `dat-lai-mat-khau`.
  - Frontend: Đấu nối `StaffTab` với `/api/v1/admin/nhan-vien` (Thêm, Sửa, Đổi vai trò, Khóa/Mở).
  - Frontend: Đấu nối `CustomersTab` với `/api/v1/admin/tai-khoan`.
  - Backend: Tích hợp adapter gửi email OTP và cấu hình rate-limit.

### Gói 2: Subagent Phân hệ 2 (UC17 - UC22 / M2)
- **Phạm vi:** Tra cứu Sản phẩm, Kiểm tra Khả dụng & Trợ lý Tư vấn Bộ dụng cụ AI.
- **Nhiệm vụ chính:**
  - Frontend: Kiểm thử tích hợp `fakeApi.catalog.getProducts()` với backend `SanPhamController`.
  - Frontend: Đấu nối `AIAdvisorView` với `POST /api/tu-van/bo-do` và `POST /api/tu-van/bo-do/them-vao-gio`.
  - Backend: Bổ sung cấu hình API Key dịch vụ AI trong `appsettings.json` (OpenAI / Claude / Gemini API) cho `AIProviderAdapter`.

### Gói 3: Subagent Phân hệ 3 (UC23 - UC30 / M3)
- **Phạm vi:** Giỏ hàng, Báo giá, Áp mã ưu đãi, Tạo đơn & Hủy đơn thuê.
- **Nhiệm vụ chính:**
  - Frontend: Xây dựng service gọi trọn bộ 7 endpoints của `GioThueController`.
  - Frontend: Đấu nối `CheckoutView` gọi `POST /api/v1/don-thue`.
  - Frontend: Đấu nối `MyOrdersView` gọi `GET /api/v1/don-thue` và `POST /api/v1/don-thue/{id}/huy`.
  - Backend: Hoàn thiện đồng bộ giải phóng mã khuyến mãi khi đơn hết hạn 15 phút.

### Gói 4: Subagent Phân hệ 4 (UC31 - UC36 / M4)
- **Phạm vi:** Chuẩn bị kho, Phân công serial, Bàn giao BBBG, Nhận trả PNT, Quá hạn & Tra cứu vận hành.
- **Nhiệm vụ chính:**
  - Frontend: Đấu nối `HandoverTab` (sub-tab prep) với `/api/chuan-bi-don/{donId}/*`.
  - Frontend: Đấu nối `HandoverTab` (sub-tab handover) với `/api/v1/ban-giao/*`.
  - Frontend: Đấu nối `ReturnTab` với `/api/v1/nhan-tra/*`.
  - Frontend: Đấu nối màn hình quá hạn với `/api/v1/qua-han/*`.
  - Frontend: Đấu nối `OrdersTab` với `/api/v1/van-hanh/don-thue`.
