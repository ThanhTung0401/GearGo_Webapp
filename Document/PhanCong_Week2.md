# GearGo — Phân công Tuần 2 (5 người)

> **Nguồn:** Dựa trên `Document/Plan_Week2.md` và ERD `Diagrams/ERD.dbml`.  
> **Nguyên tắc:** Sở hữu dọc (entity → service → API), entity ít phụ thuộc trước, merge theo thứ tự phụ thuộc.  
> **Chỉ Người 1 chịu trách nhiệm tạo migration**: entity owner chuẩn bị model + Fluent API; Người 1 tích hợp và tạo migration, kiểm tra migration chạy được trên database mới, đồng thời tích hợp cấu hình chung trong `Program.cs`. Trong tuần có thể có nhiều migration nối tiếp nhau (không phải 1 migration duy nhất), nhưng **chỉ Người 1 tạo**. Các thành viên khác không tự chạy `dotnet ef migrations add`.

---

## Tổng quan phân công

| Người | Domain | Tasks | Ước lượng |
|---|---|---|---|
| **Người 1** | Auth + Testing + Quy ước chung | Task 1, Task 12 | ~2.5 ngày |
| **Người 2** | Danh mục + Sản phẩm + Tìm kiếm + Khả dụng | Task 2, 3, 9 | ~3 ngày |
| **Người 3** | Khuyến mãi + Kho skeleton + Logic kiểm tra/giữ lượt | Task 4, 5 | ~2.5 ngày |
| **Người 4** | Giỏ thuê + Logic báo giá dùng chung + Admin | Task 6, UC04, Task 11 | ~3 ngày |
| **Người 5** | Đơn thuê + Hủy + Thanh toán + Hết hạn + Lịch sử đơn | Task 7, 8, UC05+06 | ~3.5 ngày |

---

## Timeline tổng quan

```
          Day 1         Day 2         Day 3         Day 4         Day 5
         ─────────────────────────────────────────────────────────────────
Người 1: [─── Task 1: Auth ───────────]  [─── Task 12: Seed + Tests ───]
Người 2: [T2][── Task 3 ──]              [──── Task 9: UC03 ────────────]
Người 3: [── Task 4 ───────] [────── Task 5 ─────────]
Người 4:              [T6]  [── UC04: Cart API ───────] [── Task 11 ──]
Người 5:         [───── Task 7 ─────────] [T8] [── UC05+06 ──────────]
```

**Lưu ý timeline:**
- Task 7 bàn giao sớm (Day 3) cho Người 2 làm khả dụng (Task 9).
- Seed data làm dần khi entity merge, không chờ cuối tuần.
- Day 4-5 dành thời gian tích hợp và test.

**Mốc bàn giao service dùng chung (bắt buộc):**

| Mốc | Ai | Nội dung |
|---|---|---|
| **Cuối Day 1** | Người 1 | Bàn giao `Result<T>`, cây exception nghiệp vụ, `ExceptionHandlingMiddleware`, cấu trúc lỗi JSON `{maLoi, thongDiep, chiTiet}` → cả nhóm dùng để code service không tự bịa exception. |
| **Cuối Day 1** | Người 2, 3, 4, 5 | Chốt interface + DTO (`IKhuyenMaiService`, `IBaoGiaService`, `IKhaDungService`, `IDonThueService`, DTO báo giá truyền từ giỏ sang tạo đơn). Không cần implement, chỉ contract. |
| **Cuối Day 2** | **Người 5** | **Bàn giao model + Fluent API cho `LuotSuDungKhuyenMai` và `DonThue`** (thuộc Task 7) — chỉ phần entity cần cho `IKhuyenMaiService` ghi lượt. Người 1 tích hợp migration ngay. |
| **Cuối Day 2** | Người 3 | Bàn giao `IKhuyenMaiService` **có implement** (đọc/ghi lượt trên entity Người 5 vừa bàn giao) để Người 4 (báo giá) và Người 5 (tạo đơn) tích hợp thật. |
| **Cuối Day 2** | Người 4 | Bàn giao `IBaoGiaService` **có implement** để Người 5 gọi khi tạo đơn. |
| **Cuối Day 3** | Người 2, 5 | Bàn giao `IKhaDungService` (Người 2, cần `GiuCho`) + service tạo đơn tối thiểu (Người 5) — bắt đầu tích hợp luồng đặt đơn. |
| **Cuối Day 4** | Người 5 | Luồng đặt đơn → thanh toán chạy được end-to-end (happy path 9 bước). |
| **Day 5** | Cả nhóm | Sửa lỗi tích hợp, nghiệm thu 9 bước, chạy race condition test. |

> **Phá vòng phụ thuộc:** `IKhuyenMaiService` (Người 3, Day 2) cần entity `LuotSuDungKhuyenMai` + `DonThue` (Task 7 của Người 5, mốc Day 3). Giải pháp: **Người 5 bàn giao 2 entity này sớm — cuối Day 2**, chưa cần logic tạo đơn. Nếu không kịp Day 2 → lùi mốc `IKhuyenMaiService` implement sang Day 3.

> ⚠ **Người 5 với 3.5 ngày là khá căng** do phải chờ 4 người khác bàn giao. Người 1 hoặc Người 4 nên hỗ trợ Người 5 phần viết controller + DTO đơn thuê từ Day 3 để giảm tải.

---

## Chi tiết từng người

---

### Thanh Tùng — Auth + Testing + Quy ước chung (Task 1 + Task 12)

**Có thể bắt đầu:** Day 1 (độc lập hoàn toàn)

**Trách nhiệm bổ sung:**
- **Điều phối migration:** tích hợp entity từ các branch, **chỉ Người 1 tạo migration** (có thể nhiều migration nối tiếp trong tuần, không phải 1 migration duy nhất), xác nhận migration chạy được trên database mới. Tích hợp cấu hình chung trong `Program.cs` (JWT, CORS, DI, Authorization Policy `AdminOnly`).
- **Xử lý lỗi dùng chung (bàn giao Day 1–2 để mọi người dùng):**
  - Kiểu `Result<T>` / `Result` cho tầng service.
  - Cây exception nghiệp vụ: `NghiepVuException` (base), `KhongDuHangException`, `BaogiaThayDoiException`, `TrangThaiKhongHopLeException`, `TaiKhoanBiKhoaException`, `KhuyenMaiKhongHopLeException`, `KhongTimThayException`, `KhongCoQuyenException`.
  - `ExceptionHandlingMiddleware` chuyển exception nghiệp vụ → HTTP 400/403/404/409, exception khác → 500.
  - Cấu trúc lỗi JSON thống nhất: `{ maLoi, thongDiep, chiTiet? }`.
- Kiểm tra Task 0 (đối chiếu 3 entity TaiKhoan, KhachHang, NhanVien với ERD).
- Phối hợp quy ước chung (cấu trúc DTO, cấu trúc lỗi, convention) để cả nhóm thống nhất.
- Cập nhật seed data khi entity được merge và đảm bảo seed nhất quán, chạy lại không sinh trùng.

#### Task 1: UC01 — Xác thực (JWT + BCrypt)
> Không tạo entity mới. Dùng `TAI_KHOAN` + `KHACH_HANG` đã có từ Task 0.

**Files cần tạo:**
```
Models/DTOs/Auth/
  DangKyRequest.cs
  DangNhapRequest.cs
  QuenMatKhauRequest.cs
  DatLaiMatKhauRequest.cs
  AuthResponse.cs
Services/
  Interfaces/IXacThucService.cs
  Interfaces/IJwtService.cs
  XacThucService.cs
  JwtService.cs
Controllers/
  AuthController.cs
```

