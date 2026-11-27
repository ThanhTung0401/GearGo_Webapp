# GearGo — Báo cáo Đồ án LaTeX

Thư mục LaTeX cho báo cáo Đồ án môn Lập trình .NET — Nhóm 10, Đại học Sài Gòn, GVHD: Thầy Nguyễn Thanh Sang, tháng 12/2026.

## Yêu cầu hệ thống

- **TeX distribution:** TeX Live 2023+ hoặc MikTeX (có XeLaTeX).
- **Fonts:** Times New Roman.
- **Tools:** `latexmk`.

Ubuntu/Debian:

```bash
sudo apt install texlive-xetex texlive-lang-other latexmk texlive-fonts-recommended ttf-mscorefonts-installer
```

## Biên dịch

```bash
make           # build main.pdf
make watch     # rebuild tự động khi file thay đổi
make view      # mở PDF
make clean     # xoá build artefacts
```

Hoặc chạy trực tiếp:

```bash
latexmk -xelatex main.tex
```

## Cấu trúc file

```
Report/Paper/
├── main.tex
├── bia.tex
├── nhan_xet.tex
├── loi_cam_on.tex
├── chapters/
│   ├── chuong1_tong_quan.tex          (Thanh Tùng)
│   ├── chuong2_phan_tich.tex          (Kiện Minh)
│   ├── chuong3_co_so_du_lieu.tex      (Minh Tú)
│   ├── chuong4_thiet_ke_giao_dien.tex (Kiện Minh + Kim Xuyến)
│   ├── chuong5_kien_truc_source.tex   (Kim Xuyến)
│   ├── chuong6_cai_dat_trien_khai.tex (Thanh Tùng)
│   ├── chuong7_kiem_thu.tex           (Tuấn Kiệt)
│   ├── ket_luan.tex                   (Tuấn Kiệt)
│   └── phu_luc.tex                    (Thanh Tùng + Tuấn Kiệt)
├── images/
├── Makefile
├── .gitignore
└── README.md
```

## Phân công viết báo cáo (3 thành viên)

| Thành viên | File phân công | Chương phụ trách |
|---|---|---|
| Nguyễn Minh Tú | `Report/Assign/Phan_3_MinhTu_Ch1_Ch3_Ch6_PhuLucA.md` | Ch.1, Ch.3, Ch.6, Phụ lục A |
| Trần Kim Xuyến | `Report/Assign/Phan_4_KimXuyen_Ch2_Ch4_Ch5.md` | Ch.2, Ch.4 (toàn bộ), Ch.5 |
| Mai Trần Tuấn Kiệt | `Report/Assign/Phan_5_TuanKiet_KiemThu_KetLuan.md` | Ch.7, Kết luận, Phụ lục B |

Mỗi file `chapters/*.tex` là skeleton với `\section{}` + `% TODO`. Nội dung chi tiết nằm ở các file phân công trên.

## Checklist cần điền

- [x] MSSV + Lớp 5 thành viên trong `bia.tex`.
- [ ] Logo trường `images/logo_sgu.png` (uncomment dòng `\includegraphics` trong `bia.tex`).
- [ ] Ảnh ERD `images/erd_tong_the.png` (Chương 3 — Minh Tú).
- [ ] 71 screenshot UC vào `images/uc/` (Chương 4 — Kim Xuyến + Phụ lục B — Tuấn Kiệt).
- [ ] Sơ đồ C4, sequence diagram (Chương 5 — Kim Xuyến).
- [ ] Playwright HTML report screenshot (Chương 7 — Tuấn Kiệt).
