# GearGo — Week 3: Nhập kho, chuẩn bị và bàn giao

> **Kế hoạch backend chi tiết — bản tái cấu trúc theo tên thành viên.** Week 2 đã hoàn thành theo xác nhận của nhóm; toàn bộ Entities đã viết. Phạm vi giao việc là Service, Controller, interface, DTO và tích hợp/kiểm tra cần thiết. Với Week 3, các tuần trước là điều kiện đầu vào cần chạy được khi bắt đầu triển khai.

**Nhóm:** Thanh Tùng (Người 1), Kiện Minh (Người 2), Minh Tú (Người 3), Kim Xuyến (Người 4), Tuấn Kiệt (Người 5). Tên này là tên thành viên phát triển, không phải role của tài khoản trong hệ thống.

**Nền tảng:** ASP.NET Core Web API, EF Core, SQL Server, JWT, JSON; React gọi API riêng. Dùng phiên bản/cấu hình đang chạy trong repo của nhóm.

**Tài liệu chuẩn:** đặc tả `GearGo_Dac_Ta_Nghiep_Vu(7).md`, ERD bản `erd.txt` và nền tảng Plan Week 2 đã hoàn thành. Bản `ERD(20260925-062324).dbml` cũ thiếu `THIET_BI.ma_san_pham_hien_tai` và FK tương ứng; bản `erd.txt` gửi sau có chúng và khớp đặc tả giáng cấp. Bốn plan dùng bản `erd.txt` làm chuẩn, không sửa các tài liệu nguồn.

**Cách đọc:** bảng mục 2 cho biết ai làm gì; các task có mã `W3-Tn`; từng task nêu hợp đồng request/response, method, quy tắc nghiệp vụ, luồng xử lý, lỗi và ca nghiệm thu. Các request mẫu cần thay ID bằng dữ liệu seed thực tế. Ngày/giờ trong JSON là fixture; đặt đồng hồ kiểm thử phù hợp với điều kiện trước/sau nghiệp vụ, không gửi nguyên ngày mẫu vào môi trường thật. Ngày 1–5 là ngày làm việc, chưa gắn ngày lịch.

## 1. Phạm vi và đầu ra cuối tuần

| Phần việc | Phạm vi Tuần 3 | Đầu ra nghiệm thu |
|---|---|---|
| UC02 — Hồ sơ, theo dõi đơn | Sửa hồ sơ; mở rộng API đọc đơn đã có | Khách xem đúng dữ liệu của mình, thấy tiến độ và phiếu bàn giao |
| UC17 — Nhà cung cấp | Tra cứu, tạo, sửa, ngừng hợp tác, xem lịch sử nhập | Có nguồn nhập hàng hợp lệ và lịch sử chứng từ |
| UC18 — Phiếu nhập nháp | Tạo/sửa đầu phiếu, thêm/sửa/xóa dòng, tính tổng | Lưu nháp không tạo thiết bị hoặc tăng khả dụng |
| UC19 — Xác nhận nhập kho | Kiểm tra hàng thực nhận, sinh thiết bị, chốt chứng từ | Một phiếu chỉ tăng kho một lần, toàn bộ hoặc không có gì |
| UC20 — Tra cứu và bảo vệ phiếu nhập | Lọc phiếu, xem chi tiết, hủy nháp, chặn sửa phiếu đã chốt | Giữ được lịch sử; không đảo nhập kho bằng thao tác hủy nháp |
| UC10 — Chuẩn bị đơn | Tra cứu vận hành, gán/đổi thiết bị, xác nhận sẵn sàng | Đủ đúng thiết bị, đúng sản phẩm, không trùng lịch |
| UC11 — Bàn giao | Lập nháp, ghi nhận xác nhận khách, chốt đủ một lần | Đơn và thiết bị chuyển sang đang thuê, có biên bản |
| Hỗ trợ các luồng trên | Mở rộng kiểm tra khả dụng; ghi lịch sử và thông báo trong ứng dụng | Không trừ cam kết hai lần; truy được người thực hiện |

**Ranh giới triển khai:**

- Không giao lại việc tạo Entities, DbSet, Fluent API hay migration. Nếu tích hợp phát hiện lỗi mapping thực tế thì ghi lỗi cụ thể để người đang quản lý mô hình xử lý, không tự đổi ERD hoặc thêm cột cho tiện code.
- Không viết lại đăng nhập, giỏ thuê, tạo đơn, báo giá, thanh toán mock, CRUD danh mục/sản phẩm đã xong Tuần 2. Chỉ nối các API này vào luồng mới và sửa điểm tích hợp cần thiết.
- **UC20 chưa hoàn thành toàn bộ trong Tuần 3:** phần lập/duyệt/áp dụng điều chỉnh chứng từ đã nhập kho đi cùng điều chỉnh kho UC22 ở Tuần 5. Tuần này API phải từ chối sửa/xóa/hủy phiếu đã nhập và trả lý do rõ ràng.
- Khi nhập thiết bị lỗi nhưng vẫn chấp nhận mua, phải tạo phiếu bảo trì tối thiểu trong cùng giao dịch nhập kho. Chưa làm toàn bộ API sửa chữa, hoàn tất bảo trì hoặc giáng cấp thiết bị của UC16.
- UC02 đọc dữ liệu trả hàng, phụ phí, hoàn tiền nếu đã có; khi chưa có thì trả danh sách rỗng. Không vì màn hình theo dõi đơn mà triển khai trước nghiệp vụ Tuần 4.
- Thông báo “Sẵn sàng nhận” tuần này được lưu vào `THONG_BAO` và có API đọc/đánh dấu đã đọc. Gửi email/SMS và cơ chế thử gửi lại đầy đủ để giai đoạn thông báo sau.
- Nhận trả, quá hạn, phụ phí, đối soát, hoàn cọc, hủy sau thanh toán và các ngoại lệ thanh toán còn lại giữ ở Tuần 4. Không nghiệm thu toàn bộ vòng đời đơn trong tuần này.

## 2. Bảng phân công cho 5 người

| Người | Module chịu trách nhiệm | Service mới / mở rộng | Controller phụ trách | Task |
|---|---|---|---|---|
| **Thanh Tùng** | Hồ sơ, truy vấn đơn, lịch sử và thông báo tối thiểu; tích hợp chung | Mới: `HoSoService`, `TruyVanDonThueService`, `LichSuNghiepVuService`, `ThongBaoService` | Mới: `HoSoController`, `ThongBaoController`, `VanHanh/DonThueController`; mở rộng GET trong `DonThueController` khách hàng | W3-T1, W3-T2, W3-T9 |
| **Kiện Minh** | Nhà cung cấp và phiếu nhập nháp | Mới: `NhaCungCapService`, `PhieuNhapService` | `NhaCungCapController`, `PhieuNhapController` | W3-T3, W3-T4 |
| **Minh Tú** | Xác nhận nhập kho, tra cứu thiết bị và kiểm tra khả dụng dùng chung | Mới: `NhapKhoService`, `ThietBiService`; mở rộng `KhaDungService` Tuần 2 | `ThietBiController`; cung cấp method xác nhận để Kiện Minh nối vào `PhieuNhapController` | W3-T5, W3-T6 |
| **Kim Xuyến** | Chuẩn bị đơn và phân công thiết bị | Mới: `ChuanBiDonService`, `PhanCongThietBiService` | `ChuanBiDonController` | W3-T7 |
| **Tuấn Kiệt** | Lập và chốt bàn giao, kiểm tra luồng từ chuẩn bị đến đang thuê | Mới: `BanGiaoService` | `BanGiaoController` | W3-T8 |

Mỗi người viết interface `I...Service`, implementation, DTO và kiểm tra API của module mình. **Mỗi Controller có một người sửa chính**; người khác bàn giao interface và DTO để gọi, tránh cùng sửa một file.

Thanh Tùng tổng hợp đăng ký DI và tích hợp `Program.cs`; các thành viên gửi danh sách service cần đăng ký. Đây là nối Service/Controller mới vào dự án, không phải khởi tạo lại nền tảng.

## 3. Quy ước chung trước khi code

### 3.1 Service, Controller và phân quyền

- Controller nhận request, lấy danh tính từ JWT, gọi service và trả HTTP. Kiểm tra nghiệp vụ, tính tiền, giao dịch database và chuyển trạng thái đặt ở service.
- Dùng lại `Result<T>`/`Result`, exception nghiệp vụ và middleware lỗi của Tuần 2. Thống nhất 400 dữ liệu sai, 401 chưa xác thực, 403 không có quyền, 404 không tìm thấy, 409 xung đột trạng thái/lịch/mã trùng.
- Các route trong kế hoạch là route đề xuất. Nếu dự án đã có route tương đương thì mở rộng route hiện có, tránh tạo hai API làm cùng việc.
- Khách chỉ truy cập dữ liệu của mình. Service tự xác định `MaKhachHang` từ tài khoản đăng nhập, không nhận một mã khách tùy ý từ body rồi tin tưởng sử dụng.
- Nhóm API vận hành dành cho `NhanVien` và `QuanTriVien`. Tạo/sửa nhà cung cấp và xác nhận nhập kho chỉ dành cho `QuanTriVien`.
- Tài khoản có quyền vận hành phải liên kết được với `NHAN_VIEN` để ghi FK chứng từ, kể cả tài khoản quản trị viên. `MaTaiKhoan` và `MaNhanVien` là hai mã khác nhau, không lấy thay cho nhau.
- Lấy người lập, người xác nhận, người bàn giao từ phiên đăng nhập; server quyết định thời điểm thao tác. Không cho client tự chọn người phê duyệt hoặc tự đặt trạng thái đích.
- Kiểm tra trạng thái tài khoản và quyền hiện tại cho thao tác ghi quan trọng; JWT cũ không tự vượt qua việc khóa tài khoản hoặc ngừng quyền nhân viên. Khách bị khóa không được tạo giao dịch mới, nhưng nhân viên vẫn xử lý đơn đang thuê của khách đó.
- Không có endpoint chung `PUT trang-thai` cho phép nhảy tùy ý giữa các trạng thái. Mỗi hành động nghiệp vụ có điều kiện cụ thể.

### 3.2 Dữ liệu và giao dịch

- ID dùng `long`, tiền dùng `decimal`; thời gian lưu/truyền theo quy ước UTC của Tuần 2 và hiển thị giờ Việt Nam.
- Dùng các enum đã có. Tên trạng thái trong kế hoạch là tên tham chiếu; nếu code hiện tại đặt tên khác nhưng cùng ý nghĩa thì ánh xạ thống nhất, không tạo thêm trạng thái trùng nghĩa.
- DTO trả về chỉ chứa dữ liệu cần thiết; không trả Entity nguyên khối, mật khẩu băm hoặc nhật ký nội bộ cho khách.
- Số tiền, tổng số lượng, trạng thái, quyền sở hữu và tính hợp lệ đều được tính/kiểm tra ở server.
- Xác nhận nhập kho, đổi phân công và chốt bàn giao phải có transaction. Thao tác gọi service phụ dùng chung `DbContext` và transaction; không tự commit một nửa nghiệp vụ.
- Các thao tác cạnh tranh trên cùng phiếu/đơn/thiết bị phải khóa hoặc cập nhật có điều kiện tại database. Không chỉ dùng `lock` trong bộ nhớ ứng dụng. Với nhiều thiết bị, khóa theo thứ tự mã thống nhất để giảm nguy cơ deadlock.
- Kiểm tra rồi ghi phải nằm trong cùng transaction. Đọc tình trạng lúc hiển thị danh sách không thay thế việc kiểm tra lại khi xác nhận.

### 3.3 Những quan hệ ERD phải dùng đúng

| Điểm cần nhớ | Cách triển khai |
|---|---|
| Sản phẩm hiện tại của thiết bị | Dùng `THIET_BI.ma_san_pham_hien_tai` khi tìm/gán thiết bị cho đơn |
| Nguồn nhập ban đầu | `THIET_BI.ma_chi_tiet_phieu_nhap` → `CHI_TIET_PHIEU_NHAP` → `PHIEU_NHAP_HANG` → `NHA_CUNG_CAP`; không thay FK nguồn nhập khi đổi sản phẩm hiện tại sau này |
| Thành tiền dòng nhập | Tính `so_luong × don_gia_nhap` trong service/response; ERD không có cột `thanh_tien` ở chi tiết phiếu nhập |
| Thiết bị đã gán | Lưu trong `PHAN_CONG_THIET_BI`, không thêm trạng thái sử dụng `DangGiu` |
| Lịch thuê của phân công | Lấy từ dòng đơn → đơn thuê; bảng phân công không có cột giờ nhận/giờ trả riêng |
| Bàn giao của đơn | `PHIEU_BAN_GIAO.ma_don_thue` unique: một đơn có tối đa một phiếu bàn giao |
| Thiết bị trong bàn giao | Chi tiết bàn giao tham chiếu `ma_phan_cong` unique; đi qua phân công để biết thiết bị |
| Số lượng bàn giao | Mỗi chi tiết tương ứng một thiết bị; đếm các dòng hợp lệ, không thêm cột số lượng hoặc mã thiết bị vào Entity bàn giao |
| Người ghi lịch sử | Lịch sử đơn/thiết bị và nhật ký dùng `MaTaiKhoan`; chứng từ nhập/bàn giao dùng `MaNhanVien` theo FK |
| Số lần cho thuê | ERD hiện tại không có cột này trên thiết bị; nếu cần hiển thị thì đếm từ bàn giao đã chốt, không thêm cột trong Tuần 3 |


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


