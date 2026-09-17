# GearGo — Kế hoạch Tuần 2: Từ nền tảng đến đặt đơn & thanh toán

> **Nguồn dữ liệu chuẩn:** `Diagrams/ERD.dbml`. Mọi entity C# phải khớp 1-1 với bảng trong ERD (tên bảng, tên cột, kiểu dữ liệu, quan hệ FK). Tuyệt đối không tự thêm/bớt cột.

**Mục tiêu:** UC01 (xác thực) + UC03–UC06 (khách duyệt sản phẩm → giỏ → đơn → thanh toán) + UC21 (admin CRUD danh mục & sản phẩm).

**Kiến trúc:** ASP.NET Core Web API + React frontend. Backend trả JSON, JWT Bearer, không có Razor Views.

**Tech Stack:** ASP.NET Core 10 · EF Core 9 · SQL Server (Docker) · JWT Bearer · BCrypt.Net-Next · React (Vite)

---

## Nguyên tắc xây dựng theo cấp phụ thuộc FK

Xây entity **ít phụ thuộc trước, nhiều phụ thuộc sau**:

```
Cấp 0 (không FK / self-ref):
  TAI_KHOAN, DANH_MUC_SAN_PHAM, NHA_CUNG_CAP, KHUYEN_MAI

Cấp 1 (1 FK về cấp 0):
  KHACH_HANG, NHAN_VIEN, SAN_PHAM

Cấp 2:
  HINH_ANH_SAN_PHAM, PHIEU_NHAP_HANG, CHINH_SACH, GIO_THUE,
  KHUYEN_MAI_SAN_PHAM, KHUYEN_MAI_DANH_MUC

Cấp 3:
  CHI_TIET_PHIEU_NHAP, CHI_TIET_GIO_THUE, DON_THUE

Cấp 4:
  THIET_BI, CHI_TIET_DON_THUE, LUOT_SU_DUNG_KHUYEN_MAI, THANH_TOAN

Cấp 5:
  GIU_CHO (1-1 CHI_TIET_DON_THUE), CHI_TIET_THANH_TOAN
```

**Lưu ý ERD quan trọng (dễ nhầm):**
- `THIET_BI.ma_chi_tiet_phieu_nhap` **NOT NULL** → thiết bị **bắt buộc** đi kèm phiếu nhập. Không thể tạo `THIET_BI` nếu không có `CHI_TIET_PHIEU_NHAP` trước.
- `DON_THUE.ma_chinh_sach` **NOT NULL** → mỗi đơn phải gắn với một `CHINH_SACH` (versioned policy). Phải seed ít nhất 1 chính sách trước khi tạo đơn được.
- `DON_THUE.ma_nguoi_huy > TAI_KHOAN` (không phải NHAN_VIEN) — vì khách hàng cũng có thể tự hủy đơn.
- `GIU_CHO` quan hệ **1-1** với `CHI_TIET_DON_THUE` (không phải 1-nhiều theo đơn).
- `LUOT_SU_DUNG_KHUYEN_MAI` quan hệ **1-1** với `DON_THUE`.
- `KHUYEN_MAI` có 2 bảng many-to-many: `KHUYEN_MAI_SAN_PHAM` và `KHUYEN_MAI_DANH_MUC`.
- `SAN_PHAM` có cả `suc_chua int` **và** `kich_thuoc varchar` (2 cột riêng), thêm `thong_so json`.
- `GIO_THUE.ma_khuyen_mai` là **FK về `KHUYEN_MAI`** (bigint), không phải string.
- `THANH_TOAN` tách 2 bảng: `THANH_TOAN` (giao dịch) + `CHI_TIET_THANH_TOAN` (chia mục đích: TienThue / TienCoc / ThuBoSung).

---

## Phạm vi tuần 2

| Task | Nội dung | Cấp FK |
|---|---|---|
| Task 0 ✅ | Khởi tạo dự án, TAI_KHOAN + KHACH_HANG + NHAN_VIEN | 0-1 |
| Task 1 | UC01 — Xác thực (JWT + BCrypt) | — |
| Task 2 | DANH_MUC_SAN_PHAM | 0 |
| Task 3 | SAN_PHAM + HINH_ANH_SAN_PHAM | 1-2 |
| Task 4 | KHUYEN_MAI + bảng nối | 0, 2 |
| Task 5 | NHA_CUNG_CAP + PHIEU_NHAP_HANG + CHI_TIET_PHIEU_NHAP + THIET_BI (skeleton) | 0-4 |
| Task 6 | GIO_THUE + CHI_TIET_GIO_THUE | 2-3 |
| Task 7 | CHINH_SACH + DON_THUE + CHI_TIET_DON_THUE + GIU_CHO + LUOT_SU_DUNG_KHUYEN_MAI | 2-5 |
| Task 8 | THANH_TOAN + CHI_TIET_THANH_TOAN | 4-5 |
| Task 9 | KhaDungService + UC03 (tìm & xem sản phẩm) | — |
| Task 10 | UC04 giỏ + UC05 đặt đơn + UC06 thanh toán (API) | — |
| Task 11 | UC21 admin CRUD danh mục & sản phẩm (API) | — |
| Task 12 | Seed data + integration test + review | — |