**Checklist:**
- [ ] 1.1 `AuthResponse`: Token, LoaiToken, HetHanSau, MaTaiKhoan, VaiTro, HoTen, Email
- [ ] 1.2 `JwtService.TaoToken(TaiKhoan)` — HMAC-SHA256, 7 ngày, claims: MaTaiKhoan + Email + Role
- [ ] 1.3 `IXacThucService`: DangKyAsync, DangNhapAsync, TaoTokenQuenMatKhauAsync, DatLaiMatKhauAsync, LayThongTinToiAsync
- [ ] 1.4 `DangKyAsync`: kiểm tra dữ liệu đăng ký hợp lệ + **xác nhận mật khẩu**; Email + SoDienThoai chưa tồn tại → BCrypt hash (workfactor 12) → transaction tạo TaiKhoan + KhachHang
- [ ] 1.5 `DangNhapAsync`: tìm theo Email hoặc SoDienThoai; **kiểm tra TrangThai tài khoản** (BiKhoa → từ chối); `TrangThai` chỉ dành cho khóa bởi quản trị viên; BCrypt.Verify; đếm lỗi và thời điểm hết khóa tạm trong memory cache
- [ ] 1.5a **Token khôi phục có hạn và chỉ dùng một lần**; lưu trạng thái trong memory cache; khởi động lại server sẽ mất dữ liệu tạm, không thêm cột vào ERD
- [ ] 1.5b **Kiểm tra trạng thái tài khoản khi tạo giao dịch**: tại endpoint tạo đơn/giỏ, kiểm tra `TaiKhoan.TrangThai` ngay cả khi JWT còn hợp lệ
- [ ] 1.5c **Lấy mã khách từ tài khoản đăng nhập**: từ JWT claims → `KhachHang.MaKhachHang`; **khách chỉ được thao tác giỏ và đơn của mình**
- [ ] 1.6 `AuthController [Route("api/auth")]`:
  - POST `/api/auth/dang-ky` → 201
  - POST `/api/auth/dang-nhap` → 200
  - POST `/api/auth/quen-mat-khau` → mock log token
  - POST `/api/auth/dat-lai-mat-khau`
  - GET `/api/auth/toi` `[Authorize]`
- [ ] 1.7 Đăng ký DI (Scoped): `IJwtService`, `IXacThucService`
- [ ] 1.8 Test curl: đăng ký + đăng nhập → JWT hợp lệ
- [ ] 1.9 Commit: `feat: UC01 - JWT authentication with BCrypt`

#### Task 12: Seed data + Integration test + Review
> Seed làm dần khi entity được merge, không đợi cuối tuần; Người 1 chủ trì test tích hợp sau khi các luồng chính sẵn sàng.

**Checklist:**
- [ ] 12.1 `SeedData.EnsureSeededAsync` — **nhất quán và chạy lại không sinh trùng** (kiểm tra tồn tại trước khi seed):
  - 1 QuanTriVien (`admin@geargo.local`)
  - 1 NhanVien, 1 KhachHang test
  - 3 DanhMuc: "Lều trại", "Bàn ghế", "Phụ kiện"
  - 5 SanPham + ảnh placeholder
  - 1 NhaCungCap + 1 PhieuNhapHang (`DaNhapKho`) + 5 ChiTietPhieuNhap → 10 ThietBi (SanSang)
  - 1 ChinhSach phiên bản 1 (đang có hiệu lực: `ThoiDiemApDung <= Now`)
  - 1 KhuyenMai mã `TEST10` giảm 10%, TatCa, tối thiểu 500.000₫, hạn +30 ngày
- [ ] 12.2 Gọi seed khi app khởi động ở Development
- [ ] 12.3 Integration test `DatDonFlowTests` (happy path **9 bước**):
  1. Đăng ký + đăng nhập → JWT
  2. `GET /api/san-pham` → có sản phẩm
  3. `POST /api/gio-thue/them` × 2
  4. `PUT /api/gio-thue/thoi-gian` (Now+1h, Now+25h)
  5. `POST /api/gio-thue/ma-giam-gia` với `TEST10`
  6. `POST /api/don-thue` → ChoThanhToan, có GiuCho
  7. `POST /api/thanh-toan/{id}/tao-url` → URL
  8. `GET` callback → DaXacNhan, 2 ChiTietThanhToan
  9. Callback lần 2 cùng MaYeuCau → không ghi trùng
- [ ] 12.4 Race condition test: 2 user cùng đặt thiết bị cuối → chỉ 1 thành công
- [ ] 12.5 Hết hạn test: điều khiển thời gian kiểm thử hoặc gọi trực tiếp bước xử lý hết hạn → HetHan + GiuCho giải phóng; không chờ 2 giây trong khi job chạy mỗi phút
- [ ] 12.6 Bổ sung test:
  - **Giá thay đổi**: đổi giá sản phẩm giữa lúc xem giỏ và tạo đơn → `BaogiaThayDoiException`
  - **Hết lượt mã**: nhiều khách dùng cùng mã, vượt `gioi_han_tong_luot` → từ chối
  - **Hủy giải phóng giữ chỗ**: hủy đơn → GiuCho + LuotSuDungKhuyenMai giải phóng, khả dụng tăng lại
  - **Callback lặp (gửi trùng)**: không ghi nhận thu hai lần
  - **Xử lý đồng thời**: thanh toán + job hết hạn chạy cùng lúc → không ghi đè trạng thái nhau
  - Thanh toán xong không làm khả dụng tăng trở lại
  - Hai đơn cũ không trùng nhau không bị cộng dồn sai
  - Khách không xem/sửa đơn và giỏ của người khác
- [ ] 12.7 Security check: không raw SQL, `[Authorize]` đủ, upload magic bytes, JWT secret không hardcode
- [ ] 12.8 Commit: `feat: week-2 complete - seed data, integration tests, security review`

---

### Kiện Minh — Danh mục + Sản phẩm + Tìm kiếm + Khả dụng (Task 2, 3, 9)

**Có thể bắt đầu:** Day 1 (Task 2 độc lập)  
**Task 3 cần:** Task 2 (SanPham FK → DanhMuc).  
**Task 9 cần:** **Task 5 từ Người 3** (ThietBi) **và Task 7 từ Người 5** (DonThue, GiuCho) — cần thiết bị, giữ chỗ và đơn để tính khả dụng.

**Trách nhiệm bổ sung:**
- Hoàn thiện **quy tắc tìm kiếm và khả dụng** theo đặc tả mục 8.1:
  - Chưa chọn ngày → chỉ hiện giá tham khảo, không khẳng định còn hàng.
  - Kiểm tra giờ trả sau giờ nhận; không tạo lượt thuê bắt đầu trong quá khứ.
  - Chỉ tính thiết bị đủ điều kiện từ **phiếu nhập đã xác nhận** (`DaNhapKho`).
  - Tính giữ chỗ còn hạn và đơn đã xác nhận; **không tính trùng**.
  - **Giữ chỗ hết hạn không chiếm lịch** dù job chưa chạy.
  - Công thức: **tổng thiết bị đủ điều kiện − số lượng bị chiếm đồng thời lớn nhất**.

#### Task 2: DANH_MUC_SAN_PHAM (Cấp 0, self-ref)

**Files cần tạo:**
```
Models/Entities/DanhMucSanPham.cs
```

