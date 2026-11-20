# -*- coding: utf-8 -*-
"""Phân hệ 6: Danh mục, Sản phẩm, Thiết bị & Bảo trì (15 màn hình)."""

SCREENS = [
    ('SCR-6.1', 'Giao diện Thêm danh mục sản phẩm', 'UC6.1', 'UC6_1'),
    ('SCR-6.2', 'Giao diện Cập nhật danh mục sản phẩm', 'UC6.2', 'UC6_2'),
    ('SCR-6.3', 'Giao diện Tra cứu danh mục sản phẩm', 'UC6.3', 'UC6_3'),
    ('SCR-6.4', 'Giao diện Thay đổi trạng thái danh mục', 'UC6.4', 'UC6_4'),
    ('SCR-6.5', 'Giao diện Thêm sản phẩm', 'UC6.5', 'UC6_5'),
    ('SCR-6.6', 'Giao diện Cập nhật sản phẩm', 'UC6.6', 'UC6_6'),
    ('SCR-6.7', 'Giao diện Tra cứu sản phẩm', 'UC6.7', 'UC6_7'),
    ('SCR-6.8', 'Giao diện Thay đổi trạng thái kinh doanh sản phẩm', 'UC6.8', 'UC6_8'),
    ('SCR-6.9', 'Giao diện Tra cứu thiết bị và lịch sử sử dụng', 'UC6.9', 'UC6_9'),
    ('SCR-6.10', 'Giao diện Kiểm kê và đề nghị điều chỉnh kho', 'UC6.10', 'UC6_10'),
    ('SCR-6.11', 'Giao diện Duyệt điều chỉnh kho', 'UC6.11', 'UC6_11'),
    ('SCR-6.12', 'Giao diện Lập và theo dõi bảo trì', 'UC6.12', 'UC6_12'),
    ('SCR-6.13', 'Giao diện Nghiệm thu bảo trì', 'UC6.13', 'UC6_13'),
    ('SCR-6.14', 'Giao diện Ngừng sử dụng thiết bị', 'UC6.14', 'UC6_14'),
    ('SCR-6.15', 'Giao diện Điều chuyển thiết bị sang sản phẩm khác', 'UC6.15', 'UC6_15'),
]

