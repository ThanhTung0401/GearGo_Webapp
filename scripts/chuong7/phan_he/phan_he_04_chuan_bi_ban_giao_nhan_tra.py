# -*- coding: utf-8 -*-
"""Phân hệ 4: Chuẩn bị, Bàn giao, Nhận trả & Quá hạn (5 màn hình)."""

SCREENS = [
    ('SCR-4.1', 'Giao diện Chuẩn bị và phân công thiết bị', 'UC4.1', 'UC4_1'),
    ('SCR-4.2', 'Giao diện Bàn giao thiết bị', 'UC4.2', 'UC4_2'),
    ('SCR-4.3', 'Giao diện Nhận trả và kiểm tra thiết bị', 'UC4.3', 'UC4_3'),
    ('SCR-4.4', 'Giao diện Xử lý đơn quá hạn', 'UC4.4', 'UC4_4'),
    ('SCR-4.5', 'Giao diện Tra cứu đơn thuê cho vận hành', 'UC4.5', 'UC4_5'),
]

NATURAL_EVENTS = {
    'UC4.1': [
        ('1', 'Chọn một đơn thuê trong danh sách đơn cần chuẩn bị', 'Hiển thị chi tiết các món thiết bị cần soạn và danh sách mã thiết bị sẵn sàng trong kho.'),
        ('2', 'Chọn mã thiết bị cụ thể cho từng món trong đơn', 'Gán mã thiết bị vật lý cho đơn thuê và kiểm tra đủ số lượng yêu cầu.'),
        ('3', 'Nhấn nút "Hoàn tất chuẩn bị & Chuyển Sẵn sàng nhận"', 'Xác nhận hoàn tất soạn hàng và chuyển đơn sang danh sách chờ bàn giao cho khách.'),
        ('4', 'Nhấn nút "Báo thiếu hàng cho QTV"', 'Gửi cảnh báo thiếu thiết bị tới quản trị viên để kịp thời điều phối.'),
    ],
    'UC4.2': [
        ('1', 'Chọn tab "2. Tiếp khách & Bàn giao" và chọn đơn sẵn sàng nhận', 'Hiển thị thông tin khách hàng, danh sách thiết bị đã gán mã và bảng kiểm tra trước khi giao.'),
        ('2', 'Đánh dấu hoàn thành các mục kiểm tra phụ kiện và tình trạng thiết bị', 'Xác nhận tình trạng thực tế của thiết bị cùng khách hàng tại quầy.'),
        ('3', 'Nhấn nút "Xác nhận bàn giao thiết bị"', 'Chuyển trạng thái đơn sang Đang thuê, ghi nhận thời điểm bàn giao và hiển thị biên bản bàn giao.'),
    ],
    'UC4.3': [
        ('1', 'Chọn đơn đang thuê hoặc quá hạn trong danh sách nhận trả', 'Hiển thị danh sách các thiết bị khách đã nhận để tiến hành kiểm tra trả đồ.'),
        ('2', 'Đánh dấu thiết bị được trả và chọn tình trạng (Nguyên vẹn / Hư hỏng / Mất)', 'Cập nhật tình trạng thực tế của từng thiết bị và tự động tính mức bồi thường dự kiến nếu có hư hỏng hoặc mất mát.'),
        ('3', 'Nhấn nút "Lập biên bản nhận trả"', 'Lưu kết quả kiểm tra trả đồ, cập nhật trạng thái thiết bị về kho hoặc bảo trì và chuyển đơn sang bước đối soát.'),
    ],
    'UC4.4': [
        ('1', 'Chọn đơn thuê có nhãn "Quá hạn" trong danh sách', 'Hiển thị thanh cảnh báo số ngày quá hạn và mức phạt trễ hạn dự kiến.'),
        ('2', 'Nhấn nút "Nhật ký gọi"', 'Mở hộp thoại ghi nhận và xem lịch sử các lần liên hệ nhắc khách trả thiết bị.'),
        ('3', 'Nhấn nút "+ Lập phụ phí trễ"', 'Tự động tạo khoản phụ phí trễ hạn theo chính sách và gắn vào đơn thuê.'),
    ],
    'UC4.5': [
        ('1', 'Nhập từ khóa tìm kiếm (mã đơn, tên khách, số điện thoại) hoặc chọn bộ lọc ca trực/trạng thái', 'Hệ thống lọc và hiển thị danh sách các đơn thuê phù hợp cho nhân viên vận hành.'),
        ('2', 'Nhấn nút thao tác nhanh (Chuẩn bị, Nhận trả, Đối soát, Hồ sơ) tại một dòng đơn', 'Chuyển nhanh sang chức năng xử lý tương ứng hoặc mở hồ sơ chi tiết đơn thuê.'),
    ],
}