---

## Cấu trúc thư mục

```
GearGo_Webapp/                              ← Backend Web API
├── GearGo.csproj                           ✅
├── Program.cs                              ✅
├── appsettings.json                        ✅
├── Migrations/                             ✅ (EF CLI, root project)
├── Data/
│   └── ApplicationDbContext.cs             ✅
├── Models/
│   ├── Entities/                           ← 1 file mỗi bảng ERD
│   ├── Enums/                              ← các trạng thái
│   └── DTOs/
│       ├── Auth/
│       ├── SanPham/
│       ├── DanhMuc/
│       ├── GioThue/
│       ├── DonThue/
│       ├── ThanhToan/
│       └── Admin/
├── Services/
│   ├── Interfaces/
│   └── (Implementations)
└── Controllers/
    ├── AuthController.cs
    ├── SanPhamController.cs
    ├── DanhMucController.cs
    ├── GioThueController.cs
    ├── DonThueController.cs
    ├── ThanhToanController.cs
    └── Admin/
        ├── DanhMucController.cs
        └── SanPhamController.cs
```

---

## Task 0: Khởi tạo dự án ✅ (đã xong)

**Đã tạo:**
- `GearGo.csproj` — .NET 10, EF Core 9, BCrypt, JWT Bearer
- `Program.cs` — Web API, JWT Auth, CORS cho React
- `appsettings.json` — SQL Server Docker + JWT SecretKey
- `Data/ApplicationDbContext.cs` — DbSets: TaiKhoans, KhachHangs, NhanViens
- `Models/Entities/TaiKhoan.cs`, `KhachHang.cs`, `NhanVien.cs`
- `Migrations/[timestamp]_InitialCreate.cs`

**Cần kiểm tra lại 3 entity so với ERD (đối chiếu từng cột):**
- [ ] **0.a** `TaiKhoan.cs`: đủ `MaTaiKhoan`, `Email` (unique), `SoDienThoai` (unique), `MatKhauBam`, `VaiTro`, `TrangThai`, `LyDoKhoa`, `NgayTao`, `NgayCapNhat`.
- [ ] **0.b** `KhachHang.cs`: đủ `MaKhachHang`, `MaTaiKhoan` (FK unique), `HoTen`, `DiaChi`, `NgaySinh`, `AnhDaiDien`.
- [ ] **0.c** `NhanVien.cs`: đủ `MaNhanVien`, `MaTaiKhoan` (FK unique), `HoTen`, `DiaChi`, `NgayVaoLam`, `NgayNghiViec`, `TrangThaiLamViec`.

---

## Task 1: UC01 — Xác thực (JWT + BCrypt)

**Không thêm entity mới.** Chỉ implement service + controller trên `TAI_KHOAN` + `KHACH_HANG` đã có.

**Files:**
- Tạo: `Models/DTOs/Auth/DangKyRequest.cs`, `DangNhapRequest.cs`, `QuenMatKhauRequest.cs`, `DatLaiMatKhauRequest.cs`, `AuthResponse.cs`
- Tạo: `Services/Interfaces/IXacThucService.cs`, `Services/XacThucService.cs`
- Tạo: `Services/Interfaces/IJwtService.cs`, `Services/JwtService.cs`
- Tạo: `Controllers/AuthController.cs`

**Các bước:**

- [ ] **1.1** `AuthResponse`: `Token`, `LoaiToken = "Bearer"`, `HetHanSau`, `MaTaiKhoan`, `VaiTro`, `HoTen`, `Email`.

- [ ] **1.2** `IJwtService.TaoToken(TaiKhoan)` — JWT với claims `MaTaiKhoan`, `Email`, `ClaimTypes.Role = VaiTro`, hết hạn 7 ngày, HMAC-SHA256 với `Jwt:SecretKey`.

- [ ] **1.3** `IXacThucService`:
  ```csharp
  Task<Result<AuthResponse>> DangKyAsync(DangKyRequest req);
  Task<Result<AuthResponse>> DangNhapAsync(DangNhapRequest req);
  Task<Result<string>> TaoTokenQuenMatKhauAsync(string email);
  Task<Result> DatLaiMatKhauAsync(DatLaiMatKhauRequest req);
  Task<Result<AuthResponse>> LayThongTinToiAsync(long maTaiKhoan);
  ```

- [ ] **1.4** `DangKyAsync`:
  - Kiểm tra `Email`, `SoDienThoai` chưa tồn tại trong `TAI_KHOAN`.
  - `BCrypt.HashPassword(req.MatKhau)` (workfactor 12).
  - Transaction: tạo `TaiKhoan` (`VaiTro = "KhachHang"`, `TrangThai = "HoatDong"`) + `KhachHang` (1-1).
  - **Không** cho phép đăng ký `NhanVien` / `QuanTriVien` qua endpoint công khai.

- [ ] **1.5** `DangNhapAsync`:
  - Tìm theo `Email` (nếu có `@`) hoặc `SoDienThoai`.
  - Kiểm tra `TrangThai != "BiKhoa"`.
  - `BCrypt.Verify(req.MatKhau, taiKhoan.MatKhauBam)`.
  - Sai → tăng đếm, khóa sau `AppSettings:KhoaTaiKhoanSauSoLanSai` lần.
  - Đúng → trả JWT token.

