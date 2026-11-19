import os
import json
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
from uc_specs_exact import PER_UC_SPECS

BACKUP_DOCX = "Document/GearGo_Chuong_7_Thiet_Ke_Giao_Dien_Day_Du_ReactJS.backup.docx"
OUT_DOCX = "Document/GearGo_Chuong_7_Thiet_Ke_Giao_Dien_Day_Du_ReactJS.docx"
SCR_DATA_JSON = "Document/backup_scr_data.json"
IMG_DIR = "Document/screenshots_uc"

# Danh sách 71 màn hình tương ứng 71 UC chính (SCR-1.1 .. SCR-10.4)
SCREENS_71 = [
    ("SCR-1.1", "Giao diện Đăng ký tài khoản", "UC1.1", "UC1_1"),
    ("SCR-1.2", "Giao diện Đăng nhập", "UC1.2", "UC1_2"),
    ("SCR-1.3", "Giao diện Đăng xuất", "UC1.3", "UC1_3"),
    ("SCR-1.4", "Giao diện Khôi phục mật khẩu", "UC1.4", "UC1_4"),
    ("SCR-1.5", "Giao diện Xem thông tin cá nhân", "UC1.5", "UC1_5"),
    ("SCR-1.6", "Giao diện Cập nhật thông tin cá nhân", "UC1.6", "UC1_6"),
    ("SCR-1.7", "Giao diện Tạo tài khoản nhân viên", "UC1.7", "UC1_7"),
    ("SCR-1.8", "Giao diện Cập nhật thông tin nhân viên", "UC1.8", "UC1_8"),
    ("SCR-1.9", "Giao diện Tra cứu nhân viên", "UC1.9", "UC1_9"),
    ("SCR-1.10", "Giao diện Phân quyền nhân viên", "UC1.10", "UC1_10"),
    ("SCR-1.11", "Giao diện Khóa và mở khóa tài khoản", "UC1.11", "UC1_11"),
    ("SCR-1.12", "Giao diện Đổi mật khẩu", "UC1.12", "UC1_12"),
    ("SCR-1.13", "Giao diện Tra cứu tài khoản khách hàng", "UC1.13", "UC1_13"),

    ("SCR-2.1", "Giao diện Tìm kiếm và lọc sản phẩm", "UC2.1", "UC2_1"),
    ("SCR-2.2", "Giao diện Xem chi tiết sản phẩm", "UC2.2", "UC2_2"),
    ("SCR-2.3", "Giao diện Kiểm tra khả dụng", "UC2.3", "UC2_3"),
    ("SCR-2.4", "Giao diện Nhận tư vấn bộ dụng cụ bằng AI", "UC2.4", "UC2_4"),

    ("SCR-3.1", "Giao diện Quản lý giỏ thuê và báo giá", "UC3.1", "UC3_1"),
    ("SCR-3.2", "Giao diện Tạo đơn thuê và giữ chỗ", "UC3.2", "UC3_2"),
    ("SCR-3.3", "Giao diện Theo dõi đơn thuê", "UC3.3", "UC3_3"),
    ("SCR-3.4", "Giao diện Hủy đơn thuê", "UC3.4", "UC3_4"),

    ("SCR-4.1", "Giao diện Chuẩn bị và phân công thiết bị", "UC4.1", "UC4_1"),
    ("SCR-4.2", "Giao diện Bàn giao thiết bị", "UC4.2", "UC4_2"),
    ("SCR-4.3", "Giao diện Nhận trả và kiểm tra thiết bị", "UC4.3", "UC4_3"),
    ("SCR-4.4", "Giao diện Xử lý đơn quá hạn", "UC4.4", "UC4_4"),
    ("SCR-4.5", "Giao diện Tra cứu đơn thuê cho vận hành", "UC4.5", "UC4_5"),

    ("SCR-5.1", "Giao diện Thanh toán và xác nhận đơn", "UC5.1", "UC5_1"),
    ("SCR-5.2", "Giao diện Lập phụ phí", "UC5.2", "UC5_2"),
    ("SCR-5.3", "Giao diện Duyệt và xử lý tranh chấp phụ phí", "UC5.3", "UC5_3"),
    ("SCR-5.4", "Giao diện Đối soát cọc và hoàn tất đơn", "UC5.4", "UC5_4"),
    ("SCR-5.5", "Giao diện Thu tiền bổ sung", "UC5.5", "UC5_5"),
    ("SCR-5.6", "Giao diện Thực hiện hoàn tiền", "UC5.6", "UC5_6"),
    ("SCR-5.7", "Giao diện Điều chỉnh tài chính sau chốt", "UC5.7", "UC5_7"),

    ("SCR-6.1", "Giao diện Thêm danh mục sản phẩm", "UC6.1", "UC6_1"),
    ("SCR-6.2", "Giao diện Cập nhật danh mục sản phẩm", "UC6.2", "UC6_2"),
    ("SCR-6.3", "Giao diện Tra cứu danh mục sản phẩm", "UC6.3", "UC6_3"),
    ("SCR-6.4", "Giao diện Thay đổi trạng thái danh mục", "UC6.4", "UC6_4"),
    ("SCR-6.5", "Giao diện Thêm sản phẩm", "UC6.5", "UC6_5"),
    ("SCR-6.6", "Giao diện Cập nhật sản phẩm", "UC6.6", "UC6_6"),
    ("SCR-6.7", "Giao diện Tra cứu sản phẩm", "UC6.7", "UC6_7"),
    ("SCR-6.8", "Giao diện Thay đổi trạng thái kinh doanh sản phẩm", "UC6.8", "UC6_8"),
    ("SCR-6.9", "Giao diện Tra cứu thiết bị và lịch sử sử dụng", "UC6.9", "UC6_9"),
    ("SCR-6.10", "Giao diện Kiểm kê và đề nghị điều chỉnh kho", "UC6.10", "UC6_10"),
    ("SCR-6.11", "Giao diện Duyệt điều chỉnh kho", "UC6.11", "UC6_11"),
    ("SCR-6.12", "Giao diện Lập và theo dõi bảo trì", "UC6.12", "UC6_12"),
    ("SCR-6.13", "Giao diện Nghiệm thu bảo trì", "UC6.13", "UC6_13"),
    ("SCR-6.14", "Giao diện Ngừng sử dụng thiết bị", "UC6.14", "UC6_14"),
    ("SCR-6.15", "Giao diện Điều chuyển thiết bị sang sản phẩm khác", "UC6.15", "UC6_15"),

    ("SCR-7.1", "Giao diện Thêm nhà cung cấp", "UC7.1", "UC7_1"),
    ("SCR-7.2", "Giao diện Cập nhật nhà cung cấp", "UC7.2", "UC7_2"),
    ("SCR-7.3", "Giao diện Tra cứu nhà cung cấp", "UC7.3", "UC7_3"),
    ("SCR-7.4", "Giao diện Thay đổi tình trạng hợp tác", "UC7.4", "UC7_4"),
    ("SCR-7.5", "Giao diện Lập phiếu nhập nháp", "UC7.5", "UC7_5"),
    ("SCR-7.6", "Giao diện Sửa phiếu nhập nháp", "UC7.6", "UC7_6"),
    ("SCR-7.7", "Giao diện Kiểm tra và xác nhận nhập kho", "UC7.7", "UC7_7"),
    ("SCR-7.8", "Giao diện Tra cứu phiếu nhập", "UC7.8", "UC7_8"),
    ("SCR-7.9", "Giao diện Hủy phiếu nhập nháp", "UC7.9", "UC7_9"),
    ("SCR-7.10", "Giao diện Xử lý sai lệch phiếu nhập", "UC7.10", "UC7_10"),

    ("SCR-8.1", "Giao diện Cấu hình chính sách", "UC8.1", "UC8_1"),
    ("SCR-8.2", "Giao diện Thêm khuyến mãi", "UC8.2", "UC8_2"),
    ("SCR-8.3", "Giao diện Cập nhật khuyến mãi", "UC8.3", "UC8_3"),
    ("SCR-8.4", "Giao diện Tra cứu khuyến mãi", "UC8.4", "UC8_4"),
    ("SCR-8.5", "Giao diện Ngừng chương trình khuyến mãi", "UC8.5", "UC8_5"),

    ("SCR-9.1", "Giao diện Gửi đánh giá sản phẩm", "UC9.1", "UC9_1"),
    ("SCR-9.2", "Giao diện Kiểm duyệt đánh giá", "UC9.2", "UC9_2"),
    ("SCR-9.3", "Giao diện Xem thông báo", "UC9.3", "UC9_3"),
    ("SCR-9.4", "Giao diện Quản lý nội dung và gửi thông báo", "UC9.4", "UC9_4"),

    ("SCR-10.1", "Giao diện Xem báo cáo vận hành", "UC10.1", "UC10_1"),
    ("SCR-10.2", "Giao diện Xem báo cáo doanh thu và dòng tiền", "UC10.2", "UC10_2"),
    ("SCR-10.3", "Giao diện Xem báo cáo nhập hàng", "UC10.3", "UC10_3"),
    ("SCR-10.4", "Giao diện Tra cứu nhật ký và lịch sử", "UC10.4", "UC10_4"),
]