**Checklist:**
- [ ] 2.1 `DanhMucSanPham.cs` với `[Table("DANH_MUC_SAN_PHAM")]` — 6 cột: MaDanhMuc, MaDanhMucCha (nullable FK self), TenDanhMuc, MoTa, ThuTuHienThi, TrangThai
- [ ] 2.2 Navigation: `DanhMucCha?`, `DanhMucCon` (ICollection), `SanPhams` (ICollection)
- [ ] 2.3 Thêm `DbSet<DanhMucSanPham>` vào DbContext
- [ ] 2.4 Fluent API: self-ref `HasOne(DanhMucCha).WithMany(DanhMucCon)`, `OnDelete(Restrict)`
- [ ] 2.5 Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất
- [ ] 2.6 Commit: `feat: add DanhMucSanPham entity`

#### Task 3: SAN_PHAM + HINH_ANH_SAN_PHAM (Cấp 1-2)

> **Phụ thuộc: Task 2** (SanPham FK → DanhMuc).

**Files cần tạo:**
```
Models/Entities/SanPham.cs
Models/Entities/HinhAnhSanPham.cs
Models/Enums/TrangThaiKinhDoanh.cs
```

**Checklist:**
- [ ] 3.1 Enum `TrangThaiKinhDoanh`: DangKinhDoanh, TamNgung, NgungKinhDoanh
- [ ] 3.2 `SanPham.cs` — đủ 13 cột ERD, đặc biệt: `SucChua (int)`, `KichThuoc (varchar)` **riêng**, `ThongSo (string/json)`
- [ ] 3.3 `HinhAnhSanPham.cs` — 5 cột: MaHinhAnh, MaSanPham, DuongDan, LaAnhChinh, ThuTu
- [ ] 3.4 Fluent API: unique `MaSanPhamHienThi`, cascade Restrict SanPham→DanhMuc, cascade Delete HinhAnh→SanPham
- [ ] 3.5 Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất
- [ ] 3.6 Merge theo thứ tự phụ thuộc → unblock Người 3 (Task 5), Người 4 (Task 6), Người 5 (Task 7)
- [ ] 3.7 Commit: `feat: add SanPham and HinhAnhSanPham entities`

#### Task 9: KhaDungService + UC03 (sau khi Task 5 và Task 7 xong)

> **Phụ thuộc: Task 5 từ Người 3 (ThietBi) + Task 7 từ Người 5 (DonThue, GiuCho).**

**Files cần tạo:**
```
Services/Interfaces/IKhaDungService.cs
Services/KhaDungService.cs
Services/Interfaces/IDanhMucService.cs
Services/DanhMucService.cs
Services/Interfaces/ISanPhamService.cs
Services/SanPhamService.cs
Controllers/DanhMucController.cs
Controllers/SanPhamController.cs
Models/DTOs/SanPham/TimKiemSanPhamRequest.cs
Models/DTOs/SanPham/SanPhamResponse.cs
Models/DTOs/DanhMuc/DanhMucResponse.cs
```

**Checklist:**
- [ ] 9.1 `IKhaDungService`: LayKhaDungAsync, LayKhaDungNhieuAsync
- [ ] 9.2 Công thức khả dụng:
  - Chưa chọn ngày → chỉ hiện giá tham khảo, không khẳng định còn hàng
  - Kiểm tra giờ trả > giờ nhận; không cho bắt đầu trong quá khứ
  - Đếm tổng ThietBi đủ điều kiện từ phiếu nhập đã xác nhận (`DaNhapKho`)
  - **Giữ chỗ tạm chiếm lịch khi ĐỒNG THỜI:**
    - Đơn đang `ChoThanhToan`
    - `GiuCho.TrangThai = DangGiu`
    - `ThoiDiemHetHan > Now`
  - **Đơn đã xác nhận (`DaXacNhan`, `DangChuanBi`, `SanSangNhan`, `DangThue`, ...) tính riêng và chỉ tính một lần** — không phụ thuộc hạn 15 phút của giữ chỗ
  - **Giữ chỗ hết hạn không chiếm lịch** dù job chưa chạy (điều kiện `ThoiDiemHetHan > Now` loại chúng ra)
  - **Không tính trùng**; hai bản ghi cùng thuộc một `ChiTietDonThue` chỉ tính một lần
  - Công thức: **tổng thiết bị đủ điều kiện − số lượng bị chiếm đồng thời lớn nhất trên khoảng `[GioNhan, GioTra]`** (không cộng dồn các đơn không giao nhau về thời gian)
- [ ] 9.3 `ISanPhamService.TimKiemAsync`: filter TuKhoa/DanhMuc/ThuongHieu/SucChua/GiaMin/GiaMax/GioNhan/GioTra, sort, phân trang (default 12); lọc đánh giá để UC08.
  - **API khách chỉ trả `TrangThaiKinhDoanh = "DangKinhDoanh"`** — sản phẩm `TamNgung`/`NgungKinhDoanh` không xuất hiện trong danh sách + chi tiết công khai
  - Danh mục `TrangThai != "HienThi"` cũng bị lọc khỏi kết quả khách
- [ ] 9.4 `SanPhamController [Route("api/san-pham")]`:
  - GET `/api/san-pham` — list + phân trang
  - GET `/api/san-pham/{id}?gioNhan=&gioTra=` — chi tiết + khả dụng
- [ ] 9.5 `DanhMucController [Route("api/danh-muc")]`:
  - GET `/api/danh-muc` — cây danh mục
  - GET `/api/danh-muc/{id}` — chi tiết
- [ ] 9.6 Đăng ký DI: IKhaDungService, IDanhMucService, ISanPhamService (Scoped)
- [ ] 9.7 Commit: `feat: UC03 - product search with availability check`

---

### Minh Tú — Khuyến mãi + Kho skeleton + Logic kiểm tra/giữ lượt (Task 4, 5)

**Có thể bắt đầu Task 4:** Day 1 (KHUYEN_MAI cấp 0 độc lập).  
**Bảng nối của Task 4 cần:** Task 2 (DanhMuc) và Task 3 (SanPham) — `KhuyenMaiSanPham` FK SanPham, `KhuyenMaiDanhMuc` FK DanhMuc.  
**Task 5 cần:** SanPham từ Task 3 (ChiTietPhieuNhap FK MaSanPham).  
**Vai trò then chốt:** Output của Người 3 unblock Người 2 (Task 9), Người 4 (Task 6), Người 5 (Task 7) → báo merge migration sớm để người điều phối tích hợp.

**Trách nhiệm bổ sung — `IKhuyenMaiService` dùng chung (bàn giao Day 2 để Người 4 và Người 5 tích hợp):**

**Người 3 viết:** `Services/Interfaces/IKhuyenMaiService.cs` + `Services/KhuyenMaiService.cs`:
- `KiemTraApDungAsync(maGiamGia, maKhachHang, danhSachDong, tienThueTruocGiam)` — trả `Result<KhuyenMaiHopLe>` chứa số tiền được giảm; sai → `KhuyenMaiKhongHopLeException`.
- `GiuLuotAsync(maKhuyenMai, maDonThue, thoiDiemHetHan, transaction)` — tạo `LUOT_SU_DUNG_KHUYEN_MAI` (DangGiu).
- `XacNhanDaSuDungAsync(maDonThue)` — chuyển lượt DangGiu → DaSuDung khi thanh toán thành công.
- `GiaiPhongLuotAsync(maDonThue)` — DangGiu → DaGiaiPhong khi hủy; hết hạn → HetHan.

