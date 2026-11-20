# -*- coding: utf-8 -*-
"""Phân hệ 2: Tư vấn, Danh mục & Khả dụng (4 màn hình)."""

SCREENS = [
    ('SCR-2.1', 'Giao diện Tìm kiếm và lọc sản phẩm', 'UC2.1', 'UC2_1'),
    ('SCR-2.2', 'Giao diện Xem chi tiết sản phẩm', 'UC2.2', 'UC2_2'),
    ('SCR-2.3', 'Giao diện Kiểm tra khả dụng', 'UC2.3', 'UC2_3'),
    ('SCR-2.4', 'Giao diện Nhận tư vấn bộ dụng cụ bằng AI', 'UC2.4', 'UC2_4'),
]

NATURAL_EVENTS = {
    'UC2.1': [
        ('1', 'Nhập từ khóa vào ô tìm kiếm sản phẩm', 'Hệ thống lọc danh sách thiết bị có tên hoặc thương hiệu khớp với từ khóa vừa nhập.'),
        ('2', 'Chọn danh mục sản phẩm, khoảng giá hoặc ngày nhận – ngày trả', 'Hệ thống cập nhật danh sách sản phẩm hiển thị kèm trạng thái còn hàng tương ứng.'),
        ('3', 'Nhấn vào một thẻ sản phẩm', 'Chuyển sang giao diện Xem chi tiết sản phẩm tương ứng.'),
    ],
    'UC2.2': [
        ('1', 'Nhấn vào các ảnh thu nhỏ của sản phẩm', 'Thay đổi hình ảnh hiển thị chính theo ảnh thu nhỏ vừa chọn.'),
        ('2', 'Nhấn nút "Quay lại danh sách"', 'Quay trở về giao diện danh sách sản phẩm.'),
        ('3', 'Nhấn nút "Thêm vào giỏ thuê"', 'Thêm sản phẩm với số lượng và lịch thuê đã chọn vào giỏ thuê của khách hàng.'),
    ],
    'UC2.3': [
        ('1', 'Chọn ngày nhận đồ, ngày trả đồ và điều chỉnh số lượng thuê', 'Hệ thống tự động kiểm tra tồn kho khả dụng trong khoảng thời gian đã chọn, hiển thị số lượng còn trống và bảng tạm tính tiền thuê cùng tiền cọc.'),
        ('2', 'Nhấn nút "Thêm vào giỏ thuê"', 'Lưu sản phẩm kèm khoảng ngày thuê đã kiểm tra khả dụng vào giỏ thuê.'),
    ],
    'UC2.4': [
        ('1', 'Nhập thông tin nhu cầu chuyến đi (số người, địa điểm, thời tiết, ngân sách) và nhấn nút gợi ý', 'Hệ thống phân tích nhu cầu và đề xuất danh sách bộ dụng cụ dã ngoại phù hợp kèm tổng chi phí dự kiến.'),
        ('2', 'Nhấn nút thêm bộ dụng cụ gợi ý vào giỏ thuê', 'Đưa các sản phẩm được tư vấn vào giỏ thuê để khách hàng tiến hành đặt thuê.'),
    ],
}
