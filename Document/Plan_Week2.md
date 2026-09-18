# GearGo — Kế hoạch Tuần 2: Từ nền tảng đến đặt đơn & thanh toán

> **Nguồn dữ liệu chuẩn:** `Diagrams/ERD.dbml`. Mọi entity C# phải khớp 1-1 với bảng trong ERD (tên bảng, tên cột, kiểu dữ liệu, quan hệ FK). Tuyệt đối không tự thêm/bớt cột.

**Mục tiêu:** UC01 (xác thực) + UC03–UC06 (khách duyệt sản phẩm → giỏ → đơn → thanh toán) + UC21 (admin CRUD danh mục & sản phẩm).

**Kiến trúc:** ASP.NET Core Web API + React frontend. Backend trả JSON, JWT Bearer, không có Razor Views.

**Tech Stack:** ASP.NET Core 10 · EF Core 9 · SQL Server (Docker) · JWT Bearer · BCrypt.Net-Next · React (Vite)

**Phạm vi nghiệm thu tuần 2:** Backend API. React frontend chưa phân công trong tuần 2; nếu có thì bổ sung riêng.

**Chỉ Người 1 chịu trách nhiệm tạo migration** (xem `PhanCong_Week2.md`): thành viên hoàn thiện entity và Fluent API → Người 1 tích hợp, tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất. Trong tuần có thể có nhiều migration nối tiếp nhau (không phải 1 migration duy nhất), nhưng **chỉ Người 1 tạo**. Người 1 cũng tích hợp cấu hình chung trong `Program.cs` và kiểm tra migration chạy được trên database mới.

**Người 1 bàn giao service xử lý lỗi chung (Day 1–2):**
- `Result<T>` / `Result` cho tầng service.
- Cây exception nghiệp vụ: `NghiepVuException` (base), `KhongDuHangException`, `BaogiaThayDoiException`, `TrangThaiKhongHopLeException`, `TaiKhoanBiKhoaException`, `KhuyenMaiKhongHopLeException`, `KhongTimThayException`, `KhongCoQuyenException`.
- `ExceptionHandlingMiddleware`: exception nghiệp vụ → HTTP 400/403/404/409; exception khác → 500.
- Cấu trúc lỗi JSON thống nhất: `{ maLoi, thongDiep, chiTiet? }`.

---

## Quy ước kỹ thuật dùng chung

### Chuyển kiểu ERD → SQL Server / C#

