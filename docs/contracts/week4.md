# Contract Week 4 — phần Thanh Tùng (W4-T6, W4-T7, W4-T9)

Mọi lỗi nghiệp vụ trả JSON `{ "maLoi", "thongDiep", "chiTiet" }` qua `ExceptionHandlingMiddleware`.
Danh tính luôn lấy từ JWT (claim `MaTaiKhoan`) và **vai trò/trạng thái hiện tại trong database** (`ActorGuard`).
Giờ nghiệp vụ lấy qua `TimeProvider` (DI singleton) để kiểm thử được các mốc 24/48 giờ.

## 1. Bảng module

| Service | Chủ | Interface | Bên gọi | Route / quyền | Mã lỗi |
|---|---|---|---|---|---|
| HoanTienService | Thanh Tùng | `IHoanTienService` | `HoanTienController`, `HuyDonService`; **Kim Xuyến** (đối soát), **Minh Tú** (thu thừa/thu muộn) | mục 3 | NGUON_HOAN_KHONG_HOP_LE(409), VUOT_HAN_MUC_HOAN(409), HOAN_CHUA_RO_KET_QUA(409), KET_QUA_HOAN_KHONG_KHOP(400), HOAN_TIEN_KHONG_TIM_THAY(404) |
| HuyDonService | Thanh Tùng | `IHuyDonService` | `DonThueController`, `VanHanh/DonThueController` | mục 3 | DON_DA_BAN_GIAO(409), CHI_PHI_HUY_DA_THAY_DOI(409), KHONG_CO_QUYEN_HUY(403), CHINH_SACH_HUY_CHUA_DU(409), DON_DA_HUY_KHAC_Y_DINH(409), DON_KHONG_TIM_THAY(404) |
| TruyVanDonThueService (mở rộng) | Thanh Tùng | `ITruyVanDonThueService` | controller đơn khách/vận hành | như W3, thêm `taiChinh` | như W3 |
| ThongBaoService (mở rộng) | Thanh Tùng | `IThongBaoService.TaoThongBaoSuKienAsync` | mọi service Week 4 | nội bộ | SU_KIEN_KHONG_HOP_LE(400), XUNG_DOT_SU_KIEN(409) |
| Refund adapter | Thanh Tùng (mock) | `Integrations/Payments/IRefundGateway` | chỉ `HoanTienService` | — | — |

DI trong `Program.cs`: `TimeProvider.System`, `MockRefundGatewayOptions` (section `Payments:MockRefund`), `IRefundGateway → MockRefundGateway` (singleton), `IHoanTienService`, `IHuyDonService`, hosted `HoanTienDoiChieuJob`.

## 2. Hoàn tiền dùng chung (W4-T6) — dành cho Kim Xuyến, Minh Tú

### 2.1 Giá trị chuỗi (`Models/Enums/HangSoTaiChinh.cs`)

| Cột | Giá trị |
|---|---|
| `HOAN_TIEN.trang_thai` | `ChoXuLy` (intent đã lưu, chưa gửi) · `DangXuLy` (đã gửi) · `ChuaRoKetQua` (timeout) · `ThanhCong` · `ThatBai` (gateway xác nhận không hoàn) |
| `HOAN_TIEN.loai_hoan` | `HoanCocDoiSoat` (bắt buộc `maDoiSoat`, nguồn `TienCoc`) · `HoanHuyTienThue` (nguồn `TienThue`) · `HoanHuyTienCoc` (nguồn `TienCoc`) · `HoanThuThua` (mọi mục đích) |
| `CHI_TIET_THANH_TOAN.muc_dich` | `TienThue` · `TienCoc` · `ThuBoSung` |
| `HOAN_TIEN.ma_yeu_cau` | `HT:{khoaNghiaVu}:{maChiTietThanhToanGoc}:L{lanThu}` — ổn định, unique |

**Giữ hạn mức:** `ChoXuLy`, `DangXuLy`, `ChuaRoKetQua` đều giữ tiền của nguồn. Chỉ `ThatBai` giải phóng.
Mỗi nguồn: `thựcThu − đãHoànThànhCông − đangGiữ ≥ yêuCầuMới`, tính trên **mọi loại hoàn** của nguồn.

### 2.2 Lập yêu cầu (trong transaction của bên gọi)

