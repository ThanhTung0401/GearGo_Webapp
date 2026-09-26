# GearGo — Week 6: Khuyến mãi, chính sách, báo cáo và bàn giao backend

> **Kế hoạch backend chi tiết — bản tái cấu trúc theo tên thành viên.** Week 2 đã hoàn thành theo xác nhận của nhóm; toàn bộ Entities đã viết. Phạm vi giao việc là Service, Controller, interface, DTO và tích hợp/kiểm tra cần thiết. Với Week 6, các tuần trước là điều kiện đầu vào cần chạy được khi bắt đầu triển khai.

**Nhóm:** Thanh Tùng (Người 1), Kiện Minh (Người 2), Minh Tú (Người 3), Kim Xuyến (Người 4), Tuấn Kiệt (Người 5). Tên này là tên thành viên phát triển, không phải role của tài khoản trong hệ thống.

**Nền tảng:** ASP.NET Core Web API, EF Core, SQL Server, JWT, JSON; React gọi API riêng. Dùng phiên bản/cấu hình đang chạy trong repo của nhóm.

**Tài liệu chuẩn:** đặc tả `GearGo_Dac_Ta_Nghiep_Vu(7).md`, ERD bản `erd.txt` và nền tảng Plan Week 2 đã hoàn thành. Bản `ERD(20260925-062324).dbml` cũ thiếu `THIET_BI.ma_san_pham_hien_tai` và FK tương ứng; bản `erd.txt` gửi sau có chúng và khớp đặc tả giáng cấp. Bốn plan dùng bản `erd.txt` làm chuẩn, không sửa các tài liệu nguồn.

**Cách đọc:** bảng mục 2 cho biết ai làm gì; các task có mã `W6-Tn`; từng task nêu hợp đồng request/response, method, quy tắc nghiệp vụ, luồng xử lý, lỗi và ca nghiệm thu. Các request mẫu cần thay ID bằng dữ liệu seed thực tế. Ngày/giờ trong JSON là fixture; đặt đồng hồ kiểm thử phù hợp với điều kiện trước/sau nghiệp vụ, không gửi nguyên ngày mẫu vào môi trường thật. Ngày 1–5 là ngày làm việc, chưa gắn ngày lịch.

## 1. Phạm vi và kết quả cần đạt

| Phần việc | Đầu ra nghiệm thu |
|---|---|
| UC24 — Khuyến mãi đầy đủ | API quản trị mã, phạm vi, thời hạn, hạn mức; tích hợp đúng với giỏ, tạo đơn, thanh toán, hủy và hết hạn |
| UC26 — Chính sách | Xem trước/kiểm tra nội dung, tạo phiên bản và thời điểm áp dụng; đơn cũ tiếp tục dùng chính sách đã gắn |
| UC25 — Báo cáo vận hành | Đơn cần giao/trả, quá hạn, chờ đối soát; hoạt động thuê và chỉ số có định nghĩa rõ |
| UC25 — Báo cáo tài chính | Tách doanh thu đơn hoàn tất, phí hủy, điều chỉnh, thu/hoàn thực tế và cọc chưa tất toán |
| UC25 — Báo cáo nhập/kho/bảo trì | Số lượng/giá trị nhập đã xác nhận, điều chỉnh riêng, lịch sử giá và trạng thái thiết bị |
| UC26 — Lịch sử/nhật ký | Tra cứu có lọc/phân trang/phân quyền, truy tới chứng từ và dữ liệu trước/sau phù hợp |
| Hoàn thiện API | Hợp đồng request/response thống nhất; sửa lỗi liên module, quyền, dữ liệu và hiệu năng có bằng chứng |
| Nghiệm thu và triển khai demo | Chạy luồng tổng, kiểm tra môi trường, tài liệu vận hành, bản demo backend và cách phục hồi |

**Ranh giới của tuần cuối:**

- Không tạo lại Entities, DbSet, Fluent API hoặc phân công migration đại trà. Nếu lỗi mapping/index cụ thể thật sự cản trở nghiệm thu thì ghi lỗi và giao người quản lý database xử lý có kiểm soát, không tự sửa ERD cho tiện query.
- Không làm lại khả dụng, thanh toán, hoàn tiền, thông báo hoặc AI thành hệ thống độc lập. Bổ sung phần quản trị/đọc và sửa lỗi tích hợp trên service hiện có.
- Các báo cáo là thống kê phục vụ vận hành trong phạm vi đề tài, không tự biến thành hệ thống kế toán, thuế, công nợ nhà cung cấp hoặc báo cáo lợi nhuận đầy đủ.
- Backend có API dữ liệu cho dashboard; không coi việc viết API là đã hoàn tất màn React. Nếu frontend chưa có, demo bằng công cụ gọi API và ghi rõ phần chưa tích hợp giao diện.
- Gateway thanh toán, AI/email thật chỉ được ghi hoàn thành khi đã kiểm chứng với cấu hình tương ứng. Một bản chạy mock không được mô tả là đang xử lý tiền/gửi email thật.
- “Triển khai” trong tài liệu là nhiệm vụ nhóm thực hiện ở cuối tuần sau khi đủ điều kiện; tài liệu này không phải xác nhận hệ thống đã được triển khai.

## 2. Bảng phân công cho 5 người

| Người | Module chịu trách nhiệm | Service mới / mở rộng | Controller sở hữu | Task |
|---|---|---|---|---|
| **Thanh Tùng** | Chính sách, lịch sử/nhật ký, tích hợp cấu hình và triển khai | Mới `ChinhSachService`, `TraCuuNhatKyService`; dùng lại helper ghi lịch sử | `Admin/ChinhSachController`, `ChinhSachController`, `Admin/NhatKyController` | W6-T1, W6-T7, W6-T9 |
| **Kiện Minh** | Khuyến mãi quản trị và toàn bộ luồng áp mã | Mới `QuanTriKhuyenMaiService`; mở rộng `KhuyenMaiService` Tuần 2 | `Admin/KhuyenMaiController`; phối hợp action áp mã của giỏ đã có | W6-T2, W6-T3 |
| **Minh Tú** | Báo cáo nhập hàng, kho, bảo trì và điều chỉnh | Mới `BaoCaoKhoService`; tái sử dụng query giá trị hiệu lực và khả dụng Tuần 5 | `BaoCaoKhoController` | W6-T6 |
| **Kim Xuyến** | Doanh thu, thu/hoàn, cọc và đối chiếu số liệu tài chính | Mới `BaoCaoTaiChinhService`; mở rộng projection số dư từ đối soát nếu cần | `Admin/BaoCaoTaiChinhController` | W6-T5 |
| **Tuấn Kiệt** | Báo cáo vận hành, chỉ số thuê; điều phối kiểm tra toàn luồng | Mới `BaoCaoVanHanhService`; dùng lại truy vấn đơn, nhận trả, quá hạn | `BaoCaoVanHanhController` | W6-T4, W6-T8 |

Mỗi người viết interface `I...Service`, implementation, DTO, phân quyền, dữ liệu kiểm tra và response mẫu của module. Không chia lại việc tạo Entity.

Tuấn Kiệt điều phối danh sách ca nghiệm thu, các chủ module tự sửa lỗi của mình. Thanh Tùng tổng hợp DI/cấu hình và bản triển khai; không phải gánh toàn bộ kiểm tra cuối tuần một mình.

## 3. Quy ước dùng chung trước khi code

### 3.1 Quyền, API và thời gian

- Khách chỉ đọc chính sách công khai/được áp dụng cho đơn của mình và dùng mã giảm giá qua giỏ. Không truy cập báo cáo tổng hợp, nhật ký nội bộ hoặc danh sách người dùng mã.
- Nhân viên xem báo cáo công việc và dữ liệu kho cần cho vận hành; doanh thu toàn hệ thống, giá nhập, cấu hình chính sách và quản trị khuyến mãi dành cho quản trị viên.
- Service kiểm tra quyền hiện tại trên từng truy vấn/action; tham số `scope=all` hoặc token cũ không tự vượt qua thay đổi vai trò của Tuần 5.
- Controller gọi service, không tự tính doanh thu/tồn hoặc quyết định tỷ lệ giảm giá. Giữ `Result`, DTO và lỗi chung của các tuần trước.
- Bộ lọc báo cáo theo ngày Việt Nam được chuyển một lần sang UTC. Khoảng ngày dùng **[00:00 ngày bắt đầu, 00:00 ngày sau ngày kết thúc)**, không dùng mốc 23:59:59 làm mất dữ liệu phần giây.
- API trả rõ bộ lọc đã áp dụng, múi giờ hiển thị, đơn vị VND, mốc lấy dữ liệu và ý nghĩa chỉ số. Không dùng chung một từ “ngày” khi mỗi báo cáo lấy một thời điểm nghiệp vụ khác nhau.
- Danh sách có phân trang/sắp xếp ổn định; giới hạn khoảng ngày/số dòng theo cấu hình để query không tải toàn bộ lịch sử không kiểm soát.

### 3.2 Đúng số liệu trước khi tối ưu

- Đọc từ chứng từ/trạng thái thật, không tự tạo bảng báo cáo hay cột tổng mới trên Entity chỉ để lưu lại phép cộng.
- Tổng tiền dùng `decimal`; tổng hợp trước theo đúng mức dữ liệu rồi mới nối. Không JOIN đơn × dòng đơn × giao dịch × phụ phí rồi SUM làm nhân số tiền.
- Tách riêng dữ liệu gốc, điều chỉnh và giá trị hiệu lực. Không cộng toàn bộ snapshot trước/sau như các giao dịch phát sinh mới.
- Các số ở phần tổng và bảng chi tiết phải cùng bộ lọc/quyền và mốc dữ liệu. Khi cần nhất quán, dùng cùng query/projection hoặc cơ chế đọc nhất quán đã được cấu hình, không chỉ gắn cùng một timestamp lên hai lần đọc khác nhau.
- Phân biệt chỉ số **phát sinh trong kỳ** với **số dư hiện tại**. Không gắn bộ lọc 7 ngày cho thẻ cọc hiện tại rồi chỉ cộng cọc được thu trong 7 ngày đó.
- Tuần này không cam kết khôi phục toàn bộ kho/cọc tại bất kỳ ngày quá khứ nếu chưa có phép dựng trạng thái lịch sử được kiểm chứng. API tồn/số dư mặc định là hiện tại, ghi rõ thời điểm; báo cáo phát sinh có bộ lọc kỳ riêng.

### 3.3 Những giới hạn ERD phải tôn trọng

| Dữ liệu | Cách sử dụng |
|---|---|
| `CHINH_SACH.phien_ban` unique, `thoi_diem_ap_dung` | Phiên bản và lịch hiệu lực; bảng không có cột nháp/đang bật/ngày hết hạn |
| `DON_THUE.ma_chinh_sach` | Nguồn chính sách của từng đơn, không thay bằng phiên bản mới nhất khi tính hủy/trễ |
| `DON_THUE.khuyen_mai_luc_dat` | Snapshot điều kiện/giảm giá đã chấp nhận; không suy ra giá cũ bằng cấu hình mã hiện tại |
| `GIO_THUE.ma_khuyen_mai` | FK mã khuyến mãi, không phải chuỗi mã khách nhập |
| `LUOT_SU_DUNG_KHUYEN_MAI.ma_don_thue` unique | Một lượt cho một đơn; chuyển giữ → đã dùng, không chèn lượt thứ hai |
| Hai bảng nối khuyến mãi | Phạm vi sản phẩm/danh mục theo composite PK; không lưu list vào một cột tự thêm |
| `CHI_TIET_DON_THUE.tien_giam` | Phần giảm đã phân bổ từng dòng, tổng khớp tổng giảm trên đơn |
| `THANH_TOAN.tong_so_tien` và chi tiết thu | Tổng giao dịch và phân loại của cùng khoản tiền; không cộng cả hai thành hai lần thu |
| `HOAN_TIEN.ma_chi_tiet_thanh_toan_goc` | Truy nguồn thu/mục đích/đơn của khoản hoàn; không giả định hoàn có FK đơn trực tiếp |
| `DOI_SOAT_TIEN_COC.ma_doi_soat_goc` | Phân biệt bảng ban đầu với điều chỉnh; không cộng lại cọc gốc ở mỗi lần điều chỉnh |
| `PHIEU_DIEU_CHINH_KHO` và JSON trước/sau | Dùng phép tính giá trị hiệu lực đã chốt Tuần 5; chỉ phiếu đã áp dụng mới tác động số liệu |
| `NHAT_KY_THAO_TAC.ma_doi_tuong` | Mã đối tượng dạng chuỗi; tra theo loại + mã, không luôn ép thành một FK số |


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


## 4. W6-T1 — Quản lý chính sách theo phiên bản (Thanh Tùng)

### 4.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** Phần cấu hình UC26. **Service:** `IChinhSachService` + `ChinhSachService`.

**Method chính:** `LayDanhSachAsync`, `LayChiTietAsync`, `LayDangHieuLucAsync`, `KiemTraNoiDungAsync`, `TaoPhienBanAsync`, `LayChinhSachCuaDonAsync`.

**DTO:** Nội dung chính sách có cấu trúc, tên, thời điểm áp dụng, các lỗi validation theo trường; response phiên bản có trạng thái **suy ra** từ thời gian chứ không tự thêm cột trạng thái.

#### Nội dung và kiểm tra

- [ ] Quản trị được hạn giữ chỗ, khung nhận/trả, phí trễ, quy tắc hủy, bồi thường, ngưỡng duyệt phí và mốc nhắc khách theo đặc tả.
- [ ] Nội dung vẫn lưu JSON trong `noi_dung_chinh_sach`; dùng DTO và bộ kiểm tra chung để phát hiện thiếu khóa, sai kiểu, giá trị ngoài miền và cấu hình mâu thuẫn.
- [ ] Giữ tên/ý nghĩa các khóa JSON mà service Tuần 2–5 đã đọc. Nếu chuẩn hóa tên/phiên bản nội dung, có lớp đọc tương thích chính sách cũ; không làm đơn cũ không tính được phí.
- [ ] Thời hạn giữ chỗ dương; phí/hệ số/ngưỡng tiền không âm; tỷ lệ giữ lại tiền thuê nằm trong khoảng hợp lệ; các mốc hủy không chồng chéo/bỏ trống.
- [ ] Mốc nhắc có đơn vị/thời điểm tham chiếu rõ. Phân biệt hệ số 150% với giá trị 150 hoặc 1,5 trong JSON và sử dụng thống nhất.
- [ ] Dùng quy tắc hủy đã thống nhất: trên 48 giờ; từ 24–48 giờ gồm hai mốc biên; dưới 24 giờ. Không tự thay đổi cách xử lý đúng 24/48 giờ ở service khác.
- [ ] Chính sách nghiệp vụ của đơn và quyền đăng nhập là hai lớp: quyền nhân viên luôn kiểm tra hiện tại; việc đơn dùng chính sách cũ không giúp người đã bị khóa tiếp tục duyệt.

#### Lưu và lựa chọn phiên bản