## 4. W3-T1 — Hồ sơ khách hàng và theo dõi đơn (Thanh Tùng)

### 4.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC02. **Dữ liệu dùng:** `TAI_KHOAN`, `KHACH_HANG`, đơn thuê và các chứng từ liên quan đã có Entities.

**Service/Controller:** `IHoSoService` + `HoSoService`; `ITruyVanDonThueService` + `TruyVanDonThueService`; `HoSoController`; mở rộng phần GET của `DonThueController` hiện có; tạo `VanHanh/DonThueController` cho truy vấn nhân viên.

**Method cần có:**

- `LayHoSoCuaToiAsync`, `CapNhatHoSoCuaToiAsync`.
- `LayDonCuaToiAsync`, `LayChiTietDonCuaToiAsync`, `LayLichSuDonCuaToiAsync`.
- `TimDonVanHanhAsync`, `LayChiTietDonVanHanhAsync`.

**Checklist nghiệp vụ:**

- [ ] Xem/sửa họ tên, liên hệ, địa chỉ, ngày sinh, ảnh đại diện theo các trường hiện có; email/số điện thoại cập nhật ở `TAI_KHOAN`, phần hồ sơ ở `KHACH_HANG` trong cùng transaction.
- [ ] Kiểm tra email/số điện thoại hợp lệ và không trùng tài khoản khác, kể cả khi có hai yêu cầu cập nhật đồng thời. Không cho sửa vai trò, trạng thái khóa hoặc mã tài khoản qua DTO hồ sơ.
- [ ] Đổi hồ sơ không sửa `ten_nguoi_nhan`, `so_dien_thoai_nguoi_nhan`, `email_lien_he` hoặc snapshot trên đơn cũ.
- [ ] Danh sách đơn có lọc mã đơn, thời gian, trạng thái và phân trang; khách chỉ nhận đơn của mình.
- [ ] Chi tiết đơn trả các dòng thuê, giá lúc đặt, lịch nhận/trả, thanh toán, lịch sử trạng thái, phiếu bàn giao; các phần nhận trả/phụ phí/hoàn tiền trả dữ liệu nếu có, rỗng nếu chưa có.
- [ ] Khi mở trực tiếp một phiếu/biên bản từ phía khách vẫn kiểm tra phiếu thuộc đơn của khách; không chỉ kiểm tra lúc lấy danh sách đơn.
- [ ] Truy vấn vận hành tìm theo mã đơn, tên/số điện thoại người nhận hoặc khách hàng, khoảng ngày và trạng thái; có bộ lọc đơn cần chuẩn bị/cần giao.
- [ ] Dữ liệu trả cho khách không chứa giá nhập, thông tin nội bộ nhà cung cấp, ghi chú quản trị hoặc bằng chứng không được phép công khai.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET, PUT | `/api/ho-so/toi` | Khách hàng |
| GET | `/api/don-thue` | Khách hàng; mở rộng API cũ |
| GET | `/api/don-thue/{id}` | Chủ đơn; mở rộng API cũ |
| GET | `/api/don-thue/{id}/lich-su` | Chủ đơn |
| GET | `/api/van-hanh/don-thue` | Nhân viên, quản trị viên |
| GET | `/api/van-hanh/don-thue/{id}` | Nhân viên, quản trị viên |

**Nghiệm thu:** Khách A không xem/sửa dữ liệu của B bằng cách đổi ID; đổi số điện thoại hồ sơ không đổi thông tin người nhận của đơn đã đặt; nhân viên tìm được đơn đã xác nhận để chuẩn bị.

### 4.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/Interfaces/IHoSoService.cs`
- [ ] `Services/HoSoService.cs`
- [ ] `Services/Interfaces/ITruyVanDonThueService.cs`
- [ ] `Services/TruyVanDonThueService.cs`
- [ ] `Models/DTOs/HoSo/`
- [ ] `Models/DTOs/DonThue/`
- [ ] `Controllers/HoSoController.cs`
- [ ] `Controllers/VanHanh/DonThueController.cs`
- [ ] `Controllers/DonThueController.cs (mở rộng GET)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 4.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| CapNhatHoSoRequest | hoTen, email, soDienThoai, diaChi?, ngaySinh?, anhDaiDien? | Trường liên hệ hợp lệ/không trùng; ngày sinh không ở tương lai; avatar là tệp hợp lệ; không nhận role/trạng thái tài khoản. |
| TimDonRequest | maDon?, tuNgay?, denNgay?, trangThai?, trang, soMoiTrang | Khách bị cố định scope mã khách từ JWT; nhân viên tìm trong phạm vi vận hành. |
| HoSoResponse | maKhachHang, hoTen, email, soDienThoai, diaChi, ngaySinh, anhDaiDien | Không trả mật khẩu băm; email/SĐT từ tài khoản, hồ sơ từ KHACH_HANG. |
| DonChiTietResponse | mã/giờ/trạng thái đơn, dòng giá snapshot, tiền đã thu, bàn giao, lịch sử, thao tác khả dụng | Các phần nhận trả/phí/hoàn chưa phát sinh là mảng rỗng; danh sách thao tác là gợi ý UI, API vẫn kiểm tra lại quyền. |


### 4.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayHoSoCuaToiAsync(actor) | HoSoResponse | Đọc TAI_KHOAN → KHACH_HANG; chỉ chủ hồ sơ. |
| CapNhatHoSoCuaToiAsync(request, actor) | Hồ sơ mới | Ghi TAI_KHOAN + KHACH_HANG + audit cùng transaction; không sửa snapshot đơn. |
| LayDonCuaToiAsync(filter, actor) | Trang DonTomTatResponse | Lọc chủ đơn tại query trước count/phân trang. |
| LayChiTietDonCuaToiAsync(donId, actor) | DonChiTietResponse | Kiểm tra chủ đơn trước khi tải các chứng từ/ảnh. |
| LayLichSuDonCuaToiAsync(donId, actor) | Timeline phù hợp cho khách | Scope chủ đơn trước query, lọc sự kiện/ghi chú nội bộ, sort giờ + ID. |
| TimDonVanHanhAsync(filter, actor) | Trang đơn vận hành | Nhân viên/admin đang hoạt động; truy mã/SĐT có phân trang. |
| LayChiTietDonVanHanhAsync(donId, actor) | Chi tiết vận hành có các việc cần xử lý | Kiểm quyền hiện tại, ghép các projection chứng từ, không trả raw Entity. |
| LayBienBanBanGiaoCuaKhachAsync(donId, actor) | Biên bản đã chốt của chủ đơn | Join PHIEU_BAN_GIAO → chi tiết; che ghi chú nội bộ không dành cho khách. |


### 4.D. Trình tự triển khai và tích hợp

1. Chốt DTO khách và DTO vận hành riêng; thêm trường mới theo nhu cầu Week 3 vào API đọc đơn Week 2 để giữ tương thích.
2. Load tài khoản/hồ sơ theo actor, kiểm tra độ dài/kiểu liên hệ và unique; trường gửi rỗng/null phải quy định rõ là bỏ trống hay xóa giá trị.
3. Khi sửa, lưu cả tài khoản và hồ sơ cùng transaction; unique database là bảo vệ cuối nếu hai khách đổi sang cùng SĐT.
4. Truy vấn đơn bằng projection riêng cho danh sách; chỉ tải dòng/chứng từ khi mở chi tiết để tránh nhân bản đơn và N+1.
5. Map HTTP qua Result/middleware Week 2; cung cấp request thành công, liên hệ trùng và đọc đơn ngoài quyền cho nhóm frontend.
6. Tích hợp DTO biên bản từ Tuấn Kiệt sau khi có phiếu giao thật; ảnh chỉ hiện khi actor có quyền xem chứng từ.

### 4.E. Ví dụ contract

Ví dụ `PUT /api/ho-so/toi`:
```json
{"hoTen":"Khách Demo","email":"khach@example.com","soDienThoai":"0900000001","diaChi":"TP.HCM"}
```
Không có `maKhachHang` trong body; server xác định qua phiên đăng nhập.

### 4.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| LIEN_HE_DA_TON_TAI | 409 | Email hoặc SĐT thuộc tài khoản khác; hồ sơ cũ không đổi. |
| HO_SO_KHONG_HOP_LE | 400 | Lỗi theo trường, không echo dữ liệu nhạy cảm không cần thiết. |
| DON_KHONG_TIM_THAY | 404 | Không tồn tại hoặc ngoài phạm vi chủ theo policy chung. |
| TAI_KHOAN_BI_KHOA | 403 | Actor không được cập nhật hồ sơ/tạo thao tác mới theo quyền hiện tại. |


### 4.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T1-A01 | Khách A sửa hồ sơ và mở đơn đã đặt trước đó | Hồ sơ mới thay đổi; tên/SĐT nhận hàng và giá trên đơn cũ giữ nguyên. |
| W3-T1-A02 | Khách A dùng donId/ảnh biên bản của B | Không nhận nội dung chứng từ/ảnh của B. |
| W3-T1-A03 | Hai tài khoản đổi sang cùng SĐT đồng thời | Một request thành công, request còn lại 409; không cập nhật dở dang hồ sơ. |
| W3-T1-A04 | Đơn chưa bàn giao mở chi tiết | Mảng biên bản rỗng; không lỗi 500 hoặc tự tạo phiếu. |


**Đóng W3-T1:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 5. W3-T2 — Lịch sử và thông báo tối thiểu (Thanh Tùng)

### 5.0. Phạm vi, quy tắc nghiệp vụ và API

**Service/Controller:** `ILichSuNghiepVuService` + `LichSuNghiepVuService`; `IThongBaoService` + `ThongBaoService`; `ThongBaoController`.

**Method cần có:** `GhiChuyenTrangThaiDon`, `GhiThayDoiThietBi`, `GhiNhatKyThaoTac`, `TaoThongBaoSanSangNhan`, `LayThongBaoCuaToiAsync`, `DanhDauDaDocAsync`.

- [ ] Nếu Tuần 2 đã có helper ghi lịch sử, mở rộng helper đó thay vì viết thêm một cách ghi độc lập.
- [ ] Ghi trước/sau, người thực hiện, thời gian, lý do và tham chiếu chứng từ bằng đúng các bảng lịch sử/nhật ký hiện có.
- [ ] Service nghiệp vụ gọi helper ghi lịch sử trong cùng transaction. Helper không tự commit transaction của bên gọi.
- [ ] Phân công/hủy phân công lưu lịch sử ở bản ghi phân công và nhật ký; không giả lập thiết bị đổi trạng thái sử dụng khi nó vẫn ở kho.
- [ ] Khi đơn thực sự chuyển sang sẵn sàng nhận, lưu thông báo trong ứng dụng cho tài khoản khách; lưu `ma_su_kien` ổn định cho sự kiện đó.
- [ ] Chống tạo lặp bằng kiểm tra/cập nhật trạng thái đơn và kiểm tra sự kiện trong transaction đã khóa đơn; không mặc định ERD có unique index trên `THONG_BAO.ma_su_kien`.
- [ ] Bấm lại hành động đã thành công không sinh thêm lịch sử chuyển trạng thái hay thêm cùng thông báo. Một lần chuyển trạng thái mới hợp lệ sau xử lý lại có thể là sự kiện mới.
- [ ] API đọc thông báo và đánh dấu đã đọc chỉ cho chủ tài khoản; không cho client đổi nội dung hoặc người nhận.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/thong-bao` | Tài khoản đăng nhập, chỉ thông báo của mình |
| POST | `/api/thong-bao/{id}/da-doc` | Chủ thông báo |

**Bàn giao:** Interface và cấu trúc log trước cuối Day 1; implementation tối thiểu trong Day 2 để Kiện Minh, Minh Tú, Kim Xuyến, Tuấn Kiệt gọi ngay.