- [ ] **1.6** `AuthController` (`[Route("api/auth")]`):
  - `POST /api/auth/dang-ky` → 201 + AuthResponse
  - `POST /api/auth/dang-nhap` → 200 + AuthResponse
  - `POST /api/auth/quen-mat-khau` → gửi email (mock: log token)
  - `POST /api/auth/dat-lai-mat-khau` → đổi mật khẩu
  - `GET /api/auth/toi` `[Authorize]` → thông tin từ claims

- [ ] **1.7** DI: `IJwtService`, `IXacThucService` (Scoped) trong `Program.cs`.

- [ ] **1.8** Test bằng curl (đăng ký + đăng nhập lấy token).

- [ ] **1.9** Commit: `feat: UC01 - JWT authentication with BCrypt`

---

## Task 2: DANH_MUC_SAN_PHAM (Cấp 0, self-ref)

**ERD schema:**
```
DANH_MUC_SAN_PHAM
├── ma_danh_muc (bigint, pk, increment)
├── ma_danh_muc_cha (bigint, FK self-ref, nullable)
├── ten_danh_muc (varchar 255)
├── mo_ta (text)
├── thu_tu_hien_thi (int)
└── trang_thai (varchar 50)
```

**Các bước:**

- [ ] **2.1** Tạo `DanhMucSanPham.cs` với `[Table("DANH_MUC_SAN_PHAM")]` + đầy đủ 6 cột.

- [ ] **2.2** Navigation: `DanhMucCha?`, `DanhMucCon` (ICollection), `SanPhams` (ICollection).

- [ ] **2.3** Thêm `DbSet<DanhMucSanPham>` vào DbContext.

- [ ] **2.4** Fluent API: self-ref `HasOne(DanhMucCha).WithMany(DanhMucCon)`, `OnDelete(Restrict)`.

- [ ] **2.5** `dotnet ef migrations add AddDanhMucSanPham && dotnet ef database update`

- [ ] **2.6** Commit: `feat: add DanhMucSanPham entity`

---

## Task 3: SAN_PHAM + HINH_ANH_SAN_PHAM (Cấp 1-2)

**ERD schema:**
```
SAN_PHAM
├── ma_san_pham (bigint, pk)
├── ma_danh_muc (bigint, FK NOT NULL)
├── ma_san_pham_hien_thi (varchar 50, UNIQUE)
├── ten_san_pham (varchar 255)
├── thuong_hieu (varchar 255)
├── mo_ta (text)
├── suc_chua (int)                          ← int riêng
├── kich_thuoc (varchar 255)                ← varchar riêng
├── thong_so (json)                         ← JSON thông số
├── gia_thue_moi_ngay (decimal 18,2)
├── muc_coc_moi_thiet_bi (decimal 18,2)
├── gia_tri_boi_thuong (decimal 18,2)
└── trang_thai_kinh_doanh (varchar 50)

HINH_ANH_SAN_PHAM
├── ma_hinh_anh (bigint, pk)
├── ma_san_pham (bigint, FK NOT NULL)
├── duong_dan (varchar 500)
├── la_anh_chinh (boolean)
└── thu_tu (int)
```

**Các bước:**

- [ ] **3.1** Enum `TrangThaiKinhDoanh`: `DangKinhDoanh`, `TamNgung`, `NgungKinhDoanh`.

- [ ] **3.2** Tạo `SanPham.cs` khớp ERD (đủ 2 cột `SucChua` int + `KichThuoc` string, `ThongSo` string chứa JSON).

- [ ] **3.3** Tạo `HinhAnhSanPham.cs` khớp ERD.

- [ ] **3.4** Fluent API:
  - Unique `SAN_PHAM.ma_san_pham_hien_thi`.
  - `SanPham` → `DanhMuc` cascade Restrict.
  - `HinhAnhSanPham` → `SanPham` cascade Delete.

- [ ] **3.5** `dotnet ef migrations add AddSanPham && dotnet ef database update`

- [ ] **3.6** Commit: `feat: add SanPham and HinhAnhSanPham entities`

---

## Task 4: KHUYEN_MAI + bảng nối (Cấp 0, 2)

**ERD schema:**
```
KHUYEN_MAI
├── ma_khuyen_mai (bigint, pk)
├── ma_giam_gia (varchar 50, UNIQUE)        ← mã khách nhập
├── ten_khuyen_mai (varchar 255)
├── loai_giam (varchar 50)                  ← PhanTram / SoTien
├── gia_tri_giam (decimal 18,2)
├── muc_giam_toi_da (decimal 18,2)
├── tien_thue_toi_thieu (decimal 18,2)
├── pham_vi_ap_dung (varchar 50)            ← TatCa / TheoSanPham / TheoDanhMuc
├── bat_dau (datetime)
├── ket_thuc (datetime)
├── gioi_han_tong_luot (int)
├── gioi_han_moi_khach (int)
└── trang_thai (varchar 50)

KHUYEN_MAI_SAN_PHAM   (composite PK)
KHUYEN_MAI_DANH_MUC   (composite PK)
```

