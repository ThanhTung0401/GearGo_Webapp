# GearGo Webapp

## Thay đổi gần đây
- Cấu hình lại `Program.cs` để hỗ trợ kiến trúc Web API phục vụ cho frontend React.
- Thiết lập JWT Authentication và CORS (allow `localhost:5173` và `localhost:3000`).
- **[Task 4-5]**: Xây dựng toàn bộ các Entity cho tính năng Khuyến mãi, Kho hàng (Skeleton), và Giỏ/Đơn hàng. Bổ sung quan hệ, Unique Constraints vào `ApplicationDbContext`.
- **[Task 4-5]**: Triển khai `CheckoutService` và `InventoryService` xử lý logic Kiểm tra khả dụng (Time-based) và Giữ lượt/Giữ kho (Pessimistic Locking `UPDLOCK` + Chống Deadlock).

- **[Task 11 - Admin Controllers]**: Hoàn thiện bộ đôi Controller quản trị `Admin/DanhMucController` và `Admin/SanPhamController` bảo vệ bởi policy `AdminOnly` (`[Authorize(Policy = "AdminOnly")]`).
- **[Bảo mật Upload ảnh]**: Bổ sung xác thực Magic Bytes (JPEG, PNG, WEBP) và chặn file > 5MB trong `AdminSanPhamService` khi upload ảnh sản phẩm.
- **[Tuần 4 - Task 2, Task 5, Task 8 (Minh Tú)]**:
  - **W4-T2 (Quá hạn & Khả dụng sau nhận trả)**: Xây dựng `QuaHanService` và `QuaHanController` cho phép tra cứu đơn quá hạn phân trang (`LayDonQuaHanAsync`), chi tiết phí trễ từng thiết bị (`LayChiTietQuaHanAsync`), rà soát cảnh báo các đơn tương lai bị ảnh hưởng do thiết bị quá hạn/hỏng chưa về (`LayDonBiAnhHuongAsync`), và quét tạo thông báo nhắc nhở khách hàng định kỳ (`QuetVaTaoNhacQuaHanAsync`).
  - **W4-T2 (Tối ưu Khả dụng)**: Mở rộng `KhaDungService` tự động giải phóng cam kết chiếm lịch cho các thiết bị đã được kết luận nhận trả đạt/mất trong phiếu chốt đối với các đơn trả nhiều đợt (trả một phần), và loại trừ các thiết bị này khỏi danh sách quá hạn.
  - **W4-T5 (Thu bổ sung phụ phí đối soát)**: Mở rộng `ThanhToanService` và `ThanhToanController` với `TaoThuBoSungAsync` (khởi tạo thanh toán bổ sung khi bảng đối soát có `SoTienCanThuThem > 0`), tự động tạo liên kết `GiaoDichDoiSoat` khi webhook callback thành công, duy trì trạng thái đơn đúng luồng đối soát mà không reset về đơn mới.
  - **W4-T8 (Xử lý ngoại lệ thanh toán & Đối chiếu)**: Tích hợp xử lý webhook idempotent (chống callback lặp, callback thất bại đến sau thành công), tự động phát hiện số tiền sai lệch hoặc tiền đến khi đơn đã hủy/hết hạn đưa vào diện `CanDoiChieu`. Cung cấp API `GET /api/thanh-toan/can-doi-chieu` và `POST /api/thanh-toan/{id}/doi-chieu` cho Quản trị viên xử lý, tích hợp gọi `HoanTienService` để hoàn tiền thừa (`HoanThuThua`) theo đúng nguồn thu gốc.

## API / Function
- **Quá hạn & Khả dụng API (`api/v1/qua-han`)**:
  - `GET /api/v1/qua-han` - Danh sách đơn thuê quá hạn (phân trang, lọc theo đơn/sản phẩm/mốc thời gian).
  - `GET /api/v1/qua-han/{donId}` - Chi tiết từng thiết bị, số ngày trễ và phí trễ dự kiến.
  - `GET /api/v1/qua-han/{donId}/don-bi-anh-huong` - Cảnh báo các đơn tương lai bị ảnh hưởng do thiết bị quá hạn chưa về hoặc thiếu hàng.
  - `POST /api/v1/qua-han/quet-nhac` - Quét và tạo thông báo nhắc nhở khách hàng trả đồ (idempotent).
