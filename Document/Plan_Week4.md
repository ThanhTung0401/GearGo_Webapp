# GearGo — Week 4: Nhận trả, phụ phí, đối soát và hoàn tiền

> **Kế hoạch backend chi tiết — bản tái cấu trúc theo tên thành viên.** Week 2 đã hoàn thành theo xác nhận của nhóm; toàn bộ Entities đã viết. Phạm vi giao việc là Service, Controller, interface, DTO và tích hợp/kiểm tra cần thiết. Với Week 4, các tuần trước là điều kiện đầu vào cần chạy được khi bắt đầu triển khai.

**Nhóm:** Thanh Tùng (Người 1), Kiện Minh (Người 2), Minh Tú (Người 3), Kim Xuyến (Người 4), Tuấn Kiệt (Người 5). Tên này là tên thành viên phát triển, không phải role của tài khoản trong hệ thống.

**Nền tảng:** ASP.NET Core Web API, EF Core, SQL Server, JWT, JSON; React gọi API riêng. Dùng phiên bản/cấu hình đang chạy trong repo của nhóm.

**Tài liệu chuẩn:** đặc tả `GearGo_Dac_Ta_Nghiep_Vu(7).md`, ERD bản `erd.txt` và nền tảng Plan Week 2 đã hoàn thành. Bản `ERD(20260925-062324).dbml` cũ thiếu `THIET_BI.ma_san_pham_hien_tai` và FK tương ứng; bản `erd.txt` gửi sau có chúng và khớp đặc tả giáng cấp. Bốn plan dùng bản `erd.txt` làm chuẩn, không sửa các tài liệu nguồn.

**Cách đọc:** bảng mục 2 cho biết ai làm gì; các task có mã `W4-Tn`; từng task nêu hợp đồng request/response, method, quy tắc nghiệp vụ, luồng xử lý, lỗi và ca nghiệm thu. Các request mẫu cần thay ID bằng dữ liệu seed thực tế. Ngày/giờ trong JSON là fixture; đặt đồng hồ kiểm thử phù hợp với điều kiện trước/sau nghiệp vụ, không gửi nguyên ngày mẫu vào môi trường thật. Ngày 1–5 là ngày làm việc, chưa gắn ngày lịch.

## 1. Phạm vi và ranh giới Tuần 4

| Nghiệp vụ | Kết quả cần đạt |
|---|---|
| UC12 — Nhận trả | Phiếu nhận trả theo đợt; mỗi thiết bị chỉ được kết luận trả/mất một lần; biết thiết bị còn nợ |
| UC13 — Quá hạn | Nhãn quá hạn theo đồ chưa trả; phí trễ dự kiến; cảnh báo đơn thuê tiếp theo bị ảnh hưởng |
| UC14 — Phụ phí | Gợi ý, lập, duyệt/từ chối; xử lý tranh chấp; không tính phí trùng cho cùng tổn thất |
| UC15 — Đối soát | Tổng hợp cọc và phụ phí, hoàn phần dư hoặc thu phần thiếu, chốt và hoàn tất đúng điều kiện |
| UC07 — Hủy và hoàn tiền | Khách hủy/cửa hàng hủy trước bàn giao; tính theo chính sách lúc đặt; theo dõi khoản hoàn riêng |
| Ngoại lệ UC06 | Callback lặp, thu trùng, sai số tiền, kết quả chưa rõ, tiền đến sau hết hạn/hủy |
| UC02 và thông báo đã có | Hiển thị đợt trả, đồ còn nợ, phí, bảng đối soát, khoản thu/hoàn và trạng thái xử lý |

**Giới hạn triển khai:**

- Không phân công lại Entities, DbSet, Fluent API, migration hoặc sửa ERD. Nếu có lỗi mapping thực tế cản trở tích hợp, ghi rõ lỗi để người quản lý mô hình xử lý.
- Không làm lại luồng đặt đơn, nhập kho, chuẩn bị và bàn giao của các tuần trước.
- Khi nhận đồ cần vệ sinh/sửa chữa, tạo phiếu bảo trì tối thiểu và loại thiết bị khỏi khả dụng. Quy trình bảo trì đầy đủ, xác nhận sửa xong, thanh lý/giáng cấp vẫn ở Tuần 5.
- Chỉ làm điều chỉnh **phụ phí/đối soát tài chính** cần cho UC15; điều chỉnh nhập kho/kiểm kê UC20–UC22 vẫn ở Tuần 5.
- Có thông báo trong ứng dụng theo hạ tầng Tuần 3. Email/SMS, quản trị toàn bộ chính sách, báo cáo, AI và đánh giá sản phẩm không được kéo vào Tuần 4.
- Đánh dấu đơn đủ điều kiện đánh giá sau hoàn tất; chưa viết API đánh giá UC08.
- Trong phạm vi cơ bản, hoàn cọc sau khi tất cả thiết bị đã có kết luận và đối soát đủ điều kiện; không tự hoàn một phần cọc sau mỗi đợt trả.

## 2. Phân công Service và Controller

| Người | Phụ trách chính | Service mới / mở rộng | Controller sở hữu | Task |
|---|---|---|---|---|
| **Thanh Tùng** | Hủy đơn, hoàn tiền, mở rộng theo dõi đơn/thông báo và tích hợp chung | Mới `HuyDonService`, `HoanTienService`; mở rộng truy vấn/lịch sử/thông báo Tuần 3 | Mở rộng `DonThueController` khách và vận hành; mới `HoanTienController` | W4-T6, W4-T7, W4-T9 |
| **Kiện Minh** | Phụ phí, duyệt phí và tranh chấp | Mới `PhuPhiService` | Mới `PhuPhiController` | W4-T3 |
| **Minh Tú** | Quá hạn, khả dụng sau trả, giao dịch thu và ngoại lệ thanh toán | Mới `QuaHanService`; mở rộng `KhaDungService`, `ThanhToanService` và adapter gateway hiện có | Mới `QuaHanController`; mở rộng `ThanhToanController` | W4-T2, W4-T5, W4-T8 |
| **Kim Xuyến** | Đối soát tiền cọc, hoàn tất và điều chỉnh đối soát | Mới `DoiSoatService`; bổ sung giải phóng phân công khi hủy theo contract | Mới `DoiSoatController` | W4-T4 |
| **Tuấn Kiệt** | Nhận trả nhiều đợt, kết luận mất và trạng thái thiết bị sau kiểm tra | Mới `NhanTraService`; tái sử dụng phần tạo phiếu bảo trì tối thiểu | Mới `NhanTraController` | W4-T1 |

Mỗi người viết interface `I...Service`, implementation, DTO và kiểm tra API của mình. Controller không chứa công thức phí hoặc transaction nghiệp vụ. Mỗi file có một người sửa chính; Thanh Tùng tích hợp DI và cấu hình chung từ danh sách các thành viên gửi.

**Phân định phần tiền:** Kim Xuyến quyết định cần thu/hoàn bao nhiêu từ bảng đối soát; Minh Tú thực hiện và ghi nhận **thu tiền**; Thanh Tùng thực hiện và ghi nhận **hoàn tiền**. Không có ba nơi cùng tạo một giao dịch cho một nghĩa vụ.

## 3. Quy ước bắt buộc trước khi code

### 3.1 Trạng thái và quyền

- Trả một phần vẫn giữ đơn `DangThue`; `TraMotPhan` và `QuaHan` là nhãn tính từ dữ liệu, không tự thêm cột hoặc thay bằng trạng thái kết thúc.
- Chỉ khi tất cả thiết bị đã được trả/kiểm tra hoặc có kết luận mất hợp lệ thì chuyển `DaNhanTra`, sau đó `ChoDoiSoat`; ghi lịch sử cho các bước chuyển.
- `HoanTat` chỉ khi nghĩa vụ giao nhận và tài chính đã xong, không còn phí/tranh chấp hoặc giao dịch chưa rõ cần xử lý của lần đối soát đó.
- Hủy đơn trước bàn giao và hoàn tiền là hai tiến trình khác nhau: đơn có thể đã hủy trong khi khoản hoàn còn chờ. Không tự khôi phục đơn vì hoàn tiền thất bại.
- Tên enum trong tài liệu mang ý nghĩa tham chiếu; dùng tên tương ứng đã có trong dự án, không tự đổi cấu trúc Entity.
- Khách chỉ xem/đề nghị hủy/thanh toán/tranh chấp đơn của mình. Nhân viên nhận trả/lập phí/đối soát trong quyền; quản trị viên duyệt mất, khoản vượt quyền và ngoại lệ.
- Quyền duyệt phí/đối soát lấy theo chính sách và cơ chế phân quyền đã thống nhất; nếu chưa xác định quyền của nhân viên thì chuyển quản trị viên duyệt, không mặc định mọi nhân viên được duyệt mọi khoản.
- Người thao tác lấy từ phiên đăng nhập; chứng từ dùng `MaNhanVien`, lịch sử và `DON_THUE.ma_nguoi_huy` dùng `MaTaiKhoan` đúng FK. Kiểm tra quyền hiện tại, kể cả khi JWT chưa hết hạn.
- Khách bị khóa không tạo giao dịch mới; nhân viên vẫn tiếp tục nhận trả, xử lý phí và khoản hoàn đã phát sinh từ đơn của khách đó.

### 3.2 Chính sách, tiền và dữ liệu lịch sử

- Đọc chính sách qua `DON_THUE.ma_chinh_sach`; giá thuê, cọc, giá trị bồi thường và phụ kiện lấy từ snapshot lúc đặt. Không dùng giá/chính sách mới nhất của cửa hàng để tính lại đơn cũ.
- Tiền dùng `decimal`, làm tròn đến đồng Việt Nam khi tạo khoản thu/hoàn/phụ phí. Thống nhất cách làm tròn trong helper hiện có; không để mỗi module dùng một quy tắc.
- Tiền thuê trả trước không thu lại khi trả đồ. Cọc không phải doanh thu; hoàn cọc đi qua `HOAN_TIEN`, không ghi một khoản thu âm hoặc mục đích `HoanCoc` trong chi tiết thanh toán.
- Số đã thanh toán/hoàn chỉ lấy giao dịch có kết quả thành công và đã được xác định đúng mục đích. Khoản đang xử lý, thất bại hoặc cần đối chiếu chưa được tự dùng để xác nhận đủ tiền.
- Trả đồ không phải mua thêm hàng: cập nhật thiết bị hiện hữu, không tạo phiếu nhập hay tạo thêm thiết bị.

### 3.3 Transaction, gọi gateway và chống xử lý lặp

- Khóa/cập nhật có điều kiện ở database cho các thao tác cùng đơn, thiết bị, đối soát hoặc nguồn tiền. Kiểm tra rồi ghi phải nằm trong cùng transaction.
- Phiếu, trạng thái đơn/thiết bị, lịch sử và thông báo nghiệp vụ liên quan phải commit cùng nhau; service phụ dùng transaction của bên gọi.
- Với thu/hoàn qua gateway: lưu yêu cầu bền vững trong database → commit → gửi yêu cầu ra gateway → ghi nhận kết quả đã xác minh trong transaction khác. Không giữ transaction database mở trong lúc chờ mạng và không giả định rollback database có thể hoàn tác khoản tiền đã chuyển.
- Yêu cầu chưa rõ kết quả phải được truy vấn/đối chiếu bằng cùng mã yêu cầu; không tạo mã mới rồi thử thu/hoàn thêm lần nữa.
- Các hàng đang chờ/đang xử lý trong `THANH_TOAN`, `HOAN_TIEN` là dữ liệu để tiếp tục xử lý sau khi ứng dụng khởi động lại; không chỉ giữ trạng thái chờ trong RAM.
- Callback/gateway mock chỉ phục vụ môi trường phát triển. Kết quả phải đi qua adapter kiểm tra mã yêu cầu, giao dịch, số tiền và trạng thái; không coi query `success=true` do client gửi là bằng chứng đã thu/hoàn thật.

### 3.4 Các quan hệ ERD cần dùng chính xác

| Quan hệ/trường | Cách dùng |
|---|---|
| `PHIEU_NHAN_TRA.ma_don_thue` | Một đơn có nhiều phiếu nhận trả, không phải một-một |
| `(ma_don_thue, lan_tra)` unique | Sinh số đợt trong transaction khóa đơn; không dùng `MAX + 1` thiếu bảo vệ |
| `CHI_TIET_NHAN_TRA.ma_chi_tiet_ban_giao` unique | Một thiết bị bàn giao có tối đa một dòng nhận trả/kết luận mất, kể cả giữa các phiếu nháp |
| `thoi_diem_tra_thuc_te` | Mốc trả của từng thiết bị; không thay bằng giờ chốt cả phiếu khi tính trễ |
| `ma_nguoi_duyet_mat`, `thoi_diem_duyet_mat`, `bien_ban_mat` | Lưu phê duyệt mất, không giả lập một lần đã trả vật lý |
| `PHU_PHI.ma_chi_tiet_ban_giao` | Gắn phí thiết bị với chi tiết bàn giao, không gán ID chi tiết nhận trả vào FK này |
| `PHU_PHI.ma_doi_soat` | Gắn khoản phí vào đúng lần đối soát, không đếm lại phí đã xử lý ở lần trước |
| `GIAO_DICH_DOI_SOAT.ma_chi_tiet_thanh_toan` unique | Một chi tiết thu chỉ liên kết một lần đối soát; không nối lại khoản thu cũ vào phiếu điều chỉnh |
| `HOAN_TIEN.ma_chi_tiet_thanh_toan_goc` | Bắt buộc tham chiếu chi tiết thu gốc, không tham chiếu trực tiếp chỉ mã đơn hoặc mã thanh toán |
| `HOAN_TIEN.ma_doi_soat` | Có khi hoàn theo đối soát; có thể null khi hoàn do hủy/thu thừa độc lập với đối soát |
| `ma_phu_phi_goc`, `ma_doi_soat_goc` | Tạo khoản điều chỉnh mới, giữ nguyên bản đã chốt |
| `ma_yeu_cau` ở bảng thu/hoàn | Có unique theo từng bảng; dùng mã ổn định cho cùng một yêu cầu xử lý |


### Quy ước triển khai áp dụng cho toàn bộ task trong tuần

**Phần có sẵn:** xác thực JWT, giỏ/báo giá, tạo đơn/giữ chỗ, thanh toán của Week 2 và toàn bộ Entities. Các file Service/Controller ghi trong từng task là vị trí đề xuất trong repo; mở rộng implementation hiện có nếu cùng chức năng. DTO/lỗi mới là hợp đồng API, không phải yêu cầu thêm cột database.

| Nội dung | Quy ước chốt cho nhóm |
|---|---|
| Danh tính thực thi | `NguoiThucHien` là context nội bộ dựng từ JWT/tài khoản hiện tại: mã tài khoản, vai trò, mã khách hoặc nhân viên tương ứng. Client không tự gửi context này. Callback/job dùng danh tính hệ thống đã xác minh. |
| Kiểu dữ liệu | ID `long`; số lượng `int`; tiền `decimal`, VND; input thời gian nhận offset hoặc UTC theo contract Week 2. Các ví dụ JSON bên dưới dùng UTC và số VND, camelCase để minh họa. |
| Chữ ký method | Dùng `Task<Result<T>>`/`Task<Result>` theo convention Week 2 và `CancellationToken` nếu dự án đang dùng; chữ ký trong bảng mô tả tham số/kết quả nghiệp vụ, không yêu cầu thay mọi interface cũ. |
| Phân trang | `trang >= 1`, `soMoiTrang` mặc định 20, tối đa đề xuất 100; response gồm `items, tongSo, trang, soMoiTrang`. Đây là giới hạn ứng dụng đề xuất, thống nhất Day 1. Sort có khóa ID để ổn định. |
| Giới hạn request | Giới hạn độ dài theo ERD và cấu hình ứng dụng; ảnh/bằng chứng dùng tham chiếu tệp hợp lệ của cơ chế đã có. Không nhận blob/base64 không giới hạn trong các DTO nghiệp vụ. |
| Response mutation | Tạo mới 201, cập nhật/lấy lại kết quả 200 theo chuẩn repo; trả mã chứng từ, trạng thái, số liệu server tính và những việc còn chờ. Không trả raw Entity hoặc graph navigation. |
| Lỗi | 400 sai dữ liệu; 401 chưa xác thực; 403 role bị cấm; 404 tài nguyên không tồn tại/ngoài phạm vi chủ theo chuẩn repo; 409 xung đột trạng thái/số liệu; 503 phụ thuộc ngoài không sẵn sàng khi không có fallback. Body `{maLoi, thongDiep, chiTiet, traceId?}` không chứa secret. |
| Giao dịch | Một use case ghi nhiều bảng có một transaction chính. Helper sử dụng cùng DbContext/transaction, không tự commit. Việc đọc để kiểm tra lại diễn ra sau khi đã khóa dữ liệu bảo vệ. |
| Gọi dịch vụ ngoài | Lưu yêu cầu và mã tương quan bền vững trước, commit rồi mới gọi gateway/email/AI khi phù hợp. Không giữ transaction SQL trong lúc chờ phản hồi mạng. Timeout có thể là chưa rõ kết quả, không đồng nghĩa chưa chuyển tiền. |
| Đồng thời | Dùng khóa database/cập nhật có điều kiện/unique đã có; không giả định có `rowversion`. Nhóm chốt một thứ tự khóa cùng code Week 2: các sản phẩm/đơn/thiết bị liên quan phải được xử lý theo cùng thứ tự ở mọi đường ghi; khóa nhiều ID theo thứ tự tăng. |
| Phạm vi khóa | Khi tác động khả dụng, phải bảo vệ cam kết theo sản phẩm cùng với thiết bị cụ thể; chỉ khóa thiết bị không ngăn đơn mới đang đặt theo số lượng. Thanh toán/hoàn khóa đơn, nghĩa vụ và nguồn tiền theo thứ tự chung. |
| Retry | Chỉ tự thử lại transaction database khi biết rollback hoàn toàn và không có tác dụng ngoài; giới hạn số lần. Retry thu/hoàn dùng lại mã yêu cầu cũ và tra gateway; không sinh yêu cầu mới sau timeout không rõ. |
| Chứng từ chốt | Phiếu đã chốt giữ snapshot, người và thời điểm; lỗi sau chốt đi qua chứng từ điều chỉnh có phê duyệt. Request sửa trạng thái tùy ý bị từ chối. |
| Quyền và tài khoản khóa | Quyền nhân viên kiểm tra hiện tại trước thao tác; các nghĩa vụ trả đồ/thu/hoàn của khách bị khóa vẫn được nhân viên và hệ thống tiếp tục xử lý. Không vì khóa khách mà bỏ callback tiền hoặc mất dấu đơn. |