NATURAL_EVENTS = {
    'UC6.1': [
        ('1', 'Nhấn nút "Thêm danh mục"', 'Mở hộp thoại nhập thông tin danh mục sản phẩm mới.'),
        ('2', 'Nhập tên danh mục, mô tả và nhấn nút lưu', 'Hệ thống kiểm tra trùng tên, tạo danh mục mới, đóng hộp thoại và hiển thị trong bảng danh mục.'),
    ],
    'UC6.2': [
        ('1', 'Nhấn nút "Sửa" tại một dòng danh mục', 'Mở hộp thoại chỉnh sửa với dữ liệu hiện tại của danh mục.'),
        ('2', 'Cập nhật thông tin và nhấn nút lưu', 'Hệ thống lưu thay đổi, đóng hộp thoại và cập nhật lại dòng dữ liệu trong bảng.'),
    ],
    'UC6.3': [
        ('1', 'Nhập từ khóa vào ô tìm kiếm danh mục hoặc thay đổi bộ lọc trạng thái', 'Hệ thống lọc và hiển thị danh sách danh mục sản phẩm khớp với điều kiện.'),
    ],
    'UC6.4': [
        ('1', 'Nhấn nút "Ẩn" hoặc "Hiện" tại một dòng danh mục', 'Hệ thống chuyển đổi trạng thái hiển thị của danh mục trên trang khách hàng và cập nhật nhãn trạng thái ngay trong bảng.'),
    ],
    'UC6.5': [
        ('1', 'Nhấn nút "Thêm sản phẩm"', 'Mở hộp thoại nhập thông tin sản phẩm mới (tên, danh mục, thương hiệu, giá thuê, tiền cọc, mô tả).'),
        ('2', 'Điền đầy đủ thông tin và nhấn nút lưu', 'Hệ thống kiểm tra dữ liệu hợp lệ, tạo sản phẩm mới, đóng hộp thoại và cập nhật bảng danh sách sản phẩm.'),
    ],
    'UC6.6': [
        ('1', 'Nhấn nút "Sửa" tại một dòng sản phẩm', 'Mở hộp thoại cập nhật với thông tin hiện có của sản phẩm.'),
        ('2', 'Chỉnh sửa thông tin cần thiết và nhấn nút lưu', 'Hệ thống lưu thông tin cập nhật của sản phẩm và làm mới bảng danh sách.'),
    ],
    'UC6.7': [
        ('1', 'Nhập từ khóa tìm kiếm hoặc chọn bộ lọc danh mục, trạng thái kinh doanh', 'Hệ thống lọc và hiển thị danh sách sản phẩm tương ứng trong bảng.'),
        ('2', 'Nhấn vào một dòng sản phẩm', 'Hiển thị khung thông tin chi tiết của sản phẩm ở bên cạnh.'),
    ],
    'UC6.8': [
        ('1', 'Chọn một sản phẩm trong bảng danh sách', 'Hiển thị khung chi tiết sản phẩm có mục chọn trạng thái kinh doanh.'),
        ('2', 'Thay đổi giá trị trong ô chọn trạng thái kinh doanh', 'Hệ thống cập nhật trạng thái kinh doanh của sản phẩm (Đang kinh doanh, Tạm ngừng, Ngừng kinh doanh) và thông báo kết quả.'),
    ],
    'UC6.9': [
        ('1', 'Nhập mã thiết bị (Serial) hoặc lọc theo trạng thái thiết bị', 'Hiển thị danh sách thiết bị vật lý và vòng đời sử dụng tương ứng.'),
        ('2', 'Chọn một thiết bị trong bảng', 'Xem chi tiết lịch sử cho thuê, bảo trì và điều chuyển của thiết bị đó.'),
    ],
    'UC6.10': [
        ('1', 'Nhấn nút tạo đề nghị điều chỉnh kho / kiểm kê', 'Mở biểu mẫu lập phiếu đề nghị điều chỉnh số lượng hoặc tình trạng tồn kho.'),
        ('2', 'Chọn thiết bị, nhập số lượng chênh lệch, lý do và nhấn gửi đề nghị', 'Hệ thống lưu phiếu đề nghị điều chỉnh kho ở trạng thái chờ duyệt và hiển thị trong danh sách.'),
    ],
    'UC6.11': [
        ('1', 'Nhấn nút kiểm tra tác động / duyệt tại một phiếu đề nghị điều chỉnh kho', 'Mở hộp thoại xem chi tiết chênh lệch tồn kho và mức độ ảnh hưởng tới các đơn đặt trước.'),
        ('2', 'Nhấn nút phê duyệt hoặc từ chối', 'Hệ thống cập nhật trạng thái phiếu đề nghị và tự động đồng bộ lại tồn kho nếu được phê duyệt.'),
    ],
    'UC6.12': [
        ('1', 'Nhấn nút "Tạo phiếu bảo trì"', 'Mở hộp thoại lập phiếu bảo trì cho thiết bị hư hỏng hoặc đến hạn bảo dưỡng.'),
        ('2', 'Chọn thiết bị, mô tả lỗi, chi phí dự kiến và nhấn lưu', 'Hệ thống tạo phiếu bảo trì mới và chuyển trạng thái thiết bị sang Đang bảo trì.'),
    ],
    'UC6.13': [
        ('1', 'Nhấn nút "Nghiệm thu" tại một phiếu bảo trì đang thực hiện', 'Mở hộp thoại nghiệm thu bảo trì để nhập kết quả kiểm tra và chi phí thực tế.'),
        ('2', 'Nhập kết luận đạt yêu cầu và nhấn xác nhận nghiệm thu', 'Hệ thống hoàn tất phiếu bảo trì và đưa thiết bị trở lại trạng thái sẵn sàng cho thuê.'),
    ],
    'UC6.14': [
        ('1', 'Nhấn nút "Sửa" tại dòng thiết bị trong danh sách vòng đời thiết bị', 'Mở hộp thoại cập nhật trạng thái thiết bị vật lý.'),
        ('2', 'Chọn trạng thái ngừng sử dụng/thanh lý, nhập lý do và nhấn lưu', 'Hệ thống khóa thiết bị khỏi danh sách cho thuê và ghi nhận lịch sử ngừng sử dụng.'),
    ],
    'UC6.15': [
        ('1', 'Nhấn nút "Điều chuyển" trên màn hình Kho & Bảo trì', 'Mở hộp thoại điều chuyển thiết bị vật lý sang nhóm sản phẩm khác.'),
        ('2', 'Chọn thiết bị nguồn, sản phẩm đích, nhập lý do và nhấn xác nhận', 'Hệ thống cập nhật liên kết sản phẩm cho thiết bị và ghi nhận lịch sử điều chuyển.'),
    ],
}
