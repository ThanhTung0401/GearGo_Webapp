# Contract Week 3 — phần Thanh Tùng (W3-T1, W3-T2, W3-T9)

Mọi lỗi nghiệp vụ trả JSON `{ "maLoi": "...", "thongDiep": "...", "chiTiet": ... }` qua `ExceptionHandlingMiddleware`.
Danh tính luôn lấy từ JWT (claim `MaTaiKhoan`); không có API nhận mã khách/mã tài khoản từ body hay query.
Route dùng tiền tố `api/v1/...` cho khớp `DonThueController` Tuần 2.

## 1. Bảng module (BangHopDongModule)

| Service | Chủ | Interface | Bên gọi | Route / quyền | Mã lỗi |
|---|---|---|---|---|---|
| HoSoService | Thanh Tùng | `IHoSoService` | `HoSoController` | `GET/PUT api/v1/ho-so/toi` — KhachHang | LIEN_HE_DA_TON_TAI(409), HO_SO_KHONG_HOP_LE(400), TAI_KHOAN_BI_KHOA(403) |
| TruyVanDonThueService | Thanh Tùng | `ITruyVanDonThueService` | `DonThueController` (GET), `VanHanh/DonThueController` | xem mục 3 | DON_KHONG_TIM_THAY(404), KHONG_TIM_THAY(404) |
| LichSuNghiepVuService | Thanh Tùng | `ILichSuNghiepVuService` | Service nghiệp vụ của Kiện Minh, Minh Tú, Kim Xuyến, Tuấn Kiệt | nội bộ | SU_KIEN_KHONG_HOP_LE(400) |
| ThongBaoService | Thanh Tùng | `IThongBaoService` | `ThongBaoController`; Kim Xuyến gọi `TaoThongBaoSanSangNhanAsync` | `GET api/v1/thong-bao`, `POST api/v1/thong-bao/{id}/da-doc` — đã đăng nhập | THONG_BAO_KHONG_TIM_THAY(404), SU_KIEN_KHONG_HOP_LE(400), XUNG_DOT_SU_KIEN(409) |

DI đã đăng ký trong `Program.cs`. Thành viên khác gửi danh sách service cần đăng ký cho Thanh Tùng.

## 2. Mẫu gọi helper lịch sử/thông báo (không tự commit)

```csharp
await using var tx = await _context.Database.BeginTransactionAsync();
var don = /* đọc + khóa đơn trong tx */;
var truoc = don.TrangThai;
don.TrangThai = TrangThaiDonThue.SanSangNhan;                       // trạng thái trước lấy từ dữ liệu đã đọc, không từ request
var ls = _lichSu.GhiChuyenTrangThaiDon(new GhiLichSuDonCommand(don.MaDonThue, truoc.ToString(), "SanSangNhan", maTaiKhoan, null));
await _context.SaveChangesAsync();                                  // để có ls.MaLichSuDon làm khóa sự kiện
await _thongBao.TaoThongBaoSanSangNhanAsync(don.MaDonThue, $"SAN_SANG_NHAN:{don.MaDonThue}:{ls.MaLichSuDon}");
await _context.SaveChangesAsync();
await tx.CommitAsync();                                             // commit duy nhất do service nghiệp vụ giữ
```
- Helper chỉ `Add` vào DbContext của bên gọi; rollback transaction thì lịch sử/audit/thông báo cùng biến mất.
- `TaoThongBaoSanSangNhanAsync` gọi lại cùng `(tài khoản, eventKey, kênh TrongUngDung)` trả bản cũ; cùng key nhưng khác đơn → 409 `XUNG_DOT_SU_KIEN`.
- Lần sẵn sàng lại sau khi đổi thiết bị có `MaLichSuDon` mới nên là sự kiện mới.
- `GhiNhatKyThaoTac` tự bỏ các khóa nhạy cảm (`matKhauBam`, `password`, `token`...) khỏi JSON trước/sau.
- Thông báo chỉ lưu trong ứng dụng (`trang_thai_gui = ChuaGui`, `kenh_gui = TrongUngDung`); email/SMS và retry để Week 5.

## 3. Endpoint

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/ho-so/toi` | KhachHang | `HoSoResponse` |
| PUT | `/api/v1/ho-so/toi` | KhachHang | Body: `hoTen, email, soDienThoai, diaChi?, ngaySinh?, anhDaiDien?`. PUT thay thế: các trường `?` null/rỗng = xóa. Không sửa snapshot trên đơn cũ |
| GET | `/api/v1/don-thue?maDon&tuNgay&denNgay&trangThai&trang&soMoiTrang` | KhachHang | Chỉ đơn của mình; phân trang |
| GET | `/api/v1/don-thue/{id}` | Chủ đơn | `DonChiTietResponse` |
| GET | `/api/v1/don-thue/{id}/lich-su` | Chủ đơn | Lý do chỉ hiện nếu chính khách nhập |
| GET | `/api/v1/don-thue/{id}/ban-giao` | Chủ đơn | Chỉ biên bản đã chốt; chưa có → 404 `KHONG_TIM_THAY` |
| GET | `/api/v1/van-hanh/don-thue?maDon&tuKhoa&tuNgay&denNgay&trangThai&canChuanBi&canGiao&trang&soMoiTrang` | NhanVien, QuanTriVien | |
| GET | `/api/v1/van-hanh/don-thue/{id}` | NhanVien, QuanTriVien | Kèm phân công và `viecCanXuLy` |
| GET | `/api/v1/thong-bao?chuaDoc&trang&soMoiTrang` | Đăng nhập | Chỉ thông báo của mình |
| POST | `/api/v1/thong-bao/{id}/da-doc` | Chủ thông báo | Giữ lần đọc đầu; ID người khác → 404 |

Đơn không tồn tại và đơn của người khác đều trả 404 `DON_KHONG_TIM_THAY` để không lộ sự tồn tại.
`DonChiTietResponse.nhanTra/phuPhi/hoanTien` là mảng rỗng khi chưa phát sinh; khách chỉ thấy phụ phí `DaDuyet`.
GET `/api/v1/don-thue` dành cho khách; các POST/PUT cũ của Tuần 2 giữ nguyên hành vi.

## 4. Chốt đầu vào Week 4
- Thanh Tùng chuyển DTO đọc đơn (`DonChiTietResponse`, `PhieuBanGiaoKhachResponse` có `MaChiTietBanGiao` từng thiết bị).
- Tuấn Kiệt chuyển contract nhận trả; Minh Tú chuyển nguồn thu.