- [ ] Xem trước/kiểm tra nội dung không lưu thành một bản nháp trong database; ERD không có trạng thái nháp.
- [ ] Khi tạo thành công, lưu phiên bản mới cùng người tạo và thời điểm; phiên bản tăng có bảo vệ transaction/unique, không dùng `MAX + 1` không khóa.
- [ ] Chọn chính sách cho đơn mới trong các bản `thoi_diem_ap_dung <= now`, ưu tiên thời điểm áp dụng gần nhất; nếu cùng thời điểm thì phiên bản lớn hơn. Tất cả service dùng cùng một hàm chọn.
- [ ] Quy tắc cùng thời điểm cho phép sửa lịch tương lai bằng một bản mới thay thế tại đúng mốc đó mà không sửa bản đã lưu. Response phải chỉ rõ bản nào dự kiến được chọn tại mốc đó.
- [ ] Không đặt hồi tố một thời điểm quá khứ để làm như chính sách mới đã có từ trước; bootstrap ban đầu là dữ liệu riêng có kiểm soát.
- [ ] Mỗi đơn gắn `ma_chinh_sach` ở lúc tạo và giữ nguyên. Đổi phiên bản không sửa hạn giữ chỗ, phí/cọc/snapshot hoặc mốc nhắc của đơn cũ đã tạo.
- [ ] Các bản đã lưu được giữ bất biến trong phạm vi tuần này; sửa sai bằng bản mới. Muốn quay về nội dung cũ thì sao chép nội dung thành phiên bản mới, không đổi hàng loạt FK của đơn.
- [ ] Không có bản hiệu lực hợp lệ thì chặn tạo đơn mới với lỗi cấu hình rõ; không chọn bừa bản tương lai hoặc mặc định âm thầm.
- [ ] Tại thời điểm tạo đơn, nếu báo giá/chính sách khách vừa xem khác với dữ liệu được chọn, yêu cầu xác nhận lại theo cơ chế báo giá đã có.
- [ ] Cache chính sách mới phải hết hiệu lực đúng mốc lịch hoặc được kiểm tra lại bằng giờ server; không chỉ làm mới cache lúc quản trị viên bấm lưu.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/admin/chinh-sach`, `/api/admin/chinh-sach/{id}` | Quản trị viên |
| POST | `/api/admin/chinh-sach/kiem-tra` | Quản trị viên; kiểm tra/xem trước, không ghi |
| POST | `/api/admin/chinh-sach` | Quản trị viên; tạo phiên bản mới |
| GET | `/api/chinh-sach/hien-hanh` | Công khai, chỉ phần điều kiện thuê cần cho khách |
| GET | `/api/don-thue/{id}/chinh-sach` | Chủ đơn; qua controller đơn hiện có |

**Nghiệm thu:** V1 dùng cho đơn cũ; V2 có hiệu lực chỉ được chọn cho đơn mới đúng mốc. Phiên bản tương lai chưa được áp dụng sớm; JSON sai không được lưu; tạo đồng thời không trùng phiên bản.

### 4.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/Interfaces/IChinhSachService.cs`
- [ ] `Services/ChinhSachService.cs`
- [ ] `Services/ChinhSachValidator.cs`
- [ ] `Controllers/Admin/ChinhSachController.cs`
- [ ] `Controllers/ChinhSachController.cs`
- [ ] `Models/DTOs/ChinhSach/`
- [ ] `Services/DonThueService.cs (nối selector dùng chung)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 4.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TaoChinhSachRequest | tenChinhSach, thoiDiemApDung, noiDung có kiểu theo schema JSON hiện hữu | Phiên bản/người tạo/giờ tạo do server; không nhận role/status giả; không hồi tố tùy ý. |
| NoiDungChinhSachDto | giữ chỗ, nhận/trả, phí trễ, hủy, bồi thường, ngưỡng duyệt, mốc nhắc | Key map với JSON Week 2–5; đơn vị phút/giờ/tỷ lệ/VND rõ, không tự bỏ key cũ làm hỏng đơn cũ. |
| KiemTraChinhSachResponse | hopLe, loiTheoDuongDan[], canhBao[], banDuKienDuocChon | Validate/preview read-only, chưa tạo hàng trong CHINH_SACH. |
| ChinhSachResponse | maChinhSach, phienBan, thời điểm áp dụng/tạo, nội dung, trạng thái hiệu lực suy ra | Không thêm cột draft/enabled; nội dung công khai tách dữ liệu quản trị nội bộ. |
| ChinhSachCuaDonResponse | mã/phiên bản chính sách đã gắn đơn, điều khoản cần cho khách | Chủ đơn hoặc staff theo quyền, không tự trả bản hiện hành thay bản của đơn. |


### 4.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayDanhSachAsync / LayChiTietAsync(filterOrId, actor) | Trang/chi tiết bản bất biến | Admin; sort thời điểm áp dụng + phiên bản. |
| LayDangHieuLucAsync(mocThoiGian) | Một bản hợp lệ hoặc lỗi cấu hình | thoi_diem_ap_dung <= mốc, sort thời điểm giảm rồi phien_ban giảm; dùng ở tạo đơn. |
| KiemTraNoiDungAsync(dto, actor) | Các lỗi theo đường dẫn và preview | Không lưu bản nháp, không tăng phien_ban. |
| TaoPhienBanAsync(dto, actor) | Phiên bản mới | Khóa phạm vi cấp version/unique, insert + audit, cập nhật cache có lịch hiệu lực. |
| LayChinhSachCuaDonAsync(donId, actor) | Bản mà đơn đang tham chiếu | Đọc DON_THUE.ma_chinh_sach; không gọi selector hiện hành cho đơn cũ. |


### 4.D. Trình tự triển khai và tích hợp

1. Thanh Tùng lập bảng mapping tất cả key JSON mà giữ chỗ, báo giá, hủy, trễ, phê duyệt phí và nhắc lịch đang đọc. Dùng một reader/validator chung, hỗ trợ bản cũ đã lưu trước khi đổi format.
2. Validation theo field và giữa field: giữ chỗ >0; mốc nhận/trả đúng đơn vị; tỷ lệ/hệ số không âm; ba khoảng hủy bao phủ và không chồng; ngưỡng duyệt có loại tiền rõ.
3. Quy ước hệ số 150% có thể lưu 1,5 nếu schema cũ dùng hệ số, hoặc 150 nếu dùng phần trăm; chọn theo repo và map minh bạch. Không để mỗi service tự diễn giải.
4. Quy tắc chọn theo mốc hiệu lực trong plan này là quyết định triển khai cần chốt Day 1. Nếu selector Week 2 đang chỉ lấy phiên bản lớn nhất đủ điều kiện, thay đúng một helper dùng chung và kiểm tra lịch đã cấu hình, không viết hai thuật toán ở hai controller.
5. Lưu bản mới bất biến; cấp version dưới khóa bảo vệ, unique database bắt race cuối. Tạo đồng thời có retry giới hạn khi rollback rõ, không trả trùng phiên bản.
6. Chỉ cho thời điểm mới hiện tại/tương lai theo policy đã chốt; bootstrap có kiểm soát riêng. Cùng mốc dùng version lớn hơn để thay lịch tương lai bằng bản mới, mọi bản cũ vẫn còn truy vết.
7. Đơn mới xác định chính sách và snapshot trong transaction tạo đơn; báo giá cũ khác dữ liệu thực thì trả yêu cầu xem lại giá/điều khoản. Không thay ma_chinh_sach hay hạn giữ chỗ của đơn đã tạo.
8. Cache chọn bản hiện hành phải hết hạn ở mốc hiệu lực kế tiếp và kiểm tra bằng giờ server khi ghi nghiệp vụ. Đơn cũ đọc theo ID có thể cache bản bất biến.
9. Public DTO chỉ phần điều kiện thuê khách cần biết; ngưỡng duyệt nội bộ/metadata admin không mặc định công khai. Thiếu bản hiệu lực phải chặn tạo đơn rõ ràng, không chọn bản tương lai.

### 4.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| NOI_DUNG_CHINH_SACH_KHONG_HOP_LE | 400 | Lỗi đường dẫn key/kiểu/đơn vị hoặc khoảng mâu thuẫn. |
| THOI_DIEM_AP_DUNG_HOI_TO | 400 | Tạo chính sách lùi về quá khứ ngoài bootstrap được kiểm soát. |
| CHUA_CO_CHINH_SACH_HIEU_LUC | 409 | Không có bản đủ điều kiện tạo đơn. |
| BAO_GIA_DIEU_KHOAN_DA_DOI | 409 | Khách cần xác nhận lại trước tạo đơn. |
| PHIEN_BAN_XUNG_DOT | 409 | Retry cấp version không thành sau số lần giới hạn, không ghi bản trùng. |


### 4.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T1-A01 | V1 hiện hành; V2 hiệu lực đúng 10:00; tạo đơn 09:59 và 10:00 | Đơn đầu V1, đơn sau V2, theo cùng giờ server. |
| W6-T1-A02 | Đơn A gắn V1, V2 đổi phí trễ/hủy | A vẫn tính V1; quyền nhân viên vẫn theo quyền hiện tại. |
| W6-T1-A03 | Hai bản cùng mốc áp dụng, version 2 và 3 | Chọn bản 3; bản 2 còn nguyên để truy vết. |
| W6-T1-A04 | Có version lớn nhưng mốc hiệu lực chưa tới | Không áp sớm; cache đổi đúng mốc sau đó. |
| W6-T1-A05 | Hai admin tạo cùng lúc | Hai version phân biệt hoặc một lỗi có kiểm soát; không duplicate. |
| W6-T1-A06 | JSON ghi tỷ lệ 150 khi schema đòi hệ số 1,5 hoặc thiếu nhánh hủy | Validator báo đúng field, không lưu. |
| W6-T1-A07 | Chỉ có chính sách tương lai | Tạo đơn bị chặn lỗi cấu hình, không dùng giá trị mặc định im lặng. |
| W6-T1-A08 | Đọc chính sách công khai | Không lộ các field quản trị nội bộ không cần cho khách. |


**Đóng W6-T1:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 5. W6-T2 — Quản trị khuyến mãi (Kiện Minh)

### 5.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC24. **Service/Controller:** `IQuanTriKhuyenMaiService` + `QuanTriKhuyenMaiService`; `Admin/KhuyenMaiController`. Dùng Entity/bảng nối đã có từ Tuần 2.

**Method chính:** `TimKiemAsync`, `LayChiTietAsync`, `TaoAsync`, `CapNhatAsync`, `TamAnAsync`, `HienThiAsync`, `LayTinhHinhSuDungAsync`.

- [ ] Tạo mã giảm theo phần trăm hoặc số tiền; tên, giá trị giảm, mức giảm tối đa, tiền thuê tối thiểu, phạm vi, thời hạn và hạn mức.
- [ ] Chuẩn hóa mã khách nhập nhất quán với service Tuần 2; mã không trùng, kể cả request đồng thời. Không thay mã hiển thị đã có lịch sử bằng một mã khác để tái dùng.
- [ ] Phần trăm trong khoảng hợp lệ, số tiền giảm dương, ngưỡng/cap hợp lệ, ngày bắt đầu không sau ngày kết thúc; reject cấu hình không có ý nghĩa.
- [ ] Quy ước không giới hạn phải thống nhất với Entity/dữ liệu Tuần 2 và ghi rõ trong contract; không để một nơi hiểu 0 là vô hạn, nơi khác hiểu 0 lượt được dùng.
- [ ] `TatCa` không cần bảng nối; `TheoSanPham` phải có danh sách sản phẩm hợp lệ; `TheoDanhMuc` phải có danh sách danh mục hợp lệ. Cập nhật phạm vi và bảng nối trong một transaction.
- [ ] Quy tắc phạm vi đề xuất cho tuần này: danh mục được chọn áp dụng trực tiếp cho sản phẩm thuộc các danh mục đó; nếu muốn gồm danh mục con thì lưu rõ các danh mục con được chọn vào bảng nối. Không để admin và service áp mã hiểu khác nhau về cây danh mục.
- [ ] Sản phẩm khớp nhiều điều kiện vẫn chỉ được giảm một lần. Không thêm loại “kết hợp nhiều mã trên cùng đơn” ngoài phạm vi đặc tả.
- [ ] Mã chưa có lịch sử/giữ lượt có thể sửa cấu hình hợp lệ. Khi đã có lượt đang giữ còn hạn hoặc đã dùng, khóa các điều khoản ảnh hưởng giá/phạm vi đã cam kết; cần chương trình khác thì tạo mã mới.
- [ ] Cho phép tạm ẩn để ngừng nhận lượt mới. Tăng hạn mức/điều chỉnh lịch phải được kiểm tra và ghi nhật ký; không giảm hạn mức thấp hơn tổng đã dùng + đang giữ còn hạn.
- [ ] Không xóa cứng mã đã có lịch sử. Số lượt sử dụng lấy từ `LUOT_SU_DUNG_KHUYEN_MAI`, không thêm bộ đếm tự do dễ lệch vào Entity.
- [ ] Trang quản trị hiển thị đã dùng, đang giữ hợp lệ, hết hạn/giải phóng và tổng tiền giảm; xem chi tiết theo quyền, không công khai danh sách khách đã dùng mã.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET, POST | `/api/admin/khuyen-mai` | Tra cứu/tạo; quản trị viên |
| GET, PUT | `/api/admin/khuyen-mai/{id}` | Xem/sửa theo điều kiện; quản trị viên |
| POST | `/api/admin/khuyen-mai/{id}/tam-an`, `/api/admin/khuyen-mai/{id}/hien-thi` | Quản trị viên |
| GET | `/api/admin/khuyen-mai/{id}/su-dung` | Quản trị viên |

**Nghiệm thu:** Phạm vi bảng nối và hạn mức đúng; sửa mã có cam kết không làm thay đổi giá đơn đã tạo; nhân viên/khách không có quyền quản trị mã.

### 5.A. Thành phần phải bàn giao — Kiện Minh

- [ ] `Services/Interfaces/IQuanTriKhuyenMaiService.cs`
- [ ] `Services/QuanTriKhuyenMaiService.cs`
- [ ] `Controllers/Admin/KhuyenMaiController.cs`
- [ ] `Models/DTOs/QuanTriKhuyenMai/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 5.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TaoKhuyenMaiRequest | maGiamGia, ten, loaiGiam, giaTri, mucGiamToiDa?, tienThueToiThieu, phamVi, sanPhamIds[]/danhMucIds[], batDau, ketThuc, gioiHanTongLuot?, gioiHanMoiKhach? | Mã chuẩn hóa, percent 0<giá trị<=100 hoặc tiền dương; biên thời gian/phạm vi/hạn mức hợp lệ. |
| CapNhatKhuyenMaiRequest | các điều khoản còn được phép sửa + lý do | Khóa điều khoản ảnh hưởng cam kết khi có lượt giữ hợp lệ/đã dùng; không đổi mã để tái sử dụng lịch sử. |
| DoiHienThiKhuyenMaiRequest | lý do | Admin; ẩn chặn lượt mới theo chính sách Day 1, không xóa lượt đã cam kết. |
| KhuyenMaiResponse | cấu hình, phạm vi thực, trạng thái, đã dùng, đang giữ còn hạn, đã release/hết hạn, điều khoản được sửa | Số lượt lấy LUOT_SU_DUNG_KHUYEN_MAI; không tự thêm cột bộ đếm. |
| SuDungKhuyenMaiResponse | tổng theo trạng thái, giảm đã dùng, đơn liên quan có phân trang | Admin; lịch sử dùng trên đơn hủy tách hiệu quả đơn hoàn tất. |


### 5.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TimKiemAsync / LayChiTietAsync(filterOrId, actor) | Trang/chi tiết cấu hình | Admin, projection bảng nối không nhân số lượt. |
| TaoAsync(dto, actor) | Mã và phạm vi mới | KHUYEN_MAI + bảng nối + audit cùng tx; bắt unique mã chuẩn hóa. |
| CapNhatAsync(id, dto, actor) | Cấu hình sau sửa hợp lệ | Khóa mã cùng cơ chế GiuLuot; kiểm count hiện tại và trường đã cam kết. |
| TamAnAsync / HienThiAsync(id, dto, actor) | Trạng thái mới | Admin; không update snapshot đơn cũ. |
| LayTinhHinhSuDungAsync(id, filter, actor) | Tổng và chi tiết lượt | Đã dùng + đang giữ chưa hết hạn theo now; báo cáo khoảng ngày không làm sai hạn mức hiện tại. |


### 5.D. Trình tự triển khai và tích hợp

1. Kiện Minh chuẩn hóa trim/case mã tương thích Week 2 và collation database. Giữ một normalization helper cho tạo/sửa/tìm/áp mã.
2. Chốt biểu diễn không giới hạn từ dữ liệu hiện hữu: null hay giá trị đặc biệt phải được tài liệu hóa; 0 không được có hai nghĩa ở hai service.
3. Validate loại giảm, cap, ngưỡng, khoảng thời gian và phạm vi. TatCa không có bảng nối rác; TheoSanPham/TheoDanhMuc có ít nhất một ID hợp lệ và không trùng.
4. Phạm vi danh mục áp trực tiếp các danh mục được lưu; muốn bao gồm con thì mở rộng danh sách rõ trước khi lưu theo lựa chọn Day 1. Không phụ thuộc việc frontend tự suy cây còn backend hiểu khác.
5. Khóa mã khi sửa điều kiện/hạn mức để không chạy xuyên request giữ lượt cuối. Có cam kết rồi thì giữ điều khoản giá/phạm vi; tạo mã mới cho chương trình khác.
6. Giảm hạn mức không dưới đã dùng + giữ còn hạn; các lượt đã hết hạn không chiếm dù job chưa release. Tăng hạn mức/đổi lịch được kiểm và audit theo quy tắc cam kết.
7. Ẩn mã ngừng nhận áp mới; quy tắc xử lý lượt đã giữ cần trùng W6-T3. Không sửa giá trên DON_THUE hoặc xóa lịch sử dùng mã vì tạm ẩn.
8. Trang tình hình sử dụng tổng hợp theo lượt trước rồi nối đơn/khách; không nhân lượt theo số sản phẩm trong phạm vi. Khách/staff không truy endpoint quản trị.

### 5.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| MA_GIAM_GIA_TRUNG | 409 | Sau chuẩn hóa đã có mã, kể cả tạo đồng thời. |
| PHAM_VI_MA_KHONG_HOP_LE | 400 | Thiếu ID/phạm vi không khớp bảng nối hoặc đối tượng không tồn tại. |
| DIEU_KHOAN_MA_DA_CAM_KET | 409 | Không sửa điều khoản của lượt giữ/đã dùng; trả field bị khóa. |
| HAN_MUC_THAP_HON_DANG_CHIEM | 409 | Hạn mức mới nhỏ hơn đã dùng + giữ hợp lệ. |
| CAU_HINH_GIAM_KHONG_HOP_LE | 400 | Phần trăm/tiền/cap/thời gian không hợp lệ. |


### 5.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T2-A01 | Tạo hai mã cùng chuỗi khác hoa thường theo normalization đã chốt | Chỉ một mã được lưu. |
| W6-T2-A02 | Đổi TheoSanPham sang TheoDanhMuc khi chưa có lịch sử | Bảng nối cũ được thay nguyên tử, không áp đồng thời cả hai loại ngoài ý định. |
| W6-T2-A03 | Mã đã dùng 3, giữ còn hạn 2; giảm tổng hạn mức xuống 4 | Bị 409; xuống 5 hợp lệ nếu điều kiện khác đạt. |
| W6-T2-A04 | Có 2 lượt giữ đã hết hạn nhưng job chưa chạy | Không tính hai lượt đó vào hạn mức đang chiếm. |
| W6-T2-A05 | Mã đã có đơn giữ, admin đổi mức giảm | Bị chặn trường đã cam kết, snapshot đơn không đổi. |
| W6-T2-A06 | Tạm ẩn rồi khách mới nhập mã | Khách mới bị từ chối; lượt cũ xử lý theo policy đã chốt ở W6-T3. |
| W6-T2-A07 | Một mã có 4 sản phẩm trong bảng nối và 2 lượt sử dụng | Trang admin count 2, không thành 8. |


**Đóng W6-T2:** Kiện Minh bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 6. W6-T3 — Hoàn thiện áp mã và kiểm soát lượt (Kiện Minh)

### 6.0. Phạm vi, quy tắc nghiệp vụ và API

**Service:** Mở rộng `IKhuyenMaiService` + `KhuyenMaiService` Tuần 2; giữ các method `KiemTraApDungAsync`, `GiuLuotAsync`, `XacNhanDaSuDungAsync`, `GiaiPhongLuotAsync`. Phối hợp service giỏ/báo giá/đơn/thanh toán hiện có, không tạo thêm một bộ tính giảm giá ở controller quản trị.

#### Tính và phân bổ giảm giá