### 5.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/Interfaces/ILichSuNghiepVuService.cs`
- [ ] `Services/LichSuNghiepVuService.cs`
- [ ] `Services/Interfaces/IThongBaoService.cs`
- [ ] `Services/ThongBaoService.cs`
- [ ] `Controllers/ThongBaoController.cs`
- [ ] `Models/DTOs/ThongBao/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 5.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| GhiLichSuCommand (nội bộ) | đối tượng, ID, trạng thái trước/sau, actor, giờ server, lý do | Không có endpoint khách ghi lịch sử; chỉ tạo sau thay đổi nghiệp vụ thực sự. |
| TaoThongBaoCommand (nội bộ) | maTaiKhoan, maDonThue?, maSuKien, loaiSuKien, tieuDe, noiDung, kenhGui | Nội dung từ sự kiện đã xác nhận; khóa nghiệp vụ để chống trùng; THONG_BAO hiện không có unique mã sự kiện. |
| ThongBaoResponse | maThongBao, maDonThue?, tieuDe, noiDung, thoiDiemTao, thoiDiemDoc | Không lộ lỗi adapter hoặc mã tài khoản người khác. |


### 5.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| GhiChuyenTrangThaiDon(command) | Thêm entry đang tracked | Ghi LICH_SU_TRANG_THAI_DON trong DbContext/transaction bên gọi; không commit riêng. |
| GhiThayDoiThietBi(command) | Thêm entry đang tracked | Ghi LICH_SU_TINH_TRANG_THIET_BI cùng thay đổi thiết bị. |
| GhiNhatKyThaoTac(command) | Thêm audit | NHAT_KY_THAO_TAC trước/sau có whitelist dữ liệu, mã đối tượng dạng chuỗi. |
| TaoThongBaoSanSangNhan(donId, eventKey) | Thông báo mới hoặc đã có | Ghi THONG_BAO cùng transaction chuyển sẵn sàng; chọn đúng tài khoản khách. |
| LayThongBaoCuaToiAsync(filter, actor) | Trang thông báo | Chỉ query tài khoản hiện tại, sort giờ + ID. |
| DanhDauDaDocAsync(id, actor) | Trạng thái đọc | UPDATE có điều kiện chủ thông báo; đã đọc thì giữ lần đọc đầu. |


### 5.D. Trình tự triển khai và tích hợp

1. Chốt với Kim Xuyến và Tuấn Kiệt chữ ký helper không tự mở transaction; trạng thái trước phải lấy từ dữ liệu đã khóa, không từ request.
2. Khóa sự kiện cho chuyển sẵn sàng gồm loại sự kiện, đơn và dấu chuyển trạng thái thật; dùng ID lịch sử chuyển trạng thái làm nguồn ổn định khi cần phân biệt lần sẵn sàng lại.
3. Ghi lịch sử, audit và thông báo trong cùng commit nghiệp vụ. Nếu đổi trạng thái thất bại, rollback chúng cùng nhau.
4. Quy định khóa logic gồm tài khoản, mã sự kiện và kênh gửi; dùng khóa đơn hoặc tài khoản nguồn trong cùng transaction để kiểm tra rồi tạo. ERD chưa có unique sự kiện nên không dựa vào constraint không tồn tại; thử lại cùng sự kiện nhận lại bản cũ. Một lần sẵn sàng mới sau đổi thiết bị là sự kiện mới có căn cứ.
5. API đọc/đã đọc chỉ phục vụ chủ thông báo; phần gửi email và retry đầy đủ nối ở Week 5, trạng thái trong ứng dụng không giả là email đã gửi.
6. Demo rollback giữa chừng: đơn/thiết bị, lịch sử và thông báo phải cùng không xuất hiện thay đổi dở dang.

### 5.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| THONG_BAO_KHONG_TIM_THAY | 404 | ID không thuộc tài khoản hiện tại hoặc không tồn tại. |
| SU_KIEN_KHONG_HOP_LE | 400 | Thiếu loại/key/chủ nhận hoặc object không có thật. |
| XUNG_DOT_SU_KIEN | 409 | Cùng key nhưng payload nghiệp vụ khác; không ghi đè thông báo cũ. |


### 5.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T2-A01 | Gọi lại helper thông báo cùng event key/kênh | Có một THONG_BAO, không phát sinh hai lần nhắc. |
| W3-T2-A02 | Chốt nghiệp vụ bị rollback sau khi đã thêm history tracked | Không có history/audit/thông báo của hành động thất bại. |
| W3-T2-A03 | Khách đánh dấu đọc ID người khác | Không cập nhật dòng, không trả nội dung. |
| W3-T2-A04 | Đơn sẵn sàng lần hai sau thay thiết bị | Có sự kiện riêng nếu thực sự chuyển trạng thái lại, key cũ không được tái dùng. |


**Đóng W3-T2:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 6. W3-T3 — Nhà cung cấp (Kiện Minh)

### 6.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC17. **Service/Controller:** `INhaCungCapService` + `NhaCungCapService`; `NhaCungCapController`.

**Method cần có:** `TimKiemAsync`, `LayChiTietAsync`, `TaoAsync`, `CapNhatAsync`, `DoiTrangThaiHopTacAsync`, `LayLichSuNhapAsync`.

- [ ] Tìm theo mã/tên/liên hệ/trạng thái; phân trang kết quả.
- [ ] Tạo mã nhà cung cấp không trùng; bắt buộc tên và ít nhất một kênh liên hệ. Kiểm tra định dạng email/số điện thoại nếu được nhập.
- [ ] Cảnh báo thông tin có khả năng trùng để quản trị viên kiểm tra; không tự đặt email/số điện thoại nhà cung cấp là unique khi ERD không quy định.
- [ ] Quản trị viên sửa thông tin hoặc ngừng hợp tác; nhân viên chỉ tra cứu.
- [ ] Nhà cung cấp ngừng hợp tác không được chọn cho phiếu mới; phải kiểm tra lại lúc xác nhận phiếu nháp cũ.
- [ ] Không xóa nhà cung cấp và lịch sử. Không cần endpoint xóa cứng trong phạm vi tuần này.
- [ ] Lịch sử nhập có phiếu, sản phẩm, ngày nhập, số lượng và giá trị; số tổng nhập chỉ cộng phiếu đã nhập kho, không cộng phiếu nháp/hủy.
- [ ] Sửa tên hoặc liên hệ nhà cung cấp không sửa snapshot trên phiếu đã nhập.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/nha-cung-cap`, `/api/nha-cung-cap/{id}` | Nhân viên, quản trị viên |
| POST | `/api/nha-cung-cap` | Quản trị viên |
| PUT | `/api/nha-cung-cap/{id}` | Quản trị viên |
| PUT | `/api/nha-cung-cap/{id}/trang-thai-hop-tac` | Quản trị viên |
| GET | `/api/nha-cung-cap/{id}/lich-su-nhap` | Nhân viên, quản trị viên |

**Nghiệm thu:** Nhân viên không thêm/sửa nhà cung cấp; nhà cung cấp ngừng hợp tác bị chặn ở cả bước lập và xác nhận phiếu; chứng từ cũ giữ nguyên thông tin lúc nhập.

### 6.A. Thành phần phải bàn giao — Kiện Minh

- [ ] `Services/Interfaces/INhaCungCapService.cs`
- [ ] `Services/NhaCungCapService.cs`
- [ ] `Controllers/NhaCungCapController.cs`
- [ ] `Models/DTOs/NhaCungCap/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 6.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TaoNhaCungCapRequest | maHienThi, ten, nguoiLienHe?, soDienThoai?, email?, diaChi?, maSoThue?, ghiChu? | Tên và ít nhất một liên hệ bắt buộc; mã unique; nghi trùng liên hệ là cảnh báo nếu ERD không unique. |
| CapNhatNhaCungCapRequest | Thông tin được sửa + lý do khi thay đổi đáng kể | Không sửa ID/FK hoặc snapshot chứng từ đã chốt. |
| DoiHopTacRequest | trangThaiHopTac, lyDo | Admin; chỉ enum được phép. |
| LichSuNhapResponse | phiếu đã nhập, ngày nhập thực tế, sản phẩm nguồn, lượng/giá trị gốc | Nháp/hủy không tính tổng đã nhập; phân trang cùng filter. |


### 6.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TimKiemAsync(filter, actor) / LayChiTietAsync(id, actor) | NCC trong phạm vi tra cứu | Nhân viên/admin; dữ liệu liên hệ cần cho nhập hàng. |
| TaoAsync(dto, actor) | ID và DTO NCC | Admin; INSERT NHA_CUNG_CAP + audit, unique race được xử lý. |
| CapNhatAsync(id, dto, actor) | NCC sau sửa | Admin; chỉ cập nhật master NCC, không sửa snapshot phiếu cũ. |
| DoiTrangThaiHopTacAsync(id, dto, actor) | Trạng thái mới | Admin; ngừng hợp tác không xóa lịch sử, không hủy phiếu đã nhập. |
| LayLichSuNhapAsync(id, filter, actor) | Trang và tổng nhập xác nhận | PHIEU_NHAP_HANG → CHI_TIET_PHIEU_NHAP; aggregate trước join thiết bị. |


### 6.D. Trình tự triển khai và tích hợp

1. Chuẩn hóa mã hiển thị/đầu vào liên hệ nhất quán với unique/collation hiện có, trả cảnh báo bản có khả năng trùng để admin quyết định.
2. Giới hạn role thao tác ghi tại controller và service; staff chỉ xem/tra NCC khi lập phiếu.
3. Tạo/sửa/dừng hợp tác đi kèm audit actor và lý do; giữ khóa master đủ để thao tác xác nhận nhập kiểm tra lại trạng thái hợp tác.
4. Lịch sử NCC đọc phiếu nguồn; count distinct phiếu và sum từng dòng, không nhân tiền khi một dòng có nhiều mã thiết bị.
5. Chuyển NCC ngừng hợp tác vẫn xem được phiếu cũ. Các phiếu nháp cũ phải kiểm tra lại NCC trước xác nhận, không dựa vào lúc chọn NCC ban đầu.

### 6.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| MA_NCC_TRUNG | 409 | Mã hiển thị đã tồn tại; không yêu cầu tạo Entity mới. |
| THIEU_LIEN_HE | 400 | Không có cả SĐT lẫn email hợp lệ. |
| KHONG_CO_QUYEN_NCC | 403 | Nhân viên/khách gọi action tạo/sửa/trạng thái. |


### 6.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T3-A01 | Nhân viên tạo NCC | 403, không có bản ghi mới. |
| W3-T3-A02 | Admin đổi tên NCC đã có phiếu nhập | Tên master đổi; tên snapshot phiếu cũ còn nguyên. |
| W3-T3-A03 | NCC ngừng sau khi đã lập nháp | Nháp còn để tra cứu/sửa, xác nhận nhập bị chặn. |
| W3-T3-A04 | Phiếu 1 dòng có 5 thiết bị | Tổng lịch sử tính 1 phiếu và đúng 5 chiếc, không nhân 5 lần giá trị dòng. |


**Đóng W3-T3:** Kiện Minh bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 7. W3-T4 — Phiếu nhập nháp và tra cứu (Kiện Minh)

### 7.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC18 và phần tra cứu/hủy nháp/khóa chứng từ của UC20.

**Service/Controller:** `IPhieuNhapService` + `PhieuNhapService`; `PhieuNhapController`. Action xác nhận nhập kho gọi `INhapKhoService` của Minh Tú; không chép logic nhập kho vào service nháp.

**Method cần có:** `TaoNhapAsync`, `CapNhatNhapAsync`, `ThemDongAsync`, `SuaDongAsync`, `XoaDongAsync`, `HuyNhapAsync`, `TimKiemAsync`, `LayChiTietAsync`.

- [ ] Tạo phiếu có mã riêng, nhà cung cấp, người lập, thời gian, chứng từ tham chiếu và ghi chú; trạng thái nháp. Lưu tên người lập theo trường snapshot hiện có.
- [ ] Người lập sửa/hủy phiếu nháp của mình; quản trị viên được sửa/hủy phiếu nháp theo quyền. Nhân viên khác được tra cứu, không tự sửa phiếu của đồng nghiệp.
- [ ] Phiếu mới có thể chưa có dòng trong lúc soạn; bắt buộc ít nhất một dòng hợp lệ trước khi xác nhận.
- [ ] Chỉ chọn sản phẩm đã khai báo. Số lượng nguyên dương, giá nhập không âm; giá 0 phải có lý do trong ghi chú.
- [ ] Gộp dòng cùng sản phẩm, cùng đơn giá và cùng tình trạng; nếu khác giá hoặc tình trạng thì giữ thành hai dòng.
- [ ] Tính thành tiền từng dòng và tổng phiếu ở server; không tin `TongTien` client gửi lên. Không đổi giá thuê hoặc cọc khi sửa giá nhập.
- [ ] Sửa/xóa dòng kiểm tra dòng thực sự thuộc phiếu trên route. Toàn bộ sửa dòng và cập nhật tổng diễn ra cùng transaction.
- [ ] Lưu nháp chỉ ghi đầu phiếu/dòng phiếu. Chưa tạo `THIET_BI` để “giữ mã”, chưa tăng kho và chưa tăng khả dụng.
- [ ] Hủy nháp bắt buộc lý do, giữ lịch sử; phiếu đã hủy không được xác nhận tiếp.
- [ ] Phiếu đã nhập không sửa số lượng/giá, không xóa dòng, không xóa/hủy cả phiếu. Trả lỗi yêu cầu xử lý bằng điều chỉnh ở giai đoạn sau.
- [ ] Danh sách lọc theo mã, nhà cung cấp, ngày, người lập, trạng thái. Chi tiết phiếu đã nhập hiển thị thiết bị thực tế cùng snapshot; phiếu nháp hiển thị rõ chưa nhập kho.
- [ ] Hàng giao nhiều đợt lập phiếu riêng theo từng đợt; cùng số chứng từ nhà cung cấp là trường hợp có thể hợp lệ, cần cảnh báo kiểm tra, không áp unique tùy tiện.

| Method | Endpoint đề xuất | Xử lý |
|---|---|---|
| GET | `/api/phieu-nhap`, `/api/phieu-nhap/{id}` | Tra cứu theo quyền |
| POST | `/api/phieu-nhap` | Tạo nháp |
| PUT | `/api/phieu-nhap/{id}` | Sửa đầu phiếu nháp |
| POST | `/api/phieu-nhap/{id}/chi-tiet` | Thêm dòng |
| PUT, DELETE | `/api/phieu-nhap/{id}/chi-tiet/{chiTietId}` | Sửa/xóa dòng nháp |
| POST | `/api/phieu-nhap/{id}/huy` | Hủy nháp |
| POST | `/api/phieu-nhap/{id}/xac-nhan` | Chỉ quản trị viên; gọi service Minh Tú |

**Nghiệm thu:** Tạo nháp 3 lều và 5 ghế vẫn chưa có thiết bị mới; sửa số lượng tự tính lại tổng; tài khoản khác không sửa trái quyền; phiếu đã nhập bị khóa ở mọi API ghi.

### 7.A. Thành phần phải bàn giao — Kiện Minh

- [ ] `Services/Interfaces/IPhieuNhapService.cs`
- [ ] `Services/PhieuNhapService.cs`
- [ ] `Controllers/PhieuNhapController.cs`
- [ ] `Models/DTOs/PhieuNhap/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 7.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TaoPhieuNhapRequest | maNhaCungCap, ngayNhapDuKien?, soChungTuNCC?, ghiChu? | Người lập từ actor; ngày thực tế chỉ chốt khi hàng có thật. |
| DongNhapRequest | maSanPham, soLuong, donGiaNhap, tinhTrangKhiNhap, ghiChu? | Lượng nguyên dương; giá >=0, giá 0 có lý do; không nhận thành tiền/tổng phiếu làm nguồn. |
| PhieuNhapResponse | mã/trạng thái, người lập, NCC, từng dòng, thành tiền/tổng, có thể sửa? | Tổng server tính; nháp phân biệt đã nhập; link thiết bị chỉ khi đã tạo. |
| HuyNhapRequest | lyDo | Chỉ nháp, người lập hoặc admin; kiểm tra lại state trong transaction. |


