# GearGo — Giải thích 39 entities từ nền tảng đến nghiệp vụ

Nguồn: `ERD(2).dbml`.

Tài liệu sắp xếp theo cách **hiểu bảng nền trước → hiểu bảng phụ thuộc sau**, không đơn thuần đếm số khóa ngoại. Một bảng chỉ có một khóa ngoại vẫn có thể nằm cuối một chuỗi nghiệp vụ dài. Các bảng nhật ký được đặt cuối để dễ học.

Ví dụ xuyên suốt: **cửa hàng nhập 10 chiếc lều cùng loại; Minh đặt thuê 2 chiếc trong 3 ngày rồi mang trả**. Số tiền và tên trạng thái trong ví dụ chỉ mang tính minh họa.

## Cách đọc ERD

| Ký hiệu | Ý nghĩa |
|---|---|
| `pk` | Khóa chính, định danh duy nhất một dòng |
| `increment` | Mã tự tăng khi thêm dòng |
| `Ref: A.ma_b > B.ma_b` | A giữ khóa ngoại trỏ tới B; nhiều dòng A có thể liên quan một dòng B |
| `-` trong `Ref` | Quan hệ một–một; trong file này, cột bên phải là khóa ngoại |
| `not null` | Bắt buộc có giá trị |
| `unique` | Giá trị không được trùng giữa các dòng |
| `json` | Dữ liệu có cấu trúc, ví dụ danh sách phụ kiện |

Ví dụ: `SAN_PHAM.ma_danh_muc > DANH_MUC_SAN_PHAM.ma_danh_muc` nghĩa là mỗi sản phẩm thuộc một danh mục; một danh mục có thể chứa nhiều sản phẩm.

Cột có tên `ma_...` chưa chắc là khóa ngoại. Xem phần `Ref` cuối file để xác định chính xác. Một quan hệ có khóa ngoại `unique` không có nghĩa bản ghi phía được tham chiếu bắt buộc đã có bản ghi tương ứng ở phía kia.

## 1. TAI_KHOAN — Ai được đăng nhập vào hệ thống?

**Tham chiếu:** Không có.

Lưu email, số điện thoại, mật khẩu đã băm, vai trò, trạng thái tài khoản và lý do khóa.

Ví dụ: Minh có tài khoản khách hàng; An có tài khoản nhân viên; Bình có tài khoản quản trị.

**Tài khoản quản lý đăng nhập và quyền truy cập.** Hồ sơ cá nhân nằm ở `KHACH_HANG` hoặc `NHAN_VIEN`.

## 2. DANH_MUC_SAN_PHAM — Sản phẩm thuộc nhóm nào?

**Tham chiếu:** Chính nó qua `ma_danh_muc_cha`.

Lưu nhóm sản phẩm như lều, bàn ghế, đèn, túi ngủ. Quan hệ tự tham chiếu cho phép tạo danh mục cha–con.

| Mã | Tên danh mục | Mã danh mục cha |
|---|---|---|
| 1 | Lều | Trống |
| 2 | Lều 2 người | 1 |
| 3 | Lều 4 người | 1 |

Danh mục gốc không cần cha. Hai danh mục còn lại thuộc nhóm Lều.

## 3. NHA_CUNG_CAP — Cửa hàng mua thiết bị từ đâu?

**Tham chiếu:** Không có.

Lưu tên công ty, người liên hệ, số điện thoại, địa chỉ, mã số thuế và trạng thái hợp tác.

Ví dụ: cửa hàng mua 10 chiếc lều từ Công ty Outdoor A.

**Nhà cung cấp bán đồ cho cửa hàng; cửa hàng sở hữu rồi cho khách thuê.** Nhà cung cấp không cần tài khoản trong thiết kế này.

## 4. KHUYEN_MAI — Mã giảm giá có quy định gì?

**Tham chiếu:** Không có.

Lưu mã giảm giá, loại giảm, giá trị giảm, mức giảm tối đa, tiền thuê tối thiểu, thời hạn và giới hạn lượt sử dụng.

Ví dụ: `CAMP10` giảm 10%, tối đa 100.000đ, áp dụng cho tiền thuê từ 300.000đ.