```csharp
await using var tx = await _context.Database.BeginTransactionAsync();
// ... khóa đơn/đối soát của mình trước (thứ tự: đơn → nguồn thu)
var rows = await _hoanTien.LapYeuCauHoanAsync(new LapHoanCommand(
    MaDonThue: don.MaDonThue,
    LoaiHoan: LoaiHoanTien.HoanCocDoiSoat,
    KhoaNghiaVu: $"DS:{doiSoat.MaDoiSoat}",        // ổn định theo nghĩa vụ; gọi lại trả bộ cũ
    TongSoTien: doiSoat.SoTienCanHoan,              // server tính, > 0 (không lập khoản 0đ)
    NguonUngVien: cacChiTietThuCoc,                 // phân bổ theo mã tăng dần
    MaDoiSoat: doiSoat.MaDoiSoat,
    LyDo: "Hoàn cọc theo đối soát"), maTaiKhoanThucHien);
await _context.SaveChangesAsync();
await tx.CommitAsync();
await _hoanTien.GuiYeuCauDaLapAsync(rows.Select(r => r.MaHoanTien), maNhanVien); // SAU commit
```

- Không có transaction → `InvalidOperationException` (lỗi lập trình).
- Khóa từng nguồn bằng `UPDATE ... SET so_tien = so_tien` theo mã tăng dần → hai yêu cầu đồng thời trên cùng nguồn được tuần tự hóa.
- Nguồn chưa `ThanhCong` / khác đơn / sai mục đích → `NGUON_HOAN_KHONG_HOP_LE`. Vượt hạn mức → `VUOT_HAN_MUC_HOAN`, `chiTiet.nguon[]` có `thucThu, daHoanThanhCong, dangGiu, conCoTheLap`.
- Gọi lại cùng `KhoaNghiaVu` với cùng tổng → trả bộ cũ; khác tổng → `NGUON_HOAN_KHONG_HOP_LE` (phải lập nghĩa vụ điều chỉnh với khóa mới, vd. `DS:{maDoiSoatDieuChinh}`).
- Điều chỉnh giảm phí sau khi đã hoàn 800k (ví dụ 13.2): đối soát điều chỉnh lập khóa mới với **chỉ phần chênh lệch** (50k).
- `LayHanMucNguonAsync(maChiTietThanhToan)` để xem trước, không khóa.
- Callback/kết quả hoàn **không gọi ngược** DoiSoatService; đối soát đọc trạng thái `HOAN_TIEN` (hoặc `TongHopTheoDonAsync(...).NghiaVu`) để quyết định chốt.

### 2.3 Kết quả và phục hồi

| Tình huống | Hành vi |
|---|---|
| Gửi xong, gateway trả ThanhCong/ThatBai | Ghi qua cùng handler với callback |
| Timeout / lỗi adapter | `ChuaRoKetQua`, vẫn giữ hạn mức; `POST xu-ly` trả 409 `HOAN_CHUA_RO_KET_QUA` |
| Đối chiếu (`POST doi-chieu`, job) | Tra cứu **cùng mã**. `KhongTimThay` → về `ChoXuLy`, gửi lại cùng mã |
| Callback thành công lặp | Giữ thời điểm/mã thành công đầu, không thông báo lại |
| Thất bại cũ đến sau thành công | Giữ `ThanhCong`, ghi `NHAT_KY_THAO_TAC.MAU_THUAN_KET_QUA_HOAN` |
| Số tiền kết quả ≠ yêu cầu | 400 `KET_QUA_HOAN_KHONG_KHOP`, ghi `KET_QUA_HOAN_SAI_SO_TIEN`, không đổi trạng thái |
| `POST xu-ly` trên khoản `ThatBai` | Lập lần thử mới `...:L{n+1}` (kiểm tra lại hạn mức); bấm lại trả lần thử đang có |
| Khởi động lại | `HoanTienDoiChieuJob` mỗi phút: gửi `ChoXuLy` cũ > 2 phút, đối chiếu `DangXuLy/ChuaRoKetQua` cũ > 2 phút |

Nghĩa vụ chia nhiều nguồn chỉ `daHoanThanh = true` khi mọi phần (lần thử mới nhất) đều `ThanhCong`.

### 2.4 Callback gateway

`POST /api/v1/hoan-tien/ket-qua` (không JWT). Body `{maYeuCau, maGiaoDichHoanCong?, soTien, trangThai: ThanhCong|ThatBai|DangXuLy, thoiDiem?, chuKy}`.
`chuKy` = HMAC-SHA256 (hex thường) của `"{maYeuCau}|{maGiaoDichHoanCong}|{soTien VND nguyên}|{trangThai}"` với `Payments:MockRefund:SecretKey`.
Response tối thiểu `{daNhan, maYeuCau, trangThai}`.

