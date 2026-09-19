# GearGo Webapp

## Thay đổi gần đây
- Cấu hình lại `Program.cs` để hỗ trợ kiến trúc Web API phục vụ cho frontend React.
- Thiết lập JWT Authentication và CORS (allow `localhost:5173` và `localhost:3000`).
- **[Task 4-5]**: Xây dựng toàn bộ các Entity cho tính năng Khuyến mãi, Kho hàng (Skeleton), và Giỏ/Đơn hàng. Bổ sung quan hệ, Unique Constraints vào `ApplicationDbContext`.
- **[Task 4-5]**: Triển khai `CheckoutService` và `InventoryService` xử lý logic Kiểm tra khả dụng (Time-based) và Giữ lượt/Giữ kho (Pessimistic Locking `UPDLOCK` + Chống Deadlock).

## API / Function
- **Endpoint mới**: `GET /api/test` - Dùng để kiểm tra backend đã chạy thành công hay chưa.
- **Service Function**: `IInventoryService.CheckAvailabilityAsync(sanPhamId, tuNgay, denNgay)` - Logic tính khả dụng Time-based.
- **Service Function**: `ICheckoutService.PlaceOrderWithReserveAsync(...)` - Logic Transaction tạo đơn giữ chỗ 15 phút.

## Folder Structure
```
GearGo_Webapp/
├── backend/
│   ├── Data/
│   │   └── ApplicationDbContext.cs
│   ├── Models/
│   │   ├── Entities/ (Chứa > 20 class Entity)
│   │   └── Enums/ (TrangThaiThietBi, TrangThaiDonThue,...)
│   ├── Services/
│   │   ├── Interfaces/ (ICheckoutService, IInventoryService)
│   │   └── Implements/ (CheckoutService, InventoryService)
│   ├── Properties/
│   │   └── launchSettings.json (Cấu hình môi trường)
│   ├── Program.cs (Web API config)
│   └── GearGo.csproj
├── frontend/
└── Document/
```