Bảng này định nghĩa chương trình. Sản phẩm và danh mục được áp dụng nằm ở bảng 13 và 14.

## 5. KHACH_HANG — Hồ sơ người thuê

**Tham chiếu:** `TAI_KHOAN`.

Lưu họ tên, địa chỉ, ngày sinh và ảnh đại diện.

`TAI_KHOAN` lưu thông tin đăng nhập của Minh; `KHACH_HANG` lưu hồ sơ của Minh.

`ma_tai_khoan` có `unique`, nên một tài khoản có tối đa một hồ sơ khách hàng.

## 6. NHAN_VIEN — Hồ sơ người làm tại cửa hàng

**Tham chiếu:** `TAI_KHOAN`.

Lưu họ tên, địa chỉ, ngày vào làm, ngày nghỉ việc và trạng thái làm việc.

Ví dụ: An lập phiếu nhập, bàn giao lều và nhận đồ trả.

Nhiều thao tác quản trị trong ERD tham chiếu `NHAN_VIEN`. Vì vậy, người quản trị thực hiện các thao tác đó cần có hồ sơ nhân viên tương ứng.

## 7. SAN_PHAM — Cửa hàng cho thuê loại đồ gì?

**Tham chiếu:** `DANH_MUC_SAN_PHAM`.

Lưu tên, thương hiệu, mô tả, sức chứa, kích thước, thông số, giá thuê mỗi ngày, mức cọc và giá trị bồi thường.

Ví dụ: Lều Naturehike 4 người, giá thuê 100.000đ/ngày, cọc 500.000đ/chiếc.

**Một dòng sản phẩm đại diện một loại/mẫu đồ, không phải một chiếc cụ thể.** Cửa hàng có 10 chiếc giống nhau vẫn có thể chỉ cần một dòng sản phẩm. Từng chiếc nằm ở `THIET_BI`.

## 8. HINH_ANH_SAN_PHAM — Ảnh giới thiệu sản phẩm

**Tham chiếu:** `SAN_PHAM`.

Mỗi dòng là một ảnh, gồm đường dẫn, thứ tự hiển thị và đánh dấu ảnh chính.

Lều có ảnh mặt trước, bên trong và lúc gấp gọn thì có ba dòng hình ảnh.

Đây là ảnh giới thiệu cho khách xem. Ảnh tình trạng khi giao hoặc trả nằm ở bảng nghiệp vụ tương ứng.

## 9. CHINH_SACH — Đơn thuê chịu những quy định nào?

**Tham chiếu:** `NHAN_VIEN` qua `ma_nguoi_tao`.

Lưu phiên bản chính sách, thời điểm áp dụng và nội dung quy định dưới dạng JSON. Nội dung có thể gồm cách tính ngày thuê, phí trả trễ, hủy đơn và bồi thường.

Mỗi đơn thuê tham chiếu một phiên bản chính sách. Minh đặt theo phiên bản 1 thì khi cửa hàng ban hành phiên bản 2 vẫn biết đơn cũ áp dụng quy định nào.

**Để giữ ý nghĩa đó, phiên bản đã dùng nên được giữ nguyên; thay đổi thì tạo phiên bản mới.** Khóa ngoại tự nó không ngăn việc sửa nội dung chính sách cũ.

## 10. PHIEU_NHAP_HANG — Một lần mua hàng vào kho

**Tham chiếu:** `NHA_CUNG_CAP`; `NHAN_VIEN` lập và xác nhận.

Lưu thông tin chung: nhà cung cấp, ngày lập, ngày nhập dự kiến/thực tế, tổng tiền, số chứng từ và trạng thái.

Ví dụ: phiếu PN001 mua từ Outdoor A, An lập, Bình xác nhận.

Sản phẩm và số lượng cụ thể nằm ở chi tiết phiếu nhập.

Các trường như `ten_nguoi_lap_luc_nhap` và `thong_tin_nha_cung_cap_luc_nhap` giữ thông tin tại thời điểm nhập, giúp chứng từ lưu dữ liệu cũ dù hồ sơ sau này thay đổi.

## 11. CHI_TIET_PHIEU_NHAP — Trong lần nhập đó mua những gì?

**Tham chiếu:** `PHIEU_NHAP_HANG`, `SAN_PHAM`.