## 3. Endpoint

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/don-thue/{id}/huy/xem-truoc` | KhachHang (chủ đơn) | `XemTruocHuyResponse`; `coTheHuy=false` + lý do nếu đã bàn giao/đã hủy/thu chưa phân loại |
| POST | `/api/v1/don-thue/{id}/huy` | KhachHang (chủ đơn) | Body `{lyDo, xacNhanChiPhi, dauVanTayXemTruoc}` → `HuyDonResponse` |
| PUT | `/api/v1/don-thue/{id}/huy` | KhachHang (chủ đơn) | Tuần 2, body là chuỗi lý do. Nay qua `HuyDonService`; đơn đã thu tiền → 409 kèm bảng |
| GET | `/api/v1/van-hanh/don-thue/{id}/cua-hang-huy/xem-truoc` | QuanTriVien | |
| POST | `/api/v1/van-hanh/don-thue/{id}/cua-hang-huy` | QuanTriVien | Hoàn toàn bộ thuê + cọc đã thu |
| GET | `/api/v1/van-hanh/don-thue/{id}/khong-den-nhan/xem-truoc` | NhanVien, QuanTriVien | Bảng nếu xử lý theo chính sách không đến nhận |
| POST | `/api/v1/van-hanh/don-thue/{id}/khong-den-nhan` | NhanVien ghi nhận; QuanTriVien `xuLyHuy=true` | Body `{ghiChu, bangChung?, xuLyHuy, xacNhanChiPhi, dauVanTayXemTruoc}` → `KhongDenNhanResponse` |
| GET | `/api/v1/hoan-tien/theo-don/{donId}` | Chủ đơn hoặc NhanVien/QuanTriVien | `HoanTienTheoDonResponse` (khách không thấy `maGiaoDichHoanCong`) |
| POST | `/api/v1/hoan-tien/{id}/xu-ly` | NhanVien, QuanTriVien | Body `{ghiChuXuLy?}`; không nhận số tiền/nguồn |
| POST | `/api/v1/hoan-tien/{id}/doi-chieu` | NhanVien, QuanTriVien | |
| POST | `/api/v1/hoan-tien/ket-qua` | Callback có chữ ký | mục 2.4 |

Đơn không tồn tại và đơn của khách khác đều 404 `DON_KHONG_TIM_THAY` (giữ chuẩn W3, không lộ sự tồn tại).
`KHONG_CO_QUYEN_HUY` (403) dùng khi khách chọn loại hủy vận hành, nhân viên hủy thay khách, hoặc nhân viên gửi `xuLyHuy=true`.

## 4. Hủy đơn (W4-T7)

### 4.1 Chính sách (`CHINH_SACH.noi_dung_chinh_sach`, đọc theo `DON_THUE.ma_chinh_sach`)

```json
{
  "huyDon":       { "tyLeGiuLaiTu24Den48Gio": 0.5, "tyLeGiuLaiDuoi24Gio": 1.0 },
  "khongDenNhan": { "soPhutChoSauGioNhan": 120, "tyLeGiuLaiTienThue": 1.0 }
}
```

Tỷ lệ 0..1 trên tiền thuê sau giảm đã thu. Mốc 24/48 giờ cố định theo đặc tả. **Thiếu khóa cho nhánh cần dùng → 409 `CHINH_SACH_HUY_CHUA_DU`**, code không tự đặt 30%/50%.
Các con số trên chỉ là dữ liệu kiểm tra; W6-T1 (chính sách theo phiên bản) phải giữ các khóa này.

| Nhánh (`nhanhChinhSach`) | Điều kiện (`gioNhanDuKien − now`) | Tiền thuê giữ lại |
|---|---|---|
| `ChuaThanhToan` | chưa có tiền thu hợp lệ | 0, không lập hoàn |
| `Tren48Gio` | > 48h | 0 |
| `Tu24Den48Gio` | 24h ≤ x ≤ 48h (gồm hai mốc) | `tyLeGiuLaiTu24Den48Gio` |
| `Duoi24Gio` | < 24h (kể cả đã quá giờ nhận nhưng chưa bàn giao) | `tyLeGiuLaiDuoi24Gio` |
| `CuaHangHuy` | quản trị viên | 0 |
| `KhongDenNhan` | quản trị viên, sau `gioNhan + soPhutChoSauGioNhan` | `khongDenNhan.tyLeGiuLaiTienThue` |

Cọc trước bàn giao luôn hoàn đủ. Tiền thu vượt nghĩa vụ đơn (`tienThuVuotChuaXuLy`) **không** vào bảng hủy — đi luồng thu thừa W4-T8 của Minh Tú.
Đơn có thu thành công chưa tách `TienThue/TienCoc` → không cho hủy (`NGUON_HOAN_KHONG_HOP_LE`) cho tới khi đối chiếu thanh toán.

### 4.2 Xác nhận bảng

- `dauVanTay` = SHA-256 (16 hex) trên đơn, trạng thái, loại hủy, nhánh và các số tiền — **không** chứa thời điểm.
- Bảng có tiền giữ lại/hoàn: bắt buộc `xacNhanChiPhi=true` và `dauVanTayXemTruoc` khớp bảng tính lại lúc ghi; ngược lại 409 `CHI_PHI_HUY_DA_THAY_DOI` với `chiTiet` là bảng mới.
- Đơn chưa thu tiền: chỉ cần `lyDo`.

### 4.3 Transaction hủy (một commit)

Khóa `DON_THUE` (`UPDATE ... SET trang_thai = trang_thai`) → đọc lại trạng thái + phiếu bàn giao → tính bảng → ghi `KhachHuy|CuaHangHuy`, `ma_nguoi_huy` (MaTaiKhoan), `thoi_diem_huy`, `ly_do_huy`, `tien_thue_giu_lai_khi_huy` → `GIU_CHO` → `DaGiaiPhong` → `PHAN_CONG_THIET_BI` `DaPhanCong` → `DaHuy` (người/thời điểm/lý do) → `PHIEU_BAN_GIAO` nháp → `DaHuy` → `LUOT_SU_DUNG_KHUYEN_MAI` `DangGiu` → `DaGiaiPhong` (lượt `DaSuDung` giữ nguyên) → `LapYeuCauHoanAsync` cho `HUY:{don}:THUE` và `HUY:{don}:COC` → lịch sử + nhật ký + thông báo → commit → gửi hoàn.

- Bấm lại cùng quyết định (cùng trạng thái đích, cùng người hủy) → trả kết quả cũ, không thêm bộ hoàn. Quyết định khác → 409 `DON_DA_HUY_KHAC_Y_DINH`.
- Hủy và chốt bàn giao cùng cập nhật hàng `DON_THUE`: bên thắng quyết định; `BanGiaoService.ChotPhieu` gọi `DonThue.BatDauThue()` nên thất bại khi đơn đã hủy; hủy sau bàn giao trả `DON_DA_BAN_GIAO`.
- Hủy phân công gọi `IChuanBiDonService.GiaiPhongPhanCongKhiHuyDonAsync` (Kim Xuyến) trong cùng transaction hủy (method chỉ SaveChanges, không commit).

### 4.4 Không đến nhận

Nhân viên ghi nhận (`GHI_NHAN_KHONG_DEN_NHAN` + thông báo tới mọi quản trị viên đang hoạt động), **không** đổi trạng thái đơn, không tạo bàn giao/phạt.
Trước `gioNhan + soPhutChoSauGioNhan` → 409 `TRANG_THAI_KHONG_HOP_LE`. Chính sách chưa quy định mức → `huongXuLy = ChoQuanTriVienQuyetDinh_ChinhSachChuaQuyDinh`.

## 5. Theo dõi đơn (W4-T9)

`DonChiTietResponse` thêm `taiChinh: DonTaiChinhResponse` (cả khách và vận hành); các mảng W3 giữ nguyên, `hoanTien[]` có thêm `nhanHienThi`.

| Phần | Nguồn | Ghi chú |
|---|---|---|
| `nhanTra` | `CHI_TIET_BAN_GIAO` (phiếu `DaGiao`) vs `CHI_TIET_NHAN_TRA` | đã trả = dòng không mất trong phiếu `DaChot`; mất chỉ tính kết luận khi có `thoi_diem_duyet_mat`; còn nợ = đã giao − đã trả − mất đã duyệt; `cacDot` chỉ phiếu đã chốt |
| `phuPhi` | `PHU_PHI` | khách chỉ thấy `DaDuyet`; `tongDeNghi/tongTuChoi` chỉ cho nhân viên; tranh chấp mở = `trang_thai_tranh_chap = DangTranhChap` (PhuPhiService) |
| `doiSoat[]` | `DOI_SOAT_TIEN_COC` | `laDieuChinh` theo `ma_doi_soat_goc`; `soTienCanHoan` là số cần hoàn, không phải đã hoàn |
| `thu` | `CHI_TIET_THANH_TOAN` của giao dịch `ThanhCong` | tách thuê/cọc/thu bổ sung; `chuaPhanLoai` cần đối chiếu |
| `hoan` | `HOAN_TIEN` qua chi tiết thu gốc | `duKien` / `dangXuLy` / `daHoan` / `canXuLyLai` (thất bại đã có lần thử thay thế không tính) |
| `huy` | `DON_THUE` | loại, thời điểm, lý do, tiền thuê giữ lại |
| `thoiDiemHoanTat`, `coDieuChinhSauHoanTat` | `DON_THUE`, `DOI_SOAT_TIEN_COC` | ngày hoàn tất gốc không đổi khi có điều chỉnh |
| `nhan[]` | tính | `TraMotPhan`, `QuaHan` (đơn `DangThue`, còn nợ, quá giờ trả), `DangXuLyMat`, `ChoHoanTien`, `CanThuBoSung`, `CoTranhChap` |

Mỗi tập được đọc bằng projection riêng rồi cộng trong bộ nhớ (không JOIN nhiều tập con → không nhân tiền).
`thaoTacKhaDung` (khách): `ThanhToan`, `XemTruocHuy`, `HuyDon`, `TranhChapPhuPhi`, `ThanhToanBoSung`.
`viecCanXuLy` (vận hành) thêm: nhận trả còn nợ, lập/chốt đối soát, duyệt mất, duyệt phí, giải quyết tranh chấp, gửi/đối chiếu/xử lý lại từng khoản hoàn, đối chiếu thu chưa phân loại.

**Giá trị phụ thuộc module khác (cần chủ module xác nhận):** `CHI_TIET_NHAN_TRA.ket_luan` mất = `"Mất thiết bị"` hoặc có `bien_ban_mat` (Tuấn Kiệt); `PHU_PHI.trang_thai_duyet` = `ChoDuyet|DaDuyet|TuChoi`, `trang_thai_tranh_chap` = `DangTranhChap|DaGiaiQuyet` (Kiện Minh — đã khớp với PhuPhiService trên main); `DOI_SOAT_TIEN_COC.trang_thai` khác `ChoChot` coi là đã xác nhận (Kim Xuyến).

## 6. Thông báo sự kiện Week 4

```csharp
await _thongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
    maDon, LoaiSuKienThongBao.NhanTra, MaSuKienThongBao.NhanTra(phieu.MaPhieuNhanTra),
    "Đã nhận thiết bị đợt 2", $"Còn {soConNo} thiết bị chưa trả."));   // không SaveChanges; commit cùng nghiệp vụ