**Trình tự hoàn thành một task:** chốt DTO/interface → viết Service với dữ liệu mẫu → nối Controller/quyền → chạy ca hợp lệ và ca lỗi của task → tích hợp với chủ service phụ thuộc → ghi kết quả nghiệm thu. Ca trong plan là việc cần chạy, không phải kết quả test đã thực hiện trên code nhóm.

**Chuẩn hóa các lựa chọn chưa được ERD quyết định:** tên enum cụ thể, giới hạn trang, mã lỗi và tên DTO dưới đây là đề xuất triển khai. Mapping sang code hiện có phải được ghi ở Day 1. Không tự sửa ERD để khớp tên minh họa.

**Dữ liệu mẫu và lịch thực hiện:** các ngày, mã chứng từ và URL tệp trong ví dụ là fixture để nhóm thay bằng seed thật. Khi kiểm tra mốc quá khứ/tương lai, dùng đồng hồ kiểm thử phù hợp; không coi ngày minh họa là lịch triển khai. Lịch 5 ngày giả định mọi người có nền tảng Week 2 chạy được và thời gian làm việc đều trong tuần. Nếu thiếu điều kiện đầu vào, cập nhật mốc cùng chủ phụ thuộc; giữ các tiêu chí nghiệm thu và tránh dồn module mới vào ngày cuối.


## 4. W4-T1 — Nhận trả nhiều đợt và kết luận mất (Tuấn Kiệt)

### 4.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC12. **Service/Controller:** `INhanTraService` + `NhanTraService`; `NhanTraController`.

**Method chính:** `LayDanhSachDotTraAsync`, `LayThietBiConNoAsync`, `TaoPhieuNhanTraNhapAsync`, `CapNhatPhieuNhanTraNhapAsync`, `DuyetKetLuanMatAsync`, `ChotNhanTraAsync`.

#### Lập nháp và kiểm tra từng thiết bị

- [ ] Đơn đang thuê và có phiếu bàn giao đã chốt. Chỉ chọn thiết bị thật sự đã giao trong đơn, không nhận thay một mã chưa từng giao.
- [ ] Tạo `lan_tra` và mã `PNT-{MaDonHienThi}-{lan_tra}` ở server trong transaction khóa đơn; retry hợp lệ trả lại phiếu đã tạo thay vì tạo đợt trống mới.
- [ ] Request tạo nháp có danh sách chi tiết bàn giao. Nếu cùng các chi tiết đã nằm trong phiếu nháp thì trả phiếu hiện có hoặc 409 chỉ rõ phiếu đang giữ; không chèn lần hai để vướng unique rồi coi là đã nhận.
- [ ] Ghi thời điểm trả thực tế riêng từng thiết bị tại lúc tiếp nhận, tình trạng sau thuê, phụ kiện thực nhận/còn thiếu, ảnh và ghi chú. Nếu cần sửa thời điểm ghi sai thì yêu cầu quyền phù hợp và lưu lý do/nhật ký.
- [ ] So sánh tình trạng, phụ kiện với biên bản bàn giao; tình trạng bất thường phải có bằng chứng.
- [ ] Chưa trả thì tiếp tục là đồ còn nợ, không tự đưa vào phiếu như đã trả vì khách nói “sẽ trả sau”.
- [ ] Dòng nằm trong phiếu nháp chưa được tính đã hoàn thành nghĩa vụ và chưa giải phóng khả dụng. Nếu xóa một dòng nhập nhầm ở nháp, chỉ xóa dữ liệu nháp đó và ghi nhật ký; không xóa lịch sử đã chốt.

#### Trường hợp mất thiết bị

- [ ] Lập hồ sơ mất bằng trường sẵn có trên chi tiết nhận trả: kết luận đề nghị, biên bản, bằng chứng, trạng thái chờ xử lý. Không điền giả `thoi_diem_tra_thuc_te` cho đồ chưa về.
- [ ] Kiện Minh lập/duyệt phụ phí mất gắn với cùng chi tiết bàn giao; quản trị viên phê duyệt kết luận mất, lưu người và thời điểm.
- [ ] Chỉ coi nghĩa vụ trả đã được giải quyết khi có kết luận mất được duyệt, biên bản và phụ phí bồi thường đã được duyệt. Khoản tranh chấp chưa xong vẫn chặn đối soát tài chính.
- [ ] Không tạo dòng nhận trả thứ hai khi hồ sơ mất được duyệt; cập nhật đúng dòng đang chờ theo unique FK hiện có.
- [ ] Nếu đợt này có đồ đã trả thực tế và một hồ sơ mất chưa được duyệt, chốt riêng phần đã đủ kết luận; hồ sơ mất giữ ở phiếu nháp riêng để không ngăn nhận đồ đã về. Nếu cần tách, di chuyển dòng nháp sang phiếu nháp khác trong transaction, không nhân bản dòng; mỗi thiết bị vẫn chỉ có một dòng nhận trả.
- [ ] Thiết bị được xác nhận mất chuyển thất lạc, giữ lịch sử. Phí trễ dừng tại thời điểm kết luận mất được duyệt, không kéo dài đến ngày khách trả tiền bồi thường.

#### Chốt nhận trả

1. Khóa đơn, phiếu và thiết bị liên quan; kiểm tra lại trạng thái và quyền. Phiếu đã chốt trả kết quả cũ cho yêu cầu lặp hợp lệ.
2. Kiểm tra mọi dòng của phiếu thuộc đúng bàn giao, không có kết luận đã chốt ở nơi khác, có đủ tình trạng/bằng chứng và kết luận hợp lệ.
3. Thiết bị đã về và đạt kiểm tra chuyển sẵn sàng; thiết bị cần vệ sinh/sửa chữa chuyển bảo trì và có phiếu xử lý tối thiểu. Ngừng sử dụng/thanh lý là quyết định riêng theo quyền, không mặc định từ một ghi chú “hỏng”.
4. Hồ sơ mất đủ phê duyệt chuyển thất lạc; không đưa thiết bị này về kho sẵn sàng.
5. Đếm lại toàn bộ chi tiết bàn giao chưa có kết luận trả/mất hợp lệ của các phiếu đã chốt. Còn đồ thì giữ `DangThue` và `la_lan_tra_cuoi = false`.
6. Nếu không còn đồ chưa có kết luận, server đánh dấu `la_lan_tra_cuoi = true`; ghi chuyển `DaNhanTra → ChoDoiSoat`. Client không được tự đánh dấu đợt cuối.
7. Ghi thời điểm chốt, snapshot tên nhân viên, lịch sử/nhật ký; commit tất cả. Không tự hoàn cọc hay hoàn tất đơn tại bước này.

- [ ] Thiết bị đã trả/kiểm tra đạt có thể phục vụ lịch tiếp theo dù đơn cũ còn chờ đối soát; Minh Tú phải loại phần cam kết đã hoàn thành khỏi phép tính khả dụng của đơn cũ.
- [ ] Nếu nhận đồ hỏng/quá hạn làm ảnh hưởng phân công tương lai, trả cảnh báo các đơn liên quan để nhân viên xử lý bằng luồng chuẩn bị Tuần 3.
- [ ] Phiếu đã chốt không sửa/xóa để làm thiết bị xuất hiện lại trong một đợt trả khác.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/nhan-tra/theo-don/{donId}` | Nhân viên, quản trị viên |
| GET | `/api/nhan-tra/theo-don/{donId}/con-no` | Nhân viên, quản trị viên |
| POST | `/api/nhan-tra/theo-don/{donId}` | Lập nháp; nhân viên/quản trị viên |
| PUT | `/api/nhan-tra/{phieuId}` | Sửa nháp theo quyền |
| POST | `/api/nhan-tra/{phieuId}/chi-tiet/{chiTietId}/duyet-mat` | Quản trị viên, đủ căn cứ và phụ phí liên quan |
| POST | `/api/nhan-tra/{phieuId}/chot` | Nhân viên, quản trị viên |

**Nghiệm thu:** Giao 3 thiết bị, trả 2 ở đợt đầu → vẫn đang thuê và còn nợ đúng 1. Đợt sau kết luận chiếc cuối → chờ đối soát. Không thể trả cùng chiếc hai lần hoặc coi phiếu nháp là đã trả.

### 4.A. Thành phần phải bàn giao — Tuấn Kiệt

- [ ] `Services/Interfaces/INhanTraService.cs`
- [ ] `Services/NhanTraService.cs`
- [ ] `Controllers/NhanTraController.cs`
- [ ] `Models/DTOs/NhanTra/`
- [ ] `Services/BaoTriService.cs (helper tối thiểu dùng chung)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 4.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TaoNhanTraRequest | danhSachChiTietBanGiao[], ghiChu? | Mảng không trùng ID, không rỗng; mọi ID thuộc phiếu bàn giao đã chốt của đơn trên route. |
| DongNhanTraRequest | maChiTietBanGiao, thoiDiemTraThucTe?, ketLuan, tinhTrangSauThue, phuKienThucNhan, phuKienConThieu, danhSachAnh, bienBanMat?, ghiChu? | Đã về: giờ trả không trước giờ giao hoặc ở tương lai; đề nghị mất: giờ trả null, có biên bản/bằng chứng. |
| DuyetMatRequest | lyDo, bienBanMat, maPhuPhiBoiThuong | Admin; khoản phí thuộc đúng đơn/chi tiết bàn giao, đã được duyệt; người/giờ duyệt lấy server. |
| TachDongChoXuLyRequest | danhSachChiTietNhanTra[], lyDo | Chỉ di chuyển dòng nháp; phiếu đích nháp thuộc cùng đơn, tạo số đợt dưới khóa đơn. |
| NhanTraResponse | maPhieu, lanTra, trangThai, chiTiet[], laLanTraCuoi, soThietBiConNo, canhBaoDonSau[] | Đợt cuối và số còn nợ do server tính từ các phiếu đã chốt; không nhận các trường này từ client. |


### 4.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayDanhSachDotTraAsync(donId, actor) | Danh sách phiếu và số đã kết luận/còn nợ | GET; không tạo nháp khi đọc. |
| LayThietBiConNoAsync(donId, actor) | Từng chi tiết bàn giao chưa kết luận | Kèm phiếu nháp đang giữ và trạng thái mất; không chỉ tính bằng trạng thái đơn. |
| TaoPhieuNhanTraNhapAsync(donId, dto, actor) | Phiếu nháp + chi tiết | Khóa đơn, sinh lan_tra, INSERT PHIEU_NHAN_TRA/CHI_TIET_NHAN_TRA; chưa đổi khả dụng. |
| CapNhatPhieuNhanTraNhapAsync(phieuId, dto, actor) | Nháp sau kiểm tra | Khóa đơn/phiếu; không sửa phiếu đã chốt hoặc dòng của phiếu khác. |
| TachDongChoXuLyAsync(phieuId, dto, actor) | Phiếu gốc và nháp đích | Method bổ sung; UPDATE FK ma_phieu_nhan_tra của dòng nháp trong một transaction, không nhân bản dòng. |
| DuyetKetLuanMatAsync(phieuId, chiTietId, dto, actor) | Kết luận mất đã duyệt | Ghi người/giờ duyệt trên dòng đang có; kiểm tra khoản bồi thường đã duyệt. |
| ChotNhanTraAsync(phieuId, actor) | Phiếu chốt + trạng thái đơn/thiết bị | Một transaction cho phiếu, thiết bị, bảo trì tối thiểu, lịch sử và thông báo; không chuyển tiền. |


### 4.D. Trình tự triển khai và tích hợp

1. Tuấn Kiệt và Kiện Minh thống nhất quan hệ mất: được lập/duyệt phí dựa trên hồ sơ đề nghị mất trước; chỉ chốt mất sau khi cả kết luận mất và bồi thường đều được duyệt, tránh hai service chờ vòng nhau.
2. Tạo nháp dưới khóa đơn; nếu dòng đã nằm trong nháp khác, trả ID phiếu đó để frontend mở tiếp. Unique chi tiết bàn giao áp dụng cả bản nháp, không đợi đến lúc chốt mới kiểm tra.
3. Nhân viên kiểm đồ thực tế, ghi giờ nhận riêng từng chiếc và ảnh/phụ kiện. Mốc giờ chỉ được sửa khi phiếu còn nháp, có lý do/audit; không dùng giờ nhập dữ liệu thay giờ trả nếu hai thời điểm khác nhau.
4. Thêm action đề xuất POST /api/nhan-tra/{phieuId}/tach-cho-xu-ly cho các dòng mất/hỏng chưa đủ căn cứ; khóa cả hai phiếu, di chuyển dòng và trả lại cả hai DTO. Hủy nháp rỗng theo convention, không tái sử dụng số đợt đã cấp.
5. Chốt: kiểm tra lại toàn bộ dòng, quyền và các phê duyệt dưới khóa; một dòng sai thì rollback cả phiếu, không chốt nửa phiếu ngầm.
6. Thiết bị thực nhận đạt kiểm tra chuyển sẵn sàng; cần xử lý chuyển bảo trì, gọi helper cùng transaction và không tạo phiếu bảo trì mở trùng. Đồ mất chuyển thất lạc, giữ giờ trả null.
7. Đếm số chi tiết bàn giao chưa có kết luận hợp lệ trong phiếu đã chốt. Còn ít nhất một chiếc: giữ DangThue; hết: ghi đủ lịch sử DangThue → DaNhanTra → ChoDoiSoat và server đánh dấu đợt cuối.
8. Gửi Minh Tú tập ID đã hết nghĩa vụ và thiết bị phải chặn; KhaDungService đọc trực tiếp dữ liệu chốt nên không phụ thuộc thông báo/job để thấy thiết bị được giải phóng.
9. Request chốt lặp trả biên bản đã chốt nếu cùng ý định; payload sửa nội dung sau chốt bị 409. Trả cảnh báo lịch sau nhưng không tự hủy/thay sản phẩm của đơn sau.

### 4.E. Ví dụ contract

Ví dụ một dòng đã thực nhận trong request sửa nháp:
```json
{"maChiTietBanGiao":801,"thoiDiemTraThucTe":"2026-10-08T03:00:00Z","ketLuan":"Dat","tinhTrangSauThue":"Khô, nguyên vẹn","phuKienThucNhan":[{"ten":"Cọc lều","soLuong":8}],"phuKienConThieu":[],"danhSachAnh":["files/demo/tra-801.jpg"]}
```
Fixture này chạy với đồng hồ giả lập sau giờ trả. Không gửi `laLanTraCuoi`, `maNhanVien` hoặc giá phụ phí trong dòng nhận trả.

### 4.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| THIET_BI_KHONG_THUOC_BAN_GIAO | 400 | ID không thuộc danh sách thật sự đã giao của đơn. |
| DONG_DA_CO_PHIEU_NHAN | 409 | Có nháp/chốt khác; trả maPhieu đang giữ, không chèn dòng trùng. |
| PHIEU_NHAN_DA_CHOT | 409 | Đang sửa/tách dữ liệu phiếu chốt. |
| KET_LUAN_MAT_CHUA_DU | 409 | Thiếu biên bản, phê duyệt admin hoặc phí bồi thường đã duyệt. |
| THOI_DIEM_TRA_KHONG_HOP_LE | 400 | Giờ trả trước giao, ở tương lai hoặc gán cho thiết bị chưa về. |


