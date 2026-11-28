# -*- coding: utf-8 -*-
"""
Script kiểm toán tự động chất lượng Chương 7 sau khi build:
1. Đủ 71 SCR (7.2.1 .. 7.2.71) và 143 bảng (1 bảng tổng hợp + 71*2 bảng chi tiết).
2. 0% thuật ngữ lập trình trong bảng b và cột Tên/Ý nghĩa/Ghi chú của bảng a.
3. 100% bảng a dùng header "Kiểu (React)" và giá trị kiểu thuộc tập Kiểu React chuẩn.
4. 0 ô Ghi chú bị trống trong toàn bộ 452 thành phần.
5. 0 tên thành phần còn chứa số đếm (9)/(22)/(5 phiếu), mã (UCx.y), VD: CAMPGO10, ký tự ẩn \uFE0F.
6. 100% số dòng bảng a khớp 1-1 với số nhãn trên ảnh trong manifest_71_ucs.json.
"""
import json
import os
import re
import sys
import docx
from normalize_components import VALID_REACT_TYPES

DOCX_PATH = "Document/GearGo_Chuong_7_Thiet_Ke_Giao_Dien_Day_Du_ReactJS.docx"
IMG_DIR = "Document/screenshots_uc" if os.path.exists("Document/screenshots_uc/manifest_71_ucs.json") else "tests/playwright/Document/screenshots_uc"
MANIFEST_PATH = os.path.join(IMG_DIR, "manifest_71_ucs.json")

CODE_LEAK_RE = re.compile(
    r"\b(onClick|onSubmit|onChange|onConfirm|localStorage|sessionStorage|LandingView|WorkspaceView|RegisterView|CheckoutView|window\.print|authApi|staffApi|app\.logout|app\.login|form\.auth-form|handle[A-Z]\w*|use[A-Z]\w*)\b|\.tsx\b|/api/",
    re.IGNORECASE,
)

DIRTY_NAME_RE = re.compile(r"\(\d+(?:\s+(?:thiết bị|phiếu|đơn|mục|sản phẩm))?\)|\(UC[\d.]+\)|VD:|CAMPGO10|\uFE0F", re.IGNORECASE)


def main():
    doc = docx.Document(DOCX_PATH)
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    headings = [p.text.strip() for p in doc.paragraphs if re.match(r"^7\.2\.\d+\.", p.text.strip())]
    print(f"Total 7.2.x headings: {len(headings)} (expected 71)")
    print(f"Total tables: {len(doc.tables)} (expected 143)")

    empty_comps = []
    missing_imgs = []
    for uc_id, info in manifest.items():
        for im in info.get("images", []):
            if not os.path.exists(os.path.join(IMG_DIR, im["file"])):
                missing_imgs.append((uc_id, im["file"]))
        if len(info.get("components", [])) == 0:
            empty_comps.append(uc_id)

    leaks = []
    dirty_names = []
    empty_notes = []
    bad_react_types = []
    bad_headers = []

    from phan_he import SCREENS_71
    mismatches = []

    for i, (scr_id, _, uc_id, _) in enumerate(SCREENS_71):
        ta = doc.tables[1 + 2 * i]
        tb = doc.tables[2 + 2 * i]

        if ta.rows[0].cells[2].text.strip() != "Kiểu (React)":
            bad_headers.append((scr_id, ta.rows[0].cells[2].text.strip()))

        a_count = len(ta.rows) - 1
        m_count = len(manifest.get(uc_id, {}).get("components", []))
        if a_count != m_count or a_count == 0:
            mismatches.append((scr_id, uc_id, a_count, m_count))
        if len(tb.rows) - 1 == 0:
            mismatches.append((scr_id, uc_id, "EMPTY_B_TABLE", 0))

        for ri, row in enumerate(ta.rows[1:], start=1):
            name = row.cells[1].text.strip()
            rtype = row.cells[2].text.strip()
            meaning = row.cells[3].text.strip()
            note = row.cells[6].text.strip()
            if DIRTY_NAME_RE.search(name):
                dirty_names.append((scr_id, ri, name))
            if rtype not in VALID_REACT_TYPES:
                bad_react_types.append((scr_id, ri, rtype))
            if not note:
                empty_notes.append((scr_id, ri, name))
            for txt in (name, meaning, note):
                m = CODE_LEAK_RE.search(txt)
                if m:
                    leaks.append((scr_id, "a", ri, m.group(0), txt[:60]))

        for ri, row in enumerate(tb.rows[1:], start=1):
            for ci in (1, 2):
                txt = row.cells[ci].text.strip()
                m = CODE_LEAK_RE.search(txt)
                if m:
                    leaks.append((scr_id, "b", ri, m.group(0), txt[:60]))

    print(f"Missing image files: {missing_imgs}")
    print(f"UCs with 0 annotated components: {empty_comps}")
    print(f"Bad Kiểu (React) headers: {bad_headers}")
    print(f"Bad React types: {len(bad_react_types)} {bad_react_types[:5]}")
    print(f"Dirty names (counts/UC/VD): {len(dirty_names)} {dirty_names[:10]}")
    print(f"Empty Ghi chú cells: {len(empty_notes)} {empty_notes[:10]}")
    print(f"Code-term leaks in tables: {len(leaks)} {leaks[:10]}")
    print(f"Table-manifest mismatches: {mismatches}")

    if any([len(headings) != 71, len(doc.tables) != 143, missing_imgs, empty_comps, bad_headers, bad_react_types, dirty_names, empty_notes, leaks, mismatches]):
        sys.exit(1)
    print("AUDIT PASSED 100%!")


if __name__ == "__main__":
    main()
