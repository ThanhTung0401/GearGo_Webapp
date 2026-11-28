# -*- coding: utf-8 -*-
"""Phân hệ 5: Thanh toán, Phụ phí, Đối soát & Hoàn tiền (7 màn hình)."""

SCREENS = [
    ('SCR-5.1', 'Giao diện Thanh toán và xác nhận đơn', 'UC5.1', 'UC5_1'),
    ('SCR-5.2', 'Giao diện Lập phụ phí', 'UC5.2', 'UC5_2'),
    ('SCR-5.3', 'Giao diện Duyệt và xử lý tranh chấp phụ phí', 'UC5.3', 'UC5_3'),
    ('SCR-5.4', 'Giao diện Đối soát cọc và hoàn tất đơn', 'UC5.4', 'UC5_4'),
    ('SCR-5.5', 'Giao diện Thu tiền bổ sung', 'UC5.5', 'UC5_5'),
    ('SCR-5.6', 'Giao diện Thực hiện hoàn tiền', 'UC5.6', 'UC5_6'),
    ('SCR-5.7', 'Giao diện Điều chỉnh tài chính sau chốt', 'UC5.7', 'UC5_7'),
]

NATURAL_EVENTS = {
    'UC5.1': [
        ('1', 'Chọn kênh thanh toán (Cổng VNPay Sandbox hoặc Tiền mặt tại quầy) trong thời hạn giữ chỗ 15 phút', 'Hệ thống hiển thị giao diện thanh toán tương ứng: nút chuyển hướng sang VNPay Sandbox (v2.1.0) hoặc tùy chọn kết quả thanh toán tiền mặt (Thành công / Thất bại).'),
        ('2', 'Nhấn nút "Thanh toán qua VNPay Sandbox" hoặc xác nhận thanh toán tiền mặt / kiểm tra trạng thái giao dịch', 'Hệ thống chuyển hướng sang cổng VNPay Sandbox (hoặc ghi nhận thanh toán tiền mặt), xác thực callback và cập nhật trạng thái đơn sang Đã xác nhận.'),
    ],
    'UC5.2': [
        ('1', 'Chọn loại phụ phí, nhập số tiền và mô tả lý do phát sinh', 'Kiểm tra số tiền hợp lệ, không tính phí hao mòn thông thường và lý do đầy đủ trước khi lập.'),
        ('2', 'Nhấn nút lập phụ phí', 'Hệ thống lưu khoản phụ phí mới kèm trạng thái duyệt theo thẩm quyền (phí vượt ngưỡng giữ Chờ duyệt; chỉ khoản đã duyệt mới được đưa vào bảng đối soát).'),
    ],
    'UC5.3': [
        ('1', 'Nhấn nút "Xem chứng cứ & Kết luận" tại một yêu cầu tranh chấp phụ phí', 'Mở hộp thoại hiển thị hình ảnh bằng chứng bàn giao/nhận trả và nội dung khiếu nại của khách hàng.'),
        ('2', 'Chọn hướng xử lý (Chấp nhận, Giảm mức hoặc Hủy phụ phí), nhập ghi chú và nhấn xác nhận', 'Hệ thống lưu kết luận tranh chấp, cập nhật lại tổng phụ phí của đơn thuê và đóng hộp thoại.'),
    ],
    'UC5.4': [
        ('1', 'Nhấn nút "Đối soát" tại đơn thuê đang chờ đối soát', 'Mở bảng tổng hợp đối soát hiển thị tiền cọc đã giữ, tổng phụ phí và số tiền cần hoàn trả hoặc thu thêm.'),
        ('2', 'Nhấn nút "Chốt đối soát & Hoàn tất đơn"', 'Hệ thống chốt số liệu tài chính cuối cùng và chuyển trạng thái đơn thuê sang Hoàn tất.'),
    ],
    'UC5.5': [
        ('1', 'Nhấn nút "Thu thêm bổ sung" tại đơn có tổng phụ phí lớn hơn tiền cọc', 'Mở hộp thoại thu tiền bổ sung hiển thị chính xác số tiền khách cần thanh toán thêm.'),
        ('2', 'Chọn phương thức thanh toán (Tiền mặt kèm trạng thái Thành công/Thất bại, Thẻ POS hoặc VNPay Sandbox) và nhấn nút xác nhận', 'Hệ thống ghi nhận giao dịch thu bổ sung (hoặc chuyển hướng sang VNPay Sandbox và nhận callback), cập nhật số dư đơn thuê về cân bằng và đóng hộp thoại.'),
    ],
    'UC5.6': [
        ('1', 'Nhấn nút "Lập & xử lý hoàn tiền cọc" tại đơn có số dư cọc cần hoàn lại cho khách', 'Mở hộp thoại thực hiện hoàn tiền hiển thị số tiền hoàn trả và thông tin nhận tiền.'),
        ('2', 'Chọn phương thức hoàn tiền, nhập ghi chú giao dịch và nhấn xác nhận hoàn tiền', 'Hệ thống ghi nhận giao dịch hoàn cọc thành công và cập nhật trạng thái hoàn tiền trên đơn.'),
    ],
    'UC5.7': [
        ('1', 'Nhấn nút tạo điều chỉnh / bù trừ tài chính sau chốt', 'Mở biểu mẫu chọn đơn thuê đã chốt, nhập số tiền điều chỉnh và lý do bù trừ.'),
        ('2', 'Nhấn nút xác nhận lưu điều chỉnh', 'Hệ thống ghi nhận bút toán điều chỉnh tài chính sau chốt và cập nhật vào bảng lịch sử bù trừ.'),
    ],
}