### 4.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T1-A01 | Giao 3 chiếc; chốt nhận 2 chiếc tốt | Chỉ 2 chiếc hết nghĩa vụ, đơn DangThue, còn nợ 1, đợt đầu không là đợt cuối. |
| W4-T1-A02 | Hai request tạo nháp cùng chi tiết bàn giao | Chỉ 1 dòng nhận trả; request sau nhận nháp có sẵn hoặc 409 có tham chiếu. |
| W4-T1-A03 | Hai chiếc thực về và một chiếc mất chưa duyệt nằm cùng nháp | Tách dòng mất rồi chốt phần đã về; giữ đúng một dòng nhận trả cho chiếc mất. |
| W4-T1-A04 | Mất đã có bồi thường duyệt nhưng chưa admin duyệt kết luận | Không chốt mất, không đưa thiết bị về sẵn sàng. |
| W4-T1-A05 | Chốt chiếc cuối đủ hồ sơ mất | Không có giờ trả giả; thiết bị thất lạc; đơn ChoDoiSoat, phí trễ dùng giờ duyệt mất. |
| W4-T1-A06 | Lỗi database sau khi đổi trạng thái chiếc thứ nhất | Toàn bộ phiếu/trạng thái/bảo trì/lịch sử rollback. |
| W4-T1-A07 | Đơn đã trả đủ nhưng còn tranh chấp tiền | Thiết bị tốt phục vụ lượt tiếp theo; đối soát tiền vẫn bị chặn. |


**Đóng W4-T1:** Tuấn Kiệt bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 5. W4-T2 — Quá hạn và khả dụng sau nhận trả (Minh Tú)

### 5.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC13. **Service/Controller:** `IQuaHanService` + `QuaHanService`; `QuaHanController`; mở rộng `KhaDungService` đã có.

**Method chính:** `LayDonQuaHanAsync`, `LayChiTietQuaHanAsync`, `TinhPhiTreDuKienAsync`, `LayDonBiAnhHuongAsync`, `QuetVaTaoNhacQuaHanAsync`.

- [ ] Quá hạn khi thời điểm hiện tại vượt giờ trả dự kiến và còn thiết bị chưa có kết luận trả/mất hợp lệ. Đúng giờ trả chưa phát sinh khoảng trễ dương.
- [ ] Nhãn trả một phần và quá hạn có thể cùng xuất hiện; không đổi trạng thái đơn sang một giá trị làm mất luồng đang thuê.
- [ ] Phí dự kiến tính riêng từng thiết bị còn nợ; đồ đã trả dùng giờ trả thực tế, đồ mất dùng giờ duyệt mất khi có kết luận hợp lệ.
- [ ] Phí dự kiến chỉ là số tham khảo trong response, không tạo mỗi phút một bản ghi `PHU_PHI` mới và không tự ghi nhận đã thu.
- [ ] Thiết bị còn nợ quá hạn tiếp tục không khả dụng; giờ trả dự kiến hoặc ngày sửa xong dự kiến không tự giải phóng thiết bị.
- [ ] Thiết bị đã nhận trả/kiểm tra đạt chỉ hết cam kết của lượt thuê cũ; vẫn phải xét các lịch giữ chỗ, đơn đã xác nhận và phân công khác.
- [ ] Với đơn trả một phần, giảm phần nghĩa vụ còn chiếm lịch theo từng thiết bị đã kết luận. Không tiếp tục trừ nguyên số lượng đặt ban đầu cho tới khi đối soát xong.
- [ ] Tìm các đơn tương lai đang gán chiếc quá hạn/hỏng và kiểm tra nguy cơ thiếu số lượng theo sản phẩm; trả danh sách ảnh hưởng để nhân viên thay thiết bị. Không tự thay sản phẩm hoặc tự hủy đơn sau.
- [ ] Nhắc quá hạn dùng service thông báo Tuần 3; mã sự kiện theo đơn và mốc nhắc trong chính sách. Job chạy lại không spam cùng một mốc.
- [ ] Logic truy vấn phải đúng ngay cả khi job chưa chạy. Nếu dùng HostedService để quét định kỳ, nó chỉ gọi service này; không nhân đôi logic quá hạn trong Controller/job.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/qua-han` | Nhân viên, quản trị viên |
| GET | `/api/qua-han/{donId}` | Nhân viên, quản trị viên |
| GET | `/api/qua-han/{donId}/don-bi-anh-huong` | Nhân viên, quản trị viên |

Khách xem nhãn, đồ còn nợ và phí dự kiến qua API đơn của mình. Công thức gợi ý phí trễ dùng chung với Kiện Minh; hai module không tự viết hai công thức khác nhau.

### 5.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/Interfaces/IQuaHanService.cs`
- [ ] `Services/QuaHanService.cs`
- [ ] `Services/KhaDungService.cs (mở rộng)`
- [ ] `Controllers/QuaHanController.cs`
- [ ] `Models/DTOs/QuaHan/`
- [ ] `Jobs/QuaHanJob.cs (nếu dùng HostedService)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 5.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LocQuaHanRequest | denThoiDiem?, maDon?, maSanPham?, trang, soMoiTrang | Trong vận hành mặc định giờ server; thời gian giả chỉ dùng test, không cho khách sửa giờ tính. |
| QuaHanChiTietResponse | giờ hẹn trả, đồ còn nợ, giờ kết thúc thực tế từng chiếc, ngày trễ, phí dự kiến, nhãn trả một phần | Phí là dự kiến, không khẳng định đã duyệt/đã thu. |
| DonBiAnhHuongResponse | đơn sau, sản phẩm, thiết bị bị vướng, số lượng thiếu, khoảng lịch, nguyên nhân | Tách xung đột một thiết bị đã gán với thiếu tổng số lượng theo sản phẩm. |


### 5.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayDonQuaHanAsync(filter, actor) | Trang đơn thực sự còn đồ trễ | Đọc bàn giao/kết luận đã chốt; không UPDATE trạng thái đơn. |
| LayChiTietQuaHanAsync(donId, actor) | Chi tiết từng chiếc và tổng dự kiến | Dùng một mốc now cho cả response để không lệch qua ngày tính phí. |
| TinhPhiTreDuKienAsync(chiTietBanGiaoId, mocTinh) | Ngày trễ, đơn giá snapshot, hệ số, số tiền | Helper chung cho PhuPhiService; không ghi PHU_PHI. |
| LayDonBiAnhHuongAsync(donId, actor) | Lịch sau cần can thiệp | Dùng KhaDungService, phân công và lịch số lượng; không sửa đơn sau. |
| QuetVaTaoNhacQuaHanAsync(mocQuet) | Số sự kiện mới/bỏ qua/lỗi | Ghi thông báo idempotent qua IThongBaoService; mỗi đơn lỗi không dừng cả lô. |


### 5.D. Trình tự triển khai và tích hợp

1. Thiết kế một projection nghĩa vụ từng chi tiết bàn giao: chưa kết luận / đã trả đạt / bảo trì / mất được duyệt. Nháp không kết thúc nghĩa vụ.
2. Dùng khoảng trễ dương: max(0, mocKetThuc - gioTraDuKien). Ngày trễ bằng ceil(số giờ trễ/24), riêng 0 giờ cho 0 ngày; giá/ngưỡng lấy snapshot và chính sách trên đơn.
3. Đồ chưa về dùng now; đồ đã về dùng thời điểm trả thực tế; mất đủ phê duyệt dùng giờ duyệt mất. Không đợi khách trả phí mới dừng đồng hồ trễ.
4. Sửa KhaDungService để chỉ giữ phần nghĩa vụ chưa kết luận; không trừ nguyên đơn đã trả một phần và không trừ thêm phân công của cùng nghĩa vụ lần nữa.
5. Quá hạn chưa kết luận không được tự giải phóng khi vượt giờ hẹn. Đồ đang bảo trì chỉ được giải phóng sau xác nhận hoàn thành thực tế của Week 5.
6. Kết quả ảnh hưởng phải bao gồm cả đơn đã gán chiếc cụ thể và đơn mới giữ theo sản phẩm. Nhân viên chủ động xử lý bằng ChuanBiDonService, không tự thay thế hàng cho khách.
7. Mốc nhắc lấy cấu hình chính sách/ứng dụng đã chốt; key theo đơn + mốc nhắc, bền vững qua khởi động lại. Job chỉ tạo sự kiện đến hạn, đọc danh sách quá hạn vẫn đúng nếu job ngừng.

### 5.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DON_CHUA_BAN_GIAO | 409 | Không có nghĩa vụ thuê thực tế để lập chi tiết quá hạn. |
| MOC_TINH_KHONG_HOP_LE | 400 | Khoảng filter đảo ngược hoặc sai kiểu thời gian. |
| KHONG_DU_DU_LIEU_SNAPSHOT | 409 | Thiếu giá/chính sách nguồn; không tự dùng giá hiện tại thay thế. |


### 5.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T2-A01 | Hẹn 10:00, trả đúng 10:00 | Ngày trễ 0, phí 0. |
| W4-T2-A02 | Giá snapshot 100.000/ngày, hệ số 1,5; trễ 1 phút | Ngày trễ 1, phí gợi ý 150.000. |
| W4-T2-A03 | Cùng mức giá, trễ đúng 24 giờ và 24 giờ 1 phút | Lần lượt 150.000 và 300.000. |
| W4-T2-A04 | Đặt 3 chiếc, trả đạt 2 chiếc nhưng chưa đối soát | Chỉ chiếc còn nợ tiếp tục chiếm nghĩa vụ cũ; các cam kết khác vẫn được xét. |
| W4-T2-A05 | Job không chạy, nhân viên mở API quá hạn | Vẫn thấy trạng thái quá hạn đúng theo giờ và dữ liệu thực. |
| W4-T2-A06 | Job chạy lại cùng mốc/khởi động lại | Không sinh thêm thông báo cùng key/kênh. |
| W4-T2-A07 | Đồ đang thuê trễ, một đơn sau đã gán chiếc đó và một đơn sau khác chỉ giữ số lượng | Trả đủ hai dạng ảnh hưởng, không tự hủy chúng. |


**Đóng W4-T2:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 6. W4-T3 — Lập, duyệt phụ phí và giải quyết tranh chấp (Kiện Minh)

### 6.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC14. **Service/Controller:** `IPhuPhiService` + `PhuPhiService`; `PhuPhiController`.

**Method chính:** `GoiYPhiAsync`, `LapPhiAsync`, `CapNhatPhiChuaDuyetAsync`, `DuyetPhiAsync`, `TuChoiPhiAsync`, `TaoTranhChapAsync`, `GiaiQuyetTranhChapAsync`, `LapDieuChinhPhiAsync`.

#### Gợi ý và lập phí

- [ ] Dựa vào kết quả nhận trả/kiểm tra và hồ sơ mất; phí gắn thiết bị phải tham chiếu đúng `ma_chi_tiet_ban_giao` của cùng đơn.
- [ ] Hỗ trợ phí trễ, vệ sinh đặc biệt, hư hỏng, mất phụ kiện, mất thiết bị và điều chỉnh có lý do theo đặc tả.
- [ ] Phí trễ của mỗi thiết bị = số ngày trễ làm tròn lên × đơn giá thuê ngày lúc đặt × hệ số chính sách của đơn. Khoảng trễ không dương thì phí bằng 0; mặc định đặc tả là 150% khi chính sách áp dụng quy định mức đó.
- [ ] Phí trễ chính thức lấy giờ trả thực tế hoặc giờ duyệt kết luận mất; không lấy ngày nhân viên duyệt phí nếu khác mốc trả/mất.
- [ ] Giá trị mất/hỏng và bồi thường phụ kiện lấy từ snapshot của dòng đơn. Kiểm tra hao mòn thông thường để không tự thu phí vệ sinh/sửa chữa mọi lần trả.
- [ ] Lưu `can_cu_tinh_phi` gồm loại phí, công thức, dữ liệu đầu vào, chính sách/snapshot được dùng, mức làm tròn và kết quả; lưu lý do và ảnh/bằng chứng.
- [ ] Nhân viên có thể điều chỉnh số gợi ý khi có căn cứ; khoản vượt quyền hoặc khác chính sách chuyển quản trị viên duyệt.
- [ ] Chặn lập lặp cùng loại phí cho cùng sự kiện/tổn thất bằng kiểm tra trong transaction khóa đơn/thiết bị liên quan. Nếu cần sửa khoản cũ thì cập nhật khoản chưa duyệt hoặc lập điều chỉnh đúng quy trình.
- [ ] Không cộng vừa bồi thường mất thiết bị vừa sửa chữa cho cùng tổn thất. Phí trễ hợp lệ có thể tồn tại cùng phí mất, nhưng dừng đúng giờ duyệt mất.
- [ ] Không nhân số lượng của dòng đơn cho một phí đã gắn một thiết bị cụ thể; một dòng đặt 3 chiếc không có nghĩa cả 3 chiếc đều trả trễ/hỏng.

#### Duyệt, tranh chấp và khóa phí

- [ ] Duyệt/từ chối lưu người, thời điểm, lý do. Không cho client tự gửi trạng thái đã duyệt trong request lập phí.
- [ ] Chỉ phí đã duyệt và không còn tranh chấp chưa giải quyết mới được dùng để xác nhận đối soát. Phí bị từ chối không cộng vào tổng.
- [ ] Khách được gửi tranh chấp phí thuộc đơn mình; không được tự sửa số tiền hoặc tự chuyển phí sang đã giải quyết.
- [ ] Quản trị viên lưu kết quả giải quyết; nếu thay đổi số tiền sau khi đã duyệt, phải có dấu vết và phê duyệt tương ứng. Không chỉ đổi nhãn tranh chấp để bỏ qua yêu cầu khách.
- [ ] Khi phí đã đưa vào bảng đối soát xác nhận để xử lý tiền, khóa số tiền/căn cứ của phí đó. Thay đổi sau đó phải qua quy trình mở lại hợp lệ trước giao dịch hoặc tạo khoản điều chỉnh mới.
- [ ] Phí bình thường không âm. Điều chỉnh có dấu tăng/giảm được lưu riêng với `ma_phu_phi_goc`, lý do và phê duyệt quản trị viên; tổng nghĩa vụ sau điều chỉnh không âm.
- [ ] Sau đối soát đã chốt, không sửa/xóa khoản phí gốc; bàn giao khoản điều chỉnh được duyệt cho Kim Xuyến tạo đối soát điều chỉnh.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/phu-phi/theo-don/{donId}` | Nhân viên/quản trị viên; khách đọc qua API đơn của mình |
| GET | `/api/phu-phi/goi-y?maChiTietBanGiao=...` | Nhân viên, quản trị viên |
| POST, PUT | `/api/phu-phi`, `/api/phu-phi/{id}` | Lập/sửa khoản chưa duyệt theo quyền |
| POST | `/api/phu-phi/{id}/duyet`, `/api/phu-phi/{id}/tu-choi` | Theo ngưỡng duyệt; ngoại lệ chỉ quản trị viên |
| POST | `/api/phu-phi/{id}/tranh-chap` | Khách chủ đơn hoặc nhân viên ghi nhận có căn cứ |
| POST | `/api/phu-phi/{id}/giai-quyet-tranh-chap` | Quản trị viên |
| POST | `/api/phu-phi/{id}/dieu-chinh` | Quản trị viên, có lý do và tham chiếu khoản gốc |

**Nghiệm thu:** Trong 3 thiết bị chỉ 1 chiếc trả trễ thì chỉ tính trễ chiếc đó. Phí bị từ chối/tranh chấp chưa xong không được chốt đối soát. Hồ sơ mất không bị thu thêm phí sửa chữa cho cùng tổn thất.

### 6.A. Thành phần phải bàn giao — Kiện Minh