- [ ] Mỗi đơn tối đa một mã. Áp mã trong giỏ chỉ kiểm tra/báo giá, không giữ lượt hoặc giữ thiết bị.
- [ ] Với lượt áp mới, kiểm tra trạng thái, thời hạn, phạm vi, mức tối thiểu và hạn mức. Giữ quy ước biên thời gian của Tuần 2: `BatDau <= now <= KetThuc`.
- [ ] Ngưỡng tối thiểu kiểm tra trên tổng tiền thuê trước giảm của đơn như Plan Week 2; phần tính giảm chỉ gồm tiền thuê các dòng đủ phạm vi.
- [ ] Gọi `E` là tiền thuê đủ điều kiện. Giảm phần trăm tính trên `E`; giảm số tiền cố định cũng không vượt `E`. Áp mức giảm tối đa nếu được cấu hình và không giảm cọc.
- [ ] Phân bổ tổng giảm xuống các dòng đủ điều kiện theo tiền thuê từng dòng. Làm tròn đồng VND bằng một helper chung; phần dư phân bổ theo thứ tự ổn định, không để tổng dòng khác tổng đơn hoặc dòng âm tiền thuê.
- [ ] Dòng không thuộc phạm vi có `tien_giam = 0`. Lưu giảm giá/snapshot tại thời điểm tạo đơn, không tính lại đơn cũ bằng giá sản phẩm hôm nay.
- [ ] Đổi thời gian, số lượng hoặc mã trong giỏ phải tính lại báo giá. Tạo đơn kiểm tra lại trong transaction và yêu cầu khách chấp nhận khi báo giá đổi.

#### Giữ lượt, thanh toán và hủy

- [ ] Khi tạo đơn, khóa dữ liệu hạn mức cần thiết rồi kiểm tra và tạo lượt trong cùng transaction với đơn/giữ chỗ. Hai khách tranh lượt cuối chỉ một lượt hợp lệ được giữ.
- [ ] Số chiếm hạn mức = lượt đã dùng + lượt đang giữ chưa hết hạn; loại giữ lượt hết hạn ngay trong query dù job chưa cập nhật trạng thái.
- [ ] Giới hạn mỗi khách xác định qua đơn → khách, không nhận mã khách tùy ý từ client. Cùng khách mở nhiều tab vẫn chịu chung hạn mức.
- [ ] Thời điểm hết hạn của giữ mã phải khớp hạn thanh toán/giữ chỗ của đơn; không để mã hết giữ trước hoặc sau do dùng nhiều phép lấy giờ khác nhau.
- [ ] Thanh toán thành công cập nhật chính lượt `DangGiu → DaSuDung`; không INSERT lượt mới. Kiểm tra hạn mức phải nhận biết lượt của chính đơn đã được giữ, không đếm nó rồi từ chối vì “đã đủ lượt”.
- [ ] Callback lặp trả kết quả cũ; không tăng lượt, giảm giá hoặc ghi nhận tiền lần hai. Hủy/hết hạn trước thanh toán giải phóng lượt đúng một lần.
- [ ] Hủy sau thanh toán không tự phục hồi lượt đã dùng; báo cáo giữ nguyên lịch sử dùng và tiền giảm của đơn hủy, phân biệt với hiệu quả trên đơn hoàn tất.
- [ ] Tiền đến sau khi đơn đã hết hạn/hủy tiếp tục xử lý ngoại lệ Tuần 4; không phục hồi lượt mã và đơn để hợp thức hóa khoản tiền.

**Chi tiết cần thống nhất trong Day 1 về mã đang có lượt giữ:** Kế hoạch này đề xuất bảo vệ cam kết đã tạo: tạm ẩn/kết thúc nhận mã chặn **lượt áp mới**; một đơn đã giữ mã hợp lệ vẫn được xác nhận trong hạn thanh toán theo snapshot. Bước xác nhận tiếp tục kiểm tra đúng đơn, lượt đang giữ, hạn, số tiền và quyền, không bỏ validation. Nếu nhóm chọn chính sách thu hồi cả lượt đang giữ thì phải thiết kế rõ nhánh thông báo/hủy/hoàn tiền; không âm thầm tăng số phải trả hoặc đổi snapshot sau khi khách đã thanh toán. Đây là chi tiết vận hành cần chốt thống nhất vì đặc tả chưa nói rõ trường hợp tạm ẩn giữa lúc đang giữ.

#### API và kiểm tra tích hợp

- [ ] Giữ endpoint áp mã `/api/gio-thue/ma-giam-gia` đã có; nếu cần bỏ mã thì bổ sung action rõ ràng trong controller giỏ, gọi cùng service báo giá.
- [ ] Quyền sở hữu giỏ/đơn kiểm tra trong service; admin không nhập vai khách để vượt hạn mức qua endpoint công khai.
- [ ] Response báo giá cho biết tiền thuê trước giảm, phần đủ điều kiện, mức giảm, cọc và tổng ban đầu; lỗi mã trả lý do cụ thể, không chỉ “mã không hợp lệ”.
- [ ] Các service ngoại vi nhận interface/DTO từ Kiện Minh; chủ file cũ nối theo contract, tránh cùng sửa nhiều nhánh tính tiền trong một lúc.

**Nghiệm thu:** Chỉ giảm phần hàng hợp lệ, cọc không đổi, tổng giảm phân bổ khớp, giữ lượt cuối không vượt giới hạn; callback/hủy lặp không đổi số lượt sai.

### 6.A. Thành phần phải bàn giao — Kiện Minh

- [ ] `Services/KhuyenMaiService.cs (mở rộng Week 2)`
- [ ] `Services/Interfaces/IKhuyenMaiService.cs (giữ/mở rộng)`
- [ ] `Models/DTOs/KhuyenMai/`
- [ ] `Services/GioThueService.cs (nối báo giá)`
- [ ] `Services/DonThueService.cs (nối giữ lượt)`
- [ ] `Services/ThanhToanService.cs (nối xác nhận)`
- [ ] `Controllers/GioThueController.cs (action mã hiện có)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 6.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| ApMaRequest | maGiamGia | Giỏ/khách từ JWT; không nhận mức giảm/ID khách từ client. |
| KiemTraMaResult | mã chuẩn hóa, hợp lệ/lý do, tiền thuê xét ngưỡng, tiền đủ phạm vi, tổng giảm, phân bổ dòng, cọc, tổng ban đầu | Báo giá chưa giữ lượt hoặc thiết bị. |
| GiuLuotCommand (nội bộ) | maDon, maKhuyenMai, customer server, expiry thống nhất, snapshot giảm | Chỉ tạo trong transaction tạo đơn đã kiểm giá/kho; unique lượt theo đơn. |
| KetQuaLuotResponse | ID lượt, trạng thái, hết hạn, số tiền giảm snapshot | Cùng một hàng chuyển giữ→dùng/release; không chèn bản mới khi callback. |


### 6.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| KiemTraApDungAsync(gio, ma, actor) | KiemTraMaResult | Chỉ đọc cấu hình/giá/hạn mức; áp mã trong giỏ chưa chiếm lượt. |
| PhanBoGiamGia(lines, totalDiscount) (helper) | Giảm từng dòng tổng đúng | Decimal/VND, tiền đủ phạm vi, dư theo thứ tự ổn định; không giảm cọc. |
| GiuLuotAsync(command) | Lượt giữ đang tracked | Khóa mã/khách liên quan cùng transaction đơn+GIU_CHO; không commit riêng. |
| XacNhanDaSuDungAsync(donId, verifiedPayment) | Lượt chuyển đã dùng hoặc kết quả cũ | Xác nhận đúng lượt/expiry/snapshot, không trừ hạn mức lần hai. |
| GiaiPhongLuotAsync(donId, reason) | Lượt giữ release hoặc no-op | Chỉ lượt chưa dùng; hủy sau trả tiền giữ lịch sử đã dùng. |


### 6.D. Trình tự triển khai và tích hợp

1. Giữ quy ước Week 2 BatDau <= now <= KetThuc cho lượt áp mới; expiry giữ là now < han mới hợp lệ, đúng hạn thì hết. Hai kiểu biên khác nhau cần test riêng.
2. Kiểm ngưỡng tối thiểu trên tổng thuê trước giảm của cả đơn; chỉ tính giảm trên các dòng đủ phạm vi. Giảm số tiền/percent bị chặn bởi E và cap hợp lệ; cọc giữ nguyên.
3. Phân bổ theo tỷ trọng tiền thuê đủ điều kiện, làm tròn đồng và dồn phần dư theo thứ tự ID dòng ổn định đã thống nhất; không cho giảm dòng vượt tiền thuê dòng đó. Tổng phân bổ = tổng giảm đơn.
4. Tạo đơn recheck báo giá, khả dụng và hạn mức dưới transaction chung. Khóa maKhuyenMai bảo vệ cả giới hạn tổng lẫn mỗi khách, không nhận mã khách do client tự khai.
5. Lấy một now/expiry dùng cho DON_THUE, GIU_CHO và LUOT_SU_DUNG_KHUYEN_MAI; nếu một bước thất bại rollback cả ba, không có lượt bị giữ bởi đơn tạo lỗi.
6. Hai khách tranh lượt cuối: bên thua nhận lỗi và báo giá cần xem lại; không tự bỏ mã rồi tạo đơn giá cao hơn khách đã chấp nhận.
7. Xác nhận tiền trong hạn nhận biết lượt của chính đơn đã giữ, tránh đếm mình vào đầy hạn mức rồi từ chối. Callback lặp chỉ trả kết quả cũ; không tạo lượt thứ hai.
8. Chốt đề xuất Day 1 bảo vệ lượt giữ hợp lệ khi mã tạm ẩn/hết thời gian nhận mới. Nếu chọn thu hồi thì phải có thiết kế hủy/thông báo/hoàn được thống nhất; không tự thay giá sau thu.
9. Hủy/hết hạn trước thanh toán release lượt chưa dùng; hủy sau success giữ đã dùng. Tiền đến sau hết hạn/hủy đi ngoại lệ Week 4, không hồi sinh lượt mã.
10. Giỏ đổi sản phẩm/ngày/số lượng phải tính lại; bỏ mã gọi lại báo giá chung. Các action giữ/xác nhận/release là helper nội bộ, không endpoint public cho khách tăng/giảm lượt tùy ý.

### 6.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| MA_CHUA_BAT_DAU_HOAC_HET_HAN | 409 | Lượt áp mới ngoài khoảng hợp lệ. |
| MA_HET_LUOT | 409 | Đã dùng + giữ hợp lệ chạm giới hạn tổng. |
| KHACH_HET_LUOT_MA | 409 | Cùng khách vượt giới hạn dù dùng nhiều tab. |
| CHUA_DAT_TIEN_THUE_TOI_THIEU | 409 | Trả tiền tối thiểu/tiền thuê hiện tại cần thiết. |
| KHONG_CO_DONG_DU_PHAM_VI | 409 | Không có tiền thuê đủ điều kiện giảm. |
| LUOT_GIU_DA_HET_HAN | 409 | Không xác nhận lượt/đơn cũ bằng tiền tới muộn. |


### 6.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T3-A01 | Thuê A=300.000 đủ phạm vi, B=200.000 ngoài phạm vi, cọc=1.000.000; giảm 20%, cap 50.000, min 400.000 | Giảm A 50.000, B 0; tổng ban đầu 1.450.000. |
| W6-T3-A02 | Giảm cố định 400.000 chỉ A=300.000 | Tổng giảm tối đa 300.000; không giảm B hoặc cọc. |
| W6-T3-A03 | Giảm 10.000 cho 3 dòng tiền bằng nhau | Phân bổ tổng đúng 10.000 theo thứ tự ổn định, ví dụ 3.333+3.333+3.334. |
| W6-T3-A04 | Hai khách đồng thời tranh tổng hạn mức 1 | Tối đa một lượt được giữ; request thua không tạo đơn tăng giá im lặng. |
| W6-T3-A05 | Cùng khách mở 2 tab, hạn mức mỗi khách 1 | Tối đa một lượt chiếm, không dựa khác session để vượt. |
| W6-T3-A06 | Đúng giờ KetThuc khi áp mới và đúng giờ hết hold khi xác nhận | Áp mới còn hợp lệ theo <=; hold đã hết theo now>=expiry. |
| W6-T3-A07 | Callback success lặp 3 lần rồi hủy đơn | Một lượt DaSuDung, không nhân và không hoàn lại lượt do hủy sau thu. |
| W6-T3-A08 | Job release không chạy sau expiry | Lượt hết hạn không chặn khách mới, callback muộn không hồi sinh đơn. |
| W6-T3-A09 | Admin ẩn mã sau khi đơn giữ thành công | Hành vi khớp quyết định Day 1, snapshot và số tiền khách đã chấp nhận không bị sửa ngầm. |


**Đóng W6-T3:** Kiện Minh bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 7. W6-T4 — Báo cáo vận hành và chỉ số thuê (Tuấn Kiệt)

### 7.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC25. **Service/Controller:** `IBaoCaoVanHanhService` + `BaoCaoVanHanhService`; `BaoCaoVanHanhController`.

**Method chính:** `LayCongViecAsync`, `LayTongQuanThueAsync`, `LaySanPhamThueNhieuAsync`, `LayTyLeHuyAsync`, `LayKhachQuayLaiAsync`, `LayCongViecCaNhanAsync`.

**DTO:** Bộ lọc ngày, trạng thái, sản phẩm, phạm vi công việc, phân trang; response mỗi chỉ số có định nghĩa, kỳ đo và danh sách chứng từ để kiểm tra.

#### Công việc đang cần xử lý

| Nhóm công việc | Điều kiện/nguồn chính |
|---|---|
| Cần chuẩn bị/giao | Đơn đã xác nhận/đang chuẩn bị/sẵn sàng nhận theo lịch nhận; chưa có bàn giao đã chốt |
| Cần trả | Đơn đang thuê và còn thiết bị chưa có kết luận trả/mất hợp lệ; theo giờ trả dự kiến |
| Quá hạn | Dùng `QuaHanService` Tuần 4, tính theo đồ còn nợ; không tự thêm trạng thái đơn mới |
| Chờ đối soát | Đơn/bảng đối soát chưa giải quyết xong, có lý do: phí, tranh chấp, thiếu thu, hoàn chưa xong hoặc kết quả chưa rõ |
| Công việc cá nhân | Phiếu/hoạt động thực sự có FK người lập, bàn giao, nhận trả hoặc xử lý; không suy ra nhân viên phụ trách đơn từ một FK không tồn tại |

- [ ] Danh sách dùng chung bộ lọc với tổng số ở đầu trang; mở chi tiết được đúng đơn/phiếu liên quan.
- [ ] Nhân viên xem hàng đợi công việc vận hành của cửa hàng và hoạt động cá nhân theo quyền. Chỉ quản trị viên được lọc hiệu suất cá nhân khác hoặc xem toàn bộ chỉ số nhạy cảm.
- [ ] Đơn trả một phần có thể đồng thời là đang thuê và quá hạn; nhóm công việc có thể giao nhau. Không cộng các thẻ này rồi gọi là tổng số đơn duy nhất.
- [ ] Không tự chuyển trạng thái, đánh đã trả hoặc tự tạo phụ phí khi người dùng mở báo cáo.

#### Thống kê có định nghĩa rõ

| Chỉ số | Định nghĩa triển khai |
|---|---|
| Đơn đặt trong kỳ | Đếm đơn theo `ngay_dat`, mỗi đơn một lần |
| Đơn đã bàn giao trong kỳ | Phiếu bàn giao đã chốt theo giờ giao thực tế, đếm đơn riêng biệt |
| Đơn hoàn tất trong kỳ | Trạng thái hoàn tất với `thoi_diem_hoan_tat` trong kỳ |
| Sản phẩm thuê nhiều | Số thiết bị thực giao từ chi tiết bàn giao đã chốt trong kỳ, nhóm theo sản phẩm của dòng đơn lúc thuê; trả thêm số đơn riêng biệt |
| Tỷ lệ hủy của nhóm đơn đặt trong kỳ | Số đơn trong nhóm đó đã khách/cửa hàng hủy tại thời điểm truy vấn ÷ tổng đơn đặt trong nhóm; mẫu số 0 thì không có tỷ lệ |
| Đơn hủy phát sinh trong kỳ | Đếm theo `thoi_diem_huy`; đây là chỉ số khác với nhóm đơn đặt trong kỳ ở dòng trên |
| Khách quay lại | Trong khách có đơn hoàn tất trong kỳ, đếm khách đã có ít nhất một đơn hoàn tất trước đơn đầu tiên hoàn tất trong kỳ; mỗi khách tính một lần |

- [ ] Không đếm giữ chỗ hết hạn thành hủy của khách; hiển thị hết hạn riêng nếu cần phân tích.
- [ ] Không lấy sản phẩm hiện tại của thiết bị sau giáng cấp để viết lại thống kê sản phẩm khách đã thuê trước đó.
- [ ] Nếu cần “phổ biến” theo số đơn thay vì số vật phẩm, trả hai cột riêng; không dùng một con số đổi ý nghĩa giữa biểu đồ và bảng.
- [ ] Chỉ số khách quay lại không trả email/SĐT trong endpoint tổng hợp. Danh sách chi tiết khách, nếu có, dành cho quản trị viên theo quyền đã có.
- [ ] Báo cáo nhóm đơn đặt dùng trạng thái tại thời điểm truy vấn và phải ghi rõ điều đó; không tuyên bố là ảnh chụp bất biến của thời điểm cuối kỳ khi chưa dựng lịch sử tương ứng.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/bao-cao/van-hanh/cong-viec` | Nhân viên, quản trị viên |
| GET | `/api/bao-cao/van-hanh/ca-nhan` | Nhân viên chỉ của mình; quản trị viên theo phạm vi |
| GET | `/api/bao-cao/van-hanh/tong-quan` | Quản trị viên; DTO nhân viên tách nếu cần |
| GET | `/api/bao-cao/van-hanh/san-pham-thue-nhieu` | Quản trị viên |
| GET | `/api/bao-cao/van-hanh/ty-le-huy`, `/api/bao-cao/van-hanh/khach-quay-lai` | Quản trị viên |

