import os
import json
import re
import shutil
import subprocess
import tempfile
import zipfile
import xml.etree.ElementTree as ET
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
IMG_DIR = "Document/screenshots_uc" if os.path.exists("Document/screenshots_uc/manifest_71_ucs.json") else "tests/playwright/Document/screenshots_uc"
MANIFEST_JSON = os.path.join(IMG_DIR, "manifest_71_ucs.json")


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


def compress_images_to_jpeg(img_dir, out_dir, max_width=1280, quality=78):
    """Nén toàn bộ ảnh PNG sang JPEG bằng .NET System.Drawing để giảm mạnh dung lượng DOCX mà vẫn giữ độ nét."""
    ps_script = f"""
Add-Type -AssemblyName System.Drawing
$srcDir = '{img_dir}'
$dstDir = '{out_dir}'
$maxW = {max_width}
$quality = [long]{quality}
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object {{ $_.MimeType -eq 'image/jpeg' }}
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)

Get-ChildItem -Path $srcDir -Filter '*.png' | ForEach-Object {{
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    $w = $img.Width
    $h = $img.Height
    if ($w -gt $maxW) {{
        $newW = $maxW
        $newH = [int][Math]::Round($h * ($maxW / [double]$w))
    }} else {{
        $newW = $w
        $newH = $h
    }}
    $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($img, 0, 0, $newW, $newH)
    $g.Dispose()
    $img.Dispose()
    $outFile = Join-Path $dstDir ([System.IO.Path]::GetFileNameWithoutExtension($_.Name) + '.jpg')
    $bmp.Save($outFile, $codec, $encParams)
    $bmp.Dispose()
}}
"""
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True)


def prune_orphan_media(docx_path):
    """Xóa toàn bộ ảnh rác trong word/media/ không còn được tham chiếu bởi word/document.xml."""
    tmp_path = docx_path + ".tmp"
    with zipfile.ZipFile(docx_path, "r") as zin:
        doc_xml = zin.read("word/document.xml").decode("utf-8", errors="ignore")
        rels_xml = zin.read("word/_rels/document.xml.rels")
        used_rids = set(re.findall(r'r:(?:embed|id|link)="([^"]+)"', doc_xml))

        rels_root = ET.fromstring(rels_xml)
        used_media = set()
        for rel in list(rels_root):
            rid = rel.attrib.get("Id", "")
            target = rel.attrib.get("Target", "")
            if target.startswith("media/"):
                if rid in used_rids:
                    used_media.add("word/" + target)
                else:
                    rels_root.remove(rel)

        new_rels_bytes = ET.tostring(rels_root, encoding="utf-8", xml_declaration=True)
        with zipfile.ZipFile(tmp_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
            for item in zin.infolist():
                if item.filename.startswith("word/media/") and item.filename not in used_media:
                    continue
                if item.filename == "word/_rels/document.xml.rels":
                    zout.writestr(item, new_rels_bytes)
                else:
                    zout.writestr(item, zin.read(item.filename))

    shutil.move(tmp_path, docx_path)


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

    # Nén ảnh sang JPEG vào thư mục tạm trước khi chèn để tránh phình dung lượng DOCX
    max_w = int(os.environ.get("CHUONG7_IMG_MAX_W", "1280"))
    quality = int(os.environ.get("CHUONG7_IMG_QUALITY", "75"))
    tmp_img_ctx = tempfile.TemporaryDirectory()
    compressed_dir = tmp_img_ctx.name
    compress_images_to_jpeg(IMG_DIR, compressed_dir, max_width=max_w, quality=quality)

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
            jpg_name = os.path.splitext(img_file)[0] + ".jpg"
            jpg_path = os.path.join(compressed_dir, jpg_name)
            img_path = jpg_path if os.path.exists(jpg_path) else os.path.join(IMG_DIR, img_file)
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
    tmp_img_ctx.cleanup()
    prune_orphan_media(OUT_DOCX)
    size_mb = os.path.getsize(OUT_DOCX) / (1024 * 1024)
    print(f"Saved {OUT_DOCX} successfully ({size_mb:.2f} MB) with {len(SCREENS_71)} screens and {total_imgs} annotated images!")


if __name__ == "__main__":
    main()