Một dòng ghi một sản phẩm, số lượng, đơn giá và tình trạng khi nhập.

| Sản phẩm trong PN001 | Số lượng | Giá nhập/chiếc |
|---|---:|---:|
| Lều Naturehike 4 người | 10 | 2.000.000đ |
| Ghế xếp | 20 | 200.000đ |

Ví dụ này có một phiếu nhập và hai dòng chi tiết nhập.

**Phiếu lưu thông tin chung; chi tiết liệt kê những thứ bên trong.** Cách tách này lặp lại ở nhiều nghiệp vụ.

## 12. THIET_BI — Từng chiếc đồ thực tế trong kho

**Tham chiếu:** `CHI_TIET_PHIEU_NHAP`.

Nhập 10 chiếc lều thì tạo 10 dòng thiết bị, chẳng hạn `LEU001` đến `LEU010`. Mỗi chiếc có tình trạng, phụ kiện, giá nhập và trạng thái sử dụng riêng.

| Bảng | Ví dụ một dòng |
|---|---|
| `SAN_PHAM` | Lều Naturehike 4 người |
| `CHI_TIET_PHIEU_NHAP` | Nhập 10 chiếc lều đó trong PN001 |
| `THIET_BI` | Chiếc lều LEU001 |

Trong file này, thiết bị không có `ma_san_pham` trực tiếp. Muốn tìm sản phẩm, truy qua chi tiết phiếu nhập. Qua đó cũng truy được lần nhập và nhà cung cấp.

## 13. KHUYEN_MAI_SAN_PHAM — Khuyến mãi áp dụng cho sản phẩm nào?

**Tham chiếu:** `KHUYEN_MAI`, `SAN_PHAM`.

Đây là bảng nối: một khuyến mãi áp dụng nhiều sản phẩm; một sản phẩm có thể tham gia nhiều khuyến mãi.

Ví dụ: CAMP10 áp dụng cho lều Naturehike và ghế xếp thì có hai dòng.

Cặp mã khuyến mãi và mã sản phẩm là khóa chính, tránh khai báo trùng một cặp.

## 14. KHUYEN_MAI_DANH_MUC — Khuyến mãi áp dụng cho nhóm nào?

**Tham chiếu:** `KHUYEN_MAI`, `DANH_MUC_SAN_PHAM`.

Tương tự bảng trên nhưng áp dụng theo danh mục. Ví dụ: TENT10 áp dụng cho nhóm Lều.

Việc tự áp dụng xuống danh mục con hay không phải được quy định trong nghiệp vụ; quan hệ ERD chưa quyết định điều đó.

## 15. GIO_THUE — Khách đang dự định thuê gì, vào thời gian nào?

**Tham chiếu:** `KHACH_HANG`, `KHUYEN_MAI`.

Lưu người sở hữu giỏ, giờ nhận/trả dự kiến và khuyến mãi đang chọn. Ví dụ: Minh dự định nhận ngày 20, trả ngày 23.

`ma_khach_hang` có `unique`, nên mỗi khách có tối đa một giỏ trong bảng này.

**Giỏ thuê là lựa chọn đang soạn. Thêm vào giỏ chưa đồng nghĩa đã giữ hàng.**

## 16. CHI_TIET_GIO_THUE — Giỏ có những sản phẩm nào?

**Tham chiếu:** `GIO_THUE`, `SAN_PHAM`.

Lưu sản phẩm và số lượng. Giỏ có 2 lều và 4 ghế thì có hai dòng chi tiết giỏ.

Lúc này khách chọn loại đồ và số lượng, chưa chọn chiếc LEU001 hay LEU002.

## 17. DON_THUE — Hồ sơ chính của một lần đặt thuê

**Tham chiếu:** `KHACH_HANG`, `CHINH_SACH`, `TAI_KHOAN` hủy đơn nếu có.

Lưu ngày đặt, giờ nhận/trả, hạn thanh toán, thông tin người nhận, tổng tiền thuê, tiền giảm, tiền cọc và trạng thái.

Ví dụ: DT001 của Minh, thuê từ ngày 20 đến 23, đang chờ thanh toán.

**Đây là bảng trung tâm của nghiệp vụ thuê.** Thanh toán, bàn giao, nhận trả và đối soát đều gắn với đơn.

