# -*- coding: utf-8 -*-
"""
Bộ chuẩn hóa toàn bộ thành phần giao diện (Bảng a) cho 71 màn hình Chương 7:
1. Làm sạch Tên thành phần: bỏ số đếm (9), (22), (17 thiết bị), (5 phiếu), mã (UCx.y), ký tự ẩn \uFE0F,
   chuyển placeholder ví dụ (VD: CAMPGO10 -> Nhập mã khuyến mãi), sửa nhãn bị cắt cụt, tổng quát hóa dòng dữ liệu mẫu.
2. Ánh xạ sang Kiểu (React) chuẩn Frontend: Input (text|password|email|tel|number|date|search),
   Textarea, Select, Checkbox, Radio, Button, Button (submit), Group Button, Table, Table Row, Card, Alert Box, Image, Image List.
3. Chuẩn hóa Ý nghĩa, Miền giá trị, Giá trị mặc định sát Frontend và điền ĐẦY ĐỦ 100% cột Ghi chú (0 ô trống).
"""
import re

# Tập Kiểu (React) hợp lệ để audit kiểm tra
VALID_REACT_TYPES = {
    "Input (text)",
    "Input (password)",
    "Input (email)",
    "Input (tel)",
    "Input (number)",
    "Input (date)",
    "Input (search)",
    "Textarea",
    "Select",
    "Checkbox",
    "Radio",
    "Button",
    "Button (submit)",
    "Group Button",
    "Table",
    "Table Row",
    "Card",
    "Alert Box",
    "Image",
    "Image List",
}

# Ánh xạ sửa trực tiếp các nhãn cụ thể bị cắt cụt / placeholder ví dụ / dữ liệu mẫu
EXACT_NAME_FIXES = {
    "VD: CAMPGO10": "Nhập mã khuyến mãi",
    "Ghi chú chung của nhân viên nhận trả đợt này (tù": "Ghi chú chung của nhân viên nhận trả",
    "Ghi chú kết luận & Căn cứ xử lý (Lưu vết kiểm to": "Ghi chú kết luận và căn cứ xử lý",
    "Mức giảm tối đa (VNĐ, để trống nếu không giới hạ": "Mức giảm tối đa (VNĐ)",
    "Đầy đủ phụ kiện tiêu chuẩn (cọc, dây, cáp sạc...": "Đầy đủ phụ kiện tiêu chuẩn",
    "Tìm theo mã NCC, tên công ty, người liên hệ, SĐT": "Ô tìm kiếm nhà cung cấp",
    "Tìm theo tên, mã NV, username...": "Ô tìm kiếm nhân viên",
    "Tìm theo tên, SĐT, email...": "Ô tìm kiếm khách hàng",
    "Tìm mã đơn, tên khách, SĐT...": "Ô tìm kiếm đơn thuê",
    "Tìm tên sản phẩm, mã, thương hiệu...": "Ô tìm kiếm sản phẩm",
    "Tìm mã phiếu, NCC, người lập...": "Ô tìm kiếm phiếu nhập",
    "Tìm kiếm theo mã code hoặc tên chương trình...": "Ô tìm kiếm khuyến mãi",
    "Tìm theo sản phẩm, khách hàng, nội dung...": "Ô tìm kiếm đánh giá",
    "Tìm theo người thực hiện, hành động, chứng từ...": "Ô tìm kiếm nhật ký hoạt động",
    "Quét barcode / mã thiết bị hoặc tên sản phẩm...": "Ô quét mã hoặc tìm thiết bị",
    "Ghi chú chi tiết lỗi/hư hỏng hoặc tình trạng...": "Ghi chú chi tiết tình trạng thiết bị",
    "Ghi chú cho cửa hàng (tùy chọn)": "Ghi chú cho cửa hàng",
    "Đơn liên quan (nếu có):": "Đơn thuê liên quan",
    "Số tiền khách đưa (đ):": "Số tiền khách đưa (đ)",
    "Chi phí sửa chữa thực tế (đ):": "Chi phí sửa chữa thực tế (đ)",
    "Chi phí dự tính (đ):": "Chi phí dự tính (đ)",
    "Hạn hẹn mới (nếu có)": "Hạn hẹn trả mới",
    "Mã tài khoản nhận cụ thể (tùy chọn)": "Mã tài khoản nhận cụ thể",
    "Giới hạn tổng lượt dùng (Để trống = Vô hạn)": "Giới hạn tổng lượt dùng",
    "Tiếp tục thanh toán (15p)": "Tiếp tục thanh toán",
    "Xác nhận kho khớp 100% (Hoàn tất kiểm kê)": "Xác nhận hoàn tất kiểm kê",
}