**Nghiệm thu:** Đơn trả một phần còn đúng số đồ phải thu hồi; đơn hủy/hết hạn phân biệt rõ; số sản phẩm đã giao không bị nhân bởi lượt nhận trả và không thay đổi do giáng cấp sau này.

### 7.A. Thành phần phải bàn giao — Tuấn Kiệt

- [ ] `Services/Interfaces/IBaoCaoVanHanhService.cs`
- [ ] `Services/BaoCaoVanHanhService.cs`
- [ ] `Controllers/BaoCaoVanHanhController.cs`
- [ ] `Models/DTOs/BaoCao/VanHanh/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 7.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LocBaoCaoVanHanhRequest | tuNgay, denNgay, maSanPham?, nhomCongViec?, maNhanVien?, trang, soMoiTrang | Ngày Việt Nam inclusive ở UI chuyển UTC half-open; nhân viên chỉ lọc cá nhân mình theo quyền. |
| BaoCaoMeta | boLocDaApDung, muiGio, thoiDiemLayDuLieu, cachTinh, loaiMocThoiGian | Nêu đang dùng ngày đặt/giao/hoàn tất/hủy, không một filter mơ hồ cho mọi chỉ số. |
| CongViecResponse | nhóm, đơn/phiếu, giờ hẹn, đồ còn nợ, lý do chờ, việc cần xử lý | Các nhóm có thể giao nhau, tổng distinct nếu cần là query riêng. |
| TyLeResponse | tuSo, mauSo, tyLe? | Mẫu số 0 → null/chưa có dữ liệu, không chia 0 hoặc giả 0%. |
| SanPhamThueNhieuResponse | sản phẩm snapshot lúc thuê, số vật phẩm thực giao, số đơn distinct | Một lần giao không bị nhân bởi các lần nhận trả/phụ phí. |


### 7.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayCongViecAsync(filter, actor) | Trang công việc và count cùng filter | Dùng projection đơn/nhận trả/đối soát, không ghi trạng thái. |
| LayTongQuanThueAsync(filter, actor) | Đơn đặt/giao/hoàn tất theo từng mốc | Admin; aggregate riêng theo đúng grain rồi ghép response. |
| LaySanPhamThueNhieuAsync(filter, actor) | Số chiếc và số đơn theo sản phẩm lúc đặt | Bàn giao đã chốt theo giờ giao thực tế; không current product. |
| LayTyLeHuyAsync(filter, actor) | Cohort đơn đặt trong kỳ và hủy trong cohort | Trạng thái tại thời điểm query; đơn hết hold tách riêng. |
| LayKhachQuayLaiAsync(filter, actor) | Số khách có lịch hoàn tất trước lần đầu trong kỳ | Distinct khách; không trả PII trên endpoint tổng hợp. |
| LayCongViecCaNhanAsync(filter, actor) | Phiếu/hoạt động thực sự gắn nhân sự | FK người lập/giao/nhận/xử lý có thật; không giả DON_THUE có nhân viên phụ trách. |


### 7.D. Trình tự triển khai và tích hợp

1. Tuấn Kiệt lập bảng định nghĩa nguồn/mốc/tử mẫu của từng chỉ số trước query. Khi frontend đổi khoảng ngày, metadata phải nói rõ đang chọn kỳ phát sinh hay hàng đợi hiện tại.
2. Chuyển ngày Việt Nam một lần: từ 00:00 ngày bắt đầu đến 00:00 ngày sau kết thúc, query >=startUtc && <endUtc. Không cộng 23:59:59 làm mất phần giây.
3. Công việc cần trả đọc các chi tiết giao chưa có kết luận hợp lệ; đơn trả một phần vừa DangThue vừa quá hạn vẫn được hiển thị đúng mà không đếm như hai đơn khác nhau.
4. Thống kê bàn giao từ phiếu đã chốt, mỗi thiết bị là một chi tiết bàn giao hợp lệ. Aggregate trước khi nối nhiều đợt nhận/phí để tránh fan-out.
5. Tỷ lệ hủy theo nhóm đơn đặt trong kỳ khác số hủy phát sinh trong kỳ. Trả tên/chú giải phân biệt; giữ chỗ hết hạn không được gộp là khách hủy.
6. Khách quay lại: tìm lần hoàn tất đầu trong kỳ của mỗi khách, kiểm có đơn hoàn tất trước lần đó; count mỗi khách một lần, mẫu số là khách có hoàn tất trong kỳ.
7. Phân quyền ca nhân bằng mã nhân viên suy từ actor; admin được scope khác, staff gửi maNhanVien người khác bị chặn/ép scope theo contract thống nhất.
8. Tổng/cards và danh sách phải cùng dữ liệu đọc nhất quán khi cần. Không chỉ đóng cùng timestamp lên hai query có thể lệch vì phát sinh đơn giữa chúng; dùng cách đọc nhất quán hiện có hoặc một projection chung.
9. Endpoint báo cáo chỉ đọc, không gọi helper tạo phí/nhắc/chuyển trạng thái. Mở chi tiết dẫn về API chứng từ có quyền tương ứng.

### 7.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| KHOANG_BAO_CAO_KHONG_HOP_LE | 400 | Ngày đảo/vượt giới hạn query cấu hình. |
| PHAM_VI_CA_NHAN_BI_CAM | 403 | Staff xem hiệu suất người khác ngoài quyền. |
| CHI_SO_KHONG_HO_TRO | 400 | Loại mốc/group ngoài allowlist. |
| DU_LIEU_BAO_CAO_KHONG_DU | 409 | Thiếu dữ liệu nguồn để khẳng định chỉ số, kèm chứng từ cần kiểm tra nếu thích hợp. |


### 7.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T4-A01 | Một đơn giao 3 chiếc, nhận 2 đợt, có 4 khoản phí | Sản phẩm thuê nhiều vẫn 3 chiếc/1 đơn, không nhân thành 24. |
| W6-T4-A02 | Trả 2/3 chiếc và trễ chiếc cuối | Hàng đợi còn nợ 1; có thể xuất hiện đang thuê/quá hạn, tổng distinct vẫn 1 đơn. |
| W6-T4-A03 | Kỳ không có đơn đặt | Tỷ lệ hủy null, tử/mẫu 0; không lỗi chia 0. |
| W6-T4-A04 | Đơn đặt tháng trước hủy tháng này | Có ở hủy phát sinh tháng này, không ở cohort đơn đặt tháng này. |
| W6-T4-A05 | Khách có 1 đơn hoàn tất trước kỳ và 2 đơn trong kỳ | Tính 1 khách quay lại. |
| W6-T4-A06 | Thiết bị thuê như A rồi giáng cấp B | Thống kê thuê kỳ cũ vẫn A. |
| W6-T4-A07 | Staff tự đổi maNhanVien trên query | Không xem được dữ liệu cá nhân người khác. |
| W6-T4-A08 | Giao lúc 23:59:59.999 Việt Nam ngày cuối và đúng 00:00 ngày sau | Dòng đầu thuộc kỳ, dòng sau ngoài kỳ. |


**Đóng W6-T4:** Tuấn Kiệt bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 8. W6-T5 — Báo cáo tài chính và số dư cần xử lý (Kim Xuyến)

### 8.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** Phần tài chính UC25. **Service/Controller:** `IBaoCaoTaiChinhService` + `BaoCaoTaiChinhService`; `Admin/BaoCaoTaiChinhController`.

**Method chính:** `LayDoanhThuHoanTatAsync`, `LayPhiHuyAsync`, `LayDieuChinhDoanhThuAsync`, `LayThuHoanAsync`, `LayCocChuaTatToanAsync`, `LayKhoanCanXuLyAsync`, `XuatCsvAsync`.

#### Tách từng nhóm tiền

| Nhóm báo cáo | Thời điểm lấy kỳ | Quy tắc |
|---|---|---|
| Doanh thu thuê hoàn tất ban đầu | Ngày hoàn tất đơn | Tiền thuê sau giảm + phụ phí của đối soát ban đầu đã chốt; không cộng cọc |
| Phí hủy giữ lại | Thời điểm hủy | Khoản giữ lại có căn cứ từ tiền thuê thực thu theo quyết định hủy; trình bày riêng, không coi đơn hủy là lượt thuê hoàn tất |
| Điều chỉnh sau hoàn tất | Thời điểm chốt đối soát điều chỉnh | Ghi phần tăng/giảm đã được duyệt và chốt riêng; không cộng lại cả bảng gốc |
| Tiền thu từ khách | Thời điểm thu thành công | Mỗi giao dịch thu thực tế một lần; phân loại thuê/cọc/thu bổ sung hoặc chờ phân loại |
| Tiền hoàn cho khách | Thời điểm hoàn thành công | Mỗi khoản hoàn một lần, truy về mục đích thu gốc và lý do hoàn |
| Cọc chưa tất toán/khoản phải xử lý | Tại thời điểm truy vấn | Dùng lịch sử đầy đủ và trạng thái nghĩa vụ hiện tại, không chỉ giao dịch thu trong kỳ |

#### Doanh thu và điều chỉnh

- [ ] Lấy tiền thuê sau giảm từ số đã chốt trên đơn; đối chiếu tổng các dòng, không dùng giá sản phẩm hiện tại.
- [ ] Phụ phí doanh thu ban đầu lấy một nguồn chuẩn từ bảng đối soát ban đầu đã chốt/danh sách phí đã liên kết; không vừa cộng tổng đối soát vừa cộng lại từng `PHU_PHI`.
- [ ] Phí chưa duyệt, bị từ chối, đang tranh chấp hoặc chưa đủ điều kiện chốt không tự trở thành doanh thu đơn hoàn tất.
- [ ] Điều chỉnh sau chốt trả cột riêng theo thời điểm chốt điều chỉnh, có liên kết bảng gốc. Giữ số gốc theo ngày hoàn tất để có thể giải thích thay đổi qua các kỳ.
- [ ] Không dùng số tiền hoàn cọc để trừ vào doanh thu thuê; hoàn cọc là xử lý tiền bảo đảm. Điều chỉnh giảm phí mới là khoản điều chỉnh doanh thu/phí tương ứng.
- [ ] Nếu đơn ghi hoàn tất nhưng thiếu chứng từ đối soát hợp lệ, đưa vào danh sách cần kiểm tra dữ liệu; không âm thầm suy ra số bằng cách cộng mọi phí có trên đơn.

#### Thu/hoàn thực tế và số dư cọc

- [ ] Tổng thu/hoàn phản ánh tiền đã được xác nhận thực sự di chuyển. Khoản thực thu đang cần đối chiếu vẫn phải hiện trong dòng tiền với nhãn ngoại lệ, không biến mất vì chưa được dùng để xác nhận đơn.
- [ ] Với thu sai/chưa phân bổ đủ chi tiết, tổng thu lấy đúng một lần từ giao dịch thành công; tách phần chờ phân loại trong response. Không giả tạo hai chi tiết theo số dự kiến để làm tổng “đẹp”.
- [ ] Nhóm chi tiết thu dùng để phân loại tổng, không cộng thêm lên tổng giao dịch. Tổng các mục phân loại cộng phần chưa phân loại phải đối chiếu được với tổng thu.
- [ ] Hoàn lấy `HOAN_TIEN` thành công, nối chi tiết thu gốc để phân biệt hoàn thuê/cọc/thu bổ sung; phân loại theo lý do hoàn là chiều thống kê khác, không cộng hai nhóm vào nhau lần nữa.
- [ ] Các giao dịch chưa rõ kết quả không coi là tiền chắc chắn đã thu/hoàn; có danh sách riêng để xử lý bằng service thanh toán/hoàn tiền Tuần 4, báo cáo không tự quyết lại trạng thái.
- [ ] Số cọc còn cần xử lý phải xét cọc thực thu hợp lệ, hoàn cọc thành công và phần cọc đã được chốt bù phụ phí; không chỉ lấy cọc thu trừ cọc hoàn rồi coi phần bù phí đã chốt vẫn còn là cọc giữ của khách.
- [ ] Tái sử dụng projection số dư/nghĩa vụ của đối soát, bổ sung method đọc nếu cần; không dựng một công thức thứ hai khác với `DoiSoatService`.
- [ ] Trả riêng cọc của đơn chưa tất toán, khoản cần hoàn chưa xong, thu bổ sung còn thiếu, tiền thu/hoàn cần đối chiếu và điều chỉnh sau chốt đang xử lý. Các nhóm có thể liên quan cùng đơn nên không cộng tùy ý thành “tổng nợ”.
- [ ] Nếu điều chỉnh đã phát sinh tiền nhưng chưa chốt khiến phép đối chiếu tạm lệch, hiển thị phần chênh lệch đang xử lý cùng chứng từ; không dùng `max(0, ...)` để che sai lệch hoặc tự sửa giao dịch.
- [ ] Dòng tiền ở đây là **thu/hoàn với khách thuê**. Giá trị phiếu nhập là giá trị mua được ghi nhận, không phải bằng chứng cửa hàng đã trả nhà cung cấp ngày đó; không trừ nó rồi đặt tên là lợi nhuận kế toán.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat` | Quản trị viên |
| GET | `/api/admin/bao-cao/tai-chinh/phi-huy`, `/api/admin/bao-cao/tai-chinh/dieu-chinh` | Quản trị viên |
| GET | `/api/admin/bao-cao/tai-chinh/thu-hoan` | Quản trị viên |
| GET | `/api/admin/bao-cao/tai-chinh/coc-chua-tat-toan` | Quản trị viên, số dư hiện tại |
| GET | `/api/admin/bao-cao/tai-chinh/can-xu-ly` | Quản trị viên |
| GET | `/api/admin/bao-cao/tai-chinh/xuat-csv` | Quản trị viên, loại báo cáo trong danh sách cho phép |

**Nghiệm thu:** Đơn thu thuê 400.000đ + cọc 1.000.000đ, phụ phí 200.000đ và hoàn cọc 800.000đ có doanh thu thuê/phí 600.000đ; tổng thu 1.400.000đ và tổng hoàn 800.000đ được trình bày riêng, không coi 1.400.000đ là doanh thu.

### 8.A. Thành phần phải bàn giao — Kim Xuyến