**Các bước:**

- [ ] **4.1** Enums: `LoaiGiam { PhanTram, SoTien }`, `PhamViApDung { TatCa, TheoSanPham, TheoDanhMuc }`, `TrangThaiKhuyenMai { HienThi, TamAn, HetHan }`.

- [ ] **4.2** Tạo `KhuyenMai.cs` đầy đủ 13 trường.

- [ ] **4.3** Tạo `KhuyenMaiSanPham` và `KhuyenMaiDanhMuc` với composite PK — dùng Fluent API `HasKey(x => new { x.MaKhuyenMai, x.MaSanPham })`.

- [ ] **4.4** `dotnet ef migrations add AddKhuyenMai && dotnet ef database update`

- [ ] **4.5** Commit: `feat: add KhuyenMai with product/category scope tables`

---

## Task 5: Nhập kho & Thiết bị (Cấp 0-4, skeleton + seed)

**Lý do cần ở Tuần 2:** `THIET_BI.ma_chi_tiet_phieu_nhap` là NOT NULL FK → không có phiếu nhập không có thiết bị. `KhaDungService` (UC03) cần đếm `THIET_BI` để tính khả dụng.

**Chiến lược:** Tạo entities skeleton (KHÔNG có API/UI cho nhập kho — dời sang Tuần 3). Chỉ seed dữ liệu mẫu.

**Các bước:**

- [ ] **5.1** Tạo `NhaCungCap.cs` (Cấp 0) — 10 trường: `MaNhaCungCap`, `MaNhaCungCapHienThi` (unique), `TenNhaCungCap`, `NguoiLienHe`, `SoDienThoai`, `Email`, `DiaChi`, `MaSoThue`, `GhiChu`, `TrangThaiHopTac`.

- [ ] **5.2** Tạo `PhieuNhapHang.cs` (Cấp 2) — FK: `MaNhaCungCap`, `MaNguoiLap` (NhanVien), `MaNguoiXacNhan` (NhanVien, nullable). Đủ 15 trường bao gồm snapshot `ThongTinNhaCungCapLucNhap (json)`.

- [ ] **5.3** Tạo `ChiTietPhieuNhap.cs` (Cấp 3) — FK: `MaPhieuNhap`, `MaSanPham`.

- [ ] **5.4** Tạo `ThietBi.cs` (Cấp 4) — FK: `MaChiTietPhieuNhap`. Đủ 8 trường bao gồm `PhuKienDiKem (json)`, `TrangThaiSuDung`.

- [ ] **5.5** Enum `TrangThaiSuDungThietBi`: `SanSang`, `DangGiu`, `DangThue`, `DangBaoTri`, `ThatLac`, `NgungSuDung`.

- [ ] **5.6** Fluent API unique: `NhaCungCap.ma_nha_cung_cap_hien_thi`, `PhieuNhapHang.ma_phieu_hien_thi`, `ThietBi.ma_thiet_bi_hien_thi`.

- [ ] **5.7** `dotnet ef migrations add AddNhapKhoThietBi && dotnet ef database update`

- [ ] **5.8** Commit: `feat: add NhaCungCap, PhieuNhapHang, ChiTietPhieuNhap, ThietBi (skeleton for Week 3)`

---

## Task 6: GIO_THUE + CHI_TIET_GIO_THUE (Cấp 2-3)

**ERD schema:**
```
GIO_THUE
├── ma_gio_thue (bigint, pk)
├── ma_khach_hang (bigint, FK NOT NULL, UNIQUE)   ← 1-1 với KhachHang
├── ma_khuyen_mai (bigint, FK nullable)           ← FK về KHUYEN_MAI (bigint!)
├── gio_nhan_du_kien (datetime)
├── gio_tra_du_kien (datetime)
└── ngay_cap_nhat (datetime)

CHI_TIET_GIO_THUE
├── ma_chi_tiet_gio (bigint, pk)
├── ma_gio_thue (bigint, FK NOT NULL)
├── ma_san_pham (bigint, FK NOT NULL)
└── so_luong (int)
```

**Các bước:**

- [ ] **6.1** Tạo `GioThue.cs` với FK về `KhuyenMai` (nullable `long? MaKhuyenMai` + navigation `KhuyenMai?`).

- [ ] **6.2** Tạo `ChiTietGioThue.cs`.

- [ ] **6.3** Fluent API:
  - `GioThue.MaKhachHang` unique (1-1 với KhachHang).
  - Cascade delete `ChiTietGioThue` theo `GioThue`.

- [ ] **6.4** `dotnet ef migrations add AddGioThue && dotnet ef database update`

- [ ] **6.5** Commit: `feat: add GioThue and ChiTietGioThue entities`

---

## Task 7: Đơn thuê hoàn chỉnh (Cấp 2-5)

**5 bảng phụ thuộc lẫn nhau:**
- `CHINH_SACH` (Cấp 2)
- `DON_THUE` (Cấp 3)
- `CHI_TIET_DON_THUE` (Cấp 4)
- `GIU_CHO` (Cấp 5, 1-1 CHI_TIET_DON_THUE)
- `LUOT_SU_DUNG_KHUYEN_MAI` (Cấp 4, 1-1 DON_THUE)