### 7.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TaoNhapAsync(dto, actor) | Phiếu nháp mới | INSERT PHIEU_NHAP_HANG; không tạo THIET_BI. |
| CapNhatNhapAsync(id, dto, actor) | Đầu phiếu mới | Khóa phiếu nháp, kiểm tra NCC, người lập/admin. |
| ThemDongAsync / SuaDongAsync / XoaDongAsync(phieuId, dongId?, dto, actor) | Chi tiết + tổng mới | Khóa phiếu trước; thao tác CHI_TIET_PHIEU_NHAP và tong_tien cùng tx. |
| HuyNhapAsync(id, lyDo, actor) | Phiếu đã hủy | Chỉ Nhap → DaHuy; giữ đầu/dòng, audit. |
| TimKiemAsync / LayChiTietAsync | Trang hoặc chi tiết | Lọc theo NCC/ngày/người/trạng thái; dữ liệu đã chốt dùng snapshot. |
| Controller.XacNhan(id, request) | Kết quả nhập của Minh Tú | Chỉ gọi INhapKhoService.XacNhanNhapKhoAsync; không ghi thiết bị tại controller. |


### 7.D. Trình tự triển khai và tích hợp

1. Tạo đầu phiếu trước; staff chỉ sửa phiếu nháp mình lập, admin sửa nháp theo quyền.
2. Khi thêm/sửa dòng, xác minh sản phẩm tồn tại; gộp dòng cùng sản phẩm + đơn giá + tình trạng theo UC18, khác bộ khóa thì giữ tách dòng.
3. Nếu sửa làm hai dòng trở nên cùng bộ khóa, gộp số lượng một cách nguyên tử và trả danh sách dòng/tổng mới để frontend tải lại ID hợp lệ.
4. Sửa/xóa dòng phải chứng minh dongId thuộc phieuId; cập nhật tổng từ mọi dòng còn lại, không dùng cộng trừ tạm từ client.
5. Khóa phiếu nháp ở mọi thao tác ghi để request sửa/hủy không chạy xuyên qua xác nhận nhập. Phiếu đã chốt không được đổi cả đầu lẫn dòng.
6. Bàn giao DTO xác nhận cho Minh Tú Day 1; action xác nhận phân quyền admin riêng dù controller có các action đọc cho staff.
7. Nhiều đợt giao của NCC dùng nhiều phiếu; số chứng từ tham chiếu trùng là cảnh báo kiểm tra, không tự coi unique nếu ERD không quy định.

### 7.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| PHIEU_KHONG_CON_NHAP | 409 | Phiếu đã nhập/đã hủy; trả trạng thái hiện tại. |
| DONG_KHONG_THUOC_PHIEU | 404 | Route trỏ chi tiết của phiếu khác. |
| GIA_NHAP_KHONG_HOP_LE | 400 | Giá âm hoặc 0 thiếu căn cứ. |
| NCC_NGUNG_HOP_TAC | 409 | Không lập/xác nhận với NCC ngừng hợp tác. |


### 7.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T4-A01 | Lưu 3 lều ×1.200.000 và 5 ghế ×200.000 | Tổng 4.600.000, số THIET_BI không tăng. |
| W3-T4-A02 | Thêm lại dòng cùng sản phẩm/giá/tình trạng | Gộp lượng, tổng đúng; khác giá giữ hai dòng. |
| W3-T4-A03 | Sửa dòng đồng thời xác nhận phiếu | Hoặc sửa xong rồi xác nhận dữ liệu mới, hoặc đã nhập thì sửa bị 409; không lệch tổng. |
| W3-T4-A04 | Đổi dongId sang dòng của phiếu khác | Không sửa/xóa được dù actor có quyền trên phiếu route. |


**Đóng W3-T4:** Kiện Minh bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 8. W3-T5 — Xác nhận nhập kho (Minh Tú)

### 8.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC19. **Service:** `INhapKhoService` + `NhapKhoService`; method chính `XacNhanNhapKhoAsync`. Controller do Kiện Minh giữ, action xác nhận chỉ gọi service này.

**DTO xác nhận gồm:** ngày nhập thực tế; danh sách theo từng dòng phiếu, mỗi dòng có danh sách mã thiết bị, tình trạng và phụ kiện thực nhận; thông tin lỗi/xử lý ban đầu nếu thiết bị được chấp nhận nhập nhưng cần bảo trì. Kiện Minh, Minh Tú chốt cùng một DTO trong Day 1.

**Trình tự trong một transaction:**

1. Kiểm tra quyền quản trị viên, xác định `MaNhanVien`; khóa phiếu và kiểm tra lại trạng thái nháp.
2. Kiểm tra nhà cung cấp còn hợp tác; phiếu có dòng hợp lệ; ngày nhập thực tế hợp lệ, không ở tương lai.
3. Dòng phiếu phải phản ánh số lượng thực nhận được chấp nhận. Hàng chưa giao/bị từ chối không được đưa vào số lượng xác nhận; nếu cần sửa số lượng thì sửa nháp trước khi xác nhận.
4. Mỗi dòng có đúng số mã thiết bị bằng `so_luong`. Mã không trùng trong request, không trùng dữ liệu đã có; dòng xác nhận phải thuộc đúng phiếu.
5. Tính lại tổng phiếu; chốt snapshot nhà cung cấp, tên sản phẩm theo dòng và tên người xác nhận bằng các trường ERD hiện có. Giữ snapshot tên người lập đã ghi khi lập phiếu.
6. Tạo thiết bị: gắn `ma_chi_tiet_phieu_nhap`, đặt `ma_san_pham_hien_tai` bằng sản phẩm của dòng nhập, lưu giá/ngày nhập, tình trạng và phụ kiện.
7. Thiết bị đạt kiểm tra nhận trạng thái sẵn sàng. Thiết bị lỗi vẫn được chấp nhận nhận về có trạng thái đang bảo trì và phiếu bảo trì tối thiểu liên kết thiết bị; ghi mô tả lỗi, người lập, thời điểm và bằng chứng hiện có.
8. Cập nhật phiếu sang đã nhập kho; ghi ngày xác nhận, người xác nhận, lịch sử thiết bị và nhật ký thao tác.
9. Commit toàn bộ. Bất kỳ bước nào lỗi thì rollback cả phiếu, thiết bị, phiếu bảo trì và lịch sử liên quan.

**Ràng buộc bắt buộc:**

- [ ] Hai request xác nhận cùng phiếu không thể cùng tạo thiết bị. Khóa phiếu/cập nhật trạng thái có điều kiện phải diễn ra trước phần tạo thiết bị trong cùng transaction.
- [ ] Với request lặp sau thành công: nếu dữ liệu khớp kết quả đã nhập thì trả kết quả cũ; nếu khác thì trả 409, không sửa chứng từ. Kiểm tra quyền trước khi trả kết quả cũ.
- [ ] Vi phạm unique mã thiết bị do cạnh tranh cũng phải rollback toàn bộ và trả lỗi rõ ràng; kiểm tra trước ở C# chưa đủ.
- [ ] Không dùng `MAX + 1` thiếu bảo vệ để tạo mã hiển thị; dùng cách sinh mã hiện có của dự án và xử lý xung đột unique.
- [ ] Không cộng số lượng trực tiếp vào `SAN_PHAM`; kho là danh sách thiết bị thực tế.
- [ ] Hàng lỗi được ghi sở hữu nhưng không tính khả dụng; không dựa vào ngày dự kiến sửa xong để hứa cho thuê.
- [ ] Service trả số thiết bị đã nhập, số sẵn sàng, số bảo trì và chi tiết phiếu để Controller phản hồi.

**Nghiệm thu:** Nhập 3 lều giá 1.200.000đ và 5 ghế giá 200.000đ → tổng 4.600.000đ, có 8 thiết bị; nếu 1 ghế cần sửa thì chỉ 7 thiết bị sẵn sàng. Xác nhận lần hai không tăng kho; một mã trùng khiến cả lần nhập thất bại.