Đơn có `khuyen_mai_luc_dat` dạng JSON; lượt sử dụng khuyến mãi được theo dõi riêng ở bảng 20.

## 18. CHI_TIET_DON_THUE — Đơn đặt những gì, với giá nào?

**Tham chiếu:** `DON_THUE`, `SAN_PHAM`.

Ví dụ: DT001 thuê 2 lều, tính 3 ngày, giá 100.000đ/chiếc/ngày, cọc 500.000đ/chiếc.

Lưu số lượng, số ngày tính tiền, tên sản phẩm, đơn giá, mức cọc, bồi thường và phụ kiện tại thời điểm đặt.

**Vì sao lưu lại giá?** Sau này giá sản phẩm tăng lên 120.000đ/ngày, đơn cũ vẫn giữ mức đã chốt là 100.000đ.

Chi tiết giỏ chủ yếu lưu lựa chọn. Chi tiết đơn lưu điều kiện giao dịch đã ghi nhận.

## 19. GIU_CHO — Tạm giữ số lượng trong lúc chờ thanh toán

**Tham chiếu:** `CHI_TIET_DON_THUE`.

Lưu lúc tạo, hết hạn, giải phóng và trạng thái giữ chỗ. Ví dụ: giữ 2 lều trong 15 phút chờ Minh thanh toán.

Bảng không có số lượng và mã thiết bị vì số lượng/sản phẩm lấy từ chi tiết đơn, thời gian thuê lấy từ đơn.

**Giữ chỗ giữ khả dụng theo sản phẩm và số lượng; chưa chỉ định từng chiếc.** Mỗi chi tiết đơn có tối đa một dòng giữ chỗ theo `unique`.

## 20. LUOT_SU_DUNG_KHUYEN_MAI — Đơn nào đang giữ hoặc đã dùng mã?

**Tham chiếu:** `KHUYEN_MAI`, `DON_THUE`.

Lưu thời điểm giữ lượt, hết hạn, sử dụng, giải phóng, số tiền giảm và trạng thái.

Ví dụ: mã còn một lượt, Minh đang thanh toán thì hệ thống giữ lượt; đơn hết hạn thì có thể giải phóng theo quy tắc nghiệp vụ.

**GIU_CHO giữ số lượng hàng; bảng này giữ lượt khuyến mãi.** Khách hàng được truy qua đơn. Mỗi đơn có tối đa một dòng lượt sử dụng theo `unique`.

## 21. THANH_TOAN — Một giao dịch thu tiền

**Tham chiếu:** `DON_THUE`, `NHAN_VIEN` ghi nhận nếu có.

Lưu tổng tiền, phương thức, cổng thanh toán, mã giao dịch, thời gian và trạng thái.

Ví dụ: Minh trả 600.000đ tiền thuê và 1.000.000đ tiền cọc, tổng 1.600.000đ.

Một đơn có thể có nhiều bản ghi: lần thử thất bại, lần thành công hoặc lần thu thêm. Khi tính tiền đã thu phải xét trạng thái giao dịch.

## 22. CHI_TIET_THANH_TOAN — Tiền đó dùng cho mục đích nào?

**Tham chiếu:** `THANH_TOAN`.

Giao dịch 1.600.000đ được tách thành:

| Mục đích | Số tiền |
|---|---:|
| Tiền thuê | 600.000đ |
| Tiền cọc | 1.000.000đ |

Một lần trả tiền có thể bao gồm nhiều mục đích. Cách tách này giúp xác định hoàn từ khoản thuê hay khoản cọc, thay vì chỉ biết tổng tiền.

## 23. PHAN_CONG_THIET_BI — Chọn chiếc nào giao cho đơn?

**Tham chiếu:** `CHI_TIET_DON_THUE`, `THIET_BI`, `NHAN_VIEN` phân công và hủy phân công nếu có.

Minh đặt 2 lều. Nhân viên chọn LEU001 và LEU002 cho dòng thuê lều đó, tạo hai bản ghi phân công.

**Bảng này nối nhu cầu “thuê 2 chiếc” với hai chiếc đồ thật trong kho.**

