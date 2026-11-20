# -*- coding: utf-8 -*-
"""Phân hệ 8: Chính sách thuê & Khuyến mãi (5 màn hình)."""

SCREENS = [
    ('SCR-8.1', 'Giao diện Cấu hình chính sách', 'UC8.1', 'UC8_1'),
    ('SCR-8.2', 'Giao diện Thêm khuyến mãi', 'UC8.2', 'UC8_2'),
    ('SCR-8.3', 'Giao diện Cập nhật khuyến mãi', 'UC8.3', 'UC8_3'),
    ('SCR-8.4', 'Giao diện Tra cứu khuyến mãi', 'UC8.4', 'UC8_4'),
    ('SCR-8.5', 'Giao diện Ngừng chương trình khuyến mãi', 'UC8.5', 'UC8_5'),
]

NATURAL_EVENTS = {
    'UC8.1': [
        ('1', 'Chỉnh sửa các tham số chính sách thuê (tỷ lệ cọc, phí phạt trễ hạn, thời gian giữ chỗ, chính sách hủy)', 'Kiểm tra giá trị hợp lệ theo phạm vi cho phép.'),
        ('2', 'Nhấn nút lưu cấu hình chính sách', 'Hệ thống lưu cấu hình mới và áp dụng cho các giao dịch phát sinh tiếp theo.'),
    ],
    'UC8.2': [
        ('1', 'Nhấn nút "Thêm khuyến mãi"', 'Mở hộp thoại tạo chương trình khuyến mãi mới.'),
        ('2', 'Nhập mã ưu đãi, mức giảm, thời gian áp dụng, điều kiện đơn tối thiểu và nhấn lưu', 'Hệ thống kiểm tra trùng mã, tạo chương trình khuyến mãi mới và cập nhật bảng danh sách.'),
    ],
    'UC8.3': [
        ('1', 'Nhấn nút "Sửa" tại một chương trình khuyến mãi', 'Mở hộp thoại chỉnh sửa với thông tin hiện tại của chương trình.'),
        ('2', 'Cập nhật thông tin ưu đãi và nhấn lưu', 'Hệ thống lưu thay đổi và làm mới bảng khuyến mãi.'),
    ],
    'UC8.4': [
        ('1', 'Nhập mã khuyến mãi vào ô tìm kiếm hoặc chọn bộ lọc trạng thái', 'Hệ thống lọc và hiển thị các chương trình khuyến mãi khớp với điều kiện.'),
    ],
    'UC8.5': [
        ('1', 'Nhấn nút "Ngừng" / "Tạm dừng" tại chương trình khuyến mãi đang chạy', 'Hệ thống ngừng hiệu lực áp dụng của mã khuyến mãi và cập nhật trạng thái trong bảng.'),
    ],
}