- [ ] `Services/Interfaces/IBaoCaoTaiChinhService.cs`
- [ ] `Services/BaoCaoTaiChinhService.cs`
- [ ] `Controllers/Admin/BaoCaoTaiChinhController.cs`
- [ ] `Models/DTOs/BaoCao/TaiChinh/`
- [ ] `Services/DoiSoatService.cs (projection số dư dùng chung)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 8.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LocTaiChinhRequest | tuNgay, denNgay, loaiBaoCao, maDon?, trang, soMoiTrang | Admin; filter kỳ chỉ dùng chỉ số phát sinh, số dư hiện tại dùng lịch sử đầy đủ. |
| DoanhThuResponse | thuê sau giảm, phí đối soát ban đầu, điều chỉnh riêng, phí hủy riêng, chứng từ nguồn | Không cộng cọc, không tính mọi PHU_PHI chưa chốt. |
| ThuHoanResponse | thu thực tế, phân loại thuê/cọc/bổ sung/chờ phân loại, hoàn thực tế theo nguồn/lý do, net dòng tiền | Phân loại là thành phần tổng thu, không cộng hai lần; pending chưa là tiền đã di chuyển. |
| SoDuHienTaiResponse | cọc chưa tất toán, hoàn còn chờ, bổ sung thiếu, thu/hoàn cần đối chiếu, điều chỉnh đang xử lý | Có thể cùng một đơn nằm nhiều nhóm; không cộng thành tổng nợ khi chưa định nghĩa phép hợp. |
| XuatCsvRequest | loại báo cáo allowlist + cùng filter API | Cùng quyền/nguồn/tổng; giới hạn dòng, bảo vệ ô văn bản dạng công thức. |


### 8.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayDoanhThuHoanTatAsync(filter, actor) | Thuê + phí ban đầu theo giờ hoàn tất gốc | Đọc đơn HoanTat và đối soát gốc chốt, snapshot một lần. |
| LayPhiHuyAsync(filter, actor) | Phí giữ thuê có căn cứ theo giờ hủy | Không coi đơn hủy là doanh thu lượt thuê đã hoàn tất. |
| LayDieuChinhDoanhThuAsync(filter, actor) | Delta có dấu theo giờ chốt đối soát con | Không lấy lại tổng C/P gốc hoặc đổi kỳ gốc. |
| LayThuHoanAsync(filter, actor) | Dòng tiền khách theo giờ success | THANH_TOAN một lần mỗi giao dịch; HOAN_TIEN một lần mỗi khoản; chi tiết dùng phân loại. |
| LayCocChuaTatToanAsync(actor, filterScope) | Số dư hiện tại và nguồn | Tái dùng projection nghĩa vụ DoiSoatService với lịch sử đầy đủ, không cắt theo ngày thu trong kỳ. |
| LayKhoanCanXuLyAsync(filter, actor) | Danh sách pending/không rõ/chênh lệch | Chỉ đọc; điều tra/sửa qua service tiền Week 4. |
| XuatCsvAsync(type, filter, actor) | File theo cùng định nghĩa | Whitelist cột dữ liệu, số âm là numeric, không xuất secret/PII dư thừa. |


### 8.D. Trình tự triển khai và tích hợp

1. Kim Xuyến chốt nguồn chuẩn từng tiền: doanh thu ban đầu theo đơn hoàn tất+phí của đối soát gốc; phí hủy riêng; delta sau hoàn tất theo phiếu con; tiền di chuyển theo thu/hoàn đã xác minh.
2. Aggregate từng tập theo đơn/chứng từ trước join. Đối soát gốc đã có tongPhi thì không cộng tiếp từng PHU_PHI vào cùng tổng; chi tiết chỉ giải thích số tổng.
3. Doanh thu thuê dùng snapshot sau giảm, không giá master. Phí dự thảo/từ chối/tranh chấp chưa chốt không đưa vào doanh thu; đơn HoanTat thiếu đối soát hợp lệ phải xuất ngoại lệ dữ liệu.
4. Thu thực tế: tổng parent đã xác minh + phân loại con cùng nguồn; phần chưa phân loại vẫn hiện trong tổng dòng tiền với nhãn ngoại lệ. Không ghi mất khoản thu sai chỉ vì chưa thể dùng cho đơn.
5. Hoàn thực tế join nguồn bắt buộc qua chi tiết thu; phân loại theo mục đích nguồn và lý do hoàn là hai chiều xem khác nhau, không cộng hai chiều thành hai lần hoàn.
6. Số dư cọc xem cọc thực thu hợp lệ, hoàn cọc success và cọc đã chốt bù phí. Phần cọc đã bù phí không còn là tiền cọc đang giữ; thu bổ sung là nguồn khác, không cộng thành cọc mới.
7. Tái dùng tính nghĩa vụ của Week 4 cho phiếu con, pending và phần chưa rõ. Giao dịch mới đã thực hiện nhưng phiếu điều chỉnh chưa chốt phải hiện chênh lệch đang xử lý, không max(0) để che.
8. Kỳ tháng hiện tại không loại cọc thu tháng trước vẫn đang giữ. Response ghi rõ thoiDiemLayDuLieu và loại current balance, không giả là số cuối tháng cũ.
9. CSV và UI lấy cùng projection/filter/quyền, có mã nguồn để đối chiếu; giới hạn hợp lý, không làm tròn mất dấu âm điều chỉnh.
10. Giá trị nhập hàng/chi phí bảo trì từ report kho không chứng minh đã chi tiền nhà cung cấp. Không dùng thu khách trừ nhập rồi đặt tên lợi nhuận kế toán khi ERD không có nguồn chi tiền tương ứng.

### 8.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| KHONG_CO_QUYEN_BAO_CAO_TAI_CHINH | 403 | Khách/staff truy dữ liệu admin kể cả export. |
| CHUNG_TU_TAI_CHINH_THIEU_NGUON | 409 | Bản chi tiết không thể đối chiếu, hoặc đưa vào danh sách ngoại lệ thay vì bịa tổng. |
| LOAI_XUAT_KHONG_HO_TRO | 400 | Loại báo cáo/cột ngoài allowlist. |
| VUOT_GIOI_HAN_XUAT | 400 | Cần thu hẹp bộ lọc, không âm thầm cắt file mà không báo. |


### 8.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T5-A01 | Thu thuê 400.000+cọc 1.000.000, phí 200.000, hoàn cọc 800.000 và hoàn tất | Doanh thu 600.000; thu 1.400.000; hoàn 800.000; cọc chưa tất toán 0. |
| W6-T5-A02 | Cùng đơn có 3 dòng thuê, 2 đợt trả và 4 history | Các tổng trên giữ nguyên, không fan-out. |
| W6-T5-A03 | Điều chỉnh phí -50.000 chốt tháng sau | Kỳ gốc giữ 600.000, kỳ sau delta -50.000; hoàn thêm 50.000 là dòng tiền riêng. |
| W6-T5-A04 | Cọc thu tháng trước 1.000.000 chưa trả/đối soát | Report số dư hôm nay vẫn có 1.000.000 dù filter phát sinh tháng này không có thu. |
| W6-T5-A05 | Đã xác minh thu sai 100.000 chưa phân loại | Dòng tiền hiện 100.000 ngoại lệ, chưa coi là doanh thu/cọc hợp lệ. |
| W6-T5-A06 | Hoàn 800.000 pending | Chưa cộng tổng hoàn thực tế; danh sách cần hoàn còn đủ 800.000 đang chờ. |
| W6-T5-A07 | Cọc đã bù phí 200.000 và hoàn 800.000 | Không báo còn giữ cọc 200.000. |
| W6-T5-A08 | Đơn HoanTat thiếu đối soát gốc | Có ngoại lệ truy chứng từ, không tự cộng mọi phí để ra một con số giả. |
| W6-T5-A09 | Staff gọi export có cùng URL đoán được | 403 như API xem, không được tải file qua đường phụ. |


**Đóng W6-T5:** Kim Xuyến bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 9. W6-T6 — Báo cáo nhập hàng, kho và bảo trì (Minh Tú)

### 9.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** Phần nhập hàng/thiết bị UC25. **Service/Controller:** `IBaoCaoKhoService` + `BaoCaoKhoService`; `BaoCaoKhoController`, route tách rõ phần quản trị có giá trị tiền.

**Method chính:** `LayNhapHangAsync`, `LayDieuChinhNhapAsync`, `LayLichSuDonGiaAsync`, `LayHienTrangKhoAsync`, `LayThongKeBaoTriAsync`, `XuatCsvAsync`.

#### Nhập hàng và điều chỉnh

- [ ] Chỉ cộng phiếu đã nhập kho; phiếu nháp/đã hủy không tăng số lượng và giá trị mua.
- [ ] Lọc kỳ nhập theo `ngay_nhap_thuc_te`, không thay bằng ngày tạo phiếu hoặc ngày quản trị viên mở báo cáo.
- [ ] Số phiếu đếm riêng biệt; số lượng nhập gốc là tổng chi tiết được xác nhận, giá trị gốc là tổng số lượng × đơn giá nhập. Đối chiếu được với tổng phiếu.
- [ ] Nhóm theo nhà cung cấp và sản phẩm của dòng nhập gốc; thiết bị giáng cấp sau này không làm chuyển giao dịch nhập cũ sang sản phẩm mới.
- [ ] Chi tiết chứng từ dùng snapshot tên nhà cung cấp/sản phẩm lúc nhập; có thể hiển thị tên hiện tại ở cột riêng, không ghi đè thông tin lịch sử.
- [ ] Tách lượng/giá trị gốc, chênh lệch từ phiếu điều chỉnh đã áp dụng và giá trị hiệu lực theo quy tắc Tuần 5. Không SUM cả `gia_tri_truoc` và `gia_tri_sau` như hai lần nhập.
- [ ] Có hai góc nhìn rõ: **theo lô nhập** chọn phiếu nhập trong kỳ và hiển thị các điều chỉnh đã áp dụng của lô tới mốc truy vấn; **phát sinh điều chỉnh** chọn theo `thoi_diem_ap_dung` trong kỳ, kể cả sửa một phiếu nhập cũ ngoài kỳ.
- [ ] Ghi rõ “hiệu lực tại thời điểm truy vấn” khi báo cáo lô nhập gồm điều chỉnh về sau. Không mô tả đó là số bất biến tại cuối kỳ cũ.
- [ ] Lịch sử đơn giá hiển thị nguồn nhập và điều chỉnh. Nếu có đơn giá bình quân thì lấy tổng giá trị/tổng số lượng cùng tập dữ liệu, không lấy trung bình đơn giản các đơn giá khác số lượng.
- [ ] Giá nhập không phải giá thuê/giá trị bồi thường. Không đổi giá thuê hoặc tiền đơn khách chỉ vì báo cáo phát hiện điều chỉnh giá nhập.

#### Hiện trạng kho và bảo trì

- [ ] Hiện trạng kho dùng projection của `KhoService` Tuần 5: tách đang khai thác, sẵn sàng, đang thuê, bảo trì, thất lạc, ngừng sử dụng/hồ sơ đã loại. Tổng hồ sơ lưu không phải tổng vật phẩm đang ở kho.
- [ ] Kho hiện tại nhóm theo sản phẩm hiện tại; báo cáo nhập quá khứ nhóm theo sản phẩm nguồn. Hai góc nhìn khác nhau phải có nhãn, không dùng chung một JOIN rồi cho ra số mâu thuẫn.
- [ ] Số lần thuê thiết bị suy ra từ bàn giao đã chốt, không từ số lần phân công bị hủy hoặc số đợt nhận trả.
- [ ] Thống kê bảo trì theo ngày bắt đầu/kết thúc đã chọn rõ trong bộ lọc; phân biệt vệ sinh và sửa chữa, phiếu đang mở và đã hoàn thành.
- [ ] “Thiết bị hay hỏng” tối thiểu thể hiện số đợt sửa chữa có căn cứ, thời gian/chi phí xử lý; không gọi mọi phiếu vệ sinh là một lần hỏng.
- [ ] Chi phí bảo trì chỉ tổng từ dữ liệu hợp lệ theo trạng thái; đang xử lý và đã chốt trình bày riêng. Không lấy số này làm phụ phí khách đã nộp.
- [ ] Nhân viên xem dữ liệu vận hành cần thiết; phần giá nhập, giá trị mua và tổng chi phí thuộc quyền quản trị viên. Service xuất file áp dụng cùng quyền như xem API.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/bao-cao/kho/hien-trang` | Nhân viên/quản trị viên, DTO theo quyền |
| GET | `/api/admin/bao-cao/kho/nhap-hang` | Quản trị viên |
| GET | `/api/admin/bao-cao/kho/dieu-chinh-nhap` | Quản trị viên |
| GET | `/api/admin/bao-cao/kho/lich-su-don-gia` | Quản trị viên |
| GET | `/api/bao-cao/kho/bao-tri` | Nhân viên phần công việc; quản trị viên được tổng chi phí |
| GET | `/api/admin/bao-cao/kho/xuat-csv` | Quản trị viên, loại báo cáo trong danh sách cho phép |

**Nghiệm thu:** Nhập 3 chiếc giá 1,2 triệu rồi điều chỉnh còn 1,1 triệu/chiếc cho ra gốc 3,6 triệu, điều chỉnh -300 nghìn, hiệu lực 3,3 triệu; không tăng số chiếc vì có thêm chứng từ điều chỉnh.

### 9.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/Interfaces/IBaoCaoKhoService.cs`
- [ ] `Services/BaoCaoKhoService.cs`
- [ ] `Controllers/BaoCaoKhoController.cs`
- [ ] `Controllers/Admin/BaoCaoKhoController.cs`
- [ ] `Models/DTOs/BaoCao/Kho/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 9.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LocNhapHangRequest | tuNgay, denNgay, maNhaCungCap?, maSanPhamNguon?, cheDo LoNhap/PhatSinhDieuChinh, trang | LoNhap chọn ngay_nhap_thuc_te; phát sinh delta chọn thoi_diem_ap_dung, không nhầm hai mốc. |
| NhapHangResponse | số phiếu distinct, lượng/giá trị gốc, delta đã áp dụng, hiệu lực tại mốc query, chi tiết chứng từ | Tên NCC/sản phẩm snapshot; master hiện tại nếu hiện thì ở cột khác. |
| LichSuDonGiaResponse | nguồn nhập, đơn giá/khối lượng gốc, điều chỉnh, hiệu lực, bình quân có trọng số nếu có | Tổng giá trị/tổng lượng cùng tập; mẫu số 0 trả null. |
| HienTrangKhoResponse | theo current product, nhóm trạng thái và mốc hiện tại | Dùng cùng projection Week 5; không tuyên bố kho lịch sử tùy ngày. |
| BaoTriThongKeResponse | số vệ sinh/sửa, số mở/đạt/không đạt, thời gian, chi phí chờ/chốt theo quyền | Loại ngày lọc bắt đầu hay hoàn thành rõ; không đếm vệ sinh thành lỗi hỏng. |


### 9.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayNhapHangAsync(filter, actor) | Nhập gốc + điều chỉnh theo lô chọn | Chỉ phiếu xác nhận; tổng theo dòng nhập trước join thiết bị. |
| LayDieuChinhNhapAsync(filter, actor) | Delta đã áp dụng trong kỳ | Dùng helper giá trị hiệu lực Week 5; kể cả phiếu nguồn ngoài kỳ. |
| LayLichSuDonGiaAsync(filter, actor) | Các mốc giá và nguồn chứng từ | Không sửa THIET_BI.gia_nhap/giá thuê từ query report. |
| LayHienTrangKhoAsync(filter, actor) | Kho hiện tại theo scope/quyền | Tái dùng KhoService, tiền nhập chỉ admin. |
| LayThongKeBaoTriAsync(filter, actor) | Đợt/chi phí/thời gian xử lý | Phiếu bảo trì grain một phiếu, joins không nhân qua lịch thuê. |
| XuatCsvAsync(type, filter, actor) | File theo filter/quyền report | Giá/chi phí admin, UTF-8 và ô text an toàn; cùng giới hạn W6-T8. |


### 9.D. Trình tự triển khai và tích hợp

1. Minh Tú dùng duy nhất TinhGiaTriSauDieuChinhAsync/helper Week 5, không tính delta lại bằng snapshot gốc khi có nhiều điều chỉnh nối tiếp.
2. Truy nhập theo dòng phiếu đã nhập thực tế; aggregate trước join THIET_BI. Số phiếu distinct, lượng tổng dòng, tổng giá trị phải khớp nguồn nhập gốc.
3. Theo lô: chọn phiếu nhập trong kỳ rồi hiển thị chuỗi delta đã áp dụng đến lúc query. Theo phát sinh delta: lọc ngày áp dụng trong kỳ dù phiếu nhập cũ ngoài kỳ. Ghi metadata để người dùng hiểu số có thể đổi khi điều chỉnh về sau.
4. Chỉ delta sửa sai khai báo nhập mới đổi giá trị mua hiệu lực theo loại được chốt. Giáng cấp/ngừng/thất lạc sau mua không tự trừ khoản mua lịch sử.
5. Nhóm lịch sử mua theo sản phẩm nguồn; kho hiện tại theo current product. Không dùng cùng JOIN current product cho cả hai chỉ số.
6. Nếu trả giá nhập bình quân, lấy sum giá trị/sum lượng của đúng cùng tập, tách gốc/hiệu lực và xử lý không có lượng. Không trung bình đơn giản hai mức giá có số lượng khác nhau.
7. Bảo trì phân loại vệ sinh và sửa chữa, chọn ngày bắt đầu/hoàn thành rõ. Chi phí đang dự kiến/đang xử lý tách chi phí đã kết luận; không coi là tiền khách đã thanh toán.
8. Số lần thuê dựa bàn giao đã chốt, không số phân công từng bị hủy hoặc số đợt trả. Thiết bị hỏng nhiều dựa đợt sửa có căn cứ, không mọi lần vệ sinh.
9. Phân quyền cả report và file; staff xem vận hành đủ dùng, không lộ giá nhập/tổng chi phí admin qua query phụ hoặc CSV.

### 9.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| MOC_BAO_CAO_KHO_KHONG_HO_TRO | 400 | Yêu cầu tồn lịch sử chưa có phép dựng được kiểm chứng hoặc mốc sai loại. |
| KHONG_CO_QUYEN_GIA_TRI_NHAP | 403 | Staff/khách yêu cầu phần giá trị mua/chi phí ngoài quyền. |
| CHUOI_DIEU_CHINH_KHONG_KHOP | 409 | Snapshot/delta không nối được; nêu nguồn cần kiểm tra, không tự sửa. |
| KHOANG_XUAT_QUA_LON | 400 | Vượt giới hạn export đã chốt. |


### 9.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T6-A01 | Nhập 3×1.200.000 rồi sửa giá xuống 1.100.000 | Gốc 3.600.000, delta -300.000, hiệu lực 3.300.000; lượng 3. |
| W6-T6-A02 | Lô nhập tháng trước được điều chỉnh tháng này | Có trong phát sinh delta tháng này; không thành phiếu nhập mới tháng này. |
| W6-T6-A03 | Nhập 1×100.000 và 9×200.000 | Bình quân 190.000, không 150.000. |
| W6-T6-A04 | Một dòng nhập có 5 thiết bị và nhiều lần bảo trì | Giá trị nhập không bị nhân số bản join. |
| W6-T6-A05 | Thiết bị A được giáng cấp B | Report nguồn nhập A giữ nguyên, kho hiện tại B tăng. |
| W6-T6-A06 | 1 phiếu vệ sinh và 2 phiếu sửa | Số lần sửa hỏng 2, không 3; chi phí có phân loại. |
| W6-T6-A07 | 3 phân công bị hủy rồi 1 bàn giao thật, trả 2 đợt | Số lần thuê chiếc đó là 1. |
| W6-T6-A08 | Sai khai báo nhập được điều chỉnh khác với mất thật sau mua | Chỉ loại sửa sai tương ứng đổi lượng/giá trị mua hiệu lực; lịch sử mua không bị trừ vì mất sau này. |


**Đóng W6-T6:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 10. W6-T7 — Tra cứu lịch sử và nhật ký (Thanh Tùng)

### 10.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** Phần tra cứu UC26. **Service/Controller:** `ITraCuuNhatKyService` + `TraCuuNhatKyService`; `Admin/NhatKyController`. Dùng lại cơ chế ghi lịch sử/nhật ký của Tuần 3–5.

**Method chính:** `TimThaoTacAsync`, `LayChiTietThaoTacAsync`, `LayLichSuDonAsync`, `LayLichSuThietBiAsync`, `LayTheoChungTuAsync`.

- [ ] Lọc theo khoảng giờ, người thực hiện, loại đối tượng, mã đối tượng và loại hành động; phân trang/sắp xếp thời gian + ID ổn định.
- [ ] Hiển thị ai, lúc nào, thao tác gì, trước/sau, lý do và chứng từ liên quan. Tài khoản người thực hiện null được thể hiện là hệ thống khi đúng ngữ cảnh, không gán một nhân viên giả.
- [ ] Phân biệt lịch sử trạng thái đơn, lịch sử tình trạng thiết bị và nhật ký thao tác tổng quát. Một hành động có thể có nhiều bản ghi liên quan, không coi đó là nhiều giao dịch tiền/kho.
- [ ] Loại đối tượng chỉ thuộc danh sách cho phép và được ánh xạ tới query cụ thể; không nhận tên bảng/SQL tự do từ URL.
- [ ] Che dữ liệu nhạy cảm trong JSON trước/sau theo cấu trúc: mật khẩu băm, token, secret gateway/provider, connection string và dữ liệu không cần cho người xem. Không trả raw JSON chỉ vì người dùng là quản trị viên.
- [ ] Lọc được thao tác thay đổi giá, khuyến mãi, chính sách, tài khoản, nhập/điều chỉnh, bảo trì, trạng thái đơn, phụ phí, thu/hoàn khi đã có nhật ký thực tế.
- [ ] Nhận diện và sửa các điểm ghi log còn thiếu ở action mới; không tạo lại lịch sử quá khứ bằng dữ liệu phỏng đoán rồi trình bày như log thật.
- [ ] Không có API sửa/xóa nhật ký hoặc sửa chứng từ trực tiếp từ trang tra cứu. Nhật ký ghi nối tiếp; điều chỉnh nghiệp vụ đi qua module tương ứng.
- [ ] Chi tiết lịch sử một đơn cho khách vẫn dùng API của chủ đơn đã có ở Tuần 3–4, chỉ trả sự kiện phù hợp; không nối trực tiếp endpoint admin cho khách.
- [ ] Có JSON cũ không đọc được thì đánh dấu lỗi dữ liệu/hiển thị có kiểm soát, không làm toàn bộ trang nhật ký lỗi 500 hoặc lộ stack trace.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/admin/nhat-ky`, `/api/admin/nhat-ky/{id}` | Quản trị viên |
| GET | `/api/admin/nhat-ky/don-thue/{donId}` | Quản trị viên |
| GET | `/api/admin/nhat-ky/thiet-bi/{thietBiId}` | Quản trị viên |
| GET | `/api/admin/nhat-ky/chung-tu?loai=...&ma=...` | Quản trị viên, loại chứng từ hợp lệ |

