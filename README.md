# GearGo Webapp

## Thay đổi gần đây
- Cấu hình lại `Program.cs` để hỗ trợ kiến trúc Web API phục vụ cho frontend React.
- Bổ sung file `launchSettings.json` để chạy môi trường `Development` và tắt cảnh báo thiếu cổng HTTPS.
- Thiết lập JWT Authentication và CORS (allow `localhost:5173` và `localhost:3000`).
- Dọn dẹp Session và Cookie Authentication cũ (không còn dùng).

## API / Function
- **Endpoint mới**: `GET /api/test` - Dùng để kiểm tra backend đã chạy thành công hay chưa.

## Folder Structure
```
GearGo_Webapp/
├── backend/
│   ├── Properties/
│   │   └── launchSettings.json (Cấu hình môi trường)
│   ├── Program.cs (Web API config)
│   └── GearGo.csproj
├── frontend/
└── Document/
```
