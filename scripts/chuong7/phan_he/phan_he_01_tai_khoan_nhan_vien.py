# -*- coding: utf-8 -*-
"""Phân hệ 1: Quản lý Tài khoản và Nhân viên (13 màn hình)."""

SCREENS = [
    ('SCR-1.1', 'Giao diện Đăng ký tài khoản', 'UC1.1', 'UC1_1'),
    ('SCR-1.2', 'Giao diện Đăng nhập', 'UC1.2', 'UC1_2'),
    ('SCR-1.3', 'Giao diện Đăng xuất', 'UC1.3', 'UC1_3'),
    ('SCR-1.4', 'Giao diện Khôi phục mật khẩu', 'UC1.4', 'UC1_4'),
    ('SCR-1.5', 'Giao diện Xem thông tin cá nhân', 'UC1.5', 'UC1_5'),
    ('SCR-1.6', 'Giao diện Cập nhật thông tin cá nhân', 'UC1.6', 'UC1_6'),
    ('SCR-1.7', 'Giao diện Tạo tài khoản nhân viên', 'UC1.7', 'UC1_7'),
    ('SCR-1.8', 'Giao diện Cập nhật thông tin nhân viên', 'UC1.8', 'UC1_8'),
    ('SCR-1.9', 'Giao diện Tra cứu nhân viên', 'UC1.9', 'UC1_9'),
    ('SCR-1.10', 'Giao diện Phân quyền nhân viên', 'UC1.10', 'UC1_10'),
    ('SCR-1.11', 'Giao diện Khóa và mở khóa tài khoản', 'UC1.11', 'UC1_11'),
    ('SCR-1.12', 'Giao diện Đổi mật khẩu', 'UC1.12', 'UC1_12'),
    ('SCR-1.13', 'Giao diện Tra cứu tài khoản khách hàng', 'UC1.13', 'UC1_13'),
]