```

| Loại | Mã sự kiện (`MaSuKienThongBao`) | Chủ gọi |
|---|---|---|
| `NhanTra` | `NHAN_TRA:{maPhieuNhanTra}` | Tuấn Kiệt |
| `NhacQuaHan` | `QUA_HAN:{maDon}:{mốc yyyyMMddHHmm}` | Minh Tú |
| `PhuPhi` / `TranhChapPhuPhi` | `PHU_PHI:{maPhuPhi}:{trangThaiDuyet}` / `TRANH_CHAP:{maPhuPhi}:{trangThai}` | Kiện Minh |
| `ThanhToanBoSung` | `THU_BO_SUNG:{maThanhToan}` | Minh Tú |
| `HoanTien` | `HOAN_TIEN:{maHoanTien}:{ThanhCong|ThatBai}` | HoanTienService (chỉ khi có kết quả thật, không khi mới lập intent) |
| `HoanTat` | `HOAN_TAT:{maDon}:{maDoiSoat}` | Kim Xuyến |
| `HuyDon` | `HUY_DON:{maDon}:{maLichSuDon}` | HuyDonService |
| `KhongDenNhan` | `KHONG_DEN_NHAN:{maDon}:{maNhatKy}` | HuyDonService (gửi quản trị viên) |

Thông báo chỉ lưu kênh `TrongUngDung`, `trang_thai_gui = ChuaGui`; email/SMS là Week 5 và phải gửi **sau commit** nên lỗi adapter không rollback nghiệp vụ.

## 7. Giới hạn đã biết

- `MockRefundGateway` giữ trạng thái trong RAM: khởi động lại thì tra cứu trả `KhongTimThay` → service gửi lại **cùng mã** (an toàn vì gateway thật dedupe theo mã). Không phải cổng thanh toán thật.
- `ThanhToanService` Tuần 2 chưa tạo `CHI_TIET_THANH_TOAN`; đơn thanh toán qua luồng đó sẽ bị chặn hủy có hoàn (`thu chưa phân loại`) cho tới khi W4-T5/T8 (Minh Tú) ghi chi tiết thuê/cọc.
- `DonThueService.TaoDonThueAsync` chưa lưu `tong_tien_*`; khi tổng dự kiến = 0, bảng hủy dùng tiền thực thu làm trần.