def clean_component_name(raw_name: str) -> str:
    """Làm sạch tên thành phần khỏi số đếm động, mã UC, ký tự ẩn và dữ liệu mẫu."""
    name = (raw_name or "").replace("\uFE0F", "").replace("\u200D", "").strip()
    if name in EXACT_NAME_FIXES:
        return EXACT_NAME_FIXES[name]

    # Nếu là tên dòng đơn hàng mẫu (VD: "ORD-202611-109 Đỗ Thanh Sơn Chờ đối soát")
    if re.match(r"^(ORD|DT|DH)-\d+", name):
        return "Mục chọn đơn thuê trong danh sách"
    if re.match(r"^PN-\d+", name):
        return "Mục chọn phiếu nhập trong danh sách"
    if re.match(r"^[A-Z_]+:\s*\d+$", name):
        return "Thẻ lọc nhanh theo loại đối tượng"

    # Bỏ mã UC trong ngoặc: (UC1.6), (UC2.4.1), (UC10.2.1)...
    name = re.sub(r"\s*\(UC[\d.]+\)", "", name, flags=re.IGNORECASE)
    # Bỏ số đếm trong ngoặc: (9), (22), (0), (17 thiết bị), (5 phiếu)...
    name = re.sub(r"\s*\(\d+(?:\s+(?:thiết bị|phiếu|đơn|mục|sản phẩm))?\)", "", name, flags=re.IGNORECASE)
    # Bỏ số thứ tự đầu tab kiểu "1. Chuẩn bị kho", "2. Doanh thu thuần"
    name = re.sub(r"^\d+\.\s+", "", name)
    # Bỏ số đếm rời cuối nút kiểu "Chuẩn bị kho 4", "Tiếp khách & Bàn giao 1"
    name = re.sub(r"\s+\d+$", "", name)
    # Bỏ dấu hai chấm và dấu ba chấm cuối
    name = re.sub(r"[:…]+$", "", name).strip()
    name = re.sub(r"\.\.\.$", "", name).strip()
    # Thay username -> tên đăng nhập
    name = re.sub(r"\busername\b", "tên đăng nhập", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def map_react_type(raw_type: str, name: str) -> str:
    """Ánh xạ kiểu giao diện sang Kiểu (React) chuẩn frontend."""
    t = (raw_type or "").strip()
    low_name = name.lower()

    if t in VALID_REACT_TYPES:
        return t

    if t == "Text box":
        if any(k in low_name for k in ["tìm kiếm", "quét mã", "tìm theo", "tìm mã"]):
            return "Input (search)"
        if "email" in low_name and "sđt" not in low_name and "tên đăng nhập" not in low_name:
            return "Input (email)"
        if any(k in low_name for k in ["số điện thoại", "điện thoại", "sđt"]) and "email" not in low_name:
            return "Input (tel)"
        return "Input (text)"
    if t == "Password box":
        return "Input (password)"
    if t == "Number box":
        return "Input (number)"
    if t == "Date picker":
        return "Input (date)"
    if t == "Combobox":
        return "Select"
    if t == "Textarea":
        return "Textarea"
    if t == "Checkbox":
        return "Checkbox"
    if t == "Radio button":
        return "Radio"
    if t == "Alert box":
        return "Alert Box"
    if t == "Table row":
        return "Table Row"
    if t == "Image list":
        return "Image List"
    if t == "Button":
        if any(k in low_name for k in ["đăng nhập hệ thống", "tạo tài khoản", "lưu nhân viên", "lưu thay đổi", "xác nhận đặt thuê", "lưu quyền hạn", "đổi mật khẩu", "xác nhận hủy đơn", "gửi đánh giá"]):
            return "Button (submit)"
        return "Button"
    return "Button"


def build_meaning(name: str, react_type: str, raw_meaning: str) -> str:
    """Viết lại Ý nghĩa tự nhiên, chính xác theo tên thành phần đã làm sạch."""
    low = name.lower()

    # Các nút lọc trạng thái / tab phổ biến
    filter_tabs = {
        "tất cả": "Hiển thị toàn bộ danh sách không lọc theo trạng thái",
        "chờ thanh toán": "Lọc hiển thị các đơn thuê đang chờ thanh toán",
        "đã xác nhận": "Lọc hiển thị các đơn thuê đã được xác nhận",
        "đang thuê": "Lọc hiển thị các đơn thuê đang trong thời gian thuê",
        "hoàn tất": "Lọc hiển thị các đơn đã hoàn tất đối soát",
        "hết hạn": "Lọc hiển thị các đơn đã quá hạn thanh toán hoặc giữ chỗ",
        "đã hủy": "Lọc hiển thị các đơn thuê đã bị hủy",
        "đang xử lý": "Lọc hiển thị các đơn đang trong quá trình vận hành xử lý",
        "cần giao hôm nay": "Lọc nhanh các đơn thuê có lịch bàn giao trong ngày hôm nay",
        "cần thu hôm nay": "Lọc nhanh các đơn thuê có lịch nhận trả trong ngày hôm nay",
        "quá hạn": "Lọc nhanh các đơn thuê đã quá hạn trả thiết bị",
        "trả 1 phần": "Lọc nhanh các đơn thuê khách mới trả một phần thiết bị",
        "vận hành kho": "Chuyển sang tab báo cáo vận hành kho và công suất thiết bị",
        "doanh thu thuần": "Chuyển sang tab báo cáo doanh thu thuần theo kỳ",
        "dòng tiền thực tế": "Chuyển sang tab báo cáo dòng tiền thu chi và tiền cọc thực tế",
        "nhập kho & tài sản": "Chuyển sang tab báo cáo chứng từ nhập kho và tài sản thiết bị",
        "chuẩn bị kho": "Chuyển sang bước chuẩn bị và gán mã thiết bị cho đơn thuê",
        "tiếp khách & bàn giao": "Chuyển sang bước tiếp khách và bàn giao thiết bị tại quầy",
        "hồ sơ cá nhân": "Chuyển sang tab xem và cập nhật thông tin hồ sơ cá nhân",
        "đổi mật khẩu": "Chuyển sang tab thay đổi mật khẩu tài khoản",
        "đánh giá sản phẩm": "Chuyển sang tab quản lý và gửi đánh giá các sản phẩm đã thuê",
        "danh sách kho": "Chuyển sang tab danh sách thiết bị hiện có trong kho",
        "phiếu bảo trì & sửa chữa": "Chuyển sang tab quản lý phiếu bảo trì và sửa chữa thiết bị",
        "nhập hàng & kiểm nhận": "Chuyển sang tab danh sách phiếu nhập hàng và kiểm nhận kho",
        "đồ cần có mặt tại kho": "Hiển thị danh sách các thiết bị cần kiểm kê thực tế tại kho",
        "nhật ký thao tác": "Chuyển sang xem lịch sử thao tác vận hành trong ca",
        "trang khách": "Chuyển nhanh từ không gian quản trị sang giao diện dành cho khách hàng",
        "xuất csv": "Xuất dữ liệu báo cáo đang xem ra tệp CSV",
    }
    if low in filter_tabs and react_type.startswith("Button"):
        return filter_tabs[low]

    if name == "Nhập mã khuyến mãi":
        return "Nhập mã khuyến mãi để áp dụng giảm giá cho đơn thuê"
    if name == "Mục chọn đơn thuê trong danh sách":
        return "Chọn đơn thuê cụ thể để xem chi tiết và thực hiện xử lý nghiệp vụ"
    if name == "Mục chọn phiếu nhập trong danh sách":
        return "Chọn phiếu nhập cụ thể để xem chi tiết và thao tác kiểm nhận"
    if name == "Thẻ lọc nhanh theo loại đối tượng":
        return "Lọc nhanh danh sách nhật ký theo nhóm đối tượng tác động"

    # Nếu raw_meaning bị máy móc hoặc chứa số đếm cũ -> sinh lại sạch sẽ
    if not raw_meaning or re.search(r"\(\d+\)|\(UC[\d.]+\)|VD:|username|^Nhập tìm\s", raw_meaning, re.I) or raw_meaning.startswith('Thực hiện thao tác "'):
        if react_type == "Input (search)":
            return f"Nhập từ khóa tìm kiếm tại {low}"
        if react_type == "Input (date)":
            return f"Chọn giá trị ngày cho mục {low}"
        if react_type == "Input (number)":
            return f"Nhập giá trị số cho {low}"
        if react_type == "Input (password)":
            return f"Nhập {low}"
        if react_type.startswith("Input") or react_type == "Textarea":
            return f"Nhập thông tin {low}"
        if react_type == "Select":
            return f"Chọn {low} từ danh sách tùy chọn"
        if react_type == "Checkbox":
            return f"Đánh dấu chọn hoặc bỏ chọn mục {low}"
        if react_type == "Radio":
            return f"Chọn phương án {low}"
        if react_type == "Table":
            return f"Hiển thị {low} theo tiêu chí tìm kiếm và lọc hiện tại"
        if react_type.startswith("Button"):
            return f"Thực hiện chức năng {name}"
    return re.sub(r"\s+", " ", raw_meaning).strip()


def normalize_domain_default_note(name: str, react_type: str, raw_domain: str, raw_default: str, raw_note: str):
    """Đồng bộ Miền giá trị, Giá trị mặc định sát React frontend và điền đủ 100% Ghi chú."""
    low = name.lower()
    domain = (raw_domain or "").strip()
    default_val = (raw_default or "").strip()
    note = (raw_note or "").strip()

    # Chuẩn hóa Miền giá trị & Giá trị mặc định theo kiểu React
    if react_type == "Input (search)":
        domain = "String"
        default_val = "Rỗng"
        if not note:
            note = "Lọc dữ liệu tự động theo từ khóa người dùng nhập"
    elif react_type == "Input (email)":
        domain = "Email (RFC 5322)"
        default_val = default_val if default_val and default_val != "Không" else "Rỗng"
        if not note:
            note = "Kiểm tra đúng định dạng địa chỉ email"
    elif react_type == "Input (tel)":
        domain = "String (10 chữ số)"
        default_val = default_val if default_val and default_val != "Không" else "Rỗng"
        if not note:
            note = "Định dạng số điện thoại hợp lệ tại Việt Nam"
    elif react_type == "Input (password)":
        domain = "String (≥ 6 ký tự)"
        default_val = "Rỗng"
        if not note:
            note = "Ẩn ký tự nhập, hỗ trợ bật/tắt hiển thị mật khẩu"
    elif react_type == "Input (number)":
        if "%" in name or "tỷ lệ" in low:
            domain = "Number (0 – 100)"
        elif "phút" in low or "block" in low or "lần" in low:
            domain = "Number (> 0)"
        else:
            domain = "Number (≥ 0)"
        if not default_val or default_val in ("Không", "Rỗng"):
            default_val = "0"
        if not note:
            if any(k in low for k in ["giá", "cọc", "tiền", "chi phí", "ngân sách", "mức giảm", "bồi thường"]):
                note = "Đơn vị tính VNĐ, chỉ cho phép nhập số không âm"
            elif "%" in name or "tỷ lệ" in low:
                note = "Giá trị phần trăm hợp lệ theo chính sách hệ thống"
            else:
                note = "Chỉ cho phép nhập giá trị số hợp lệ"
    elif react_type == "Input (date)":
        domain = "Date (YYYY-MM-DD)"
        if not default_val or default_val in ("Không", "Rỗng"):
            default_val = "Chưa chọn"
        if not note:
            note = "Chọn ngày thông qua bộ lịch chuẩn trình duyệt"
    elif react_type == "Input (text)":
        domain = "String"
        if not default_val or default_val == "Không":
            default_val = "Rỗng"
        if not note:
            if "khuyến mãi" in low or "mã giảm" in low:
                note = "Nhập mã ưu đãi in hoa, không chứa khoảng trắng"
            elif "otp" in low:
                note = "Nhập đủ 6 chữ số mã xác thực được gửi về tài khoản"
            elif "ghi chú" in low or "lý do" in low:
                note = "Cho phép nhập mô tả chi tiết phục vụ đối chiếu"
            else:
                note = "Cho phép nhập chuỗi ký tự từ bàn phím"
    elif react_type == "Textarea":
        domain = "String (nhiều dòng)"
        if not default_val or default_val == "Không":
            default_val = "Rỗng"
        if not note:
            note = "Cho phép nhập văn bản dài nhiều dòng, hỗ trợ cuộn nội dung"
    elif react_type == "Select":
        domain = "Enum / Danh sách chọn"
        if not default_val or default_val in ("Không", "Rỗng"):
            default_val = "Tất cả"
        if not note:
            note = "Dữ liệu tùy chọn nạp trực tiếp từ hệ thống"
    elif react_type == "Checkbox":
        domain = "Boolean (true / false)"
        if default_val in ("Đã chọn", "true"):
            default_val = "true (Đã chọn)"
        else:
            default_val = "false (Chưa chọn)"
        if not note:
            note = "Đánh dấu để xác nhận điều kiện hoặc chọn mục tương ứng"
    elif react_type == "Radio":
        domain = "Boolean / Enum"
        default_val = "true (Đã chọn)" if "Đã chọn" in default_val else "false (Chưa chọn)"
        if not note:
            note = "Chỉ được chọn một phương án tại một thời điểm"
    elif react_type == "Table":
        domain = "Array<Object>"
        default_val = "Nạp từ hệ thống"
        if not note:
            note = "Hiển thị danh sách bản ghi, hỗ trợ cuộn và thao tác theo từng dòng"
    elif react_type == "Table Row":
        domain = "Object"
        default_val = "Theo dữ liệu bảng"
        if not note:
            note = "Nhấn chọn dòng để mở thông tin chi tiết bên cạnh"
    elif react_type == "Card":
        domain = "Object"
        default_val = "Nạp từ hệ thống"
        if not note:
            note = "Hiển thị tóm tắt thông tin và cho phép nhấn để xem chi tiết"
    elif react_type == "Alert Box":
        domain = "Object | null"
        default_val = default_val if default_val and default_val != "Không" else "Ẩn (hiện khi có thông báo)"
        if not note:
            note = "Tự động hiển thị nổi bật khi có cảnh báo hoặc kết quả kiểm tra"
    elif react_type in ("Image", "Image List"):
        domain = "URL / Array<URL>"
        default_val = default_val if default_val and default_val != "Không" else "Ảnh mặc định"
        if not note:
            note = "Hiển thị hình ảnh thực tế sản phẩm, hỗ trợ chuyển đổi ảnh xem"
    elif react_type == "Group Button":
        domain = "Null"
        default_val = "Kích hoạt"
        if not note:
            note = "Nhóm nút bấm hỗ trợ thao tác nhanh theo từng lựa chọn"
    else:  # Button / Button (submit)
        domain = "Null"
        if not default_val or default_val == "Không":
            default_val = "Kích hoạt"
        if not note:
            if react_type == "Button (submit)":
                note = "Kiểm tra hợp lệ biểu mẫu trước khi gửi dữ liệu lên hệ thống"
            elif any(k in low for k in ["tất cả", "chờ thanh toán", "đã xác nhận", "đang thuê", "hoàn tất", "hết hạn", "đã hủy", "đang xử lý", "cần giao", "cần thu", "quá hạn"]):
                note = "Chuyển nhanh bộ lọc trạng thái và cập nhật danh sách hiển thị tức thì"
            elif any(k in low for k in ["hủy", "đóng", "quay lại"]):
                note = "Đóng hộp thoại hoặc quay về bước trước mà không lưu thay đổi"
            elif any(k in low for k in ["vận hành", "doanh thu", "dòng tiền", "nhập kho", "hồ sơ cá nhân", "đổi mật khẩu", "đánh giá sản phẩm", "chuẩn bị kho", "tiếp khách", "danh sách kho", "phiếu bảo trì"]):
                note = "Chuyển đổi tab nội dung tương ứng ngay trên màn hình hiện tại"
            elif any(k in low for k in ["thêm", "tạo", "lập"]):
                note = "Mở biểu mẫu hoặc khởi tạo bản ghi nghiệp vụ mới"
            elif any(k in low for k in ["sửa", "chỉnh sửa", "cập nhật"]):
                note = "Mở hộp thoại chỉnh sửa thông tin của bản ghi được chọn"
            elif any(k in low for k in ["xóa", "khóa", "ngừng", "ẩn"]):
                note = "Thay đổi trạng thái hoặc vô hiệu hóa bản ghi theo quyền hạn"
            elif any(k in low for k in ["duyệt", "xác nhận", "chốt", "nghiệm thu", "hoàn tất", "áp dụng"]):
                note = "Xác nhận hoàn tất bước xử lý nghiệp vụ và cập nhật trạng thái"
            elif any(k in low for k in ["xuất", "in"]):
                note = "Xuất hoặc tải xuống dữ liệu báo cáo/biên bản phục vụ lưu trữ"
            else:
                note = "Kích hoạt thao tác tương ứng khi người dùng nhấn chuột"

    # Đảm bảo note không chứa chữ thừa hoặc rỗng
    if note == "Chỉ đọc":
        note = "Chỉ đọc, hệ thống tự động sinh và không cho phép chỉnh sửa"
    elif note == "Bắt buộc nhập":
        note = "Trường bắt buộc nhập trước khi gửi biểu mẫu"

    return domain, default_val, note


def normalize_component(uc_id: str, comp: dict) -> dict:
    """Chuẩn hóa toàn diện 1 thành phần giao diện cho bảng a."""
    clean_name = clean_component_name(comp.get("name", ""))
    react_type = map_react_type(comp.get("type", ""), clean_name)
    meaning = build_meaning(clean_name, react_type, comp.get("meaning", ""))
    domain, default_val, note = normalize_domain_default_note(
        clean_name,
        react_type,
        comp.get("domain", ""),
        comp.get("defaultVal", ""),
        comp.get("note", ""),
    )
    return {
        "stt": str(comp.get("stt", "")),
        "name": clean_name,
        "type": react_type,
        "meaning": meaning,
        "domain": domain,
        "defaultVal": default_val,
        "note": note,
    }
