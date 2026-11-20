import os
import json
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
from phan_he import SCREENS_71, NATURAL_EVENTS
from normalize_components import normalize_component

BACKUP_DOCX = "Document/GearGo_Chuong_7_Thiet_Ke_Giao_Dien_Day_Du_ReactJS.backup.docx"
OUT_DOCX = "Document/GearGo_Chuong_7_Thiet_Ke_Giao_Dien_Day_Du_ReactJS.docx"
MANIFEST_JSON = "Document/screenshots_uc/manifest_71_ucs.json"
IMG_DIR = "Document/screenshots_uc"


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


def main():
    src_docx = BACKUP_DOCX if os.path.exists(BACKUP_DOCX) else OUT_DOCX
    doc = docx.Document(src_docx)
    with open(MANIFEST_JSON, "r", encoding="utf-8") as f:
        manifest = json.load(f)

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
    total_imgs = 0
    for idx, (scr_id, scr_name, uc_id, img_key) in enumerate(SCREENS_71, start=1):
        p_scr = doc.add_paragraph(f"7.2.{idx}. {scr_name} ({scr_id})")
        p_scr.style = "Heading 3" if "Heading 3" in doc.styles else "Normal"
        for r in p_scr.runs:
            r.bold = True
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

        uc_info = manifest.get(uc_id, {})
        imgs = uc_info.get("images", [])
        if not imgs:
            imgs = [{"file": f"{img_key}.png", "caption": f"{scr_name} ({scr_id})"}]

        # Chèn 1 hoặc nhiều hình ảnh (kèm đánh số 7.Xa, 7.Xb nếu nhiều hình)
        multi = len(imgs) > 1
        for img_i, img_meta in enumerate(imgs):
            img_file = img_meta["file"]
            img_cap = img_meta.get("caption") or f"{scr_name} ({scr_id})"
            img_path = os.path.join(IMG_DIR, img_file)
            if os.path.exists(img_path):
                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.add_run().add_picture(img_path, width=Inches(6.2))
                total_imgs += 1
            else:
                p_miss = doc.add_paragraph(f"[Chưa có ảnh: {img_file}]")
                p_miss.alignment = WD_ALIGN_PARAGRAPH.CENTER

            suffix = chr(ord("a") + img_i) if multi else ""
            p_cap = doc.add_paragraph(f"Hình 7.{idx}{suffix}. {img_cap}")
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p_cap.runs:
                r.italic = True
                r.font.name = "Times New Roman"
                r.font.size = Pt(11)
                r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

        # Lấy bảng a khớp 1-1 với các số đã gắn trên ảnh
        comps = uc_info.get("components", [])
        b_rows = NATURAL_EVENTS.get(uc_id, [])

        # a. Danh sách các thành phần giao diện: (Bold + Italic, 13pt, 7 cột chuẩn OOAD)
        pa = doc.add_paragraph("a. Danh sách các thành phần giao diện:")
        for r in pa.runs:
            r.bold = True
            r.italic = True
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(0x00, 0x00, 0x00)

        ta = doc.add_table(rows=1, cols=7)
        a_headers = ["STT", "Tên thành phần", "Kiểu (React)", "Ý nghĩa", "Miền giá trị", "Giá trị mặc định", "Ghi chú"]
        for c_i, h in enumerate(a_headers):
            ta.rows[0].cells[c_i].text = h
        for c_item in comps:
            nc = normalize_component(uc_id, c_item)
            row = ta.add_row()
            vals = [
                nc["stt"],
                nc["name"],
                nc["type"],
                nc["meaning"],
                nc["domain"],
                nc["defaultVal"],
                nc["note"],
            ]
            for c_i, v in enumerate(vals):
                row.cells[c_i].text = v
        style_table(ta, [0.40, 1.12, 0.88, 1.48, 0.78, 0.72, 0.92], font_size_pt=10)

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
    print(f"Saved {OUT_DOCX} successfully with {len(SCREENS_71)} screens and {total_imgs} annotated images!")


if __name__ == "__main__":
    main()