**Quy tắc kiểm tra:**
- **Trạng thái:** chỉ `HienThi`; `TamAn` → từ chối; `HetHan` → từ chối.
- Thời hạn: `BatDau <= Now <= KetThuc`.
- Phạm vi: sản phẩm/danh mục phù hợp; `TatCa` → áp cho toàn giỏ.
- Mức tối thiểu: `TienThueTruocGiam >= TienThueToiThieu`.
- Giới hạn tổng lượt: đếm `LUOT_SU_DUNG_KHUYEN_MAI` có TrangThai ∈ {DangGiu **còn hạn**, DaSuDung} < `GioiHanTongLuot`.
- Giới hạn mỗi khách: đếm lượt của khách có TrangThai ∈ {DangGiu **còn hạn**, DaSuDung} < `GioiHanMoiKhach`.
- **Lượt `DangGiu` đã hết hạn (`ThoiDiemHetHan < Now`) không tiếp tục chiếm lượt** dù job chưa chạy — khi đếm phải loại các lượt hết hạn.
- Giảm chỉ trên tiền thuê; không giảm cọc; không vượt `MucGiamToiDa`.

**Phân định gọi service:**
- **Người 3:** viết + test service; test đủ các nhánh trạng thái + hết hạn + `TamAn`.
- **Người 4 (giỏ):** gọi `KiemTraApDungAsync` khi khách áp mã trong giỏ — chỉ để **báo giá dự kiến, KHÔNG giữ lượt** (giỏ không giữ hàng cũng không giữ mã).
- **Người 5 (tạo đơn):** gọi lại `KiemTraApDungAsync` trong transaction tạo đơn để **kiểm tra và ghi giữ lượt** (`GiuLuotAsync`), tránh việc mã bị hết lượt giữa lúc áp mã và tạo đơn.

#### Task 4: KHUYEN_MAI + bảng nối (Cấp 0, 2)

> **Bảng nối cần Task 2 (DanhMuc) và Task 3 (SanPham).**

**Files cần tạo:**
```
Models/Entities/KhuyenMai.cs
Models/Entities/KhuyenMaiSanPham.cs
Models/Entities/KhuyenMaiDanhMuc.cs
Models/Enums/LoaiGiam.cs
Models/Enums/PhamViApDung.cs
Models/Enums/TrangThaiKhuyenMai.cs
Services/Interfaces/IKhuyenMaiService.cs
Services/KhuyenMaiService.cs
Models/DTOs/KhuyenMai/KhuyenMaiHopLe.cs
```

**Checklist:**
- [ ] 4.1 Enums: `LoaiGiam {PhanTram, SoTien}`, `PhamViApDung {TatCa, TheoSanPham, TheoDanhMuc}`, `TrangThaiKhuyenMai {HienThi, TamAn, HetHan}`
- [ ] 4.2 `KhuyenMai.cs` — đủ 13 trường theo ERD, `MaGiamGia (varchar 50)` UNIQUE
- [ ] 4.3 `KhuyenMaiSanPham` composite PK: `HasKey(x => new { x.MaKhuyenMai, x.MaSanPham })` + `KhuyenMaiDanhMuc` composite PK: `HasKey(x => new { x.MaKhuyenMai, x.MaDanhMuc })`
- [ ] 4.4 Chuẩn bị model xong → báo Người 1 tích hợp migration
- [ ] 4.5 Báo đã merge entity/migration — Người 4 (Task 6) cần KhuyenMai FK để tạo GioThue
- [ ] 4.6 **`IKhuyenMaiService` (bàn giao Day 2 cho Người 4 + Người 5):**
  - `KiemTraApDungAsync` — kiểm tra đủ: trạng thái ≠ `TamAn`/`HetHan`, thời hạn, phạm vi, mức tối thiểu, giới hạn tổng lượt, giới hạn mỗi khách (**loại các lượt `DangGiu` đã hết hạn** khi đếm).
  - `GiuLuotAsync`, `XacNhanDaSuDungAsync`, `GiaiPhongLuotAsync`.
- [ ] 4.7 Đăng ký DI `IKhuyenMaiService` (Scoped) trong `Program.cs`.
- [ ] 4.8 Test đơn vị đầy đủ các nhánh: hợp lệ, `TamAn`, hết hạn, không đủ tối thiểu, vượt tổng lượt, vượt lượt/khách, lượt `DangGiu` hết hạn không tính.
- [ ] 4.9 Commit: `feat: add KhuyenMai entity, service and validation logic`

#### Task 5: Nhập kho + Thiết bị skeleton (Cấp 0-4)

> **Chỉ tạo entity + migration, KHÔNG làm API** — API nhập kho dời sang Tuần 3.  
> **Entity đầy đủ cột theo ERD**; tuần 2 chỉ chưa làm API.  
> **Phụ thuộc: Task 3** (ChiTietPhieuNhap FK MaSanPham).

**Files cần tạo:**
```
Models/Entities/NhaCungCap.cs
Models/Entities/PhieuNhapHang.cs
Models/Entities/ChiTietPhieuNhap.cs
Models/Entities/ThietBi.cs
Models/Enums/TrangThaiSuDungThietBi.cs
```

**Checklist:**
- [ ] 5.1 `NhaCungCap.cs` (Cấp 0) — 10 trường: MaNhaCungCap, MaNhaCungCapHienThi (unique), TenNhaCungCap, NguoiLienHe, SoDienThoai, Email, DiaChi, MaSoThue, GhiChu, TrangThaiHopTac
- [ ] 5.2 `PhieuNhapHang.cs` (Cấp 2) — FK: MaNhaCungCap, MaNguoiLap (NhanVien), MaNguoiXacNhan (NhanVien, nullable). Đủ **17 trường**: MaPhieuNhap, MaNhaCungCap, MaNguoiLap, MaNguoiXacNhan, MaPhieuHienThi, SoChungTuNhaCungCap, NgayLap, NgayNhapDuKien, NgayNhapThucTe, NgayXacNhan, TongTien, ThongTinNhaCungCapLucNhap (json), TenNguoiLapLucNhap, TenNguoiXacNhanLucNhap, TrangThai, LyDoHuy, GhiChu
- [ ] 5.3 `ChiTietPhieuNhap.cs` (Cấp 3) — FK: MaPhieuNhap, MaSanPham. Đủ trường: MaChiTietPhieuNhap, MaPhieuNhap, MaSanPham, TenSanPhamLucNhap, SoLuong, DonGiaNhap, TinhTrangKhiNhap, GhiChu
- [ ] 5.4 `ThietBi.cs` (Cấp 4) — FK: MaChiTietPhieuNhap (NOT NULL). Đủ **9 trường**: MaThietBi, MaChiTietPhieuNhap, MaThietBiHienThi, NgayNhap, GiaNhap, TinhTrang, PhuKienDiKem (json), TrangThaiSuDung, GhiChu
- [ ] 5.5 Enum `TrangThaiSuDungThietBi`: SanSang, DangThue, DangBaoTri, ThatLac, NgungSuDung; giữ chỗ quản lý ở `GIU_CHO`
- [ ] 5.6 Fluent API unique: NhaCungCap.MaNhaCungCapHienThi, PhieuNhapHang.MaPhieuHienThi, ThietBi.MaThietBiHienThi
- [ ] 5.7 Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất
- [ ] 5.8 Báo đã merge entity/migration — Người 2 cần ThietBi để làm Task 9
- [ ] 5.9 Commit: `feat: add NhaCungCap, PhieuNhapHang, ChiTietPhieuNhap, ThietBi (skeleton for Week 3)`

---

### Kim Xuyến — Giỏ thuê + Logic báo giá dùng chung + Admin (Task 6, UC04, Task 11)

**Có thể bắt đầu Task 6:** Sau khi Task 3 (Người 2) + Task 4 (Người 3) push xong  
**Có thể bắt đầu Task 11:** Sau khi Task 2+3 (Người 2) push xong