- [ ] `Services/Interfaces/IPhuPhiService.cs`
- [ ] `Services/PhuPhiService.cs`
- [ ] `Controllers/PhuPhiController.cs`
- [ ] `Models/DTOs/PhuPhi/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 6.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LapPhuPhiRequest | maDonThue, maChiTietBanGiao?, loaiPhi, soTienDeNghi?, lyDo, bangChung | Server dựng canCuTinhPhi; phí thường không âm; chỉ khoản theo chiếc mới gắn FK thiết bị bàn giao. |
| DuyetPhuPhiRequest | ketQua, lyDo | Người/giờ/quyền/ngưỡng lấy server; ngoại lệ vượt chính sách cần admin. |
| TranhChapRequest | noiDung, bangChung | Khách chủ đơn hoặc nhân viên ghi nhận; không có soTienMoi/trangThaiDaGiaiQuyet do khách đặt. |
| GiaiQuyetTranhChapRequest | ketQua, lyDo, soTienDeXuatSauXuLy? | Admin, bảo toàn khoản khóa/chốt; nếu cần đổi khoản đã khóa thì lập điều chỉnh. |
| DieuChinhPhiRequest | soTienDieuChinhCoDau, lyDo, bangChung | Tham chiếu ma_phu_phi_goc theo route; cùng đơn, tổng nghĩa vụ sau điều chỉnh >=0. |
| PhuPhiResponse | ID, nguồn bàn giao, loại, số tiền, căn cứ, duyệt, tranh chấp, đối soát đang khóa | Phân biệt đề nghị/đã duyệt/đã sử dụng; khách không thấy ghi chú nội bộ riêng. |


### 6.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| GoiYPhiAsync(chiTietBanGiaoId, actor) | Danh sách gợi ý có công thức/nguồn | Gọi cùng helper trễ của Minh Tú; chỉ đọc. |
| LapPhiAsync(dto, actor) | Khoản chờ duyệt | Khóa đơn/sự kiện, chống cùng tổn thất bị lập lại. |
| CapNhatPhiChuaDuyetAsync(id, dto, actor) | Khoản dự thảo mới | Chỉ khi chưa duyệt/chưa khóa; dựng lại căn cứ server. |
| DuyetPhiAsync / TuChoiPhiAsync(id, dto, actor) | Kết quả phê duyệt | Kiểm tra ngưỡng theo chính sách đơn và quyền hiện tại; audit. |
| TaoTranhChapAsync(id, dto, actor) | Khoản đang tranh chấp | Kiểm tra chủ đơn; khóa đơn/phí cùng thứ tự DoiSoatService. |
| GiaiQuyetTranhChapAsync(id, dto, actor) | Kết quả xử lý và khoản điều chỉnh nếu có | Admin; không ghi đè số tiền đã khóa. |
| LapDieuChinhPhiAsync(phiGocId, dto, actor) | PHU_PHI điều chỉnh có tham chiếu | Kiểm tra delta cộng dồn đã duyệt và không phân bổ lại phí gốc. |


### 6.D. Trình tự triển khai và tích hợp

1. Kiện Minh và Minh Tú chốt một helper tính trễ; lập fixture ranh giới 0/24/24+ phút trước khi viết endpoint.
2. Đọc snapshot giá bồi thường/phụ kiện từ CHI_TIET_DON_THUE theo bàn giao; không dùng giá sản phẩm sau khi khách đã đặt.
3. Phân loại tổn thất, loại hao mòn bình thường; lưu ảnh, mô tả và căn cứ. Mất thiết bị không đồng thời lập sửa chữa cho cùng tổn thất.
4. Khóa đơn khi lập/duyệt để chống hai nhân viên tạo phí tương đương. Không dựa trên unique không tồn tại của PHU_PHI; khóa và kiểm tra điều kiện phải chung transaction.
5. Ngưỡng duyệt staff lấy chính sách áp dụng của đơn. Nếu nhóm muốn cấm tự duyệt thì ghi thành quyết định phân quyền Day 1; đặc tả không được diễn giải thành cấm mặc định khi chưa có quy tắc.
6. Mở tranh chấp trước khi xác nhận đối soát sẽ chặn xác nhận. Nếu tiền đã gửi xử lý, không coi việc mở tranh chấp là đã hủy được giao dịch ngoài; ghi nhận vướng mắc, đối chiếu và đi luồng điều chỉnh khi cần.
7. Phí đã gắn bảng tính xác nhận phải khóa số tiền/căn cứ. Mở lại chỉ khi chưa gửi bất kỳ lệnh tiền nào và đã hủy an toàn các ý định chưa gửi; trạng thái không rõ thì chưa được mở.
8. Bàn giao Kim Xuyến danh sách khoản đủ điều kiện, khoản chờ/tranh chấp và tổng theo từng lần đối soát; mọi delta sau chốt là bản ghi mới.

### 6.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| PHI_TRUNG_TON_THAT | 409 | Đã có khoản tương đương hoặc tổ hợp mất + sửa cho cùng tổn thất. |
| VUOT_QUYEN_DUYET_PHI | 403 | Vượt ngưỡng hoặc ngoại lệ cần admin. |
| PHI_DA_KHOA_DOI_SOAT | 409 | Không thể sửa trực tiếp; trả đối soát liên quan. |
| PHI_DANG_TRANH_CHAP | 409 | Chưa đủ điều kiện xử lý tài chính cuối cùng. |
| DIEU_CHINH_LAM_AM_NGHIA_VU | 400 | Delta khiến tổng phí hiệu lực dưới 0. |


### 6.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T3-A01 | Chỉ 1 trong 3 chiếc trễ một ngày, giá 100.000 và hệ số 1,5 | Phí 150.000, không nhân thành 450.000. |
| W4-T3-A02 | Giá bồi thường master tăng sau đặt | Phí vẫn dựa snapshot lúc đặt và căn cứ chính sách của đơn. |
| W4-T3-A03 | Hai nhân viên cùng lập phí mất một chiếc | Chỉ một khoản hợp lệ; request sau 409 hoặc kết quả cũ cùng ý định. |
| W4-T3-A04 | Có phí mất, thêm phí sửa cùng tổn thất | Bị chặn; phí trễ hợp lệ vẫn có thể tồn tại riêng. |
| W4-T3-A05 | Khách khác mở tranh chấp bằng ID đoán được | Không mở/đọc được khoản phí. |
| W4-T3-A06 | Đối soát đã gửi yêu cầu hoàn nhưng timeout; admin sửa phí | Không mở lại/ghi đè snapshot; phải giải quyết giao dịch chưa rõ trước. |
| W4-T3-A07 | Phí gốc 400.000, đã điều chỉnh -100.000, thêm -350.000 | Bị chặn vì nghĩa vụ còn -50.000; các bản cũ giữ nguyên. |


**Đóng W4-T3:** Kiện Minh bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 7. W4-T4 — Đối soát cọc, hoàn tất và điều chỉnh (Kim Xuyến)

### 7.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC15. **Service/Controller:** `IDoiSoatService` + `DoiSoatService`; `DoiSoatController`.

**Method chính:** `XemTruocAsync`, `LapDoiSoatAsync`, `XacNhanBangTinhAsync`, `YeuCauXuLyTienAsync`, `ChotDoiSoatAsync`, `LapDoiSoatDieuChinhAsync`.

#### Lập bảng đối soát lần đầu

- [ ] Đơn đã có kết luận cho tất cả thiết bị; không còn dòng nhận trả nháp cần giải quyết, hồ sơ mất chưa duyệt, phí chưa có kết luận hoặc tranh chấp đang mở.
- [ ] Khi xem trước, nếu chưa đủ điều kiện thì trả danh sách vướng mắc. Bảng dự kiến không được coi là bảng đã chốt hay cho phép thực hiện hoàn tiền ngay.
- [ ] `C` = cọc thực thu hợp lệ được dùng cho lần đối soát này; loại khoản sai/thu trùng chưa xử lý và khoản đã hoàn hoặc đã phân bổ cho đối soát khác. Không lấy đơn giản `DON_THUE.tong_tien_coc` làm số đã thu.
- [ ] `P` = tổng phụ phí đã duyệt, không còn tranh chấp và thuộc lần đối soát; không cộng phí bị từ chối hoặc tính lại tiền thuê đã trả trước.
- [ ] Hoàn dự kiến `max(C - P, 0)`; thu thêm `max(P - C, 0)`. Nếu bằng nhau thì không tạo giao dịch 0 đồng.
- [ ] Lưu `tien_coc_duoc_doi_soat`, `tong_phu_phi_duoc_duyet`, số cần hoàn/thu và `bang_tinh_doi_soat` có danh sách nguồn cọc, phí và căn cứ.
- [ ] Theo quy ước triển khai tuần này, `GIAO_DICH_DOI_SOAT` nối các chi tiết thu cọc hợp lệ được phân bổ và các chi tiết thu bổ sung thành công với đúng đối soát; `HOAN_TIEN.ma_doi_soat` nối các khoản hoàn. Mỗi chi tiết thu chỉ nối một đối soát theo unique hiện có.
- [ ] Khóa đơn khi lập đối soát ban đầu; chỉ có một đối soát ban đầu có hiệu lực cho đơn. ERD không có unique trên `ma_don_thue`, nên không mặc định database tự ngăn hai phiếu ban đầu.

#### Xác nhận, xử lý tiền và chốt

1. Nhân viên có quyền/quản trị viên xác nhận bảng tính trong transaction; đọc lại số tiền, trạng thái trả hàng, phí và tranh chấp.
2. Cố định bảng tính và danh sách phí/nguồn cọc dùng cho lần xử lý đó; ghi liên kết, trạng thái đang xử lý và nhật ký. Các trường trạng thái dùng enum tương ứng đã có.
3. Nếu cần hoàn, yêu cầu `IHoanTienService` của Thanh Tùng tạo các khoản hoàn theo nguồn thu; nếu cần thu thêm, yêu cầu `IThanhToanService` của Minh Tú tạo giao dịch thu bổ sung. Khởi tạo bản ghi yêu cầu trong database trước khi gửi gateway.
4. Các yêu cầu bấm lại lấy đúng giao dịch đang tồn tại. Số tiền xuất phát từ bảng tính đã xác nhận, không lấy từ body tùy ý của client.
5. Sau khi gateway đã có kết quả, `ChotDoiSoatAsync` đọc lại toàn bộ giao dịch, số thực thu/hoàn và các điều kiện nghiệp vụ. Chỉ tổng giao dịch hợp lệ thành công mới được tính.
6. Chưa hoàn đủ, chưa thu đủ, kết quả chưa rõ, có phí/tranh chấp mới cần xử lý hoặc còn sai lệch thì giữ chờ đối soát. Không đổi thành hoàn tất để “đóng đơn trước”.
7. Khi đủ điều kiện, chốt đối soát, lưu người chốt, snapshot tên và thời điểm; chuyển đơn `HoanTat`, lưu `thoi_diem_hoan_tat`, lịch sử và thông báo trong cùng transaction.

**Điểm tránh sai tiền:**

- [ ] Khi tính tiến độ, không trừ khoản hoàn của chính đối soát đang xử lý khỏi `C` rồi tính lại nghĩa vụ hoàn nhỏ hơn. Bảng nghĩa vụ đã xác nhận giữ nguyên; khoản thực thu/hoàn là tiến độ thực hiện bảng đó.
- [ ] Callback thanh toán/hoàn tiền chỉ cập nhật giao dịch. Việc chốt đối soát đi qua `DoiSoatService`, không để từng callback tự gán đơn hoàn tất.
- [ ] Nếu chưa có giao dịch nào được gửi/thu/hoàn và cần sửa bảng, phải vô hiệu hóa các yêu cầu chưa thực hiện một cách có kiểm soát rồi xác nhận lại. Đã có tiền di chuyển thì xử lý phần chênh lệch, không xóa lịch sử tiền.
- [ ] Nếu tranh chấp mở trong lúc khoản hoàn/thu đã gửi, không giả định có thể rollback khoản tiền đó; lưu tình trạng thực tế, chặn chốt và chuyển xử lý phần còn lại/điều chỉnh theo kết luận.

#### Điều chỉnh sau chốt

- [ ] Quản trị viên tạo đối soát mới có `ma_doi_soat_goc`, lý do và các khoản điều chỉnh phí đã duyệt; giữ nguyên bảng gốc, ngày hoàn tất gốc và chứng từ cũ.
- [ ] Xác định phần chênh lệch từ toàn bộ lịch sử hợp lệ: `SoDu = CocGoc + TongThuBoSungDaThanhCong - TongHoanLienQuanDaThanhCong - TongPhiHieuLucSauDieuChinh`. Không đưa hoàn tiền thuê do hủy hay giao dịch thu trùng đã loại vào các tổng này.
- [ ] `SoDu > 0` thì cần hoàn thêm; `SoDu < 0` thì cần thu thêm; 0 thì không tạo giao dịch. Khoản đang chờ xử lý phải được giải quyết hoặc tính là yêu cầu đang giữ chỗ tiền, không tạo thêm yêu cầu trùng.
- [ ] Trên phiếu điều chỉnh không phân bổ lại cọc gốc đã nối đối soát trước: phần cọc mới được đối soát bằng 0 nếu không phát sinh cọc mới; ghi chênh lệch phí và bảng tổng hợp trong các trường/snapshot hiện có.
- [ ] Chỉ nối khoản thu mới của lần điều chỉnh vào `GIAO_DICH_DOI_SOAT`; khoản hoàn điều chỉnh vẫn tham chiếu đúng chi tiết thu còn số dư có thể hoàn, có thể là cọc hoặc thu bổ sung trước đó.
- [ ] Đơn gốc đã hoàn tất giữ lịch sử hoàn tất; response hiển thị thêm “Có điều chỉnh đang xử lý” khi phiếu điều chỉnh chưa xong. Không sửa chứng từ gốc để làm như chưa từng hoàn tất.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/doi-soat/theo-don/{donId}/xem-truoc` | Nhân viên, quản trị viên |
| GET | `/api/doi-soat/theo-don/{donId}` | Nhân viên, quản trị viên |
| POST | `/api/doi-soat/theo-don/{donId}` | Lập đối soát theo quyền |
| POST | `/api/doi-soat/{id}/xac-nhan` | Xác nhận bảng tính theo quyền |
| POST | `/api/doi-soat/{id}/xu-ly-tien` | Tạo/lấy yêu cầu thu hoặc hoàn, theo quyền |
| POST | `/api/doi-soat/{id}/chot` | Chốt sau khi đủ điều kiện, theo quyền |
| POST | `/api/doi-soat/{id}/dieu-chinh` | Quản trị viên |

**Nghiệm thu:** Cọc 1.000.000đ, phí 200.000đ → hoàn 800.000đ; phí 1.200.000đ → thu 200.000đ. Nếu khoản tiền cần thực hiện chưa thành công thì đơn chưa hoàn tất. Sau chốt, giảm phí 200.000đ xuống 150.000đ chỉ hoàn thêm 50.000đ.

### 7.A. Thành phần phải bàn giao — Kim Xuyến