**Các bước:**

- [ ] **7.1** Enum `TrangThaiDonThue`: `ChoThanhToan`, `DaXacNhan`, `DangChuanBi`, `SanSangNhan`, `DangThue`, `DaNhanTra`, `ChoDoiSoat`, `HoanTat`, `HetHan`, `KhachHuy`, `CuaHangHuy`.

- [ ] **7.2** Tạo `ChinhSach.cs` (versioned policy):
  - `MaChinhSach`, `MaNguoiTao` (FK NhanVien), `TenChinhSach`, `PhienBan` (int, unique), `ThoiDiemApDung`, `NoiDungChinhSach` (json), `NgayTao`.

- [ ] **7.3** Tạo `DonThue.cs` đầy đủ **20 trường** theo ERD:
  - FK: `MaKhachHang`, `MaChinhSach`, `MaNguoiHuy?` (FK **TaiKhoan**, không phải NhanVien).
  - `MaDonHienThi` unique.
  - Snapshot: `KhuyenMaiLucDat (json)`.
  - Tiền: `TongTienThueTruocGiam`, `TongTienGiam`, `TongTienCoc`, `TienThueGiuLaiKhiHuy`.
  - Timestamp: `NgayDat`, `HanThanhToan`, `ThoiDiemHuy`, `ThoiDiemHoanTat`.
  - Other: `TenNguoiNhan`, `SoDienThoaiNguoiNhan`, `EmailLienHe`, `TrangThai`, `LyDoHuy`, `GhiChu`.

- [ ] **7.4** Tạo `ChiTietDonThue.cs` với snapshot đầy đủ:
  - FK: `MaDonThue`, `MaSanPham`.
  - Snapshot: `TenSanPhamLucDat`, `DonGiaThueMoiNgay`, `MucCocMoiThietBi`, `GiaTriBoiThuongMoiThietBi`, `PhuKienVaMucBoiThuongLucDat (json)`.
  - `SoNgayTinhTien`, `SoLuong`, `TienGiam`.

- [ ] **7.5** Tạo `GiuCho.cs` (1-1 với ChiTietDonThue):
  - `MaChiTietDon` **unique** (FK 1-1).
  - `ThoiDiemTao`, `ThoiDiemHetHan`, `ThoiDiemGiaiPhong`, `TrangThai`.

- [ ] **7.6** Enum `TrangThaiGiuCho`: `DangGiu`, `DaXacNhan`, `DaGiaiPhong`, `HetHan`.

- [ ] **7.7** Tạo `LuotSuDungKhuyenMai.cs` (1-1 với DonThue):
  - `MaDonThue` **unique** (FK 1-1).
  - `ThoiDiemGiuLuot`, `ThoiDiemHetHan`, `ThoiDiemSuDung`, `ThoiDiemGiaiPhong`, `SoTienGiam`, `TrangThai`.

- [ ] **7.8** Fluent API:
  - `DonThue.MaDonHienThi` unique.
  - `DonThue.MaKhachHang` cascade Restrict.
  - `GiuCho.MaChiTietDon` unique + cascade Delete.
  - `LuotSuDungKhuyenMai.MaDonThue` unique.
  - `ChinhSach.PhienBan` unique.

- [ ] **7.9** `dotnet ef migrations add AddDonThue && dotnet ef database update`

- [ ] **7.10** Commit: `feat: add ChinhSach, DonThue, ChiTietDonThue, GiuCho, LuotSuDungKhuyenMai`

---

## Task 8: THANH_TOAN + CHI_TIET_THANH_TOAN (Cấp 4-5)

**ERD schema:**
```
THANH_TOAN
├── ma_thanh_toan (bigint, pk)
├── ma_don_thue (bigint, FK NOT NULL)
├── ma_nguoi_ghi_nhan (bigint, FK NhanVien, nullable)
├── ma_yeu_cau (varchar 100, UNIQUE)         ← idempotency key
├── cong_thanh_toan (varchar 50)
├── ma_giao_dich_cong (varchar 255)
├── tong_so_tien (decimal 18,2)
├── phuong_thuc (varchar 50)
├── thoi_diem_tao (datetime)
├── thoi_diem_thanh_cong (datetime)
├── trang_thai (varchar 50)
├── trang_thai_doi_chieu (varchar 50)
└── ghi_chu (text)

CHI_TIET_THANH_TOAN
├── ma_chi_tiet_thanh_toan (bigint, pk)
├── ma_thanh_toan (bigint, FK NOT NULL)
├── muc_dich (varchar 50)                    ← TienThue / TienCoc / ThuBoSung
└── so_tien (decimal 18,2)
```

**Các bước:**

- [ ] **8.1** Enum `MucDichThanhToan`: `TienThue`, `TienCoc`, `ThuBoSung`, `HoanCoc`.

- [ ] **8.2** Enum `TrangThaiThanhToan`: `DangXuLy`, `ThanhCong`, `ThatBai`, `Huy`.

- [ ] **8.3** Tạo `ThanhToan.cs` (13 trường).

