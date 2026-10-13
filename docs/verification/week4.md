# Biên bản nghiệm thu Week 4 — phần Thanh Tùng (W4-T6, W4-T7, W4-T9)

**Môi trường đã chạy:** `tests/GearGo.Tests` (xUnit, 65 test) trên SQLite in-memory — có transaction, `ExecuteUpdate`, unique/FK thật — và một nhóm test HTTP qua `WebApplicationFactory` (route, JWT policy, `ExceptionHandlingMiddleware`).
Máy dev chỉ có .NET SDK 8 nên đã build/test trên bản sao đổi `TargetFramework=net8.0`, `JwtBearer 8.*`, `Mvc.Testing 8.*` → **65/65 Passed**. Cần chạy lại `dotnet test` bằng SDK 10 của nhóm.
Đã thử mutation (bỏ phần "đang giữ" khỏi hạn mức; đổi mốc `>= 24h` thành `> 24h`) → 5 test đỏ đúng chỗ, sau đó khôi phục.

**Chưa chạy trên SQL Server thật.** SQLite khóa cả database khi ghi nên chỉ kiểm được thứ tự tuần tự của các ca đồng thời; ca "đồng thời thật" ghi Blocked.

## W4-T6 — Hoàn tiền dùng chung

| Mã ca | Dữ liệu / hành động | Expected | Actual (test) | Kết quả |
|---|---|---|---|---|
| W4-T6-A01 | Nguồn 2.000.000, đã hoàn 500.000, chờ 700.000; xin 900.000 | Chặn | `VUOT_HAN_MUC_HOAN`, `conCoTheLap=800.000`, không thêm dòng (`HoanTienServiceTests.A01_...`) | Pass |
| Nghiệm thu 9.0 | Cọc 1.000.000 đang chờ 800.000; xin 300.000 | Chặn | `VUOT_HAN_MUC_HOAN` (`NghiemThu_Coc1Trieu_...`) | Pass |
| W4-T6-A02 | Hai nguồn 2.000.000 và 1.000.000, nghĩa vụ 2.400.000 | 2.000.000 + 400.000 | Hai dòng đúng nguồn, có `ma_doi_soat` (`A02_HaiNguon_...`) | Pass |
| W4-T6-A03 | Hai nhân viên cùng hoàn phần còn lại một nguồn | Một intent, một xung đột | Tuần tự: lần 2 `VUOT_HAN_MUC_HOAN`, 1 dòng (`A03_...`). Khóa nguồn bằng `UPDATE` cần chạy song song trên SQL Server | Pass (tuần tự) / Blocked (đồng thời thật) |
| W4-T6-A04 | Gateway đã hoàn nhưng timeout | Giữ nguồn, đối chiếu cùng mã, không hoàn thêm | `ChuaRoKetQua`; lập khoản khác bị chặn; `xu-ly` → 409; `doi-chieu` → `ThanhCong`; gateway nhận đúng 1 lần gửi (`A04_...`) | Pass |
| W4-T6-A05 | Callback success, success lặp, rồi failure cũ | Giữ success + thời điểm cũ, ghi mâu thuẫn | 1 nhật ký `KET_QUA_HOAN`, 1 `MAU_THUAN_KET_QUA_HOAN`, 1 thông báo (`A05_...`) | Pass |
| W4-T6-A06 | Hủy đơn hoàn thuê và cọc | Mỗi khoản đúng nguồn, không lấy cọc hai lần | `HuyDonServiceTests.A04_...`: thuê→nguồn TienThue, cọc→nguồn TienCoc, 1 dòng/nguồn cọc | Pass |
| W4-T6-A07 | Khởi động lại khi có 3 yêu cầu chờ | Đọc lại từ DB, tiếp tục đúng mã | Context/service mới: gửi 1 `ChoXuLy`, tra cứu 2 yêu cầu cùng mã (`A07_...`) | Pass |
| Bổ sung | Callback sai chữ ký / sai số tiền | Không đánh dấu đã hoàn | 400 `KET_QUA_HOAN_KHONG_KHOP`, trạng thái giữ `DangXuLy` | Pass |
| Bổ sung | Thất bại chắc chắn → xử lý lại | Lần thử `:L2`, hạn mức tính đúng | `DaThayThe` cho lần cũ, nghĩa vụ hoàn thành | Pass |
| Bổ sung | Nghĩa vụ 2 nguồn, 1 phần thất bại | Chưa hoàn thành, hiện phần còn chờ | `daHoanThanh=false`, `conCho=300.000` | Pass |
| Quyền | Khách B xem hoàn đơn A; khách gọi `xu-ly` | 404 / 403 | Pass (service + HTTP) | Pass |