### 8.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/Interfaces/INhapKhoService.cs`
- [ ] `Services/NhapKhoService.cs`
- [ ] `Models/DTOs/PhieuNhap/XacNhanNhapKhoRequest.cs`
- [ ] `Models/DTOs/PhieuNhap/KetQuaNhapKhoResponse.cs`
- [ ] `Services/BaoTriService.cs (helper tối thiểu dùng chung, hoàn thiện Week 5)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 8.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| XacNhanNhapKhoRequest | ngayNhapThucTe, danhSachDong[] | Ngày không tương lai; danh sách bao phủ đúng mọi dòng nháp đã kiểm tra. |
| DongXacNhanNhap | maChiTietPhieuNhap, thietBi[] | Số phần tử bằng lượng được chấp nhận của dòng; không gồm hàng bị từ chối/chưa giao. |
| ThietBiNhap | maHienThi, tinhTrang, phuKien[], ghiChu?, canBaoTri, moTaLoi?, bangChung? | Mã unique; canBaoTri phải có căn cứ; trạng thái cuối do server quyết định. |
| KetQuaNhapKhoResponse | maPhieu, trangThai, soDaNhap, soSanSang, soBaoTri, thietBi[] | Số đếm khớp thiết bị thực tế đã commit, không chỉ số request. |


### 8.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| XacNhanNhapKhoAsync(phieuId, request, actor) | KetQuaNhapKhoResponse | Ghi phiếu/thiết bị/bảo trì/history/audit cùng tx; endpoint do Kiện Minh sở hữu. |
| KiemTraDuLieuNhap (helper nội bộ) | Danh sách lỗi theo dòng/mã | Validate request, không commit hoặc tạo mã giữ chỗ thiết bị. |
| LapBaoTriKhiNhap (helper nội bộ) | Phiếu bảo trì tracked | Nguồn nhập là căn cứ; không tự gắn đơn thuê không tồn tại. |


### 8.D. Trình tự triển khai và tích hợp

1. Đọc actor admin và NHAN_VIEN hợp lệ; khóa phiếu nguồn trước khi xét trạng thái/replay. Nếu đã nhập, so nội dung request với kết quả chốt: khớp trả kết quả cũ, khác trả 409.
2. Tái kiểm tra NCC, dòng, ngày và dữ liệu nhập; mã hiển thị unique cả request và database. Tổng thiết bị mỗi dòng phải đúng số lượng đã chốt nháp.
3. Chốt snapshot NCC/sản phẩm và tên người xác nhận; giữ tên người lập lúc lập. Tính tổng từ lượng/giá đầu vào đã xác nhận.
4. Tạo thiết bị với FK dòng nhập bắt buộc và sản phẩm hiện tại từ dòng; giữ giá nhập gốc mỗi chiếc, tình trạng/phụ kiện thực nhận.
5. Đạt kiểm tra đặt SanSang; chiếc lỗi được nhận đặt DangBaoTri và tạo phiếu xử lý tối thiểu cùng tx. Không mượn ngày dự kiến sửa xong để báo có hàng.
6. Ghi phiếu DaNhapKho, ngày thực tế/ngày xác nhận, người và audit; commit tất cả. Unique conflict hoặc lỗi tạo chiếc cuối rollback cả lượt nhập.
7. Sau commit trả số chiếc đã lưu và làm mới cache khả dụng nếu có. Không đưa cập nhật cache vào điều kiện quyết định giao dịch database thành công.

### 8.E. Ví dụ contract

Payload minh họa cho một phiếu có đúng một dòng lượng 2:
```json
{"ngayNhapThucTe":"2026-10-05T02:00:00Z","danhSachDong":[{"maChiTietPhieuNhap":101,"thietBi":[{"maHienThi":"LEU-001","tinhTrang":"Đạt kiểm tra","phuKien":[],"canBaoTri":false},{"maHienThi":"LEU-002","tinhTrang":"Đạt kiểm tra","phuKien":[],"canBaoTri":false}]}]}
```
Tên tình trạng/phụ kiện map theo DTO/enum đã chốt; không đưa chuỗi minh họa vào enum nếu code đã có danh mục tương đương.

### 8.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| SO_MA_KHONG_KHOP | 400 | Chi tiết lỗi ghi ID dòng, lượng yêu cầu và số mã thực nhận. |
| MA_THIET_BI_TRUNG | 409 | Mã trùng trong DB hoặc request; rollback toàn bộ. |
| PHIEU_DA_NHAP_KHAC_DU_LIEU | 409 | Replay mang danh sách/ngày khác chứng từ chốt. |
| NGAY_NHAP_KHONG_HOP_LE | 400 | Ngày tương lai hoặc ngoài quy tắc kiểm tra. |


### 8.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T5-A01 | Phiếu 3 lều +5 ghế, 1 ghế lỗi được nhận | 8 thiết bị sở hữu, 7 SanSang, 1 DangBaoTri với phiếu xử lý; 4.600.000 gốc. |
| W3-T5-A02 | Hai request cùng phiếu đến đồng thời | Một lần nhập; request replay khớp nhận lại ID cũ. |
| W3-T5-A03 | Mã trùng ở phần tử cuối | Không có 7 chiếc được commit trước; phiếu còn nháp. |
| W3-T5-A04 | NCC ngừng đúng lúc xác nhận | Kiểm tra trạng thái trong ranh giới đồng thời đã chốt; không nhập dựa vào dữ liệu đọc cũ. |


**Đóng W3-T5:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 9. W3-T6 — Tra cứu thiết bị và mở rộng khả dụng (Minh Tú)

### 9.0. Phạm vi, quy tắc nghiệp vụ và API

**Service/Controller:** `IThietBiService` + `ThietBiService`; `ThietBiController`; mở rộng `IKhaDungService` + `KhaDungService` đã có, không tạo phiên bản khả dụng riêng cho mỗi module.

**Method mới đề xuất:** `TimKiemThietBiAsync`, `LayChiTietThietBiAsync`, `LayLichThietBiAsync`, `LayThietBiPhuHopChoDonAsync`, `KiemTraLichThietBiAsync`. Giữ các method khả dụng theo sản phẩm đang được API Tuần 2 sử dụng.

- [ ] Tra cứu theo mã thiết bị, sản phẩm hiện tại, tình trạng, trạng thái và nguồn nhập; truy được phiếu nhập, nhà cung cấp, giá nhập và lịch sử cho người có quyền vận hành.
- [ ] Khi chọn thiết bị cho đơn, so khớp `ma_san_pham_hien_tai` với sản phẩm của dòng đơn. Không suy ra sản phẩm hiện tại chỉ từ nguồn nhập ban đầu.
- [ ] Kiểm tra phiếu nhập nguồn đã xác nhận. Thiết bị bảo trì, thất lạc, ngừng sử dụng không được đưa vào danh sách đủ điều kiện.
- [ ] Lịch giao nhau dùng khoảng nửa mở: `batDauA < ketThucB && ketThucA > batDauB`. Hai lượt chạm mốc giờ không trùng lịch, nhưng bàn giao vẫn đòi hỏi thiết bị đã về và được kiểm tra.
- [ ] Thiết bị đang thuê có thể có lịch tương lai nếu ngày trả dự kiến nằm trước lượt mới và không quá hạn; việc gán tương lai không có nghĩa được bàn giao ngay khi thiết bị chưa về.
- [ ] Thiết bị đã quá hạn, chưa nhận trả và chưa có kết luận xử lý hợp lệ bị loại khỏi khả dụng chắc chắn. Không tự đổi về sẵn sàng khi đồng hồ vượt giờ trả dự kiến.
- [ ] Một thiết bị có thể được phân công cho nhiều đơn ở các khoảng không giao nhau. Không đặt quy tắc “mỗi thiết bị chỉ có một phân công trong toàn bộ lịch sử”.
- [ ] Bỏ qua bản ghi phân công đã hủy. Khi kiểm tra lại một phân công đang tồn tại, loại chính phân công đó khỏi phép dò xung đột; vẫn kiểm tra mọi phân công khác.
- [ ] Cam kết của đơn đã xác nhận và phân công cho cùng dòng đơn chỉ chiếm số lượng **một lần**. Không lấy số lượng đơn rồi trừ tiếp toàn bộ thiết bị đã gán của chính đơn đó.
- [ ] Mở rộng phép tính của Tuần 2 để tôn trọng thiết bị đã được gán cố định: kết quả phải có khả năng bố trí các thiết bị xuyên suốt khoảng thuê, không chỉ đủ số lượng tại từng thời điểm. Nếu cần đổi phân công mới đủ, trả cảnh báo để nhân viên xử lý, không tự hứa có hàng.
- [ ] Danh sách thiết bị phù hợp chỉ là gợi ý tại lúc đọc. Service phân công/bàn giao phải gọi lại kiểm tra trong transaction trước khi ghi.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/thiet-bi`, `/api/thiet-bi/{id}` | Nhân viên, quản trị viên |
| GET | `/api/thiet-bi/{id}/lich` | Nhân viên, quản trị viên |
| GET | `/api/thiet-bi/phu-hop?maChiTietDon=...` | Nhân viên, quản trị viên |

**Ca nghiệm thu riêng:**

- 5 thiết bị, một đơn đặt 2 và đã phân công đúng 2 thiết bị: khả dụng cho cùng khoảng còn 3, không phải 1.
- Hai thiết bị A/B; A đã gán nửa đầu khoảng, B đã gán nửa sau: không báo chắc chắn nhận thêm một lượt thuê xuyên suốt cả khoảng khi chưa có phương án đổi phân công hợp lệ.
- Thiết bị đang thuê quá hạn không tự xuất hiện là có sẵn cho lượt tiếp theo; thiết bị chờ bảo trì sau nhập không xuất hiện trong danh sách chọn.

### 9.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/ThietBiService.cs`
- [ ] `Services/Interfaces/IThietBiService.cs`
- [ ] `Services/KhaDungService.cs (mở rộng)`
- [ ] `Services/Interfaces/IKhaDungService.cs (tương thích Week 2)`
- [ ] `Controllers/ThietBiController.cs`
- [ ] `Models/DTOs/ThietBi/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 9.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TimThietBiRequest | maHienThi?, maSanPhamHienTai?, trangThai?, nguonNhap?, trang, soMoiTrang | Phân biệt sản phẩm nguồn nhập và hiện tại; giới hạn truy vấn. |
| KiemTraLichRequest (nội bộ) | maThietBi, gioNhan, gioTra, maPhanCongLoaiTru? | Chỉ loại trừ bản ghi của chính nghiệp vụ đang cập nhật, xác minh thuộc đơn. |
| KiemTraLichResponse | duDieuKien, lyDo[], chungTuXungDot[], canBoTriLai? | Nhân viên xem căn cứ; khách chỉ nhận lượng/không đủ, không lộ đơn khác. |
| ThietBiResponse | ID/mã, nguồn nhập, sản phẩm gốc/hiện tại, trạng thái, lịch | Giá nhập giới hạn theo vai trò/công việc đã chốt; không expose công khai. |


### 9.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TimKiemThietBiAsync(filter, actor) / LayChiTietThietBiAsync(id, actor) | Trang/chi tiết | Read THIET_BI → dòng/phiếu nhập; truy lịch sử có phân trang. |
| LayLichThietBiAsync(id, khoang, actor) | Các phân công/giao đang hiệu lực | Bỏ phân công hủy, thể hiện giao thật chưa nhận trả. |
| LayThietBiPhuHopChoDonAsync(dongDonId, actor) | Danh sách có lý do đủ/chưa đủ | So sản phẩm hiện tại với dòng đơn, lịch/giữ chỗ/cam kết. |
| KiemTraLichThietBiAsync(request) | Kết quả kiểm tra không ghi | Dùng trong transaction phân công/chốt giao, không mở tx riêng. |
| LayKhaDungNhieuAsync(ids, gioNhan, gioTra) | Map mã sản phẩm → khả dụng bảo đảm | Tiếp tục phục vụ API Week 2; bổ sung ràng buộc phân công cố định và quá hạn. |


### 9.D. Trình tự triển khai và tích hợp

1. Phân loại dữ liệu đọc: pool thiết bị nhập đã xác nhận, lịch đơn chưa gán, phân công cố định, thiết bị thực giao chưa trả, và trạng thái không khai thác.
2. Gộp các biểu diễn của cùng dòng đơn thành một nhu cầu; phân công là cách đáp ứng nhu cầu đó, không cộng thêm một lần giữ.
3. Tính khoảng giao nhau nửa mở; với đồ đã giao, mốc bắt đầu thực tế sớm hơn dự kiến phải được tính. Quá hạn chưa trả chặn khả dụng chắc chắn, không kết thúc theo giờ dự kiến.
4. Kiểm tra rằng mỗi thiết bị được đề xuất dùng được trọn khoảng; ví dụ A bận nửa đầu/B bận nửa sau thì không hứa một chiếc thuê xuyên khoảng chỉ vì tổng số trống tại mỗi mốc là 1.
5. Chốt thuật toán bố trí có xét phân công cố định trong Day 1. Nếu phép đếm Week 2 chỉ cho cận số lượng mà chưa chứng minh bố trí, trả cần xử lý lại phân công; không âm thầm đổi các mã đã chuẩn bị.
6. Dùng cùng kiểm tra này ở tạo đơn/phân công/giao; đường đọc trả gợi ý, đường ghi tái kiểm tra dưới khóa nguồn khả dụng đã thống nhất với Week 2.
7. Bàn giao response lý do cụ thể cho Kim Xuyến và Tuấn Kiệt; thử seed hai lịch chạm biên, giao sớm, đồ chưa về và chưa có phân công.

### 9.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| KHOANG_THUE_KHONG_HOP_LE | 400 | Thiếu cặp giờ, trả <= nhận hoặc khoảng yêu cầu không hợp lệ. |
| THIET_BI_XUNG_DOT_LICH | 409 | Trả mã thiết bị và chứng từ xung đột cho staff có quyền. |
| THIET_BI_CHUA_SAN_SANG | 409 | Bảo trì/mất/ngừng/quá hạn/chưa về cho hành động giao. |
| CAN_BO_TRI_LAI | 409 | Lượng tổng có vẻ đủ nhưng phân công cố định chưa cho phương án xuyên khoảng. |


### 9.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T6-A01 | 5 chiếc, một đơn giữ 2 và đã gán 2 | Còn 3 cho khoảng trùng, không còn 1. |
| W3-T6-A02 | A bận nửa đầu, B bận nửa sau | Không khẳng định nhận thêm 1 chiếc xuyên cả khoảng nếu chưa có bố trí hợp lệ. |
| W3-T6-A03 | Lượt sau bắt đầu đúng giờ kết thúc trước | Không trùng lịch lý thuyết; vẫn không bàn giao nếu chiếc chưa về/kiểm tra. |
| W3-T6-A04 | Giao sớm thực tế 1 giờ | Chiếm dụng thêm giờ đó, lịch khác trùng bị phát hiện. |


**Đóng W3-T6:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 10. W3-T7 — Chuẩn bị đơn và phân công thiết bị (Kim Xuyến)

### 10.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC10. **Service/Controller:** `IChuanBiDonService` + `ChuanBiDonService`; `IPhanCongThietBiService` + `PhanCongThietBiService`; `ChuanBiDonController`.

**Method cần có:** `BatDauChuanBiAsync`, `LayTinhTrangChuanBiAsync`, `GanThietBiAsync`, `HuyPhanCongAsync`, `ThayTheThietBiAsync`, `XacNhanSanSangAsync`.

**Checklist nghiệp vụ:**

- [ ] Chỉ bắt đầu chuẩn bị đơn đã xác nhận thanh toán; chuyển `DaXacNhan → DangChuanBi`, ghi lịch sử người và thời gian.
- [ ] Gán thiết bị vào đúng `CHI_TIET_DON_THUE`. Kiểm tra thiết bị đúng sản phẩm hiện tại, đủ điều kiện và không trùng lịch bằng service Minh Tú.
- [ ] Không gán vượt số lượng đặt của từng dòng; một mã thiết bị không được xuất hiện hai lần trong cùng đơn đang hiệu lực.
- [ ] Khóa bản ghi thiết bị và dữ liệu cần thiết khi kiểm tra rồi tạo phân công. Hai nhân viên cùng chọn chiếc cuối cho hai lịch trùng chỉ có một thao tác thành công.
- [ ] Chưa bàn giao thì gán thiết bị không đổi trạng thái sử dụng sang đang thuê và không tăng số lượng cam kết của đơn.
- [ ] Hủy phân công lưu trạng thái hủy, người hủy, thời điểm và lý do trên bản ghi cũ; không xóa mất lịch sử.
- [ ] Thay thiết bị: kiểm tra chiếc mới, hủy phân công cũ và tạo phân công mới trong một transaction. Thất bại thì chiếc cũ vẫn giữ phân công hợp lệ.
- [ ] Nếu đang có phiếu bàn giao nháp tham chiếu phân công cũ, phải cập nhật/xóa chi tiết nháp liên quan trong cùng quy trình phối hợp với Tuấn Kiệt; không để chốt phiếu bằng phân công đã hủy.
- [ ] Đơn đã sẵn sàng nhưng cần đổi thiết bị phải chuyển về bước kiểm tra chuẩn bị, ghi lý do và xác nhận sẵn sàng lại sau khi đủ điều kiện. Đây là bước xử lý lại trước bàn giao, không được áp dụng sau khi phiếu đã chốt.
- [ ] Xác nhận sẵn sàng chỉ khi mỗi dòng được gán đủ số lượng, không thừa/thiếu, từng thiết bị đã được kiểm tra tình trạng/phụ kiện và vẫn đủ điều kiện giao.
- [ ] Khi xác nhận sẵn sàng để khách tới nhận, thiết bị phải thực tế ở kho và đạt kiểm tra; thiết bị còn ở lượt thuê trước có thể được lên lịch trước nhưng chưa được coi đã chuẩn bị xong.
- [ ] Chuyển `DangChuanBi → SanSangNhan`, ghi lịch sử và thông báo trong ứng dụng qua service Thanh Tùng.
- [ ] Thiếu đồ, hỏng hoặc quá hạn thì trả danh sách thiếu và lý do; không tự đổi sang sản phẩm khác, không giảm số lượng đã thanh toán, không bỏ qua để chuyển sẵn sàng.
- [ ] Đơn hủy/hết hạn/đang thuê không được nhận thêm phân công theo luồng chuẩn bị. Việc đổi thiết bị sau bàn giao không nằm trong API này.

| Method | Endpoint đề xuất | Chức năng |
|---|---|---|
| GET | `/api/chuan-bi-don/{donId}` | Mức độ chuẩn bị của từng dòng |
| POST | `/api/chuan-bi-don/{donId}/bat-dau` | Bắt đầu chuẩn bị |
| POST | `/api/chuan-bi-don/{donId}/phan-cong` | Gán một hoặc nhiều thiết bị |
| POST | `/api/chuan-bi-don/{donId}/phan-cong/{phanCongId}/huy` | Hủy phân công trước bàn giao |
| POST | `/api/chuan-bi-don/{donId}/phan-cong/{phanCongId}/thay-the` | Đổi thiết bị, bắt buộc lý do |
| POST | `/api/chuan-bi-don/{donId}/san-sang` | Kiểm tra và xác nhận sẵn sàng nhận |

Toàn bộ endpoint của module này dành cho nhân viên/quản trị viên. Mọi ID lồng trong route phải được kiểm tra thuộc đúng đơn, không chỉ kiểm tra bản ghi có tồn tại.

**Nghiệm thu:** Đơn đặt 2 lều phải có đúng 2 chiếc thuộc sản phẩm tương ứng; thiếu một chiếc không chuyển sẵn sàng. Đổi chiếc lỗi giữ lại lịch sử. Gán đồng thời cùng chiếc cho lịch trùng bị chặn; lịch không trùng có thể được gán trước theo điều kiện đã nêu.

### 10.A. Thành phần phải bàn giao — Kim Xuyến

- [ ] `Services/ChuanBiDonService.cs`
- [ ] `Services/Interfaces/IChuanBiDonService.cs`
- [ ] `Services/PhanCongThietBiService.cs`
- [ ] `Services/Interfaces/IPhanCongThietBiService.cs`
- [ ] `Controllers/ChuanBiDonController.cs`
- [ ] `Models/DTOs/ChuanBiDon/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 10.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| GanThietBiRequest | dongDonId, thietBiIds[] | ID unique, dòng thuộc đơn route, lượng không vượt thiếu; server lấy người gán/giờ. |
| ThayTheRequest | thietBiMoiId, lyDo | Giữ bản phân công cũ; mã mới đúng sản phẩm hiện tại và lịch. |
| ChuanBiResponse | từng dòng: cần, đã gán, còn thiếu, danh sách chiếc/lý do chặn; trạng thái đơn | Tổng theo từng dòng, không chỉ tổng toàn đơn. |
| XacNhanSanSangRequest | bằng chứng/ghi chú kiểm tra cần thiết theo contract | Không nhận trạng thái đích tùy ý; thiết bị đã có mặt/đạt kiểm tra. |


