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

## Nguồn nội dung

Mỗi file `chapters/*.tex` là skeleton với `\section{}` + `% TODO`. Nội dung chi tiết nằm ở:

- `Report/Assign/Phan_1_ThanhTung_TongQuan_CaiDat.md` → Ch.1, Ch.6, Phụ lục A
- `Report/Assign/Phan_2_KienMinh_PhanTich_UIKhach.md` → Ch.2, Ch.4 (phần A)
- `Report/Assign/Phan_3_MinhTu_CoSoDuLieu.md` → Ch.3
- `Report/Assign/Phan_4_KimXuyen_UIAdmin_KienTrucSource.md` → Ch.4 (phần B), Ch.5
- `Report/Assign/Phan_5_TuanKiet_KiemThu_KetLuan.md` → Ch.7, Kết luận, Phụ lục B

## Checklist cần điền

- [ ] MSSV + Lớp 5 thành viên trong `bia.tex`.
- [ ] Logo trường `images/logo_sgu.png` (uncomment dòng `\includegraphics` trong `bia.tex`).
- [ ] Ảnh ERD `images/erd_tong_the.png` (Chương 3).
- [ ] 71 screenshot UC vào `images/uc/` (Chương 4 + Phụ lục B).
- [ ] Sơ đồ C4, sequence diagram (Chương 5).
- [ ] Playwright HTML report screenshot (Chương 7).