**Nghiệm thu:** Tra được một lần đổi chính sách/áp điều chỉnh/khóa tài khoản về đúng người và chứng từ; không có API ghi đè log và không lộ secret trong response.

### 10.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/Interfaces/ITraCuuNhatKyService.cs`
- [ ] `Services/TraCuuNhatKyService.cs`
- [ ] `Controllers/Admin/NhatKyController.cs`
- [ ] `Models/DTOs/NhatKy/`
- [ ] `Services/LichSuNghiepVuService.cs (bổ sung chỗ còn thiếu)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 10.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LocNhatKyRequest | tuThoiDiem, denThoiDiem, maTaiKhoan?, loaiDoiTuong?, maDoiTuong?, hanhDong?, trang | Mã đối tượng chuỗi theo ERD; loại/hành động allowlist, không nhận tên bảng hoặc SQL. |
| NhatKyResponse | ID, actor hoặc Hệ thống, thời điểm, hành động, đối tượng, lý do, trước/sau đã lọc, tham chiếu chứng từ | Che secret cả với admin; không trả raw JSON tùy ý. |
| TheoChungTuRequest | loai, ma | Map sang query đã định nghĩa; giữ loại+ID cùng nhau tránh trùng số giữa các bảng. |
| LichSuResponse | danh sách sự kiện đơn/thiết bị và audit liên quan, nguồn/tính đọc được | JSON cũ lỗi được đánh dấu, không làm cả trang 500. |


### 10.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TimThaoTacAsync(filter, actor) | Trang nhật ký có quyền | Admin, sort giờ + ID, projection đã mask. |
| LayChiTietThaoTacAsync(id, actor) | Một entry trước/sau đã lọc | Không để detail route bypass masking list. |
| LayLichSuDonAsync(donId, actor) | Lịch sử trạng thái + tham chiếu audit phù hợp | Không cộng mỗi log thành giao dịch tiền. |
| LayLichSuThietBiAsync(id, actor) | Lịch tình trạng/trạng thái/chứng từ | Nguồn history có thật, không suy giả từ trạng thái cuối. |
| LayTheoChungTuAsync(loai, ma, actor) | Các entry đã lưu liên quan chứng từ | Dispatch allowlist, không dynamic SQL từ input. |


### 10.D. Trình tự triển khai và tích hợp

1. Thanh Tùng lập allowlist loại đối tượng và map query: đơn, thiết bị, tài khoản, chính sách, mã, nhập/điều chỉnh, bảo trì, phí/đối soát/thu/hoàn. Không để client truyền tên bảng tự chọn.
2. Mask từ lúc ghi audit và từ lúc đọc để xử lý bản cũ: mật khẩu băm, token, khóa gateway/AI/email, connection string và dữ liệu cá nhân không cần thiết. Che theo cấu trúc đệ quy, không chỉ một tên field cấp đầu.
3. Actor null chỉ hiển thị Hệ thống khi là sự kiện hệ thống; actor không tìm thấy hiển thị rõ không xác định nếu dữ liệu cũ lỗi, không gán một nhân viên tùy ý.
4. Query lọc trước count/paging; sort mốc+ID để trang ổn định. Dải giờ dùng cùng quy ước UTC, hiển thị đúng múi giờ.
5. JSON cũ hỏng được bắt riêng, trả tình trạng không đọc được/metadata an toàn; không echo payload hỏng có thể chứa secret để giải thích lỗi.
6. Rà các action Week 6 và chỗ thiếu Week 3–5, thêm ghi audit cho hành động tương lai. Không backfill log tưởng tượng về quá khứ dựa trạng thái hiện tại.
7. Admin chỉ đọc nhật ký. Sửa nghiệp vụ từ link chứng từ vẫn phải đi endpoint có phê duyệt tương ứng; không mở API update/delete log.
8. Khách xem timeline đơn qua API chủ đơn có lọc sự kiện, không tái sử dụng nguyên JSON nội bộ admin.

### 10.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| LOAI_CHUNG_TU_KHONG_HO_TRO | 400 | Loại ngoài allowlist. |
| NHAT_KY_KHONG_TIM_THAY | 404 | ID/nguồn không tồn tại trong phạm vi cho phép. |
| KHONG_CO_QUYEN_XEM_NHAT_KY | 403 | Khách/staff vào route admin. |
| DU_LIEU_NHAT_KY_KHONG_DOC_DUOC | Mục dữ liệu | Đánh dấu entry lỗi có kiểm soát, không nhất thiết làm cả response fail. |


### 10.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T7-A01 | Tra lần khóa tài khoản/duyệt kho/tạo chính sách | Đúng actor, thời điểm, lý do và trước/sau có nguồn. |
| W6-T7-A02 | JSON audit lồng token/connection string trong object con | Cả list/detail đều che, kể cả admin. |
| W6-T7-A03 | Truy loại = tên bảng/chuỗi SQL tùy ý | 400, không thực thi query động theo input. |
| W6-T7-A04 | Một entry JSON cũ hỏng trong trang 20 dòng | Trang vẫn trả các dòng khác, entry hỏng an toàn, không lộ payload/stack. |
| W6-T7-A05 | Callback hệ thống ghi actor null đúng quy ước | Hiển thị Hệ thống, không giả nhân viên. |
| W6-T7-A06 | Khách xem timeline đơn mình | Chỉ sự kiện phù hợp, không thấy dữ liệu admin/secret. |
| W6-T7-A07 | Không có log quá khứ cho một thao tác cũ | Ghi rõ không có dữ liệu, không tạo bản ghi như đã xảy ra để lấp khoảng trống. |


**Đóng W6-T7:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 11. W6-T8 — Hợp đồng API, hiệu năng và kiểm tra toàn luồng

### 11.0. Phạm vi, quy tắc nghiệp vụ và API

**Tuấn Kiệt điều phối; mỗi người chịu trách nhiệm module mình.** Đây là công việc hoàn thiện, không phải viết lại các Service/Controller cũ.

#### Hợp đồng và xuất dữ liệu

- [ ] Chốt request/response có kiểu rõ; tiền, thời gian, enum, phân trang và cấu trúc lỗi dùng chung. Bổ sung mô tả và ví dụ cho các endpoint mới.
- [ ] Các route admin/nhân viên/khách không trùng; endpoint chỉ đọc không có tác dụng đổi trạng thái, thu tiền hoặc tạo chứng từ.
- [ ] Báo cáo trả `BoLoc`, `ThoiDiemLayDuLieu`, `DonViTien`, tổng hợp và chi tiết phù hợp; không đánh dấu “không có dữ liệu” giống số 0 khi query thất bại.
- [ ] CSV xuất theo cùng bộ lọc và quyền với báo cáo, có tiêu đề tiếng Việt/đơn vị, mã chứng từ để đối chiếu. Dùng UTF-8 phù hợp và xử lý ô văn bản bắt đầu ký tự công thức để không thực thi nội dung do người dùng nhập khi mở bảng tính.
- [ ] Không xuất mật khẩu/token, thông tin khách không cần thiết hoặc toàn bộ lịch sử ngoài phạm vi đã chọn. Số tiền âm của điều chỉnh vẫn là giá trị số, không bị mất dấu khi định dạng.
- [ ] Giới hạn số dòng xuất và thời gian xử lý; nếu vượt thì báo chia khoảng lọc, không tự thêm hệ thống hàng đợi xuất báo cáo/bảng mới ngoài phạm vi.

#### Hiệu năng có mục tiêu

- [ ] Dùng projection và tổng hợp phía database cho báo cáo; không tải toàn bộ bảng về rồi lọc/tính tổng trong bộ nhớ.
- [ ] Đọc nhiều-một/nhiều-nhiều theo lô, tránh một query cho từng dòng sản phẩm/đơn. Kiểm tra log truy vấn khi màn báo cáo chậm thực tế.
- [ ] Chỉ bổ sung tối ưu/index khi có truy vấn chậm cụ thể hoặc thiếu index phục vụ điều kiện chính; mọi thay đổi database đi qua người quản lý chung.
- [ ] Nếu dùng cache báo cáo, trả rõ mốc dữ liệu, chia theo quyền/bộ lọc và có thời gian sống hợp lý; cache không được phục vụ dữ liệu quản trị cho nhân viên/khách.
- [ ] Không dùng cache báo cáo để thay kiểm tra transaction lúc tạo đơn, giữ mã, bàn giao, điều chỉnh hoặc thu/hoàn.

#### Hồi quy các chức năng đã có

- [ ] Đăng nhập, khóa/đổi quyền, bảo vệ dữ liệu của khách; JWT cũ không tiếp tục giữ quyền đã bị thu hồi.
- [ ] Tạo đơn/giữ chỗ/giữ mã, hết hạn, thanh toán/callback, hủy/hoàn; không vượt tồn/lượt hoặc xử lý tiền hai lần.
- [ ] Nhập kho, chuẩn bị, bàn giao, trả nhiều đợt/mất, phụ phí và đối soát; snapshot và trạng thái khớp nhau.
- [ ] Bảo trì, giáng cấp và điều chỉnh không sửa chứng từ cũ; khả dụng và báo cáo dùng đúng nguồn dữ liệu.
- [ ] Đánh giá, thông báo, AI/dự phòng và giỏ tiếp tục hoạt động sau thay đổi chính sách/khuyến mãi.
- [ ] Thông báo lỗi được ghi nhận để thử lại có giới hạn; lỗi gửi không rollback thanh toán/đơn đã thành công. Mốc nhắc của đơn cũ vẫn theo chính sách đã gắn, không bị thay bằng cấu hình mới.
- [ ] Chỉ chạy thêm kiểm tra để giải quyết rủi ro còn lại hoặc điều kiện nghiệm thu chưa đạt; ưu tiên sửa lỗi phát hiện thay vì tăng số lượng test không có mục tiêu.

### 11.A. Thành phần phải bàn giao — Tuấn Kiệt

- [ ] `docs/api/openapi.json (export từ backend khi triển khai)`
- [ ] `docs/contracts/api-guide.md (đề xuất)`
- [ ] `docs/verification/week6.md (đề xuất)`
- [ ] `docs/frontend-integration.md (đề xuất)`
- [ ] `docs/report-definitions.md (đề xuất)`
- [ ] `Collections/GearGo.http hoặc Postman collection (theo nhóm đang dùng)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 11.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| BangContractAPI | route, method, auth/role, request/response mẫu, lỗi, side effect, owner | Mọi endpoint Week 3–6 có người chịu trách nhiệm; path trùng được hợp nhất theo controller cũ. |
| MaTranQuyen | guest/khách A/khách B/staff/admin/khóa/role đổi, thao tác và kết quả mong đợi | Kiểm cả request giả trực tiếp, không dựa vào ẩn nút frontend. |
| BaoCaoChayCa | mã ca, seed, build/commit, expected, actual, Pass/Fail/Blocked, evidence, chủ sửa | Kế hoạch không tự đánh dấu Pass khi chưa chạy code. |
| DanhSachVanDeBanGiao | chức năng, mức chặn, cách tái hiện, owner, điều kiện hoàn tất, phần mock/thật | Frontend biết endpoint sẵn sàng và phần còn chờ, không đoán từ việc đã có class. |
| HopDongExport | UTF-8, tên cột/đơn vị/mốc thời gian, filter, giới hạn dòng, filename/content-type | Escape CSV chuẩn; ô văn bản bắt đầu =,+,-,@ hoặc control nguy hiểm được xử lý, số âm nghiệp vụ vẫn giữ kiểu số. |


### 11.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| Rà OpenAPI (công việc) | Spec khớp API chạy thật và mẫu lỗi | Chủ controller sửa annotation/DTO, Tuấn Kiệt tổng hợp. |
| Chạy hồi quy liên module (công việc) | Bằng chứng chuỗi từ tạo đơn đến báo cáo | Các chủ service chịu trách nhiệm kết quả của module mình. |
| Đo query chậm cụ thể (công việc) | Dữ liệu/latency/query count trước-sau trên seed đã ghi | Chỉ tối ưu điểm có vấn đề, không nâng framework hoặc thêm cache tùy tiện. |
| Đối chiếu CSV và API (công việc) | Cùng filter/quyền/tổng và mã nguồn | Kiện Minh/Minh Tú/Kim Xuyến theo module, Tuấn Kiệt kiểm tổng hợp. |
| Chốt contract frontend (công việc) | Danh sách API và trình tự gọi, xử lý 401/403/409/pending | Quyền trên UI là gợi ý, server vẫn kiểm tra lại mọi mutation. |


### 11.D. Trình tự triển khai và tích hợp

1. Tuấn Kiệt lập inventory endpoint theo bốn tuần và đối chiếu route thực tế, auth, DTO, kiểu tiền/ngày/enum, phân trang và lỗi chuẩn. Không tạo hai route cùng verb/path do thêm controller tuần sau.
2. Mỗi người cung cấp ít nhất một request/response thành công, validation, forbidden, conflict cho module mình; các endpoint tiền có mẫu pending/không rõ kết quả để frontend không hiện thành công sớm.
3. Chốt trình tự UI: preview→xác nhận→theo dõi trạng thái, 409 tải lại dữ liệu và quyết định lại, không tự lặp mutation có thể thu tiền bằng mã mới.
4. Rà exports UTF-8/tiếng Việt, delimiter/quote/newline, ô text có công thức. Chỉ xử lý escape như văn bản đối với field text không tin cậy; delta -50.000 là numeric hợp lệ, không xóa dấu.
5. Chạy bộ ca bắt buộc mục nghiệm thu của tuần và ca task. Ưu tiên rủi ro mất tiền/vượt kho/vượt quyền/sai báo cáo, dùng request đồng thời thật ở các ca tranh chấp, không chỉ bấm liên tiếp.
6. Phát hiện report chậm thì ghi dataset/query count/latency và query plan nếu cần. Ưu tiên projection/aggregate/khử N+1; index chỉ đề nghị theo query cụ thể, qua người quản lý DB.
7. Nếu cache, key gồm role/scope/filter và thời điểm; không chia cache admin cho staff. Không dùng cache để quyết định giữ kho/lượt mã hoặc tiền.
8. Rerun đúng vùng ảnh hưởng của lỗi đã sửa; ghi Pass/Fail/Blocked rõ. Bàn giao backend chỉ khi các luồng bắt buộc có bằng chứng, không coi hoàn thành plan là hoàn thành sản phẩm.
9. Chốt danh sách tích hợp thật còn chờ môi trường/credential riêng với lỗi chức năng. Frontend có thể dùng mock đã ghi rõ cho UI, nhưng nghiệm thu thật vẫn còn điều kiện cần đạt.

### 11.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| CONTRACT_API_LECH_IMPLEMENTATION | Chặn bàn giao API liên quan | Route/DTO/lỗi không giống tài liệu; chủ controller sửa trước khi frontend nối. |
| LOI_VUOT_QUYEN_KHO_TIEN | Chặn nghiệm thu | Bất kỳ ca vượt quyền, vượt kho, thu/hoàn lặp hoặc mất nguồn chưa giải quyết. |
| SO_LIEU_BAO_CAO_KHONG_DOI_CHIEU | Chặn báo cáo | Tổng không khớp chứng từ/CSV/fixture. |
| TICH_HOP_PROVIDER_BLOCKED | Chờ điều kiện | Chưa có môi trường/credential hoặc ca thật; ghi owner và việc còn thiếu. |


### 11.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T8-A01 | Dùng token khách A gọi ID của B ở hồ sơ/đơn/phiếu/đánh giá/thông báo | Không đọc/ghi chéo ở bất kỳ route nào. |
| W6-T8-A02 | Token admin bị hạ quyền nhưng còn hạn | Không duyệt nhập/mất/phí/kho/chính sách/báo cáo admin bằng quyền cũ. |
| W6-T8-A03 | Hai yêu cầu tranh thiết bị/lượt cuối, callback thu/hoàn trùng | Không vượt cam kết hoặc xử lý tiền hai lần; có bằng chứng DB. |
| W6-T8-A04 | CSV có tên bắt đầu =SUM(...), tiếng Việt, dấu phẩy và xuống dòng | Mở dưới dạng text an toàn, cột đúng; không thực thi công thức từ tên người dùng. |
| W6-T8-A05 | CSV delta số -50.000 VND | Giá trị vẫn âm và tính tổng đúng, không bị biến thành 50.000. |
| W6-T8-A06 | Report 3 dòng đơn×2 lần trả×2 nguồn tiền | API/CSV/fixture cùng tổng đúng, không fan-out. |
| W6-T8-A07 | Trang trạng thái giao dịch nhận pending/unknown | Tài liệu hướng dẫn chờ/đối chiếu, không tự cho frontend tạo lệnh mới. |
| W6-T8-A08 | Mọi ca chưa chạy hoặc provider chỉ mock | Biên bản không gắn Pass thật/đã triển khai thật. |


**Đóng W6-T8:** Tuấn Kiệt bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 12. W6-T9 — Chuẩn bị và triển khai bản demo backend