### 10.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| BatDauChuanBiAsync(donId, actor) | Trạng thái và phân công | DaXacNhan → DangChuanBi + history. |
| LayTinhTrangChuanBiAsync(donId, actor) | ChuanBiResponse | Đọc dòng đơn, phân công hiệu lực và kiểm tra thiết bị. |
| GanThietBiAsync(donId, dto, actor) | Danh sách phân công mới | Ghi PHAN_CONG_THIET_BI sau khóa và kiểm tra qua Minh Tú. |
| HuyPhanCongAsync / ThayTheThietBiAsync(donId, pcId, dto, actor) | Kết quả chuẩn bị mới | Hủy có lịch sử + gán mới atomically; phối hợp nháp bàn giao. |
| XacNhanSanSangAsync(donId, dto, actor) | SanSangNhan hoặc lỗi danh sách thiếu | Kiểm tra đủ từng dòng; history + thông báo cùng tx. |


### 10.D. Trình tự triển khai và tích hợp

1. Xác minh đơn hợp lệ và actor vận hành, đọc tiền/trạng thái xác nhận trước khi bắt đầu chuẩn bị; thống nhất khóa đơn cùng flow hủy/chốt giao.
2. Gán batch theo toàn bộ danh sách đã chọn: khóa dữ liệu khả dụng và các chiếc theo thứ tự, recheck sản phẩm/lịch/đã nhập/đủ số lượng; lỗi một chiếc rollback cả batch.
3. Hủy/thay không xóa phân công cũ; ghi actor/thời điểm/lý do. Đổi chiếc trong khi có nháp giao phải xóa/cập nhật chi tiết nháp trỏ chiếc cũ và vô hiệu xác nhận khách cũ nếu nội dung giao thay đổi.
4. Đơn SanSangNhan phải quay về kiểm tra chuẩn bị trước khi thay, ghi lịch sử; không áp thao tác này sau giao thật.
5. Xác nhận sẵn sàng theo từng dòng, thiết bị thực tế có mặt và phụ kiện đạt kiểm tra, gọi helper Thanh Tùng cùng transaction.
6. Trả DTO mới để giao diện tải lại; nếu chỉ báo tổng đã gán = tổng đặt nhưng lệch sản phẩm thì vẫn lỗi.

### 10.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DON_KHONG_CHO_CHUAN_BI | 409 | Đã hủy/hết hạn/đang thuê hoặc chưa trả tiền. |
| PHAN_CONG_VUOT_SO_LUONG | 409 | Trả cần/đã gán/còn thiếu từng dòng. |
| SAI_SAN_PHAM_THIET_BI | 409 | Sản phẩm hiện tại không khớp sản phẩm dòng đơn. |
| KHONG_DU_DIEU_KIEN_SAN_SANG | 409 | Danh sách chiếc/phụ kiện còn vướng. |
| PHAN_CONG_KHONG_THUOC_DON | 404 | ID lồng thuộc đơn khác. |


### 10.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T7-A01 | Đặt 2 lều +1 ghế, gán 3 lều | Không sẵn sàng; số lượng toàn đơn bằng nhau không đủ điều kiện. |
| W3-T7-A02 | Hai nhân viên gán cùng chiếc cho hai lịch trùng | Chỉ một thao tác thành công; không có hai phân công hiệu lực. |
| W3-T7-A03 | Thay chiếc sau khi khách xác nhận nháp bàn giao | Nháp được cập nhật và xác nhận cũ không còn dùng để chốt nội dung mới. |
| W3-T7-A04 | Chiếc thay không hợp lệ | Rollback; phân công cũ còn hiệu lực, không mất chiếc cũ. |


**Đóng W3-T7:** Kim Xuyến bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 11. W3-T8 — Phiếu bàn giao và chốt giao (Tuấn Kiệt)

### 11.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC11. **Service/Controller:** `IBanGiaoService` + `BanGiaoService`; `BanGiaoController`.

**Method cần có:** `LayTheoDonAsync`, `TaoHoacLayPhieuBanGiaoNhapAsync`, `CapNhatPhieuBanGiaoNhapAsync`, `ChotBanGiaoAsync`. Hai method chứa `Nhap` ở đây xử lý **phiếu bàn giao nháp**, không xử lý nhập kho.

**Lập nháp và kiểm tra:**

- [ ] Chỉ lập phiếu bàn giao cho đơn sẵn sàng nhận. Nếu đã có phiếu nháp của đơn thì lấy lại/cập nhật phiếu đó; không tạo phiếu thứ hai.
- [ ] Tạo chi tiết theo các phân công còn hiệu lực, mỗi chi tiết một thiết bị. Kiểm tra quan hệ `ma_phan_cong` thuộc đúng đơn và chưa có ở chi tiết khác.
- [ ] Ghi tình trạng trước thuê, phụ kiện thực giao, ảnh và ghi chú; ghi tên người nhận thực tế, nhân viên và bằng chứng khách xác nhận bằng các trường sẵn có.
- [ ] So sánh phụ kiện thực giao với nghĩa vụ đã lưu lúc đặt; thiếu phụ kiện hoặc khách chưa chấp nhận tình trạng thì chưa chốt, yêu cầu bổ sung/đổi thiết bị hoặc xử lý ngoại lệ.
- [ ] Mã đơn/QR nếu có chỉ giúp tra cứu; không thay việc đối chiếu người nhận. Tuần 3 không bắt buộc triển khai sinh/quét QR nếu hệ thống chưa có.
- [ ] Ảnh/bằng chứng dùng cách lưu tệp hiện có; DTO nhận tham chiếu tệp hợp lệ. Không giao thêm một hệ thống upload riêng vào tuần này.
- [ ] Lưu nháp không đổi đơn/thiết bị sang đang thuê và không coi khách đã nhận đồ.

**Chốt trong một transaction:**

1. Kiểm tra quyền và khóa đơn, phiếu, các thiết bị liên quan theo thứ tự thống nhất.
2. Đọc lại trạng thái đơn và phiếu; nếu phiếu đã chốt thì trả kết quả cũ cho yêu cầu lặp hợp lệ, không phát sinh bàn giao/lịch sử lần hai.
3. Đơn phải vẫn sẵn sàng nhận. Đối chiếu đủ tiền thuê sau giảm giá và đủ cọc bằng các giao dịch thành công và chi tiết `TienThue`/`TienCoc`; không chỉ dựa vào một trạng thái đơn hoặc số tiền do client truyền.
4. Khoản tiền cần đối chiếu, thu trùng/thu sai hoặc đang chờ xử lý không được tự dùng để bù cho thiếu tiền hợp lệ; báo lý do để xử lý theo module thanh toán. Không triển khai hoàn tiền tại đây.
5. Kiểm tra đúng đủ thiết bị cho tất cả các dòng, phân công vẫn hiệu lực, không bị thay đổi và mỗi chiếc thực tế đã về kho/đạt kiểm tra; kiểm tra lại lịch trong transaction.
6. Kiểm tra thời gian nhận theo chính sách gắn với đơn. Nhận sớm chỉ khi quản trị viên chấp thuận và toàn bộ khoảng phát sinh sớm không xung đột; lưu người duyệt, thời điểm, lý do trong bằng chứng/nhật ký hiện có. Không coi quyền quản trị là lý do bỏ qua kiểm tra lịch.
7. Phải có xác nhận của khách và dữ liệu tình trạng/phụ kiện hợp lệ. Thời điểm khách xác nhận và giao thực tế được server ghi tại hành động tương ứng; không chấp nhận thời gian giả từ client để né điều kiện.
8. Chốt phiếu, lưu snapshot tên nhân viên/người nhận và thông tin thực giao; đơn chuyển `SanSangNhan → DangThue`, các thiết bị bàn giao chuyển sang đang thuê.
9. Ghi lịch sử đơn, lịch sử thiết bị và nhật ký trong cùng transaction; commit toàn bộ.

**Khóa chứng từ và phối hợp:**