- [ ] `Services/Interfaces/IDoiSoatService.cs`
- [ ] `Services/DoiSoatService.cs`
- [ ] `Controllers/DoiSoatController.cs`
- [ ] `Models/DTOs/DoiSoat/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 7.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| XemTruocDoiSoatResponse | duDieuKien, vuongMac[], nguonCoc[], phuPhi[], tienCocDuocDoiSoat, tongPhi, canHoan, canThuThem | Tất cả tính server; có vướng mắc vẫn trả bản giải thích, không cho xử lý tiền. |
| LapDoiSoatRequest | maDonThue, ghiChu? | Không nhận C/P/tổng từ frontend; loại ban đầu do service chọn. |
| XacNhanDoiSoatRequest | dauVanTayBangTinh?, xacNhan, ghiChu? | Dấu vân tay là contract đề xuất kiểm tra preview đã đổi; server luôn đọc lại dưới khóa. |
| DieuChinhDoiSoatRequest | danhSachPhiDieuChinh[], lyDo | Admin; khoản thuộc đơn gốc, đã duyệt, chưa dùng ở lần khác. |
| DoiSoatResponse | bản tính cố định, nguồn, phí, target thu/hoàn, đã thành công, đang chờ, còn thiếu, trạng thái | Không tính lại target chỉ vì chính lần hoàn này đã thành công; metadata vận hành bổ sung tách khỏi căn cứ tài chính cố định. |


### 7.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| XemTruocAsync(donId, actor) | Bảng tính và danh sách vướng mắc | Đọc nguồn tiền thật, trả hàng, phí; không tạo HOAN_TIEN/THANH_TOAN. |
| LapDoiSoatAsync(dto, actor) | Phiếu ban đầu nháp hoặc bản đang có | Khóa đơn; chống hai đối soát ban đầu có hiệu lực dù ERD không unique đơn. |
| XacNhanBangTinhAsync(id, dto, actor) | Bảng tính đã cố định | Gắn phí và GIAO_DICH_DOI_SOAT nguồn cọc trong cùng transaction; audit. |
| YeuCauXuLyTienAsync(id, actor) | Danh sách yêu cầu thu/hoàn và trạng thái | Gọi ThanhToan/HoanTien theo nghĩa vụ; giữ mã yêu cầu ổn định trong dữ liệu bền vững. |
| ChotDoiSoatAsync(id, actor) | Phiếu chốt và đơn HoanTat hoặc danh sách còn chờ | Kiểm tra tiền đã xác minh, không còn pending/không rõ/tranh chấp; ghi thời điểm gốc một lần. |
| LapDoiSoatDieuChinhAsync(doiSoatGocId, dto, actor) | Phiếu con và chênh lệch mới | ma_doi_soat_goc, phí delta mới; không gắn lại nguồn thu đã bị unique phân bổ ở phiếu gốc. |


### 7.D. Trình tự triển khai và tích hợp

1. Chốt Kim Xuyến là đầu mối nghĩa vụ tài chính: Thanh Tùng sở hữu hoàn, Minh Tú sở hữu thu/callback, Kiện Minh sở hữu phí; không cho các service tự suy đoán target từ số tiền client.
2. Trong preview, liệt kê vật còn nợ, hồ sơ mất chưa duyệt, phiếu nháp, phí chờ duyệt, tranh chấp và khoản thu chưa phân loại. Thiếu dữ liệu tiền thì chưa được coi đã thu bằng tổng trên đơn.
3. Lập ban đầu dưới khóa đơn, đọc cọc thực thu hợp lệ chưa hoàn/chưa phân bổ cho lần khác. Cố định C và P khi xác nhận; tính max(C-P,0) và max(P-C,0), bỏ giao dịch 0 đồng.
4. Ghi PHU_PHI.ma_doi_soat và GIAO_DICH_DOI_SOAT cho nguồn cọc đúng một lần; JSON bảng tính giữ ID nguồn, số tiền dùng, snapshot căn cứ. Khoản thu bổ sung mới liên kết sau khi thành công.
5. THANH_TOAN không có ma_doi_soat: lưu ID/mã yêu cầu thu dự kiến trong phần tham chiếu vận hành của bang_tinh_doi_soat, cập nhật dưới khóa; không tự thêm FK/Entity.
6. Sau commit xác nhận, yêu cầu tạo intent thu/hoàn. Việc tạo intent phải kiểm tra target trừ đã thành công và phần đang chờ; cùng request trở lại không phát lệnh lần hai.
7. Callback chỉ xác nhận giao dịch/nguồn và liên kết, không gọi ngược service đối soát. Sau khi đủ kết quả, nhân viên gọi ChotDoiSoatAsync để kiểm tra và chốt; chỉ method này quyết định hoàn tất.
8. Khi hoàn thành một phần, giữ nguyên C, P, canHoan/canThuThem của snapshot; chỉ cập nhật tiến độ. Nếu giảm C theo khoản vừa hoàn sẽ làm phép tính đổi nghĩa vụ và có thể hoàn sai.
9. Điều chỉnh sau chốt tính số dư toàn đơn: cọc hợp lệ + thu bổ sung thành công - hoàn liên quan thành công - phí hiệu lực. Phiếu mới chỉ xử lý phần chênh chưa được các yêu cầu đang chờ giữ chỗ; chưa rõ kết quả thì chặn lệnh xung đột.
10. Đối soát con tham chiếu phí điều chỉnh và nguồn mới nếu có; không nối lại nguồn cọc cũ qua GIAO_DICH_DOI_SOAT. Khoản hoàn thêm vẫn tham chiếu nguồn cũ còn hoàn được qua HOAN_TIEN; ghi rõ nguồn dùng trong JSON.
11. Chốt phiếu con giữ DON_THUE HoanTat và thoi_diem_hoan_tat gốc; ghi thoi_diem_chot riêng của lần điều chỉnh để báo cáo Week 6 không đổi lịch sử.

### 7.E. Ví dụ contract

Ví dụ response khi đã hoàn một phần:
```json
{"maDoiSoat":901,"tienCocDuocDoiSoat":1000000,"tongPhi":200000,"canHoan":800000,"canThuThem":0,"daHoanThanhCong":300000,"hoanDangCho":500000,"conChuaLapYeuCau":0,"coTheChot":false}
```
`conChuaLapYeuCau` khác với số tiền chưa thành công; tiền đang chờ đã giữ hạn mức và không được yêu cầu lần hai.

### 7.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DOI_SOAT_CHUA_DU_DIEU_KIEN | 409 | Có danh sách vật/phí/tranh chấp/nguồn tiền cần xử lý. |
| BANG_TINH_DA_THAY_DOI | 409 | Preview khác dữ liệu hiện tại; trả bản mới để xem lại. |
| NGUON_THU_DA_PHAN_BO | 409 | Chi tiết thu đã liên kết lần đối soát khác. |
| GIAO_DICH_CHUA_RO_KET_QUA | 409 | Không chốt/mở lại/phát lệnh xung đột khi tiền chưa đối chiếu. |
| DOI_SOAT_DA_CHOT | 409 | Yêu cầu sửa bản gốc; chỉ cho luồng điều chỉnh. |


### 7.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T4-A01 | C=1.000.000, P=200.000 | Hoàn 800.000, không thu thêm; tiền thuê ban đầu không bị hoàn ở đối soát cọc. |
| W4-T4-A02 | C=500.000, P=700.000 | Thu thêm 200.000, không hoàn; đủ callback mới chốt. |
| W4-T4-A03 | C=P=500.000 | Không có yêu cầu 0 đồng; đủ điều kiện còn lại thì chốt. |
| W4-T4-A04 | Hai nhân viên cùng lập đối soát ban đầu | Một phiếu có hiệu lực; request sau nhận phiếu hiện có hoặc 409. |
| W4-T4-A05 | Target hoàn 800.000; một nguồn đã hoàn 300.000, nguồn còn lại pending 500.000 | Target vẫn 800.000, đã hoàn 300.000, đang chờ 500.000, không sinh yêu cầu mới. |
| W4-T4-A06 | Đã hoàn 800.000 trên cọc 1.000.000 và phí 200.000; điều chỉnh phí -50.000 | Phiếu con hoàn thêm 50.000 từ nguồn còn hạn mức; phiếu gốc và giờ hoàn tất không đổi. |
| W4-T4-A07 | Nguồn cọc đã có GIAO_DICH_DOI_SOAT ở phiếu gốc | Điều chỉnh không INSERT lại cùng chi tiết thu; vẫn truy vết đầy đủ bằng gốc/JSON/HOAN_TIEN. |
| W4-T4-A08 | Callback hoàn báo lỗi mạng, khách mở lại trang bấm xử lý | Không phát lệnh mới hoặc chốt đơn cho đến khi xác định kết quả. |


**Đóng W4-T4:** Kim Xuyến bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 8. W4-T5 — Thu bổ sung và liên kết đối soát (Minh Tú)

### 8.0. Phạm vi, quy tắc nghiệp vụ và API

**Service/Controller:** Mở rộng `IThanhToanService` + `ThanhToanService`, `ThanhToanController`; không tạo một hệ thống thu tiền độc lập với Tuần 2.

**Method bổ sung:** `TaoThuBoSungAsync`, `LayTrangThaiGiaoDichAsync`, `DoiChieuGiaoDichAsync`; callback dùng chung bộ xử lý đã có và phân biệt mục đích.

- [ ] Chỉ tạo thu bổ sung từ đối soát đã xác nhận hoặc đối soát điều chỉnh hợp lệ; kiểm tra số còn cần thu và chủ đơn/quyền nhân viên.
- [ ] Client truyền mã đối soát, không được tự quyết số tiền, mục đích hoặc mã khách để thu.
- [ ] `THANH_TOAN` thuộc đúng đơn; chi tiết thu dùng mục đích `ThuBoSung`. Không tạo lại `TienThue`/`TienCoc` cho khoản này.
- [ ] Một nghĩa vụ đang có yêu cầu xử lý thì trả yêu cầu đó; chưa rõ kết quả không cho tạo lần thu mới. Có thể thử lại bằng yêu cầu mới sau khi lần cũ đã được xác nhận thất bại, nhưng nghĩa vụ tổng vẫn chỉ một lần.
- [ ] Khi thành công, ghi số tiền và kết quả được xác minh, tạo/ghi chi tiết đúng một lần và nối qua `GIAO_DICH_DOI_SOAT` tới đối soát tương ứng.
- [ ] Do `THANH_TOAN` không có FK đối soát trực tiếp, lưu tham chiếu yêu cầu thu trong `bang_tinh_doi_soat` hoặc cơ chế metadata đã có khi khởi tạo; sau thành công mới ghi liên kết chi tiết thu. Không thêm cột chỉ để tiện truy vấn.
- [ ] Callback thu bổ sung không được chạy lại nhánh “xác nhận đơn mới” để đưa đơn về `DaXacNhan`.
- [ ] Nếu hỗ trợ thu tiền mặt tại quầy, chỉ nhân viên được quyền ghi nhận, có chứng từ/lý do và chống bấm lặp. Không coi việc tạo URL hay lời xác nhận của khách là đã thu.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| POST | `/api/thanh-toan/doi-soat/{doiSoatId}/thu-bo-sung` | Chủ đơn hoặc nhân viên được quyền |
| GET | `/api/thanh-toan/{id}/trang-thai` | Chủ đơn hoặc nhân viên được quyền |

`DoiSoatService` dùng trực tiếp method service khi cần khởi tạo giao dịch; endpoint trên phục vụ khách thực hiện khoản đã được xác định. Cả hai đường phải trả về cùng yêu cầu đang xử lý, không tạo hai khoản thu.

### 8.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/ThanhToanService.cs (mở rộng Week 2)`
- [ ] `Services/Interfaces/IThanhToanService.cs (mở rộng)`
- [ ] `Controllers/ThanhToanController.cs (mở rộng)`
- [ ] `Models/DTOs/ThanhToan/`
- [ ] `Integrations/Payments/ (adapter hiện có)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 8.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TaoThuBoSungRequest | maDoiSoat, phuongThucDuocHoTro | Số tiền/mục đích/mã yêu cầu do server xác định; khách phải sở hữu đơn, staff theo quyền ghi nhận. |
| YeuCauThuResponse | maThanhToan, maYeuCau, soTien, mucDich, trangThai, paymentUrl?, canDoiChieu | URL từ adapter hợp lệ; chưa thành công không hiện là đã thu. |
| KetQuaGateway (nội bộ) | mã yêu cầu/giao dịch, số tiền, trạng thái, thời điểm, chứng cứ xác minh | Dữ liệu qua adapter đã kiểm tra; query từ trang redirect không phải chứng cứ thanh toán. |


### 8.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TaoThuBoSungAsync(dto, actor) | Intent mới hoặc intent đang có | Khóa đơn/đối soát; tạo THANH_TOAN + CHI_TIET_THANH_TOAN ThuBoSung; lưu tham chiếu đối soát trước gọi mạng. |
| LayTrangThaiGiaoDichAsync(id, actor) | Trạng thái an toàn cho UI | Khách chỉ đơn mình; không tự chuyển thành công theo client. |
| DoiChieuGiaoDichAsync(id, actorHeThong) | Trạng thái sau query gateway | Tra cùng ma_yeu_cau; ghi kết quả qua handler chung. |
| XuLyCallbackAsync(payload, proof) | Acknowledgement theo gateway | Xác thực, phân biệt đặt đơn/thu thêm; successful topup gắn GIAO_DICH_DOI_SOAT và tiến độ, không đặt lại trạng thái thuê. |


### 8.D. Trình tự triển khai và tích hợp

1. Tái sử dụng adapter/handler Week 2, tách nhánh mục đích trước thay đổi trạng thái đơn; thu thêm không chạy lại logic xác nhận đơn mới hoặc tiêu lượt mã giảm giá lần nữa.
2. Lấy nghĩa vụ thiếu từ bảng tính đã xác nhận, trừ thu thêm thành công và intent chưa rõ/đang chờ. Nếu không thiếu, trả thông tin hiện tại; không tạo khoản 0 đồng.
3. Khóa và lưu intent một lần; nếu đã có intent chưa kết luận, trả cùng ID/payment URL hoặc yêu cầu đối chiếu. Một lần thất bại chắc chắn mới cho tạo attempt mới có liên kết căn cứ.
4. Commit trước gọi gateway. Provider lỗi chắc chắn trước tiếp nhận và timeout sau gửi phải phân biệt; timeout không tự đổi sang thất bại để mở lần thu khác.
5. Callback kiểm tra chữ ký/định danh/số tiền trước dedupe; ghi thành công một lần, gắn chi tiết ThuBoSung vào đúng đối soát qua tham chiếu đã lưu.
6. Nếu hỗ trợ thu tiền mặt theo repo, phải có quyền nhân viên, xác nhận thực nhận/bằng chứng và nguồn đối chiếu rõ. Không dùng endpoint tiền mặt làm đường client giả callback.
7. Bàn giao cho Kim Xuyến trạng thái đủ/thiếu và ID nguồn thu; không tự gắn HoanTat khi còn hoàn, tranh chấp hoặc khoản không rõ khác.

### 8.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| KHONG_CO_NGHIA_VU_THU_THEM | 409 | Bảng tính không thiếu hoặc chưa được xác nhận. |
| THU_THEM_DANG_CHO | 409 | Có intent khác đang chờ/không rõ; trả ID để theo dõi. |
| SO_TIEN_GATEWAY_KHONG_KHOP | 409 | Ghi nhận ngoại lệ cần đối chiếu, chưa phân bổ là thu hợp lệ. |
| KET_QUA_CHUA_XAC_MINH | 400 | Chữ ký/nguồn callback không hợp lệ, không đổi dữ liệu tiền. |


### 8.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T5-A01 | Đối soát thiếu 200.000, client gửi trường soTien=1 | Request bị từ chối trường không hỗ trợ hoặc bỏ qua theo contract; nghĩa vụ không đổi thành 1. |
| W4-T5-A02 | Bấm thu thêm hai lần đồng thời | Một intent có hiệu lực, không tạo hai khoản 200.000. |
| W4-T5-A03 | Callback thu thêm thành công lặp 5 lần | Một ghi nhận nguồn và một liên kết đối soát; không tiêu mã giảm giá thêm. |
| W4-T5-A04 | Topup thành công trên đơn ChoDoiSoat | Đơn không bị đặt lại DaXacNhan/DangThue. |
| W4-T5-A05 | Timeout gateway rồi bấm lại | Dùng cùng mã/query trạng thái, không tạo mã mới. |
| W4-T5-A06 | Callback số tiền khác dự kiến | Không tự chốt đối soát hoặc coi phần sai là tiền thuê/cọc hợp lệ. |


**Đóng W4-T5:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 9. W4-T6 — Hoàn tiền dùng chung (Thanh Tùng)

### 9.0. Phạm vi, quy tắc nghiệp vụ và API

**Service/Controller:** `IHoanTienService` + `HoanTienService`; `HoanTienController`. Service được dùng bởi hủy đơn, đối soát cọc và xử lý thu trùng/thu muộn.

**Method chính:** `LapYeuCauHoanAsync`, `XuLyYeuCauHoanAsync`, `XuLyKetQuaHoanAsync`, `DoiChieuKetQuaHoanAsync`, `LayDanhSachTheoDonAsync`.

- [ ] Mỗi khoản hoàn tham chiếu một `CHI_TIET_THANH_TOAN` gốc thật sự đã thu. Nếu phải hoàn tiền thuê và cọc thì tạo các khoản theo từng nguồn, không gắn cả tổng vào một chi tiết thu không đủ số dư.
- [ ] Hoàn cọc liên kết `ma_doi_soat`; hoàn do hủy/thu trùng có thể không có đối soát. Đơn được suy ra từ chi tiết thu gốc → thanh toán, không tự thêm FK đơn vào Entity hoàn tiền.
- [ ] Trong transaction khóa nguồn thu, kiểm tra: `Đã hoàn thành công + Đang giữ cho các yêu cầu hoàn chưa kết thúc + Yêu cầu mới ≤ Số tiền thực thu của nguồn`. Không chỉ trừ các khoản hoàn đã thành công mà bỏ qua khoản đang xử lý.
- [ ] Khoản hoàn chỉ được lập cho nghĩa vụ đã duyệt/xác nhận; DTO công khai không cho khách tự chọn nguồn thu của người khác hoặc tự nhập số tiền hoàn.
- [ ] Dùng `ma_yeu_cau` ổn định theo nghĩa vụ/đối soát hoặc hủy + nguồn thu + lần xử lý hợp lệ; bấm lại trả yêu cầu cũ.
- [ ] Ghi yêu cầu chờ trong database rồi mới gửi gateway qua adapter Minh Tú. Nếu tiến trình dừng sau khi gửi, phục hồi bằng truy vấn mã cũ, không gửi một khoản mới với mã khác.
- [ ] Thành công: ghi mã hoàn gateway, số tiền, thời điểm và trạng thái đúng một lần. Thất bại/chưa rõ: giữ hồ sơ để xử lý tiếp, không báo đã hoàn và không chốt đối soát.
- [ ] Với lỗi timeout, chưa xác định được tiền đã hoàn hay chưa thì vẫn giữ phần tiền đang dành cho yêu cầu đó. Chỉ giải phóng/cho tạo yêu cầu thay thế khi đã xác minh không có khoản hoàn thành công muộn.
- [ ] Callback lặp hoặc callback đến sai thứ tự không ghi đè trạng thái thành công bằng thất bại cũ; mâu thuẫn kết quả phải được đối chiếu gateway.
- [ ] Nếu phải chia hoàn theo nhiều nguồn, chỉ báo nghĩa vụ hoàn hoàn thành khi tất cả các phần cần thiết đã thành công; một phần thất bại vẫn hiển thị phần còn chờ.
- [ ] Ghi lịch sử và thông báo theo kết quả thực tế; khách được xem khoản dự kiến, đang xử lý, thành công hoặc cần xử lý lại với số tiền tương ứng.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/hoan-tien/theo-don/{donId}` | Chủ đơn hoặc nhân viên được quyền |
| POST | `/api/hoan-tien/{id}/xu-ly` | Nhân viên được quyền/quản trị viên; xử lý yêu cầu đã lập |
| POST | `/api/hoan-tien/{id}/doi-chieu` | Nhân viên được quyền/quản trị viên |
| POST | `/api/hoan-tien/ket-qua` | Adapter/callback được xác minh; không phải thao tác tùy ý của khách |

**Nghiệm thu:** Nguồn cọc 1 triệu đang có yêu cầu hoàn 800 nghìn thì một yêu cầu hoàn mới 300 nghìn bị chặn. Hai callback cùng một khoản hoàn chỉ cập nhật một lần. Mất phản hồi không dẫn tới hoàn thêm lần hai.