### 12.0. Phạm vi, quy tắc nghiệp vụ và API

**Thanh Tùng phụ trách cấu hình/bản phát hành; Tuấn Kiệt kiểm tra sau triển khai; từng người hỗ trợ module mình.** Dùng môi trường/hosting nhóm đã chọn; chưa có thông tin nhà cung cấp trong tài liệu này nên không gắn hướng dẫn vào một dịch vụ cụ thể.

#### Chuẩn bị trước khi đưa bản lên môi trường demo

- [ ] Chốt bản mã nguồn dùng để demo, build từ checkout sạch; ghi commit/tag và phiên bản cấu hình liên quan để tái tạo được.
- [ ] Chuẩn bị cấu hình kết nối SQL Server, JWT, CORS, URL frontend/API, callback gateway, lưu tệp và khóa AI/email nếu có; secret lấy từ cấu hình môi trường phù hợp, không commit vào repo hoặc đưa vào tài liệu demo.
- [ ] Kiểm tra nguồn lưu tệp ảnh/bằng chứng vẫn còn sau restart/deploy theo cách dự án đang dùng; không giả định filesystem tạm là nơi lưu bền vững.
- [ ] Database dùng migrations đã thống nhất; một người áp dụng, không để nhiều instance tự chạy cập nhật schema đồng thời. Không chạy lệnh xóa/tạo lại database chứa dữ liệu cần giữ.
- [ ] Seed dữ liệu tham chiếu/chính sách/tài khoản cần thiết theo cách có thể chạy lại mà không tạo bản trùng; không seed lại hóa đơn, thu/hoàn hoặc nhật ký demo mỗi lần ứng dụng khởi động.
- [ ] Đánh dấu rõ mock/sandbox/thật cho gateway, AI và email. Bản demo mock không được mở callback thành công tùy ý ở môi trường xử lý tiền thật.
- [ ] Kiểm tra HTTPS, CORS đúng frontend đã chọn, quyền truy cập API và lỗi trả ra không chứa chi tiết nội bộ; không bật cấu hình debug tùy tiện trên môi trường dùng chung.
- [ ] Chốt instance chịu trách nhiệm job hết hạn, nhắc lịch và gửi thông báo; cơ chế khóa/idempotency phải vẫn đúng nếu restart hoặc có nhiều instance.
- [ ] Có kiểm tra sức khỏe ứng dụng/database phù hợp, log lỗi đủ để tìm theo mã đơn/giao dịch/yêu cầu nhưng không ghi secret.

#### Triển khai và kiểm tra nhanh

1. Sao lưu dữ liệu cần giữ trước cập nhật và kiểm tra được đường phục hồi ở môi trường phù hợp.
2. Triển khai bản đã chốt cùng cấu hình; kiểm tra ứng dụng khởi động, kết nối database và các job cần thiết.
3. Đăng nhập các vai trò demo; kiểm tra quyền, chính sách hiện hành, danh sách sản phẩm/khả dụng và báo cáo mẫu.
4. Chạy một lượt nhỏ với dữ liệu demo: tạo đơn có mã → thanh toán mock/sandbox → bàn giao → nhận trả → đối soát → hoàn/thu → hoàn tất; kiểm tra số liệu báo cáo và nhật ký.
5. Kiểm tra một trường hợp bị từ chối: khách xem báo cáo admin, mã hết lượt hoặc thao tác lặp; xác nhận hệ thống từ chối đúng và không tạo giao dịch phụ.
6. Ghi kết quả, URL/môi trường, thời điểm, commit và các tích hợp đã kiểm chứng. Nếu còn lỗi nghiêm trọng thì chưa gọi bản đó là đạt nghiệm thu.

#### Phục hồi và bàn giao

- [ ] Có cách quay về bản ứng dụng trước nếu cần, kiểm tra tương thích với schema hiện tại; không mặc định hạ phiên bản code là đủ nếu schema/dữ liệu đã thay đổi.
- [ ] Không khôi phục database cũ một cách mù quáng sau khi đã có giao dịch thật mới, vì có thể làm mất dấu tiền/chứng từ. Trường hợp đó cần dừng xử lý mới và đối chiếu trước khi phục hồi dữ liệu.
- [ ] Việc retry job/callback sau restart vẫn dùng mã yêu cầu cũ và trạng thái bền vững; không tạo lại thu/hoàn vì dữ liệu tạm trong RAM bị mất.
- [ ] Tài liệu chạy dự án, cấu hình mẫu không có secret, thứ tự cập nhật database, dữ liệu demo và kịch bản trình bày đủ để một thành viên khác thực hiện lại.
- [ ] Nếu chưa có môi trường hoặc khóa provider, bàn giao bản build + cấu hình mẫu + các bước còn thiếu, ghi đúng phần chưa triển khai/kiểm chứng; không bỏ qua để báo hoàn tất toàn bộ.