**Trách nhiệm bổ sung:**
- Hoàn thiện **giỏ và logic báo giá dùng chung** (giỏ và tạo đơn gọi chung):
  - Thêm lại sản phẩm thì cộng số lượng; số lượng phải nguyên dương.
  - Đổi ngày/số lượng thì tính lại báo giá và khả dụng.
  - Giỏ không giữ hàng.
  - Có cơ chế lưu/đối chiếu báo giá khách đã xem (hash hoặc version) để phát hiện giá thay đổi.
  - Chỉ giảm tiền thuê; phân bổ giảm giá xuống từng dòng và làm tròn thống nhất (VNĐ).
  - **Giỏ hiển thị cờ "ngừng kinh doanh"** cho dòng sản phẩm có `TrangThaiKinhDoanh != "DangKinhDoanh"` — khách phải xóa dòng đó trước khi tạo đơn.
- **Viết service Admin riêng** (`IAdminSanPhamService`, `IAdminDanhMucService`) — tách khỏi `SanPhamService`/`DanhMucService` của Người 2 để tránh 2 người sửa cùng file:
  - Validation: **giá thuê, cọc, giá trị bồi thường không âm** (`>= 0`).
  - Upload ảnh: kiểm tra magic bytes, ≤ 5MB, đuôi `.jpg/.jpeg/.png/.webp`.
  - Đổi trạng thái: `DangKinhDoanh ↔ TamNgung ↔ NgungKinhDoanh`.
  - Xóa danh mục: chỉ khi không có sản phẩm và không có danh mục con.

#### Task 6: GIO_THUE + CHI_TIET_GIO_THUE (Cấp 2-3)

**Files cần tạo:**
```
Models/Entities/GioThue.cs
Models/Entities/ChiTietGioThue.cs
```

**Checklist:**
- [ ] 6.1 `GioThue.cs` — FK KhachHang (UNIQUE — 1-1), FK KhuyenMai (nullable `long?`). Đủ 6 cột: MaGioThue, MaKhachHang, MaKhuyenMai, GioNhanDuKien, GioTraDuKien, NgayCapNhat
- [ ] 6.2 `ChiTietGioThue.cs` — 4 cột: MaChiTietGio, MaGioThue (FK), MaSanPham (FK), SoLuong
- [ ] 6.3 Fluent API: MaKhachHang unique (1-1 với KhachHang), cascade Delete ChiTietGioThue theo GioThue
- [ ] 6.4 Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất
- [ ] 6.5 Có thể merge độc lập; nghiệp vụ tạo đơn UC05 mới cần đọc giỏ, entity Task 7 không cần chờ Task 6
- [ ] 6.6 Commit: `feat: add GioThue and ChiTietGioThue entities`

#### UC04 — Giỏ thuê API (từ Task 10)

**Files cần tạo:**
```
Services/Interfaces/IGioThueService.cs
Services/GioThueService.cs
Services/Interfaces/IBaoGiaService.cs    ← logic tính giá dùng chung
Services/BaoGiaService.cs
Controllers/GioThueController.cs
Models/DTOs/GioThue/GioThueResponse.cs
Models/DTOs/GioThue/ThemVaoGioRequest.cs
Models/DTOs/GioThue/CapNhatSoLuongRequest.cs
Models/DTOs/GioThue/DatThoiGianRequest.cs
Models/DTOs/GioThue/ApKhuyenMaiRequest.cs
```

**Checklist:**
- [ ] UC04.1 `IGioThueService`: LayGioAsync, ThemAsync, CapNhatSoLuongAsync, XoaChiTietAsync, DatThoiGianAsync, ApMaKhuyenMaiAsync
- [ ] UC04.2 Logic giỏ:
  - **Thêm sản phẩm đã có → cộng dồn số lượng**, không tạo dòng mới
  - **Số lượng phải nguyên dương** (> 0)
  - **Đổi ngày/số lượng → tính lại báo giá và khả dụng**
  - **Giỏ không giữ hàng**
- [ ] UC04.3 Logic báo giá dùng chung (tách `IBaoGiaService` để UC05 gọi lại):
  - `SoNgay = Ceiling((GioTra - GioNhan).TotalHours / 24)` tối thiểu 1
  - `TienThue = SUM(don_gia_thue_moi_ngay * so_luong * so_ngay)`
  - `TienCoc = SUM(muc_coc_moi_thiet_bi * so_luong)`
  - Áp KhuyenMai: dùng logic kiểm tra/giữ lượt từ Người 3
  - **Chỉ giảm tiền thuê**; không giảm cọc, không vượt tiền thuê phần hàng đủ điều kiện
  - **Phân bổ giảm giá xuống từng dòng**, làm tròn thống nhất (VNĐ)
  - **Lưu/đối chiếu báo giá**: hash hoặc version để phát hiện giá thay đổi khi tạo đơn
- [ ] UC04.4 `GioThueController [Authorize] [Route("api/gio-thue")]`:
  - GET `/api/gio-thue`
  - POST `/api/gio-thue/them`
  - PUT `/api/gio-thue/{maChiTiet}/so-luong`
  - DELETE `/api/gio-thue/{maChiTiet}`
  - PUT `/api/gio-thue/thoi-gian`
  - POST `/api/gio-thue/ma-giam-gia`
- [ ] UC04.5 Commit: `feat: UC04 - cart service and API`

#### Task 11: UC21 — Admin CRUD danh mục & sản phẩm

**Files cần tạo:**
```
Controllers/Admin/DanhMucController.cs
Controllers/Admin/SanPhamController.cs
Services/Interfaces/IAdminDanhMucService.cs
Services/Admin/AdminDanhMucService.cs
Services/Interfaces/IAdminSanPhamService.cs
Services/Admin/AdminSanPhamService.cs
Models/DTOs/Admin/TaoDanhMucRequest.cs
Models/DTOs/Admin/CapNhatDanhMucRequest.cs
Models/DTOs/Admin/TaoSanPhamRequest.cs
Models/DTOs/Admin/CapNhatSanPhamRequest.cs
```

**Checklist:**
- [ ] 11.1 `[Authorize(Policy = "AdminOnly")]` cho toàn bộ Controllers/Admin/. Đăng ký policy: `options.AddPolicy("AdminOnly", p => p.RequireRole("QuanTriVien"))`
- [ ] 11.2 `Admin/DanhMucController [Route("api/admin/danh-muc")]`:
  - GET — list tree
  - POST — tạo mới
  - PUT /{id} — cập nhật
  - DELETE /{id} — chỉ khi không có sản phẩm và danh mục con
  - PATCH /{id}/trang-thai
  - Validate: không cho MaDanhMucCha là chính nó hoặc con của nó
- [ ] 11.3 `Admin/SanPhamController [Route("api/admin/san-pham")]`:
  - GET — list + filter (bao gồm cả `TamNgung`/`NgungKinhDoanh`)
  - POST — tạo mới (unique MaSanPhamHienThi)
  - PUT /{id} — cập nhật (snapshot đã có trong ChiTietDonThue)
  - PATCH /{id}/trang-thai
  - POST /{id}/hinh-anh — upload (.jpg/.jpeg/.png/.webp ≤ 5MB + kiểm tra magic bytes)
  - DELETE /hinh-anh/{maHinhAnh}
- [ ] 11.4 **Validation trong `AdminSanPhamService`:**
  - `GiaThueMoiNgay >= 0`, `MucCocMoiThietBi >= 0`, `GiaTriBoiThuong >= 0` — nhập âm → HTTP 400
  - `SucChua >= 0`, `MaSanPhamHienThi` không trùng