### 9.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/Interfaces/IHoanTienService.cs`
- [ ] `Services/HoanTienService.cs`
- [ ] `Controllers/HoanTienController.cs`
- [ ] `Models/DTOs/HoanTien/`
- [ ] `Integrations/Payments/ (refund adapter)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 9.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LapHoanCommand (nội bộ) | loại hoàn, nghĩa vụ đã xác nhận, maDoiSoat?, danh sách nguồn/số tiền, lý do | Bắt buộc chi tiết thu gốc có thực thu; caller không dùng tổng đơn làm nguồn tiền. |
| XuLyHoanRequest | ghiChuXuLy? | Route chỉ ID yêu cầu đã duyệt/tạo hợp lệ; số tiền nguồn không cho sửa tại nút thực hiện. |
| HoanTienResponse | maHoanTien, maYeuCau, maChiTietThanhToanGoc, maDoiSoat?, loại, số tiền, trạng thái, giờ thành công | Trạng thái không rõ tách khỏi đã thất bại; không lộ khóa gateway. |
| HanMucNguonResponse (nội bộ) | thực thu, đã hoàn thành công, hoàn đang chờ/không rõ, còn có thể lập | Cùng một source tính mọi loại hoàn, không chỉ cùng đối soát. |


### 9.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LapYeuCauHoanAsync(command, actor) | Một hoặc nhiều HOAN_TIEN | Khóa nguồn theo thứ tự ổn định, kiểm tra hạn mức và INSERT intent bền vững; không gọi mạng trong transaction. |
| XuLyYeuCauHoanAsync(id, actor) | Kết quả gửi/đang chờ | Dùng lại ma_yeu_cau; chặn gửi mới khi chưa xác định request trước. |
| XuLyKetQuaHoanAsync(verifiedResult) | Trạng thái đã xác minh | Khóa intent, kiểm tra mã/số tiền, cập nhật thành công một lần; không sửa nguồn gốc. |
| DoiChieuKetQuaHoanAsync(id, actor) | Kết quả query cùng yêu cầu | Dùng cho timeout/khởi động lại; kết quả qua cùng handler. |
| LayDanhSachTheoDonAsync(donId, actor) | Các lần hoàn và tổng theo trạng thái | Join HOAN_TIEN → CHI_TIET_THANH_TOAN → THANH_TOAN → DON_THUE; HOAN_TIEN không có FK đơn trực tiếp. |


### 9.D. Trình tự triển khai và tích hợp

1. Thanh Tùng chốt với Kim Xuyến/Minh Tú format nguồn và lý do: hoàn cọc theo đối soát, hoàn tiền thuê/cọc do hủy, hoàn thu thừa. Không tái dùng nhãn làm mất phân loại nguồn.
2. Tính khả năng hoàn của từng chi tiết thu bằng thực thu gốc trừ tất cả hoàn thành công và intent đang giữ hạn mức. Tổng mới không được vượt số thực thu dù hai loại hoàn khác nhau.
3. Nghĩa vụ lớn hơn một nguồn phải tách thành nhiều HOAN_TIEN, mỗi dòng một nguồn bắt buộc. Phân bổ theo thứ tự nguồn ổn định; toàn bộ kiểm tra/lập của cùng yêu cầu trong transaction bảo vệ đủ các nguồn.
4. Lưu mã yêu cầu ổn định và trạng thái chờ trước mạng. Gateway chấp nhận nhưng server mất phản hồi thì nguồn vẫn bị giữ, chỉ query cùng mã.
5. Callback thành công lặp trả acknowledgement và giữ thời điểm thành công đầu. Callback thất bại đến sau thành công không đảo trạng thái; trường hợp mâu thuẫn chuyển đối chiếu/audit.
6. Chỉ giải phóng hạn mức của intent thất bại khi có bằng chứng chắc chắn gateway không hoàn. Nếu cần retry sau thất bại chắc chắn, liên hệ nghĩa vụ cũ và kiểm tra chưa có attempt khác thành công.
7. Kết quả hoàn không tự hồi sinh đơn hủy hoặc sửa bản tính gốc. Báo tiến độ cho DoiSoatService; thiếu một phần tiền thì đơn vẫn chờ xử lý tài chính.
8. API khách chỉ xem tiền hoàn thuộc đơn mình; API thực hiện/đối chiếu dành nhân viên có quyền/admin hoặc job đã xác thực, không nhận yêu cầu hoàn tùy ý từ khách.

### 9.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| NGUON_HOAN_KHONG_HOP_LE | 409 | Thu gốc chưa thành công, chưa phân loại hoặc không thuộc nghĩa vụ/đơn. |
| VUOT_HAN_MUC_HOAN | 409 | Thành công + đang giữ + yêu cầu mới vượt nguồn; trả số còn khả dụng cho người có quyền. |
| HOAN_CHUA_RO_KET_QUA | 409 | Phải đối chiếu trước khi gửi một attempt mới. |
| KET_QUA_HOAN_KHONG_KHOP | 400 | Callback sai mã/tiền/xác thực; không tự đánh dấu hoàn xong. |


### 9.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T6-A01 | Nguồn 2.000.000, đã hoàn 500.000, pending 700.000; xin thêm 900.000 | Bị chặn vì tổng 2.100.000 vượt nguồn. |
| W4-T6-A02 | Hai nguồn 2.000.000 và 1.000.000, nghĩa vụ hoàn 2.400.000 | Hai dòng nguồn lần lượt 2.000.000 và 400.000; tổng đúng, không FK giả. |
| W4-T6-A03 | Hai nhân viên cùng hoàn phần còn lại một nguồn | Không vượt hạn mức; một intent hoặc một xung đột có thể giải thích. |
| W4-T6-A04 | Gateway đã hoàn nhưng server timeout | Nguồn vẫn giữ; đối chiếu cùng mã tìm thành công, không hoàn thêm. |
| W4-T6-A05 | Callback success rồi callback failure cũ | Giữ success và thời điểm cũ, ghi mâu thuẫn để kiểm tra. |
| W4-T6-A06 | Hủy đơn hoàn tiền thuê và cọc | Từng khoản trỏ đúng chi tiết mục đích gốc; không lấy nguồn cọc hoàn hai lần. |
| W4-T6-A07 | App khởi động lại khi có 3 yêu cầu chờ | Đọc lại từ database, tiếp tục/query đúng mã, không mất danh sách. |


**Đóng W4-T6:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 10. W4-T7 — Hủy đơn và tính khoản hoàn (Thanh Tùng)

### 10.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC07. **Service/Controller:** `IHuyDonService` + `HuyDonService`; mở rộng action hủy trong `DonThueController` hiện có và API vận hành cho quản trị viên.

**Method chính:** `XemTruocHuyAsync`, `KhachHuyAsync`, `CuaHangHuyAsync`, `GhiNhanKhongDenNhanAsync`.

#### Điều kiện và bảng tính hủy

- [ ] Chỉ hủy trước khi đã chốt bàn giao. Đơn đang thuê, đang nhận trả/đối soát hoặc đã hoàn tất không được hủy để né nghĩa vụ trả đồ.
- [ ] Khách chỉ hủy đơn của mình; cửa hàng hủy do không cung cấp được đồ phải do quản trị viên thực hiện và ghi lý do.
- [ ] Hủy chưa thanh toán dùng lại logic đã có của Tuần 2; không tạo yêu cầu hoàn nếu chưa thật sự thu tiền.
- [ ] Hủy sau thanh toán tính từ tiền thuê **sau giảm giá đã thu hợp lệ**, cọc thực thu và chính sách gắn với đơn. Tiền thu lỗi/thu trùng xử lý riêng, không dùng để tính phí hủy nhiều hơn.

| Trường hợp theo đặc tả | Cách tính |
|---|---|
| Chưa thanh toán | Không phí hủy, không có khoản hoàn nếu chưa thu |
| Khách hủy trước giờ nhận **trên 48 giờ** | Hoàn toàn bộ tiền thuê và cọc hợp lệ đã thu |
| Khách hủy trong khoảng **24–48 giờ**, gồm đúng 24 và đúng 48 giờ | Giữ lại tỷ lệ tiền thuê theo chính sách; hoàn phần tiền thuê còn lại và toàn bộ cọc |
| Khách hủy trước giờ nhận dưới 24 giờ | Giữ lại tiền thuê theo mức đã công bố; hoàn phần còn lại và toàn bộ cọc |
| Cửa hàng hủy vì không cung cấp được đồ | Hoàn toàn bộ tiền thuê và cọc hợp lệ đã thu |

- [ ] Không tự đặt tỷ lệ giữ lại 30%/50% khi chính sách chưa có; thiếu cấu hình cần thiết thì trả lỗi cấu hình nghiệp vụ để nhóm bổ sung dữ liệu chính sách hợp lệ.
- [ ] Người dùng xem trước số tiền hoàn/giữ lại rồi xác nhận. Lúc ghi phải tính lại theo giờ server và trạng thái mới nhất; nếu đã vượt mốc chính sách hoặc số tiền thay đổi thì trả 409 kèm bảng mới để xác nhận lại.
- [ ] Khách không đến nhận là tình huống riêng: nhân viên ghi nhận, quản trị viên xử lý theo chính sách không đến nhận đã công bố. Nếu chính sách chưa có thì giữ chờ xử lý; không suy ra một khoản phạt tùy ý hay tự đánh đã bàn giao.

#### Thao tác hủy nguyên tử

1. Kiểm tra quyền, khóa đơn theo cùng quy tắc với chốt bàn giao Tuần 3; đọc lại phiếu bàn giao và trạng thái.
2. Tính lại bảng hủy và kiểm tra sự chấp nhận của khách/quyền cửa hàng hủy.
3. Ghi `KhachHuy` hoặc `CuaHangHuy`, người/thời điểm/lý do hủy và `tien_thue_giu_lai_khi_huy`.
4. Giải phóng giữ chỗ/cam kết và hủy các phân công còn hiệu lực trước giao, lưu người/thời điểm/lý do. Phiếu bàn giao còn nháp bị vô hiệu hóa theo trạng thái/nhật ký hiện có; không xóa phiếu đã chốt.
5. Lượt khuyến mãi chưa thanh toán được giải phóng theo Tuần 2; lượt đã ghi nhận sử dụng sau thanh toán **không tự phục hồi** khi hủy.
6. Với tiền đã thu, gọi `HoanTienService` lập yêu cầu theo từng chi tiết thu gốc trong cùng transaction database; ghi lịch sử/thông báo rồi commit.
7. Sau commit mới thực hiện gửi yêu cầu hoàn; trạng thái đơn vẫn đã hủy trong khi khoản hoàn đang xử lý.

- [ ] Hai yêu cầu hủy chỉ tạo một kết quả và một bộ yêu cầu hoàn. Hủy đồng thời với chốt bàn giao phải có một bên thắng, không thể vừa hủy vừa giao.
- [ ] Callback thanh toán đến sau khi hủy đi qua W4-T8 để theo dõi/hoàn khoản mới phát hiện, không tạo lại bộ hoàn trùng với phần đã lập.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/don-thue/{id}/huy/xem-truoc` | Chủ đơn |
| POST | `/api/don-thue/{id}/huy` | Chủ đơn; mở rộng endpoint Tuần 2 |
| POST | `/api/van-hanh/don-thue/{id}/cua-hang-huy` | Quản trị viên |
| POST | `/api/van-hanh/don-thue/{id}/khong-den-nhan` | Nhân viên ghi nhận; quyết định tiền thuộc quyền quản trị viên |

**Nghiệm thu:** Hủy ở đúng mốc 24/48 giờ dùng nhánh đúng; cọc trước bàn giao được hoàn đầy đủ; đơn đang thuê không hủy được; hoàn thất bại vẫn giữ hồ sơ hoàn cần xử lý.

### 10.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/Interfaces/IHuyDonService.cs`
- [ ] `Services/HuyDonService.cs`
- [ ] `Controllers/DonThueController.cs (action hủy)`
- [ ] `Controllers/VanHanh/DonThueController.cs (hủy vận hành)`
- [ ] `Models/DTOs/HuyDon/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 10.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| XemTruocHuyResponse | coTheHuy, thời điểm tính, số giờ trước nhận, tiền thuê giữ lại, tiền thuê hoàn, cọc hoàn, lý do, dấu dữ liệu | Tính từ chính sách của đơn và tiền thực thu hợp lệ; không hứa đã hoàn. |
| HuyDonRequest | lyDo, xacNhanChiPhi, dauVanTayXemTruoc? | Khách chủ đơn; loại hủy vận hành được suy ra từ quyền/action, không để khách tự chọn cửa hàng chịu trách nhiệm. |
| HuyDonResponse | trạng thái hủy, tiền giữ lại, danh sách yêu cầu hoàn, số chờ xử lý, lịch sử | Đơn hủy được giải phóng lịch dù hoàn đang chờ; tiền hoàn vẫn cần theo dõi riêng. |


### 10.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| XemTruocHuyAsync(donId, actor, loaiHuy) | Bảng chi phí/cảnh báo | Chỉ đọc, mốc now nhất quán; dấu preview có thể là token ký/stateless, không đòi thêm cột. |
| KhachHuyAsync(donId, dto, actor) | Đơn đã hủy + refund intents | Khóa chung với bàn giao/thanh toán; release GIU_CHO/PHAN_CONG và lượt khuyến mãi chưa dùng, audit cùng tx. |
| CuaHangHuyAsync(donId, dto, actor) | Hủy theo trách nhiệm cửa hàng | Action riêng admin/quyền phù hợp; không áp phí khách sai loại. |
| GhiNhanKhongDenNhanAsync(donId, dto, actor) | Kết luận không đến và cách xử lý | Chỉ khi có quy định/đủ thời gian; ghi bằng chứng, không tự tạo bàn giao giả. |


### 10.D. Trình tự triển khai và tích hợp

1. Đọc chính sách gắn đơn: hơn 48 giờ, khoảng từ 24 đến 48 giờ gồm cả hai đầu và dưới 24 giờ; tỷ lệ/giá trị giữ lại phải đúng bản chính sách, không hardcode con số chưa có.
2. Tính trên tiền thuê sau giảm và tiền thực thu hợp lệ. Cọc hoàn đủ khi chưa giao; khoản thu thừa/sai đã được phân loại theo luồng riêng, không giấu vào phí hủy.
3. Preview trả đầy đủ nghĩa vụ và thời điểm. Khi xác nhận, khóa đơn, đọc lại giờ/tiền/trạng thái; nếu mức phí thay đổi qua ranh giới hoặc do tiền mới về, trả 409 kèm preview mới để xác nhận lại.
4. Hủy và chốt bàn giao cùng dùng khóa bảo vệ đơn: bên thắng quyết định trạng thái, bên còn lại bị chặn. Đã bàn giao thì nhận trả/đối soát, không hủy trước giao.
5. Trong một transaction: ghi hủy/người/lý do/phí giữ lại, giải phóng hold, hủy phân công còn hiệu lực, vô hiệu nháp giao/xác nhận nháp và tạo intent hoàn theo nguồn bằng helper không commit riêng.
6. Lượt mã đã sử dụng ở thanh toán thành công giữ là đã dùng sau hủy theo đặc tả; chỉ release lượt giữ chưa dùng. Không tăng hạn mức mã qua hủy đơn đã thanh toán.
7. Commit xong mới gửi hoàn. Callback thu đến muộn sau hủy vào ngoại lệ thu thừa/hoàn, không làm đơn sống lại hoặc giành lại thiết bị.
8. Không đến nhận chỉ là hành động vận hành có căn cứ; nếu chính sách chưa định nghĩa mức xử lý thì trả cần admin quyết định, không tự đoán phí/no-show mới.

### 10.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DON_DA_BAN_GIAO | 409 | Không còn dùng luồng hủy trước nhận. |
| CHI_PHI_HUY_DA_THAY_DOI | 409 | Cần xác nhận preview mới với mốc/tiền mới. |
| KHONG_CO_QUYEN_HUY | 403 | Khách khác hoặc khách tự chọn hủy do cửa hàng. |
| CHINH_SACH_HUY_CHUA_DU | 409 | Thiếu cấu hình cho trường hợp, không tự bịa tỷ lệ. |
| DON_DA_HUY_KHAC_Y_DINH | 409 | Đã hủy bởi một quyết định khác; không ghi đè lý do/phí. |


### 10.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T7-A01 | Hủy trước 48 giờ 1 phút / đúng 48 giờ / đúng 24 giờ / dưới 24 giờ 1 phút | Chọn đúng nhánh chính sách, test đủ ranh giới. |
| W4-T7-A02 | Preview lúc còn 24 giờ 1 phút, xác nhận sau 2 phút | Trả preview mới khi phí đổi, chưa hủy/hoàn với mức người dùng chưa xác nhận. |
| W4-T7-A03 | Hủy và giao chạy đồng thời | Chỉ một chuyển trạng thái hợp lệ, không vừa giao vừa giải phóng thiết bị. |
| W4-T7-A04 | Đơn đã thu thuê 600.000 và cọc 1.000.000; chính sách giữ thuê 300.000 | Intent hoàn thuê 300.000 + cọc 1.000.000, đúng hai nguồn. |
| W4-T7-A05 | Đơn thanh toán xong dùng mã rồi hủy | Lượt đã sử dụng không trở lại; hold thiết bị được giải phóng. |
| W4-T7-A06 | Đơn chưa thu tiền hủy | Không tạo giao dịch hoàn 0 đồng; lượt giữ chưa dùng được release. |
| W4-T7-A07 | Callback tiền về sau hủy | Giữ đơn hủy, chuyển xử lý tiền thừa, không tạo lại giữ chỗ. |


**Đóng W4-T7:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 11. W4-T8 — Ngoại lệ thanh toán còn lại (Minh Tú)

### 11.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** Hoàn thiện phần ngoại lệ UC06; dùng chung khả năng đối chiếu cho thu bổ sung. **Service/Controller:** Mở rộng `ThanhToanService`, `ThanhToanController` và adapter gateway hiện có; phối hợp `HoanTienService` của Thanh Tùng.

| Tình huống | Xử lý bắt buộc |
|---|---|
| Cùng callback/mã yêu cầu gửi lại | Kiểm tra quyền/xác thực callback và nguồn giao dịch; nếu đã xử lý thành công thì trả kết quả cũ, không thêm chi tiết thu hoặc đổi trạng thái đơn lần hai |
| Callback thất bại cũ đến sau thành công | Không ghi đè thành công; mâu thuẫn thực sự thì đối chiếu gateway |
| Chưa rõ kết quả/timeout | Giữ đang kiểm tra, trả trạng thái rõ cho khách; tra cứu yêu cầu cũ, chưa cho trả thêm ngay |
| Tiền tới khi đơn đã hết hạn/hủy | Ghi nhận tiền thật đã thu, đánh dấu cần đối chiếu và lập hoàn theo nguồn khi đủ dữ liệu; không tự khôi phục đơn |
| Thu trùng bằng hai giao dịch khác nhau | Chỉ một khoản đáp ứng nghĩa vụ hợp lệ; khoản thu dư được theo dõi và hoàn riêng, không nhân đôi cọc của đơn |
| Sai số tiền | Không xác nhận đơn hoặc chốt đối soát; lưu số thực thu, đánh dấu cần đối chiếu, quản trị viên xác minh và quyết định xử lý |
| Thất bại xác định chưa thu tiền | Không ghi chi tiết thu thành công; cho thử lại nếu nghiệp vụ còn cho phép, dùng yêu cầu mới sau khi lần cũ đã kết thúc rõ ràng |

**Checklist dữ liệu và tích hợp:**

- [ ] So đúng gateway, mã yêu cầu, mã giao dịch, đơn/nghĩa vụ, số tiền và kết quả qua adapter. Không nhận thành công chỉ vì client mở trang kết quả.
- [ ] `ma_yeu_cau` unique không thay thế việc phát hiện cùng mã giao dịch gateway bị đưa vào hai yêu cầu khác nhau. Kiểm tra cặp cổng/mã giao dịch trong transaction; ERD hiện tại không có unique riêng trên mã giao dịch gateway.
- [ ] Số thực thu trên giao dịch và tổng các chi tiết phân bổ phải nhất quán. Không ghi hai dòng tiền thuê/cọc theo số dự kiến khi thực tế tiền nhận khác.
- [ ] Khi sai số tiền chưa phân loại được, giữ giao dịch ở diện cần đối chiếu, chưa dùng để xác nhận đủ tiền. API đối chiếu của quản trị viên phải ghi căn cứ và phân bổ số thực thu vào chi tiết đúng mục đích theo yêu cầu gốc trước khi lập hoàn theo FK bắt buộc.
- [ ] Thu trùng/sai số tiền không được tự biến thành thu bổ sung phụ phí hợp lệ để đủ cột dữ liệu; không đưa các khoản ngoại lệ chưa xử lý vào nguồn cọc đối soát bình thường.
- [ ] Khi quyết định hoàn khoản sai/thu trùng, gọi `HoanTienService` sau khi có nguồn thu thực tế hợp lệ; không ghi “thu thất bại” để che khoản tiền gateway đã thu.
- [ ] Callback thanh toán ban đầu dùng cùng khóa/cập nhật trạng thái có điều kiện với job hết hạn và hủy đơn. Đơn đã kết thúc giữ chỗ không được lấy lại thiết bị đã phân cho khách khác.
- [ ] Không hồi sinh đơn hoặc thay trạng thái đơn chỉ vì thu bổ sung/hoàn tiền thành công; các service nghiệp vụ tương ứng quyết định trạng thái.
- [ ] Adapter mock mô phỏng được callback lặp, mất phản hồi, kết quả đến muộn, thu sai/thu trùng, hoàn thất bại và hoàn thành công muộn để kiểm tra toàn luồng.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/thanh-toan/can-doi-chieu` | Nhân viên được quyền/quản trị viên |
| POST | `/api/thanh-toan/{id}/doi-chieu` | Quản trị viên; kèm căn cứ và kết luận |
| Theo adapter đang dùng | `/api/thanh-toan/ket-qua` | Bộ xử lý callback đã có, mở rộng xác minh và các nhánh ngoại lệ |

