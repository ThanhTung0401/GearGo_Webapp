# Phần 3 — Minh Tú

**Vai trò dự án:** Khuyến mãi + Kho + Thiết bị + Khả dụng (logic giữ lượt / kiểm kê / điều chỉnh kho).
**Phụ trách viết trong báo cáo:**
- **Chương 3 — Thiết kế Cơ sở dữ liệu** (toàn bộ, 39 bảng)

---

## Chương 3 — Thiết kế Cơ sở dữ liệu

### 3.1 Mô hình ERD
- Chèn hình ERD toàn hệ thống (xuất từ `Diagrams/ERD.dbml` — nếu chưa có .png thì dùng dbdocs.io render hoặc screenshot MySQL Workbench reverse-engineer từ SQL Server).
- **39 entities** chia 6 cụm chính, giới thiệu ngắn mỗi cụm:
  1. **Tài khoản & Nhân sự** (3): `TaiKhoan`, `KhachHang`, `NhanVien` (+ bảng phân quyền RBAC).
  2. **Danh mục & Sản phẩm** (3): `DanhMucSanPham`, `SanPham`, `HinhAnhSanPham`.
  3. **Kho & Thiết bị** (5): `NhaCungCap`, `PhieuNhapHang`, `ChiTietPhieuNhap`, `ThietBi`, `DieuChinhKho`.
  4. **Giỏ, Đơn & Giữ chỗ** (6): `GioThue`, `ChiTietGioThue`, `DonThue`, `ChiTietDonThue`, `GiuCho`, `LichSuTrangThaiDon`.
  5. **Khuyến mãi & Chính sách** (5): `KhuyenMai`, `KhuyenMaiSanPham`, `KhuyenMaiDanhMuc`, `LuotSuDungKhuyenMai`, `ChinhSach`.
  6. **Thanh toán, Phụ phí, Bàn giao, Bảo trì, Đánh giá, Thông báo, Nhật ký** (17 bảng còn lại).

### 3.2 Lược đồ cơ sở dữ liệu (RDM — Relational Data Model)
Vẽ bằng ký hiệu PK (gạch chân) / FK (nghiêng). Chia 6 trang theo 6 cụm trên để tránh rối.

### 3.3 Data Dictionary — mô tả chi tiết từng bảng
**Nguồn chính:** `Document/GearGo_Giai_Thich_Entities.md` (đã có sẵn giải thích 39 entities).

Mỗi bảng trình bày:
- **Mục đích:** 2–3 dòng.
- **Bảng cột:** `Tên cột | Kiểu | PK/FK | Nullable | Ràng buộc | Mô tả`.
- **Index:** unique keys (ví dụ `DonThue.MaDonHienThi` unique, `ThanhToan.MaYeuCau` unique — idempotency).
- **Dữ liệu mẫu:** 2–3 bản ghi (có thể lấy từ `backend/Data/Seeders/`).

**Format gợi ý — ví dụ bảng DON_THUE:**

| Cột | Kiểu | PK/FK | Mô tả |
|---|---|---|---|
| `MaDonThue` | bigint | PK | Khóa chính tự tăng |
| `MaDonHienThi` | varchar(20) | UNIQUE | Mã người dùng thấy (`GG-241123-0001`) |
| `MaKhachHang` | bigint | FK -> KHACH_HANG | Khách đặt đơn |
| `MaChinhSach` | bigint | FK -> CHINH_SACH | Bản chính sách đang hiệu lực |
| `GioNhanDuKien` | datetime2 | NOT NULL | UTC |
| `GioTraDuKien` | datetime2 | NOT NULL | UTC, phải > GioNhan |
| `HanThanhToan` | datetime2 | NOT NULL | GiuCho hết hạn cùng mốc |
| `TrangThai` | varchar(30) | NOT NULL | Enum `TrangThaiDonThue` |
| `TongTienThue` / `TongTienCoc` / `TongTienGiam` | decimal(18,2) | NOT NULL | Snapshot |
| `KhuyenMaiLucDat` | nvarchar(max) | NULL | JSON snapshot |

