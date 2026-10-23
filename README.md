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
- **[Tuần 5 - Task 4, Task 5 (Minh Tú)]**:
  - **W5-T4 (Theo dõi kho, kiểm kê và khả dụng)**: Xây dựng `KhoService` và `KhoController` (`/api/kho/*`) phục vụ quản lý thiết bị toàn diện:
    - Thống kê tổng quan số lượng hồ sơ thiết bị theo trạng thái (`SanSangTaiKho`, `DangChoThue`, `DangBaoTri`, `NgungSuDung`, `ThatLac`) và tổng giá trị tiền nhập kho (bảo vệ quyền Quản trị viên).
    - Tra cứu, tìm kiếm thiết bị phân trang kèm thông tin sản phẩm đại diện kinh doanh hiện tại và nguồn gốc nhập.
    - Đối chiếu kiểm kê thực tế tại kho từ danh sách quét mã vạch: phân loại chính xác mã khớp, mã quét lạ chưa khai báo, mã thiếu tại kho, đồng thời phân biệt thông minh các thiết bị đang cho thuê (`DangThue`) hoặc đang gửi xưởng (`DangBaoTri`) để tránh kết luận sai lệch mất máy.
    - Phân tích và giả lập ảnh hưởng khả dụng cam kết đơn thuê tương lai (`PhanTichAnhHuongAsync`) khi đề xuất loại trừ hoặc giáng cấp thiết bị.
  - **W5-T5 (Điều chỉnh kho và sai lệch phiếu nhập)**: Xây dựng `DieuChinhKhoService`, `DieuChinhKhoController` (`/api/dieu-chinh-kho/*`) và `GiaTriNhapHieuLucQuery`:
    - Hỗ trợ toàn diện 6 loại điều chỉnh kho: `SaiGiaNhap`, `KhaiBaoThieuThietBi`, `KhaiBaoTrungSaiThietBi`, `KiemKeSaiLech`, `GiangCapThietBi`, `NgungSuDung`.
    - Tự động sao lưu snapshot trạng thái trước (`GiaTriTruoc`) và giá trị đề xuất sau (`GiaTriSau`) dưới dạng JSON có kiểm soát schema.
    - Quy trình phê duyệt chặt chẽ: Nhân viên lập nháp (`Draft`), gửi duyệt (`Pending`), Quản trị viên từ chối (`Rejected`) hoặc phê duyệt và áp dụng (`Applied`).
    - Phê duyệt nguyên tử (Atomic Serializable Transaction): Khóa bản ghi theo thứ tự ID chống deadlock, kiểm tra lại cam kết đơn thuê tại thời điểm duyệt (chặn duyệt nếu gây thiếu hàng cho khách đã đặt), tự động cập nhật trạng thái thiết bị và ghi nhật ký lịch sử (`LichSuTinhTrangThietBi`).
    - Chuỗi điều chỉnh bất biến: Tuyệt đối không sửa trực tiếp `ChiTietPhieuNhap` gốc, mà tính toán giá trị nhập và số lượng hiệu lực lũy kế thông qua `GiaTriNhapHieuLucQuery`.

## API / Function
- **Kho & Kiểm kê API (`api/kho`)**:
  - `GET /api/kho/tong-quan` - Thống kê tổng quan số lượng thiết bị theo trạng thái và tổng giá trị tồn kho.
  - `GET /api/kho/thiet-bi` - Danh sách hồ sơ thiết bị phân trang, lọc theo sản phẩm và trạng thái sử dụng.
  - `POST /api/kho/kiem-ke/doi-chieu` - Đối chiếu danh sách mã quét thực tế với dữ liệu hệ thống, phân loại máy ngoài kho hợp lệ.
  - `POST /api/kho/phan-tich-anh-huong` - Phân tích, giả lập ảnh hưởng cam kết đơn thuê tương lai khi biến động thiết bị.
- **Điều chỉnh kho API (`api/dieu-chinh-kho`)**:
  - `POST /api/dieu-chinh-kho` - Lập phiếu điều chỉnh kho mới (tự động snapshot dữ liệu hiện tại).
  - `PUT /api/dieu-chinh-kho/{id}` - Cập nhật nội dung phiếu điều chỉnh khi còn ở trạng thái nháp.
  - `PATCH /api/dieu-chinh-kho/{id}/gui-duyet` - Gửi duyệt phiếu điều chỉnh (chuyển sang trạng thái ChoDuyet).
  - `POST /api/dieu-chinh-kho/{id}/tu-choi` - Quản trị viên từ chối phiếu điều chỉnh kèm lý do.
  - `POST /api/dieu-chinh-kho/{id}/duyet` - Quản trị viên duyệt và áp dụng biến động kho (Serializable transaction, re-check cam kết).
  - `GET /api/dieu-chinh-kho/{id}` - Xem chi tiết phiếu điều chỉnh và snapshot các dòng.
  - `GET /api/dieu-chinh-kho` - Danh sách phiếu điều chỉnh kho phân trang và lọc theo trạng thái/loại.
  - `GET /api/dieu-chinh-kho/phieu-nhap/{maPhieuNhap}/gia-tri-hieu-luc` - Tính toán giá trị nhập và số lượng hiệu lực của phiếu nhập sau chuỗi điều chỉnh.
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
│   │   ├── DieuChinhKhoController.cs
│   │   ├── DoiSoatController.cs
│   │   ├── DonThueController.cs
│   │   ├── GioThueController.cs
│   │   ├── HoanTienController.cs
│   │   ├── KhoController.cs
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
│   │   │   ├── DieuChinhKho/
│   │   │   │   └── DieuChinhKhoDtos.cs
│   │   │   └── Kho/
│   │   │       └── KhoDtos.cs
│   │   └── Enums/
│   ├── Services/
│   │   ├── Interfaces/
│   │   │   ├── IKhoService.cs
│   │   │   └── IDieuChinhKhoService.cs
│   │   ├── Implements/
│   │   │   ├── KhoService.cs
│   │   │   └── DieuChinhKhoService.cs
│   │   └── Queries/
│   │       └── GiaTriNhapHieuLucQuery.cs
│   ├── Program.cs
│   └── GearGo.csproj
├── tests/
│   ├── GearGo.Tests/
│   │   └── KhoDieuChinhKhoTests.cs
│   └── week5/
│       └── test_w5_minhtu.mjs
├── frontend/
└── Document/
```