- **Thanh toán & Thu bổ sung API (`api/v1/thanh-toan`)**:
  - `POST /api/v1/thanh-toan/xac-nhan` - Xác nhận thanh toán cọc đơn mới.
  - `POST /api/v1/thanh-toan/doi-soat/{doiSoatId}/thu-bo-sung` - Tạo yêu cầu thu bổ sung phụ phí đối soát.
  - `GET /api/v1/thanh-toan/{id}/trang-thai` - Lấy trạng thái giao dịch thu theo mã yêu cầu.
  - `POST /api/v1/thanh-toan/callback/thu-bo-sung` - Webhook nhận kết quả từ cổng thanh toán và liên kết đối soát.
  - `GET /api/v1/thanh-toan/can-doi-chieu` - Danh sách giao dịch cần đối chiếu ngoại lệ (Staff/Admin).
  - `POST /api/v1/thanh-toan/{id}/doi-chieu` - Admin đối chiếu và xử lý hoàn tiền thừa hoặc xác nhận hợp lệ.
- **Admin Danh Mục API (`api/admin/danh-muc`)**:
  - `GET /api/admin/danh-muc` - Xem toàn bộ danh mục (kể cả trạng thái ẩn).
  - `POST /api/admin/danh-muc` - Thêm mới danh mục.
  - `PUT /api/admin/danh-muc/{id}` - Cập nhật danh mục (chặn gán cha là chính nó hoặc con).
  - `PATCH /api/admin/danh-muc/{id}/trang-thai` - Đổi trạng thái hiển thị.
  - `DELETE /api/admin/danh-muc/{id}` - Xóa danh mục khi không chứa SP và danh mục con.
- **Admin Sản Phẩm API (`api/admin/san-pham`)**:
  - `GET /api/admin/san-pham` - Xem danh sách sản phẩm phân trang + tìm kiếm (kể cả TamNgung/NgungKinhDoanh).
  - `POST /api/admin/san-pham` - Tạo mới sản phẩm (ràng buộc unique mã hiển thị).
  - `PUT /api/admin/san-pham/{id}` - Cập nhật thông số/giá sản phẩm.
  - `PATCH /api/admin/san-pham/{id}/trang-thai` - Đổi trạng thái kinh doanh (`DangKinhDoanh`, `TamNgung`, `NgungKinhDoanh`).
  - `POST /api/admin/san-pham/{id}/hinh-anh` - Upload ảnh sản phẩm (xác thực Magic Bytes + dung lượng ≤ 5MB).
  - `DELETE /api/admin/san-pham/hinh-anh/{maHinhAnh}` - Xóa ảnh sản phẩm.
- **Public API**:
  - `GET /api/danh-muc`, `GET /api/danh-muc/{id}` - Xem danh mục công khai.
  - `GET /api/san-pham`, `GET /api/san-pham/{id}` - Tìm kiếm và xem chi tiết sản phẩm kèm khả dụng.

## Folder Structure
```
GearGo_Webapp/
├── backend/
│   ├── Controllers/
│   │   ├── Admin/
│   │   │   ├── DanhMucController.cs
│   │   │   └── SanPhamController.cs
│   │   ├── AuthController.cs
│   │   ├── DanhMucController.cs
│   │   ├── DoiSoatController.cs
│   │   ├── DonThueController.cs
│   │   ├── GioThueController.cs
│   │   ├── HoanTienController.cs
│   │   ├── NhanTraController.cs
│   │   ├── PhuPhiController.cs
│   │   ├── QuaHanController.cs
│   │   ├── SanPhamController.cs
│   │   └── ThanhToanController.cs
│   ├── Data/
│   │   └── ApplicationDbContext.cs
│   ├── Models/
│   │   ├── Entities/ (26 class Entity khớp 100% ERD)
│   │   ├── DTOs/
│   │   └── Enums/
│   ├── Services/
│   │   ├── Interfaces/
│   │   └── Implements/
│   ├── Program.cs
│   └── GearGo.csproj
├── frontend/
└── Document/
```
