# -*- coding: utf-8 -*-
"""Phân hệ 7: Nhà cung cấp & Nhập kho (10 màn hình)."""

SCREENS = [
    ('SCR-7.1', 'Giao diện Thêm nhà cung cấp', 'UC7.1', 'UC7_1'),
    ('SCR-7.2', 'Giao diện Cập nhật nhà cung cấp', 'UC7.2', 'UC7_2'),
    ('SCR-7.3', 'Giao diện Tra cứu nhà cung cấp', 'UC7.3', 'UC7_3'),
    ('SCR-7.4', 'Giao diện Thay đổi tình trạng hợp tác', 'UC7.4', 'UC7_4'),
    ('SCR-7.5', 'Giao diện Lập phiếu nhập nháp', 'UC7.5', 'UC7_5'),
    ('SCR-7.6', 'Giao diện Sửa phiếu nhập nháp', 'UC7.6', 'UC7_6'),
    ('SCR-7.7', 'Giao diện Kiểm tra và xác nhận nhập kho', 'UC7.7', 'UC7_7'),
    ('SCR-7.8', 'Giao diện Tra cứu phiếu nhập', 'UC7.8', 'UC7_8'),
    ('SCR-7.9', 'Giao diện Hủy phiếu nhập nháp', 'UC7.9', 'UC7_9'),
    ('SCR-7.10', 'Giao diện Xử lý sai lệch phiếu nhập', 'UC7.10', 'UC7_10'),
]

NATURAL_EVENTS = {
    'UC7.1': [
        ('1', 'Nhấn nút "Thêm NCC mới"', 'Mở hộp thoại nhập thông tin nhà cung cấp mới.'),
        ('2', 'Nhập tên nhà cung cấp, thông tin liên hệ và nhấn lưu', 'Hệ thống kiểm tra dữ liệu, lưu nhà cung cấp mới và cập nhật bảng danh sách.'),
    ],
    'UC7.2': [
        ('1', 'Nhấn nút "Sửa" tại một dòng nhà cung cấp', 'Mở hộp thoại cập nhật với thông tin hiện có của nhà cung cấp.'),
        ('2', 'Chỉnh sửa thông tin và nhấn lưu', 'Hệ thống cập nhật thông tin nhà cung cấp và làm mới bảng danh sách.'),
    ],
    'UC7.3': [
        ('1', 'Nhập từ khóa tìm kiếm (mã, tên, số điện thoại nhà cung cấp) hoặc chọn bộ lọc tình trạng', 'Hệ thống lọc và hiển thị danh sách nhà cung cấp phù hợp trong bảng.'),
    ],
    'UC7.4': [
        ('1', 'Nhấn nút "Ngừng hợp tác" hoặc "Hợp tác lại" tại dòng nhà cung cấp', 'Hệ thống chuyển đổi tình trạng hợp tác của nhà cung cấp và cập nhật ngay nhãn trạng thái trong bảng.'),
    ],
    'UC7.5': [
        ('1', 'Nhấn nút "Tạo phiếu nháp"', 'Mở hộp thoại lập phiếu nhập hàng mới ở trạng thái nháp.'),
        ('2', 'Chọn nhà cung cấp, thêm các dòng sản phẩm nhập cùng số lượng, đơn giá và nhấn lưu nháp', 'Hệ thống kiểm tra nhà cung cấp đang hợp tác, tính tổng tiền phiếu nhập, lưu phiếu ở trạng thái Nháp (chưa tăng tồn kho) và hiển thị trong danh sách.'),
    ],
    'UC7.6': [
        ('1', 'Chọn một phiếu nhập ở trạng thái Nháp và nhấn nút "Sửa nháp"', 'Mở hộp thoại chỉnh sửa thông tin và chi tiết sản phẩm của phiếu nhập nháp.'),
        ('2', 'Cập nhật số lượng, đơn giá hoặc ghi chú và nhấn lưu', 'Hệ thống lưu thay đổi và tính lại tổng giá trị phiếu nhập.'),
    ],
    'UC7.7': [
        ('1', 'Chọn phiếu nhập nháp và nhấn nút "Kiểm nhận & Chốt kho"', 'Mở hộp thoại kiểm tra số lượng đạt, hàng lỗi cần bảo trì và hàng từ chối so với chứng từ nhập.'),
        ('2', 'Nhập mã serial cho hàng đạt/hàng lỗi, lý do từ chối (nếu có) và nhấn xác nhận nhập kho', 'Hệ thống chốt phiếu nhập, sinh mã thiết bị đạt ở trạng thái Sẵn sàng, hàng lỗi ở trạng thái Đang bảo trì và không tăng kho phần bị từ chối.'),
    ],
    'UC7.8': [
        ('1', 'Nhập từ khóa tìm kiếm hoặc lọc theo trạng thái phiếu nhập', 'Hệ thống lọc danh sách phiếu nhập theo điều kiện đã chọn.'),
        ('2', 'Chọn một phiếu nhập trong danh sách', 'Hiển thị thông tin chi tiết phiếu nhập, danh sách sản phẩm và các nút thao tác tương ứng.'),
    ],
    'UC7.9': [
        ('1', 'Chọn phiếu nhập ở trạng thái Nháp và nhấn nút "Hủy nháp"', 'Hệ thống yêu cầu xác nhận và chuyển phiếu nhập nháp sang trạng thái Đã hủy, không ảnh hưởng tồn kho.'),
    ],
    'UC7.10': [
        ('1', 'Chọn phiếu đã nhập kho và nhấn nút "Đề nghị điều chỉnh"', 'Mở hộp thoại ghi nhận sai lệch phiếu nhập sau khi đã chốt kho.'),
        ('2', 'Nhập chi tiết sai lệch, lý do và nhấn gửi đề nghị', 'Hệ thống lưu yêu cầu xử lý sai lệch phiếu nhập để quản lý xem xét và điều chỉnh.'),
    ],
}
