# GearGo Webapp

## Thay đổi gần đây
- Cấu hình lại `Program.cs` để hỗ trợ kiến trúc Web API phục vụ cho frontend React.
- Thiết lập JWT Authentication và CORS (allow `localhost:5173` và `localhost:3000`).
- **[Task 4-5]**: Xây dựng toàn bộ các Entity cho tính năng Khuyến mãi, Kho hàng (Skeleton), và Giỏ/Đơn hàng. Bổ sung quan hệ, Unique Constraints vào `ApplicationDbContext`.
- **[Task 4-5]**: Triển khai `CheckoutService` và `InventoryService` xử lý logic Kiểm tra khả dụng (Time-based) và Giữ lượt/Giữ kho (Pessimistic Locking `UPDLOCK` + Chống Deadlock).

- **[Task 11 - Admin Controllers]**: Hoàn thiện bộ đôi Controller quản trị `Admin/DanhMucController` và `Admin/SanPhamController` bảo vệ bởi policy `AdminOnly` (`[Authorize(Policy = "AdminOnly")]`).
- **[Bảo mật Upload ảnh]**: Bổ sung xác thực Magic Bytes (JPEG, PNG, WEBP) và chặn file > 5MB trong `AdminSanPhamService` khi upload ảnh sản phẩm.
- **[Chuẩn hóa Controller]**: Phân tách độc lập giữa Public Customer Controllers (`Controllers/DanhMucController.cs`, `Controllers/SanPhamController.cs`) và Admin Controllers (`Controllers/Admin/DanhMucController.cs`, `Controllers/Admin/SanPhamController.cs`).

## API / Function
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
│   │   ├── DonThueController.cs
│   │   ├── GioThueController.cs
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
