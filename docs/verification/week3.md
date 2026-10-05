# Biên bản nghiệm thu Week 3 — phần Thanh Tùng

**Trạng thái chung: chỉ mới viết code + build. CHƯA chạy với SQL Server thật; không ca nào dưới đây được đánh dấu Pass.**

Ghi chú build: máy dev dùng .NET SDK 8 nên không build trực tiếp được `net10.0`; đã build thử trên bản sao đổi `TargetFramework=net8.0` và `JwtBearer 8.*` → Build succeeded, 0 lỗi. Cần build lại bằng SDK 10 của nhóm.

| Mã ca | Hành động | Expected | Actual | Kết quả |
|---|---|---|---|---|
| W3-T1-A01 | Khách A sửa hồ sơ rồi mở đơn cũ | Hồ sơ đổi; snapshot người nhận/giá đơn cũ giữ nguyên | Code không ghi vào `DON_THUE`; chưa chạy | Blocked (cần DB) |
| W3-T1-A02 | Khách A dùng donId/biên bản của B | 404, không lộ nội dung | `EnsureChuDonAsync` chặn trước khi tải chứng từ; chưa chạy | Blocked |
| W3-T1-A03 | Hai tài khoản đổi cùng SĐT đồng thời | Một thành công, một 409, không cập nhật dở | Có kiểm tra trước + bắt vi phạm unique index; cần chạy đồng thời thật | Blocked |
| W3-T1-A04 | Đơn chưa bàn giao mở chi tiết | `banGiao: []`, không 500 | Chưa chạy | Blocked |
| W3-T2-A01 | Gọi lại helper thông báo cùng event key | 1 `THONG_BAO` | Kiểm tra `Local` + DB; chưa chạy | Blocked |
| W3-T2-A02 | Rollback sau khi history tracked | Không có history/audit/thông báo | Helper không SaveChanges; chưa chạy | Blocked |
| W3-T2-A03 | Đánh dấu đọc ID người khác | Không cập nhật, 404 | `ExecuteUpdate` có điều kiện chủ; chưa chạy | Blocked |
| W3-T2-A04 | Sẵn sàng lần hai sau đổi thiết bị | Sự kiện riêng | Phụ thuộc Kim Xuyến dùng `MaLichSuDon` làm key | Blocked |
| W3-T9-A01..A05 | Luồng nhập→đặt→giao | — | Chờ các module của Kiện Minh, Minh Tú, Kim Xuyến chưa có trong repo | Blocked |

Tổng hợp ca 1–3 (mục 14.0) chạy được khi có DB dev; các ca còn lại chờ module của thành viên khác.