Nếu LEU002 có vấn đề, có thể hủy phân công rồi phân công chiếc khác. Thiết bị được thuê lại qua thời gian; nghiệp vụ phải ngăn các lịch phân công đang hiệu lực bị xung đột.

## 24. PHIEU_BAN_GIAO — Ghi nhận lần giao đồ cho khách

**Tham chiếu:** `DON_THUE`, `NHAN_VIEN`.

Lưu người giao, người nhận thực tế, thời điểm giao, xác nhận của khách và bằng chứng.

Ví dụ: An giao đồ của DT001 cho Minh lúc 8 giờ ngày 20.

`ma_don_thue` có `unique`, nên mỗi đơn có tối đa một phiếu bàn giao trong thiết kế này.

**Phân công là chọn đồ để chuẩn bị; bàn giao ghi nhận giao đồ thực tế.**

## 25. CHI_TIET_BAN_GIAO — Giao từng chiếc trong tình trạng nào?

**Tham chiếu:** `PHIEU_BAN_GIAO`, `PHAN_CONG_THIET_BI`.

Ví dụ: LEU001 được giao với vải nguyên vẹn, đủ cọc, đủ dây, có ảnh trước thuê.

Thiết bị được tìm qua phân công nên không cần khóa ngoại thiết bị trực tiếp.

Mỗi phân công có tối đa một chi tiết bàn giao. Đây là căn cứ đối chiếu khi nhận trả.

## 26. PHIEU_NHAN_TRA — Một lần tiếp nhận đồ khách trả

**Tham chiếu:** `DON_THUE`, `NHAN_VIEN`.

Lưu người nhận, thời điểm lập/chốt, trạng thái, và thông tin đợt trả:
- `ma_phieu_hien_thi`: Mã phiếu định dạng `PNT-{MaDonHienThi}-{lan_tra}` (ví dụ: `PNT-DT001-01`, `PNT-DT001-02`) giúp nhìn vào mã là biết ngay thuộc đơn nào và là đợt mấy.
- `lan_tra`: Số thứ tự đợt trả (1, 2, 3...). Ràng buộc Unique `(ma_don_thue, lan_tra)` đảm bảo không trùng số đợt trong cùng một đơn.
- `la_lan_tra_cuoi`: Boolean đánh dấu đây có phải đợt trả cuối cùng của đơn hay không. Nếu `false`, đơn tiếp tục ở trạng thái Đang thuê (nhãn Trả một phần); nếu `true` (khi đã nhận đủ toàn bộ thiết bị hoặc xử lý xong đồ mất), đơn chuyển sang Đã nhận trả để tiến hành đối soát cọc.

`ma_don_thue` không có `unique`, nên quan hệ là 1 Đơn thuê có Nhiều phiếu nhận trả (1-N). Ví dụ: sáng Minh trả LEU001 (Đợt 1), chiều trả LEU002 (Đợt 2), ghi thành hai phiếu riêng biệt.

## 27. CHI_TIET_NHAN_TRA — Kết quả kiểm tra từng chiếc đã giao

**Tham chiếu:** `PHIEU_NHAN_TRA`, `CHI_TIET_BAN_GIAO`, `NHAN_VIEN` duyệt mất nếu có.

Lưu tình trạng sau thuê, phụ kiện nhận lại, phụ kiện thiếu, ảnh, kết luận và xử lý mất.

Ví dụ: LEU001 trả đủ phụ kiện nhưng bị rách vải. Qua chi tiết bàn giao có thể đối chiếu lúc giao nguyên vẹn.

Mỗi chi tiết bàn giao có tối đa một bản ghi chi tiết nhận trả/xử lý tương ứng theo `unique`. Trường hợp mất có chỗ lưu biên bản và người duyệt mất.

## 28. DOI_SOAT_TIEN_COC — Tính cuối cùng hoàn hay thu thêm bao nhiêu?

**Tham chiếu:** `DON_THUE`, `NHAN_VIEN` lập/chốt, chính bảng này qua `ma_doi_soat_goc` nếu điều chỉnh.

Ví dụ: nhận cọc 1.000.000đ, phụ phí duyệt 200.000đ, cần hoàn 800.000đ. Nếu phụ phí 1.200.000đ thì cần thu thêm 200.000đ.

**Đây là kết quả tính toán, chưa chứng minh đã hoàn tiền thực tế.**