NATURAL_EVENTS = {
    'UC1.1': [
        ('1', 'Nhấn nút "Tạo tài khoản"', 'Hệ thống kiểm tra thông tin đăng ký (họ tên, email, số điện thoại, mật khẩu khớp nhau và đã đồng ý điều khoản). Nếu hợp lệ thì tạo tài khoản mới và thông báo thành công; nếu thiếu hoặc sai định dạng thì hiển thị thông báo lỗi tương ứng.'),
        ('2', 'Nhấn nút "Hiện" / "Ẩn" tại ô mật khẩu', 'Chuyển đổi chế độ hiển thị hoặc che ký tự mật khẩu đang nhập.'),
        ('3', 'Nhấn liên kết "Đăng nhập ngay" hoặc "Về trang chủ"', 'Chuyển người dùng sang giao diện Đăng nhập hoặc quay lại trang chủ.'),
    ],
    'UC1.2': [
        ('1', 'Nhấn nút "Đăng nhập hệ thống"', 'Hệ thống kiểm tra thông tin tài khoản và mật khẩu. Nếu hợp lệ thì đăng nhập và chuyển sang không gian làm việc tương ứng với vai trò; nếu sai thông tin thì hiển thị thông báo lỗi; nếu tài khoản bị khóa thì hiển thị hộp cảnh báo lý do khóa cùng thông tin liên hệ hỗ trợ.'),
        ('2', 'Nhấn nút "Hiện" / "Ẩn" tại ô mật khẩu', 'Bật hoặc tắt chế độ hiển thị ký tự mật khẩu.'),
        ('3', 'Nhấn liên kết "Quên mật khẩu?"', 'Chuyển sang giao diện Khôi phục mật khẩu.'),
        ('4', 'Nhấn liên kết "Đăng ký ngay"', 'Chuyển sang giao diện Đăng ký tài khoản mới.'),
        ('5', 'Nhấn một trong các nút "Chọn nhanh tài khoản kiểm thử"', 'Tự động điền sẵn thông tin đăng nhập mẫu tương ứng vào ô tài khoản và mật khẩu để kiểm thử nhanh.'),
    ],
    'UC1.3': [
        ('1', 'Nhấn nút "Thoát"', 'Thoát khỏi tài khoản hiện tại, kết thúc phiên làm việc và chuyển về giao diện trang chủ ở trạng thái chưa đăng nhập.'),
    ],
    'UC1.4': [
        ('1', 'Nhập Email/Số điện thoại và nhấn nút gửi mã xác thực', 'Hệ thống kiểm tra thông tin tài khoản và gửi mã xác thực OTP, sau đó chuyển sang bước nhập mã xác thực.'),
        ('2', 'Nhập mã OTP và nhấn nút xác nhận', 'Hệ thống kiểm tra tính hợp lệ của mã OTP; nếu đúng thì cho phép đặt lại mật khẩu mới, nếu sai hoặc hết hạn thì thông báo yêu cầu nhập lại.'),
        ('3', 'Nhấn nút quay lại đăng nhập', 'Hủy thao tác khôi phục và quay trở về giao diện Đăng nhập.'),
    ],
    'UC1.5': [
        ('1', 'Chọn mục "Tài khoản" trên thanh điều hướng', 'Hệ thống tải và hiển thị đầy đủ thông tin hồ sơ cá nhân của người dùng hiện tại.'),
        ('2', 'Chuyển đổi giữa các tab trong trang tài khoản', 'Chuyển sang xem nội dung tương ứng như hồ sơ cá nhân, đánh giá sản phẩm hoặc đổi mật khẩu.'),
    ],
    'UC1.6': [
        ('1', 'Chỉnh sửa thông tin cá nhân và nhấn nút "Lưu thay đổi"', 'Hệ thống kiểm tra tính hợp lệ của dữ liệu mới (họ tên, số điện thoại, địa chỉ), cập nhật vào hồ sơ cá nhân và hiển thị thông báo thành công.'),
    ],
    'UC1.7': [
        ('1', 'Nhấn nút "Thêm nhân viên mới"', 'Mở hộp thoại nhập thông tin tạo tài khoản nhân viên mới.'),
        ('2', 'Nhập đầy đủ thông tin và nhấn nút "Lưu" / "Tạo tài khoản"', 'Hệ thống kiểm tra dữ liệu (trùng email, tên đăng nhập, định dạng số điện thoại), tạo tài khoản nhân viên mới, đóng hộp thoại và cập nhật lại bảng danh sách nhân viên.'),
        ('3', 'Nhấn nút "Hủy" / "Đóng"', 'Đóng hộp thoại tạo mới mà không lưu thay đổi.'),
    ],
    'UC1.8': [
        ('1', 'Nhấn nút "Sửa" tại một dòng nhân viên', 'Mở hộp thoại cập nhật với thông tin hiện tại của nhân viên đã được điền sẵn.'),
        ('2', 'Chỉnh sửa thông tin và nhấn nút "Lưu" / "Cập nhật"', 'Hệ thống kiểm tra dữ liệu hợp lệ, lưu thông tin cập nhật của nhân viên, đóng hộp thoại và làm mới bảng danh sách.'),
        ('3', 'Nhấn nút "Hủy" / "Đóng"', 'Hủy bỏ thay đổi và đóng hộp thoại.'),
    ],
    'UC1.9': [
        ('1', 'Nhập từ khóa vào ô tìm kiếm nhân viên', 'Hệ thống lọc và hiển thị danh sách nhân viên khớp với họ tên, mã nhân viên hoặc tên đăng nhập.'),
        ('2', 'Thay đổi bộ lọc vai trò hoặc trạng thái làm việc', 'Cập nhật danh sách nhân viên trong bảng theo đúng tiêu chí đã chọn.'),
    ],
    'UC1.10': [
        ('1', 'Chọn một vai trò trong danh sách vai trò', 'Hiển thị ma trận các quyền hạn chi tiết hiện đang được gán cho vai trò đó.'),
        ('2', 'Đánh dấu hoặc bỏ chọn các ô quyền hạn và nhấn nút lưu', 'Hệ thống cập nhật danh sách quyền của vai trò và thông báo lưu thành công.'),
    ],
    'UC1.11': [
        ('1', 'Nhấn nút "Khóa" hoặc "Mở khóa" tại dòng nhân viên', 'Mở hộp thoại xác nhận thay đổi trạng thái tài khoản (yêu cầu nhập lý do khi khóa tài khoản).'),
        ('2', 'Nhập lý do và nhấn nút xác nhận trong hộp thoại', 'Hệ thống cập nhật trạng thái khóa/mở khóa của tài khoản, đóng hộp thoại và cập nhật lại trạng thái trên bảng danh sách.'),
    ],
    'UC1.12': [
        ('1', 'Nhập mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu và nhấn nút "Đổi mật khẩu"', 'Hệ thống kiểm tra mật khẩu hiện tại có chính xác không và mật khẩu mới có khớp nhau không; nếu hợp lệ thì cập nhật mật khẩu mới và thông báo thành công.'),
    ],
    'UC1.13': [
        ('1', 'Nhập từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khách hàng', 'Hệ thống lọc và hiển thị danh sách tài khoản khách hàng khớp với điều kiện tìm kiếm.'),
        ('2', 'Chọn một khách hàng trong danh sách', 'Hiển thị thông tin chi tiết và lịch sử thuê của khách hàng đó.'),
    ],
}