**Ranh giới:** Tuần 4 kiểm chứng logic nghiệp vụ và trạng thái bằng mock; không tuyên bố đã tích hợp/kiểm thử với cổng thanh toán thật.

### 11.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/ThanhToanService.cs (nhánh ngoại lệ)`
- [ ] `Services/Interfaces/IThanhToanService.cs (mở rộng)`
- [ ] `Controllers/ThanhToanController.cs (mở rộng action đối chiếu)`
- [ ] `Models/DTOs/DoiChieuThanhToan/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 11.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LocGiaoDichNgoaiLeRequest | từ/đến, gateway, trạng thái đối chiếu, mã đơn, trang | Chỉ nhân viên có quyền/admin; mặc định không tải payload bí mật. |
| XuLyNgoaiLeRequest | phương án hợp lệ, lý do, bằng chứng đối chiếu, phân bổ đề nghị? | Admin/phân quyền tài chính; server kiểm tra thực thu và tổng phân bổ, không cho ghi nhận số tùy ý. |
| NgoaiLeThanhToanResponse | mã yêu cầu, mã giao dịch ngoài đã che phần cần thiết, thực thu, kỳ vọng, nguyên nhân, trạng thái, thao tác hợp lệ | Tiền đã vào nhưng chưa xác định mục đích hiển thị riêng, không cộng vào thuê/cọc hợp lệ. |


### 11.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TiepNhanKetQuaGatewayAsync(verifiedResult) | Kết quả chuẩn hóa duy nhất | Dùng chung Week 2 và thu bổ sung; auth trước idempotency, khóa intent và định danh giao dịch ngoài. |
| LayGiaoDichCanDoiChieuAsync(filter, actor) | Trang ngoại lệ | Tổng count đồng nhất filter, không lộ credential/callback secret. |
| DoiChieuAsync(paymentId, actor) | Kết luận gateway + chênh lệch | Query cùng ID; không đánh dấu thành công do nhân viên nhập tay thiếu chứng cứ. |
| PhanLoaiVaXuLyNgoaiLeAsync(id, dto, actor) | Phân bổ hợp lệ hoặc intent hoàn có nguồn | Khóa giao dịch/đơn; dùng HoanTienService của Thanh Tùng cho phần được kết luận hoàn. |


### 11.D. Trình tự triển khai và tích hợp

1. Lập bảng chuyển trạng thái của handler: pending→success/failure đã xác minh; success nhận success cùng dữ liệu là no-op; success nhận failure cũ không đảo; dữ liệu mâu thuẫn cần đối chiếu.
2. Xác minh nguồn/chữ ký, mã yêu cầu, tiền, currency/cấu hình cổng trước truy cập nhánh trả kết quả cũ. Request giả không được đi tắt bằng ID của callback đã xử lý.
3. ma_yeu_cau unique chỉ chống trùng yêu cầu nội bộ. Cùng mã giao dịch ngoài có thể bị gửi cho hai yêu cầu: chốt cơ chế khóa database theo (gateway, transactionId) hoặc phạm vi serializable phù hợp, không giả định ERD có unique cặp này.
4. Nếu tiền đến sau hold hết hạn/đơn hủy, ghi nhận sự thật giao dịch rồi phân loại tiền cần xử lý; không tự xác nhận đơn, không tự tạo lại giữ chỗ hoặc tiêu mã.
5. Giao dịch thứ hai thực sự thu thêm cho một đơn đã trả đủ phải được nhận diện là tiền thừa. Hai callback của cùng giao dịch chỉ là sự kiện lặp, không phải hai lần thu.
6. Số tiền thực khác kỳ vọng: bảo toàn bằng chứng, trạng thái cần đối chiếu; không tạo chi tiết giả làm tổng con vượt/khác tổng thực. Phân loại các chi tiết mục đích hợp lệ sau xác minh, với audit rõ.
7. HOAN_TIEN bắt buộc chi tiết thu gốc: chỉ lập hoàn sau khi khoản thực thu có nguồn chi tiết được phân loại theo enum/quy ước hiện hữu đã thống nhất Day 1; không mặc định gán mọi tiền sai là ThuBoSung.
8. Callback/job thao tác hệ thống vẫn xử lý nghĩa vụ của tài khoản khách bị khóa. Cảnh báo nội bộ gửi một sự kiện ổn định, dữ liệu khách không chứa lỗi gateway nhạy cảm.

### 11.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| CALLBACK_KHONG_HOP_LE | 400 | Xác thực hoặc định danh payload không đạt; không ghi tiền. |
| GIAO_DICH_CONG_DA_GAN_YEU_CAU_KHAC | 409 | Một giao dịch ngoài đang bị gắn hai payment; đưa đối chiếu. |
| TIEN_THU_CHUA_PHAN_LOAI | 409 | Chưa được dùng làm cọc/thu thêm hợp lệ hoặc nguồn hoàn tự động. |
| PHAN_BO_TIEN_KHONG_KHOP | 400 | Tổng chi tiết khác thực thu đã xác minh. |
| KET_QUA_GATEWAY_MAU_THUAN | 409 | Không đủ căn cứ kết luận, giữ trạng thái cần đối chiếu. |


### 11.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T8-A01 | Cùng callback thành công gửi lặp và đảo thứ tự với pending/failure | Một lần ghi nhận tiền, success không bị lùi. |
| W4-T8-A02 | Hai maYeuCau khác nhưng cùng gateway transactionId | Không phân bổ hai lần số tiền của một giao dịch ngoài. |
| W4-T8-A03 | Đơn hết hold, tiền về sau đó khi sản phẩm đã được khách khác giữ | Không xác nhận lại đơn cũ, không vượt kho; lập ngoại lệ tiền. |
| W4-T8-A04 | Đơn đã thu đủ, một giao dịch ngoài mới thu thêm thật | Ghi đúng hai khoản thực thu, phần thừa tách để xử lý/hoàn có nguồn. |
| W4-T8-A05 | Thực thu 1.100.000, kỳ vọng 1.000.000 | Chưa tự coi hợp lệ 1.000.000 và bỏ mất 100.000; audit/đối chiếu nêu toàn bộ thực thu. |
| W4-T8-A06 | Tài khoản khách khóa sau khi gửi thanh toán | Callback thật vẫn được ghi nhận và xử lý tiền, không bị bỏ qua bởi khóa tài khoản. |
| W4-T8-A07 | Restart giữa lúc chờ query gateway | Dữ liệu pending còn đầy đủ để tiếp tục bằng mã cũ. |


**Đóng W4-T8:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 12. W4-T9 — Theo dõi đơn, thông báo và tích hợp (Thanh Tùng điều phối)

### 12.0. Phạm vi, quy tắc nghiệp vụ và API

Mở rộng Service/Controller đã làm ở Tuần 3; các chủ module trả DTO chuẩn để Thanh Tùng ghép, không viết lại màn/API hồ sơ.

- [ ] Khách thấy tất cả đợt trả, thiết bị đã trả, còn nợ, đang xử lý mất; hiển thị nhãn trả một phần/quá hạn theo dữ liệu thật.
- [ ] Hiển thị phí gợi ý riêng với phí chính thức đã duyệt, trạng thái tranh chấp và kết luận giải quyết; không gộp tất cả thành “đã phải trả”.
- [ ] Hiển thị bảng đối soát, tiền thuê đã trả, cọc đang xử lý, số thu thêm/hoàn và giao dịch thực tế. Không ghi “đã hoàn” chỉ vì bảng tính có số cần hoàn.
- [ ] Đơn hủy hiển thị phí giữ lại và từng khoản hoàn đang chờ/thất bại/thành công; không biến mất khỏi lịch sử.
- [ ] Thông báo theo sự kiện: nhận trả từng đợt, nhắc quá hạn theo mốc, phụ phí được thông báo/giải quyết, yêu cầu thanh toán bổ sung, kết quả hoàn và hoàn tất.
- [ ] Mã sự kiện chống lặp theo đúng phiếu/đợt/giao dịch hoặc mốc nhắc; không dùng một mã chung khiến thông báo đợt trả thứ hai bị bỏ qua.
- [ ] Chi tiết đơn khách luôn kiểm tra quyền sở hữu; không lộ ghi chú nội bộ, dữ liệu gateway nhạy cảm hoặc nguồn thu của người khác.
- [ ] Trạng thái đơn, chứng từ, giao dịch và lịch sử phải thống nhất khi tải lại API, không chỉ đúng ngay trong response thao tác.

### 12.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/TruyVanDonThueService.cs (mở rộng)`
- [ ] `Models/DTOs/DonThue/ (mở rộng)`
- [ ] `Services/ThongBaoService.cs (sự kiện Week 4)`
- [ ] `docs/contracts/week4.md (đề xuất)`
- [ ] `docs/verification/week4.md (đề xuất)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 12.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| DonTaiChinhResponse | từng đợt trả, đồ còn nợ, phí và tranh chấp, đối soát gốc/con, thu/hoàn theo trạng thái, việc khách có thể làm | Tách số đề nghị, đã duyệt, đã thu và đã hoàn; không chỉ hiển thị một tổng tiền không giải thích. |
| SuKienWeek4Command | loại sự kiện, ID chứng từ nguồn, chủ nhận, mốc nghiệp vụ | Ghi record sự kiện/thông báo trong cùng transaction nghiệp vụ; chỉ phát/gửi ra ngoài sau commit thành công. |
| BienBanNghiemThu | mã ca, người chạy, dữ liệu seed, request, expected, actual, Pass/Fail/Blocked, minh chứng | Không điền Pass khi chưa chạy; đây là mẫu bàn giao, không phải Entity. |


### 12.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayChiTietDonCuaToiAsync(donId, actor) (mở rộng) | DTO khách có tiến độ nhận trả và tài chính | Join đúng scope; không lộ biên bản nội bộ ngoài quyền. |
| LayChiTietDonVanHanhAsync(donId, actor) (mở rộng) | DTO vận hành và vướng mắc liên module | Đọc projection từng tập rồi aggregate, tránh nhân tiền bởi số dòng nhận trả. |
| TaoThongBaoSuKienWeek4(command) | Thông báo mới/đã có | Thanh Tùng nối helper; email adapter hoàn thiện Week 5. |
| TongHopKetQuaNghiemThu (công việc, không endpoint) | Hồ sơ tích hợp có chủ lỗi rõ | Thanh Tùng tổng hợp; chủ service sửa lỗi trong phạm vi mình. |


### 12.D. Trình tự triển khai và tích hợp

1. Chốt Day 1 một mẫu DTO đọc đơn đầy đủ; mỗi chủ service cung cấp phần dữ liệu và mã lỗi của mình, Thanh Tùng ghép contract.
2. Chọn các sự kiện cần thông báo: nhận trả, phụ phí/tranh chấp, yêu cầu trả thêm, hoàn thành tiền, hoàn tất đơn và hủy. Không thông báo thành công chỉ vì vừa tạo intent.
3. Chạy happy path giao→trả đủ→không phí→hoàn cọc→HoanTat, sau đó chạy trả nhiều đợt, mất, phí vượt cọc và tranh chấp.
4. Chạy các ca tranh chấp đồng thời đã phân công: nhận trùng, lập đối soát trùng, hủy/giao, callback trùng/đến muộn và hoàn vượt nguồn. Không thể thay toàn bộ bằng kiểm tra CRUD đơn lẻ.
5. Rà API đọc với khách A/B, staff/admin và tài khoản khóa; quyền frontend chỉ hỗ trợ UI, quyết định bảo vệ ở service/backend.
6. Ghi lỗi theo module chịu trách nhiệm, dữ liệu tái hiện và mức chặn; Week 4 chỉ đóng khi tiền/nguồn/thiết bị khớp và không còn lỗi chặn trong các luồng bắt buộc.

### 12.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DTO_TICH_HOP_THIEU_NGUON | Nghiệm thu | Số tiền/phiếu trên UI không truy ra chứng từ; ghi Fail cho chủ service liên quan. |
| KET_QUA_NGHIEM_THU_CHUA_CO | Nghiệm thu | Ca chưa chạy phải là Blocked/Chưa chạy, không coi backend đã hoàn tất. |


### 12.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W4-T9-A01 | Đơn có 3 lần nhận, 4 phí, 2 nguồn cọc và 2 hoàn | API chi tiết tổng đúng, không nhân số tiền do JOIN nhiều tập con. |
| W4-T9-A02 | Hoàn đang chờ trên đơn đã trả đủ | Khách thấy chờ hoàn, không thấy đã hoàn tiền/HoanTat sai. |
| W4-T9-A03 | Phiếu điều chỉnh sau HoanTat | UI phân biệt bản gốc và bổ sung, giữ ngày hoàn tất gốc. |
| W4-T9-A04 | Lỗi email khi nghiệp vụ đã chốt | Đơn/tiền không rollback vì lỗi adapter; thông báo có trạng thái chờ xử lý phù hợp. |


**Đóng W4-T9:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 13. Các ví dụ chuẩn để cả nhóm dùng chung

### 13.1 Trả nhiều đợt và phí trễ

Đơn thuê 3 lều, đơn giá đã lưu 100.000đ/chiếc/ngày, hẹn trả 10:00 ngày D. Khách trả 2 chiếc lúc 09:30 ngày D và chiếc cuối lúc 11:00 ngày D+1; cả ba chiếc đều đạt kiểm tra khi trả. Chính sách đơn có hệ số trễ 150%.

- Sau đợt 1: hai chiếc đã nhận được giải phóng khỏi lượt thuê cũ sau kiểm tra; đơn vẫn đang thuê, còn nợ đúng một chiếc.
- Chiếc cuối trễ 25 giờ → làm tròn thành 2 ngày trễ → phí gợi ý `2 × 100.000 × 150% = 300.000đ`.
- Không tính phí trễ cho hai chiếc trả đúng hạn. Nếu nhân viên chốt phiếu sau 12:00, mốc tính trễ của chiếc cuối vẫn là 11:00 lúc thực nhận.
- Sau đợt cuối: đơn chờ đối soát; chưa tự hoàn tất ngay khi nhận đủ đồ.

### 13.2 Đối soát tiền cọc

Các ví dụ này giả định tiền thuê đã thanh toán riêng, cọc 1.000.000đ là cọc thực thu hợp lệ, chưa được hoàn trước đó.

| Phụ phí đã duyệt | Cần hoàn | Cần thu bổ sung | Điều kiện hoàn tất |
|---:|---:|---:|---|
| 0đ | 1.000.000đ | 0đ | Hoàn 1.000.000đ thành công |
| 200.000đ | 800.000đ | 0đ | Hoàn 800.000đ thành công |
| 1.000.000đ | 0đ | 0đ | Đủ điều kiện nghiệp vụ, không tạo giao dịch 0đ |
| 1.200.000đ | 0đ | 200.000đ | Thu bổ sung 200.000đ thành công |

Nếu sau khi đã hoàn 800.000đ, quản trị viên duyệt giảm phí từ 200.000đ xuống 150.000đ thì đối soát điều chỉnh chỉ hoàn thêm **50.000đ**. Không hoàn lại 850.000đ như thể chưa có lần hoàn trước.

### 13.3 Hủy đơn trước bàn giao

Đã thu 400.000đ tiền thuê sau giảm và 1.000.000đ cọc. Giả sử **chỉ trong dữ liệu kiểm tra** chính sách của đơn quy định giữ lại 50% tiền thuê khi hủy 24–48 giờ trước nhận.

- Hủy trước 72 giờ: hoàn 400.000đ từ nguồn tiền thuê và 1.000.000đ từ nguồn cọc.
- Hủy trước 36 giờ: giữ 200.000đ tiền thuê; hoàn 200.000đ từ nguồn tiền thuê và 1.000.000đ cọc.
- Cửa hàng hủy vì thiếu đồ: hoàn toàn bộ 1.400.000đ bất kể ví dụ tỷ lệ trên.
- Mức 50% ở ví dụ không phải chính sách mặc định mới; code luôn đọc chính sách đã gắn với đơn.

## 14. Hợp đồng phối hợp và lịch 5 ngày

### 14.1 Hợp đồng phải chốt trong Day 1

| Bên cung cấp | Bên dùng | Nội dung cần thống nhất |
|---|---|---|
| Tuấn Kiệt | Kiện Minh, Minh Tú, Kim Xuyến, Thanh Tùng | DTO thiết bị đã trả/còn nợ/mất, giờ thực trả, phiếu đã chốt, điều kiện hoàn tất nghĩa vụ giao nhận |
| Minh Tú | Kiện Minh | Helper tính phí trễ theo từng thiết bị và snapshot của đơn; kết quả dự kiến/chính thức khác nhau ở mốc kết thúc |
| Kiện Minh | Kim Xuyến, Tuấn Kiệt | Phí đã duyệt, tranh chấp, phí mất và điều chỉnh; không để NhanTraService và PhuPhiService gọi vòng nhau |
| Kim Xuyến | Thanh Tùng, Minh Tú | Bảng nghĩa vụ đã xác nhận, nguồn cọc, số cần hoàn/thu, mã đối soát và quy tắc chống tạo lặp |
| Thanh Tùng | Minh Tú, Kim Xuyến | Interface hoàn tiền, giữ số dư nguồn hoàn, trạng thái và mã yêu cầu ổn định |
| Minh Tú | Thanh Tùng, Kim Xuyến | Adapter gateway, xác minh/đối chiếu, DTO trạng thái thu, method thu bổ sung |
| Kim Xuyến | Thanh Tùng | Method hủy phân công trước giao trong transaction hủy đơn; không giải phóng phân công đã bàn giao |
| Thanh Tùng | Cả nhóm | Ghi lịch sử/thông báo trong transaction, DTO theo dõi đơn và cập nhật DI |

**Luồng gọi tránh phụ thuộc vòng:** `DoiSoatService` gọi service thu/hoàn; callback thu/hoàn chỉ cập nhật giao dịch, không gọi ngược đối soát. `NhanTraService` đọc trạng thái phí mất đã duyệt; `PhuPhiService` đọc dữ liệu kiểm tra và chứng từ, không gọi ngược để tự chốt nhận trả.

Riêng hồ sơ mất: duyệt phí bồi thường mất trước, sau đó duyệt kết luận mất để xác định mốc dừng trễ; phí trễ chính thức được chốt theo mốc đó. Đối soát đợi tất cả khoản liên quan có kết luận.

### 14.2 Tiến độ theo ngày

| Người | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|---|---|---|---|---|---|
| **Thanh Tùng** | Chốt interface hoàn, nguồn tiền; xem trước hủy | Hủy nguyên tử và lập yêu cầu hoàn; gateway theo contract | Hoàn thành công/thất bại/chưa rõ, chống lặp | Nối bảng đối soát và ngoại lệ thu; mở rộng theo dõi/thông báo | Kiểm tra hủy, hoàn, quyền và tích hợp chung |
| **Kiện Minh** | Chốt công thức/căn cứ, DTO phí và trạng thái | Gợi ý/lập/sửa khoản chưa duyệt; duyệt/từ chối | Tranh chấp, phí mất, khóa phí sau xác nhận đối soát | Điều chỉnh phí; nối dữ liệu nhận trả thật | Kiểm tra tính phí, quyền duyệt, sửa lỗi |
| **Minh Tú** | Chốt adapter, khóa giao dịch, helper trễ | Quá hạn/khả dụng sau trả; adapter có kết quả mô phỏng | Thu bổ sung, callback lặp/thu muộn/thu trùng | Đối chiếu sai số tiền/chưa rõ; kiểm tra khả dụng lịch sau | Kiểm tra cạnh tranh, phục hồi giao dịch và sửa lỗi |
| **Kim Xuyến** | Chốt bảng đối soát và liên kết thu/hoàn | Xem trước/lập/xác nhận bảng tính; interface giải phóng phân công | Xử lý tiền, kiểm tra điều kiện chốt và hoàn tất | Đối soát điều chỉnh; nối đầy đủ service thu/hoàn | Kiểm tra số dư, chốt đồng thời, sửa lỗi |
| **Tuấn Kiệt** | Chốt DTO nhận trả và đồ còn nợ | Nháp/chốt trả đủ và trả một phần | Hồ sơ mất, phê duyệt, bảo trì tối thiểu, đợt cuối | Nối phụ phí/khả dụng; chạy nhiều đợt bằng API | Kiểm tra trả trùng, quyền, trạng thái và sửa lỗi |

**Mốc nhóm:** Cuối Day 1 có contract; cuối Day 2 chạy được trả một phần và tính dự kiến; cuối Day 3 có luồng trả đủ → phụ phí → đối soát → thu/hoàn cơ bản; Day 4 xử lý ngoại lệ và điều chỉnh; Day 5 nghiệm thu/sửa lỗi, không bắt đầu module mới.

Thanh Tùng, Minh Tú có phần tài chính phụ thuộc nhau nên cần bàn giao adapter/interface sớm. Kim Xuyến có thể làm bảng đối soát bằng dữ liệu hợp lệ có sẵn, Kiện Minh làm phí bằng DTO mẫu; trước nghiệm thu phải thay bằng dữ liệu API tích hợp thật.

## 15. Nghiệm thu cuối tuần

### 15.1 Các luồng demo bắt buộc

1. **Trả đủ, không phụ phí:** Đơn đã bàn giao → nhận đủ/kiểm tra → đối soát → hoàn toàn bộ cọc → hoàn tất.
2. **Trả hai đợt, có trễ:** Đợt 1 trả một phần → đồ còn nợ/quá hạn → đợt cuối → duyệt phí → hoàn cọc còn lại hoặc thu thêm → hoàn tất.
3. **Mất thiết bị:** Hồ sơ mất → phí mất được duyệt → quản trị viên duyệt kết luận mất → chốt nhận trả → chốt phí trễ nếu có → đối soát.
4. **Hủy trước giao:** Xem trước chính sách → xác nhận hủy → giải phóng lịch → hoàn theo từng nguồn; mô phỏng hoàn thất bại rồi đối chiếu xử lý thành công.
5. **Tiền đến muộn/thu trùng:** Đơn không bị khôi phục hoặc tăng cọc sai; khoản tiền ngoại lệ được theo dõi và hoàn đúng một lần.

### 15.2 Checklist có kết quả mong đợi

| # | Tình huống | Kết quả bắt buộc | Người chính |
|---|---|---|---|
| 1 | Trả 2/3 thiết bị | Giữ đang thuê, còn nợ đúng 1; không tự hoàn cọc | Tuấn Kiệt |
| 2 | Hai request nhận cùng thiết bị, kể cả khác phiếu | Chỉ một kết luận hợp lệ; không giải phóng kho hai lần | Tuấn Kiệt |
| 3 | Hai request tạo đợt trả | Không trùng mã/số đợt; request lặp không tạo đợt rỗng | Tuấn Kiệt |
| 4 | Phiếu nháp có dòng trả/mất chưa duyệt | Chưa coi đã hoàn thành nghĩa vụ | Tuấn Kiệt |
| 5 | Đợt cuối còn hồ sơ mất chưa duyệt | Không tự chuyển chờ đối soát | Tuấn Kiệt |
| 6 | Nhận thiết bị hỏng, đã có lịch kế tiếp | Chuyển bảo trì, có phiếu xử lý và cảnh báo lịch bị ảnh hưởng | Tuấn Kiệt, Minh Tú |
| 7 | Trả đúng giờ, trễ 1 phút, đúng 24 giờ, trễ 24 giờ 1 phút | Ngày trễ lần lượt 0, 1, 1, 2; đúng giá/hệ số của đơn | Minh Tú, Kiện Minh |
| 8 | Chỉ một thiết bị trả trễ trong dòng nhiều chiếc | Chỉ tính phí chiếc trễ; dùng giờ trả của chiếc đó | Kiện Minh, Minh Tú |
| 9 | Thiết bị mất đã có phê duyệt | Dừng phí trễ tại giờ duyệt mất; không thêm sửa chữa cùng tổn thất | Kiện Minh, Tuấn Kiệt |
| 10 | Phí bị từ chối hoặc tranh chấp đang mở | Không đưa vào bảng đủ điều kiện chốt | Kiện Minh, Kim Xuyến |
| 11 | Cọc 1 triệu, phí 0 / 200 nghìn / 1 triệu / 1,2 triệu | Hoàn/thu đúng các ví dụ mục 13 | Kim Xuyến |
| 12 | Đối soát đã có khoản hoàn của chính nó | Giữ nguyên nghĩa vụ ban đầu, không trừ hoàn rồi tính thiếu tiền cần hoàn | Kim Xuyến |
| 13 | Hoàn/thu bổ sung thất bại hoặc chưa rõ | Đơn tiếp tục chờ đối soát, không báo hoàn tất | Thanh Tùng, Minh Tú, Kim Xuyến |
| 14 | Bấm xử lý tiền/chốt đối soát đồng thời | Không tạo hai đối soát ban đầu hoặc hai nghĩa vụ thu/hoàn | Kim Xuyến, Thanh Tùng, Minh Tú |
| 15 | Hai khoản hoàn cùng nguồn vượt số thu khi tính cả yêu cầu đang chờ | Chặn vượt số dư bằng transaction | Thanh Tùng |
| 16 | Callback lặp, kết quả cũ đến sau thành công | Không tạo thêm tiền hoặc ghi đè kết quả thành công | Thanh Tùng, Minh Tú |
| 17 | Ứng dụng dừng sau gửi yêu cầu nhưng trước ghi kết quả | Tiếp tục đối chiếu cùng mã cũ, không thu/hoàn lại bằng mã mới | Thanh Tùng, Minh Tú |
| 18 | Hủy đúng 24/48 giờ hoặc vượt mốc giữa preview và xác nhận | Đúng nhánh chính sách; đổi bảng tính thì yêu cầu xác nhận lại | Thanh Tùng |
| 19 | Hủy đồng thời với chốt bàn giao | Chỉ một nghiệp vụ thành công; không vừa hủy vừa giao | Thanh Tùng, Tuấn Kiệt |
| 20 | Đã thuê rồi gọi hủy | Bị từ chối; phải đi nhận trả/đối soát | Thanh Tùng |
| 21 | Hủy sau dùng mã khuyến mãi đã thanh toán | Không tự phục hồi lượt đã sử dụng | Thanh Tùng |
| 22 | Tiền tới sau hết hạn/hủy hoặc thu trùng | Không khôi phục đơn; theo dõi và hoàn khoản ngoại lệ | Minh Tú, Thanh Tùng |
| 23 | Sai số tiền/khách tự gửi success hoặc đổi số tiền thu thêm | Không tự xác nhận đã đủ tiền | Minh Tú |
| 24 | Điều chỉnh giảm phí sau khi đã hoàn 800 nghìn | Chỉ hoàn thêm phần chênh lệch, không hoàn lại cả cọc | Kiện Minh, Kim Xuyến, Thanh Tùng |
| 25 | Thiết bị đã trả đạt kiểm tra, đơn còn chờ đối soát | Không bị giữ bởi nghĩa vụ vật lý đã xong; vẫn xét lịch khác | Minh Tú |
| 26 | Khách đổi ID xem/tranh chấp/thu/hoàn đơn khác; nhân viên vượt quyền | Không lộ dữ liệu hoặc thực hiện trái quyền | Từng chủ API |

Ca cạnh tranh và transaction cần chạy với database thật trong môi trường phát triển và request đồng thời. Các luồng gateway dùng mock có trạng thái bền vững để mô phỏng được việc mất phản hồi và tiếp tục sau khởi động lại.

### 15.3 Bàn giao cuối tuần

- [ ] Các service, interface, controller và DTO tích hợp/build được; không trùng route, không có service gọi vòng nhau.
- [ ] Có ví dụ request/response, quyền API, mã lỗi và hướng dẫn gọi từng luồng cho frontend.
- [ ] Chứng từ đã chốt được khóa; sửa sai bằng điều chỉnh có lý do/phê duyệt, không ghi đè lịch sử.
- [ ] Có kết quả kiểm tra các ca phụ trách; không còn lỗi thu/hoàn trùng, tính phí toàn bộ số lượng khi chỉ một chiếc trễ, trả trùng hoặc hoàn tất trước khi xử lý tiền xong.
- [ ] Luồng Tuần 2–3 vẫn chạy: tạo đơn/thanh toán, chuẩn bị, bàn giao, khả dụng; nhận trả/đối soát mới không làm hỏng trạng thái cũ.
- [ ] Theo dõi đơn thể hiện đúng trả nhiều đợt, đồ còn nợ, phí, khoản thu/hoàn, tranh chấp và điều chỉnh đang xử lý.
- [ ] Ghi rõ giới hạn gateway mock và các phần còn ở Tuần 5–6; không tuyên bố đã kết nối cổng thật hoặc hoàn thành bảo trì/kiểm kê đầy đủ.

## 16. Câu giao việc ngắn cho từng người

- **Thanh Tùng:** Làm hủy đơn và hoàn tiền dùng chung; mở rộng theo dõi đơn/thông báo; tích hợp kết quả cuối tuần.
- **Kiện Minh:** Làm gợi ý/lập/duyệt phụ phí, tranh chấp và điều chỉnh phí, dùng đúng chính sách/snapshot của đơn.
- **Minh Tú:** Làm quá hạn, khả dụng sau trả; mở rộng giao dịch thu, thu bổ sung, adapter mock và các ngoại lệ thanh toán.
- **Kim Xuyến:** Làm bảng đối soát cọc, yêu cầu thu/hoàn qua service dùng chung, chốt hoàn tất và đối soát điều chỉnh.
- **Tuấn Kiệt:** Làm nhận trả nhiều đợt, kết luận mất, cập nhật tình trạng thiết bị và tạo phiếu bảo trì tối thiểu khi cần.

**Điểm kết thúc Tuần 4:** API xử lý được từ đơn đang thuê đến nhận trả, phụ phí, thu thêm/hoàn cọc và hoàn tất; đồng thời xử lý hủy trước bàn giao và tiền thu bất thường mà không mất dấu lịch sử hoặc xử lý tiền hai lần.