## W4-T7 — Hủy đơn

| Mã ca | Dữ liệu / hành động | Expected | Actual (test) | Kết quả |
|---|---|---|---|---|
| W4-T7-A01 | 48h1' / 48h / 36h / 24h / 23h59' / quá giờ nhận | Tren48 / Tu24Den48 ×3 / Duoi24 ×2 | `BangTinhHuyTests.A01_RanhGioi` (6 dòng) | Pass |
| W4-T7-A02 | Xem trước lúc 24h1', xác nhận sau 2' | 409 + bảng mới, chưa hủy/hoàn | `CHI_PHI_HUY_DA_THAY_DOI`, `chiTiet.nhanhChinhSach=Duoi24Gio`, đơn giữ `DaXacNhan`, 0 hoàn | Pass |
| W4-T7-A03 | Hủy và giao | Một bên thắng | Giao trước → hủy `DON_DA_BAN_GIAO`; hủy trước → chốt bàn giao thất bại, phân công/nháp `DaHuy`, thiết bị vẫn `SanSang` | Pass (tuần tự) / Blocked (đồng thời thật) |
| W4-T7-A04 | Thu thuê 600.000 + cọc 1.000.000, giữ thuê 300.000 | Hoàn 300.000 + 1.000.000 đúng hai nguồn | Pass | Pass |
| W4-T7-A05 | Mã khuyến mãi đã dùng rồi hủy | Lượt không trở lại, giữ chỗ giải phóng | `DaSuDung` giữ nguyên, `GIU_CHO=DaGiaiPhong` | Pass |
| W4-T7-A06 | Chưa thu tiền hủy | Không hoàn 0đ, release lượt giữ | 0 `HOAN_TIEN`, lượt `DaGiaiPhong`, gateway không được gọi | Pass |
| W4-T7-A07 | Tiền về sau hủy | Đơn giữ hủy, không tạo lại giữ chỗ | `ThanhToanService` Tuần 2 từ chối, đơn `KhachHuy`, giữ chỗ vẫn giải phóng. Luồng ghi nhận tiền thừa + hoàn thuộc W4-T8 (Minh Tú) | Pass (phần T7) / Blocked (W4-T8) |
| Checklist 20 | Đơn `DangThue/ChoDoiSoat/HoanTat` gọi hủy | Từ chối | Xem trước `coTheHuy=false`; hủy 409 `DON_DA_BAN_GIAO` | Pass |
| Bổ sung | Hủy hai lần / quyết định khác | Một kết quả; quyết định khác 409 | Cùng bộ hoàn, lý do không đổi; `DON_DA_HUY_KHAC_Y_DINH` | Pass |
| Bổ sung | Chính sách thiếu tỷ lệ | 409 cấu hình | `CHINH_SACH_HUY_CHUA_DU` | Pass |
| Bổ sung | Thu thành công chưa tách thuê/cọc | Không cho hủy có hoàn | `coTheHuy=false`, `NGUON_HOAN_KHONG_HOP_LE` | Pass |
| Demo 15.1-4 | Hủy → hoàn cọc thất bại → xử lý lại thành công | Đơn vẫn hủy, hoàn đủ 1.600.000 | Pass | Pass |
| Bổ sung | Adapter hoàn lỗi sau commit | Không rollback hủy | Đơn `KhachHuy`, khoản hoàn `ChuaRoKetQua` | Pass |
| Không đến nhận | Nhân viên ghi nhận trước/sau mốc chờ; nhân viên tự xử lý; quản trị viên xử lý; chính sách chưa có | 409 trước mốc; ghi nhận + báo QTV; 403; hủy theo chính sách; chờ QTV, không phạt | Pass | Pass |
| HTTP | 401 không token, 403 sai vai trò, 404 đơn người khác, 409 bảng đổi, 400 callback giả | Đúng mã + `{maLoi,...}` | `ApiHuyHoanTests` | Pass |

## W4-T9 — Theo dõi đơn, thông báo, tích hợp