- [ ] **8.4** Tạo `ChiTietThanhToan.cs`.

- [ ] **8.5** Fluent API: `ThanhToan.MaYeuCau` unique (idempotency), index `ThanhToan.MaGiaoDichCong`.

- [ ] **8.6** `dotnet ef migrations add AddThanhToan && dotnet ef database update`

- [ ] **8.7** Commit: `feat: add ThanhToan and ChiTietThanhToan entities`

---

## Task 9: KhaDungService + UC03

**Files:**
- Tạo: `Services/Interfaces/IKhaDungService.cs`, `Services/KhaDungService.cs`
- Tạo: `Services/Interfaces/IDanhMucService.cs`, `Services/DanhMucService.cs`
- Tạo: `Services/Interfaces/ISanPhamService.cs`, `Services/SanPhamService.cs`
- Tạo: `Controllers/DanhMucController.cs`, `SanPhamController.cs`
- Tạo: DTOs trong `Models/DTOs/DanhMuc/`, `SanPham/`

**Các bước:**

- [ ] **9.1** `IKhaDungService`:
  ```csharp
  Task<int> LayKhaDungAsync(long maSanPham, DateTime gioNhan, DateTime gioTra);
  Task<Dictionary<long, int>> LayKhaDungNhieuAsync(IEnumerable<long> maSanPhams, DateTime gioNhan, DateTime gioTra);
  ```

- [ ] **9.2** Công thức khả dụng (mục 8.1 đặc tả):
  - Đếm `THIET_BI` với `SanPham.MaSanPham` (join qua `CHI_TIET_PHIEU_NHAP`) có `TrangThaiSuDung IN ("SanSang", "DangThue")`.
  - Trừ số bị **giữ chỗ** (`GIU_CHO.trang_thai = "DangGiu"`, chưa hết hạn) hoặc **đã phân công** trong đơn có lịch giao nhau `[gioNhan, gioTra]`.
  - Lịch giao nhau: `gioNhanDon < gioTra` AND `gioTraDon > gioNhan`.

- [ ] **9.3** `ISanPhamService.TimKiemAsync(TimKiemSanPhamRequest)`:
  - Filter: `TuKhoa`, `MaDanhMuc`, `ThuongHieu`, `GiaMin`, `GiaMax`, `GioNhan`, `GioTra`.
  - Sort: `SapXep` (GiaTang, GiaGiam, MoiNhat, PhoBien).
  - Phân trang: `Trang`, `SoMoiTrang` (default 12).
  - Chỉ trả `TrangThaiKinhDoanh = "DangKinhDoanh"` cho khách.
  - Có `GioNhan` + `GioTra` → gọi `IKhaDungService.LayKhaDungNhieuAsync`.

- [ ] **9.4** `SanPhamController` (`[Route("api/san-pham")]`):
  - `GET /api/san-pham` — list + phân trang.
  - `GET /api/san-pham/{id}?gioNhan=&gioTra=` — chi tiết + khả dụng.

- [ ] **9.5** `DanhMucController` (`[Route("api/danh-muc")]`):
  - `GET /api/danh-muc` — cây danh mục.
  - `GET /api/danh-muc/{id}` — chi tiết.

- [ ] **9.6** Đăng ký DI: `IKhaDungService`, `IDanhMucService`, `ISanPhamService` (Scoped).

- [ ] **9.7** Commit: `feat: UC03 - product search with availability check`

---

## Task 10: UC04 (giỏ) + UC05 (đặt đơn) + UC06 (thanh toán)

### UC04 — Giỏ thuê

- [ ] **10.1** `IGioThueService`:
  ```csharp
  Task<GioThueResponse> LayGioAsync(long maKhachHang);
  Task<GioThueResponse> ThemAsync(long maKhachHang, long maSanPham, int soLuong);
  Task<GioThueResponse> CapNhatSoLuongAsync(long maKhachHang, long maChiTiet, int soLuongMoi);
  Task XoaChiTietAsync(long maKhachHang, long maChiTiet);
  Task<GioThueResponse> DatThoiGianAsync(long maKhachHang, DateTime gioNhan, DateTime gioTra);
  Task<GioThueResponse> ApMaKhuyenMaiAsync(long maKhachHang, string maGiamGia);
  ```

- [ ] **10.2** Tính báo giá (mục 8.2 đặc tả):
  - `SoNgay = Math.Ceiling((GioTra - GioNhan).TotalHours / 24.0)`, tối thiểu 1.
  - `TienThue = SUM(don_gia_thue_moi_ngay * so_luong * so_ngay)`.
  - `TienCoc = SUM(muc_coc_moi_thiet_bi * so_luong)`.
  - Áp `KhuyenMai`: kiểm tra `pham_vi_ap_dung`, `tien_thue_toi_thieu`, `muc_giam_toi_da`.

- [ ] **10.3** `GioThueController` (`[Authorize]`, `[Route("api/gio-thue")]`):
  - `GET /api/gio-thue`
  - `POST /api/gio-thue/them`
  - `PUT /api/gio-thue/{maChiTiet}/so-luong`
  - `DELETE /api/gio-thue/{maChiTiet}`
  - `PUT /api/gio-thue/thoi-gian`
  - `POST /api/gio-thue/ma-giam-gia`