- [ ] 11.5 Commit: `feat: UC21 - admin category and product CRUD API`

---

### Tuấn Kiệt — Đơn thuê + Hủy + Thanh toán + Hết hạn + Lịch sử đơn (Task 7, 8, UC05+06)

**Có thể bắt đầu Task 7:** Sau khi Task 3 (Người 2) và Task 4 (Người 3) xong. **Không cần chờ entity Task 6** — chỉ nghiệp vụ tạo đơn UC05 mới cần đọc giỏ.  
**Task 8 + UC05+06 làm tuần tự sau Task 7**  
**UC05 cần:** Giỏ (Task 6 + UC04 từ Người 4), khả dụng (Task 9 từ Người 2), logic báo giá/khuyến mãi (Người 3 + Người 4).

**Trách nhiệm bổ sung:**
- Hoàn thiện **tạo đơn, hủy chưa thanh toán, thanh toán, hết hạn và ghi lịch sử đơn**:
  - Chọn chính sách **đang có hiệu lực** (`ThoiDiemApDung <= Now`), không đơn thuần lấy phiên bản mới nhất.
  - Kiểm tra, tạo đơn, snapshot, giữ hàng, giữ lượt mã và dọn giỏ trong **cùng transaction**. Thất bại → rollback toàn bộ, giữ nguyên giỏ.
  - Hai yêu cầu đồng thời không tạo hai đơn từ cùng dữ liệu giỏ.
  - **Kiểm tra lại `TrangThaiKinhDoanh` của từng sản phẩm khi tạo đơn** — sản phẩm có thể bị Admin chuyển sang `TamNgung`/`NgungKinhDoanh` sau lúc khách thêm giỏ → từ chối với lỗi rõ ràng.
  - Hủy chưa thanh toán: ghi người hủy, thời điểm, lý do; giải phóng giữ chỗ và lượt mã.
  - **Ghi lịch sử chuyển trạng thái** bằng bảng `LICH_SU_TRANG_THAI_DON` đã có trong ERD.
  - Tạo URL thanh toán → tạo giao dịch `DangXuLy`. Callback → tìm đúng giao dịch, kiểm tra đơn/số tiền.
  - **Cập nhật trạng thái nguyên tử:** kiểm tra trạng thái + chuyển trạng thái phải trong **cùng câu lệnh UPDATE có điều kiện WHERE** (optimistic concurrency) hoặc cùng transaction Serializable; các bản ghi thanh toán, giữ chỗ, lượt mã và lịch sử phải nhất quán, không tồn tại tình trạng ghi nửa vời.
  - **Callback lặp — xử lý theo thứ tự:** (1) tìm giao dịch theo `MaYeuCau`; (2) **nếu giao dịch đã `ThanhCong` → trả kết quả cũ ngay** (không kiểm tra trạng thái đơn vì lần đầu đã chuyển đơn sang `DaXacNhan`); (3) chỉ khi giao dịch còn `DangXuLy` mới yêu cầu đơn phải còn `ChoThanhToan`.
  - Thanh toán, hủy và job hết hạn phải phối hợp — **không ghi đè trạng thái nhau**.
  - Dùng đúng tên trường: `HanThanhToan` (DonThue), `ThoiDiemHetHan` (GiuCho, LuotSuDungKhuyenMai).

#### Task 7: Đơn thuê hoàn chỉnh (Cấp 2-5)

> 6 bảng (thêm LICH_SU_TRANG_THAI_DON) phụ thuộc lẫn nhau — làm trong 1 migration.  
> **Phụ thuộc: Task 3 (SanPham) và Task 4 (KhuyenMai).** Không cần chờ entity Task 6.

**Files cần tạo:**
```
Models/Entities/ChinhSach.cs
Models/Entities/DonThue.cs
Models/Entities/ChiTietDonThue.cs
Models/Entities/GiuCho.cs
Models/Entities/LuotSuDungKhuyenMai.cs
Models/Entities/LichSuTrangThaiDon.cs
Models/Enums/TrangThaiDonThue.cs
Models/Enums/TrangThaiGiuCho.cs
```

**Checklist:**
- [ ] 7.1 Enum `TrangThaiDonThue`: ChoThanhToan, DaXacNhan, DangChuanBi, SanSangNhan, DangThue, DaNhanTra, ChoDoiSoat, HoanTat, HetHan, KhachHuy, CuaHangHuy
- [ ] 7.2 `ChinhSach.cs`: MaChinhSach, MaNguoiTao (FK NhanVien), TenChinhSach, PhienBan (int unique), ThoiDiemApDung, NoiDungChinhSach (json), NgayTao
- [ ] 7.3 `DonThue.cs` — đủ **22 trường** theo ERD: FK MaKhachHang, MaChinhSach (NOT NULL), MaNguoiHuy? (FK **TaiKhoan**). MaDonHienThi unique. Bổ sung rõ: **GioNhanDuKien**, **GioTraDuKien**, **HanThanhToan**. Snapshot KhuyenMaiLucDat (json)
- [ ] 7.4 `ChiTietDonThue.cs` — FK: MaDonThue, MaSanPham. Snapshot đầy đủ: TenSanPhamLucDat, DonGiaThueMoiNgay, MucCocMoiThietBi, GiaTriBoiThuongMoiThietBi, PhuKienVaMucBoiThuongLucDat (json). Thêm: SoNgayTinhTien, SoLuong, TienGiam
- [ ] 7.5 `GiuCho.cs` — **1-1 với ChiTietDonThue**: MaChiTietDon UNIQUE FK. ThoiDiemTao, **ThoiDiemHetHan**, ThoiDiemGiaiPhong, TrangThai
- [ ] 7.6 Enum `TrangThaiGiuCho`: DangGiu, DaXacNhan, DaGiaiPhong, HetHan
- [ ] 7.7 `LuotSuDungKhuyenMai.cs` — **1-1 với DonThue**: MaDonThue UNIQUE FK. **MaKhuyenMai (FK NOT NULL về KHUYEN_MAI)**. ThoiDiemGiuLuot, **ThoiDiemHetHan**, ThoiDiemSuDung, ThoiDiemGiaiPhong, SoTienGiam, TrangThai
- [ ] 7.8 `LichSuTrangThaiDon.cs` — MaLichSuDon, MaDonThue (FK), MaNguoiThucHien (FK TaiKhoan, nullable), TrangThaiTruoc, TrangThaiSau, ThoiDiem, LyDo
- [ ] 7.9 Fluent API: DonThue.MaDonHienThi unique, DonThue.MaKhachHang cascade Restrict, GiuCho.MaChiTietDon unique + cascade Delete, LuotSuDungKhuyenMai.MaDonThue unique, ChinhSach.PhienBan unique
- [ ] 7.10 Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất. **Bàn giao sớm (Day 3)** cho Người 2 làm Task 9 khả dụng.
- [ ] 7.11 Commit: `feat: add ChinhSach, DonThue, ChiTietDonThue, GiuCho, LuotSuDungKhuyenMai, LichSuTrangThaiDon`

#### Task 8: THANH_TOAN + CHI_TIET_THANH_TOAN (Cấp 4-5)

**Files cần tạo:**
```
Models/Entities/ThanhToan.cs
Models/Entities/ChiTietThanhToan.cs
Models/Enums/MucDichThanhToan.cs
Models/Enums/TrangThaiThanhToan.cs
```