| Mã ca | Dữ liệu / hành động | Expected | Actual (test) | Kết quả |
|---|---|---|---|---|
| W4-T9-A01 | 3 đợt nhận, 4 phí, 2 nguồn cọc, 2 hoàn | Tổng đúng, không nhân | Cọc thu 1.500.000, phí duyệt 300.000, đề nghị 300.000, từ chối 50.000, đã hoàn 400.000, dự kiến 250.000; 3 đợt (2/1/0 thiết bị trả) | Pass |
| W4-T9-A02 | Hoàn đang chờ trên đơn đã trả đủ | Khách thấy chờ hoàn, không thấy đã hoàn/HoanTat | `daHoan=0`, `dangXuLy=1.000.000`, nhãn `ChoHoanTien`, `thoiDiemHoanTat=null` | Pass |
| W4-T9-A03 | Phiếu điều chỉnh sau HoanTat | Phân biệt gốc/bổ sung, giữ ngày gốc | `laDieuChinh=[false,true]`, `coDieuChinhSauHoanTat=true`, ngày hoàn tất không đổi | Pass |
| W4-T9-A04 | Lỗi email khi nghiệp vụ đã chốt | Không rollback | Chưa có email adapter (Week 5). Đã kiểm: thông báo lưu `ChuaGui` trong transaction, rollback thì mất; lỗi adapter hoàn sau commit không rollback hủy | Blocked (email Week 5) |
| Bổ sung | Trả 2/3, đợt 2 nháp có hồ sơ mất | `TraMotPhan`, `QuaHan`, `DangXuLyMat`, còn nợ 1 | Pass | Pass |
| Bổ sung | Mã sự kiện theo phiếu | Đợt 2 không bị bỏ qua; gọi lại không trùng | 2 thông báo cho 2 phiếu | Pass |
| Bổ sung | Đơn hủy hiện phí giữ lại + từng khoản hoàn; khách B | Đủ dữ liệu; 404 | Pass | Pass |
| Luồng liên module (15.1 demo 1–3, 5) | Nhận trả → phí → đối soát → hoàn | — | `NhanTraService`, `PhuPhiService`, `DoiSoatService`, W4-T5/T8 chưa có trong repo; DTO đọc đã sẵn sàng | Blocked |

## Tích hợp sau khi merge `main` + `feature/w4-doi-soat` + `feat/w4-task2_5_8`

| Ca | Expected | Actual (test) | Kết quả |
|---|---|---|---|
| Xem trước đối soát có phí `DaDuyet` 200.000, cọc 1.000.000 | Cần hoàn 800.000 | `DoiSoatHoanTienTichHopTests.XemTruoc_TruPhuPhiDaDuyet` (trước khi sửa `"Duyet"`→`"DaDuyet"` phí bị bỏ qua, hoàn đủ 1.000.000) | Pass |
| Đối soát phát lệnh hoàn | Qua `HoanTienService`, mã `HT:DS:{maDoiSoat}:{nguồn}:L1`, gửi sau commit, bấm lại không lập thêm | Pass | Pass |
| Nguồn cọc đang bị khoản hoàn khác giữ | `VUOT_HAN_MUC_HOAN`, đối soát không đổi trạng thái | Pass | Pass |
| Chốt đối soát khi hoàn còn `DangXuLy` | Bị chặn | Pass | Pass |
| Hủy đơn giải phóng phân công qua `ChuanBiDonService.GiaiPhongPhanCongKhiHuyDonAsync` | Phân công `DaHuy`, thiết bị `SanSang`, cùng transaction | `HuyDonServiceTests.A03_HuyTruoc_...` | Pass |

## Việc còn chờ thành viên khác

| Chủ | Việc | Ảnh hưởng |
|---|---|---|
| Minh Tú | Ghi `CHI_TIET_THANH_TOAN` (TienThue/TienCoc) khi thu thành công; W4-T8 gọi `LapYeuCauHoanAsync(LoaiHoanTien.HoanThuThua, "TT:{maChiTiet}")` | Không có chi tiết thì hủy có hoàn bị chặn "thu chưa phân loại" |
| Kim Xuyến + Minh Tú | Nhánh thu thêm của `DoiSoatService.YeuCauXuLyTienAsync` gọi `ThanhToanService.TaoThuBoSungAsync`, method này tự mở transaction thứ hai trong transaction của đối soát → EF báo lỗi transaction lồng nhau | Thu bổ sung từ đối soát chưa chạy được; cần thống nhất ai mở transaction |
| Kim Xuyến | `LapDoiSoatDieuChinhAsync` cộng mọi phí `DaDuyet` (gồm cả phí gốc đã bị điều chỉnh) và chỉ trừ hoàn thành công của đối soát gốc | Cần rà lại công thức ví dụ 13.2 (chỉ hoàn thêm phần chênh) |
| Tuấn Kiệt / Kiện Minh | Xác nhận giá trị `ket_luan` mất, `trang_thai_duyet`, `trang_thai_tranh_chap` | DTO theo dõi đơn đọc theo giá trị ghi ở contract mục 5 |
| Cả nhóm | Chạy `dotnet test` bằng SDK 10; chạy ca đồng thời trên SQL Server | Các dòng "Blocked (đồng thời thật)" |