- [ ] Mỗi đơn chốt bàn giao **đủ một lần**. Nếu thiếu một thiết bị thì không chốt phần còn lại rồi coi đơn đang thuê đầy đủ.
- [ ] Không thu lại tiền thuê/cọc tại bước bàn giao khi khoản này đã được thanh toán ở Tuần 2.
- [ ] Unique của phiếu theo đơn và chi tiết theo phân công là lớp bảo vệ cuối; vẫn phải kiểm tra/cập nhật nguyên tử tại database.
- [ ] Phiếu đã chốt không sửa tình trạng, thay thiết bị, xóa dòng hoặc hủy phiếu bằng API nháp.
- [ ] Service Kim Xuyến và Tuấn Kiệt dùng cùng quy tắc khóa đơn khi đổi phân công/chốt phiếu để không chốt đúng lúc thiết bị bị thay.
- [ ] Nếu giao sớm, phần thời gian đã bắt đầu sử dụng thực tế phải được `KhaDungService` xem là đang chiếm dụng từ lúc giao, không chỉ từ giờ nhận dự kiến. Minh Tú, Kim Xuyến, Tuấn Kiệt tích hợp điểm này cùng nhau.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/ban-giao/theo-don/{donId}` | Nhân viên, quản trị viên |
| POST | `/api/ban-giao/theo-don/{donId}` | Tạo hoặc lấy phiếu nháp; nhân viên/quản trị viên |
| PUT | `/api/ban-giao/{phieuId}` | Cập nhật phiếu nháp; nhân viên/quản trị viên |
| POST | `/api/ban-giao/{phieuId}/chot` | Kiểm tra và chốt; nhân viên/quản trị viên |

Khách xem biên bản qua API chi tiết đơn thuộc mình của Thanh Tùng; không dùng API vận hành trên để sửa biên bản.

**Nghiệm thu:** Nháp không đổi kho; thiếu tiền, thiếu đồ, thiếu xác nhận hoặc thiết bị chưa về đều không chốt được. Chốt hợp lệ chuyển trạng thái đồng bộ. Hai lần bấm chốt chỉ tạo một kết quả bàn giao.

### 11.A. Thành phần phải bàn giao — Tuấn Kiệt

- [ ] `Services/BanGiaoService.cs`
- [ ] `Services/Interfaces/IBanGiaoService.cs`
- [ ] `Controllers/BanGiaoController.cs`
- [ ] `Models/DTOs/BanGiao/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 11.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| CapNhatBanGiaoNhapRequest | tenNguoiNhanThucTe, danhSachChiTiet: maPhanCong/tinhTrang/phuKien/anh/ghiChu | Mỗi phân công thuộc đơn và đang hiệu lực; tham chiếu tệp hợp lệ, không nhận người lập tự do. |
| XacNhanKhachRequest | bằng chứng xác nhận gắn nội dung phiếu và người nhận | Giờ xác nhận server ghi; đổi thiết bị/phụ kiện sau đó phải xác nhận lại. |
| ChotBanGiaoRequest | thông tin kiểm tra/xác nhận cuối và tham chiếu chấp thuận nhận sớm nếu cần | Không nhận số đã thu/trạng thái đích từ client. |
| BanGiaoResponse | phiếu, thời điểm, nhân viên/người nhận snapshot, danh sách thiết bị/thực giao, trạng thái | Bản khách che nội bộ, chỉ đọc theo đơn của mình. |


### 11.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayTheoDonAsync(donId, actor) | Phiếu có sẵn hoặc chưa có | Không tạo phiếu ở GET. |
| TaoHoacLayPhieuBanGiaoNhapAsync(donId, actor) | Một phiếu nháp duy nhất | Khóa đơn, kiểm tra unique phiếu/đơn hiện có. |
| CapNhatPhieuBanGiaoNhapAsync(phieuId, dto, actor) | Nháp đã lưu | Ghi PHIEU_BAN_GIAO + CHI_TIET_BAN_GIAO, không đổi trạng thái thuê. |
| GhiNhanXacNhanKhachAsync(phieuId, dto, actor) (bổ sung) | Nháp có bằng chứng đúng phiên nội dung | Có thể là action con của cập nhật nháp; chỉ xác nhận nội dung khách thực sự chấp nhận. |
| ChotBanGiaoAsync(phieuId, dto, actor) | Biên bản đã chốt | Cùng tx: phiếu + đơn DangThue + thiết bị + lịch sử; không thu tiền mới. |


### 11.D. Trình tự triển khai và tích hợp

1. Dựng nháp từ phân công có hiệu lực. Một phiếu/đơn, một chi tiết/phân công; batch không cho thiếu dòng vẫn chốt.
2. Đối chiếu người nhận, tình trạng, phụ kiện và bằng chứng khách. Khi nội dung thay đổi, đánh dấu cần xác nhận lại bằng trường xác nhận/bằng chứng đang có.
3. Nếu nhận sớm, chấp thuận admin phải lưu bền vững trong bằng chứng/nhật ký hiện có, gắn phiếu/đơn và khoảng được chấp thuận; không tin cờ daDuyet client gửi. Chốt action ghi chấp thuận cùng contract Day 1.
4. Khóa đơn/phiếu/thiết bị theo quy tắc cùng Kim Xuyến; đọc lại đủ tiền thuê/cọc hợp lệ từ giao dịch thật, loại giao dịch cần đối chiếu.
5. Gọi kiểm tra lịch Minh Tú cho khoảng có giao thực tế; thiết bị phải đã ở kho và được kiểm tra, dù trên lịch dự kiến lượt trước đã hết.
6. Chốt phiếu và chuyển trạng thái đồng bộ, ghi thời điểm giao server và snapshot, commit. Phiếu đã chốt replay hợp lệ trả bản cũ; request khác nội dung trả 409.
7. Gửi DTO khách cho Thanh Tùng; chạy nhập thật → đặt/thanh toán mock → gán → giao để chứng minh không chỉ chạy bằng seed phân công.

### 11.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| THIEU_TIEN_HOP_LE | 409 | Trả phần thuê/cọc còn thiếu, không dùng thu trùng để bù. |
| BAN_GIAO_CHUA_DU | 409 | Thiếu/sai chiếc hoặc phụ kiện chưa được giải quyết. |
| CHUA_XAC_NHAN_NOI_DUNG | 409 | Chưa có xác nhận hoặc nội dung đã đổi sau xác nhận. |
| NHAN_SOM_CHUA_DUOC_CHAP_THUAN | 409 | Thiếu phê duyệt hợp lệ; dù được duyệt vẫn phải kiểm tra lịch. |
| CHUNG_TU_DA_KHOA | 409 | Sửa nháp sau chốt hoặc replay khác nội dung. |


### 11.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T8-A01 | Thiếu 1 trong 3 thiết bị | Không chốt một phần; đơn/thiết bị chưa chuyển DangThue. |
| W3-T8-A02 | Chốt đồng thời với thay chiếc | Một kết quả hợp lệ theo khóa; không giao chiếc đã hủy phân công. |
| W3-T8-A03 | Tạo nháp rồi dừng | Không tăng số lần thuê, không đổi trạng thái vật phẩm. |
| W3-T8-A04 | Hai lần chốt cùng phiếu | Một lần giao, một bộ history, cùng ID biên bản. |
| W3-T8-A05 | Có tiền thực thu nhưng đang cần đối chiếu | Chặn bàn giao cho tới khi khoản hợp lệ đáp ứng nghĩa vụ. |


**Đóng W3-T8:** Tuấn Kiệt bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 12. Hợp đồng giữa các Service và mốc bàn giao

| Bên cung cấp | Bên sử dụng | Hợp đồng cần chốt | Mốc |
|---|---|---|---|
| Thanh Tùng | Kiện Minh, Minh Tú, Kim Xuyến, Tuấn Kiệt | Helper lấy danh tính theo quy ước cũ, ghi lịch sử/nhật ký trong transaction của bên gọi | Interface Day 1, dùng được Day 2 |
| Thanh Tùng | Kim Xuyến | Tạo thông báo sẵn sàng nhận trong cùng transaction chuyển trạng thái | Interface Day 1, dùng được Day 2 |
| Kiện Minh | Minh Tú | DTO phiếu và xác nhận, quyền sửa nháp, cách tính tổng và snapshot | Cuối Day 1 |
| Minh Tú | Kiện Minh | `INhapKhoService.XacNhanNhapKhoAsync` và response của action xác nhận | Interface Day 1, luồng hợp lệ Day 2, ngoại lệ Day 3 |
| Minh Tú | Kim Xuyến, Tuấn Kiệt | Kiểm tra thiết bị, khoảng thuê, loại trừ phân công của chính bản ghi đang xét; cách khóa thống nhất | Interface Day 1, dùng được Day 2–3 |
| Kim Xuyến | Tuấn Kiệt | Danh sách phân công hiệu lực, điều kiện sẵn sàng, cách làm mới nháp khi đổi thiết bị | Interface Day 1, dữ liệu chạy thật Day 3 |
| Tuấn Kiệt | Thanh Tùng | DTO biên bản khách được xem, khác với DTO vận hành nội bộ | Cuối Day 3 |
| Tuấn Kiệt | Minh Tú | Giờ giao thực tế, trạng thái đang thuê và cách tính khoảng chiếm dụng khi nhận sớm | Chốt Day 1, tích hợp Day 4 |

**Cách tránh chờ nhau:**

- Chốt interface và DTO sớm; không chờ Controller của người khác hoàn thành mới bắt đầu service của mình.
- Kim Xuyến dùng đơn đã xác nhận và thiết bị hợp lệ từ dữ liệu Tuần 2 để phát triển phần chuẩn bị; không chờ toàn bộ màn nhập kho.
- Tuấn Kiệt dùng dữ liệu đơn/phân công mẫu hợp lệ trong môi trường phát triển để làm nháp bàn giao; Day 4 phải chạy lại bằng phân công tạo từ API thật của Kim Xuyến.
- `KhaDungService` kiểm tra điều kiện, `PhanCongThietBiService` sở hữu thao tác ghi phân công, `BanGiaoService` sở hữu thao tác ghi bàn giao. Không để các service gọi ngược nhau thành vòng phụ thuộc.
- Mọi thao tác ghi phân công/bàn giao liên quan cùng đơn dùng chung quy tắc transaction và khóa database; helper đọc không tự mở một transaction độc lập làm mất bảo vệ của bên gọi.

## 13. Lịch làm việc trong 5 ngày

Các mốc Day 1–5 là ngày làm việc của tuần, chưa gắn ngày lịch cụ thể. Day 5 dành cho tích hợp, kiểm tra và sửa lỗi; không lên kế hoạch bắt đầu một module mới ở ngày cuối.

| Người | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|---|---|---|---|---|---|
| **Thanh Tùng** | Chốt interface lịch sử/thông báo; service hồ sơ | Xong API hồ sơ; bàn giao helper lịch sử/thông báo | Mở rộng đọc đơn khách và truy vấn vận hành | Nối DTO bàn giao, API thông báo; tích hợp DI | Chạy luồng tổng, kiểm tra quyền và sửa lỗi tích hợp |
| **Kiện Minh** | Service/Controller nhà cung cấp; chốt DTO nhập với Minh Tú | Hoàn thiện nhà cung cấp; tạo/sửa phiếu nháp và dòng | Hủy/tra cứu phiếu; nối action xác nhận của Minh Tú | Kiểm tra khóa chứng từ, snapshot và quyền sửa nháp | Demo luồng nhập, sửa lỗi module |
| **Minh Tú** | Chốt kiểm tra lịch; viết service tra cứu thiết bị | Nhập kho luồng hợp lệ; cung cấp kiểm tra thiết bị cơ bản | Hoàn thiện rollback, xác nhận lặp, hàng lỗi và lịch phân công | Kiểm tra khả dụng sau nhập/gán/giao, bao gồm nhận sớm | Kiểm tra cạnh tranh nhập kho/thiết bị, sửa lỗi |
| **Kim Xuyến** | Chốt DTO phân công với Minh Tú và Tuấn Kiệt; bắt đầu chuẩn bị | Gán/hủy phân công và hiển thị phần còn thiếu | Thay thiết bị; xác nhận sẵn sàng; bàn giao luồng thật cho Tuấn Kiệt | Nối thông báo; kiểm tra trùng lịch và thay thiết bị khi có nháp bàn giao | Kiểm tra cạnh tranh phân công, sửa lỗi |
| **Tuấn Kiệt** | Chốt DTO bàn giao và quy tắc khóa với Kim Xuyến | Lập/lấy/sửa phiếu nháp, dữ liệu tình trạng và xác nhận | Chốt giao: đủ tiền/đồ/xác nhận; bàn giao DTO khách cho Thanh Tùng | Chạy bằng đơn chuẩn bị thật; kiểm tra chốt lặp, nhận sớm và khóa phiếu | Demo nhập → chuẩn bị → bàn giao, sửa lỗi |

**Các mốc nhóm phải đạt:**

- **Cuối Day 1:** Chốt tên interface, DTO, route, quyền, trạng thái và cách khóa chung. Mỗi người biết API/service mình nhận từ người khác.
- **Cuối Day 2:** Có hồ sơ, nhà cung cấp/nháp nhập, luồng nhập kho hợp lệ và các service hỗ trợ tối thiểu để ghép.
- **Cuối Day 3:** Có đơn được phân công và chuyển sẵn sàng; bàn giao có luồng chốt cơ bản; các Controller đã nối implementation thật.
- **Cuối Day 4:** Chạy được luồng hoàn chỉnh bằng API từ nhập kho đến đang thuê; ghi lại lỗi còn tồn tại.
- **Cuối Day 5:** Hoàn thành các tiêu chí bắt buộc bên dưới, không còn lỗi gây trùng thiết bị, tăng kho hai lần, bàn giao thiếu hoặc truy cập trái quyền.

## 14. W3-T9 — Tích hợp và nghiệm thu (cả nhóm, Thanh Tùng điều phối)

### 14.0. Phạm vi, quy tắc nghiệp vụ và API

Đây là kiểm tra cho các Service/Controller vừa làm, không phải phân công lại Entities hoặc viết lại nền tảng Tuần 2. Mỗi người chịu trách nhiệm ca kiểm tra module mình; Thanh Tùng tổng hợp kết quả và Tuấn Kiệt phối hợp demo luồng cuối.

#### Luồng demo bắt buộc

