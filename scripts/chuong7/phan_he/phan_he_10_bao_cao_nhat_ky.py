# -*- coding: utf-8 -*-
"""Phân hệ 10: Báo cáo & Nhật ký hệ thống (4 màn hình)."""

SCREENS = [
    ('SCR-10.1', 'Giao diện Xem báo cáo vận hành', 'UC10.1', 'UC10_1'),
    ('SCR-10.2', 'Giao diện Xem báo cáo doanh thu và dòng tiền', 'UC10.2', 'UC10_2'),
    ('SCR-10.3', 'Giao diện Xem báo cáo nhập hàng', 'UC10.3', 'UC10_3'),
    ('SCR-10.4', 'Giao diện Tra cứu nhật ký và lịch sử', 'UC10.4', 'UC10_4'),
]

NATURAL_EVENTS = {
    'UC10.1': [
        ('1', 'Chọn khoảng thời gian thống kê hoặc bộ lọc ca làm việc', 'Hệ thống tổng hợp và cập nhật các chỉ số vận hành (đơn cần giao, cần thu, quá hạn, hoàn tất).'),
        ('2', 'Nhấn nút làm mới hoặc xuất báo cáo', 'Cập nhật số liệu vận hành mới nhất hoặc tải xuống tệp báo cáo.'),
    ],
    'UC10.2': [
        ('1', 'Chọn kỳ báo cáo (ngày, tháng, năm) trên màn hình báo cáo doanh thu', 'Hệ thống tính toán và hiển thị biểu đồ cùng bảng tổng hợp doanh thu, tiền cọc, phụ phí và dòng tiền thực thu.'),
    ],
    'UC10.3': [
        ('1', 'Chọn khoảng thời gian hoặc nhà cung cấp cần thống kê', 'Hệ thống tổng hợp báo cáo số lượng phiếu nhập, giá trị nhập hàng và tồn kho thiết bị tương ứng.'),
    ],
    'UC10.4': [
        ('1', 'Nhập từ khóa tìm kiếm hoặc lọc theo loại thao tác, người thực hiện và thời gian', 'Hệ thống truy vấn và hiển thị chi tiết nhật ký hoạt động của người dùng trong bảng lịch sử.'),
    ],
}