| Kiểu ERD | C# / SQL Server | Ghi chú |
|---|---|---|
| `json` | `string` (C#), `nvarchar(max)` (SQL) | Lưu chuỗi JSON; dùng `JsonSerializer` khi read/write |
| `varchar(n)` / `text` | `string` | Enum lưu dạng chuỗi (string), không lưu số |
| `decimal(18,2)` | `decimal` | KHÔNG dùng `double/float` |
| `bigint` | `long` | KHÔNG dùng `int` cho PK/FK |
| `boolean` | `bool` | |
| `date` | `DateOnly` hoặc `DateTime` | Tùy ngữ cảnh |
| `datetime` | `DateTime` | |

### Quy ước giờ

- Tất cả giờ **lưu và truyền API** dạng UTC hoặc DateTimeOffset.
- **Hiển thị** cho người dùng: chuyển sang giờ Việt Nam (UTC+7).
- Một ngày tính tiền = 24 giờ; phần lẻ làm tròn lên, tối thiểu 1 ngày.

### Cấu trúc JSON quan trọng

| Trường JSON | Mô tả |
|---|---|
| `CHINH_SACH.noi_dung_chinh_sach` | JSON object chứa toàn bộ chính sách (hạn giữ chỗ, phí hủy, hệ số trễ…) |
| `DON_THUE.khuyen_mai_luc_dat` | Snapshot thông tin khuyến mãi tại thời điểm tạo đơn |
| `CHI_TIET_DON_THUE.phu_kien_va_muc_boi_thuong_luc_dat` | Snapshot phụ kiện kèm theo & mức bồi thường từng phụ kiện |
| `PHIEU_NHAP_HANG.thong_tin_nha_cung_cap_luc_nhap` | Snapshot thông tin nhà cung cấp lúc nhập |
| `THIET_BI.phu_kien_di_kem` | Danh sách phụ kiện theo thiết bị |
| `SAN_PHAM.thong_so` | Thông số kỹ thuật dạng key-value |

### DTO và cấu trúc lỗi chung

- **DTO:** Tách Request/Response riêng; không dùng entity trực tiếp làm response.
- **Cấu trúc lỗi chung:**
  ```json
  {
    "maLoi": "KHONG_DU_HANG",
    "thongDiep": "Sản phẩm Lều 4 người không đủ số lượng.",
    "chiTiet": { "maSanPham": 1, "canThiet": 3, "conLai": 1 }
  }
  ```
- **Chuyển lỗi nghiệp vụ → HTTP:**
  - Validation lỗi → 400 Bad Request
  - Không tìm thấy → 404 Not Found
  - Xung đột nghiệp vụ (hết hàng, báo giá đổi, hết lượt mã…) → 409 Conflict
  - Không có quyền → 403 Forbidden
  - Lỗi server → 500 Internal Server Error

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
- `LUOT_SU_DUNG_KHUYEN_MAI` quan hệ **1-1** với `DON_THUE`; **có FK `MaKhuyenMai`** (NOT NULL) về `KHUYEN_MAI`.
- `KHUYEN_MAI` có 2 bảng many-to-many: `KHUYEN_MAI_SAN_PHAM` (composite PK `MaKhuyenMai + MaSanPham`) và `KHUYEN_MAI_DANH_MUC` (composite PK `MaKhuyenMai + MaDanhMuc`).
- `SAN_PHAM` có cả `suc_chua int` **và** `kich_thuoc varchar` (2 cột riêng), thêm `thong_so json`.
- `GIO_THUE.ma_khuyen_mai` là **FK về `KHUYEN_MAI`** (bigint), không phải string.
- `THANH_TOAN` tách 2 bảng: `THANH_TOAN` (giao dịch) + `CHI_TIET_THANH_TOAN` (chia mục đích: TienThue / TienCoc / ThuBoSung).
- `LICH_SU_TRANG_THAI_DON` đã có trong ERD — dùng để ghi lịch sử chuyển trạng thái đơn.

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
| Task 7 | CHINH_SACH + DON_THUE + CHI_TIET_DON_THUE + GIU_CHO + LUOT_SU_DUNG_KHUYEN_MAI + LICH_SU_TRANG_THAI_DON | 2-5 |
| Task 8 | THANH_TOAN + CHI_TIET_THANH_TOAN | 4-5 |
| Task 9 | KhaDungService + UC03 (tìm & xem sản phẩm) | — |
| Task 10 | UC04 giỏ + UC05 đặt đơn + UC06 thanh toán (API) | — |
| Task 11 | UC21 admin CRUD danh mục & sản phẩm (API) | — |
| Task 12 | Seed data + integration test + review | — |

### Chốt phạm vi triển khai tuần 2

Các quyết định dưới đây chỉ chia giai đoạn triển khai; không xóa hoặc thay đổi yêu cầu trong đặc tả/use case:

- **Trạng thái thiết bị:** bỏ `DangGiu` khỏi `TrangThaiSuDungThietBi`. Giữ chỗ được quản lý tại `GIU_CHO`; việc đã gán cho đơn tương lai là dữ liệu phân công ở giai đoạn sau.
- **Tìm kiếm:** UC03 có thêm bộ lọc sức chứa. Lọc theo đánh giá triển khai cùng UC08.
- **Hủy đơn:** tuần 2 chỉ hỗ trợ hủy đơn chưa thanh toán. Hủy sau thanh toán và hoàn tiền triển khai theo UC07 ở giai đoạn sau.
- **Thanh toán:** gateway mock chỉ phục vụ demo luồng thành công và idempotency; chưa coi là hoàn thành toàn bộ ngoại lệ của UC06.
- **Hoàn cọc:** không dùng `HoanCoc` trong mục đích thu của `CHI_TIET_THANH_TOAN`; hoàn cọc về sau đi qua `HOAN_TIEN`.
- **Chính sách:** seed một phiên bản đang có hiệu lực. Khi thay đổi, tạo phiên bản mới; không sửa nội dung phiên bản đã gắn với đơn.
- **Nhập kho:** Entity nhập kho (NhaCungCap, PhieuNhapHang, ChiTietPhieuNhap, ThietBi) đầy đủ cột theo ERD; tuần 2 chỉ chưa làm API nhập kho — dời sang Tuần 3.
- **Backend API:** Tuần 2 nghiệm thu backend API. React frontend nếu có sẽ bổ sung phân công riêng.

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
  - Kiểm tra dữ liệu đăng ký hợp lệ: email đúng format, số điện thoại hợp lệ, mật khẩu đáp ứng yêu cầu.
  - **Xác nhận mật khẩu** phải khớp.
  - Kiểm tra `Email`, `SoDienThoai` chưa tồn tại trong `TAI_KHOAN`.
  - `BCrypt.HashPassword(req.MatKhau)` (workfactor 12).
  - Transaction: tạo `TaiKhoan` (`VaiTro = "KhachHang"`, `TrangThai = "HoatDong"`) + `KhachHang` (1-1).
  - **Không** cho phép đăng ký `NhanVien` / `QuanTriVien` qua endpoint công khai.

- [ ] **1.5** `DangNhapAsync`:
  - Tìm theo `Email` (nếu có `@`) hoặc `SoDienThoai`.
  - **Kiểm tra trạng thái tài khoản:** nếu `TrangThai = "BiKhoa"` → từ chối ngay, không cho đăng nhập.
  - `TrangThai` chỉ dùng cho khóa tài khoản bởi quản trị viên; khóa tạm do đăng nhập sai được kiểm tra riêng trong cache.
  - `BCrypt.Verify(req.MatKhau, taiKhoan.MatKhauBam)`.
  - Sai → tăng số lần và thời điểm hết khóa tạm trong cache phía server; đạt ngưỡng `AppSettings:KhoaTaiKhoanSauSoLanSai` thì từ chối đăng nhập trong thời gian cấu hình.
  - Đúng → trả JWT token.

- [ ] **1.5a** Dùng memory cache cho bản demo một server để lưu trạng thái khóa tạm và token khôi phục mật khẩu. **Token khôi phục có hạn và chỉ dùng một lần**; khởi động lại server sẽ làm mất dữ liệu tạm. Không thêm cột vào ERD.

- [ ] **1.5b** **Kiểm tra trạng thái tài khoản khi tạo giao dịch:** Tại các endpoint tạo đơn, thêm giỏ… phải kiểm tra `TaiKhoan.TrangThai` ngay cả khi JWT còn hợp lệ. Tài khoản bị khóa không được tạo giao dịch mới.

- [ ] **1.5c** **Lấy mã khách từ tài khoản đăng nhập:** Từ claims JWT (`MaTaiKhoan`), truy vấn `KhachHang` để lấy `MaKhachHang`. Dùng `MaKhachHang` này cho mọi thao tác giỏ/đơn — **khách chỉ được thao tác giỏ và đơn của mình.**

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

- [ ] **2.5** Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất.

- [ ] **2.6** Commit: `feat: add DanhMucSanPham entity`

---

## Task 3: SAN_PHAM + HINH_ANH_SAN_PHAM (Cấp 1-2)

> **Phụ thuộc: Task 2** (SAN_PHAM cần FK MaDanhMuc → DANH_MUC_SAN_PHAM)

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

- [ ] **3.5** Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất.

- [ ] **3.6** Commit: `feat: add SanPham and HinhAnhSanPham entities`

---

## Task 4: KHUYEN_MAI + bảng nối (Cấp 0, 2)

> **Bảng nối `KhuyenMaiDanhMuc` cần Task 2 (DanhMuc), `KhuyenMaiSanPham` cần Task 3 (SanPham).**

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

KHUYEN_MAI_SAN_PHAM   (composite PK: MaKhuyenMai + MaSanPham)
KHUYEN_MAI_DANH_MUC   (composite PK: MaKhuyenMai + MaDanhMuc)
```

**Các bước:**

- [ ] **4.1** Enums: `LoaiGiam { PhanTram, SoTien }`, `PhamViApDung { TatCa, TheoSanPham, TheoDanhMuc }`, `TrangThaiKhuyenMai { HienThi, TamAn, HetHan }`.

- [ ] **4.2** Tạo `KhuyenMai.cs` đầy đủ 13 trường.

- [ ] **4.3** Tạo `KhuyenMaiSanPham` với composite PK `HasKey(x => new { x.MaKhuyenMai, x.MaSanPham })` và `KhuyenMaiDanhMuc` với composite PK `HasKey(x => new { x.MaKhuyenMai, x.MaDanhMuc })`.

- [ ] **4.4** Chuẩn bị model xong → báo Người 1 tích hợp migration.

- [ ] **4.5** Tạo `IKhuyenMaiService` + `KhuyenMaiService` (dùng chung Người 3–4–5, bàn giao Day 2):
  ```csharp
  Task<Result<KhuyenMaiHopLe>> KiemTraApDungAsync(string maGiamGia, long maKhachHang, IEnumerable<DongGio> dong, decimal tienThueTruocGiam);
  Task GiuLuotAsync(long maKhuyenMai, long maDonThue, DateTime thoiDiemHetHan, IDbContextTransaction tx);
  Task XacNhanDaSuDungAsync(long maDonThue);
  Task GiaiPhongLuotAsync(long maDonThue);
  ```
  - Kiểm tra đủ: trạng thái `HienThi` (loại `TamAn`/`HetHan`), thời hạn, phạm vi, mức tối thiểu, giới hạn tổng lượt, giới hạn mỗi khách. **Loại lượt `DangGiu` đã hết hạn khi đếm.**
  - Phân định gọi:
    - **Người 4 (giỏ):** gọi `KiemTraApDungAsync` để báo giá dự kiến, **KHÔNG giữ lượt**.
    - **Người 5 (tạo đơn):** gọi lại `KiemTraApDungAsync` trong transaction + `GiuLuotAsync` để ghi lượt.
    - Callback thanh toán thành công: gọi `XacNhanDaSuDungAsync`. Hủy đơn/hết hạn: gọi `GiaiPhongLuotAsync`.

- [ ] **4.6** Test đơn vị đầy đủ nhánh: hợp lệ, `TamAn`, hết hạn, không đủ tối thiểu, vượt tổng lượt, vượt lượt/khách, lượt `DangGiu` hết hạn không tính.

- [ ] **4.7** Commit: `feat: add KhuyenMai entity, service and validation logic`

---

## Task 5: Nhập kho & Thiết bị (Cấp 0-4, skeleton + seed)

**Lý do cần ở Tuần 2:** `THIET_BI.ma_chi_tiet_phieu_nhap` là NOT NULL FK → không có phiếu nhập không có thiết bị. `KhaDungService` (UC03) cần đếm `THIET_BI` để tính khả dụng.

**Chiến lược:** Tạo entities skeleton đầy đủ cột theo ERD (KHÔNG có API/UI cho nhập kho — dời sang Tuần 3). Chỉ seed dữ liệu mẫu.

> **Phụ thuộc: Task 3** (ChiTietPhieuNhap cần FK MaSanPham → SAN_PHAM)

**Các bước:**

- [ ] **5.1** Tạo `NhaCungCap.cs` (Cấp 0) — 10 trường: `MaNhaCungCap`, `MaNhaCungCapHienThi` (unique), `TenNhaCungCap`, `NguoiLienHe`, `SoDienThoai`, `Email`, `DiaChi`, `MaSoThue`, `GhiChu`, `TrangThaiHopTac`.

- [ ] **5.2** Tạo `PhieuNhapHang.cs` (Cấp 2) — FK: `MaNhaCungCap`, `MaNguoiLap` (NhanVien), `MaNguoiXacNhan` (NhanVien, nullable). Đủ **17 trường** theo ERD: `MaPhieuNhap`, `MaNhaCungCap`, `MaNguoiLap`, `MaNguoiXacNhan`, `MaPhieuHienThi` (unique), `SoChungTuNhaCungCap`, `NgayLap`, `NgayNhapDuKien`, `NgayNhapThucTe`, `NgayXacNhan`, `TongTien`, `ThongTinNhaCungCapLucNhap` (json), `TenNguoiLapLucNhap`, `TenNguoiXacNhanLucNhap`, `TrangThai`, `LyDoHuy`, `GhiChu`.

- [ ] **5.3** Tạo `ChiTietPhieuNhap.cs` (Cấp 3) — FK: `MaPhieuNhap`, `MaSanPham`. Đủ **8 trường**: `MaChiTietPhieuNhap`, `MaPhieuNhap`, `MaSanPham`, `TenSanPhamLucNhap`, `SoLuong`, `DonGiaNhap`, `TinhTrangKhiNhap`, `GhiChu`.

- [ ] **5.4** Tạo `ThietBi.cs` (Cấp 4) — FK: `MaChiTietPhieuNhap`. Đủ **9 trường** theo ERD: `MaThietBi`, `MaChiTietPhieuNhap`, `MaThietBiHienThi` (unique), `NgayNhap`, `GiaNhap`, `TinhTrang`, `PhuKienDiKem` (json), `TrangThaiSuDung`, `GhiChu`.

- [ ] **5.5** Enum `TrangThaiSuDungThietBi`: `SanSang`, `DangThue`, `DangBaoTri`, `ThatLac`, `NgungSuDung`. Giữ chỗ không phải trạng thái thiết bị, mà thuộc `GIU_CHO`.

- [ ] **5.6** Fluent API unique: `NhaCungCap.ma_nha_cung_cap_hien_thi`, `PhieuNhapHang.ma_phieu_hien_thi`, `ThietBi.ma_thiet_bi_hien_thi`.

- [ ] **5.7** Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất.

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

- [ ] **6.4** Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất.

- [ ] **6.5** Commit: `feat: add GioThue and ChiTietGioThue entities`

---

## Task 7: Đơn thuê hoàn chỉnh (Cấp 2-5)

> **Phụ thuộc: Task 3 (SanPham) và Task 4 (KhuyenMai)**. Không cần chờ entity Task 6.

**6 bảng (thêm LICH_SU_TRANG_THAI_DON):**
- `CHINH_SACH` (Cấp 2)
- `DON_THUE` (Cấp 3)
- `CHI_TIET_DON_THUE` (Cấp 4)
- `GIU_CHO` (Cấp 5, 1-1 CHI_TIET_DON_THUE)
- `LUOT_SU_DUNG_KHUYEN_MAI` (Cấp 4, 1-1 DON_THUE)
- `LICH_SU_TRANG_THAI_DON` (ghi lịch sử chuyển trạng thái)

**Các bước:**

- [ ] **7.1** Enum `TrangThaiDonThue`: `ChoThanhToan`, `DaXacNhan`, `DangChuanBi`, `SanSangNhan`, `DangThue`, `DaNhanTra`, `ChoDoiSoat`, `HoanTat`, `HetHan`, `KhachHuy`, `CuaHangHuy`.

- [ ] **7.2** Tạo `ChinhSach.cs` (versioned policy):
  - `MaChinhSach`, `MaNguoiTao` (FK NhanVien), `TenChinhSach`, `PhienBan` (int, unique), `ThoiDiemApDung`, `NoiDungChinhSach` (json), `NgayTao`.

- [ ] **7.3** Tạo `DonThue.cs` đầy đủ **22 trường** theo ERD:
  - FK: `MaKhachHang`, `MaChinhSach`, `MaNguoiHuy?` (FK **TaiKhoan**, không phải NhanVien).
  - `MaDonHienThi` unique.
  - Thời gian: `NgayDat`, **`GioNhanDuKien`**, **`GioTraDuKien`**, `HanThanhToan`, `ThoiDiemHuy`, `ThoiDiemHoanTat`.
  - Người nhận: `TenNguoiNhan`, `SoDienThoaiNguoiNhan`, `EmailLienHe`.
  - Tiền: `TongTienThueTruocGiam`, `TongTienGiam`, `TongTienCoc`, `TienThueGiuLaiKhiHuy`.
  - Snapshot: `KhuyenMaiLucDat (json)`.
  - Other: `TrangThai`, `LyDoHuy`, `GhiChu`.

- [ ] **7.4** Tạo `ChiTietDonThue.cs` với snapshot đầy đủ:
  - FK: `MaDonThue`, `MaSanPham`.
  - Snapshot: `TenSanPhamLucDat`, `DonGiaThueMoiNgay`, `MucCocMoiThietBi`, `GiaTriBoiThuongMoiThietBi`, `PhuKienVaMucBoiThuongLucDat (json)`.
  - `SoNgayTinhTien`, `SoLuong`, `TienGiam`.

- [ ] **7.5** Tạo `GiuCho.cs` (1-1 với ChiTietDonThue):
  - `MaChiTietDon` **unique** (FK 1-1).
  - `ThoiDiemTao`, **`ThoiDiemHetHan`**, `ThoiDiemGiaiPhong`, `TrangThai`.

- [ ] **7.6** Enum `TrangThaiGiuCho`: `DangGiu`, `DaXacNhan`, `DaGiaiPhong`, `HetHan`.

- [ ] **7.7** Tạo `LuotSuDungKhuyenMai.cs` (1-1 với DonThue):
  - `MaDonThue` **unique** (FK 1-1).
  - **`MaKhuyenMai`** (FK NOT NULL về KHUYEN_MAI).
  - `ThoiDiemGiuLuot`, **`ThoiDiemHetHan`**, `ThoiDiemSuDung`, `ThoiDiemGiaiPhong`, `SoTienGiam`, `TrangThai`.

- [ ] **7.8** Tạo `LichSuTrangThaiDon.cs` theo ERD:
  - `MaLichSuDon`, `MaDonThue` (FK), `MaNguoiThucHien` (FK TaiKhoan, nullable), `TrangThaiTruoc`, `TrangThaiSau`, `ThoiDiem`, `LyDo`.

- [ ] **7.9** Fluent API:
  - `DonThue.MaDonHienThi` unique.
  - `DonThue.MaKhachHang` cascade Restrict.
  - `GiuCho.MaChiTietDon` unique + cascade Delete.
  - `LuotSuDungKhuyenMai.MaDonThue` unique.
  - `ChinhSach.PhienBan` unique.

- [ ] **7.10** Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất.

- [ ] **7.11** Commit: `feat: add ChinhSach, DonThue, ChiTietDonThue, GiuCho, LuotSuDungKhuyenMai, LichSuTrangThaiDon`

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

- [ ] **8.1** Enum `MucDichThanhToan`: `TienThue`, `TienCoc`, `ThuBoSung`. Hoàn cọc triển khai sau bằng `HOAN_TIEN`, không phải khoản thu.

- [ ] **8.2** Enum `TrangThaiThanhToan`: `DangXuLy`, `ThanhCong`, `ThatBai`, `Huy`.

- [ ] **8.3** Tạo `ThanhToan.cs` (13 trường).

- [ ] **8.4** Tạo `ChiTietThanhToan.cs`.

- [ ] **8.5** Fluent API: `ThanhToan.MaYeuCau` unique (idempotency), index `ThanhToan.MaGiaoDichCong`.

- [ ] **8.6** Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất.

- [ ] **8.7** Commit: `feat: add ThanhToan and ChiTietThanhToan entities`

---

## Task 9: KhaDungService + UC03

**Files:**
- Tạo: `Services/Interfaces/IKhaDungService.cs`, `Services/KhaDungService.cs`
- Tạo: `Services/Interfaces/IDanhMucService.cs`, `Services/DanhMucService.cs`
- Tạo: `Services/Interfaces/ISanPhamService.cs`, `Services/SanPhamService.cs`
- Tạo: `Controllers/DanhMucController.cs`, `SanPhamController.cs`
- Tạo: DTOs trong `Models/DTOs/DanhMuc/`, `SanPham/`

> **Phụ thuộc: Task 5 (ThietBi) và Task 7 (DonThue, GiuCho).**

**Các bước:**

- [ ] **9.1** `IKhaDungService`:
  ```csharp
  Task<int> LayKhaDungAsync(long maSanPham, DateTime gioNhan, DateTime gioTra);
  Task<Dictionary<long, int>> LayKhaDungNhieuAsync(IEnumerable<long> maSanPhams, DateTime gioNhan, DateTime gioTra);
  ```

- [ ] **9.2** Công thức khả dụng (mục 8.1 đặc tả):
  - **Chưa chọn ngày:** chỉ hiện giá tham khảo, **không khẳng định còn hàng**.
  - **Kiểm tra đầu vào:** giờ trả phải sau giờ nhận; không tạo lượt thuê bắt đầu trong quá khứ.
  - Đếm tổng `THIET_BI` **đủ điều kiện** của sản phẩm: `TrangThaiSuDung` thuộc {SanSang, DangThue} + join qua `CHI_TIET_PHIEU_NHAP` từ **phiếu nhập đã xác nhận** (`TrangThai = DaNhapKho`). Thiết bị DangBaoTri, ThatLac, NgungSuDung không tính.
  - **Giữ chỗ tạm chiếm lịch khi ĐỒNG THỜI:**
    - Đơn đang `ChoThanhToan`
    - `GiuCho.TrangThai = DangGiu`
    - `ThoiDiemHetHan > Now`
  - **Đơn đã xác nhận (`DaXacNhan`, `DangChuanBi`, `SanSangNhan`, `DangThue`, ...) tính riêng và chỉ tính một lần** — không còn phụ thuộc hạn 15 phút của giữ chỗ.
  - **Giữ chỗ hết hạn không chiếm lịch** dù job chưa chạy (điều kiện `ThoiDiemHetHan > Now` loại chúng ra).
  - **Không tính trùng:** mỗi lượt đặt chỉ tính một lần; hai bản ghi cùng thuộc một `ChiTietDonThue` chỉ tính một lần.
  - Công thức: **`Khả dụng = Tổng thiết bị đủ điều kiện − Số lượng bị chiếm đồng thời lớn nhất trên khoảng [GioNhan, GioTra]`** — không cộng dồn các đơn không giao nhau về thời gian.
  - Lịch giao nhau: `gioNhanDon < gioTra` AND `gioTraDon > gioNhan`.
  - Ví dụ: có 5 lều, đơn A thuê 3 cái ngày 20, đơn B thuê 3 cái ngày 21 và hai đơn không trùng nhau; khách thuê xuyên hai ngày vẫn còn 2 cái, không phải `5 - 3 - 3`.

- [ ] **9.3** `ISanPhamService.TimKiemAsync(TimKiemSanPhamRequest)`:
  - Filter: `TuKhoa`, `MaDanhMuc`, `ThuongHieu`, `SucChua`, `GiaMin`, `GiaMax`, `GioNhan`, `GioTra`.
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

- [ ] **10.2** Logic giỏ:
  - **Thêm sản phẩm đã có trong giỏ → cộng dồn số lượng**, không tạo dòng mới.
  - **Số lượng phải là số nguyên dương** (> 0).
  - **Đổi ngày/số lượng → tính lại báo giá và kiểm tra khả dụng**.
  - **Giỏ không giữ hàng** (khách biết khả dụng lúc xem không phải cam kết).

- [ ] **10.3** Tính báo giá (mục 8.2 đặc tả) — **logic dùng chung giữa giỏ và tạo đơn**:
  - `SoNgay = Math.Ceiling((GioTra - GioNhan).TotalHours / 24.0)`, tối thiểu 1.
  - `TienThue = SUM(don_gia_thue_moi_ngay * so_luong * so_ngay)`.
  - `TienCoc = SUM(muc_coc_moi_thiet_bi * so_luong)`.
  - Áp `KhuyenMai`: kiểm tra `pham_vi_ap_dung`, `tien_thue_toi_thieu`, `muc_giam_toi_da`.
  - **Chỉ giảm tiền thuê**; không giảm cọc, không vượt tiền thuê phần hàng đủ điều kiện.
  - **Phân bổ giảm giá xuống từng dòng**, làm tròn thống nhất (đồng VNĐ).
  - Có cơ chế **lưu/đối chiếu báo giá khách đã xem** (hash hoặc version) để phát hiện giá thay đổi khi tạo đơn.

- [ ] **10.4** Kiểm tra mã khuyến mãi (gọi `IKhuyenMaiService.KiemTraApDungAsync` do Người 3 viết):
  - **Trạng thái:** chỉ chấp nhận `HienThi`; `TamAn` → từ chối; `HetHan` → từ chối.
  - Thời hạn: `BatDau <= Now <= KetThuc`.
  - Phạm vi: sản phẩm/danh mục phù hợp.
  - Mức tối thiểu: `TienThueTruocGiam >= TienThueToiThieu`.
  - **Giới hạn tổng lượt**: đếm `LUOT_SU_DUNG_KHUYEN_MAI` có `TrangThai` ∈ {DangGiu **còn hạn** (`ThoiDiemHetHan > Now`), DaSuDung} < `GioiHanTongLuot`.
  - **Giới hạn mỗi khách**: đếm lượt của khách có `TrangThai` ∈ {DangGiu **còn hạn**, DaSuDung} < `GioiHanMoiKhach`.
  - **Lượt `DangGiu` đã hết hạn không tiếp tục chiếm lượt** dù job chưa chạy — loại chúng khi đếm.
  - Giỏ chỉ gọi để **báo giá dự kiến, KHÔNG giữ lượt**; tạo đơn mới gọi `GiuLuotAsync` trong transaction.

- [ ] **10.5** `GioThueController` (`[Authorize]`, `[Route("api/gio-thue")]`):
  - `GET /api/gio-thue`
  - `POST /api/gio-thue/them`
  - `PUT /api/gio-thue/{maChiTiet}/so-luong`
  - `DELETE /api/gio-thue/{maChiTiet}`
  - `PUT /api/gio-thue/thoi-gian`
  - `POST /api/gio-thue/ma-giam-gia`

### UC05 — Đặt đơn + giữ chỗ

- [ ] **10.6** `IDonThueService.TaoDonAsync` trong `IsolationLevel.Serializable`:
  1. Load giỏ, kiểm tra không rỗng.
  2. **Kiểm tra `TrangThaiKinhDoanh` từng sản phẩm** — phải là `DangKinhDoanh`; nếu Admin đã chuyển `TamNgung`/`NgungKinhDoanh` sau lúc khách thêm giỏ → throw `TrangThaiKhongHopLeException` với danh sách sản phẩm sai.
  3. Kiểm tra khả dụng mỗi dòng → nếu thiếu → throw `KhongDuHangException`.
  4. Nếu báo giá thay đổi từ khi khách xem giỏ → throw `BaogiaThayDoiException`.
  5. **Nếu giỏ có mã khuyến mãi** → gọi lại `IKhuyenMaiService.KiemTraApDungAsync` (mã có thể chuyển `TamAn`/hết hạn/vượt lượt giữa lúc áp mã trong giỏ và lúc tạo đơn). Đơn không dùng mã vẫn tạo bình thường, bỏ qua bước này.
  6. Load `CHINH_SACH` **đang có hiệu lực** (`ThoiDiemApDung <= Now`, lấy phiên bản mới nhất thỏa điều kiện); không đơn thuần lấy phiên bản cao nhất.
  7. **Gán hạn thanh toán thống nhất:**
     ```
     var thoiDiemTaoDon = DateTime.UtcNow;
     var hanThanhToan = thoiDiemTaoDon.AddMinutes(15);
     DonThue.HanThanhToan = hanThanhToan;
     GiuCho.ThoiDiemHetHan = hanThanhToan;
     LuotSuDungKhuyenMai.ThoiDiemHetHan = hanThanhToan;
     ```
     — cùng một mốc thời gian cho cả 3 trường để đồng nhất.
  8. Tạo `DonThue` (`ChoThanhToan`), sinh `MaDonHienThi` unique. Lưu `GioNhanDuKien`, `GioTraDuKien`, `HanThanhToan`.
  9. Snapshot vào `ChiTietDonThue`: giá + phụ kiện + bồi thường tại thời điểm đặt.
  10. Với mỗi `ChiTietDonThue`: tạo `GiuCho` (`DangGiu`, `ThoiDiemHetHan = hanThanhToan`).
  11. Nếu có khuyến mãi: gọi `IKhuyenMaiService.GiuLuotAsync` — tạo `LuotSuDungKhuyenMai` (`DangGiu`, `ThoiDiemHetHan = hanThanhToan`). **Không tạo thêm một lượt mới nếu đơn chỉ là chuyển sang DaSuDung.**
  12. Xóa giỏ.
  - **Toàn bộ các bước trên trong cùng transaction.** Thất bại → **rollback toàn bộ** và **giữ nguyên giỏ**.
  - **Hai yêu cầu đồng thời** không tạo hai đơn từ cùng dữ liệu giỏ (Serializable + kiểm tra giỏ rỗng).
  - **Ghi lịch sử chuyển trạng thái** vào `LICH_SU_TRANG_THAI_DON`.

> **Quy ước hết hạn (áp dụng cho `DonThue.HanThanhToan`, `GiuCho.ThoiDiemHetHan`, `LuotSuDungKhuyenMai.ThoiDiemHetHan`):**
> - **Còn hạn khi `Now < hạn`**.
> - **Hết hạn khi `Now >= hạn`**.
> - Query đếm lượt đang chiếm: dùng `ThoiDiemHetHan > Now`.
> - Job hết hạn: điều kiện `hạn <= Now`.

- [ ] **10.7** Hủy đơn chưa thanh toán — **cùng transaction, cập nhật có điều kiện**:
  - UPDATE `DonThue` với `WHERE MaDonThue = @id AND TrangThai = 'ChoThanhToan'` → chuyển `KhachHuy`/`CuaHangHuy`. Nếu 0 rows → đơn đã chuyển trạng thái khác (đã xác nhận / hết hạn) → throw `TrangThaiKhongHopLeException`, rollback.
  - Ghi **người hủy** (MaNguoiHuy = MaTaiKhoan), **thời điểm** (ThoiDiemHuy), **lý do** (LyDoHuy).
  - Giải phóng `GiuCho`: UPDATE `WHERE MaChiTietDon IN (...) AND TrangThai = 'DangGiu'` → `DaGiaiPhong`.
  - Giải phóng lượt mã: gọi `IKhuyenMaiService.GiaiPhongLuotAsync` — UPDATE `LuotSuDungKhuyenMai` `WHERE MaDonThue = @id AND TrangThai = 'DangGiu'` → `DaGiaiPhong` (trả lại lượt).
  - Ghi lịch sử chuyển trạng thái.
  - Toàn bộ trong **cùng transaction**; thất bại bất kỳ bước nào → rollback.

- [ ] **10.8** `IHostedService` chạy 1 phút — **job hết hạn, cập nhật có điều kiện trong transaction**:
  - Với mỗi đơn `ChoThanhToan` có `HanThanhToan <= Now`, mở transaction:
    - UPDATE `DonThue` `WHERE MaDonThue = @id AND TrangThai = 'ChoThanhToan'` → `HetHan`. Nếu 0 rows → đơn đã đổi trạng thái (thanh toán vừa vào, hoặc khách vừa hủy) → bỏ qua, commit (không ghi đè).
    - Giải phóng `GiuCho` (`ThoiDiemHetHan <= Now` AND `TrangThai = 'DangGiu'`) → `HetHan`.
    - Giải phóng `LuotSuDungKhuyenMai` (`ThoiDiemHetHan <= Now` AND `TrangThai = 'DangGiu'`) → `HetHan`.
    - Ghi lịch sử chuyển trạng thái.
    - Commit.
  - **Không ghi đè trạng thái nhau:** UPDATE có điều kiện `WHERE TrangThai = ...` là cơ chế đảm bảo, không dựa vào SELECT-then-UPDATE.
  - Chú ý: khi callback thanh toán chạy song song, một bên sẽ thắng cuộc đua UPDATE; bên còn lại thấy 0 rows và không cập nhật.

- [ ] **10.9** `DonThueController` (`[Authorize]`, `[Route("api/don-thue")]`):
  - `GET /api/don-thue/xac-nhan` — preview.
  - `POST /api/don-thue` — tạo đơn.
  - `GET /api/don-thue/{id}` — chi tiết.
  - `GET /api/don-thue` — danh sách đơn của khách.
  - `POST /api/don-thue/{id}/huy` — tuần 2 chỉ hủy đơn chưa thanh toán; hủy sau thanh toán và hoàn tiền để UC07.

### UC06 — Thanh toán

> Gateway mock chỉ phục vụ demo luồng thanh toán thành công và kiểm tra idempotency trong tuần 2; các ngoại lệ thanh toán của UC06 vẫn thuộc phạm vi triển khai sau.

- [ ] **10.10** Mock gateway `TaoUrlAsync(maDonThue, returnUrl)`:
  - Tạo giao dịch `ThanhToan` với `TrangThai = DangXuLy`.
  - Sinh `MaYeuCau = Guid.NewGuid().ToString("N")`.
  - Trả URL: `{returnUrl}?donId={id}&maYeuCau={maYeuCau}&ketQua=success&maGD={fakeId}`.

- [ ] **10.11** `XuLyKetQuaAsync(callback)` — **thứ tự bước quan trọng để idempotency đúng**:
  1. **Tìm giao dịch theo `MaYeuCau`** — không thấy → 404.
  2. **Idempotency ưu tiên trước:** nếu giao dịch đã `ThanhCong` → **trả kết quả cũ ngay lập tức**, không thu thêm, **không yêu cầu đơn phải còn `ChoThanhToan`** (lần đầu callback đã chuyển đơn sang `DaXacNhan`).
  3. Nếu giao dịch đã `ThatBai`/`Huy` → trả lỗi cuối.
  4. Chỉ khi giao dịch còn `DangXuLy` mới đi tiếp:
     - **Kiểm tra số tiền:** `TongSoTien = TongTienThueTruocGiam - TongTienGiam + TongTienCoc`.
     - **Cập nhật nguyên tử trong 1 transaction (dùng UPDATE có điều kiện):**
       - UPDATE `DonThue` `WHERE MaDonThue = @id AND TrangThai = 'ChoThanhToan' AND HanThanhToan > @now` → `DaXacNhan`.
       - UPDATE `ThanhToan` `WHERE MaThanhToan = @id AND TrangThai = 'DangXuLy'` → `ThanhCong` + tạo 2 `CHI_TIET_THANH_TOAN` (`TienThue` + `TienCoc`).
       - UPDATE `GiuCho` → `DaXacNhan`.
       - Gọi `IKhuyenMaiService.XacNhanDaSuDungAsync` → `LuotSuDungKhuyenMai` → `DaSuDung` (chuyển trạng thái từ DangGiu, **không tạo lượt mới**).
       - Ghi lịch sử chuyển trạng thái.
       - Commit.
  - **Nếu UPDATE đơn trả về 0 rows** (đơn đã sang `HetHan`/`KhachHuy` hoặc `DaXacNhan`) — **KHÔNG tự ghi đè `ThatBai`**:
    - Rollback transaction hiện tại.
    - **Đọc lại đơn và giao dịch** trong transaction mới:
      - Nếu giao dịch đã `ThanhCong` (do callback trước vừa chạy xong) → trả kết quả cũ, kết thúc.
      - Nếu đơn `DaXacNhan` mà giao dịch này vẫn `DangXuLy` (bất thường — giao dịch khác đã confirm đơn trước) → **kiểm tra xem gateway có thực sự thu tiền không**: nếu gateway đã thu → cập nhật giao dịch `TrangThaiDoiChieu = 'CanDoiSoat'`, chuyển `ThanhCong` (tiền thật sự đã thu) và tạo yêu cầu hoàn tiền thu trùng để xử lý (UC07 tuần sau), **không tự đánh `ThatBai`**; nếu gateway chưa thu → cập nhật `ThatBai` với ghi chú "đơn đã được giao dịch khác xác nhận", log.
      - Nếu đơn `HetHan`/`KhachHuy`/`CuaHangHuy` mà tiền đã thu ở gateway → **KHÔNG mặc định là `ThatBai`**: cập nhật giao dịch `TrangThaiDoiChieu = 'CanDoiSoat'`, giữ nguyên `TrangThai` (hoặc chuyển `ThanhCong` nếu gateway xác nhận thu tiền) và **tạo yêu cầu hoàn tiền** để đối soát/hoàn về cho khách (UC07 tuần sau). Không coi đây là thu thất bại.
      - Ghi log chi tiết để nghiệp vụ đối soát thủ công.

- [ ] **10.12** `ThanhToanController` (`[Route("api/thanh-toan")]`):
  - `POST /api/thanh-toan/{maDon}/tao-url` `[Authorize]`.
  - `GET /api/thanh-toan/ket-qua` — callback từ gateway.

- [ ] **10.13** Commit: `feat: UC04-UC06 - cart, order creation, payment API`

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
  - `GET` — list + filter (bao gồm cả `TamNgung`/`NgungKinhDoanh`, khác với API khách).
  - `POST` — tạo mới (unique `MaSanPhamHienThi`).
  - `PUT /{id}` — cập nhật (giá cũ đã snapshot trong `CHI_TIET_DON_THUE`).
  - `PATCH /{id}/trang-thai` — đổi kinh doanh.
  - `POST /{id}/hinh-anh` — upload (`.jpg/.jpeg/.png/.webp`, ≤ 5MB, kiểm tra magic bytes).
  - `DELETE /hinh-anh/{maHinhAnh}` — xóa 1 ảnh.
  - **KHÔNG có endpoint tăng/giảm số lượng thiết bị trực tiếp** — qua phiếu nhập (Tuần 3).

- [ ] **11.4** Validation trong `AdminSanPhamService` (Người 4 viết, tách khỏi `SanPhamService` của Người 2):
  - **`GiaThueMoiNgay >= 0`**, **`MucCocMoiThietBi >= 0`**, **`GiaTriBoiThuong >= 0`** — nhập âm → HTTP 400.
  - `SucChua >= 0`, `MaSanPhamHienThi` không trùng.

- [ ] **11.5** Commit: `feat: UC21 - admin category and product CRUD API`

---

## Task 12: Seed data + integration test + review

**Các bước:**

- [ ] **12.1** `SeedData.EnsureSeededAsync`:
  - **Nhất quán và chạy lại không sinh trùng** (kiểm tra tồn tại trước khi seed, dùng unique key).
  - 1 tài khoản `QuanTriVien` (email `admin@geargo.local`, BCrypt hash sẵn).
  - 1 `NhanVien` — cần cho `PhieuNhapHang.ma_nguoi_lap`.
  - 1 `KhachHang` test.
  - 3 danh mục: "Lều trại", "Bàn ghế", "Phụ kiện".
  - 5 sản phẩm, ảnh placeholder.
  - 1 `NhaCungCap`.
  - 1 `PhieuNhapHang` (TrangThai = `DaNhapKho`) + 5 `ChiTietPhieuNhap` → 10 `ThietBi` (`SanSang`).
  - 1 `ChinhSach` phiên bản 1 (đang có hiệu lực: `ThoiDiemApDung <= Now`).
  - 1 `KhuyenMai` mã `TEST10` giảm 10%, `TatCa`, tối thiểu 500.000₫, hạn +30 ngày.

- [ ] **12.2** Gọi `SeedData.EnsureSeededAsync` khi app khởi động ở Development.

- [ ] **12.3** Integration test `DatDonFlowTests` (happy path **9 bước**):
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

- [ ] **12.5** Hết hạn test: điều khiển thời gian kiểm thử hoặc gọi trực tiếp bước xử lý hết hạn, rồi kiểm tra `HetHan`, `GiuCho` giải phóng; không dùng việc chờ 2 giây để giả định job chạy mỗi phút đã cập nhật trạng thái.

- [ ] **12.6** Bổ sung test:
  - **Giá thay đổi:** đổi giá sản phẩm giữa lúc xem giỏ và tạo đơn → `BaogiaThayDoiException`.
  - **Hết lượt mã:** nhiều khách dùng cùng mã, vượt `gioi_han_tong_luot` → từ chối.
  - **Hủy giải phóng giữ chỗ:** hủy đơn → GiuCho và LuotSuDungKhuyenMai được giải phóng, khả dụng tăng lại.
  - **Callback lặp (gửi trùng):** không ghi nhận thu hai lần.
  - **Xử lý đồng thời:** thanh toán + job hết hạn chạy cùng lúc → không ghi đè trạng thái nhau.
  - Thanh toán xong không làm khả dụng tăng trở lại.
  - Hai đơn cũ không trùng nhau không bị cộng dồn sai.
  - Khách không được xem hoặc sửa đơn, giỏ của người khác.

- [ ] **12.7** Security check:
  - Không raw SQL nhận user input.
  - `[Authorize]` mọi endpoint cần đăng nhập.
  - Upload: `.jpg/.jpeg/.png/.webp`, ≤ 5MB, kiểm tra magic bytes.
  - JWT secret không hardcode, `appsettings.Development.json` trong `.gitignore`.

- [ ] **12.8** Commit: `feat: week-2 complete - seed data, integration tests, security review`

---

## Checklist nghiệm thu tuần 2

- [ ] `dotnet build` — 0 errors.
- [ ] `dotnet ef migrations list` — đủ migrations cho Task 0-8.
- [ ] Đăng ký + đăng nhập trả JWT hợp lệ.
- [ ] Sai mật khẩu 5 lần → khóa tạm 15 phút trong cache; `TAI_KHOAN.trang_thai` vẫn dành cho khóa bởi quản trị viên.
- [ ] Tài khoản bị khóa không tạo được giao dịch mới, kể cả JWT còn hợp lệ.
- [ ] `GET /api/san-pham` với `?gioNhan=&gioTra=` trả số khả dụng đúng; không chọn ngày chỉ hiện giá tham khảo.
- [ ] Thêm giỏ, đổi số lượng, đổi thời gian → báo giá cập nhật đúng.
- [ ] Thêm sản phẩm đã có trong giỏ → cộng dồn số lượng.
- [ ] Áp mã `TEST10` → giảm 10% khi tiền thuê ≥ 500.000₫.
- [ ] Tạo đơn → `ChoThanhToan`, có `GiuCho` cho mọi `ChiTietDonThue`, hạn 15 phút.
- [ ] Đơn hết hạn → tự `HetHan`, `GiuCho` giải phóng.
- [ ] Hủy đơn chưa thanh toán → ghi người hủy, lý do; giải phóng giữ chỗ và lượt mã.
- [ ] Thanh toán mock → `DaXacNhan`, 2 `ChiTietThanhToan`.
- [ ] Callback trùng `MaYeuCau` → không ghi trùng.
- [ ] Thanh toán xong không làm khả dụng tăng trở lại.
- [ ] Hai đơn cũ không trùng nhau không bị cộng dồn sai khi tính khả dụng.
- [ ] Khách không được xem hoặc sửa đơn, giỏ của người khác.
- [ ] `/api/admin/*` chỉ nhận `QuanTriVien`, token `KhachHang` → 403.
- [ ] Integration test happy path **9 bước** pass.
- [ ] Mỗi chuyển trạng thái đơn có bản ghi trong `LICH_SU_TRANG_THAI_DON`.

---

## Mốc bàn giao service dùng chung

| Mốc | Ai | Nội dung |
|---|---|---|
| **Cuối Day 1** | Người 1 | Bàn giao `Result<T>`, cây exception nghiệp vụ, `ExceptionHandlingMiddleware`, cấu trúc lỗi JSON. |
| **Cuối Day 1** | Người 2, 3, 4, 5 | Chốt interface + DTO (`IKhuyenMaiService`, `IBaoGiaService`, `IKhaDungService`, `IDonThueService`, DTO báo giá truyền từ giỏ sang tạo đơn). Contract-first, chưa cần implement. |
| **Cuối Day 2** | **Người 5** | **Bàn giao model + Fluent API cho `LuotSuDungKhuyenMai` và `DonThue`** (thuộc Task 7) — chỉ phần entity cần cho `IKhuyenMaiService`, chưa cần service tạo đơn. Người 1 tích hợp migration ngay. |
| **Cuối Day 2** | Người 3 | `IKhuyenMaiService` có implement (đọc/ghi lượt trên `LuotSuDungKhuyenMai` đã có entity) để Người 4 (báo giá) và Người 5 (tạo đơn) tích hợp. |
| **Cuối Day 2** | Người 4 | `IBaoGiaService` có implement để Người 5 gọi khi tạo đơn. |
| **Cuối Day 3** | Người 2, 5 | `IKhaDungService` (Người 2, phụ thuộc `GiuCho`) + service tạo đơn tối thiểu (Người 5) — để bắt đầu tích hợp luồng đặt đơn. |
| **Cuối Day 4** | Người 5 | Luồng đặt đơn → thanh toán chạy được end-to-end (happy path 9 bước). |
| **Day 5** | Cả nhóm | Sửa lỗi tích hợp, nghiệm thu 9 bước, race condition test. |

> **Phá vòng phụ thuộc:** `IKhuyenMaiService` (Người 3, Day 2) cần `LuotSuDungKhuyenMai` và `DonThue` (Task 7, Người 5). Giải quyết: **Người 5 bàn giao model + Fluent API của 2 entity này cuối Day 2** (chỉ phần cần cho service khuyến mãi ghi lượt), phần logic tạo đơn của Task 7 vẫn hoàn thiện tiếp đến Day 3. Nếu Người 5 không kịp Day 2, phải lùi mốc `IKhuyenMaiService` implement sang Day 3.

> ⚠ **Người 5 với 3.5 ngày là khá căng** do phải chờ 4 người khác bàn giao. Người 1 hoặc Người 4 nên hỗ trợ Người 5 phần viết controller + DTO đơn thuê từ Day 3 để giảm tải.

---

## Ghi chú kỹ thuật

| Điểm | Lưu ý |
|---|---|
| Naming | C# PascalCase, EF Core map snake_case qua `[Column(...)]` từng field |
| PK bigint | Dùng `long` trong C#, KHÔNG dùng `int` |
| Số tiền | `decimal(18,2)` — dùng `decimal` C#, KHÔNG dùng `double/float` |
| JSON columns | Lưu string, dùng `JsonSerializer` khi read/write |
| Enum | Lưu dạng chuỗi (string), không lưu số |
| Snapshot | `CHI_TIET_DON_THUE` copy giá + phụ kiện tại thời điểm đặt — không JOIN back |
| Idempotency | Unique `THANH_TOAN.ma_yeu_cau` |
| Transaction | `TaoDonAsync` bọc `IsolationLevel.Serializable` |
| Migrations | EF Core tạo `Migrations/` ở root project |
| Không xóa data lịch sử | Đơn hoàn tất, thanh toán thành công — chỉ đổi trạng thái |
| Nhập kho tuần 2 | Entity đầy đủ cột ERD + seed, KHÔNG API/UI — Tuần 3 |
| Xác thực | JWT Bearer, React gửi `Authorization: Bearer <token>` |
| Database | SQL Server 2022 Docker `geargo-sqlserver` port 1433 |
| Giờ | Lưu/truyền UTC, hiển thị giờ Việt Nam (UTC+7) |
| Chính sách | Chọn bản đang có hiệu lực, không đơn thuần lấy phiên bản mới nhất |

---

## Roadmap sau Tuần 2

**Tuần 3:** UC02 (hồ sơ/theo dõi đơn), UC17 (nhà cung cấp), UC18–UC20 (nhập hàng), UC10 (chuẩn bị/phân công), UC11 (bàn giao). Bổ sung API nhập kho cho entity đã tạo.
**Tuần 4:** UC12 (nhận trả/kiểm tra), UC13 (quá hạn), UC14–UC15 (phụ phí/đối soát), UC07 (hủy sau thanh toán/hoàn tiền). Các ngoại lệ UC06 còn lại.
**Tuần 5:** UC16 (bảo trì/vòng đời thiết bị), UC22 (điều chỉnh kho), UC23 (quản lý tài khoản/nhân viên), UC08 (đánh giá), UC09 (tư vấn AI), thông báo.
**Tuần 6:** UC24 (khuyến mãi đầy đủ), UC25–UC26 (báo cáo, cấu hình, lịch sử/nhật ký), hoàn thiện, deploy.