Bảng được giới thiệu trước PHU_PHI vì PHU_PHI có khóa ngoại trỏ tới đây. Trong quy trình thực tế, phụ phí có thể được lập trước rồi mới gắn vào đợt đối soát.

## 29. PHU_PHI — Khoản phát sinh ngoài tiền thuê ban đầu

**Tham chiếu:** `DON_THUE`, `CHI_TIET_BAN_GIAO` nếu gắn với đồ cụ thể, `NHAN_VIEN` lập/duyệt, `DOI_SOAT_TIEN_COC`, chính bảng này qua `ma_phu_phi_goc`.

Ví dụ: phí trả trễ, rách lều hoặc mất phụ kiện.

Lưu số tiền, lý do, căn cứ tính, bằng chứng, trạng thái duyệt và tranh chấp. Quan hệ tới phụ phí gốc liên kết khoản điều chỉnh với khoản gốc.

`ma_chi_tiet_ban_giao` được để trống nên có thể ghi khoản phí cấp đơn, không gắn thiết bị cụ thể.

**Phụ phí ghi từng khoản phát sinh; đối soát tổng hợp khoản được duyệt để tính tiền cuối cùng.**

## 30. GIAO_DICH_DOI_SOAT — Khoản thanh toán nào gắn với đợt đối soát?

**Tham chiếu:** `DOI_SOAT_TIEN_COC`, `CHI_TIET_THANH_TOAN`.

Bảng nối đợt đối soát với khoản tiền ở chi tiết thanh toán.

Ví dụ: cần thu thêm 200.000đ, khách đã trả; bảng này liên kết khoản thanh toán đó với đợt đối soát.

`ma_chi_tiet_thanh_toan` có `unique`, nên một khoản chi tiết thanh toán được liên kết tối đa một lần trong bảng này.

ERD chưa giới hạn mục đích khoản được liên kết; nghiệp vụ cần quy định rõ cách dùng.

## 31. HOAN_TIEN — Giao dịch trả tiền lại cho khách

**Tham chiếu:** `CHI_TIET_THANH_TOAN` gốc, `DOI_SOAT_TIEN_COC` nếu có, `NHAN_VIEN` xử lý nếu có.

Ví dụ: đối soát cần hoàn 800.000đ; tạo giao dịch hoàn từ khoản cọc ban đầu; khi hoàn thành công thì cập nhật trạng thái và thời điểm.

`ma_doi_soat` được để trống, nên cũng hỗ trợ hoàn không qua đối soát cọc, chẳng hạn hoàn khi hủy đơn.

| Bảng | Câu hỏi được trả lời |
|---|---|
| `PHU_PHI` | Khách phát sinh khoản phí gì? |
| `DOI_SOAT_TIEN_COC` | Tính ra cần hoàn hay thu thêm bao nhiêu? |
| `HOAN_TIEN` | Đã thực hiện trả tiền lại cho khách chưa? |

## 32. PHIEU_BAO_TRI — Thiết bị nào cần sửa hoặc xử lý?

**Tham chiếu:** `THIET_BI`, `DON_THUE` nếu liên quan, `NHAN_VIEN` lập/xử lý/xác nhận hoàn thành.

Ví dụ: LEU001 bị rách sau DT001, tạo phiếu bảo trì ghi lỗi, thời gian, chi phí và kết quả sửa.

Bảo trì định kỳ có thể không gắn đơn. Một thiết bị có thể có nhiều phiếu bảo trì qua thời gian.

**Phụ phí là khoản thu từ khách; chi phí bảo trì là khoản cửa hàng bỏ ra xử lý đồ.** Hai số tiền không nhất thiết bằng nhau.

## 33. PHIEU_DIEU_CHINH_KHO — Hồ sơ một lần điều chỉnh kho

**Tham chiếu:** `PHIEU_NHAP_HANG` nếu liên quan, `NHAN_VIEN` lập/duyệt.

Lưu loại điều chỉnh, lý do, bằng chứng, thời điểm duyệt và áp dụng.

Ví dụ: phát hiện thông tin nhập kho bị ghi sai, cần lập phiếu điều chỉnh có người duyệt.