**Checklist:**
- [ ] 8.1 Enum `MucDichThanhToan`: TienThue, TienCoc, ThuBoSung; hoàn cọc về sau dùng `HOAN_TIEN`
- [ ] 8.2 Enum `TrangThaiThanhToan`: DangXuLy, ThanhCong, ThatBai, Huy
- [ ] 8.3 `ThanhToan.cs` — 13 trường: FK MaDonThue, FK MaNguoiGhiNhan (NhanVien, nullable), MaYeuCau (varchar 100 UNIQUE — idempotency key), CongThanhToan, MaGiaoDichCong, TongSoTien, PhuongThuc, ThoiDiemTao, ThoiDiemThanhCong, TrangThai, TrangThaiDoiChieu, GhiChu
- [ ] 8.4 `ChiTietThanhToan.cs`: MaChiTietThanhToan, MaThanhToan (FK), MucDich, SoTien
- [ ] 8.5 Fluent API: ThanhToan.MaYeuCau unique, index ThanhToan.MaGiaoDichCong
- [ ] 8.6 Hoàn thiện entity và Fluent API → báo Người 1 tích hợp và tạo migration → cả nhóm cập nhật database bằng migration đã thống nhất
- [ ] 8.7 Commit: `feat: add ThanhToan and ChiTietThanhToan entities`

#### UC05 + UC06 — Đặt đơn + Hủy + Thanh toán + Hết hạn (từ Task 10)

> **UC05 cần:** giỏ (Người 4), khả dụng (Người 2), logic báo giá/khuyến mãi (Người 3 + 4).

**Files cần tạo:**
```
Services/Interfaces/IDonThueService.cs
Services/DonThueService.cs
Services/Interfaces/IThanhToanService.cs
Services/ThanhToanService.cs
Services/DonThueExpiredHostedService.cs
Controllers/DonThueController.cs
Controllers/ThanhToanController.cs
Models/DTOs/DonThue/TaoDonThueRequest.cs
Models/DTOs/DonThue/DonThueResponse.cs
Models/DTOs/ThanhToan/ThanhToanCallbackRequest.cs
```

**Checklist UC05:**
- [ ] UC05.1 `IDonThueService.TaoDonAsync` trong `IsolationLevel.Serializable`:
  1. Load giỏ, kiểm tra không rỗng
  2. **Kiểm tra `TrangThaiKinhDoanh` từng sản phẩm** — phải là `DangKinhDoanh`; nếu không → `TrangThaiKhongHopLeException`
  3. Kiểm tra khả dụng từng dòng → nếu thiếu → `KhongDuHangException`
  4. Nếu báo giá thay đổi (đối chiếu hash/version) → `BaogiaThayDoiException`
  5. **Nếu giỏ có mã khuyến mãi** → gọi lại `IKhuyenMaiService.KiemTraApDungAsync` (mã có thể `TamAn`/hết hạn/vượt lượt giữa lúc áp mã và tạo đơn). Đơn không dùng mã bỏ qua bước này
  6. Load ChinhSach **đang có hiệu lực** (`ThoiDiemApDung <= Now`, phiên bản mới nhất thỏa điều kiện)
  7. **Gán hạn thanh toán thống nhất** — cùng 1 mốc thời gian cho cả 3 trường:
     ```
     thoiDiemTaoDon = DateTime.UtcNow
     hanThanhToan   = thoiDiemTaoDon + 15 phút
     DonThue.HanThanhToan               = hanThanhToan
     GiuCho.ThoiDiemHetHan              = hanThanhToan
     LuotSuDungKhuyenMai.ThoiDiemHetHan = hanThanhToan
     ```
  8. Tạo DonThue (ChoThanhToan), sinh MaDonHienThi unique. Lưu GioNhanDuKien, GioTraDuKien, HanThanhToan
  9. Snapshot vào ChiTietDonThue: giá + phụ kiện + bồi thường tại thời điểm đặt
  10. Với mỗi ChiTietDonThue: tạo GiuCho (DangGiu, `ThoiDiemHetHan = hanThanhToan`)
  11. Nếu có khuyến mãi: gọi `IKhuyenMaiService.GiuLuotAsync` — tạo LuotSuDungKhuyenMai (DangGiu, `ThoiDiemHetHan = hanThanhToan`)
  12. Xóa giỏ
  - **Toàn bộ trong cùng transaction; thất bại → rollback toàn bộ, giữ nguyên giỏ**
  - **Hai yêu cầu đồng thời** không tạo hai đơn từ cùng giỏ (Serializable + kiểm tra giỏ rỗng)
  - **Ghi lịch sử chuyển trạng thái** vào `LICH_SU_TRANG_THAI_DON`

> **Quy ước hết hạn:** còn hạn khi `Now < hạn`; hết hạn khi `Now >= hạn`. Query đếm lượt đang chiếm dùng `ThoiDiemHetHan > Now`. Job hết hạn dùng `hạn <= Now`.
- [ ] UC05.2 **Hủy đơn chưa thanh toán — cùng transaction, cập nhật có điều kiện:**
  - UPDATE `DonThue` `WHERE MaDonThue = @id AND TrangThai = 'ChoThanhToan'` → `KhachHuy`/`CuaHangHuy`. Nếu 0 rows → đơn đã đổi trạng thái → throw `TrangThaiKhongHopLeException`, rollback
  - Ghi MaNguoiHuy (MaTaiKhoan), ThoiDiemHuy, LyDoHuy
  - Giải phóng GiuCho: UPDATE `WHERE ... AND TrangThai = 'DangGiu'` → DaGiaiPhong
  - Gọi `IKhuyenMaiService.GiaiPhongLuotAsync`: UPDATE LuotSuDungKhuyenMai `WHERE MaDonThue = @id AND TrangThai = 'DangGiu'` → DaGiaiPhong
  - Ghi lịch sử chuyển trạng thái
  - Toàn bộ trong **cùng transaction**; thất bại → rollback
- [ ] UC05.3 `IHostedService` chạy mỗi 1 phút — **job hết hạn, cập nhật có điều kiện trong transaction**:
  - Với mỗi đơn `ChoThanhToan` có `HanThanhToan <= Now`, mở transaction:
    - UPDATE `DonThue` `WHERE MaDonThue = @id AND TrangThai = 'ChoThanhToan'` → HetHan. Nếu 0 rows (đơn vừa được thanh toán/hủy) → bỏ qua, commit (không ghi đè)
    - Giải phóng GiuCho (`ThoiDiemHetHan <= Now` AND `TrangThai = 'DangGiu'`) → HetHan
    - Giải phóng LuotSuDungKhuyenMai (`ThoiDiemHetHan <= Now` AND `TrangThai = 'DangGiu'`) → HetHan
    - Ghi lịch sử chuyển trạng thái
    - Commit
  - **Không ghi đè trạng thái nhau:** UPDATE có điều kiện `WHERE TrangThai = ...` là cơ chế đảm bảo, không dùng SELECT-then-UPDATE
- [ ] UC05.4 `DonThueController [Authorize] [Route("api/don-thue")]`:
  - GET `/api/don-thue/xac-nhan` — preview
  - POST `/api/don-thue` — tạo đơn
  - GET `/api/don-thue/{id}` — chi tiết
  - GET `/api/don-thue` — danh sách đơn của khách
  - POST `/api/don-thue/{id}/huy`