1. Quản trị viên tạo nhà cung cấp; nhân viên tạo phiếu nhập nháp với sản phẩm đã có.
2. Kiểm tra số thiết bị/khả dụng chưa tăng sau khi lưu nháp.
3. Quản trị viên xác nhận nhập; có thiết bị với mã riêng, nguồn nhập và sản phẩm hiện tại đúng.
4. Khách đăng nhập, xem/sửa hồ sơ; dùng API Tuần 2 để chọn đồ, đặt đơn và thanh toán mock thành công.
5. Nhân viên tìm đơn, bắt đầu chuẩn bị, gán đủ thiết bị, chuyển sẵn sàng nhận.
6. Khách xem trạng thái mới và thông báo của mình.
7. Nhân viên lập phiếu bàn giao, ghi tình trạng/phụ kiện, bằng chứng xác nhận khách và chốt đủ thiết bị.
8. Đơn/thiết bị chuyển đang thuê; khách xem được biên bản và lịch sử tương ứng.
9. Kiểm tra lại tìm kiếm/khả dụng Tuần 2: đơn và phân công không chiếm số lượng hai lần, thiết bị đã giao không thể tiếp tục giao cho đơn khác đang trùng lịch.

#### Các ca kiểm tra có kết quả mong đợi

| # | Tình huống | Kết quả bắt buộc | Người kiểm tra chính |
|---|---|---|---|
| 1 | Khách đổi ID để xem đơn/biên bản/thông báo của khách khác | Không lộ dữ liệu; trả lỗi theo quy ước quyền | Thanh Tùng |
| 2 | Cập nhật email/SĐT đã thuộc tài khoản khác | Không cập nhật; hồ sơ cũ vẫn nhất quán | Thanh Tùng |
| 3 | Đổi hồ sơ sau khi đặt đơn | Thông tin người nhận/snapshot đơn cũ không đổi | Thanh Tùng |
| 4 | Nhân viên thêm NCC hoặc xác nhận nhập kho | 403; không có biến động dữ liệu | Kiện Minh, Minh Tú |
| 5 | Nhà cung cấp ngừng hợp tác sau khi đã có phiếu nháp | Không xác nhận nhập được | Kiện Minh, Minh Tú |
| 6 | Lưu nháp, sửa dòng, hủy nháp | Tổng được tính lại đúng; số thiết bị không tăng | Kiện Minh |
| 7 | Xác nhận cùng phiếu hai lần, kể cả đồng thời | Kho chỉ tăng một lần, không có thiết bị trùng | Minh Tú |
| 8 | Trong danh sách nhập có mã trùng hoặc số lượng không khớp | Rollback toàn bộ; phiếu vẫn chưa nhập | Minh Tú |
| 9 | Nhập 8 thiết bị, 1 chiếc lỗi được chấp nhận | Sở hữu tăng 8; sẵn sàng tăng 7; có phiếu bảo trì cho chiếc lỗi | Minh Tú |
| 10 | Sửa/xóa/hủy phiếu đã nhập, hoặc đổi tên NCC sau đó | Chứng từ đã chốt không bị sửa; snapshot còn nguyên | Kiện Minh |
| 11 | Hai nhân viên gán cùng chiếc cho hai đơn trùng lịch | Chỉ một phân công thành công | Kim Xuyến, phối hợp Minh Tú |
| 12 | Đơn đã giữ 2 thiết bị và được gán 2 chiếc | Không trừ thêm 2 lần nữa khỏi khả dụng | Minh Tú |
| 13 | Thiết bị bị chia lịch cố định, không có chiếc dùng trọn khoảng mới | Không báo chắc chắn đủ hàng khi chưa xử lý lại phân công | Minh Tú |
| 14 | Hủy/thay phân công trước giao; thay lúc đã có phiếu bàn giao nháp | Giữ lịch sử; nháp không còn tham chiếu có thể chốt với thiết bị cũ đã hủy | Kim Xuyến, Tuấn Kiệt |
| 15 | Phân công thiếu, sai sản phẩm hiện tại, thiết bị quá hạn hoặc bảo trì | Không chuyển sẵn sàng/không bàn giao trái điều kiện | Kim Xuyến, Tuấn Kiệt |
| 16 | Thiếu tiền thuê/cọc, thiếu xác nhận khách hoặc thiếu một thiết bị | Không chốt; không đổi đơn/thiết bị sang đang thuê | Tuấn Kiệt |
| 17 | Chốt bàn giao lặp hoặc đồng thời với đổi phân công | Chỉ một kết quả hợp lệ, không giao hai lần hoặc giao nhầm thiết bị | Kim Xuyến, Tuấn Kiệt |
| 18 | Nhận sớm nhưng chưa được duyệt hoặc trùng lịch phát sinh sớm | Bị chặn; không tự đổi giờ để né kiểm tra | Tuấn Kiệt, phối hợp Minh Tú |
| 19 | Sửa/xóa chi tiết sau chốt bàn giao | Bị chặn; snapshot và lịch sử giữ nguyên | Tuấn Kiệt |
| 20 | Dùng JWT cũ sau khi tài khoản vận hành bị khóa/ngừng quyền | Thao tác ghi bị chặn; không tạo chứng từ trái quyền | Mỗi người trên API mình |

Các ca transaction/cạnh tranh và quyền sở hữu cần kiểm tra với database thật trong môi trường phát triển. Swagger/Postman phù hợp demo API; bấm tuần tự hai lần không thay thế kiểm tra hai request chạy đồng thời.

#### Hồ sơ bàn giao cuối tuần

- [ ] Mỗi module có interface, service implementation, controller và DTO cần thiết; đã đăng ký DI và build được cùng dự án.
- [ ] Endpoint có mô tả quyền, request/response mẫu và mã lỗi nghiệp vụ để nhóm frontend dùng sau.
- [ ] Có dữ liệu demo và hướng dẫn thứ tự gọi API; ghi rõ thanh toán hiện vẫn dùng mock của Tuần 2.
- [ ] Có kết quả các ca nghiệm thu liên quan, gồm tình huống thành công và bị từ chối.
- [ ] Các thay đổi lịch sử, thông báo, nhập kho, phân công và bàn giao không bị ghi dở dang khi transaction thất bại.
- [ ] Các API Tuần 2 liên quan vẫn chạy: tìm sản phẩm/khả dụng, giỏ, tạo đơn, thanh toán, đọc đơn.
- [ ] Không còn Controller cùng route bị trùng, logic chuyển trạng thái viết ở nhiều nơi, hoặc service phụ tự commit ngoài transaction chính.
- [ ] Phần chưa làm được liệt kê theo đúng ranh giới mục 1; không đánh dấu hoàn tất UC20 đầy đủ, UC16 đầy đủ hay toàn bộ quy trình trả hàng/đối soát.

### 14.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `docs/contracts/week3.md (đề xuất)`
- [ ] `docs/verification/week3.md (đề xuất)`
- [ ] `Collections/GearGo.http hoặc Postman collection (theo nhóm đang dùng)`
- [ ] `Program.cs (chỉ nối DI/cấu hình cần thiết)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 14.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| BangHopDongModule | service, owner, DTO/interface, bên gọi, route/quyền, mã lỗi, thời điểm chốt | Thanh Tùng tổng hợp, mỗi chủ service xác nhận phần mình; không bảng database mới. |
| BoDuLieuDemo | NCC, sản phẩm, phiếu nhập, thiết bị, khách/nhân viên, đơn, thanh toán mock, lịch giao nhau | Dùng dữ liệu dev rõ ràng, đồng hồ kiểm thử cố định khi cần biên thời gian. |
| BienBanNghiemThu | mã ca, seed/request, expected/actual, Pass/Fail/Blocked, người chạy, bằng chứng | Không coi checklist kế hoạch là các test đã chạy thành công. |


### 14.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| Rà đăng ký DI và route (công việc) | Backend resolve service/controller không trùng | Thanh Tùng ghép theo danh sách đăng ký của từng người, không viết lại nền tảng Week 2. |
| Chạy chuỗi nhập→đặt→giao (công việc) | Một bộ chứng từ có nguồn xuyên suốt | Kiện Minh tạo nháp, Minh Tú chốt nhập/khả dụng, Kim Xuyến chuẩn bị, Tuấn Kiệt giao. |
| Kiểm tra quyền/đồng thời (công việc) | Bằng chứng bất biến dữ liệu khi từ chối/rollback | Mỗi chủ module chạy ca của mình trên database dev thật. |
| Chốt đầu vào Week 4 (công việc) | API/ID chi tiết bàn giao, snapshot, trạng thái và nguồn tiền đủ | Tuấn Kiệt chuyển contract nhận trả, Minh Tú chuyển nguồn thu, Thanh Tùng chuyển DTO đọc đơn. |


### 14.D. Trình tự triển khai và tích hợp

1. Day 1 chốt DTO/interface chung và chủ file: PhieuNhapController do Kiện Minh giữ; action xác nhận gọi service Minh Tú; một KhaDungService phục vụ cả đặt/phân công/giao.
2. Day 2 nối helper lịch sử/thông báo dùng cùng transaction. Người dùng helper nhận mẫu gọi và biết nơi commit duy nhất; không đợi cuối tuần mới ghép chữ ký method.
3. Chạy chuỗi dữ liệu thật trong môi trường dev: lập NCC/phiếu nháp, xác nhận nhập, dùng thiết bị mới cho đặt đơn/thanh toán mock rồi chuẩn bị/bàn giao.
4. Đối chiếu ID nguồn từng thiết bị về dòng nhập, phân công về dòng đơn, giao về phân công; kiểm giá/tên snapshot và trạng thái sau tải lại API.
5. Chạy các ca cạnh tranh có barrier/request đồng thời: sửa phiếu với chốt nhập, gán cùng chiếc cho lịch giao nhau, thay chiếc với chốt giao, khách đọc ID người khác.
6. Mỗi lỗi giao chủ service sửa; rerun ca bị ảnh hưởng và luồng liên quan. Tuấn Kiệt demo cuối chuỗi, Thanh Tùng tổng hợp kết quả và những việc còn để Week 4.
7. Bàn giao Week 4 những chi tiết bàn giao đã chốt để nhận trả theo từng chiếc; không tự đánh dấu hoàn tất nghiệp vụ nhận trả/phí/đối soát chưa triển khai.

### 14.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DI_HOAC_ROUTE_XUNG_DOT | Chặn tích hợp | Controller không resolve hoặc hai route trùng; chủ file sửa trước demo. |
| NGUON_CHUNG_TU_KHONG_KHOP | Chặn nghiệm thu | Thiết bị/phân công/bàn giao không truy được nguồn đúng. |
| LOI_DONG_THOI_HOAC_QUYEN | Chặn nghiệm thu | Vượt kho, ghi dở dang, đọc chéo hoặc chốt trái trạng thái. |


### 14.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W3-T9-A01 | Nhập phiếu mới rồi giao chính các thiết bị vừa nhập | Tất cả FK nguồn và trạng thái khớp sau tải lại, không phụ thuộc seed tạo THIET_BI trực tiếp. |
| W3-T9-A02 | Chốt nhập lỗi ở giữa transaction | Không có thiết bị/lịch sử/thông báo dở dang; phiếu không bị đánh đã nhập giả. |
| W3-T9-A03 | Hai request tranh chiếc cuối cùng cùng khoảng | Không có hai cam kết/phân công xung đột được nhận thành công. |
| W3-T9-A04 | Khách A xem biên bản của B và staff dùng token đã bị khóa | Bị chặn, không lộ dữ liệu hoặc ghi chứng từ. |
| W3-T9-A05 | Demo chỉ dùng gateway mock | Biên bản ghi đúng mode mock, không tuyên bố đã kiểm chứng thu tiền thật. |


**Đóng W3-T9:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 15. Câu giao việc ngắn cho từng người

- **Thanh Tùng:** Làm Service/Controller hồ sơ, theo dõi đơn khách và tra cứu đơn cho nhân viên; cung cấp helper lịch sử, thông báo trong ứng dụng; tổng hợp DI và tích hợp cuối tuần.
- **Kiện Minh:** Làm Service/Controller nhà cung cấp và phiếu nhập nháp: tạo, sửa, dòng chi tiết, hủy, tra cứu; action xác nhận gọi service của Minh Tú.
- **Minh Tú:** Làm service xác nhận nhập kho và tạo thiết bị từ phiếu đã kiểm tra; Service/Controller tra cứu thiết bị; mở rộng service khả dụng dùng chung cho đặt đơn, phân công và bàn giao.
- **Kim Xuyến:** Làm Service/Controller chuẩn bị đơn: bắt đầu chuẩn bị, gán/hủy/đổi thiết bị, kiểm tra đủ đồ và chuyển sẵn sàng nhận.
- **Tuấn Kiệt:** Làm Service/Controller bàn giao: lập/sửa nháp, kiểm tra tiền và thiết bị, ghi xác nhận khách, chốt giao, khóa chứng từ và chuyển đơn/thiết bị sang đang thuê.

**Điểm kết thúc của Tuần 3:** Có thể nhập thiết bị mới, đặt/thu tiền bằng luồng đã có, chuẩn bị và bàn giao cho khách bằng API; khách theo dõi được đơn. Phần nhận trả và xử lý tiền khi kết thúc thuê tiếp tục ở Tuần 4.