Đây là thông tin chung. Những thiết bị hoặc dòng nhập bị tác động nằm ở chi tiết điều chỉnh.

## 34. CHI_TIET_DIEU_CHINH_KHO — Điều chỉnh đối tượng nào, trước/sau ra sao?

**Tham chiếu:** `PHIEU_DIEU_CHINH_KHO`, `THIET_BI` có thể trống, `CHI_TIET_PHIEU_NHAP` có thể trống.

Lưu giá trị trước và sau dưới dạng JSON. Ví dụ: giá nhập thiết bị bị ghi sai, dòng chi tiết lưu giá cũ và giá được sửa.

**Phiếu giải thích vì sao điều chỉnh; chi tiết ghi điều chỉnh cái gì.** Loại điều chỉnh được phép và yêu cầu chọn đối tượng phải được kiểm tra trong nghiệp vụ.

## 35. DANH_GIA — Khách đánh giá sản phẩm đã thuê

**Tham chiếu:** `CHI_TIET_DON_THUE`, `NHAN_VIEN` ẩn đánh giá nếu có.

Lưu số sao, nội dung, ảnh, thời gian và trạng thái hiển thị.

Qua chi tiết đơn có thể tìm sản phẩm, đơn thuê và khách hàng, nên không cần lưu lại các mã đó.

`ma_chi_tiet_don` có `unique`: thuê 2 chiếc lều trong cùng một dòng đơn thì có tối đa một đánh giá cho dòng đó. Điều kiện chỉ cho đánh giá sau khi thuê phải được kiểm tra bằng nghiệp vụ.

## 36. THONG_BAO — Gửi thông tin gì cho tài khoản nào?

**Tham chiếu:** `TAI_KHOAN`, `DON_THUE` nếu liên quan.

Ví dụ: thanh toán thành công, sắp đến hạn trả, hoàn tiền thành công.

Lưu tiêu đề, nội dung, kênh gửi, trạng thái, số lần thử, lỗi gửi và thời điểm đọc. Nhờ đó biết thông báo mới tạo, đã gửi thành công hay đang lỗi.

## 37. LICH_SU_TRANG_THAI_DON — Đơn chuyển trạng thái như thế nào?

**Tham chiếu:** `DON_THUE`, `TAI_KHOAN` thực hiện nếu có.

Mỗi dòng ghi một lần thay đổi: trạng thái trước/sau, thời điểm và lý do.

| Trước | Sau | Lý do minh họa |
|---|---|---|
| Chờ thanh toán | Đã xác nhận | Thanh toán thành công |
| Đã xác nhận | Đang thuê | Đã bàn giao |
| Đang thuê | Hoàn tất | Đã xử lý xong trả đồ và tiền |

Tên trạng thái chỉ minh họa; file chưa định nghĩa danh sách giá trị cố định.

`DON_THUE.trang_thai` cho biết hiện tại; bảng lịch sử cho biết quá trình đã diễn ra, khi nào và do ai.

## 38. LICH_SU_TINH_TRANG_THIET_BI — Một chiếc đồ thay đổi ra sao?

**Tham chiếu:** `THIET_BI`, `TAI_KHOAN` thực hiện nếu có.

Lưu trạng thái và tình trạng trước/sau, thời điểm, lý do và tham chiếu chứng từ.

Ví dụ: LEU001 sẵn sàng, được cho thuê, trả về bị rách, sửa xong rồi sẵn sàng trở lại.

**Trạng thái** nói thiết bị đang ở bước sử dụng nào. **Tình trạng** mô tả thực tế như nguyên vẹn, rách vải, thiếu phụ kiện.

## 39. NHAT_KY_THAO_TAC — Ai đã làm gì trong hệ thống?

**Tham chiếu:** `TAI_KHOAN`, có thể để trống.

Lưu hành động, loại đối tượng, mã đối tượng, dữ liệu trước/sau, thời điểm và lý do.

Ví dụ: quản trị sửa giá sản phẩm, nhân viên cập nhật nhà cung cấp, quản trị khóa tài khoản.

Khác hai bảng lịch sử chuyên biệt, bảng này ghi thao tác rộng trên toàn hệ thống.

`loai_doi_tuong` và `ma_doi_tuong` là thông tin nhận diện; không phải khóa ngoại trực tiếp tới tất cả bảng.

