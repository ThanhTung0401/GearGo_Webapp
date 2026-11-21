# -*- coding: utf-8 -*-
"""Phân hệ 9: Đánh giá & Thông báo (4 màn hình)."""

SCREENS = [
    ('SCR-9.1', 'Giao diện Gửi đánh giá sản phẩm', 'UC9.1', 'UC9_1'),
    ('SCR-9.2', 'Giao diện Kiểm duyệt đánh giá', 'UC9.2', 'UC9_2'),
    ('SCR-9.3', 'Giao diện Xem thông báo', 'UC9.3', 'UC9_3'),
    ('SCR-9.4', 'Giao diện Quản lý nội dung và gửi thông báo', 'UC9.4', 'UC9_4'),
]

NATURAL_EVENTS = {
    'UC9.1': [
        ('1', 'Chọn số sao đánh giá (1–5 sao), nhập nhận xét và đính kèm hình ảnh (tùy chọn) cho sản phẩm thuộc đơn đã hoàn tất', 'Kiểm tra điều kiện sở hữu đơn hoàn tất, định dạng ảnh và chống đánh giá trùng lặp.'),
        ('2', 'Nhấn nút gửi đánh giá', 'Hệ thống lưu đánh giá mới gắn với chứng từ thuê và hiển thị thông báo thành công.'),
    ],
    'UC9.2': [
        ('1', 'Lọc đánh giá theo trạng thái hiển thị hoặc số sao', 'Hiển thị danh sách đánh giá khách hàng kèm căn cứ đơn thuê để xem xét.'),
        ('2', 'Nhấn nút "Ẩn vi phạm" (kèm lý do) hoặc "Bỏ ẩn" tại một đánh giá', 'Hệ thống cập nhật trạng thái hiển thị công khai và ghi nhật ký kiểm duyệt mà không sửa điểm hay nội dung gốc của khách.'),
    ],
    'UC9.3': [
        ('1', 'Nhấn vào một thông báo trong danh sách', 'Đánh dấu thông báo là đã đọc và mở nội dung chi tiết hoặc đơn thuê liên quan.'),
        ('2', 'Nhấn nút đánh dấu đọc tất cả', 'Cập nhật toàn bộ thông báo chưa đọc sang trạng thái đã đọc.'),
    ],
    'UC9.4': [
        ('1', 'Nhập tiêu đề, nội dung thông báo và chọn đối tượng nhận', 'Chuẩn bị nội dung thông báo hệ thống cần phát hành.'),
        ('2', 'Nhấn nút gửi thông báo', 'Hệ thống phát thông báo tới nhóm người dùng đã chọn và lưu vào lịch sử gửi.'),
    ],
}
