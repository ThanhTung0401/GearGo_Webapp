# 📖 TÀI LIỆU TOÀN BỘ 80 API GEARGO (TRÍCH XUẤT TỪ SWAGGER)

> **Dự án:** GearGo (1.0)  
> **Tổng số Endpoint:** 80  
> **Tổng số Schemas / Mô hình DTO:** 38  
> **Trạng thái kiểm thử:** Toàn bộ 80 endpoints hoạt động ổn định (0 lỗi 500)  
> **Thời gian trích xuất:** 16:20:24 5/10/2026

## 📑 MỤC LỤC CÁC NHÓM API

- **[Auth](#tag-auth)** (5 endpoints)
- **[BanGiao](#tag-bangiao)** (14 endpoints)
- **[ChuanBiDon](#tag-chuanbidon)** (6 endpoints)
- **[DanhMuc](#tag-danhmuc)** (7 endpoints)
- **[DonThue](#tag-donthue)** (8 endpoints)
- **[GearGo](#tag-geargo)** (2 endpoints)
- **[GioThue](#tag-giothue)** (6 endpoints)
- **[HoSo](#tag-hoso)** (2 endpoints)
- **[NhaCungCap](#tag-nhacungcap)** (6 endpoints)
- **[PhieuNhap](#tag-phieunhap)** (9 endpoints)
- **[SanPham](#tag-sanpham)** (8 endpoints)
- **[ThanhToan](#tag-thanhtoan)** (1 endpoints)
- **[ThietBi](#tag-thietbi)** (4 endpoints)
- **[ThongBao](#tag-thongbao)** (2 endpoints)
- **[Danh sách 38 Schemas / Models](#danh-sach-schemas--models)**

---

<a id="tag-auth"></a>
### 🔹 Nhóm: Auth (5 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `POST` | `/api/auth/dang-ky` | - | - | [`DangKyRequest`](#schema-dangkyrequest) |
| `POST` | `/api/auth/dang-nhap` | - | - | [`DangNhapRequest`](#schema-dangnhaprequest) |
| `POST` | `/api/auth/quen-mat-khau` | - | - | [`QuenMatKhauRequest`](#schema-quenmatkhaurequest) |
| `POST` | `/api/auth/dat-lai-mat-khau` | - | - | [`DatLaiMatKhauRequest`](#schema-datlaimatkhaurequest) |
| `GET` | `/api/auth/toi` | - | - | - |

<a id="tag-bangiao"></a>
### 🔹 Nhóm: BanGiao (14 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/ban-giao/don-thue/{maDonThue}` | - | `maDonThue` (path*) | - |
| `GET` | `/api/ban-giao/don-thue/{maDonThue}` | - | `maDonThue` (path*) | - |
| `GET` | `/api/v1/ban-giao/theo-don/{maDonThue}` | - | `maDonThue` (path*) | - |
| `POST` | `/api/v1/ban-giao/theo-don/{maDonThue}` | - | `maDonThue` (path*) | - |
| `GET` | `/api/ban-giao/theo-don/{maDonThue}` | - | `maDonThue` (path*) | - |
| `POST` | `/api/ban-giao/theo-don/{maDonThue}` | - | `maDonThue` (path*) | - |
| `POST` | `/api/v1/ban-giao/nhap/{maDonThue}` | - | `maDonThue` (path*) | - |
| `POST` | `/api/ban-giao/nhap/{maDonThue}` | - | `maDonThue` (path*) | - |
| `PUT` | `/api/v1/ban-giao/nhap/{maPhieuBanGiao}` | - | `maPhieuBanGiao` (path*) | [`CapNhatPhieuBanGiaoRequest`](#schema-capnhatphieubangiaorequest) |
| `PUT` | `/api/ban-giao/nhap/{maPhieuBanGiao}` | - | `maPhieuBanGiao` (path*) | [`CapNhatPhieuBanGiaoRequest`](#schema-capnhatphieubangiaorequest) |
| `PUT` | `/api/v1/ban-giao/{maPhieuBanGiao}` | - | `maPhieuBanGiao` (path*) | [`CapNhatPhieuBanGiaoRequest`](#schema-capnhatphieubangiaorequest) |
| `PUT` | `/api/ban-giao/{maPhieuBanGiao}` | - | `maPhieuBanGiao` (path*) | [`CapNhatPhieuBanGiaoRequest`](#schema-capnhatphieubangiaorequest) |
| `POST` | `/api/v1/ban-giao/{maPhieuBanGiao}/chot` | - | `maPhieuBanGiao` (path*) | [`ChotBanGiaoRequest`](#schema-chotbangiaorequest) |
| `POST` | `/api/ban-giao/{maPhieuBanGiao}/chot` | - | `maPhieuBanGiao` (path*) | [`ChotBanGiaoRequest`](#schema-chotbangiaorequest) |

<a id="tag-chuanbidon"></a>
### 🔹 Nhóm: ChuanBiDon (6 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/chuan-bi-don/{donId}` | - | `donId` (path*) | - |
| `POST` | `/api/chuan-bi-don/{donId}/bat-dau` | - | `donId` (path*) | - |
| `POST` | `/api/chuan-bi-don/{donId}/phan-cong` | - | `donId` (path*) | [`GanThietBiRequest`](#schema-ganthietbirequest) |
| `POST` | `/api/chuan-bi-don/{donId}/phan-cong/{phanCongId}/huy` | - | `donId` (path*), `phanCongId` (path*) | [`HuyPhanCongRequest`](#schema-huyphancongrequest) |
| `POST` | `/api/chuan-bi-don/{donId}/phan-cong/{phanCongId}/thay-the` | - | `donId` (path*), `phanCongId` (path*) | [`ThayTheRequest`](#schema-thaytherequest) |
| `POST` | `/api/chuan-bi-don/{donId}/san-sang` | - | `donId` (path*) | [`XacNhanSanSangRequest`](#schema-xacnhansansangrequest) |

<a id="tag-danhmuc"></a>
### 🔹 Nhóm: DanhMuc (7 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/danh-muc` | - | - | - |
| `GET` | `/api/danh-muc/{id}` | - | `id` (path*) | - |
| `GET` | `/api/admin/danh-muc` | - | - | - |
| `POST` | `/api/admin/danh-muc` | - | - | [`TaoDanhMucRequest`](#schema-taodanhmucrequest) |
| `PUT` | `/api/admin/danh-muc/{id}` | - | `id` (path*) | [`CapNhatDanhMucRequest`](#schema-capnhatdanhmucrequest) |
| `DELETE` | `/api/admin/danh-muc/{id}` | - | `id` (path*) | - |
| `PATCH` | `/api/admin/danh-muc/{id}/trang-thai` | - | `id` (path*) | [`DoiTrangThaiRequest`](#schema-doitrangthairequest) |

<a id="tag-donthue"></a>
### 🔹 Nhóm: DonThue (8 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/don-thue` | - | `MaDon` (query), `TuNgay` (query), `DenNgay` (query), `TrangThai` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `POST` | `/api/v1/don-thue` | - | - | [`TaoDonThueRequest`](#schema-taodonthuerequest) |
| `GET` | `/api/v1/don-thue/{id}` | - | `id` (path*) | - |
| `GET` | `/api/v1/don-thue/{id}/lich-su` | - | `id` (path*) | - |
| `GET` | `/api/v1/don-thue/{id}/ban-giao` | - | `id` (path*) | - |
| `PUT` | `/api/v1/don-thue/{id}/huy` | - | `id` (path*) | [`string`](#schema-string) |
| `GET` | `/api/v1/van-hanh/don-thue` | - | `MaDon` (query), `TuKhoa` (query), `TuNgay` (query), `DenNgay` (query), `TrangThai` (query), `CanChuanBi` (query), `CanGiao` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `GET` | `/api/v1/van-hanh/don-thue/{id}` | - | `id` (path*) | - |

<a id="tag-geargo"></a>
### 🔹 Nhóm: GearGo (2 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/` | - | - | - |
| `GET` | `/api/test` | - | - | - |

<a id="tag-giothue"></a>
### 🔹 Nhóm: GioThue (6 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/gio-thue` | - | - | - |
| `POST` | `/api/gio-thue/them` | - | - | [`ThemVaoGioRequest`](#schema-themvaogiorequest) |
| `PUT` | `/api/gio-thue/{maChiTiet}/so-luong` | - | `maChiTiet` (path*) | [`CapNhatSoLuongRequest`](#schema-capnhatsoluongrequest) |
| `DELETE` | `/api/gio-thue/{maChiTiet}` | - | `maChiTiet` (path*) | - |
| `PUT` | `/api/gio-thue/thoi-gian` | - | - | [`DatThoiGianRequest`](#schema-datthoigianrequest) |
| `POST` | `/api/gio-thue/ma-giam-gia` | - | - | [`ApKhuyenMaiRequest`](#schema-apkhuyenmairequest) |

<a id="tag-hoso"></a>
### 🔹 Nhóm: HoSo (2 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/ho-so/toi` | - | - | - |
| `PUT` | `/api/v1/ho-so/toi` | - | - | [`CapNhatHoSoRequest`](#schema-capnhathosorequest) |

<a id="tag-nhacungcap"></a>
### 🔹 Nhóm: NhaCungCap (6 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/nha-cung-cap` | - | `tuKhoa` (query), `trangThaiHopTac` (query), `trang` (query), `soMoiTrang` (query) | - |
| `POST` | `/api/nha-cung-cap` | - | - | [`TaoNhaCungCapRequest`](#schema-taonhacungcaprequest) |
| `GET` | `/api/nha-cung-cap/{id}` | - | `id` (path*) | - |
| `PUT` | `/api/nha-cung-cap/{id}` | - | `id` (path*) | [`CapNhatNhaCungCapRequest`](#schema-capnhatnhacungcaprequest) |
| `PUT` | `/api/nha-cung-cap/{id}/trang-thai-hop-tac` | - | `id` (path*) | [`DoiHopTacRequest`](#schema-doihoptacrequest) |
| `GET` | `/api/nha-cung-cap/{id}/lich-su-nhap` | - | `id` (path*), `trang` (query), `soMoiTrang` (query) | - |

<a id="tag-phieunhap"></a>
### 🔹 Nhóm: PhieuNhap (9 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/phieu-nhap` | - | `tuKhoa` (query), `maNhaCungCap` (query), `trangThai` (query), `tuNgay` (query), `denNgay` (query), `trang` (query), `soMoiTrang` (query) | - |
| `POST` | `/api/phieu-nhap` | - | - | [`TaoPhieuNhapRequest`](#schema-taophieunhaprequest) |
| `GET` | `/api/phieu-nhap/{id}` | - | `id` (path*) | - |
| `PUT` | `/api/phieu-nhap/{id}` | - | `id` (path*) | [`CapNhatPhieuNhapRequest`](#schema-capnhatphieunhaprequest) |
| `POST` | `/api/phieu-nhap/{id}/chi-tiet` | - | `id` (path*) | [`DongNhapRequest`](#schema-dongnhaprequest) |
| `PUT` | `/api/phieu-nhap/{id}/chi-tiet/{chiTietId}` | - | `id` (path*), `chiTietId` (path*) | [`DongNhapRequest`](#schema-dongnhaprequest) |
| `DELETE` | `/api/phieu-nhap/{id}/chi-tiet/{chiTietId}` | - | `id` (path*), `chiTietId` (path*) | - |
| `POST` | `/api/phieu-nhap/{id}/huy` | - | `id` (path*) | [`HuyNhapRequest`](#schema-huynhaprequest) |
| `POST` | `/api/phieu-nhap/{id}/xac-nhan` | - | `id` (path*) | [`XacNhanNhapKhoRequest`](#schema-xacnhannhapkhorequest) |

<a id="tag-sanpham"></a>
### 🔹 Nhóm: SanPham (8 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/san-pham` | - | `TuKhoa` (query), `MaDanhMuc` (query), `ThuongHieu` (query), `SucChua` (query), `GiaMin` (query), `GiaMax` (query), `GioNhan` (query), `GioTra` (query), `SapXep` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `GET` | `/api/san-pham/{id}` | - | `id` (path*), `TuKhoa` (query), `MaDanhMuc` (query), `ThuongHieu` (query), `SucChua` (query), `GiaMin` (query), `GiaMax` (query), `GioNhan` (query), `GioTra` (query), `SapXep` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `GET` | `/api/admin/san-pham` | - | `tuKhoa` (query), `trang` (query), `soMoiTrang` (query) | - |
| `POST` | `/api/admin/san-pham` | - | - | [`TaoSanPhamRequest`](#schema-taosanphamrequest) |
| `PUT` | `/api/admin/san-pham/{id}` | - | `id` (path*) | [`CapNhatSanPhamRequest`](#schema-capnhatsanphamrequest) |
| `PATCH` | `/api/admin/san-pham/{id}/trang-thai` | - | `id` (path*) | [`DoiTrangThaiRequest`](#schema-doitrangthairequest) |
| `POST` | `/api/admin/san-pham/{id}/hinh-anh` | - | `id` (path*) | [`object`](#schema-object) |
| `DELETE` | `/api/admin/san-pham/hinh-anh/{maHinhAnh}` | - | `maHinhAnh` (path*) | - |

<a id="tag-thanhtoan"></a>
### 🔹 Nhóm: ThanhToan (1 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `POST` | `/api/v1/thanh-toan/xac-nhan` | - | - | [`XacNhanThanhToanRequest`](#schema-xacnhanthanhtoanrequest) |

<a id="tag-thietbi"></a>
### 🔹 Nhóm: ThietBi (4 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/thiet-bi` | - | `MaHienThi` (query), `MaSanPhamHienTai` (query), `TrangThai` (query), `NguonNhap` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `GET` | `/api/thiet-bi/{id}` | - | `id` (path*) | - |
| `GET` | `/api/thiet-bi/{id}/lich` | - | `id` (path*), `tuNgay` (query), `denNgay` (query) | - |
| `GET` | `/api/thiet-bi/phu-hop` | - | `maChiTietDon` (query) | - |

<a id="tag-thongbao"></a>
### 🔹 Nhóm: ThongBao (2 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/thong-bao` | - | `ChuaDoc` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `POST` | `/api/v1/thong-bao/{id}/da-doc` | - | `id` (path*) | - |

<a id="danh-sach-schemas--models"></a>
## 📦 DANH SÁCH MÔ HÌNH DỮ LIỆU (SCHEMAS / DTOs)

| STT | Tên Schema / Model | Số trường | Chi tiết các trường thuộc tính |
|:---|:---|:---|:---|
<a id="schema-apkhuyenmairequest"></a>
| 1 | **`ApKhuyenMaiRequest`** | 1 | `maGiamGia`: *string* |
<a id="schema-capnhatchitietbangiaorequest"></a>
| 2 | **`CapNhatChiTietBanGiaoRequest`** | 5 | `maPhanCong`: *integer*<br>`tinhTrangTruocThue`: *string*<br>`phuKienThucGiao`: *string*<br>`danhSachAnh`: *string*<br>`ghiChu`: *string* |
<a id="schema-capnhatdanhmucrequest"></a>
| 3 | **`CapNhatDanhMucRequest`** | 5 | `tenDanhMuc`: *string*<br>`maDanhMucCha`: *integer*<br>`moTa`: *string*<br>`thuTuHienThi`: *integer*<br>`trangThai`: *string* |
<a id="schema-capnhathosorequest"></a>
| 4 | **`CapNhatHoSoRequest`** | 6 | `hoTen`: *string*<br>`email`: *string*<br>`soDienThoai`: *string*<br>`diaChi`: *string*<br>`ngaySinh`: *string*<br>`anhDaiDien`: *string* |
<a id="schema-capnhatnhacungcaprequest"></a>
| 5 | **`CapNhatNhaCungCapRequest`** | 8 | `ten`: *string*<br>`nguoiLienHe`: *string*<br>`soDienThoai`: *string*<br>`email`: *string*<br>`diaChi`: *string*<br>`maSoThue`: *string*<br>`ghiChu`: *string*<br>`lyDoThayDoi`: *string* |
<a id="schema-capnhatphieubangiaorequest"></a>
| 6 | **`CapNhatPhieuBanGiaoRequest`** | 5 | `tenNguoiNhanThucTe`: *string*<br>`thoiDiemKhachXacNhan`: *string*<br>`bangChungXacNhan`: *string*<br>`ghiChu`: *string*<br>`chiTiet`: *array* |
<a id="schema-capnhatphieunhaprequest"></a>
| 7 | **`CapNhatPhieuNhapRequest`** | 4 | `maNhaCungCap`: *integer*<br>`ngayNhapDuKien`: *string*<br>`soChungTuNhaCungCap`: *string*<br>`ghiChu`: *string* |
<a id="schema-capnhatsanphamrequest"></a>
| 8 | **`CapNhatSanPhamRequest`** | 12 | `maDanhMuc`: *integer*<br>`maSanPhamHienThi`: *string*<br>`tenSanPham`: *string*<br>`thuongHieu`: *string*<br>`moTa`: *string*<br>`sucChua`: *integer*<br>`kichThuoc`: *string*<br>`thongSo`: *string*<br>`giaThueMoiNgay`: *number*<br>`mucCocMoiThietBi`: *number*<br>`giaTriBoiThuong`: *number*<br>`trangThaiKinhDoanh`: *string* |
<a id="schema-capnhatsoluongrequest"></a>
| 9 | **`CapNhatSoLuongRequest`** | 1 | `soLuongMoi`: *integer* |
<a id="schema-chitietdonthuedto"></a>
| 10 | **`ChiTietDonThueDto`** | 2 | `maSanPham`: *integer*<br>`soLuong`: *integer* |
<a id="schema-chotbangiaorequest"></a>
| 11 | **`ChotBanGiaoRequest`** | 1 | `tenNguoiNhanThucTe`: *string* |
<a id="schema-dangkyrequest"></a>
| 12 | **`DangKyRequest`** | 7 | `email`: *string*<br>`soDienThoai`: *string*<br>`matKhau`: *string*<br>`xacNhanMatKhau`: *string*<br>`hoTen`: *string*<br>`diaChi`: *string*<br>`ngaySinh`: *string* |
<a id="schema-dangnhaprequest"></a>
| 13 | **`DangNhapRequest`** | 2 | `taiKhoan`: *string*<br>`matKhau`: *string* |
<a id="schema-datlaimatkhaurequest"></a>
| 14 | **`DatLaiMatKhauRequest`** | 3 | `token`: *string*<br>`matKhauMoi`: *string*<br>`xacNhanMatKhau`: *string* |
<a id="schema-datthoigianrequest"></a>
| 15 | **`DatThoiGianRequest`** | 2 | `gioNhan`: *string*<br>`gioTra`: *string* |
<a id="schema-doihoptacrequest"></a>
| 16 | **`DoiHopTacRequest`** | 2 | `trangThaiHopTac`: *string*<br>`lyDo`: *string* |
<a id="schema-doitrangthairequest"></a>
| 17 | **`DoiTrangThaiRequest`** | 1 | `trangThaiMoi`: *string* |
<a id="schema-dongnhaprequest"></a>
| 18 | **`DongNhapRequest`** | 5 | `maSanPham`: *integer*<br>`soLuong`: *integer*<br>`donGiaNhap`: *number*<br>`tinhTrangKhiNhap`: *string*<br>`ghiChu`: *string* |
<a id="schema-dongxacnhannhap"></a>
| 19 | **`DongXacNhanNhap`** | 2 | `maChiTietPhieuNhap`: *integer*<br>`thietBi`: *array* |
<a id="schema-ganthietbirequest"></a>
| 20 | **`GanThietBiRequest`** | 2 | `dongDonId`: *integer*<br>`thietBiIds`: *array* |
<a id="schema-huynhaprequest"></a>
| 21 | **`HuyNhapRequest`** | 1 | `lyDo`: *string* |
<a id="schema-huyphancongrequest"></a>
| 22 | **`HuyPhanCongRequest`** | 1 | `lyDo`: *string* |
<a id="schema-quenmatkhaurequest"></a>
| 23 | **`QuenMatKhauRequest`** | 1 | `email`: *string* |
<a id="schema-sapxepsanpham"></a>
| 24 | **`SapXepSanPham`** | 0 | Enum: [0, 1, 2, 3] |
<a id="schema-stringdatetime<>f__anonymoustype50"></a>
| 25 | **`StringDateTime<>f__AnonymousType50`** | 2 | `message`: *string*<br>`timestamp`: *string* |
<a id="schema-stringstring<>f__anonymoustype49"></a>
| 26 | **`StringString<>f__AnonymousType49`** | 2 | `message`: *string*<br>`testEndpoint`: *string* |
<a id="schema-taodanhmucrequest"></a>
| 27 | **`TaoDanhMucRequest`** | 5 | `tenDanhMuc`: *string*<br>`maDanhMucCha`: *integer*<br>`moTa`: *string*<br>`thuTuHienThi`: *integer*<br>`trangThai`: *string* |
<a id="schema-taodonthuerequest"></a>
| 28 | **`TaoDonThueRequest`** | 8 | `maKhachHang`: *integer*<br>`gioNhanDuKien`: *string*<br>`gioTraDuKien`: *string*<br>`tenNguoiNhan`: *string*<br>`soDienThoaiNguoiNhan`: *string*<br>`emailLienHe`: *string*<br>`ghiChu`: *string*<br>`chiTiet`: *array* |
<a id="schema-taonhacungcaprequest"></a>
| 29 | **`TaoNhaCungCapRequest`** | 8 | `maHienThi`: *string*<br>`ten`: *string*<br>`nguoiLienHe`: *string*<br>`soDienThoai`: *string*<br>`email`: *string*<br>`diaChi`: *string*<br>`maSoThue`: *string*<br>`ghiChu`: *string* |
<a id="schema-taophieunhaprequest"></a>
| 30 | **`TaoPhieuNhapRequest`** | 4 | `maNhaCungCap`: *integer*<br>`ngayNhapDuKien`: *string*<br>`soChungTuNhaCungCap`: *string*<br>`ghiChu`: *string* |
<a id="schema-taosanphamrequest"></a>
| 31 | **`TaoSanPhamRequest`** | 12 | `maDanhMuc`: *integer*<br>`maSanPhamHienThi`: *string*<br>`tenSanPham`: *string*<br>`thuongHieu`: *string*<br>`moTa`: *string*<br>`sucChua`: *integer*<br>`kichThuoc`: *string*<br>`thongSo`: *string*<br>`giaThueMoiNgay`: *number*<br>`mucCocMoiThietBi`: *number*<br>`giaTriBoiThuong`: *number*<br>`trangThaiKinhDoanh`: *string* |
<a id="schema-thaytherequest"></a>
| 32 | **`ThayTheRequest`** | 2 | `thietBiMoiId`: *integer*<br>`lyDo`: *string* |
<a id="schema-themvaogiorequest"></a>
| 33 | **`ThemVaoGioRequest`** | 2 | `maSanPham`: *integer*<br>`soLuong`: *integer* |
<a id="schema-thietbinhap"></a>
| 34 | **`ThietBiNhap`** | 7 | `maHienThi`: *string*<br>`tinhTrang`: *string*<br>`phuKien`: *array*<br>`ghiChu`: *string*<br>`canBaoTri`: *boolean*<br>`moTaLoi`: *string*<br>`bangChung`: *string* |
<a id="schema-trangthaiphieunhap"></a>
| 35 | **`TrangThaiPhieuNhap`** | 0 | Enum: [1, 2, 3] |
<a id="schema-xacnhannhapkhorequest"></a>
| 36 | **`XacNhanNhapKhoRequest`** | 2 | `ngayNhapThucTe`: *string*<br>`danhSachDong`: *array* |
<a id="schema-xacnhansansangrequest"></a>
| 37 | **`XacNhanSanSangRequest`** | 1 | `ghiChu`: *string* |
<a id="schema-xacnhanthanhtoanrequest"></a>
| 38 | **`XacNhanThanhToanRequest`** | 4 | `maDonThue`: *integer*<br>`phuongThucThanhToan`: *string*<br>`soTienDaTra`: *number*<br>`maGiaoDichDoiTac`: *string* |