Bảng được đặt cuối để dễ hiểu sau khi biết nghiệp vụ, dù chỉ có một khóa ngoại.

## Nối toàn bộ bằng một quy trình thực tế

| Bước | Bảng tham gia chính |
|---|---|
| Khai báo mẫu lều | `DANH_MUC_SAN_PHAM`, `SAN_PHAM`, `HINH_ANH_SAN_PHAM` |
| Mua 10 chiếc lều | `NHA_CUNG_CAP`, `PHIEU_NHAP_HANG`, `CHI_TIET_PHIEU_NHAP` |
| Quản lý từng chiếc | `THIET_BI` |
| Minh chọn thuê 2 chiếc | `GIO_THUE`, `CHI_TIET_GIO_THUE` |
| Minh đặt đơn | `DON_THUE`, `CHI_TIET_DON_THUE`, `CHINH_SACH`, `GIU_CHO` |
| Áp dụng mã giảm giá nếu có | `KHUYEN_MAI`, các bảng phạm vi áp dụng, `LUOT_SU_DUNG_KHUYEN_MAI` |
| Trả tiền thuê và cọc | `THANH_TOAN`, `CHI_TIET_THANH_TOAN` |
| Chọn LEU001 và LEU002 | `PHAN_CONG_THIET_BI` |
| Giao đồ cho Minh | `PHIEU_BAN_GIAO`, `CHI_TIET_BAN_GIAO` |
| Minh trả đồ | `PHIEU_NHAN_TRA`, `CHI_TIET_NHAN_TRA` |
| Phát hiện một chiếc rách | `PHU_PHI`, `PHIEU_BAO_TRI` |
| Tính phần cọc cần hoàn | `DOI_SOAT_TIEN_COC` |
| Trả tiền lại cho Minh | `HOAN_TIEN` |
| Nếu cần thu thêm, liên kết khoản thu | `THANH_TOAN`, `CHI_TIET_THANH_TOAN`, `GIAO_DICH_DOI_SOAT` |

## Những cặp khái niệm dễ nhầm

| Khái niệm | Phân biệt |
|---|---|
| Sản phẩm và thiết bị | Sản phẩm là loại/mẫu; thiết bị là từng chiếc thật |
| Phiếu và chi tiết phiếu | Phiếu lưu thông tin chung; chi tiết liệt kê từng dòng bên trong |
| Giỏ và đơn | Giỏ là lựa chọn đang soạn; đơn ghi nhận giao dịch đặt thuê |
| Giữ chỗ và phân công | Giữ chỗ giữ số lượng; phân công chỉ định chiếc cụ thể |
| Phân công và bàn giao | Phân công chọn đồ; bàn giao ghi nhận giao thực tế |
| Thanh toán và chi tiết thanh toán | Thanh toán ghi giao dịch; chi tiết tách mục đích tiền thuê/cọc/... |
| Phụ phí và bảo trì | Phụ phí là khoản thu khách; bảo trì là xử lý thiết bị |
| Đối soát và hoàn tiền | Đối soát tính phải hoàn bao nhiêu; hoàn tiền ghi việc trả tiền thực tế |
| Trạng thái hiện tại và lịch sử | Cột trạng thái lưu hiện tại; bảng lịch sử lưu quá trình thay đổi |

## Thứ tự học gợi ý

1. Đọc bảng 1–12 để hiểu tài khoản, sản phẩm và nguồn gốc từng thiết bị.
2. Tập trung bảng 15–27 để hiểu khách chọn gì, đặt gì, trả tiền, được giao chiếc nào và trả chiếc nào.
3. Đọc bảng 28–31 để hiểu phụ phí, đối soát, thu thêm và hoàn tiền.
4. Đọc phần khuyến mãi và bảng 32–39 để hiểu bảo trì, điều chỉnh, đánh giá và theo dõi hệ thống.

Các khóa ngoại mô tả dữ liệu liên quan với nhau. Những quy tắc như không cho thuê trùng lịch, chỉ tính giao dịch thành công, chỉ chốt khoản phí được duyệt hoặc không sửa chứng từ đã chốt vẫn cần được thực hiện bằng ràng buộc phù hợp và xử lý nghiệp vụ.