### 12.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `docs/runbook.md (đề xuất)`
- [ ] `docs/deployment-demo.md (đề xuất)`
- [ ] `docs/release-checklist.md (đề xuất)`
- [ ] `Configuration/ (mẫu options theo repo, không secret)`
- [ ] `docs/frontend-integration.md (điền URL/mode khi có môi trường)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 12.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| ReleaseManifest | commit/tag, thời điểm build, môi trường, artifact, cấu hình phiên bản không secret, trạng thái migration | Đủ để tái tạo; không tự đặt URL hoặc tuyên bố deploy khi chưa có. |
| EnvironmentChecklist | SQL/JWT/CORS/frontend/API/callback/files/jobs/AI/email, owner, đã xác minh/chờ | Giá trị bí mật không chép vào tài liệu; chỉ tên biến và nơi cấu hình. |
| IntegrationMode | gateway mock/sandbox/thật, AI mock/quy tắc/thật, email mock/thật | Ghi riêng từng adapter, không một nhãn chung làm hiểu nhầm mọi phần đã thật. |
| SmokeResult | ca nhỏ, timestamp, commit, mode, kết quả, nguồn chứng từ/log | Tuấn Kiệt xác minh sau deploy; không dùng số liệu production để seed lại. |
| RecoveryChecklist | bản trước, backup, đường restore đã thử, schema compatibility, giao dịch phát sinh cần đối chiếu | Không phục hồi mù làm mất thu/hoàn/chứng từ mới. |


### 12.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| Chuẩn bị release (công việc của Thanh Tùng) | Build sạch + artifact + manifest | Dùng version/framework hiện tại, không nâng nền tảng tuần cuối nếu không bắt buộc. |
| Cấu hình môi trường (công việc của Thanh Tùng và chủ adapter) | Checklist đã xác minh từng mục | Secret server, CORS đúng frontend, callback có xác thực, files bền vững. |
| Triển khai demo (công việc theo kế hoạch) | URL/môi trường thật sự hoạt động và log khởi động | Khi nhóm có hosting được chọn; bản plan này không thực hiện deploy thay nhóm. |
| Chạy smoke (Tuấn Kiệt) | Kết quả chuỗi demo và ít nhất một ca bị từ chối | Dùng seed riêng, kiểm report/audit sau luồng. |
| Đối chiếu/khôi phục khi lỗi (Thanh Tùng + chủ tiền) | Quyết định dừng/rollback có căn cứ | Tiền đã gửi ngoài phải kiểm tra bằng mã cũ; code rollback không hoàn tác gateway. |


### 12.D. Trình tự triển khai và tích hợp

1. Đầu tuần chốt môi trường demo, ai giữ cấu hình và ai áp dụng migration. Chưa có môi trường/credential thì đưa vào điều kiện chờ với owner, vẫn chuẩn bị đầy đủ build/runbook.
2. Build từ commit sạch, ghi commit/hash artifact và cấu hình không secret. Không đóng gói khóa thật hoặc database dump chứa thông tin nhạy cảm vào repo/tài liệu demo.
3. Kiểm file ảnh/bằng chứng tồn tại sau restart/deploy; dùng nơi lưu bền vững nhóm đã chọn, không dựa thư mục tạm mặc định của hosting.
4. Sao lưu dữ liệu cần giữ và thử được phương án phục hồi phù hợp. Một người áp schema theo migration đã thống nhất; seed idempotent dữ liệu tham chiếu, không tái tạo thu/hoàn khi app start.
5. Cấu hình chế độ từng adapter rõ. Callback success giả chỉ ở môi trường mock được kiểm soát, không route mở có thể giả tiền trong mode thật.
6. Chọn worker/instance chịu job, kiểm database claim/idempotency khi restart; healthcheck/log vừa đủ tìm theo traceId/đơn/mã yêu cầu, không ghi secret.
7. Đưa bản lên môi trường được chọn, kiểm khởi động/database/HTTPS/CORS/ảnh. Tuấn Kiệt đăng nhập từng role và chạy luồng mẫu có mã→thu→giao→trả→phí/đối soát→hoàn/thu thêm→HoanTat.
8. Đối chiếu báo cáo kho/tiền/audit với chứng từ của luồng mẫu, rồi thử một ca cấm/trùng. Ghi URL, mode thật/mock và kết quả thực, không xem deploy thành công là đã đạt mọi ca.
9. Nếu lỗi chặn, dừng phát sinh mới phù hợp, xem code/schema compatibility trước rollback. Sau giao dịch thật mới, không restore DB cũ làm mất dấu tiền; đối chiếu các mã yêu cầu đang chờ trước quyết định dữ liệu.
10. Bàn giao cách chạy, biến cấu hình mẫu, seed, script/demo theo repo, API contract và danh sách còn chờ. Người khác trong nhóm thực hiện lại runbook để xác nhận tài liệu dùng được.
11. Kết luận cuối tuần tách rõ: phạm vi backend đã nghiệm thu; adapter thật chưa kiểm chứng; frontend đang/chưa tích hợp; vấn đề còn lại có owner. Không suy từ việc đủ sáu file plan rằng chỉ còn ráp frontend.

### 12.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| CAU_HINH_MOI_TRUONG_THIEU | Chặn phần triển khai liên quan | Nêu tên cấu hình thiếu, owner; không hiển thị secret. |
| SMOKE_TEST_KHONG_DAT | Chặn phát hành bản demo được nghiệm thu | Nêu ca/chứng từ/commit để chủ module sửa. |
| DU_LIEU_TIEN_CHUA_DOI_CHIEU | Chặn phục hồi dữ liệu tùy tiện | Có lệnh thu/hoàn thật chưa kết luận, cần giữ mã và đối chiếu. |
| RUNBOOK_KHONG_TAI_HIEN_DUOC | Chặn bàn giao vận hành | Thành viên khác chưa chạy lại được từ hướng dẫn. |


### 12.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W6-T9-A01 | Deploy/restart ứng dụng | Database, ảnh/bằng chứng và các intent chờ còn nguyên, jobs tiếp tục đúng mã. |
| W6-T9-A02 | Chạy seed lần hai | Không duplicate tài khoản/chính sách/thiết bị/chứng từ demo ngoài ý định. |
| W6-T9-A03 | Thiếu AI key nhưng fallback bật | UI tư vấn đúng nguồn QuyTac, manifest không ghi AI thật đã kiểm chứng. |
| W6-T9-A04 | Frontend URL ngoài allowlist CORS | Không mở tất cả origin chỉ để vượt lỗi; cấu hình môi trường dùng URL đã chốt. |
| W6-T9-A05 | Smoke tạo đơn tới hoàn tất | Trạng thái, tồn, tiền và report khớp đúng cùng một chuỗi chứng từ. |
| W6-T9-A06 | Callback lặp sau deploy | Không tạo thu/hoàn/histories nghiệp vụ lần hai. |
| W6-T9-A07 | Rollback ứng dụng khi có intent đang chờ | Không mất mã; adapter/query vẫn nhận được, không tạo lại mã mới. |
| W6-T9-A08 | Một thành viên khác dùng runbook | Chạy được build/config/demo với quyền được cấp và nhận rõ phần còn chờ môi trường. |


**Đóng W6-T9:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 13. Bộ dữ liệu mẫu và kết quả phải tính ra được

Các số dưới đây là **dữ liệu kiểm thử đề xuất**, không phải số liệu hoạt động thật. Đơn vị tiền: VND. Dùng dữ liệu cố định để từng người tự đối chiếu service và sau đó kiểm tra toàn luồng.

### 13.1 Khuyến mãi chỉ giảm phần thuê đủ điều kiện

Giỏ có sản phẩm A thuộc phạm vi mã, tiền thuê 300.000; sản phẩm B ngoài phạm vi, tiền thuê 200.000; tổng cọc 1.000.000. Mã giảm 20%, tối đa 50.000, yêu cầu tiền thuê tối thiểu 400.000.

| Phép kiểm tra | Kết quả mong đợi |
|---|---|
| Tiền thuê xét mức tối thiểu | 500.000 → đủ điều kiện |
| Tiền thuê nằm trong phạm vi giảm | 300.000 |
| Giảm trước giới hạn tối đa | 300.000 × 20% = 60.000 |
| Giảm thực tế | 50.000 |
| Tiền thuê sau giảm | 450.000 |
| Tổng thuê + cọc cần thanh toán | 1.450.000 |
| Phân bổ giảm từng dòng | A: 50.000; B: 0; cọc không giảm |

Nếu đổi thành mã số tiền 400.000 chỉ áp dụng A, mức giảm tối đa do phần thuê hợp lệ là 300.000. Không trừ thêm vào B hoặc cọc. Nếu chia mức giảm 10.000 cho ba dòng đủ điều kiện có cùng tiền thuê, quy tắc làm tròn VND phải cho tổng đúng 10.000, ví dụ 3.333 + 3.333 + 3.334; dòng nhận phần dư được chọn theo thứ tự ổn định đã thống nhất.

**Hạn mức đồng thời:** Mã giới hạn tổng 1 lượt, chưa có lượt dùng/giữ. Hai khách tạo đơn đồng thời: tối đa một đơn giữ được lượt. Khách còn lại nhận lỗi mã hết lượt để xác nhận lại giỏ; hệ thống không âm thầm bỏ mã rồi tạo đơn giá cao hơn. Sau khi đơn giữ hết hạn trước thanh toán, lượt được giải phóng theo cùng quy tắc thời gian, dù job dọn chưa chạy.

### 13.2 Chính sách mới không làm đổi đơn cũ

- Bản V1 đang hiệu lực; V2 có thời điểm áp dụng 10:00 ngày D. Đơn A tạo 09:59 dùng V1, đơn B tạo đúng 10:00 dùng V2, với thời gian do server xác định.
- Đến ngày D+1, tính hủy/trễ của A vẫn đọc V1 qua `ma_chinh_sach`. Không lấy V2 vì đang là bản hiện hành.
- Nếu V3 đã lưu nhưng hẹn ngày D+7, truy vấn chính sách hiện hành ngày D+1 vẫn trả V2.
- Khi chọn “áp dụng ngay”, API dùng thời điểm server khi tạo trong transaction; không từ chối chỉ vì thời gian client gửi đã chậm vài mili giây. Với lịch tương lai, kiểm tra mốc hiệu lực theo quy tắc đã chốt.
- Hai admin tạo bản mới đồng thời phải nhận hai phiên bản hợp lệ hoặc một lỗi xung đột xử lý được; không có hai bản cùng `phien_ban`.

### 13.3 Doanh thu, cọc và tiền thực thu khác kỳ

Đơn X thanh toán thành công ngày D: thuê sau giảm 900.000 + cọc 1.000.000 = thu 1.900.000. Ngày D+3 nhận trả, chốt phụ phí hợp lệ 180.000 và hoàn tất đơn theo điều kiện của luồng đối soát; hoàn cọc 820.000 thành công trong ngày D+3.

| Báo cáo | Kết quả mong đợi |
|---|---|
| Dòng tiền ngày D | Thu 1.900.000, hoàn 0, thu ròng 1.900.000 |
| Doanh thu đơn hoàn tất ngày D | 0 từ đơn X vì chưa hoàn tất |
| Doanh thu đơn hoàn tất ngày D+3 | Thuê 900.000 + phụ phí 180.000 = 1.080.000 |
| Dòng tiền ngày D+3 | Thu 0, hoàn 820.000, thu ròng −820.000 |
| Cọc phải xử lý sau khi tất toán | 0; phần 180.000 đã dùng bù phí, không tiếp tục hiện là cọc còn giữ |
| Đối chiếu toàn bộ vòng đời trên | 1.900.000 − 820.000 = 1.080.000 |

Nếu ngày D+5 chốt điều chỉnh giảm phí 20.000 thì báo cáo điều chỉnh ngày D+5 ghi −20.000. Báo cáo gốc ngày D+3 giữ phần đã chốt; báo cáo có lựa chọn giá trị sau điều chỉnh phải thể hiện thêm delta và mốc lấy dữ liệu. Khoản hoàn bổ sung 20.000 chỉ xuất hiện trong dòng tiền khi hoàn thật sự thành công; trong lúc chờ thì vẫn hiện nghĩa vụ hoàn bổ sung.

**Giao dịch cần đối chiếu:** Gateway xác nhận đã thu thêm 300.000 do thanh toán trùng, hệ thống ghi nhận giao dịch thành công nhưng đánh dấu cần đối chiếu. Dòng tiền thực tế vẫn phải thấy 300.000, kèm cảnh báo/phân loại. Không cộng khoản này thành doanh thu hoặc tự coi là cọc hợp lệ. Khi hoàn lại thành công, ghi dòng hoàn theo ngày hoàn, không xóa lịch sử thu.

### 13.4 Điều chỉnh nhập kho nhiều lần

Phiếu nhập đã xác nhận có 10 thiết bị, giá gốc 2.000.000/thiết bị: tổng gốc 20.000.000. Giả sử hai phiếu điều chỉnh lần lượt áp dụng cho đúng cả 10 thiết bị, không thay đổi số lượng.

| Mốc | Giá hiệu lực mỗi thiết bị | Delta của lần điều chỉnh | Tổng hiệu lực |
|---|---:|---:|---:|
| Chứng từ gốc | 2.000.000 | 0 | 20.000.000 |
| Điều chỉnh 1 | 2.100.000 | +1.000.000 | 21.000.000 |
| Điều chỉnh 2 | 2.050.000 | −500.000 | 20.500.000 |

Tổng delta là +500.000. Không tính lần 2 thành +500.000 rồi cộng lên lần 1, vì đó là so với giá gốc thay vì giá hiệu lực trước lần 2. Nếu một thiết bị bị giáng cấp sang sản phẩm khác, báo cáo nguồn nhập vẫn thuộc sản phẩm trên chứng từ; báo cáo kho hiện tại nhóm theo sản phẩm hiện tại của thiết bị.

## 14. Thứ tự phối hợp và lịch thực hiện 5 ngày

### 14.1 Những hợp đồng phải chốt trước khi chia nhánh

| Việc cần thống nhất | Người chốt chính | Người cần dùng | Hạn |
|---|---|---|---|
| Cách chọn phiên bản chính sách, cấu trúc JSON và đọc bản cũ | Thanh Tùng | Kiện Minh và chủ các luồng thuê/hủy/trễ | Sáng ngày 1 |
| Công thức giảm, phân bổ, giữ/dùng/nhả lượt; cách xử lý mã bị ẩn/hết hạn khi đơn còn giữ hợp lệ | Kiện Minh | Thanh Tùng, Kim Xuyến, Tuấn Kiệt và chủ tạo đơn/thanh toán | Ngày 1, trước khi viết ca tích hợp |
| Ngày ghi nhận, loại giao dịch, doanh thu/cọc/delta | Kim Xuyến | Minh Tú, Tuấn Kiệt | Ngày 1 |
| Projection giá trị nhập hiệu lực, sản phẩm gốc/hiện tại | Minh Tú | Kim Xuyến, Tuấn Kiệt | Ngày 1 |
| Định nghĩa chỉ số thuê, quyền nhân viên, DTO/filter báo cáo | Tuấn Kiệt | Cả nhóm | Ngày 1 |
| Cấu trúc nhật ký, che dữ liệu nhạy cảm, lỗi API và cấu hình demo | Thanh Tùng | Cả nhóm | Ngày 1 |

Sau khi thống nhất, ghi vào interface/DTO và tài liệu API. Nhánh báo cáo có thể phát triển song song trên dữ liệu mẫu, không cần chờ màn quản trị khuyến mãi hoàn thành. Ngược lại, kiểm tra tạo đơn có mã và tiền sau giảm phải dùng implementation thật của service liên quan.

### 14.2 Lịch theo từng người

| Ngày | Thanh Tùng | Kiện Minh | Minh Tú | Kim Xuyến | Tuấn Kiệt | Mốc bàn giao chung |
|---|---|---|---|---|---|---|
| **Ngày 1 — Chốt cách tính** | Rà JSON chính sách, cách chọn phiên bản; interface chính sách/nhật ký; kiểm tra cấu hình demo | Rà service mã Tuần 2; chốt quota, snapshot, quy tắc giữ; interface quản trị | Chốt query nhập gốc/điều chỉnh/kho/bảo trì và bộ mẫu | Chốt công thức doanh thu, cash flow, cọc, delta và bộ mẫu | Chốt danh sách công việc/chỉ số, filter và ca nghiệm thu; ghi lỗi kế thừa | Hợp đồng API, nguồn dữ liệu, dữ liệu mẫu, lỗi chặn có người nhận |
| **Ngày 2 — Service chính** | Viết validation, tạo/chọn phiên bản, kiểm tra đơn cũ | Viết quản trị mã, phạm vi, trạng thái và kiểm tra đầu vào | Viết query nhập và lịch sử giá/điều chỉnh | Viết doanh thu, phí hủy, điều chỉnh và dòng tiền | Viết danh sách công việc, tổng hợp thuê và quyền truy cập | Service chính chạy được bằng dữ liệu mẫu; gửi kết quả số liệu |
| **Ngày 3 — API và tích hợp** | Hoàn thiện controller chính sách, nhật ký có lọc/che dữ liệu; kiểm tra DI | Tích hợp giỏ/đơn/thanh toán/hủy/hết hạn, xử lý cạnh tranh và callback lặp | Hoàn thiện kho hiện tại/bảo trì, controller và export được phân quyền | Hoàn thiện cọc/nghĩa vụ còn lại, controller và export | Hoàn thiện controller/chỉ số; ghép collection kiểm tra liên module | Merge chức năng chính vào nhánh tích hợp; API và ví dụ response được cập nhật |
| **Ngày 4 — Kiểm tra toàn luồng** | Kiểm tra phiên bản/nhật ký/quyền; sửa lỗi cấu hình; chuẩn bị bản build | Chạy quota đồng thời, thời hạn, phân bổ và retry; sửa lỗi mã | Đối chiếu giá trị nhập, giáng cấp và bảo trì; xử lý query chậm có bằng chứng | Đối chiếu tiền theo chứng từ và mẫu; xử lý lệch tổng/số dư | Điều phối hồi quy, gom lỗi, kiểm tra summary/detail/export và thời gian | Hoàn thành ca bắt buộc; lỗi chặn có kết quả sửa và kiểm tra lại |
| **Ngày 5 — Nghiệm thu và bàn giao** | Triển khai môi trường đã có; tài liệu cấu hình/phục hồi; ghi commit và trạng thái | Demo quản trị mã + đơn áp mã; bàn giao API và lưu ý quota | Demo nhập/điều chỉnh/kho; bàn giao bộ số liệu | Demo doanh thu/dòng tiền/cọc; bàn giao công thức và đối chiếu | Chạy kiểm tra sau triển khai, demo luồng tổng, tổng hợp biên bản | Bản backend demo, báo cáo kiểm tra, tài liệu và danh sách việc còn lại |

**Cách tránh dồn việc cuối tuần:** Cuối ngày 2 phải có service và số liệu mẫu; cuối ngày 3 phải ghép được API. Ngày 4–5 dành cho lỗi, nghiệm thu và bàn giao. Nếu chức năng tuần trước chưa chạy, đánh dấu đó là việc sửa điều kiện đầu vào và điều chỉnh khối lượng công khai.

**Khi thiếu thời gian:** Ưu tiên tính đúng tiền/quota/chính sách, quyền, báo cáo cốt lõi và luồng demo. Có thể lùi cache, biểu đồ giao diện, xuất Excel định dạng đẹp hoặc bộ lọc tiện ích; ghi rõ phần lùi. Không lùi lỗi mất dữ liệu, trùng thu/hoàn, vượt lượt, lộ quyền hoặc số liệu sai rồi ghi đã hoàn tất.

## 15. Danh sách 32 ca nghiệm thu bắt buộc

Đây là ca cần thực hiện trong tuần, **chưa phải kết quả đã chạy**. Người phụ trách ghi `Pass/Fail/Blocked`, bằng chứng ngắn và mã lỗi nếu có. Có thể dùng test tích hợp, API collection hoặc kiểm tra thủ công có đối chiếu; không cần nhân đôi cùng một phép kiểm tra bằng nhiều công cụ.

| Mã | Ca kiểm tra | Kết quả cần đạt | Phụ trách |
|---|---|---|---|
| W6-01 | Tạo chính sách với JSON thiếu khóa, sai kiểu, phí âm hoặc mốc hủy mâu thuẫn | Từ chối rõ trường lỗi; không tạo phiên bản | Thanh Tùng |
| W6-02 | Có V1 hiện hành, V2 tương lai; kiểm tra trước/đúng mốc V2 | Chọn đúng theo thời gian server, không lấy bản tương lai | Thanh Tùng |
| W6-03 | Tính phí/hủy đơn cũ sau khi có chính sách mới | Giữ chính sách/snapshot của đơn, đọc được JSON cũ | Thanh Tùng + Tuấn Kiệt |
| W6-04 | Hai admin tạo phiên bản cùng lúc; thay lịch bằng bản mới | Không trùng phiên bản; chọn bản tại cùng mốc theo quy tắc đã chốt; có nhật ký | Thanh Tùng |
| W6-05 | Mã trùng, thời hạn sai, phần trăm ngoài miền hoặc phạm vi không hợp lệ | Từ chối đúng; không lưu nửa chừng các bảng nối | Kiện Minh |
| W6-06 | Giỏ gồm sản phẩm hợp lệ/không hợp lệ và cọc như mục 13.1 | Đúng điều kiện tối thiểu, mức trần, phân bổ và tổng tiền | Kiện Minh |
| W6-07 | Giảm vượt tiền thuê đủ điều kiện; chia giảm có phần dư | Không âm tiền thuê, không giảm cọc; tổng dòng bằng tổng giảm | Kiện Minh |
| W6-08 | Hai yêu cầu giữ lượt cuối đồng thời; kiểm tra cả tổng và mỗi khách | Không vượt hạn mức; một yêu cầu thất bại được rollback đầy đủ | Kiện Minh |
| W6-09 | Đơn chờ hết hạn/hủy; job chạy lại; tạo đơn khác ngay sau hạn | Lượt được nhả/không còn chiếm hạn mức; không phụ thuộc job đã dọn | Kiện Minh |
| W6-10 | Thanh toán/callback lặp; hủy đơn sau thanh toán | Chỉ dùng một lượt; hủy đã trả tiền không hoàn lượt | Kiện Minh + Kim Xuyến |
| W6-11 | Mã bị ẩn/hết hạn trong lúc đơn còn giữ hợp lệ; đúng biên hạn giữ | Theo quyết định mục 6; không tự đổi tiền đơn; hết hạn giữ được xử lý đúng | Kiện Minh + Tuấn Kiệt |
| W6-12 | Đơn đã bàn giao đủ một lần, nhận trả nhiều đợt, quá hạn hoặc chưa đối soát | Danh sách công việc đúng phần còn lại, không chỉ dựa vào một nhãn trạng thái | Tuấn Kiệt |
| W6-13 | Thiết bị đã bàn giao sau đó đổi sản phẩm hiện tại | Chỉ số thuê nhóm theo sản phẩm dòng đơn; không tính thiết bị mới gán nhưng chưa giao | Tuấn Kiệt + Minh Tú |
| W6-14 | Tỷ lệ hủy/khách quay lại có mẫu nhỏ và mẫu rỗng | Đúng định nghĩa mục 7, không chia 0; kết quả rỗng không giả thành tỷ lệ 0% | Tuấn Kiệt |
| W6-15 | Thu, hoàn tất đơn và hoàn tiền khác ngày như mục 13.3 | Doanh thu và dòng tiền vào đúng kỳ, cọc không thành doanh thu | Kim Xuyến |
| W6-16 | Một đơn nhiều dòng, nhiều lần thu/hoàn, nhiều phụ phí | Không nhân tổng do JOIN; tổng chi tiết khớp tổng giao dịch | Kim Xuyến |
| W6-17 | Giao dịch đã thu thật nhưng cần đối chiếu hoặc chưa phân loại đủ | Tiền thực thu vẫn hiện; phần ngoại lệ/chờ phân loại rõ; không tự thành doanh thu | Kim Xuyến |
| W6-18 | Cọc thu trước kỳ đang xem, bù một phần phí và có khoản hoàn chờ | Số dư hiện tại đầy đủ; tách cọc còn xử lý và nghĩa vụ hoàn, không cộng chồng | Kim Xuyến |
| W6-19 | Điều chỉnh đối soát ở kỳ sau, hoàn bổ sung thành công muộn hơn | Delta ghi đúng ngày chốt; dòng tiền đúng ngày thành công; số gốc giữ nguyên | Kim Xuyến |
| W6-20 | Có phí hủy, thu bổ sung và giá trị nhập trong cùng kỳ | Phí hủy tách riêng; không gọi tổng thu hoặc thu trừ nhập là lợi nhuận | Kim Xuyến + Minh Tú |
| W6-21 | Phiếu nhập nháp/hủy/xác nhận có ngày tạo khác ngày nhập thực tế | Chỉ lấy phiếu xác nhận, dùng ngày nhập thực tế đúng bộ lọc | Minh Tú |
| W6-22 | Điều chỉnh hai lần như mục 13.4 và phiếu chưa áp dụng | Delta liên tiếp đúng; không cộng snapshot; phiếu chưa áp dụng không tác động | Minh Tú |
| W6-23 | Phiếu điều chỉnh trong kỳ tác động lô nhập ngoài kỳ | Báo cáo sự kiện điều chỉnh vẫn có; báo cáo lô nhập giải thích rõ phạm vi | Minh Tú |
| W6-24 | Giáng cấp, bảo trì đang mở, bảo trì đã đóng và thiết bị không khả dụng | Nguồn nhập/sản phẩm hiện tại tách đúng; chi phí đang mở không coi là chi phí cuối cùng | Minh Tú |
| W6-25 | Truy nhật ký theo loại/mã, thời gian và dữ liệu JSON cũ | Đúng đối tượng/phân trang; JSON lỗi không làm hỏng cả danh sách; không sửa/xóa log | Thanh Tùng |
| W6-26 | Nhật ký có token/secret/dữ liệu nhạy cảm trong trước/sau | Response che dữ liệu theo danh sách cho phép, cả khi admin xem | Thanh Tùng |
| W6-27 | Khách/nhân viên gọi API quản trị; JWT của người vừa bị khóa/đổi quyền | Từ chối đúng, gồm export và truy vấn có `scope=all` | Thanh Tùng + các chủ API |
| W6-28 | Bản ghi đúng 00:00, cuối ngày có phần giây và đúng 00:00 ngày kế | Bộ lọc ngày Việt Nam không thiếu/đếm hai lần ở biên | Minh Tú + Kim Xuyến + Tuấn Kiệt |
| W6-29 | So sánh summary/detail/CSV cùng bộ lọc; chuỗi có nguy cơ công thức | Số liệu/quyền đồng nhất, chữ Việt đúng, ô văn bản an toàn, tiền âm vẫn là số | Minh Tú + Kim Xuyến + Tuấn Kiệt |
| W6-30 | Chạy luồng thuê tổng cùng chức năng Tuần 5, gồm trường hợp gửi thông báo lỗi | Trạng thái, tiền, thiết bị và nhật ký khớp; gửi lỗi không đảo giao dịch; nhận diện mock/thật | Tuấn Kiệt điều phối |
| W6-31 | Restart rồi nhận callback hoặc chạy lại job đã xử lý | Không trùng thu/hoàn/thông báo theo quy tắc; không mất dữ liệu lưu bền vững | Thanh Tùng + chủ service |
| W6-32 | Build và triển khai môi trường demo, kiểm tra quyền/luồng nhỏ | Có bằng chứng kiểm tra, cấu hình mẫu sạch secret, cách phục hồi; nếu chưa triển khai ghi Blocked | Thanh Tùng + Tuấn Kiệt |

## 16. Sản phẩm bàn giao và điều kiện đóng tuần

### 16.1 Mỗi người phải bàn giao

1. Service/interface, Controller và DTO thuộc phần được giao, đã ghép vào nhánh tích hợp theo quy trình của nhóm.
2. Danh sách endpoint, quyền gọi, request/response mẫu, lỗi thường gặp và ý nghĩa các trường số liệu.
3. Dữ liệu mẫu tái lập được, kết quả các ca nghiệm thu phụ trách và liên kết lỗi còn mở.
4. Ghi chú phụ thuộc service khác, cấu hình cần có và lựa chọn nghiệp vụ đã chốt; không giấu quy tắc trong controller.

### 16.2 Bộ bàn giao chung

| Sản phẩm | Người tổng hợp | Nội dung tối thiểu |
|---|---|---|
| API collection/OpenAPI theo cách nhóm đang dùng | Tuấn Kiệt, mỗi người bổ sung module | Endpoint, role, bộ lọc, ví dụ thành công/thất bại; giá trị secret để trống |
| Tài liệu định nghĩa báo cáo | Kim Xuyến cùng Minh Tú, Tuấn Kiệt | Công thức, ngày ghi nhận, nguồn dữ liệu, gốc/delta/hiệu lực, số dư hiện tại và ví dụ |
| Tài liệu chính sách/khuyến mãi | Thanh Tùng + Kiện Minh | Phiên bản hiệu lực, ảnh hưởng đơn cũ, quota và quyết định mã bị ẩn khi còn giữ |
| Biên bản nghiệm thu | Tuấn Kiệt | 32 ca có trạng thái, bằng chứng, lỗi chặn và kết quả kiểm tra lại |
| Hướng dẫn chạy/triển khai/phục hồi | Thanh Tùng | Commit/tag, cấu hình mẫu, database, job, lưu tệp, tích hợp, môi trường và cách kiểm tra |
| Kịch bản demo | Cả nhóm | Một luồng có mã từ tạo đơn tới tất toán; báo cáo đối chiếu và nhật ký; một luồng lỗi |

### 16.3 Điều kiện đánh dấu hoàn tất

- [ ] Các API trong phạm vi ưu tiên đã ghép và chạy được; hợp đồng API phản ánh implementation thực tế.
- [ ] Các ca bắt buộc đạt; lỗi chặn về tiền, dữ liệu, quota, chính sách và quyền đã sửa, kiểm tra lại.
- [ ] Số liệu mẫu khớp công thức; người khác có thể truy từ báo cáo về chứng từ để giải thích chênh lệch.
- [ ] Bản demo backend hoạt động ở môi trường đã thống nhất và kiểm tra sau triển khai có kết quả. Nếu mới chạy local, ghi rõ chỉ hoàn tất phần local; mục triển khai còn mở.
- [ ] Những phần frontend, provider thật, tối ưu hoặc tiện ích chưa làm được ghi thành việc còn lại có chủ sở hữu, không gộp vào trạng thái đã hoàn tất.
- [ ] Tài liệu đủ để thành viên khác chạy, kiểm tra và tiếp tục bảo trì mà không cần tác giả ngồi bên cạnh.

**Phân công chốt:** Thanh Tùng — chính sách/nhật ký/triển khai; Kiện Minh — khuyến mãi; Minh Tú — báo cáo kho; Kim Xuyến — báo cáo tài chính; Tuấn Kiệt — báo cáo vận hành/nghiệm thu. Tất cả phát triển trên Entities đã có.
