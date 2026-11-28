# -*- coding: utf-8 -*-
"""Phân hệ 3: Giỏ thuê, Đặt thuê & Hủy đơn (4 màn hình)."""

SCREENS = [
    ('SCR-3.1', 'Giao diện Quản lý giỏ thuê và báo giá', 'UC3.1', 'UC3_1'),
    ('SCR-3.2', 'Giao diện Tạo đơn thuê và giữ chỗ', 'UC3.2', 'UC3_2'),
    ('SCR-3.3', 'Giao diện Theo dõi đơn thuê', 'UC3.3', 'UC3_3'),
    ('SCR-3.4', 'Giao diện Hủy đơn thuê', 'UC3.4', 'UC3_4'),
]

NATURAL_EVENTS = {
    'UC3.1': [
        ('1', 'Thay đổi số lượng, ngày thuê hoặc nhấn nút xóa sản phẩm trong giỏ', 'Hệ thống cập nhật lại danh sách sản phẩm và tự động tính lại tiền thuê, tiền cọc cùng tổng tiền thanh toán.'),
        ('2', 'Nhập mã khuyến mãi và nhấn nút áp dụng', 'Hệ thống kiểm tra điều kiện mã ưu đãi và trừ số tiền giảm giá vào tổng đơn.'),
        ('3', 'Nhấn nút "Tiến hành xác nhận thuê"', 'Chuyển sang giao diện Tạo đơn thuê và giữ chỗ.'),
    ],
    'UC3.2': [
        ('1', 'Điền thông tin người nhận, chọn phương thức thanh toán (VNPay Sandbox, Tiền mặt tại cửa hàng hoặc Ví điện tử qua VNPay) và đánh dấu đồng ý điều khoản thuê', 'Hệ thống kiểm tra thông tin bắt buộc, lưu kênh thanh toán đã chọn và bật nút xác nhận đặt thuê.'),
        ('2', 'Nhấn nút "Xác nhận đặt thuê & Giữ chỗ 15 phút"', 'Hệ thống tạo đơn thuê mới, giữ chỗ thiết bị trong kho và chuyển sang giao diện Thanh toán và xác nhận đơn tương ứng với kênh đã chọn.'),
    ],
    'UC3.3': [
        ('1', 'Chọn các tab trạng thái đơn thuê (Chờ thanh toán, Đã xác nhận, Đang thuê, Hoàn tất...)', 'Lọc danh sách đơn thuê của khách hàng theo đúng trạng thái được chọn.'),
        ('2', 'Nhấn vào một đơn thuê trong danh sách', 'Hiển thị thông tin chi tiết đơn thuê, danh sách thiết bị và tiến độ xử lý.'),
    ],
    'UC3.4': [
        ('1', 'Nhấn nút "Yêu cầu hủy đơn thuê" trên đơn đang chờ hoặc đã xác nhận', 'Mở hộp thoại xác nhận hủy đơn và hiển thị chính sách hoàn tiền tương ứng.'),
        ('2', 'Chọn hoặc nhập lý do hủy và nhấn nút xác nhận hủy đơn', 'Hệ thống hủy đơn thuê, giải phóng thiết bị giữ chỗ, tạo yêu cầu hoàn tiền (nếu đã thanh toán) và cập nhật trạng thái đơn.'),
        ('3', 'Nhấn nút đóng hộp thoại', 'Hủy thao tác và giữ nguyên trạng thái đơn thuê.'),
    ],
}