def set_cell_shading(cell, fill_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def style_table(table, col_widths, font_size_pt=10.5):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    table.autofit = False
    for row_idx, row in enumerate(table.rows):
        for col_idx, cell in enumerate(row.cells):
            cell.width = Inches(col_widths[col_idx])
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                for run in p.runs:
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(font_size_pt)
                    run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
                    if row_idx == 0:
                        run.bold = True
            if row_idx == 0:
                set_cell_shading(cell, "F3F3F3")


def find_scr_data_for_uc(uc_id, _scr_data=None):
    """Lấy 100% đặc tả riêng từng UC từ PER_UC_SPECS (đối chiếu từ code TSX thực tế), cấm fallback."""
    if uc_id not in PER_UC_SPECS:
        raise KeyError(f"Thiếu đặc tả TSX cho {uc_id} trong uc_specs_exact.py!")
    return PER_UC_SPECS[uc_id]


def main():
    src_docx = BACKUP_DOCX if os.path.exists(BACKUP_DOCX) else OUT_DOCX
    doc = docx.Document(src_docx)
    with open(SCR_DATA_JSON, "r", encoding="utf-8") as f:
        scr_data = json.load(f)

    # Giữ phần đầu (CHƯƠNG 7, 7.1, mô tả 7.1 và Bảng 7.1) và xóa từ "7.2." trở đi (giữ lại sectPr)
    body = doc._body._body
    elements = list(body)
    keep_count = 0
    for idx, el in enumerate(elements):
        if el.tag.endswith("p"):
            text = "".join(el.itertext()).strip()
            if text.startswith("7.2."):
                keep_count = idx
                break
    if keep_count > 0:
        for el in elements[keep_count:]:
            if not el.tag.endswith("sectPr"):
                body.remove(el)

    # Cập nhật đoạn mô tả 7.1 (nếu có chữ "31 màn hình")
    for p in doc.paragraphs:
        if "31 màn hình" in p.text:
            for r in p.runs:
                if "31 màn hình" in r.text:
                    r.text = r.text.replace("31 màn hình", "71 màn hình")

    # Cập nhật Bảng 7.1: 3 cột [STT, Mã màn hình, Tên màn hình giao diện]
    if len(doc.tables) > 0:
        t0 = doc.tables[0]
        for r in list(t0.rows)[1:]:
            t0._tbl.remove(r._tr)
        # Xóa cột thứ 4 (Use Case ánh xạ) nếu đang có > 3 cột
        while len(t0.rows[0].cells) > 3:
            for row in t0.rows:
                row._tr.remove(row.cells[-1]._tc)
            if len(t0._tbl.tblGrid.gridCol_lst) > 3:
                t0._tbl.tblGrid.remove(t0._tbl.tblGrid.gridCol_lst[-1])
        headers = ["STT", "Mã màn hình", "Tên màn hình giao diện"]
        for i, h in enumerate(headers):
            if i < len(t0.rows[0].cells):
                t0.rows[0].cells[i].text = h
        for idx, (scr_id, scr_name, _, _) in enumerate(SCREENS_71, start=1):
            row = t0.add_row()
            vals = [str(idx), scr_id, scr_name]
            for i, v in enumerate(vals):
                row.cells[i].text = v
        style_table(t0, [0.55, 1.15, 4.61], font_size_pt=11)

    # Thêm tiêu đề 7.2
    p72 = doc.add_paragraph("7.2. Mô tả chi tiết từng màn hình giao diện")
    p72.style = "Heading 2" if "Heading 2" in doc.styles else "Normal"
    for r in p72.runs:
        r.bold = True
        r.font.name = "Times New Roman"
        r.font.size = Pt(13)
        r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

    # Duyệt qua 71 màn hình SCR-1.1 .. SCR-10.4
    for idx, (scr_id, scr_name, uc_id, img_key) in enumerate(SCREENS_71, start=1):
        p_scr = doc.add_paragraph(f"7.2.{idx}. {scr_name} ({scr_id})")
        p_scr.style = "Heading 3" if "Heading 3" in doc.styles else "Normal"
        for r in p_scr.runs:
            r.bold = True
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

        # Chèn hình ảnh
        img_path = os.path.join(IMG_DIR, f"{img_key}.png")
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.add_run().add_picture(img_path, width=Inches(6.2))
        else:
            p_miss = doc.add_paragraph(f"[Chưa có ảnh: {img_key}.png]")
            p_miss.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Caption
        p_cap = doc.add_paragraph(f"Hình 7.{idx}. {scr_name} ({scr_id})")
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p_cap.runs:
            r.italic = True
            r.font.name = "Times New Roman"
            r.font.size = Pt(11)
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

        a_rows, b_rows = find_scr_data_for_uc(uc_id, scr_data)

        # a. Danh sách các thành phần giao diện: (Bold + Italic, 13pt, 7 cột)
        pa = doc.add_paragraph("a. Danh sách các thành phần giao diện:")
        for r in pa.runs:
            r.bold = True
            r.italic = True
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

        ta = doc.add_table(rows=1, cols=7)
        a_headers = ["STT", "Tên thành phần", "Kiểu (React)", "Ý nghĩa", "Miền giá trị", "Mặc định", "Ghi chú"]
        for c_i, h in enumerate(a_headers):
            ta.rows[0].cells[c_i].text = h
        for row_idx, r_data in enumerate(a_rows, start=1):
            row = ta.add_row()
            row.cells[0].text = str(row_idx)
            for c_i in range(1, 7):
                row.cells[c_i].text = r_data[c_i] if c_i < len(r_data) else ""
        style_table(ta, [0.42, 1.12, 0.87, 1.55, 0.78, 0.70, 0.86], font_size_pt=10)

        # b. Danh sách các biến cố: (Bold + Italic, 13pt, 3 cột)
        pb = doc.add_paragraph("b. Danh sách các biến cố:")
        for r in pb.runs:
            r.bold = True
            r.italic = True
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

        tb = doc.add_table(rows=1, cols=3)
        b_headers = ["STT", "Điều kiện kích hoạt", "Xử lý"]
        for c_i, h in enumerate(b_headers):
            tb.rows[0].cells[c_i].text = h
        for row_idx, r_data in enumerate(b_rows, start=1):
            row = tb.add_row()
            row.cells[0].text = str(row_idx)
            row.cells[1].text = r_data[1] if len(r_data) > 1 else ""
            row.cells[2].text = r_data[2] if len(r_data) > 2 else ""
        style_table(tb, [0.47, 2.28, 3.54], font_size_pt=10.5)

    doc.save(OUT_DOCX)
    print(f"Saved {OUT_DOCX} successfully with {len(SCREENS_71)} screens!")


if __name__ == "__main__":
    main()
