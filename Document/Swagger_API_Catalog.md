# 📖 TÀI LIỆU TOÀN BỘ 158 API GEARGO (TRÍCH XUẤT TỪ SWAGGER)

> **Dự án:** GearGo (1.0)  
> **Tổng số Endpoint:** 158  
> **Tổng số Schemas / Mô hình DTO:** 60  
> **Trạng thái kiểm thử:** Toàn bộ 158 endpoints hoạt động ổn định (0 lỗi 500)  
> **Thời gian trích xuất:** 16:51:52 17/10/2026

## 📑 MỤC LỤC CÁC NHÓM API

- **[Auth](#tag-auth)** (5 endpoints)
- **[BanGiao](#tag-bangiao)** (14 endpoints)
- **[BaoCaoVanHanh](#tag-baocaovanhanh)** (1 endpoints)
- **[ChuanBiDon](#tag-chuanbidon)** (6 endpoints)
- **[DanhMuc](#tag-danhmuc)** (7 endpoints)
- **[DoiSoat](#tag-doisoat)** (16 endpoints)
- **[DonThue](#tag-donthue)** (14 endpoints)
- **[GearGo](#tag-geargo)** (2 endpoints)
- **[GioThue](#tag-giothue)** (6 endpoints)
- **[HoanTien](#tag-hoantien)** (4 endpoints)
- **[HoSo](#tag-hoso)** (2 endpoints)
- **[NhaCungCap](#tag-nhacungcap)** (6 endpoints)
- **[NhanTra](#tag-nhantra)** (14 endpoints)
- **[PhieuNhap](#tag-phieunhap)** (9 endpoints)
- **[PhuPhi](#tag-phuphi)** (18 endpoints)
- **[QuaHan](#tag-quahan)** (8 endpoints)
- **[SanPham](#tag-sanpham)** (8 endpoints)
- **[ThanhToan](#tag-thanhtoan)** (12 endpoints)
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

<a id="tag-baocaovanhanh"></a>
### 🔹 Nhóm: BaoCaoVanHanh (1 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/admin/bao-cao-van-hanh` | - | `TuNgay` (query), `DenNgay` (query), `MaDanhMuc` (query), `MaSanPham` (query) | - |

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

<a id="tag-doisoat"></a>
### 🔹 Nhóm: DoiSoat (16 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/doi-soat/theo-don/{donId}/xem-truoc` | - | `donId` (path*) | - |
| `GET` | `/api/doi-soat/theo-don/{donId}/xem-truoc` | - | `donId` (path*) | - |
| `GET` | `/api/v1/doi-soat/theo-don/{donId}` | - | `donId` (path*) | - |
| `POST` | `/api/v1/doi-soat/theo-don/{donId}` | - | `donId` (path*) | [`LapDoiSoatRequest`](#schema-lapdoisoatrequest) |
| `GET` | `/api/doi-soat/theo-don/{donId}` | - | `donId` (path*) | - |
| `POST` | `/api/doi-soat/theo-don/{donId}` | - | `donId` (path*) | [`LapDoiSoatRequest`](#schema-lapdoisoatrequest) |
| `GET` | `/api/v1/doi-soat/{id}` | - | `id` (path*) | - |
| `GET` | `/api/doi-soat/{id}` | - | `id` (path*) | - |
| `POST` | `/api/v1/doi-soat/{id}/xac-nhan` | - | `id` (path*) | [`XacNhanDoiSoatRequest`](#schema-xacnhandoisoatrequest) |
| `POST` | `/api/doi-soat/{id}/xac-nhan` | - | `id` (path*) | [`XacNhanDoiSoatRequest`](#schema-xacnhandoisoatrequest) |
| `POST` | `/api/v1/doi-soat/{id}/xu-ly-tien` | - | `id` (path*) | - |
| `POST` | `/api/doi-soat/{id}/xu-ly-tien` | - | `id` (path*) | - |
| `POST` | `/api/v1/doi-soat/{id}/chot` | - | `id` (path*) | - |
| `POST` | `/api/doi-soat/{id}/chot` | - | `id` (path*) | - |
| `POST` | `/api/v1/doi-soat/{id}/dieu-chinh` | - | `id` (path*) | [`DieuChinhDoiSoatRequest`](#schema-dieuchinhdoisoatrequest) |
| `POST` | `/api/doi-soat/{id}/dieu-chinh` | - | `id` (path*) | [`DieuChinhDoiSoatRequest`](#schema-dieuchinhdoisoatrequest) |

<a id="tag-donthue"></a>
### 🔹 Nhóm: DonThue (14 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/don-thue` | - | `MaDon` (query), `TuNgay` (query), `DenNgay` (query), `TrangThai` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `POST` | `/api/v1/don-thue` | - | - | [`TaoDonThueRequest`](#schema-taodonthuerequest) |
| `GET` | `/api/v1/don-thue/{id}` | - | `id` (path*) | - |
| `GET` | `/api/v1/don-thue/{id}/lich-su` | - | `id` (path*) | - |
| `GET` | `/api/v1/don-thue/{id}/ban-giao` | - | `id` (path*) | - |
| `GET` | `/api/v1/don-thue/{id}/huy/xem-truoc` | - | `id` (path*) | - |
| `POST` | `/api/v1/don-thue/{id}/huy` | - | `id` (path*) | [`HuyDonRequest`](#schema-huydonrequest) |
| `PUT` | `/api/v1/don-thue/{id}/huy` | - | `id` (path*) | - |
| `GET` | `/api/v1/van-hanh/don-thue` | - | `MaDon` (query), `TuKhoa` (query), `TuNgay` (query), `DenNgay` (query), `TrangThai` (query), `CanChuanBi` (query), `CanGiao` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `GET` | `/api/v1/van-hanh/don-thue/{id}` | - | `id` (path*) | - |
| `GET` | `/api/v1/van-hanh/don-thue/{id}/cua-hang-huy/xem-truoc` | - | `id` (path*) | - |
| `POST` | `/api/v1/van-hanh/don-thue/{id}/cua-hang-huy` | - | `id` (path*) | [`HuyDonRequest`](#schema-huydonrequest) |
| `GET` | `/api/v1/van-hanh/don-thue/{id}/khong-den-nhan/xem-truoc` | - | `id` (path*) | - |
| `POST` | `/api/v1/van-hanh/don-thue/{id}/khong-den-nhan` | - | `id` (path*) | [`KhongDenNhanRequest`](#schema-khongdennhanrequest) |

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

<a id="tag-hoantien"></a>
### 🔹 Nhóm: HoanTien (4 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/hoan-tien/theo-don/{donId}` | - | `donId` (path*) | - |
| `POST` | `/api/v1/hoan-tien/{id}/xu-ly` | - | `id` (path*) | [`XuLyHoanRequest`](#schema-xulyhoanrequest) |
| `POST` | `/api/v1/hoan-tien/{id}/doi-chieu` | - | `id` (path*) | - |
| `POST` | `/api/v1/hoan-tien/ket-qua` | - | - | [`KetQuaHoanCallbackRequest`](#schema-ketquahoancallbackrequest) |

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

<a id="tag-nhantra"></a>
### 🔹 Nhóm: NhanTra (14 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/nhan-tra/theo-don/{donId}` | - | `donId` (path*) | - |
| `POST` | `/api/v1/nhan-tra/theo-don/{donId}` | - | `donId` (path*) | [`TaoNhanTraRequest`](#schema-taonhantrarequest) |
| `GET` | `/api/nhan-tra/theo-don/{donId}` | - | `donId` (path*) | - |
| `POST` | `/api/nhan-tra/theo-don/{donId}` | - | `donId` (path*) | [`TaoNhanTraRequest`](#schema-taonhantrarequest) |
| `GET` | `/api/v1/nhan-tra/theo-don/{donId}/con-no` | - | `donId` (path*) | - |
| `GET` | `/api/nhan-tra/theo-don/{donId}/con-no` | - | `donId` (path*) | - |
| `PUT` | `/api/v1/nhan-tra/{phieuId}` | - | `phieuId` (path*) | [`CapNhatPhieuNhanTraRequest`](#schema-capnhatphieunhantrarequest) |
| `PUT` | `/api/nhan-tra/{phieuId}` | - | `phieuId` (path*) | [`CapNhatPhieuNhanTraRequest`](#schema-capnhatphieunhantrarequest) |
| `POST` | `/api/v1/nhan-tra/{phieuId}/tach-cho-xu-ly` | - | `phieuId` (path*) | [`TachDongChoXuLyRequest`](#schema-tachdongchoxulyrequest) |
| `POST` | `/api/nhan-tra/{phieuId}/tach-cho-xu-ly` | - | `phieuId` (path*) | [`TachDongChoXuLyRequest`](#schema-tachdongchoxulyrequest) |
| `POST` | `/api/v1/nhan-tra/{phieuId}/chi-tiet/{chiTietId}/duyet-mat` | - | `phieuId` (path*), `chiTietId` (path*) | [`DuyetMatRequest`](#schema-duyetmatrequest) |
| `POST` | `/api/nhan-tra/{phieuId}/chi-tiet/{chiTietId}/duyet-mat` | - | `phieuId` (path*), `chiTietId` (path*) | [`DuyetMatRequest`](#schema-duyetmatrequest) |
| `POST` | `/api/v1/nhan-tra/{phieuId}/chot` | - | `phieuId` (path*) | - |
| `POST` | `/api/nhan-tra/{phieuId}/chot` | - | `phieuId` (path*) | - |

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

<a id="tag-phuphi"></a>
### 🔹 Nhóm: PhuPhi (18 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/phu-phi/theo-don/{donId}` | - | `donId` (path*) | - |
| `GET` | `/api/phu-phi/theo-don/{donId}` | - | `donId` (path*) | - |
| `GET` | `/api/v1/phu-phi/goi-y` | - | `maChiTietBanGiao` (query) | - |
| `GET` | `/api/phu-phi/goi-y` | - | `maChiTietBanGiao` (query) | - |
| `POST` | `/api/v1/phu-phi` | - | - | [`LapPhuPhiRequest`](#schema-lapphuphirequest) |
| `POST` | `/api/phu-phi` | - | - | [`LapPhuPhiRequest`](#schema-lapphuphirequest) |
| `PUT` | `/api/v1/phu-phi/{id}` | - | `id` (path*) | [`CapNhatPhuPhiRequest`](#schema-capnhatphuphirequest) |
| `PUT` | `/api/phu-phi/{id}` | - | `id` (path*) | [`CapNhatPhuPhiRequest`](#schema-capnhatphuphirequest) |
| `POST` | `/api/v1/phu-phi/{id}/duyet` | - | `id` (path*) | [`DuyetPhuPhiRequest`](#schema-duyetphuphirequest) |
| `POST` | `/api/phu-phi/{id}/duyet` | - | `id` (path*) | [`DuyetPhuPhiRequest`](#schema-duyetphuphirequest) |
| `POST` | `/api/v1/phu-phi/{id}/tu-choi` | - | `id` (path*) | [`DuyetPhuPhiRequest`](#schema-duyetphuphirequest) |
| `POST` | `/api/phu-phi/{id}/tu-choi` | - | `id` (path*) | [`DuyetPhuPhiRequest`](#schema-duyetphuphirequest) |
| `POST` | `/api/v1/phu-phi/{id}/tranh-chap` | - | `id` (path*) | [`TranhChapRequest`](#schema-tranhchaprequest) |
| `POST` | `/api/phu-phi/{id}/tranh-chap` | - | `id` (path*) | [`TranhChapRequest`](#schema-tranhchaprequest) |
| `POST` | `/api/v1/phu-phi/{id}/giai-quyet-tranh-chap` | - | `id` (path*) | [`GiaiQuyetTranhChapRequest`](#schema-giaiquyettranhchaprequest) |
| `POST` | `/api/phu-phi/{id}/giai-quyet-tranh-chap` | - | `id` (path*) | [`GiaiQuyetTranhChapRequest`](#schema-giaiquyettranhchaprequest) |
| `POST` | `/api/v1/phu-phi/{id}/dieu-chinh` | - | `id` (path*) | [`DieuChinhPhiRequest`](#schema-dieuchinhphirequest) |
| `POST` | `/api/phu-phi/{id}/dieu-chinh` | - | `id` (path*) | [`DieuChinhPhiRequest`](#schema-dieuchinhphirequest) |

<a id="tag-quahan"></a>
### 🔹 Nhóm: QuaHan (8 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/qua-han` | - | `DenThoiDiem` (query), `MaDon` (query), `MaSanPham` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `GET` | `/api/qua-han` | - | `DenThoiDiem` (query), `MaDon` (query), `MaSanPham` (query), `Trang` (query), `SoMoiTrang` (query) | - |
| `GET` | `/api/v1/qua-han/{donId}` | - | `donId` (path*) | - |
| `GET` | `/api/qua-han/{donId}` | - | `donId` (path*) | - |
| `GET` | `/api/v1/qua-han/{donId}/don-bi-anh-huong` | - | `donId` (path*) | - |
| `GET` | `/api/qua-han/{donId}/don-bi-anh-huong` | - | `donId` (path*) | - |
| `POST` | `/api/v1/qua-han/quet-nhac` | - | `mocQuet` (query) | - |
| `POST` | `/api/qua-han/quet-nhac` | - | `mocQuet` (query) | - |

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
### 🔹 Nhóm: ThanhToan (12 endpoints)

| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |
|:---|:---|:---|:---|:---|
| `POST` | `/api/v1/thanh-toan/xac-nhan` | - | - | [`XacNhanThanhToanRequest`](#schema-xacnhanthanhtoanrequest) |
| `POST` | `/api/thanh-toan/xac-nhan` | - | - | [`XacNhanThanhToanRequest`](#schema-xacnhanthanhtoanrequest) |
| `POST` | `/api/v1/thanh-toan/doi-soat/{doiSoatId}/thu-bo-sung` | - | `doiSoatId` (path*) | [`TaoThuBoSungRequest`](#schema-taothubosungrequest) |
| `POST` | `/api/thanh-toan/doi-soat/{doiSoatId}/thu-bo-sung` | - | `doiSoatId` (path*) | [`TaoThuBoSungRequest`](#schema-taothubosungrequest) |
| `GET` | `/api/v1/thanh-toan/{id}/trang-thai` | - | `id` (path*) | - |
| `GET` | `/api/thanh-toan/{id}/trang-thai` | - | `id` (path*) | - |
| `POST` | `/api/v1/thanh-toan/callback/thu-bo-sung` | - | - | [`XuLyCallbackRequest`](#schema-xulycallbackrequest) |
| `POST` | `/api/thanh-toan/callback/thu-bo-sung` | - | - | [`XuLyCallbackRequest`](#schema-xulycallbackrequest) |
| `GET` | `/api/v1/thanh-toan/can-doi-chieu` | - | - | - |
| `GET` | `/api/thanh-toan/can-doi-chieu` | - | - | - |
| `POST` | `/api/v1/thanh-toan/{id}/doi-chieu` | - | `id` (path*) | [`DoiChieuGiaoDichRequest`](#schema-doichieugiaodichrequest) |
| `POST` | `/api/thanh-toan/{id}/doi-chieu` | - | `id` (path*) | [`DoiChieuGiaoDichRequest`](#schema-doichieugiaodichrequest) |

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
<a id="schema-capnhatphieunhantrarequest"></a>
| 7 | **`CapNhatPhieuNhanTraRequest`** | 2 | `danhSachDong`: *array*<br>`ghiChu`: *string* |
<a id="schema-capnhatphieunhaprequest"></a>
| 8 | **`CapNhatPhieuNhapRequest`** | 4 | `maNhaCungCap`: *integer*<br>`ngayNhapDuKien`: *string*<br>`soChungTuNhaCungCap`: *string*<br>`ghiChu`: *string* |
<a id="schema-capnhatphuphirequest"></a>
| 9 | **`CapNhatPhuPhiRequest`** | 3 | `soTien`: *number*<br>`lyDo`: *string*<br>`danhSachAnh`: *array* |
<a id="schema-capnhatsanphamrequest"></a>
| 10 | **`CapNhatSanPhamRequest`** | 12 | `maDanhMuc`: *integer*<br>`maSanPhamHienThi`: *string*<br>`tenSanPham`: *string*<br>`thuongHieu`: *string*<br>`moTa`: *string*<br>`sucChua`: *integer*<br>`kichThuoc`: *string*<br>`thongSo`: *string*<br>`giaThueMoiNgay`: *number*<br>`mucCocMoiThietBi`: *number*<br>`giaTriBoiThuong`: *number*<br>`trangThaiKinhDoanh`: *string* |
<a id="schema-capnhatsoluongrequest"></a>
| 11 | **`CapNhatSoLuongRequest`** | 1 | `soLuongMoi`: *integer* |
<a id="schema-chitietdonthuedto"></a>
| 12 | **`ChiTietDonThueDto`** | 2 | `maSanPham`: *integer*<br>`soLuong`: *integer* |
<a id="schema-chotbangiaorequest"></a>
| 13 | **`ChotBanGiaoRequest`** | 1 | `tenNguoiNhanThucTe`: *string* |
<a id="schema-dangkyrequest"></a>
| 14 | **`DangKyRequest`** | 7 | `email`: *string*<br>`soDienThoai`: *string*<br>`matKhau`: *string*<br>`xacNhanMatKhau`: *string*<br>`hoTen`: *string*<br>`diaChi`: *string*<br>`ngaySinh`: *string* |
<a id="schema-dangnhaprequest"></a>
| 15 | **`DangNhapRequest`** | 2 | `taiKhoan`: *string*<br>`matKhau`: *string* |
<a id="schema-datlaimatkhaurequest"></a>
| 16 | **`DatLaiMatKhauRequest`** | 3 | `token`: *string*<br>`matKhauMoi`: *string*<br>`xacNhanMatKhau`: *string* |
<a id="schema-datthoigianrequest"></a>
| 17 | **`DatThoiGianRequest`** | 2 | `gioNhan`: *string*<br>`gioTra`: *string* |
<a id="schema-dieuchinhdoisoatrequest"></a>
| 18 | **`DieuChinhDoiSoatRequest`** | 2 | `danhSachMaPhuPhiDieuChinh`: *array*<br>`lyDo`: *string* |
<a id="schema-dieuchinhphirequest"></a>
| 19 | **`DieuChinhPhiRequest`** | 3 | `soTienDieuChinhCoDau`: *number*<br>`lyDo`: *string*<br>`danhSachAnh`: *array* |
<a id="schema-doichieugiaodichrequest"></a>
| 20 | **`DoiChieuGiaoDichRequest`** | 3 | `ketLuan`: *string*<br>`ghiChu`: *string*<br>`soTienHoan`: *number* |
<a id="schema-doihoptacrequest"></a>
| 21 | **`DoiHopTacRequest`** | 2 | `trangThaiHopTac`: *string*<br>`lyDo`: *string* |
<a id="schema-doitrangthairequest"></a>
| 22 | **`DoiTrangThaiRequest`** | 1 | `trangThaiMoi`: *string* |
<a id="schema-dongnhantrarequest"></a>
| 23 | **`DongNhanTraRequest`** | 9 | `maChiTietBanGiao`: *integer*<br>`thoiDiemTraThucTe`: *string*<br>`ketLuan`: *string*<br>`tinhTrangSauThue`: *string*<br>`phuKienThucNhan`: *array*<br>`phuKienConThieu`: *array*<br>`danhSachAnh`: *array*<br>`bienBanMat`: *string*<br>`ghiChu`: *string* |
<a id="schema-dongnhaprequest"></a>
| 24 | **`DongNhapRequest`** | 5 | `maSanPham`: *integer*<br>`soLuong`: *integer*<br>`donGiaNhap`: *number*<br>`tinhTrangKhiNhap`: *string*<br>`ghiChu`: *string* |
<a id="schema-dongxacnhannhap"></a>
| 25 | **`DongXacNhanNhap`** | 2 | `maChiTietPhieuNhap`: *integer*<br>`thietBi`: *array* |
<a id="schema-duyetmatrequest"></a>
| 26 | **`DuyetMatRequest`** | 3 | `lyDo`: *string*<br>`bienBanMat`: *string*<br>`maPhuPhiBoiThuong`: *integer* |
<a id="schema-duyetphuphirequest"></a>
| 27 | **`DuyetPhuPhiRequest`** | 2 | `ketQua`: *string*<br>`lyDo`: *string* |
<a id="schema-ganthietbirequest"></a>
| 28 | **`GanThietBiRequest`** | 2 | `dongDonId`: *integer*<br>`thietBiIds`: *array* |
<a id="schema-giaiquyettranhchaprequest"></a>
| 29 | **`GiaiQuyetTranhChapRequest`** | 3 | `ketQua`: *string*<br>`lyDo`: *string*<br>`soTienDeXuatSauXuLy`: *number* |
<a id="schema-huydonrequest"></a>
| 30 | **`HuyDonRequest`** | 3 | `lyDo`: *string*<br>`xacNhanChiPhi`: *boolean*<br>`dauVanTayXemTruoc`: *string* |
<a id="schema-huynhaprequest"></a>
| 31 | **`HuyNhapRequest`** | 1 | `lyDo`: *string* |
<a id="schema-huyphancongrequest"></a>
| 32 | **`HuyPhanCongRequest`** | 1 | `lyDo`: *string* |
<a id="schema-ketquahoancallbackrequest"></a>
| 33 | **`KetQuaHoanCallbackRequest`** | 6 | `maYeuCau`: *string*<br>`maGiaoDichHoanCong`: *string*<br>`soTien`: *number*<br>`trangThai`: *string*<br>`thoiDiem`: *string*<br>`chuKy`: *string* |
<a id="schema-khongdennhanrequest"></a>
| 34 | **`KhongDenNhanRequest`** | 5 | `ghiChu`: *string*<br>`bangChung`: *string*<br>`xuLyHuy`: *boolean*<br>`xacNhanChiPhi`: *boolean*<br>`dauVanTayXemTruoc`: *string* |
<a id="schema-lapdoisoatrequest"></a>
| 35 | **`LapDoiSoatRequest`** | 2 | `maDonThue`: *integer*<br>`ghiChu`: *string* |
<a id="schema-lapphuphirequest"></a>
| 36 | **`LapPhuPhiRequest`** | 6 | `maDonThue`: *integer*<br>`maChiTietBanGiao`: *integer*<br>`loaiPhi`: *string*<br>`soTienDeNghi`: *number*<br>`lyDo`: *string*<br>`danhSachAnh`: *array* |
<a id="schema-phukienitemdto"></a>
| 37 | **`PhuKienItemDto`** | 2 | `ten`: *string*<br>`soLuong`: *integer* |
<a id="schema-quenmatkhaurequest"></a>
| 38 | **`QuenMatKhauRequest`** | 1 | `email`: *string* |
<a id="schema-sapxepsanpham"></a>
| 39 | **`SapXepSanPham`** | 0 | Enum: [0, 1, 2, 3] |
<a id="schema-stringdatetime<>f__anonymoustype56"></a>
| 40 | **`StringDateTime<>f__AnonymousType56`** | 2 | `message`: *string*<br>`timestamp`: *string* |
<a id="schema-stringstring<>f__anonymoustype55"></a>
| 41 | **`StringString<>f__AnonymousType55`** | 2 | `message`: *string*<br>`testEndpoint`: *string* |
<a id="schema-tachdongchoxulyrequest"></a>
| 42 | **`TachDongChoXuLyRequest`** | 2 | `danhSachChiTietNhanTra`: *array*<br>`lyDo`: *string* |
<a id="schema-taodanhmucrequest"></a>
| 43 | **`TaoDanhMucRequest`** | 5 | `tenDanhMuc`: *string*<br>`maDanhMucCha`: *integer*<br>`moTa`: *string*<br>`thuTuHienThi`: *integer*<br>`trangThai`: *string* |
<a id="schema-taodonthuerequest"></a>
| 44 | **`TaoDonThueRequest`** | 10 | `maKhachHang`: *integer*<br>`gioNhanDuKien`: *string*<br>`gioTraDuKien`: *string*<br>`tenNguoiNhan`: *string*<br>`soDienThoaiNguoiNhan`: *string*<br>`emailLienHe`: *string*<br>`ghiChu`: *string*<br>`diaChiNhanHang`: *string*<br>`maKhuyenMai`: *string*<br>`chiTiet`: *array* |
<a id="schema-taonhacungcaprequest"></a>
| 45 | **`TaoNhaCungCapRequest`** | 8 | `maHienThi`: *string*<br>`ten`: *string*<br>`nguoiLienHe`: *string*<br>`soDienThoai`: *string*<br>`email`: *string*<br>`diaChi`: *string*<br>`maSoThue`: *string*<br>`ghiChu`: *string* |
<a id="schema-taonhantrarequest"></a>
| 46 | **`TaoNhanTraRequest`** | 2 | `danhSachChiTietBanGiao`: *array*<br>`ghiChu`: *string* |
<a id="schema-taophieunhaprequest"></a>
| 47 | **`TaoPhieuNhapRequest`** | 4 | `maNhaCungCap`: *integer*<br>`ngayNhapDuKien`: *string*<br>`soChungTuNhaCungCap`: *string*<br>`ghiChu`: *string* |
<a id="schema-taosanphamrequest"></a>
| 48 | **`TaoSanPhamRequest`** | 12 | `maDanhMuc`: *integer*<br>`maSanPhamHienThi`: *string*<br>`tenSanPham`: *string*<br>`thuongHieu`: *string*<br>`moTa`: *string*<br>`sucChua`: *integer*<br>`kichThuoc`: *string*<br>`thongSo`: *string*<br>`giaThueMoiNgay`: *number*<br>`mucCocMoiThietBi`: *number*<br>`giaTriBoiThuong`: *number*<br>`trangThaiKinhDoanh`: *string* |
<a id="schema-taothubosungrequest"></a>
| 49 | **`TaoThuBoSungRequest`** | 2 | `maDoiSoat`: *integer*<br>`phuongThucDuocHoTro`: *string* |
<a id="schema-thaytherequest"></a>
| 50 | **`ThayTheRequest`** | 2 | `thietBiMoiId`: *integer*<br>`lyDo`: *string* |
<a id="schema-themvaogiorequest"></a>
| 51 | **`ThemVaoGioRequest`** | 2 | `maSanPham`: *integer*<br>`soLuong`: *integer* |
<a id="schema-thietbinhap"></a>
| 52 | **`ThietBiNhap`** | 7 | `maHienThi`: *string*<br>`tinhTrang`: *string*<br>`phuKien`: *array*<br>`ghiChu`: *string*<br>`canBaoTri`: *boolean*<br>`moTaLoi`: *string*<br>`bangChung`: *string* |
<a id="schema-trangthaiphieunhap"></a>
| 53 | **`TrangThaiPhieuNhap`** | 0 | Enum: [1, 2, 3] |
<a id="schema-tranhchaprequest"></a>
| 54 | **`TranhChapRequest`** | 2 | `noiDung`: *string*<br>`danhSachAnh`: *array* |
<a id="schema-xacnhandoisoatrequest"></a>
| 55 | **`XacNhanDoiSoatRequest`** | 3 | `dauVanTayBangTinh`: *string*<br>`xacNhan`: *boolean*<br>`ghiChu`: *string* |
<a id="schema-xacnhannhapkhorequest"></a>
| 56 | **`XacNhanNhapKhoRequest`** | 2 | `ngayNhapThucTe`: *string*<br>`danhSachDong`: *array* |
<a id="schema-xacnhansansangrequest"></a>
| 57 | **`XacNhanSanSangRequest`** | 1 | `ghiChu`: *string* |
<a id="schema-xacnhanthanhtoanrequest"></a>
| 58 | **`XacNhanThanhToanRequest`** | 4 | `maDonThue`: *integer*<br>`phuongThucThanhToan`: *string*<br>`soTienDaTra`: *number*<br>`maGiaoDichDoiTac`: *string* |
<a id="schema-xulycallbackrequest"></a>
| 59 | **`XuLyCallbackRequest`** | 6 | `maYeuCau`: *string*<br>`maGiaoDichCong`: *string*<br>`soTien`: *number*<br>`trangThai`: *string*<br>`phuongThuc`: *string*<br>`signature`: *string* |
<a id="schema-xulyhoanrequest"></a>
| 60 | **`XuLyHoanRequest`** | 1 | `ghiChuXuLy`: *string* |