**Checklist UC06:**
- [ ] UC06.0 Tuần 2 chỉ hủy đơn chưa thanh toán; hủy sau thanh toán và hoàn tiền để UC07. Gateway mock chỉ phục vụ demo, chưa bao phủ toàn bộ ngoại lệ UC06.
- [ ] UC06.1 Mock gateway `TaoUrlAsync`: tạo giao dịch ThanhToan (`DangXuLy`); sinh `MaYeuCau = Guid.NewGuid().ToString("N")`, trả URL callback
- [ ] UC06.2 `XuLyKetQuaAsync(callback)` — thứ tự bước quan trọng:
  1. **Tìm giao dịch theo `MaYeuCau`** — không thấy → 404
  2. **Idempotency (trước khi kiểm tra đơn):** nếu giao dịch đã `ThanhCong` → **trả kết quả cũ ngay lập tức**, không thu thêm, không yêu cầu đơn phải còn `ChoThanhToan` (lần đầu đã chuyển đơn sang `DaXacNhan`)
  3. Nếu giao dịch đã `ThatBai`/`Huy` → trả lỗi cuối
  4. Chỉ khi giao dịch còn `DangXuLy` mới đi tiếp:
     - Kiểm tra số tiền: `TongSoTien = TongTienThueTruocGiam - TongTienGiam + TongTienCoc`
     - **Cập nhật nguyên tử trong 1 transaction (UPDATE có điều kiện):**
       - UPDATE `DonThue` `WHERE MaDonThue = @id AND TrangThai = 'ChoThanhToan' AND HanThanhToan > @now` → DaXacNhan
       - UPDATE ThanhToan `WHERE MaThanhToan = @id AND TrangThai = 'DangXuLy'` → ThanhCong + tạo 2 ChiTietThanhToan
       - UPDATE GiuCho → DaXacNhan
       - Gọi `IKhuyenMaiService.XacNhanDaSuDungAsync` — LuotSuDungKhuyenMai → DaSuDung (không tạo lượt mới)
       - Ghi lịch sử chuyển trạng thái
       - Commit
  - **Nếu UPDATE đơn trả về 0 rows** — **KHÔNG tự ghi đè `ThatBai`**:
    - Rollback, đọc lại đơn và giao dịch trong transaction mới:
      - Giao dịch đã `ThanhCong` (do callback trước vừa xong) → trả kết quả cũ
      - Đơn `HetHan`/`KhachHuy`/`CuaHangHuy` mà gateway đã thu tiền → cập nhật `TrangThaiDoiChieu = 'CanDoiSoat'`, tạo yêu cầu hoàn tiền để đối soát (UC07). **Không mặc định là `ThatBai`** vì có thể tiền đã thu ở gateway
      - Đơn `DaXacNhan` mà giao dịch này vẫn `DangXuLy` (bất thường — giao dịch khác đã confirm trước) → **kiểm tra gateway có thu tiền không**: có → `TrangThaiDoiChieu = 'CanDoiSoat'` + `ThanhCong` + tạo yêu cầu hoàn tiền thu trùng (UC07), **không tự `ThatBai`**; chưa thu → `ThatBai` + ghi chú "đơn đã được giao dịch khác xác nhận"
      - Ghi log chi tiết để nghiệp vụ đối soát thủ công
- [ ] UC06.3 `ThanhToanController [Route("api/thanh-toan")]`:
  - POST `/api/thanh-toan/{maDon}/tao-url` `[Authorize]`
  - GET `/api/thanh-toan/ket-qua` — callback từ gateway
- [ ] UC06.4 Commit: `feat: UC05+UC06 - order creation with seat hold and mock payment`

---

## Điểm phối hợp & Dependencies

| Sự kiện trigger | Ai được unblock |
|---|---|
| Người 2 merge **Task 2** (DanhMuc) | Người 2 Task 3, Người 3 Task 4 bảng nối |
| Người 2 merge **Task 3** (SanPham) | Người 3 Task 4 bảng nối + Task 5, Người 4 Task 6, Người 5 Task 7 |
| Người 3 merge **Task 4** (KhuyenMai) | Người 4 Task 6, Người 5 Task 7 |
| Người 3 merge **Task 5** (ThietBi) | Người 2 Task 9 |
| Người 4 merge **Task 6** (GioThue) | Người 4 UC04; không block entity Task 7 |
| Người 5 merge **Task 7** (DonThue) — **bàn giao sớm Day 3** | Người 2 Task 9, Người 5 Task 8 |
| Người 5 merge **Task 8** (ThanhToan) | Người 5 UC06 |

### Quy tắc phối hợp

- **Người điều phối migration:** Entity owner chuẩn bị model (entity class + Fluent API config) → báo đã sẵn sàng → **người điều phối tạo migration** sau khi tích hợp code từ các branch → thông báo commit/tag để cả nhóm dùng chung.
- Không yêu cầu mọi người tự push thẳng `main`; mọi merge phải qua quy trình branch/review của nhóm.
- Task 7 bàn giao sớm cho Người 2 làm khả dụng.
- Seed data làm dần khi entity merge; dành Day 4-5 cho tích hợp cuối tuần.

### Quy ước dùng chung (tất cả thành viên)

- **Tên trường, kiểu dữ liệu:** theo ERD, PascalCase C# map snake_case SQL. Enum lưu chuỗi.
- **Chính sách:** chọn bản **đang có hiệu lực** (`ThoiDiemApDung <= Now`), không đơn thuần lấy phiên bản mới nhất.
- **Tên trường hạn:** `HanThanhToan` (DonThue), `ThoiDiemHetHan` (GiuCho, LuotSuDungKhuyenMai).
- **DTO:** tách Request/Response, cấu trúc lỗi chung (xem Plan_Week2).
- **Test:** happy path **9 bước**, không 8 bước.
- **JSON:** cấu trúc snapshot (chính sách, khuyến mãi, phụ kiện) thống nhất trước khi code.

---

## Checklist nghiệm thu tuần 2

- [ ] `dotnet build` — 0 errors
- [ ] `dotnet ef migrations list` — đủ migrations cho Task 0-8
- [ ] Đăng ký + đăng nhập trả JWT hợp lệ
- [ ] Sai mật khẩu 5 lần → khóa tạm 15 phút trong cache; trạng thái tài khoản vẫn dành cho khóa bởi quản trị viên
- [ ] Tài khoản bị khóa không tạo được giao dịch mới, kể cả JWT còn hợp lệ
- [ ] `GET /api/san-pham?gioNhan=&gioTra=` — trả số khả dụng đúng; không chọn ngày chỉ hiện giá tham khảo
- [ ] Thêm giỏ, đổi số lượng, đổi thời gian → báo giá cập nhật đúng
- [ ] Thêm sản phẩm đã có trong giỏ → cộng dồn số lượng
- [ ] Áp mã `TEST10` → giảm 10% khi tiền thuê ≥ 500.000₫
- [ ] Tạo đơn → ChoThanhToan, có GiuCho cho mọi ChiTietDonThue, hạn 15 phút
- [ ] Đơn hết hạn → tự HetHan, GiuCho giải phóng
- [ ] Hủy đơn chưa thanh toán → ghi người hủy, lý do; giải phóng giữ chỗ và lượt mã
- [ ] Thanh toán mock → DaXacNhan, 2 ChiTietThanhToan
- [ ] Callback trùng MaYeuCau → không ghi trùng (idempotency)
- [ ] Thanh toán xong không làm khả dụng tăng trở lại
- [ ] Hai đơn cũ không trùng nhau không bị cộng dồn sai khi tính khả dụng
- [ ] Khách không được xem/sửa đơn và giỏ của người khác
- [ ] `/api/admin/*` chỉ nhận QuanTriVien, token KhachHang → 403
- [ ] Integration test happy path **9 bước** pass
- [ ] Mỗi chuyển trạng thái đơn có bản ghi trong `LICH_SU_TRANG_THAI_DON`
