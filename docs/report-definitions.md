# GearGo — Tài liệu định nghĩa báo cáo tài chính (Week 6 - W6-T5)

> **Người phụ trách:** Kim Xuyến (Người 4)  
> **Use Case:** UC25 — Báo cáo tài chính và số dư cần xử lý  
> **Phạm vi quyền:** Quản trị viên (`QuanTriVien` / `AdminOnly`)  
> **Cơ sở dữ liệu:** ASP.NET Core Web API, EF Core, SQL Server (ERD `erd.txt`)

---

## 1. Bảng tóm tắt chỉ số và nhóm báo cáo

| Nhóm báo cáo | Mốc thời gian nghiệp vụ | Nguồn dữ liệu chuẩn | Công thức & Quy tắc cốt lõi |
|---|---|---|---|
| **Doanh thu thuê hoàn tất** | `DON_THUE.thoi_diem_hoan_tat` | `DON_THUE` (`HoanTat`), `DOI_SOAT_TIEN_COC` gốc đã chốt | `DoanhThu = TienThueSauGiam + PhuPhiDoiSoatBanDau`. Không cộng cọc. Nếu đơn thiếu đối soát gốc chốt thì gắn cờ `CoNgoaiLeThieuDoiSoat = true`. |
| **Phí hủy giữ lại** | `DON_THUE.thoi_diem_huy` | `DON_THUE` (`KhachHuy`, `CuaHangHuy`) | `TienThueGiuLaiKhiHuy`. Trình bày riêng, không coi đơn hủy là đơn hoàn tất. |
| **Điều chỉnh sau hoàn tất** | `DOI_SOAT_TIEN_COC.thoi_diem_chot` | `DOI_SOAT_TIEN_COC` con (`ma_doi_soat_goc != null`, `DaChot`) | `DeltaPhuPhi = PhuPhiSauDieuChinh - PhuPhiGoc`. Ghi nhận delta có dấu theo giờ chốt phiếu con, giữ nguyên số kỳ gốc. |
| **Tiền thu thực tế** | `THANH_TOAN.thoi_diem_thanh_cong` | `THANH_TOAN` (`ThanhCong`), `CHI_TIET_THANH_TOAN` | Đếm đúng 1 lần từ `TongSoTien`. Phân loại: Tiền thuê, Tiền cọc, Thu bổ sung, Chờ phân loại. |
| **Tiền hoàn thực tế** | `HOAN_TIEN.thoi_diem_thanh_cong` | `HOAN_TIEN` (`ThanhCong`), `CHI_TIET_THANH_TOAN` gốc | Đếm đúng 1 lần từ `SoTien`. Phân loại theo mục đích thu gốc (`TienThue`, `TienCoc`, `ThuBoSung`). |
| **Dòng tiền ròng** | Trong kỳ lọc | Thu thực tế và Hoàn thực tế trong kỳ | `DongTienRong = TongThuThucTe - TongHoanThucTe`. |
| **Số dư cọc hiện tại** | Tại thời điểm truy vấn (lịch sử đầy đủ) | Toàn bộ giao dịch cọc & đối soát chốt | `CocConGiu = CocDaThu - CocDaHoan - CocDaBuPhuPhi`. Không lọc cắt theo ngày thu trong kỳ. |
| **Khoản cần xử lý** | Tại thời điểm truy vấn | Giao dịch, phiếu hoàn, đối soát | Thu cần đối chiếu (`CanDoiChieu`), thu chưa phân loại đủ, hoàn tiền đang chờ (`ChoXuLy`), đối soát điều chỉnh chờ chốt, đơn hoàn tất thiếu đối soát. |

---

## 2. Quy tắc số liệu & Ranh giới bắt buộc

1. **Tách bạch dòng tiền và doanh thu**:
   - Tiền cọc là tiền bảo đảm, **không phải doanh thu**.
   - Hoàn cọc là hoàn trả tiền bảo đảm, **không trừ vào doanh thu thuê**.
   - Tiền thu chưa phân loại hoặc thu sai chờ đối chiếu vẫn xuất hiện trong dòng tiền nhưng **không tự nhận là doanh thu**.
   - Giá trị nhập kho/chi phí bảo trì không phải bằng chứng chi trả tiền nhà cung cấp, **không lấy thu trừ nhập rồi gọi là lợi nhuận**.
2. **Không nhân đôi do JOIN (Chống Fan-Out)**:
   - Một đơn có thể có nhiều dòng chi tiết thuê (`ChiTietDonThue`), nhiều đợt nhận trả đồ và nhiều phụ phí.
   - Luôn tổng hợp (aggregate) số liệu ở từng cấp trước khi kết hợp để đảm bảo tổng tiền không bị nhân lên.
3. **Múi giờ và khoảng ngày chuẩn**:
   - Người dùng nhập ngày Việt Nam (UTC+7). Hệ thống chuyển đổi một lần sang UTC nửa mở `[00:00 ngày bắt đầu, 00:00 ngày kế tiếp sau ngày kết thúc)`.
   - Giới hạn tối đa: 366 ngày/kỳ.