**Không cần viết đủ 39 bảng dày đặc** — chi tiết ~15 bảng cốt lõi (TaiKhoan, KhachHang, SanPham, ThietBi, DonThue, ChiTietDonThue, GiuCho, LuotSuDungKhuyenMai, ThanhToan, KhuyenMai, ChinhSach, PhieuNhapHang, DanhGia, LichSuTrangThaiDon, DieuChinhKho). Các bảng còn lại gộp bảng "Tóm tắt phụ" (bảng nối, ảnh, thông báo…).

### 3.4 Quy tắc dữ liệu quan trọng
Rút từ `Document/GearGo_Dac_Ta_Nghiep_Vu.md` và `PhanCong_Week2.md`:

1. **Quy tắc ẩn/ngừng SP:** `TrangThaiKinhDoanh` thuộc {`DangKinhDoanh`, `TamNgung`, `NgungKinhDoanh`}. Khách chỉ thấy `DangKinhDoanh`. Chuyển `NgungKinhDoanh` chỉ khi không còn thiết bị đang thuê / lịch đặt trước.
2. **FIFO nhập kho:** `ThietBi.MaChiTietPhieuNhap` tham chiếu phiếu nhập `DaNhapKho`, ưu tiên lô nhập trước khi phân công thiết bị.
3. **Quy tắc giữ chỗ 15':** `DonThue.HanThanhToan = GiuCho.ThoiDiemHetHan = LuotSuDungKhuyenMai.ThoiDiemHetHan` — cùng mốc, gán 1 lần khi tạo đơn.
4. **Chính sách phiên bản:** chọn bản `ThoiDiemApDung <= Now` phiên bản mới nhất thỏa, không áp hồi tố đơn cũ (snapshot vào `DonThue.KhuyenMaiLucDat` + `ChiTietDonThue.PhuKienVaMucBoiThuongLucDat`).
5. **Khả dụng (Sweep Line):** `Tổng thiết bị đủ điều kiện − max(số chiếm đồng thời trên [GioNhan, GioTra])`. Giữ chỗ hết hạn không chiếm lịch dù job chưa quét.
6. **Idempotency thanh toán:** `ThanhToan.MaYeuCau` UNIQUE -> callback trùng không ghi 2 lần.
7. **Lịch sử chuyển trạng thái:** mọi chuyển trạng thái đơn ghi vào `LICH_SU_TRANG_THAI_DON` (người thực hiện, thời điểm, lý do, trước -> sau).
8. **Audit RBAC:** `TaiKhoan.PermissionVersion` tăng khi admin thay quyền -> cache middleware invalidate.

### 3.5 Cài đặt CSDL
- **Migration:** EF Core, 7 migrations tại `backend/Migrations/`:
  1. `20260924045627_FullERDInitialCreate`
  2. `20260924060134_RemoveRedundantDonThueForeignKey`
  3. `20261110084459_AddPermissionIdentity`
  4. `20261113163000_AddDanhGiaPhanHoiCuaHang`
  5. `20261114062923_AddIdempotencyAndQuaHanContactLog`
  6. `20261119062659_AddTaiKhoanPermissionVersion`
- **Seed:** `backend/Data/DbSeeder.cs` + `backend/Data/Seeders/*` — tự chạy khi app khởi động Development.
- **Script SQL dump:** `scripts/SeedData_GearGo_Full.sql`.
- **Reset:** `dotnet ef database drop -f --project backend/GearGo.csproj`.

---

## Nguồn dữ liệu trong repo
- `Document/GearGo_Giai_Thich_Entities.md` — giải thích 39 entities (nguồn chính).
- `backend/Models/Entities/*.cs` — code entity + Fluent API.
- `backend/Data/ApplicationDbContext.cs` — DbSet + OnModelCreating.
- `backend/Migrations/` — lịch sử migration.
- `backend/Data/Seeders/` — dữ liệu mẫu.
- `scripts/SeedData_GearGo_Full.sql` — SQL dump.
- Diagrams/ERD (nếu chưa có file ảnh thì vẽ bằng dbdocs.io hoặc `dotnet ef dbcontext scaffold`).

## Hình ảnh cần chuẩn bị
- ERD tổng thể (A3 scale, 39 bảng) — export từ dbdocs / MySQL Workbench reverse-engineer.
- ERD chi tiết 6 cụm (6 ảnh nhỏ).
- Lược đồ RDM.

## Độ dài ước lượng
- Chương 3: ~20–25 trang (data dictionary dày).