### UC05 — Đặt đơn + giữ chỗ

- [ ] **10.4** `IDonThueService.TaoDonAsync` trong `IsolationLevel.Serializable`:
  1. Load giỏ, kiểm tra không rỗng.
  2. Kiểm tra khả dụng mỗi dòng → nếu thiếu → throw `KhongDuHangException`.
  3. Nếu báo giá thay đổi từ khi khách xem giỏ → throw `BaogiaThayDoiException`.
  4. Load `CHINH_SACH` phiên bản mới nhất.
  5. Tạo `DonThue` (`ChoThanhToan`), sinh `MaDonHienThi` unique.
  6. Snapshot vào `ChiTietDonThue`: giá + phụ kiện + bồi thường tại thời điểm đặt.
  7. Với mỗi `ChiTietDonThue`: tạo `GiuCho` (`DangGiu`, `HanThanhToan = Now + 15 phút`).
  8. Nếu có khuyến mãi: tạo `LuotSuDungKhuyenMai` (`DangGiu`).
  9. Xóa giỏ.

- [ ] **10.5** `IHostedService` chạy 1 phút:
  - Đơn `ChoThanhToan` hết hạn → `HetHan`, giải phóng `GiuCho`, giải phóng lượt khuyến mãi.

- [ ] **10.6** `DonThueController` (`[Authorize]`, `[Route("api/don-thue")]`):
  - `GET /api/don-thue/xac-nhan` — preview.
  - `POST /api/don-thue` — tạo đơn.
  - `GET /api/don-thue/{id}` — chi tiết.
  - `GET /api/don-thue` — danh sách đơn của khách.
  - `POST /api/don-thue/{id}/huy` — hủy đơn.

### UC06 — Thanh toán

- [ ] **10.7** Mock gateway `TaoUrlAsync(maDonThue, returnUrl)`:
  - Sinh `MaYeuCau = Guid.NewGuid().ToString("N")`.
  - Trả URL: `{returnUrl}?donId={id}&maYeuCau={maYeuCau}&ketQua=success&maGD={fakeId}`.

- [ ] **10.8** `XuLyKetQuaAsync(callback)`:
  - **Idempotency:** kiểm tra `MaYeuCau` chưa tồn tại trong `THANH_TOAN`.
  - Đơn còn `ChoThanhToan` và chưa hết hạn.
  - Số tiền = `TongTienThueTruocGiam - TongTienGiam + TongTienCoc`.
  - Tạo `THANH_TOAN` (`ThanhCong`) + 2 `CHI_TIET_THANH_TOAN` (`TienThue` + `TienCoc`).
  - Đơn → `DaXacNhan`, `GiuCho` → `DaXacNhan`, `LuotSuDungKhuyenMai` → `DaSuDung`.

- [ ] **10.9** `ThanhToanController` (`[Route("api/thanh-toan")]`):
  - `POST /api/thanh-toan/{maDon}/tao-url` `[Authorize]`.
  - `GET /api/thanh-toan/ket-qua` — callback từ gateway.

- [ ] **10.10** Commit: `feat: UC04-UC06 - cart, order creation, payment API`

---

## Task 11: UC21 — Admin CRUD danh mục & sản phẩm

**Các bước:**

- [ ] **11.1** `[Authorize(Policy = "AdminOnly")]` cho toàn bộ `Controllers/Admin/`.

- [ ] **11.2** `Admin/DanhMucController` (`[Route("api/admin/danh-muc")]`):
  - `GET` — list tree.
  - `POST` — tạo mới.
  - `PUT /{id}` — cập nhật.
  - `DELETE /{id}` — chỉ khi không có sản phẩm và danh mục con.
  - `PATCH /{id}/trang-thai` — đổi hiển thị.
  - Validate: không cho `ma_danh_muc_cha` là chính nó hoặc con của nó.

- [ ] **11.3** `Admin/SanPhamController` (`[Route("api/admin/san-pham")]`):
  - `GET` — list + filter.
  - `POST` — tạo mới (unique `MaSanPhamHienThi`).
  - `PUT /{id}` — cập nhật (giá cũ đã snapshot trong `CHI_TIET_DON_THUE`).
  - `PATCH /{id}/trang-thai` — đổi kinh doanh.
  - `POST /{id}/hinh-anh` — upload (`.jpg/.jpeg/.png/.webp`, ≤ 5MB).
  - `DELETE /hinh-anh/{maHinhAnh}` — xóa 1 ảnh.
  - **KHÔNG có endpoint tăng/giảm số lượng thiết bị trực tiếp** — qua phiếu nhập (Tuần 3).

- [ ] **11.4** Commit: `feat: UC21 - admin category and product CRUD API`

---

## Task 12: Seed data + integration test + review

**Các bước:**