4. **An toàn xuất CSV**:
   - File CSV định dạng UTF-8 có BOM (hiển thị tiếng Việt có dấu chuẩn trên Excel).
   - Chống CSV Formula Injection: Các ô văn bản bắt đầu bằng `=, +, -, @, \t, \r` được tự động thêm tiền tố `'`. Các giá trị số âm hợp lệ (như delta điều chỉnh giảm `-50.000`) vẫn giữ nguyên kiểu số numeric.
   - Giới hạn dòng xuất tối đa: 10.000 dòng.

---

## 3. Bảng đối chiếu ví dụ mẫu (Khớp Mục 13.3 Plan Week 6)

Kịch bản đơn X:
- **Ngày D**: Thu thuê sau giảm 900.000đ + cọc 1.000.000đ = Thu 1.900.000đ.
- **Ngày D+3**: Nhận trả đồ, chốt phụ phí hợp lệ 180.000đ, hoàn tất đơn; hoàn cọc 820.000đ thành công.
- **Ngày D+5**: Chốt điều chỉnh giảm phụ phí -20.000đ, phát sinh lệnh hoàn bổ sung 20.000đ thành công.

| Báo cáo | Ngày D | Ngày D+3 | Ngày D+5 |
|---|---|---|---|
| **Dòng tiền thu** | 1.900.000đ | 0đ | 0đ |
| **Dòng tiền hoàn** | 0đ | 820.000đ | 20.000đ |
| **Dòng tiền ròng** | +1.900.000đ | -820.000đ | -20.000đ |
| **Doanh thu đơn hoàn tất** | 0đ (chưa hoàn tất) | 1.080.000đ (900k thuê + 180k phí) | 0đ (kỳ gốc giữ nguyên) |
| **Điều chỉnh doanh thu** | 0đ | 0đ | -20.000đ (delta ngày chốt D+5) |
| **Số dư cọc sau tất toán** | 1.000.000đ | 0đ (180k bù phí + 820k hoàn) | 0đ |
| **Đối chiếu toàn vòng đời** | Tổng thu 1.900.000đ - Tổng hoàn (820k + 20k) = 1.060.000đ = Doanh thu thực nhận sau điều chỉnh (1.080.000đ - 20.000đ). |

---

## 4. Danh sách API Backend

| STT | Phương thức | Đường dẫn API | Quyền |
|---|---|---|---|
| 1 | `GET` | `/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat` | Quản trị viên |
| 2 | `GET` | `/api/admin/bao-cao/tai-chinh/phi-huy` | Quản trị viên |
| 3 | `GET` | `/api/admin/bao-cao/tai-chinh/dieu-chinh` | Quản trị viên |
| 4 | `GET` | `/api/admin/bao-cao/tai-chinh/thu-hoan` | Quản trị viên |
| 5 | `GET` | `/api/admin/bao-cao/tai-chinh/coc-chua-tat-toan` | Quản trị viên |
| 6 | `GET` | `/api/admin/bao-cao/tai-chinh/can-xu-ly` | Quản trị viên |
| 7 | `GET` | `/api/admin/bao-cao/tai-chinh/xuat-csv` | Quản trị viên |

---

## 5. Kết quả nghiệm thu tự động (10/10 Tests Passed)

Bộ test `BaoCaoTaiChinhTests.cs` đã kiểm chứng đầy đủ:
- `W6-T5-A01`: Thu thuê 400k + cọc 1M, phí 200k, hoàn 800k -> Doanh thu 600k, Thu 1.4M, Hoàn 800k, cọc còn 0 (**PASS**).
- `W6-T5-A02`: Đơn nhiều dòng chi tiết không bị nhân đôi số tiền (**PASS**).
- `W6-T5-A03`: Điều chỉnh phí delta -50k chốt kỳ sau ghi nhận delta có dấu (**PASS**).
- `W6-T5-A04`: Cọc thu tháng trước chưa đối soát vẫn nằm trong báo cáo số dư hôm nay (**PASS**).
- `W6-T5-A05`: Giao dịch cần đối chiếu xuất hiện trong danh sách cần xử lý (**PASS**).
- `W6-T5-A06`: Hoàn pending chưa cộng vào hoàn thực tế, nằm ở danh sách chờ (**PASS**).
- `W6-T5-A07`: Cọc đã bù phí 200k và hoàn 800k không báo còn giữ 200k (**PASS**).
- `W6-T5-A08`: Đơn hoàn tất thiếu đối soát gốc chốt xuất cờ ngoại lệ dữ liệu (**PASS**).
- `W6-T5-A09`: Nhân viên gọi API bị từ chối 403 `KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH` (**PASS**).
- `XuatCsv_AnToanCongThucVaUtf8Bom`: Xuất file CSV UTF-8 có BOM và bọc an toàn ô chứa công thức (**PASS**).