- [ ] **12.1** `SeedData.EnsureSeededAsync`:
  - 1 tài khoản `QuanTriVien` (email `admin@geargo.local`, BCrypt hash sẵn).
  - 1 `NhanVien` — cần cho `PhieuNhapHang.ma_nguoi_lap`.
  - 1 `KhachHang` test.
  - 3 danh mục: "Lều trại", "Bàn ghế", "Phụ kiện".
  - 5 sản phẩm, ảnh placeholder.
  - 1 `NhaCungCap`.
  - 1 `PhieuNhapHang` + 5 `ChiTietPhieuNhap` → 10 `ThietBi` (`SanSang`).
  - 1 `ChinhSach` phiên bản 1.
  - 1 `KhuyenMai` mã `TEST10` giảm 10%, `TatCa`, tối thiểu 500.000₫, hạn +30 ngày.

- [ ] **12.2** Gọi `SeedData.EnsureSeededAsync` khi app khởi động ở Development.

- [ ] **12.3** Integration test `DatDonFlowTests`:
  1. Đăng ký + đăng nhập → JWT.
  2. `GET /api/san-pham` → có sản phẩm.
  3. `POST /api/gio-thue/them` × 2.
  4. `PUT /api/gio-thue/thoi-gian` (Now+1h, Now+25h).
  5. `POST /api/gio-thue/ma-giam-gia` với `TEST10`.
  6. `POST /api/don-thue` → `ChoThanhToan`, có `GiuCho`.
  7. `POST /api/thanh-toan/{id}/tao-url` → URL.
  8. `GET` callback → `DaXacNhan`, 2 `CHI_TIET_THANH_TOAN`.
  9. Callback lần 2 cùng `MaYeuCau` → không ghi trùng.

- [ ] **12.4** Race condition test: 2 user cùng đặt thiết bị cuối → chỉ 1 thành công.

- [ ] **12.5** Hết hạn test: `HanThanhToan = Now + 1s`, chờ 2s → `HetHan`, `GiuCho` giải phóng.

- [ ] **12.6** Security check:
  - Không raw SQL nhận user input.
  - `[Authorize]` mọi endpoint cần đăng nhập.
  - Upload: `.jpg/.jpeg/.png/.webp`, ≤ 5MB, kiểm tra magic bytes.
  - JWT secret không hardcode, `appsettings.Development.json` trong `.gitignore`.

- [ ] **12.7** Commit: `feat: week-2 complete - seed data, integration tests, security review`

---

## Checklist nghiệm thu tuần 2

- [ ] `dotnet build` — 0 errors.
- [ ] `dotnet ef migrations list` — đủ migrations cho Task 0-8.
- [ ] Đăng ký + đăng nhập trả JWT hợp lệ.
- [ ] Sai mật khẩu 5 lần → khóa 15 phút.
- [ ] `GET /api/san-pham` với `?gioNhan=&gioTra=` trả số khả dụng đúng.
- [ ] Thêm giỏ, đổi số lượng, đổi thời gian → báo giá cập nhật đúng.
- [ ] Áp mã `TEST10` → giảm 10% khi tiền thuê ≥ 500.000₫.
- [ ] Tạo đơn → `ChoThanhToan`, có `GiuCho` cho mọi `ChiTietDonThue`, hạn 15 phút.
- [ ] Đơn hết hạn → tự `HetHan`, `GiuCho` giải phóng.
- [ ] Thanh toán mock → `DaXacNhan`, 2 `ChiTietThanhToan`.
- [ ] Callback trùng `MaYeuCau` → không ghi trùng.
- [ ] `/api/admin/*` chỉ nhận `QuanTriVien`, token `KhachHang` → 403.
- [ ] Integration test happy path pass.

---

## Ghi chú kỹ thuật

| Điểm | Lưu ý |
|---|---|
| Naming | C# PascalCase, EF Core map snake_case qua `[Column(...)]` từng field |
| PK bigint | Dùng `long` trong C#, KHÔNG dùng `int` |
| Số tiền | `decimal(18,2)` — dùng `decimal` C#, KHÔNG dùng `double/float` |
| JSON columns | Lưu string, dùng `JsonSerializer` khi read/write |
| Snapshot | `CHI_TIET_DON_THUE` copy giá + phụ kiện tại thời điểm đặt — không JOIN back |
| Idempotency | Unique `THANH_TOAN.ma_yeu_cau` |
| Transaction | `TaoDonAsync` bọc `IsolationLevel.Serializable` |
| Migrations | EF Core tạo `Migrations/` ở root project |
| Không xóa data lịch sử | Đơn hoàn tất, thanh toán thành công — chỉ đổi trạng thái |
| Nhập kho tuần 2 | Chỉ entity + seed, KHÔNG API/UI — Tuần 3 |
| Xác thực | JWT Bearer, React gửi `Authorization: Bearer <token>` |
| Database | SQL Server 2022 Docker `geargo-sqlserver` port 1433 |

---

## Roadmap sau Tuần 2

**Tuần 3:** Nhập kho (UC22–UC23), phân công thiết bị (UC07), bàn giao (UC08).  
**Tuần 4:** Nhận trả (UC09), phụ phí + đối soát tiền cọc (UC10–UC11), hoàn tiền (UC12).  
**Tuần 5:** Bảo trì (UC13), điều chỉnh kho (UC24), đánh giá (UC14), thông báo (UC15).  
**Tuần 6:** Lịch sử/nhật ký, báo cáo (UC16–UC20), hoàn thiện, deploy.
