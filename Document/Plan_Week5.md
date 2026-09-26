# GearGo — Week 5: Tài khoản, bảo trì, điều chỉnh kho và hỗ trợ khách

> **Kế hoạch backend chi tiết — bản tái cấu trúc theo tên thành viên.** Week 2 đã hoàn thành theo xác nhận của nhóm; toàn bộ Entities đã viết. Phạm vi giao việc là Service, Controller, interface, DTO và tích hợp/kiểm tra cần thiết. Với Week 5, các tuần trước là điều kiện đầu vào cần chạy được khi bắt đầu triển khai.

**Nhóm:** Thanh Tùng (Người 1), Kiện Minh (Người 2), Minh Tú (Người 3), Kim Xuyến (Người 4), Tuấn Kiệt (Người 5). Tên này là tên thành viên phát triển, không phải role của tài khoản trong hệ thống.

**Nền tảng:** ASP.NET Core Web API, EF Core, SQL Server, JWT, JSON; React gọi API riêng. Dùng phiên bản/cấu hình đang chạy trong repo của nhóm.

**Tài liệu chuẩn:** đặc tả `GearGo_Dac_Ta_Nghiep_Vu(7).md`, ERD bản `erd.txt` và nền tảng Plan Week 2 đã hoàn thành. Bản `ERD(20260925-062324).dbml` cũ thiếu `THIET_BI.ma_san_pham_hien_tai` và FK tương ứng; bản `erd.txt` gửi sau có chúng và khớp đặc tả giáng cấp. Bốn plan dùng bản `erd.txt` làm chuẩn, không sửa các tài liệu nguồn.

**Cách đọc:** bảng mục 2 cho biết ai làm gì; các task có mã `W5-Tn`; từng task nêu hợp đồng request/response, method, quy tắc nghiệp vụ, luồng xử lý, lỗi và ca nghiệm thu. Các request mẫu cần thay ID bằng dữ liệu seed thực tế. Ngày/giờ trong JSON là fixture; đặt đồng hồ kiểm thử phù hợp với điều kiện trước/sau nghiệp vụ, không gửi nguyên ngày mẫu vào môi trường thật. Ngày 1–5 là ngày làm việc, chưa gắn ngày lịch.

## 1. Phạm vi Tuần 5

| Use case/phần việc | Kết quả cần đạt |
|---|---|
| UC23 — Tài khoản và nhân viên | Tạo nhân viên, sửa hồ sơ/vai trò, khóa/mở khóa và ghi nhận nghỉ việc; quyền có hiệu lực trên API |
| UC16 — Bảo trì | Tiếp nhận phiếu có sẵn từ nhập/nhận trả; phân người xử lý, cập nhật kết quả, kiểm tra và xác nhận hoàn thành |
| Vòng đời thiết bị | Đề nghị ngừng sử dụng/thanh lý hoặc đổi sản phẩm hiện tại khi giáng cấp; có duyệt và giữ nguồn nhập |
| UC22 — Theo dõi/kiểm kê kho | Xem thiết bị theo trạng thái, nguồn nhập và lịch; ghi nhận sai lệch có danh sách thiết bị cụ thể |
| Phần UC20 còn lại | Sửa sai phiếu nhập đã chốt bằng chứng từ điều chỉnh, không sửa/xóa chứng từ gốc |
| UC08 — Đánh giá | Khách có đơn hoàn tất đánh giá đúng sản phẩm đã thuê; quản trị viên ẩn/khôi phục theo lý do |
| UC09 — Tư vấn bộ đồ | Gợi ý sản phẩm/số lượng từ danh mục thật, đối chiếu giá/khả dụng, có phương án gợi ý theo quy tắc khi AI không dùng được |
| Thông báo thuộc UC26 | Hoàn thiện danh sách/đã đọc, sự kiện/nhắc lịch, hàng chờ gửi, thử lại có kiểm soát và tra cứu lỗi gửi |

**Ranh giới để tuần không bị mở rộng quá mức:**

- Giữ các API đã làm ở Tuần 2–4; chỉ bổ sung hoặc nối với module mới. Không viết lại thanh toán, nhận trả, đối soát hay khả dụng thành phiên bản độc lập.
- Tuần 6 tiếp tục CRUD khuyến mãi đầy đủ, báo cáo tổng hợp, quản trị chính sách, giao diện tra cứu nhật ký toàn hệ thống, hoàn thiện và triển khai. Tuần 5 vẫn phải ghi nhật ký cho nghiệp vụ mình làm.
- Bảo trì và điều chỉnh kho không tự tạo phụ phí khách hàng, khoản thu/hoàn hoặc sửa bảng đối soát đã chốt; nếu phát sinh tài chính, đi qua quy trình Tuần 4.
- Không thêm bảng phiên kiểm kê, lịch sử chat AI, hội thoại, mẫu thông báo hoặc thiết lập nhận thông báo cá nhân khi ERD chưa có. Dùng bảng hiện tại, DTO, cấu hình ứng dụng và dữ liệu tham chiếu phù hợp.
- Kênh trong ứng dụng phải chạy thật với database. Kênh email có adapter và kiểm thử bằng bộ gửi giả lập; chỉ ghi đã tích hợp email thật nếu có cấu hình và kiểm tra gửi thật. SMS/push là mở rộng, không bắt buộc làm tất cả trong tuần này.
- Tư vấn có adapter AI thật khi nhóm cung cấp cấu hình nhà cung cấp; luôn có gợi ý theo quy tắc dự phòng. Chưa có khóa/cấu hình thì nghiệm thu luồng dự phòng và contract bằng mock, ghi rõ phần gọi mô hình thật chưa được kiểm chứng.

## 2. Phân công cho 5 người

| Người | Module chính | Service mới / mở rộng | Controller phụ trách | Task |
|---|---|---|---|---|
| **Thanh Tùng** | Quản trị tài khoản, nhân viên, quyền và tích hợp chung | Mới `QuanTriTaiKhoanService`, `NhanVienService`; mở rộng kiểm tra quyền hiện tại của xác thực | `Admin/TaiKhoanController`, `Admin/NhanVienController` | W5-T1, W5-T9 |
| **Kiện Minh** | Đánh giá, điểm sản phẩm và thông báo | Mới `DanhGiaService`, `GuiThongBaoService`; mở rộng `ThongBaoService`, phần đọc sản phẩm | `DanhGiaController`, `Admin/DanhGiaController`; mở rộng `ThongBaoController`; `Admin/ThongBaoController` | W5-T6, W5-T8 |
| **Minh Tú** | Kho, kiểm kê, điều chỉnh nhập kho và khả dụng | Mới `KhoService`, `DieuChinhKhoService`; mở rộng `KhaDungService`, `ThietBiService` | `KhoController`, `DieuChinhKhoController`; phần liên quan trong `ThietBiController` | W5-T4, W5-T5 |
| **Kim Xuyến** | Tư vấn AI, gợi ý dự phòng và chuyển bộ đồ sang giỏ | Mới `TuVanAIService`, `GoiYBoDoService`, adapter `AIProvider`; nối service giỏ/báo giá đã có | `TuVanController`; action thêm bộ đồ vào giỏ gọi service hiện có | W5-T7 |
| **Tuấn Kiệt** | Bảo trì, kiểm tra hoàn thành và đề nghị thay đổi vòng đời | Mới/hoàn thiện `BaoTriService`, `VongDoiThietBiService`; tiếp quản logic tạo phiếu bảo trì tối thiểu đã có | `BaoTriController`, `VongDoiThietBiController` | W5-T2, W5-T3 |

Mỗi người chịu trách nhiệm interface, implementation, DTO, phân quyền và kiểm tra API của mình. Thanh Tùng tổng hợp DI/cấu hình và phối hợp nghiệm thu; không phải viết lại phần người khác.

**Chủ sở hữu file dùng chung:**

- `ThongBaoService`/`ThongBaoController` được bàn giao từ Thanh Tùng sang Kiện Minh trong tuần này; Thanh Tùng giữ helper lịch sử và gọi interface thông báo đã thống nhất.
- `KhaDungService` tiếp tục do Minh Tú sửa chính. Các module bảo trì, vòng đời, kiểm kê và AI gọi cùng một service.
- Minh Tú sở hữu thao tác **duyệt/áp dụng điều chỉnh kho**. Tuấn Kiệt chỉ lập đề nghị vòng đời qua interface điều chỉnh; không viết thêm một API đổi sản phẩm/ngừng sử dụng bỏ qua phiếu duyệt.
- Kiện Minh chỉ mở rộng phần điểm/đánh giá trong service đọc sản phẩm; không sửa giá, nhập kho hoặc báo giá bằng công thức riêng.

## 3. Quy ước dùng chung và những điểm ERD dễ nhầm

### 3.1 Nguyên tắc triển khai

- Controller nhận DTO, lấy người đăng nhập, gọi service và trả HTTP. Service xử lý điều kiện nghiệp vụ, quyền trên dữ liệu, transaction và lịch sử.
- Dùng lại cấu trúc lỗi: 400 dữ liệu sai, 401 chưa xác thực/token không còn hợp lệ, 403 không có quyền, 404 không tìm thấy, 409 xung đột trạng thái/dữ liệu; giới hạn tần suất trả 429 theo cơ chế chung.
- ID dùng `long`, tiền dùng `decimal`; thời gian giữ quy ước UTC và hiển thị giờ Việt Nam. Trạng thái dùng enum tương ứng đang có trong dự án.
- Không nhận vai trò/người duyệt/trạng thái đã chốt tùy ý từ client. Actor ghi chứng từ lấy `MaNhanVien`; actor ghi nhật ký lấy `MaTaiKhoan` theo FK.
- Mọi thao tác ghi quan trọng phải kiểm tra trạng thái tài khoản và quyền hiện tại, không chỉ tin vai trò trong JWT phát hành trước lúc bị đổi quyền.
- Kiểm tra và cập nhật cùng một transaction; khóa/cập nhật có điều kiện tại database, không chỉ `lock` trong RAM. Service phụ dùng transaction của bên gọi.
- Các JSON trước/sau do server dựng từ dữ liệu đã xác minh, không tin nguyên JSON do client gửi để cập nhật bất kỳ cột nào.
- Retry hành động đã thành công trả kết quả cũ khi phù hợp hoặc 409 rõ lý do; không tạo thêm thiết bị, phiếu bảo trì, lượt đánh giá hay thông báo cùng sự kiện.

### 3.2 Ánh xạ dữ liệu bắt buộc

| Dữ liệu hiện có | Cách dùng trong Tuần 5 |
|---|---|
| `TAI_KHOAN.vai_tro`, `trang_thai` | Quyền và khóa tài khoản; không nhầm với trạng thái làm việc của nhân viên |
| `NHAN_VIEN.ma_tai_khoan` unique | Tạo tài khoản nhân viên và hồ sơ nhân viên trong cùng transaction; quản trị viên vận hành cũng cần hồ sơ nhân viên hợp lệ |
| `THIET_BI.ma_san_pham_hien_tai` | Sản phẩm đang cho thuê hiện tại; có thể đổi qua giáng cấp được duyệt |
| `THIET_BI.ma_chi_tiet_phieu_nhap` bắt buộc | Nguồn nhập gốc, giữ nguyên khi giáng cấp; thiết bị bổ sung do sai lệch cũng phải có nguồn nhập xác minh được |
| `PHIEU_BAO_TRI.ma_thiet_bi` | Một phiếu gắn một thiết bị; một thiết bị có nhiều phiếu theo lịch sử, không mặc định nhiều phiếu đang mở cùng lúc |
| `ma_nguoi_lap`, `ma_nguoi_xu_ly`, `ma_nguoi_xac_nhan_hoan_thanh` | Ba trách nhiệm khác nhau; ghi đúng người lập, xử lý và kiểm tra hoàn thành |
| `PHIEU_DIEU_CHINH_KHO.ma_phieu_nhap_lien_quan` | Liên kết phiếu nhập bị sửa sai khi có; không sửa phiếu nhập gốc đã chốt |
| `CHI_TIET_DIEU_CHINH_KHO.ma_thiet_bi`, `ma_chi_tiet_phieu_nhap` | Xác định đối tượng bị tác động; từng loại điều chỉnh quy định trường nào bắt buộc |
| `gia_tri_truoc`, `gia_tri_sau` | Snapshot đúng dữ liệu liên quan và kết quả điều chỉnh; không phải quyền cập nhật tùy ý mọi trường |
| `DANH_GIA.ma_chi_tiet_don` unique | Suy ra đơn → khách, dòng đơn → sản phẩm; không tự thêm `MaKhachHang`/`MaSanPham` vào Entity đánh giá |
| `DANH_GIA.ma_nguoi_an`, `ly_do_an` | Lưu người và lý do ẩn; quản trị viên không sửa điểm/nội dung của khách |
| `THONG_BAO.ma_su_kien`, `kenh_gui` | Định danh sự kiện theo người nhận/kênh để chống lặp; ERD không có unique cho tổ hợp này |
| `so_lan_thu_gui`, `loi_gui_gan_nhat`, các thời điểm | Theo dõi gửi/thử lại; thời điểm gửi thành công không được dùng giả làm thời điểm thử gửi |


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


## 4. W5-T1 — Quản lý tài khoản và nhân viên (Thanh Tùng)

### 4.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC23. **Service:** `IQuanTriTaiKhoanService` + `QuanTriTaiKhoanService`; `INhanVienService` + `NhanVienService`.

**Method chính:** `TimTaiKhoanAsync`, `LayTaiKhoanAsync`, `KhoaTaiKhoanAsync`, `MoKhoaTaiKhoanAsync`, `TaoNhanVienAsync`, `CapNhatNhanVienAsync`, `DoiVaiTroAsync`, `GhiNhanNghiViecAsync`.

**DTO cần có:** `TimTaiKhoanRequest`, `TaoNhanVienRequest`, `CapNhatNhanVienRequest`, `DoiVaiTroRequest`, `KhoaTaiKhoanRequest`, `NghiViecRequest`, response tài khoản/nhân viên và phân trang. Không dùng Entity làm response.

#### Tạo và cập nhật nhân viên

- [ ] Chỉ quản trị viên được tạo nhân viên; đăng ký công khai vẫn chỉ tạo khách hàng như Tuần 2.
- [ ] Kiểm tra họ tên, email/số điện thoại, định dạng và trùng tài khoản; ngày vào làm/nghỉ việc hợp lệ. Bắt lỗi unique cả khi hai request tạo đồng thời.
- [ ] Tạo `TAI_KHOAN` và `NHAN_VIEN` trong một transaction; mật khẩu qua cơ chế băm hiện có. Không trả mật khẩu băm hoặc ghi mật khẩu rõ vào log.
- [ ] Cách đặt mật khẩu ban đầu sử dụng luồng đã có của dự án: quản trị viên cấp ban đầu hoặc gửi đường dẫn đặt mật khẩu qua cơ chế khôi phục hiện có. Không tự thêm bảng token hay dựng một hệ thống xác thực mới trong tuần này.
- [ ] Hồ sơ nhân viên cập nhật ở `NHAN_VIEN`, thông tin đăng nhập/liên hệ ở `TAI_KHOAN`; người sửa không được đổi PK/FK hoặc tự chọn tài khoản khác cho hồ sơ.
- [ ] Phạm vi cơ bản quản lý vai trò `NhanVien` và `QuanTriVien` trên tài khoản nhân sự. Không biến khách thành nhân viên chỉ bằng sửa `vai_tro` trong khi thiếu hồ sơ nhân viên và quy trình chuyển đổi.
- [ ] Sửa tên nhân viên không đổi tên đã lưu trên các phiếu nhập, bàn giao, nhận trả, đối soát hoặc điều chỉnh cũ.

#### Khóa, đổi quyền và nghỉ việc

- [ ] Khóa tài khoản bắt buộc lý do; cập nhật trạng thái/thời gian và nhật ký. Mở khóa kiểm tra các điều kiện nhân sự liên quan, không tự mở quyền cho người đã nghỉ việc.
- [ ] Nghỉ việc cập nhật `ngay_nghi_viec`, `trang_thai_lam_viec` và ngừng quyền truy cập tài khoản trong cùng transaction; giữ nguyên hồ sơ và chứng từ.
- [ ] Nếu người nghỉ việc đang được giao phiếu bảo trì mở, trả danh sách công việc cần bàn giao; quản trị viên phân lại người xử lý, không xóa mất nhiệm vụ.
- [ ] Chốt quy tắc bảo vệ quản trị: không khóa, cho nghỉ hoặc hạ quyền tài khoản quản trị viên hoạt động cuối cùng; kiểm tra có khóa transaction để hai yêu cầu đồng thời không cùng làm mất hết quản trị viên.
- [ ] Kiểm tra trạng thái/quyền hiện tại trước xử lý request bảo vệ. JWT cấp lúc còn là quản trị viên không được tiếp tục duyệt nghiệp vụ sau khi đã hạ quyền; token không còn phù hợp phải bị từ chối hoặc yêu cầu đăng nhập lại.
- [ ] Nếu cơ chế quyền có cache, thao tác đổi quyền/khóa phải làm mất hiệu lực cache liên quan ngay. Không đưa thêm bảng phiên đăng nhập/refresh token chỉ để làm phần này.
- [ ] Không cam kết thu hồi riêng từng thiết bị đăng nhập khi mô hình hiện tại chưa có quản lý phiên; nghiệm thu tuần này là chặn quyền theo trạng thái/vai trò hiện tại.
- [ ] Khóa khách không xóa/hủy các đơn và khoản tiền đang xử lý. Nhân viên vẫn nhận trả/đối soát/hoàn tiền cho đơn của khách theo Tuần 4.
- [ ] Không có API xóa cứng tài khoản hoặc nhân viên đã có lịch sử; dùng khóa/nghỉ việc và giữ liên kết chứng từ.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/admin/tai-khoan`, `/api/admin/tai-khoan/{id}` | Quản trị viên |
| POST | `/api/admin/tai-khoan/{id}/khoa`, `/api/admin/tai-khoan/{id}/mo-khoa` | Quản trị viên, có căn cứ |
| GET, POST | `/api/admin/nhan-vien` | Tra cứu/tạo; quản trị viên |
| GET, PUT | `/api/admin/nhan-vien/{id}` | Xem/sửa; quản trị viên |
| POST | `/api/admin/nhan-vien/{id}/doi-vai-tro` | Quản trị viên |
| POST | `/api/admin/nhan-vien/{id}/nghi-viec` | Quản trị viên |

**Nghiệm thu:** Tạo nhân viên có đủ hai bản ghi; hạ quyền khiến JWT cũ không còn duyệt được; nhân viên nghỉ việc mất quyền nhưng chứng từ cũ vẫn có người lập; không làm mất quản trị viên hoạt động cuối cùng.

### 4.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `Services/Interfaces/IQuanTriTaiKhoanService.cs`
- [ ] `Services/QuanTriTaiKhoanService.cs`
- [ ] `Services/Interfaces/INhanVienService.cs`
- [ ] `Services/NhanVienService.cs`
- [ ] `Controllers/Admin/TaiKhoanController.cs`
- [ ] `Controllers/Admin/NhanVienController.cs`
- [ ] `Models/DTOs/QuanTriTaiKhoan/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 4.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TimTaiKhoanRequest | tuKhoa?, vaiTro?, trangThai?, trang, soMoiTrang | Admin; không trả mật khẩu băm/secret; lọc trước phân trang. |
| TaoNhanVienRequest | hoTen, email, soDienThoai, diaChi?, ngayVaoLam, vaiTro, thông tin khởi tạo xác thực theo luồng cũ | Chỉ NhanVien/QuanTriVien; tài khoản + hồ sơ cùng transaction, liên hệ unique. |
| CapNhatNhanVienRequest | hoTen, email, soDienThoai, diaChi?, ngayVaoLam | Không nhận PK/FK mới; đổi role/khóa/nghỉ là action riêng. |
| KhoaTaiKhoanRequest / DoiVaiTroRequest / NghiViecRequest | lý do; role đích hoặc ngày nghỉ khi tương ứng | Role allowlist, ngày nghỉ >= ngày vào; bảo vệ admin hoạt động cuối cùng theo quy tắc nhóm chốt. |
| NhanVienResponse | ID tài khoản và nhân viên tách riêng, hồ sơ, role, trạng thái, công việc mở cần bàn giao | Tên trên chứng từ cũ không cập nhật theo hồ sơ; không coi nghỉ việc là xóa lịch sử. |


### 4.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TimTaiKhoanAsync / LayTaiKhoanAsync(filterOrId, actor) | Trang/chi tiết đã lọc trường | Admin hiện tại; không chỉ tin role cũ trong JWT. |
| KhoaTaiKhoanAsync / MoKhoaTaiKhoanAsync(id, dto, actor) | Trạng thái mới + vướng mắc nếu có | Khóa dữ liệu bảo vệ nhóm admin, audit; mở khóa nhân sự nghỉ việc bị chặn. |
| TaoNhanVienAsync(dto, actor) | Tài khoản + hồ sơ mới | Hash qua cơ chế hiện có; rollback nếu hồ sơ/unique thất bại. |
| CapNhatNhanVienAsync(id, dto, actor) | Hồ sơ/liên hệ mới | TAI_KHOAN + NHAN_VIEN cùng tx, không sửa snapshot chứng từ. |
| DoiVaiTroAsync(id, dto, actor) | Role mới có hiệu lực | Kiểm tra hồ sơ nhân sự, admin cuối; vô hiệu dữ liệu quyền cache. |
| GhiNhanNghiViecAsync(id, dto, actor) | Hồ sơ nghỉ + danh sách nhiệm vụ cần giao lại | Khóa quyền truy cập và cập nhật nghỉ cùng tx; không xóa phiếu bảo trì đang phụ trách. |


### 4.D. Trình tự triển khai và tích hợp

1. Thanh Tùng rà middleware xác thực Week 2: mỗi request bảo vệ phải xét trạng thái/role hiện tại, hoặc cache có cơ chế vô hiệu đáng tin cậy khi đổi quyền. Không chỉ sửa mỗi endpoint admin.
2. Chốt đề xuất bảo vệ admin cuối cùng và thứ tự khóa nhóm admin Day 1; kiểm tra dưới transaction để hai admin không đồng thời hạ hết quyền nhau.
3. Tạo nhân sự bằng luồng tài khoản đang có, không thêm cơ chế token/mật khẩu mới. Nếu dùng mật khẩu cấp ban đầu, không đưa vào response log hoặc snapshot audit.
4. Cập nhật hồ sơ và liên hệ trong transaction; lỗi unique trả theo trường, không giữ nửa tài khoản mới khi tạo NHAN_VIEN thất bại.
5. Đổi vai trò chỉ cho tài khoản có hồ sơ nhân sự phù hợp. Không nhận request công khai để khách tự nâng role hoặc gắn hồ sơ khác.
6. Nghỉ việc lưu ngày/trạng thái và chặn quyền; trả danh sách bảo trì mở để admin chuyển người xử lý qua BaoTriService, không xóa hoặc tự hoàn thành nhiệm vụ.
7. Với khách bị khóa, ngăn thao tác mới theo policy nhưng giữ đơn/chứng từ, xử lý callback và cho nhân viên tiếp tục nghĩa vụ trả/hoàn. Mở khóa không đổi trạng thái các đơn cũ.
8. Rà DTO/lịch sử: thay tên hiện tại không đổi tên đã chốt; mọi hành động quản trị có actor, lý do và thời điểm, dữ liệu trước/sau đã che trường nhạy cảm.

### 4.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| LIEN_HE_DA_TON_TAI | 409 | Email/SĐT đã dùng; không tạo hồ sơ dở dang. |
| ADMIN_HOAT_DONG_CUOI_CUNG | 409 | Thao tác làm mất quản trị viên hoạt động cuối theo quy tắc nhóm đã chốt. |
| NHAN_VIEN_DA_NGHI_VIEC | 409 | Không mở quyền chỉ bằng mở khóa tài khoản. |
| VAI_TRO_KHONG_HOP_LE | 400 | Role ngoài tập nhân sự hoặc thiếu hồ sơ cần thiết. |
| QUYEN_DA_THAY_DOI | 403 | Token còn hạn nhưng quyền hiện tại không đủ; UI cần cập nhật/đăng nhập lại. |


### 4.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T1-A01 | Tạo nhân viên lỗi ở bước lưu hồ sơ | Không còn TAI_KHOAN mồ côi hoặc email bị chiếm bởi giao dịch đã rollback. |
| W5-T1-A02 | Hai admin hạ quyền nhau đồng thời khi chỉ còn hai người | Không kết thúc với 0 admin hoạt động. |
| W5-T1-A03 | Hạ admin xuống staff rồi dùng JWT cũ duyệt điều chỉnh kho | Bị chặn ngay theo quyền hiện tại. |
| W5-T1-A04 | Nhân viên nghỉ còn 2 phiếu bảo trì | Không còn quyền xử lý; hai phiếu còn dữ liệu/người được giao cũ để admin bàn giao. |
| W5-T1-A05 | Đổi họ tên nhân viên đã ký biên bản giao | Hồ sơ đổi, snapshot tên trong biên bản giữ nguyên. |
| W5-T1-A06 | Khóa khách đang chờ hoàn | Callback/nhân viên vẫn xử lý hoàn; không xóa đơn hoặc nguồn tiền. |
| W5-T1-A07 | Khách gọi route tạo nhân viên hoặc gửi role trong hồ sơ cá nhân | Không thể tạo tài khoản nhân sự/nâng quyền. |


**Đóng W5-T1:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 5. W5-T2 — Hoàn thiện bảo trì thiết bị (Tuấn Kiệt)

### 5.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC16. **Service/Controller:** `IBaoTriService` + `BaoTriService`; `BaoTriController`.

**Method chính:** `TimKiemAsync`, `LayChiTietAsync`, `LapPhieuAsync`, `PhanCongXuLyAsync`, `CapNhatTienDoAsync`, `GuiKiemTraAsync`, `XacNhanHoanThanhAsync`, `KetThucKhongDatAsync`.

**DTO cần có:** bộ lọc, lập phiếu, phân công, kết quả xử lý/chi phí/bằng chứng và xác nhận kiểm tra. `ma_don_thue` chỉ dùng khi phiếu thực sự liên quan lượt thuê đó.

#### Tiếp nhận và xử lý

- [ ] Đọc/tiếp tục phiếu đã được tạo khi nhập hàng lỗi hoặc nhận trả ở Tuần 3–4; không tạo phiếu mới chỉ vì mở module bảo trì.
- [ ] Gom logic tạo phiếu tối thiểu vào method dùng chung của `BaoTriService`; luồng nhập/nhận trả gọi trong transaction của mình, service bảo trì không tự commit sớm.
- [ ] Lập phiếu thủ công có thiết bị, loại vệ sinh/sửa chữa, mô tả lỗi, mức độ, ngày bắt đầu/dự kiến xong, bằng chứng và người lập.
- [ ] Quy ước tuần này: tối đa một phiếu bảo trì đang mở trên một thiết bị; nhiều lỗi cùng đợt được ghi trong phiếu hiện có. Kiểm tra bằng khóa thiết bị vì ERD không có unique cho trạng thái mở.
- [ ] Chỉ bắt đầu bảo trì khi thiết bị đã ở cửa hàng và không còn nghĩa vụ đang giao cho khách. Không chuyển chiếc đang thuê thành “đã vào xưởng” để bỏ qua nhận trả.
- [ ] Chuyển thiết bị sang đang bảo trì trong cùng transaction tạo/tiếp nhận phiếu; loại khỏi khả dụng ngay.
- [ ] Nếu có lịch đã gán hoặc cam kết sản phẩm tương lai, phải hiển thị ảnh hưởng và thông báo nhân viên để xử lý thay thế. Không giữ thiết bị hỏng ở trạng thái sẵn sàng chỉ để giữ số lượng đẹp.
- [ ] Phân người xử lý là nhân viên còn làm việc/có quyền; người xử lý cập nhật công việc, chi phí không âm, kết quả và ảnh/bằng chứng.
- [ ] Ngày dự kiến hoàn thành chỉ phục vụ theo dõi, không tự cho thuê lại khi đến ngày.

#### Kiểm tra và kết thúc

- [ ] Người xử lý gửi kết quả để kiểm tra. Quản trị viên hoặc nhân viên có quyền xác nhận phải kiểm tra thực tế; lưu người xác nhận, ngày hoàn thành thực tế, kết quả và chi phí cuối.
- [ ] Nếu chưa có phân quyền xác nhận riêng thì mặc định quản trị viên xác nhận; không cho mọi người xử lý tự bỏ qua bước kiểm tra.
- [ ] Hoàn thành đạt: khóa phiếu/thiết bị, kiểm tra lại chưa bị xử lý bởi chứng từ khác, chốt phiếu và chuyển sẵn sàng trong một transaction; ghi lịch sử/nhật ký.
- [ ] Hoàn thành không đạt/không thể sửa: lưu kết luận và kết thúc phiếu theo trạng thái phù hợp; thiết bị tiếp tục không khả dụng. Nếu cần ngừng sử dụng, lập đề nghị vòng đời W5-T3, không tạm đưa về sẵn sàng trước khi duyệt.
- [ ] Phiếu kết thúc không sửa/xóa nội dung đã chốt. Phát sinh lỗi mới sau này lập đợt bảo trì mới, có lịch sử riêng.
- [ ] Chi phí sửa chữa là chi phí cửa hàng theo phiếu, không tự trở thành phụ phí khách. Khoản bồi thường khách phải qua service phụ phí/đối soát của Tuần 4.
- [ ] Thiết bị sửa đạt có thể phục vụ lịch mới dù đơn cũ còn chờ xử lý tài chính; vẫn kiểm tra mọi cam kết thuê khác qua service khả dụng.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET, POST | `/api/bao-tri` | Tra cứu/lập; nhân viên, quản trị viên |
| GET | `/api/bao-tri/{id}` | Nhân viên, quản trị viên |
| POST | `/api/bao-tri/{id}/phan-cong` | Quản trị viên hoặc quyền điều phối đã có |
| PUT | `/api/bao-tri/{id}/tien-do` | Người xử lý được giao/quản trị viên |
| POST | `/api/bao-tri/{id}/gui-kiem-tra` | Người xử lý/quản trị viên |
| POST | `/api/bao-tri/{id}/hoan-thanh`, `/api/bao-tri/{id}/ket-thuc-khong-dat` | Người có quyền xác nhận |

**Nghiệm thu:** Phiếu bảo trì từ nhận trả được tiếp tục xử lý; đến ngày dự kiến chưa làm thiết bị khả dụng; chỉ xác nhận đạt mới trở lại sẵn sàng; bấm hoàn thành hai lần không ghi hai lần lịch sử chuyển trạng thái.

### 5.A. Thành phần phải bàn giao — Tuấn Kiệt

- [ ] `Services/Interfaces/IBaoTriService.cs (mở rộng)`
- [ ] `Services/BaoTriService.cs (mở rộng)`
- [ ] `Controllers/BaoTriController.cs`
- [ ] `Models/DTOs/BaoTri/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 5.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LapBaoTriRequest | maThietBi, maDonThue?, loaiXuLy, moTaLoi, mucDo, ngayDuKienHoanThanh?, bangChung | Thiết bị có thật và ở phạm vi có thể tiếp nhận; đơn nếu có phải liên quan vật phẩm. |
| PhanCongBaoTriRequest | maNguoiXuLy, lyDo? | Nhân sự đang làm/được phép xử lý; không lấy mã tài khoản thay mã nhân viên. |
| CapNhatTienDoRequest | ketQua, chiPhi, bangChung, ngayDuKienHoanThanh? | Chi phí >=0, mốc dự kiến hợp lệ; chưa cho client đặt trạng thái sẵn sàng. |
| XacNhanBaoTriRequest | ketQuaKiemTra, bangChung, ngayHoanThanhThucTe?, lyDo | Người kiểm tra có quyền; giờ thực tế không ở tương lai/trước bắt đầu; kết quả phải đủ để kết luận. |
| BaoTriResponse | nguồn lỗi, người lập/xử lý/kiểm tra, thời gian, chi phí, kết quả, trạng thái, đơn tương lai ảnh hưởng | Dự kiến xong tách khỏi xác nhận thực tế; không tự tạo phụ phí khách. |


### 5.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TimKiemAsync / LayChiTietAsync(filterOrId, actor) | Trang/chi tiết phiếu | Lọc thiết bị/nhân sự/trạng thái/ngày; thông tin giá theo quyền. |
| LapPhieuAsync(dto, actor) | Phiếu mới hoặc phiếu mở hiện có | Khóa thiết bị và phạm vi khả dụng; chuyển bảo trì + history cùng tx. |
| PhanCongXuLyAsync(id, dto, actor) | Phiếu có người xử lý mới | Role điều phối/admin; audit thay người, không mất lịch sử nhiệm vụ. |
| CapNhatTienDoAsync(id, dto, actor) | Tiến độ và chi phí hiện tại | Người được giao/admin; không sửa phiếu kết thúc. |
| GuiKiemTraAsync(id, actor) | Phiếu chờ xác nhận | Có mô tả kết quả/bằng chứng; không tự giải phóng khả dụng. |
| XacNhanHoanThanhAsync(id, dto, actor) | Phiếu đạt + thiết bị sẵn sàng | Một tx phiếu/thiết bị/history; kiểm tra hiện vật đã đủ điều kiện. |
| KetThucKhongDatAsync(id, dto, actor) | Phiếu không đạt + thiết bị chưa sẵn sàng | Chờ đề nghị ngừng/giáng cấp qua W5-T3/W5-T5; không mặc định thanh lý. |


### 5.D. Trình tự triển khai và tích hợp

1. Kế thừa các phiếu tối thiểu tạo lúc nhập lỗi/nhận trả ở Week 3–4; hoàn thiện cùng IBaoTriService, không tạo service/bảng bảo trì thứ hai.
2. Chốt bảng trạng thái theo enum hiện có: chờ xử lý → đang xử lý → chờ kiểm tra → hoàn thành/không đạt. Người xử lý gửi kiểm tra, quyền xác nhận cần rõ; nếu chưa có capability riêng thì dùng admin.
3. Khi lập, kiểm tra thiết bị đang ở cửa hàng; thiết bị đang khách giữ phải qua tiếp nhận trước. Khóa thiết bị để tránh hai phiếu mở; đây là quy tắc ứng dụng vì ERD không có unique phiếu mở.
4. Hỏng thật phải bị chặn khả dụng ngay dù ảnh hưởng cam kết sau. Lưu cảnh báo đơn thiếu để Kim Xuyến/ChuanBiDonService giải quyết; không để tiếp tục cho thuê chỉ vì đang có đơn tương lai.
5. Tách quyền người xử lý với các nhân viên khác; chuyển người khi nghỉ việc do admin thực hiện qua action phân công, không cập nhật trực tiếp từ client vào Entity.
6. Chi phí bảo trì là chi phí vận hành ghi trên phiếu. Muốn thu khách phải có PHU_PHI riêng được duyệt theo Week 4; không tự biến chi phí thợ thành khoản khách nợ.
7. Hoàn thành chỉ sau kiểm tra thực tế, ghi người/giờ/kết quả và lịch sử; ngày dự kiến hết hạn không tự mở khả dụng. Kết thúc không đạt vẫn chặn thuê cho đến quyết định hợp lệ.
8. Sau đổi trạng thái, query kho/khả dụng phải thấy cùng kết quả; thông báo lỗi không rollback phiếu đã chốt, xử lý qua hàng chờ.

### 5.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| THIET_BI_DANG_O_KHACH | 409 | Chưa thể tiếp nhận bảo trì tại kho. |
| THIET_BI_DA_CO_BAO_TRI_MO | 409 | Trả ID phiếu hiện có để tiếp tục, không lập trùng. |
| KHONG_PHAI_NGUOI_XU_LY | 403 | Nhân viên không được giao và không có quyền điều phối. |
| KET_QUA_KIEM_TRA_CHUA_DU | 400 | Thiếu bằng chứng/kết luận hoặc thời gian không hợp lệ. |
| PHIEU_BAO_TRI_DA_KET_THUC | 409 | Muốn sửa chứng từ chốt phải theo quy trình điều chỉnh/ghi nhận mới. |


### 5.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T2-A01 | Chiếc vừa nhận trả đã có phiếu bảo trì tối thiểu | Mở rộng phiếu đó, không sinh phiếu mở thứ hai. |
| W5-T2-A02 | Ngày dự kiến đã qua nhưng chưa xác nhận xong | Thiết bị vẫn không khả dụng. |
| W5-T2-A03 | Hai nhân viên cùng lập phiếu cho một thiết bị | Chỉ một phiếu mở, lịch sử không nhân đôi. |
| W5-T2-A04 | Phát hiện hỏng với lịch giao ngày mai | Chặn thiết bị ngay và nêu đơn ảnh hưởng, không tự hủy đơn. |
| W5-T2-A05 | Người không được phân công sửa tiến độ | 403, phiếu giữ nguyên. |
| W5-T2-A06 | Kết thúc không đạt | Không đưa thiết bị sẵn sàng hoặc ghi doanh thu thanh lý. |
| W5-T2-A07 | Chi phí sửa 300.000 trong phiếu | Không xuất hiện phụ phí khách 300.000 nếu chưa có quy trình duyệt phí riêng. |


**Đóng W5-T2:** Tuấn Kiệt bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 6. W5-T3 — Vòng đời thiết bị và giáng cấp (Tuấn Kiệt)

### 6.0. Phạm vi, quy tắc nghiệp vụ và API

**Service/Controller:** `IVongDoiThietBiService` + `VongDoiThietBiService`; `VongDoiThietBiController`. Service gọi `IDieuChinhKhoService` của Minh Tú để lập đề nghị; chỉ một nơi duyệt/áp dụng thay đổi.

**Method chính:** `LayHoSoVongDoiAsync`, `XemAnhHuongThayDoiAsync`, `DeNghiGiangCapAsync`, `DeNghiNgungSuDungAsync`.

- [ ] Hồ sơ thiết bị hiển thị nguồn nhập, sản phẩm hiện tại, lịch thuê, các phiếu bảo trì, điều chỉnh và lịch sử tình trạng từ dữ liệu hiện có.
- [ ] Giáng cấp chọn sản phẩm đích đã khai báo, ví dụ từ “Lều 4 người” sang “Lều 4 người — Cũ 80%”; không tự tạo một giá thuê riêng trên `THIET_BI`.
- [ ] Khi được duyệt, chỉ đổi `ma_san_pham_hien_tai` và dữ liệu tình trạng được cho phép; giữ nguyên mã thiết bị và FK nguồn nhập gốc.
- [ ] Giá thuê/cọc cho lượt mới theo sản phẩm đích; giá, cọc, bồi thường, sản phẩm đánh giá và nội dung đơn cũ giữ theo dòng đơn/snapshot cũ.
- [ ] Trước khi đề nghị và trước lúc áp dụng đều kiểm tra lịch đã gán và cam kết theo sản phẩm nguồn. Không chỉ kiểm tra chiếc đó có phân công hay chưa, vì sản phẩm có thể đã nhận đơn nhưng chưa gán mã.
- [ ] Nếu giảm số thiết bị sản phẩm nguồn làm thiếu cam kết tương lai, chặn áp dụng cho tới khi đã có phương án hợp lệ. Dùng luồng thay phân công/hủy có chính sách của các tuần trước; không tự chuyển đơn đã trả tiền sang sản phẩm rẻ hơn.
- [ ] Không giáng cấp/ngừng sử dụng thiết bị đang ở khách hoặc chưa xử lý nghĩa vụ nhận trả. Thiết bị đã trả nhưng còn giao dịch tài chính của đơn cũ không bị coi là vẫn đang ở khách.
- [ ] Thiết bị đang bảo trì phải xử lý kết luận phiếu trước khi ngừng sử dụng; không để một phiếu đang sửa tiếp tục cập nhật chiếc đã thanh lý.
- [ ] Ngừng sử dụng/thanh lý yêu cầu lý do và quản trị viên duyệt, giữ lịch sử. Phạm vi tuần này ghi việc loại khỏi khai thác, không xây thêm nghiệp vụ bán thanh lý/thu tiền thanh lý.
- [ ] Thất lạc trong lượt thuê phải đi hồ sơ mất Tuần 4. Tìm thấy lại không tự hủy khoản bồi thường/hoàn tiền cũ; xử lý tình trạng và phần tài chính bằng quy trình tương ứng, có phê duyệt.
- [ ] Không có `PUT` tự do để client gán `SanSang`, `DangThue`, sản phẩm mới hoặc xóa thiết bị nhằm bỏ qua chứng từ.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/vong-doi-thiet-bi/{id}` | Nhân viên, quản trị viên |
| POST | `/api/vong-doi-thiet-bi/{id}/xem-anh-huong` | Nhân viên, quản trị viên; chỉ đọc/đánh giá phương án |
| POST | `/api/vong-doi-thiet-bi/{id}/de-nghi-giang-cap` | Nhân viên đề nghị; quản trị viên duyệt ở W5-T5 |
| POST | `/api/vong-doi-thiet-bi/{id}/de-nghi-ngung-su-dung` | Nhân viên đề nghị; quản trị viên duyệt ở W5-T5 |

**Nghiệm thu:** Đổi chiếc L003 từ sản phẩm A sang B không làm đổi phiếu nhập ban đầu, đơn thuê cũ hoặc đánh giá cũ. Nếu A còn đơn chưa bố trí đủ đồ thì chưa cho áp dụng việc giảm nguồn thiết bị của A.

### 6.A. Thành phần phải bàn giao — Tuấn Kiệt

- [ ] `Services/Interfaces/IVongDoiThietBiService.cs`
- [ ] `Services/VongDoiThietBiService.cs`
- [ ] `Controllers/VongDoiThietBiController.cs`
- [ ] `Models/DTOs/VongDoiThietBi/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 6.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| XemAnhHuongThayDoiRequest | loaiThayDoi, maSanPhamDich?, lyDo | Đích chỉ có với giáng cấp, phải tồn tại/đang khai thác phù hợp; không nhận sửa nguồn nhập. |
| DeNghiGiangCapRequest | maSanPhamDich, tinhTrang, lyDo, bangChung | Chứng minh thiết bị phù hợp nhóm đích; giá thuê/cọc theo SAN_PHAM đích cho đơn mới, không đặt giá riêng trên thiết bị. |
| DeNghiNgungSuDungRequest | lý do, bằng chứng, kết luận kiểm tra | Chỉ đề nghị; áp dụng qua duyệt điều chỉnh của Minh Tú. |
| HoSoVongDoiResponse | nguồn nhập gốc, sản phẩm nguồn, sản phẩm hiện tại, lịch thuê/trả/bảo trì/điều chỉnh, trạng thái và cam kết | Nguồn nhập bất biến; lịch sử đơn đánh giá vẫn theo sản phẩm lúc đặt. |
| AnhHuongThayDoiResponse | coTheDeNghi, coTheApDungHienTai, camKetCuThe[], thieuSoLuongTheoLich[], vướng mắc | Preview không giữ khóa đến lúc duyệt; phải kiểm tra lại khi áp dụng. |


### 6.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayHoSoVongDoiAsync(thietBiId, actor) | Hồ sơ và chứng từ nguồn | Đọc THIET_BI + nhập + bàn giao/trả + bảo trì + điều chỉnh; giá nhập chỉ admin. |
| XemAnhHuongThayDoiAsync(id, dto, actor) | Kết quả giả lập tác động | Gọi PhanTichAnhHuong/KhaDung của Minh Tú; không đổi dữ liệu. |
| DeNghiGiangCapAsync(id, dto, actor) | ID phiếu điều chỉnh nháp | Gọi IDieuChinhKhoService.LapPhieuAsync cùng contract, không tự đổi FK. |
| DeNghiNgungSuDungAsync(id, dto, actor) | ID đề nghị ngừng | Dùng loại điều chỉnh tương ứng, giữ mọi chứng từ cũ. |


### 6.D. Trình tự triển khai và tích hợp

1. Tuấn Kiệt phụ trách màn/API hồ sơ và đề nghị; Minh Tú là chủ code duyệt/áp dụng. Chỉ một đường ghi ma_san_pham_hien_tai qua chứng từ hợp lệ.
2. Đọc nguồn nhập qua ma_chi_tiet_phieu_nhap để biết sản phẩm/giá khi mua; đọc ma_san_pham_hien_tai để biết nhóm đang khai thác. DTO cần cả hai trường, không dùng một tên gây hiểu nhầm.
3. Kiểm tra đang thuê/chưa thu hồi trước mọi đề nghị áp dụng. Thiết bị đã nhận trả đạt nhưng đơn còn chờ tiền có thể xử lý vòng đời nếu không vướng cam kết khác.
4. Phân tích khả dụng sau khi giả lập bỏ thiết bị khỏi nhóm nguồn và thêm vào nhóm đích; xem cả lịch gán cụ thể lẫn nhu cầu đặt theo sản phẩm chưa gán.
5. Nếu ảnh hưởng cam kết, nêu đơn/khung giờ/số lượng thiếu và yêu cầu xử lý thay thế qua ChuanBiDonService trước duyệt. Admin không được bỏ qua bằng một cờ force không có trong đặc tả.
6. Tạo phiếu đề nghị với snapshot trước/sau và ảnh; giữ nguyên nhập gốc, giá nhập lịch sử và chi tiết đơn đã ký. Không chuyển đánh giá cũ sang sản phẩm đích.
7. Tìm lại thiết bị từng mất: ghi căn cứ và trạng thái thật qua quy trình riêng đã duyệt; không tự đảo bồi thường/hoàn của đơn cũ. Nếu cần sửa tiền, dùng Week 4.

### 6.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| THIET_BI_CHUA_THU_HOI | 409 | Chưa kết luận trả/mất hợp lệ hoặc còn ở khách. |
| THAY_DOI_LAM_THIEU_CAM_KET | 409 | Liệt kê lịch/đơn cần xử lý trước khi áp dụng. |
| SAN_PHAM_DICH_KHONG_PHU_HOP | 400 | Đích không tồn tại, không khai thác hoặc không phù hợp phương án. |
| NGUON_NHAP_BAT_BIEN | 400 | Request chứa thay đổi nguồn nhập/giá lịch sử trái quy trình. |


### 6.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T3-A01 | Giáng cấp từ sản phẩm A sang B sau duyệt | Current product là B; nguồn nhập vẫn A, đơn cũ/đánh giá cũ vẫn A. |
| W5-T3-A02 | Một chiếc đang phục vụ khách nhưng admin đề nghị ngừng | Không được áp dụng dù quyền admin. |
| W5-T3-A03 | Không có phân công cụ thể nhưng nhóm nguồn đã nhận đủ đơn theo số lượng | Preview/duyệt vẫn phát hiện thiếu khi bỏ thiết bị. |
| W5-T3-A04 | Đã trả tốt, đơn cũ đang chờ hoàn, không còn cam kết tương lai | Có thể đề nghị hợp lệ; không chặn chỉ vì tài chính đơn cũ chưa xong. |
| W5-T3-A05 | Preview hôm trước không vướng, trước duyệt phát sinh đơn mới | Duyệt kiểm tra lại và từ chối nếu thiếu; không tin preview cũ. |
| W5-T3-A06 | Tìm lại vật phẩm đã bồi thường mất | Không tự xóa phí hoặc hoàn tiền; giữ liên kết bằng chứng để xử lý riêng. |


**Đóng W5-T3:** Tuấn Kiệt bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 7. W5-T4 — Theo dõi kho, kiểm kê và khả dụng (Minh Tú)

### 7.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC22. **Service/Controller:** `IKhoService` + `KhoService`; `KhoController`; mở rộng `ThietBiService`, `KhaDungService`.

**Method chính:** `LayTongQuanKhoAsync`, `TimThietBiAsync`, `LayDoiChieuKiemKeAsync`, `PhanTichAnhHuongAsync`.

- [ ] Lọc thiết bị theo sản phẩm hiện tại, mã, trạng thái, tình trạng, nguồn nhập và thời gian; phân trang thay vì trả toàn bộ kho.
- [ ] Phân biệt số hồ sơ thiết bị, số đang khai thác, sẵn sàng tại kho, đang thuê, bảo trì, thất lạc, ngừng sử dụng. Tổng hồ sơ lịch sử không được gắn nhãn là toàn bộ tài sản còn thực tế trong kho.
- [ ] Khả dụng theo khoảng thuê tiếp tục gọi `KhaDungService`; số sẵn sàng tại thời điểm hiện tại không thay thế số có thể nhận đặt cho một khoảng ngày.
- [ ] Khi kiểm kê, đối chiếu theo danh sách mã thiết bị; đồ đang thuê/được ghi nhận đang xử lý không mặc định là mất chỉ vì không nhìn thấy tại kho.
- [ ] Request đối chiếu có phạm vi sản phẩm/trạng thái và danh sách thực kiểm. Không gửi mã của sản phẩm khác rồi âm thầm ghi giảm phần ngoài phạm vi.
- [ ] Kết quả phân biệt khớp, thiếu cần xác minh, mã lạ, trùng quét, khác tình trạng/sản phẩm và nguồn nhập chưa rõ. Đây là kết quả kiểm tra, chưa tự cập nhật tồn.
- [ ] ERD không có thực thể phiên kiểm kê; API phân tích không tự nhận là đã lưu một phiên lâu dài. Khi lập điều chỉnh, lưu phạm vi, danh sách chênh lệch và bằng chứng cần thiết trong chứng từ/JSON hiện có.
- [ ] Thiết bị phát hiện hỏng phải được đưa qua nghiệp vụ bảo trì để ngừng cho thuê kịp thời; không đợi một phiếu sửa số liệu mới loại khỏi khả dụng.
- [ ] Khả dụng phản ánh ngay sau bảo trì đạt, bắt đầu bảo trì, nhận trả, điều chỉnh được áp dụng hoặc giáng cấp. Nếu có cache, làm mất hiệu lực theo sản phẩm/thiết bị bị ảnh hưởng.
- [ ] Đơn và phân công của cùng một cam kết vẫn chỉ tính một lần; thiết bị đã trả đạt kiểm tra không bị giữ đến lúc đối soát tài chính xong.
- [ ] Đọc lịch sử trên hồ sơ thiết bị dùng dữ liệu hiện có và helper Tuần 3; giao diện tra cứu audit toàn hệ thống vẫn thuộc Tuần 6.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/kho/tong-quan` | Nhân viên, quản trị viên |
| GET | `/api/kho/thiet-bi` | Nhân viên, quản trị viên |
| POST | `/api/kho/kiem-ke/doi-chieu` | Nhân viên, quản trị viên; chỉ phân tích |
| POST | `/api/kho/dieu-chinh/xem-anh-huong` | Nhân viên, quản trị viên; chỉ phân tích phương án |

**Nghiệm thu:** Quét thiếu một chiếc đang thuê không làm chiếc đó thành thất lạc; xem đối chiếu không tự giảm kho; số khả dụng cập nhật sau bảo trì/giáng cấp và vẫn đúng các lịch đã cam kết.

### 7.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/Interfaces/IKhoService.cs`
- [ ] `Services/KhoService.cs`
- [ ] `Services/KhaDungService.cs (mở rộng nếu cần)`
- [ ] `Controllers/KhoController.cs`
- [ ] `Models/DTOs/Kho/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 7.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LocKhoRequest | maSanPhamHienTai?, trangThai?, tuKhoa?, trang, soMoiTrang, gioNhan?, gioTra? | Ngày thuê gửi đủ cặp; tồn hiện tại và khả dụng theo lịch là hai kết quả riêng. |
| DoiChieuKiemKeRequest | phạm vi sản phẩm/trạng thái/vị trí quy ước kho đơn, thoiDiemKiemKe, danhSachMaQuet[], ghiChu | Không có Entity phiên kiểm kê; request/báo cáo phân tích, phạm vi và giờ phải hiện rõ. |
| KhoTongQuanResponse | số hồ sơ hợp lệ theo trạng thái hiện tại, số ở kho, số đang khách giữ, bảo trì, thất lạc/ngừng, khả dụng theo khoảng nếu có | Không dùng tổng bản ghi THIET_BI làm số hàng sẵn sàng. |
| DoiChieuKiemKeResponse | đúng, thiếu trong phạm vi, thừa/mã lạ, quét trùng, khác tình trạng, cần xác minh, dấu dữ liệu | Không UPDATE trạng thái từ việc vắng trong danh sách quét. |


### 7.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LayTongQuanKhoAsync(filter, actor) | Tổng theo sản phẩm hiện tại và trạng thái | Query read-only; tiền nhập chỉ có khi role được phép. |
| TimThietBiAsync(filter, actor) | Trang thiết bị và nguồn/vướng mắc | Lọc current product; phản hồi riêng source product để truy vết. |
| LayDoiChieuKiemKeAsync(dto, actor) | Báo cáo sai lệch | Chuẩn hóa mã, dedupe, xác định tập kỳ vọng theo phạm vi; không tạo chứng từ ghi kho. |
| PhanTichAnhHuongAsync(phuongAn, actor) | Khả dụng sau thay đổi + các cam kết thiếu | Dùng cùng bộ tính với đặt đơn/phân công; chỉ đọc, xét cả nguồn/đích khi giáng cấp. |


### 7.D. Trình tự triển khai và tích hợp

1. Minh Tú lập bảng định nghĩa từng thẻ kho: hồ sơ thực vật hợp lệ, đang ở cửa hàng, đang cho thuê, cần xử lý, không khai thác; một thẻ không được vô tình đếm thiết bị trùng/sai đã loại.
2. Thống kê theo ma_san_pham_hien_tai. Báo cáo lịch sử mua của Week 6 vẫn dựa nguồn nhập, tránh giáng cấp làm thay đổi lịch sử mua.
3. Khả dụng khoảng thuê đi qua service chung, không lấy tổng sẵn sàng trừ số đang thuê ở hiện tại để trả lời mọi ngày tương lai.
4. Kiểm kê nhận phạm vi rõ; thiết bị đang ở khách nằm ngoài tập kỳ vọng hiện vật tại kho. Mã quét trùng chỉ đếm một, mã lạ trả để xác minh, không tự thêm THIET_BI.
5. Response chỉ là ảnh dữ liệu được đọc tại lần đối chiếu. Muốn lưu căn cứ giải quyết, đính kèm kết quả/ảnh vào PHIEU_DIEU_CHINH_KHO có sẵn; không tuyên bố đã có phiên kiểm kê bền vững khi chưa lưu chứng từ.
6. Sai lệch kiểm kê không tự kết luận mất/hỏng. Hỏng thật được xác minh có thể mở bảo trì ngay; thiếu/thừa phải kiểm nguồn và phê duyệt điều chỉnh phù hợp.
7. Phân tích phương án read-only trả danh sách lý do chặn; DuyetVaApDung phải tự kiểm tra lại dưới khóa vì dữ liệu có thể thay đổi sau preview.
8. Không hứa trả tồn tại một ngày quá khứ bằng trạng thái hôm nay; dữ liệu lịch sử cần thiết kế kiểm chứng riêng, phạm vi tuần này là hiện tại và lịch cam kết.

### 7.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| PHAM_VI_KIEM_KE_KHONG_RO | 400 | Không xác định tập kỳ vọng hoặc mốc/phạm vi không hợp lệ. |
| KHOANG_THUE_KHONG_HOP_LE | 400 | Thiếu một đầu hoặc trả <= nhận. |
| PHUONG_AN_THIEU_DU_LIEU | 400 | Loại thay đổi không đủ thiết bị/nguồn/đích để giả lập. |
| KHONG_CO_QUYEN_XEM_GIA_NHAP | 403 | Endpoint/phần dữ liệu tiền nhập chỉ admin. |


### 7.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T4-A01 | Kho có 10 hồ sơ: 2 đang khách giữ, 1 bảo trì, 1 ngừng, 6 sẵn sàng | Các nhóm đúng, không hiện 10 sẵn sàng; khả dụng tương lai còn phải trừ cam kết. |
| W5-T4-A02 | Kiểm kê tại kho không quét 2 chiếc đang khách giữ | Không gắn hai chiếc này thành thất lạc tại kho. |
| W5-T4-A03 | Quét cùng mã 3 lần và một mã lạ | Một bản trong tập thực nhận, cảnh báo trùng 2 lần và mã lạ riêng. |
| W5-T4-A04 | Gửi danh sách thiếu 1 mã hợp lệ | Response nêu cần xác minh; DB trạng thái/giá/nguồn không đổi. |
| W5-T4-A05 | Giáng cấp một chiếc A→B | Tổng hiện tại A giảm/B tăng; tổng lịch sử nhập theo nguồn giữ nguyên. |
| W5-T4-A06 | Nhân viên gọi query kho | Nhận dữ liệu vận hành, không nhận giá nhập/tổng tiền ngoài quyền. |
| W5-T4-A07 | Giỏ giữ hết số lượng ngày mai dù hôm nay còn sẵn | Khả dụng ngày mai trả đúng phần còn, không trả tồn hiện tại thay thế. |


**Đóng W5-T4:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 8. W5-T5 — Điều chỉnh kho và sai lệch phiếu nhập (Minh Tú)

### 8.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** Phần còn lại UC20 + UC22. **Service/Controller:** `IDieuChinhKhoService` + `DieuChinhKhoService`; `DieuChinhKhoController`.

**Method chính:** `LapPhieuAsync`, `CapNhatNhapAsync`, `GuiDuyetAsync`, `TuChoiAsync`, `DuyetVaApDungAsync`, `LayChiTietAsync`, `TinhGiaTriSauDieuChinhAsync`.

**DTO:** Loại điều chỉnh, phiếu nhập liên quan nếu có, lý do/bằng chứng, danh sách đối tượng và giá trị đề nghị. Server tự tải và dựng `gia_tri_truoc`; `gia_tri_sau` chỉ nhận các thuộc tính được cho phép cho đúng loại nghiệp vụ.

#### Các loại điều chỉnh cần làm

| Loại | Bắt buộc có | Cách áp dụng |
|---|---|---|
| Sai giá nhập đã chốt | Phiếu/dòng nhập, giá đúng, căn cứ | Ghi giá/chênh lệch điều chỉnh riêng; bản gốc không bị sửa, số thiết bị không đổi |
| Khai báo thiếu thiết bị trong một lần nhập đã có | Dòng nhập gốc, bằng chứng thực nhận cũ và từng mã vật phẩm bổ sung | Tạo đúng thiết bị còn thiếu khi duyệt, gắn nguồn nhập đã xác minh; không dùng cho hàng mới mua hôm nay |
| Khai báo trùng/sai một thiết bị | Mã hồ sơ cụ thể, chứng cứ, kiểm tra lịch sử/cam kết | Loại hồ sơ sai khỏi khai thác và ghi rõ căn cứ; giữ hồ sơ để truy vết, không xóa vật phẩm hợp lệ |
| Thiếu/thừa khi kiểm kê cần xử lý | Danh sách mã, phạm vi kiểm kê, bằng chứng và kết luận | Cập nhật chỉ thiết bị đã xác minh; mã chưa rõ nguồn không tự tạo thành hàng cho thuê |
| Đổi sản phẩm hiện tại/giáng cấp | Thiết bị, sản phẩm nguồn/đích, tình trạng và lịch ảnh hưởng | Đổi FK sản phẩm hiện tại sau duyệt; giữ nguồn nhập và chứng từ lịch sử |
| Ngừng sử dụng/loại khỏi khai thác | Thiết bị, căn cứ chất lượng/quyết định và kiểm tra lịch | Đổi trạng thái phù hợp, ghi trước/sau; không xóa và không tự ghi doanh thu thanh lý |

**Phân biệt nguồn tăng/giảm:** Mua thêm hàng → phiếu nhập mới. Khách trả đồ → phiếu nhận trả. Sửa thiếu sót dữ liệu của lần nhập cũ → điều chỉnh có chứng cứ. Không có nút nhập một con số tổng để tăng/giảm tùy ý trên sản phẩm.

#### Từ nháp đến áp dụng

1. Nhân viên/quản trị viên lập nháp, chọn đúng loại và đối tượng; service lấy snapshot trước, dựng phương án sau, lưu bằng chứng và tên người lập.
2. Chỉ người lập hoặc quản trị viên được sửa nháp; gửi duyệt khóa nội dung để tránh đổi sau khi người duyệt đã kiểm tra. Sửa lại phải trả về nháp có nhật ký.
3. Quản trị viên duyệt hoặc từ chối có lý do. Tuần này dùng hành động **duyệt và áp dụng trong một transaction** khi điều kiện hợp lệ, tránh một phiếu được duyệt rồi bị áp dụng tự do bằng API khác.
4. Khóa phiếu, các thiết bị/dòng nhập và nguồn khả dụng liên quan theo quy tắc thống nhất với đặt đơn/phân công/bàn giao.
5. Đọc lại dữ liệu, gồm giá trị hiệu lực sau các điều chỉnh trước, so với snapshot trước và kiểm tra quyền/lịch/cam kết hiện tại. Dữ liệu đã đổi thì 409 và yêu cầu lập lại phương án; không áp giá trị cũ lên tình trạng mới.
6. Kiểm tra toàn bộ dòng rồi áp dụng toàn bộ hoặc rollback toàn bộ. Ghi người duyệt, thời điểm duyệt/áp dụng, snapshot tên, trước/sau và lịch sử/nhật ký.
7. Trả kết quả thiết bị/giá trị hiệu lực sau điều chỉnh; gọi làm mới khả dụng và hiển thị cảnh báo cần xử lý theo contract chung.

- [ ] Bấm duyệt lại không áp dụng lần hai. Không mặc định ERD có `rowversion`; dùng trạng thái có điều kiện và khóa/so sánh dữ liệu thích hợp.
- [ ] Phiếu đã áp dụng không sửa/xóa/hủy để đảo lịch sử. Sửa sai tiếp bằng phiếu mới, ghi tham chiếu phiếu trước trong bằng chứng/nhật ký hiện có; ERD không có cột `ma_phieu_dieu_chinh_goc` nên không tự thêm.
- [ ] Một phiếu điều chỉnh sai nhập chỉ gắn một phiếu nhập gốc theo FK đầu phiếu; muốn sửa nhiều phiếu nhập thì lập các chứng từ tương ứng, không trộn dòng khác nguồn.
- [ ] Dòng thêm thiết bị có thể chưa có `ma_thiet_bi` ở nháp; khi duyệt tạo thiết bị rồi gắn mã mới vào chi tiết trong cùng transaction. Luôn có `ma_chi_tiet_phieu_nhap` hợp lệ và mã thiết bị không trùng.
- [ ] Sau thêm/bớt khai báo của lần nhập cũ, lượng hiệu lực = lượng gốc + chênh lệch của các phiếu **đã áp dụng**. Danh sách thiết bị, phần tổng hợp và chi tiết điều chỉnh phải khớp nhau; không đổi `so_luong` của dòng nhập gốc.
- [ ] Giữ `tong_tien`, đơn giá, số lượng và snapshot trên phiếu nhập gốc. Response tách “giá trị gốc”, “điều chỉnh”, “giá trị sau điều chỉnh”; không hiển thị chênh lệch như một lần mua hàng mới.
- [ ] Với sai giá, không ghi đè giá nhập lịch sử của thiết bị. Giá trị mua hiệu lực được service tổng hợp từ nguồn gốc và chuỗi điều chỉnh; phải thống nhất phép tính cho cả trang chi tiết thiết bị và báo cáo Tuần 6.
- [ ] Với hồ sơ khai báo sai bị loại, hiển thị riêng lý do loại/không còn khai thác; không đếm mọi bản ghi còn lưu thành số vật phẩm thực tế đang sở hữu/tại kho.
- [ ] Không giảm/loại/giáng cấp thiết bị đang thuê, chưa thu hồi hoặc còn lịch/cam kết bị thiếu sau thay đổi. Có quyền quản trị cũng không bỏ qua điều kiện này.
- [ ] Việc bắt đầu bảo trì do hỏng thật được phép loại thiết bị khỏi khả dụng ngay kèm cảnh báo; đó là bảo vệ tình trạng thực tế, khác với điều chỉnh giảm/giáng cấp chủ động cần giải quyết cam kết trước.
- [ ] Không dùng điều chỉnh kho để sửa kết luận mất hoặc xóa nghĩa vụ của đơn đang thuê; không tự đảo phụ phí/hoàn tiền Tuần 4 khi tìm lại một vật phẩm.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET, POST | `/api/dieu-chinh-kho` | Tra cứu/lập đề nghị; nhân viên, quản trị viên |
| GET, PUT | `/api/dieu-chinh-kho/{id}` | Xem/sửa nháp theo quyền |
| POST | `/api/dieu-chinh-kho/{id}/gui-duyet` | Người lập/quản trị viên |
| POST | `/api/dieu-chinh-kho/{id}/tu-choi` | Quản trị viên |
| POST | `/api/dieu-chinh-kho/{id}/duyet-ap-dung` | Quản trị viên |

**Nghiệm thu:** Sai giá chỉ đổi giá trị hiệu lực, không sinh thêm thiết bị; bổ sung hồ sơ thiếu phải có nguồn nhập và chỉ tạo một lần; chứng từ gốc còn nguyên; thiết bị đang thuê hoặc làm thiếu cam kết không bị loại/giáng cấp trái quy trình.

### 8.A. Thành phần phải bàn giao — Minh Tú

- [ ] `Services/Interfaces/IDieuChinhKhoService.cs`
- [ ] `Services/DieuChinhKhoService.cs`
- [ ] `Controllers/DieuChinhKhoController.cs`
- [ ] `Models/DTOs/DieuChinhKho/`
- [ ] `Services/Queries/GiaTriNhapHieuLucQuery.cs (hoặc helper tương đương)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 8.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| LapDieuChinhKhoRequest | loaiDieuChinh, maPhieuNhapLienQuan?, lyDo, bangChung, chiTiet[] | Loại allowlist; phiếu sửa nhập chỉ một phiếu nguồn; bắt buộc căn cứ. |
| DongDieuChinhRequest | maThietBi?, maChiTietPhieuNhap?, giaTriDeNghiSau | Server dựng gia_tri_truoc từ dữ liệu hiệu lực; chỉ nhận thuộc tính được phép theo loại, không nhận JSON tùy ý cập nhật Entity. |
| GuiDuyetRequest / QuyetDinhRequest | lý do/ghi chú; dấu phương án nếu dùng | Gửi duyệt khóa nội dung; admin duyệt và áp dụng một transaction, không có bước apply công khai bỏ qua duyệt. |
| DieuChinhKhoResponse | nguồn, loại, trước/sau, chênh lệch lượng/giá trị, người/giờ, trạng thái, lỗi ảnh hưởng | Phân biệt delta vật lý và delta sửa sai khai báo nhập. |
| GiaTriNhapHieuLucResponse | lượng/đơn giá/giá trị gốc, chuỗi điều chỉnh đã áp dụng, lượng/giá trị hiệu lực | Không sửa THIET_BI.gia_nhap hay CHI_TIET_PHIEU_NHAP gốc. |


### 8.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LapPhieuAsync(dto, actor) | Phiếu nháp và snapshot trước/sau | Đọc dữ liệu hiệu lực hiện tại; tạo đầu/dòng/bằng chứng. |
| CapNhatNhapAsync(id, dto, actor) | Nháp mới | Người lập/admin, dựng lại snapshot trước; chỉ khi chưa gửi duyệt. |
| GuiDuyetAsync(id, actor) | Chờ duyệt | Kiểm tra đủ bằng chứng/mapping loại và khóa nội dung. |
| TuChoiAsync(id, lyDo, actor) | Phiếu từ chối | Admin, giữ lịch sử; không áp dụng dữ liệu. |
| DuyetVaApDungAsync(id, actor) | Phiếu áp dụng + thiết bị/giá trị hiệu lực | Khóa phiếu/sản phẩm/nguồn/thiết bị theo trật tự chung, recheck snapshot/cam kết, ghi toàn bộ nguyên tử. |
| LayChiTietAsync(id, actor) | Chứng từ và nguồn truy vết | Giá nhập theo quyền, phiếu đã áp dụng chỉ đọc. |
| TinhGiaTriSauDieuChinhAsync(nguonId, mocBaoCao?) | Giá trị hiệu lực từ gốc và chuỗi áp dụng | Helper dùng cho trang kho/nhập và báo cáo Week 6; mốc chỉ lọc các delta có ngày áp dụng khi thực sự cần. |


### 8.D. Trình tự triển khai và tích hợp

1. Minh Tú chốt schema JSON theo từng loại. Ví dụ sai giá có donGiaHieuLucTruoc/Sau và deltaGiaTri; giáng cấp có product hiện tại trước/đích; thêm thiếu có nguồn nhập, mã vật phẩm và bằng chứng nhận cũ. Đây là keys JSON, không phải cột mới.
2. Server lấy gia_tri_truoc bằng projection hiệu lực gồm các điều chỉnh đã áp dụng. Client chỉ đề nghị giá trị sau; từ chối field như trạng thái duyệt, người duyệt, nguồn nhập tùy ý.
3. Phân biệt sai khai báo nhập với biến động thực vật sau mua: sửa thiếu/trùng của lần nhập cũ có thể đổi lượng mua hiệu lực; thất lạc/thanh lý/giáng cấp sau mua không tự giảm giá trị mua lịch sử.
4. Gửi duyệt làm phương án bất biến. Nếu cần sửa, có action trả về nháp kèm audit theo quy ước nhóm hoặc lập nháp mới; không sửa nội dung đang chờ ngay dưới người duyệt.
5. Duyệt dưới khóa, đọc lại snapshot và mọi cam kết nguồn/đích. Bất kỳ dòng cũ/stale, thiếu nguồn, mã trùng hoặc giảm khả dụng trái cam kết thì rollback toàn bộ và 409.
6. Sai giá: lưu điều chỉnh, không sinh thiết bị mới/ghi đè giá gốc. Thiếu khai báo cũ: tạo đúng THIET_BI khi duyệt, FK nhập hợp lệ, current product phù hợp, điền ma_thiet_bi vào dòng điều chỉnh đang có trong cùng tx.
7. Loại hồ sơ trùng/sai giữ bản ghi để truy vết và đưa ra khỏi tập tài sản hợp lệ; không xóa vật phẩm có lịch sử thật. Mã lạ không có nguồn nhập phải chờ xác minh, không tự tạo hàng cho thuê.
8. Giáng cấp/ngừng theo preview W5-T3 chỉ áp dụng khi kiểm tra lại không còn vướng. Thiết bị đang thuê/chưa thu hồi không được sửa để xóa nghĩa vụ đơn; phát hiện hỏng thực tế đi bảo trì.
9. Tính delta theo giá trị hiệu lực ngay trước/sau từng phiếu; giá sửa lần 2 so với giá hiệu lực lần 1, không lại trừ giá gốc. Các tổng kho/báo cáo đều gọi cùng helper.
10. Ghi người, giờ duyệt/áp dụng, snapshot tên, lịch sử thiết bị/audit và commit. Duyệt lặp trả kết quả cũ; trạng thái đã áp dụng không chạy lần hai.
11. Sửa sai sau áp dụng bằng phiếu mới với tham chiếu phiếu trước trong bằng chứng/nhật ký. ERD không có ma_phieu_dieu_chinh_goc; không thêm cột hoặc giả định đã tồn tại.

### 8.E. Ví dụ contract

Minh họa DTO đề nghị sai giá; tên key JSON cần map sang convention repo ở Day 1:
```json
{"loaiDieuChinh":"SaiGiaNhap","maPhieuNhapLienQuan":101,"lyDo":"Đối chiếu lại hóa đơn nhà cung cấp","bangChung":["files/demo/hoa-don-101.pdf"],"chiTiet":[{"maChiTietPhieuNhap":201,"giaTriDeNghiSau":{"donGiaHieuLuc":900000}}]}
```
Server tự lấy giá hiệu lực trước. Không nhận `giaTriTruoc` do client khẳng định là dữ liệu đáng tin.

### 8.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| SNAPSHOT_DIEU_CHINH_DA_CU | 409 | Dữ liệu hiệu lực/cam kết đã thay đổi; cần lập lại phương án. |
| CHI_TIET_KHAC_NGUON_NHAP | 400 | Dòng không thuộc phiếu nguồn trên đầu phiếu. |
| THUOC_TINH_DIEU_CHINH_BI_CAM | 400 | JSON sau chứa field ngoài allowlist của loại. |
| CHUNG_CU_NHAP_CU_CHUA_DU | 409 | Chưa chứng minh vật phẩm thực nhận từ lần nhập cũ. |
| MA_THIET_BI_TRUNG | 409 | Unique vật phẩm đã có; toàn phiếu rollback. |
| DIEU_CHINH_VUONG_CAM_KET | 409 | Đang thuê/chưa thu hồi hoặc làm thiếu lịch đã nhận. |
| PHIEU_DA_AP_DUNG | 409 | Muốn sửa/hủy dữ liệu chốt; yêu cầu lập phiếu mới. |


### 8.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T5-A01 | Gốc 5 chiếc ×1.000.000; sửa giá hiệu lực xuống 900.000 | Gốc 5.000.000; delta -500.000; hiệu lực 4.500.000; vẫn 5 thiết bị. |
| W5-T5-A02 | Sau đó sửa giá hiệu lực từ 900.000 lên 950.000 | Delta lần hai +250.000; tổng hiệu lực 4.750.000, không cộng sai thêm -250.000 từ giá gốc. |
| W5-T5-A03 | Khai báo thiếu 1 chiếc của lần nhập cũ, đủ bằng chứng, bấm duyệt 2 lần | Tạo đúng 1 thiết bị, lượng hiệu lực +1; không đổi lượng trên dòng gốc. |
| W5-T5-A04 | Gốc đã sở hữu 5 chiếc, sau thuê mất 1 chiếc | Tài sản khai thác giảm nhưng không tự sửa giá trị mua gốc như chưa từng mua chiếc đó. |
| W5-T5-A05 | Phiếu 2 dòng, dòng thứ hai bị trùng mã thiết bị | Không có dòng đầu áp dụng dở dang, không có history chốt giả. |
| W5-T5-A06 | Hai phiếu sửa cùng nguồn được lập từ cùng snapshot | Sau phiếu đầu áp dụng, phiếu thứ hai bị stale 409 nếu trước không còn khớp. |
| W5-T5-A07 | Giáng cấp đã preview an toàn nhưng khách đặt thêm trước duyệt | Duyệt phát hiện thiếu và từ chối. |
| W5-T5-A08 | Nhân viên gửi JSON giaTriSau chứa maNguoiDuyet/trangThaiDaApDung | Bị reject, không nâng quyền qua JSON. |


**Đóng W5-T5:** Minh Tú bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 9. W5-T6 — Đánh giá sản phẩm và kiểm duyệt (Kiện Minh)

### 9.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC08; hoàn thiện bộ lọc đánh giá còn lại của UC03. **Service/Controller:** `IDanhGiaService` + `DanhGiaService`; `DanhGiaController`, `Admin/DanhGiaController`; mở rộng truy vấn sản phẩm.

**Method chính:** `LaySanPhamDuDieuKienDanhGiaAsync`, `TaoDanhGiaAsync`, `LayDanhGiaCuaToiAsync`, `LayDanhGiaSanPhamAsync`, `LayTongHopDiemAsync`, `AnDanhGiaAsync`, `KhoiPhucDanhGiaAsync`.

**DTO:** mã chi tiết đơn, số sao, nội dung, danh sách ảnh khi tạo; lọc/phân trang; response đánh giá công khai; tổng hợp điểm/số lượt. Không nhận mã khách hoặc trạng thái hiển thị do client tự quyết.

#### Điều kiện đánh giá

- [ ] Từ `ma_chi_tiet_don` truy ra đơn và khách; người đăng nhập phải là chủ đơn, đơn đã `HoanTat`.
- [ ] Sản phẩm đánh giá là sản phẩm trên dòng đơn đã thuê, không suy ra từ sản phẩm hiện tại của một thiết bị đã giáng cấp sau này.
- [ ] Điểm nguyên từ 1 đến 5; nội dung/ảnh theo giới hạn ứng dụng, không nhận HTML/script thực thi. Dùng luồng tệp đã có, không mở thêm hệ thống upload riêng.
- [ ] Một khách chỉ có một đánh giá cho một sản phẩm trong một đơn hoàn tất. Unique `ma_chi_tiet_don` bảo vệ một dòng; nếu dữ liệu có hai dòng cùng sản phẩm trong cùng đơn thì service vẫn phải kiểm tra quy tắc theo đơn + sản phẩm trong transaction.
- [ ] Gửi lại cùng yêu cầu không tạo thêm đánh giá; nếu đã có thì trả bản đã tồn tại hoặc 409 với mã đánh giá phù hợp.
- [ ] Đơn bị hủy, đang thuê hoặc chờ đối soát chưa được đánh giá. Đơn hoàn tất có điều chỉnh tài chính về sau vẫn giữ chứng cứ đã thuê, không tự xóa đánh giá đã có.
- [ ] API lấy sản phẩm đủ điều kiện trả rõ đã đánh giá/chưa đánh giá. Không tự tạo đánh giá từ tin nhắn hoặc từ nội dung AI.

#### Hiển thị và kiểm duyệt

- [ ] Danh sách công khai chỉ lấy đánh giá đang hiển thị; phân trang và lọc sao nếu cần. Chỉ trả tên hiển thị phù hợp, không lộ email/SĐT hoặc chi tiết thanh toán.
- [ ] Điểm trung bình, số lượt và phân bố 1–5 sao tính từ cùng tập đánh giá đang hiển thị. Không có đánh giá thì điểm trung bình null/chưa có, không mặc định thành 5 sao.
- [ ] Bổ sung điểm/số lượt và lọc theo điểm vào API sản phẩm Tuần 2; nếu dùng cache thì làm mới sau tạo/ẩn/khôi phục.
- [ ] Quản trị viên ẩn nội dung vi phạm phải có lý do và `ma_nguoi_an`; không được sửa điểm hoặc viết lại nội dung khách.
- [ ] Khôi phục hiển thị có căn cứ và ghi nhật ký, giữ lịch sử lần ẩn. Không dùng xóa cứng để loại điểm thấp.
- [ ] Phạm vi bắt buộc là tạo/xem/ẩn/khôi phục. Nếu nhóm muốn cho khách chỉnh sửa đánh giá thì bổ sung chính sách riêng sau; không tự thêm thời hạn sửa hoặc quy trình duyệt lại vào tuần này.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/danh-gia/du-dieu-kien`, `/api/danh-gia/cua-toi` | Khách hàng, chỉ dữ liệu của mình |
| POST | `/api/danh-gia` | Khách đủ điều kiện |
| GET | `/api/danh-gia/san-pham/{sanPhamId}` | Công khai; chỉ đánh giá đang hiển thị |
| GET | `/api/danh-gia/san-pham/{sanPhamId}/tong-hop` | Công khai |
| GET | `/api/admin/danh-gia` | Quản trị viên |
| POST | `/api/admin/danh-gia/{id}/an`, `/api/admin/danh-gia/{id}/khoi-phuc` | Quản trị viên, ghi lý do |

**Nghiệm thu:** Khách chưa hoàn tất đơn không đánh giá được; khách khác không đánh giá thay bằng đổi ID; ẩn một đánh giá làm tổng điểm/số lượt thay đổi đồng nhất; giáng cấp thiết bị không chuyển đánh giá cũ sang sản phẩm mới.

### 9.A. Thành phần phải bàn giao — Kiện Minh

- [ ] `Services/Interfaces/IDanhGiaService.cs`
- [ ] `Services/DanhGiaService.cs`
- [ ] `Controllers/DanhGiaController.cs`
- [ ] `Controllers/Admin/DanhGiaController.cs`
- [ ] `Models/DTOs/DanhGia/`
- [ ] `Services/SanPhamService.cs (projection điểm nếu có)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 9.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TaoDanhGiaRequest | maChiTietDon, soSao, noiDung?, danhSachAnh? | Số sao nguyên 1–5; chi tiết thuộc đơn của khách, đơn HoanTat; giới hạn nội dung/ảnh theo cấu hình. |
| LocDanhGiaRequest | sanPhamId, soSao?, trang, soMoiTrang, thuTu | Công khai chỉ tập đang hiển thị; admin dùng route riêng để xem ẩn. |
| AnDanhGiaRequest / KhoiPhucDanhGiaRequest | lyDo | Admin; không nhận chỉnh nội dung/số sao của tác giả. |
| TongHopDanhGiaResponse | soDanhGia, diemTrungBinh?, thongKe1Den5Sao | Cùng tập visible với danh sách; chưa có đánh giá trả count 0, average null. |
| DanhGiaResponse | ID, sản phẩm lúc thuê, tác giả hiển thị đã giới hạn, sao/nội dung/ảnh/ngày | Không lộ SĐT/email/địa chỉ khách hoặc thông tin thanh toán. |


### 9.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| LaySanPhamDuDieuKienDanhGiaAsync(actor) | Các sản phẩm/chi tiết chưa đánh giá trong đơn HoanTat | Group sản phẩm theo đơn nếu một sản phẩm có nhiều dòng. |
| TaoDanhGiaAsync(dto, actor) | Đánh giá mới | Khóa đơn, check một sản phẩm/một đơn + unique chi tiết, INSERT DANH_GIA. |
| LayDanhGiaCuaToiAsync(filter, actor) | Trang đánh giá của khách | Suy chủ từ chi tiết → đơn, không nhận accountId tùy ý. |
| LayDanhGiaSanPhamAsync(id, filter) | Trang đánh giá visible | Theo CHI_TIET_DON_THUE.ma_san_pham, không current product thiết bị. |
| LayTongHopDiemAsync(id) | Count/AVG/histogram visible | Query cùng predicate với danh sách; cache invalidated khi ẩn/khôi phục/tạo. |
| AnDanhGiaAsync / KhoiPhucDanhGiaAsync(id, dto, actor) | Trạng thái hiển thị mới | Admin, lý do/ma_nguoi_an/audit; không sửa sao/nội dung. |


### 9.D. Trình tự triển khai và tích hợp

1. Kiện Minh xác định điều kiện bằng HoanTat thật sau đối soát, không bằng đã bàn giao/đã nhận đủ. Đối soát điều chỉnh sau đó không tước quyền đã có của đơn hoàn tất.
2. ERD unique ma_chi_tiet_don chỉ đủ chống trùng một dòng. Nếu một sản phẩm có nhiều dòng trong cùng đơn, dưới khóa đơn kiểm tra toàn bộ nhóm sản phẩm để giữ quy tắc một đánh giá/sản phẩm/đơn.
3. Chọn một chi tiết đại diện còn hợp lệ để gắn đánh giá; không tạo nhiều rating theo số thiết bị đã thuê hoặc gắn vào ma_thiet_bi.
4. Validate sao/số ảnh/nội dung, dùng cơ chế file hiện có và kiểm tra quyền tham chiếu ảnh; trả DTO đã xử lý hiển thị văn bản theo chuẩn frontend.
5. Danh sách công khai, count, average và từng cột sao dùng cùng điều kiện visible. Query average null khi rỗng; frontend tự hiển thị chưa có đánh giá.
6. Admin ẩn/khôi phục kèm lý do và lịch sử; không sửa nội dung khách cho đẹp. Đánh giá bị ẩn vẫn chiếm quyền đã đánh giá, không cho spam lại cùng sản phẩm/đơn.
7. Giáng cấp thiết bị A→B không di chuyển đánh giá của lần thuê A. Mời đánh giá chỉ gửi khi đơn hoàn tất và còn sản phẩm chưa đánh giá.

### 9.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DON_CHUA_HOAN_TAT | 409 | Chưa đủ điều kiện đánh giá. |
| SAN_PHAM_TRONG_DON_DA_DANH_GIA | 409 | Đã có đánh giá ở cùng dòng hoặc dòng khác của cùng sản phẩm/đơn. |
| SO_SAO_KHONG_HOP_LE | 400 | Ngoài 1–5 hoặc không nguyên. |
| DANH_GIA_KHONG_THUOC_KHACH | 404 | Không tồn tại/ngoài phạm vi sở hữu. |
| KHONG_CO_QUYEN_KIEM_DUYET | 403 | Staff/khách gọi action ẩn hoặc khôi phục. |


### 9.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T6-A01 | Khách vừa bàn giao hoặc vừa trả đủ nhưng chưa HoanTat | Chưa tạo được đánh giá. |
| W5-T6-A02 | Một đơn có hai dòng cùng sản phẩm, gửi đánh giá đồng thời vào hai dòng | Chỉ một đánh giá được tạo cho sản phẩm/đơn. |
| W5-T6-A03 | Đánh giá 5, 4, 3 sao đều visible | Count 3, average 4; ẩn dòng 3 sao thì count 2, average 4,5. |
| W5-T6-A04 | Ẩn mọi đánh giá của sản phẩm | Count 0, average null, histogram toàn 0. |
| W5-T6-A05 | Đánh giá A đã có, thiết bị giáng cấp sang B | Rating vẫn thuộc A; B không nhận rating cũ. |
| W5-T6-A06 | Admin khôi phục đánh giá | Nội dung/sao nguyên vẹn, tổng điểm cập nhật, audit có lý do. |
| W5-T6-A07 | Đơn HoanTat mở đối soát điều chỉnh sau đó | Đánh giá cũ và quyền hợp lệ không bị tự xóa. |


**Đóng W5-T6:** Kiện Minh bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 10. W5-T7 — Tư vấn bộ đồ bằng AI và gợi ý dự phòng (Kim Xuyến)

### 10.0. Phạm vi, quy tắc nghiệp vụ và API

**Use case:** UC09. **Service/Controller:** `ITuVanAIService` + `TuVanAIService`; `IGoiYBoDoService` + `GoiYBoDoService`; adapter `IAIProvider`; `TuVanController`.

**Method chính:** `TuVanAsync`, `GoiYTheoQuyTacAsync`, `KiemTraVaTinhLaiBoDoAsync`, `ThemBoDoVaoGioAsync`. Method thêm giỏ dùng logic giỏ/báo giá hiện có, không tự tạo đơn hoặc giữ chỗ.

#### Hợp đồng request/response

| Dữ liệu | Nội dung |
|---|---|
| Request | Điểm đến/mô tả chuyến đi, số người, giờ nhận/trả nếu đã biết, ngân sách, loại ngân sách, nhu cầu/phụ kiện ưu tiên |
| Loại ngân sách | Phân biệt ngân sách tiền thuê với tổng cần thanh toán ban đầu gồm cọc; nếu dùng mặc định tiền thuê thì nêu rõ trong response |
| Dòng gợi ý | Mã sản phẩm hợp lệ, tên, số lượng, lý do lựa chọn, giá thuê, cọc và khả dụng do server xác minh |
| Tổng hợp | Tiền thuê, cọc, tổng ban đầu, thời điểm kiểm tra dữ liệu, thời gian thuê dùng để tính hoặc trạng thái còn thiếu ngày |
| Trạng thái tư vấn | Có gợi ý, cần bổ sung đầu vào, không có phương án phù hợp; ghi rõ dùng AI hay gợi ý theo quy tắc |

#### Luồng xử lý

1. Kiểm tra số người/số lượng/ngân sách hợp lệ, giới hạn độ dài mô tả; nếu có thời gian thì phải đủ cặp nhận–trả và trả sau nhận, không bắt đầu trong quá khứ.
2. Tìm tập sản phẩm đang kinh doanh từ database theo nhu cầu/sức chứa/danh mục và dữ liệu có thật. Chỉ gửi tập ứng viên vừa đủ, không đẩy toàn bộ database vào mô hình.
3. Nếu đã có khoảng thuê, lấy khả dụng theo lô qua service Minh Tú và giá qua service báo giá hiện có. Dữ liệu cung cấp cho AI chỉ là ngữ cảnh, vẫn phải kiểm tra lại đầu ra.
4. Adapter AI nhận yêu cầu và danh mục ứng viên, trả cấu trúc mã sản phẩm/số lượng/lý do. Ràng buộc đầu ra có schema; không parse một đoạn văn tự do rồi xem đó là quyết định nghiệp vụ.
5. Server xác minh lại từng mã, trạng thái kinh doanh, số lượng nguyên dương, giới hạn và khả dụng. Bỏ/từ chối phần không hợp lệ rồi tính lại phương án; không hiển thị nguyên giá/số tồn do AI tự viết.
6. Tính tiền thuê và cọc riêng bằng service dùng chung, kiểm tra phù hợp ngân sách đã chọn. Nếu không có bộ đủ điều kiện thì nêu phần thiếu và gợi ý thay đổi ngày/ngân sách/sản phẩm, không bịa một bộ “đủ”.
7. Nếu timeout, lỗi nhà cung cấp, thiếu cấu hình hoặc JSON không hợp lệ thì chuyển sang bộ gợi ý theo quy tắc, trả rõ nguồn gợi ý. Không trả lỗi khiến khách không dùng được tìm kiếm/giỏ thông thường.
8. Trả gợi ý để khách chỉnh số lượng/chọn bỏ. Chỉ khi khách chủ động xác nhận và đã đăng nhập mới thêm vào giỏ; báo giá/khả dụng được kiểm tra lại tại hành động này và lúc đặt đơn.

#### Các quy tắc bắt buộc

- [ ] Chưa có ngày thì chỉ trả giá tham khảo mỗi ngày và cọc theo số lượng; không tự giả định số ngày để báo một tổng chắc chắn và không khẳng định còn đồ.
- [ ] Chỉ gợi ý sản phẩm đang kinh doanh của cửa hàng. Model trả mã lạ, sản phẩm ngừng bán, số lượng âm hoặc vượt khả dụng phải bị chặn/sửa bằng dữ liệu xác thực.
- [ ] Ví dụ nhu cầu 4 người: dùng sức chứa thực tế của lều để kiểm tra đủ chỗ, không chỉ tin câu “phù hợp 4 người” do mô hình sinh.
- [ ] Tách quy tắc gợi ý dự phòng khỏi prompt: cấu hình nhóm đồ/nhu cầu và chọn sản phẩm thật bằng service. Không tạo Entity bộ đồ mới chỉ để chứa một cấu hình đơn giản.
- [ ] Không tự áp giảm giá giả định, không gộp cọc thành tiền thuê, không trừ cọc khỏi ngân sách tiền thuê nếu loại ngân sách khác.
- [ ] Thêm bộ vào giỏ theo toàn bộ lựa chọn đã xác nhận trong một transaction; một dòng không hợp lệ thì trả lỗi rõ và không thêm dở dang. Giỏ vẫn không giữ hàng.
- [ ] Nếu thời gian gợi ý khác thời gian chung của giỏ, trả yêu cầu chọn/đổi thời gian rõ ràng; không âm thầm đổi ngày của các món khách đã có trong giỏ.
- [ ] Khách vãng lai có thể tư vấn, nhưng không có quyền tạo giỏ/đơn của một tài khoản bất kỳ. Sau đăng nhập vẫn phải xác định khách từ phiên hiện tại.
- [ ] Áp dụng giới hạn tần suất, thời gian chờ, số ứng viên và độ dài phản hồi để kiểm soát tài nguyên; khóa nhà cung cấp ở server, không gửi secret cho frontend.
- [ ] Chỉ gửi dữ liệu công khai cần cho tư vấn; không gửi email/SĐT, lịch sử thanh toán, thông tin nhà cung cấp hay giá nhập của khách/cửa hàng vào prompt.
- [ ] Nội dung người dùng và mô tả sản phẩm là dữ liệu, không được làm mô hình có quyền gọi thao tác SQL, đổi giá, tạo đơn, hoàn tiền hoặc bỏ qua kiểm tra server.
- [ ] Log kỹ thuật theo mã yêu cầu và lỗi cần thiết; không mặc định lưu toàn bộ nội dung chat cá nhân khi ERD không có phần lịch sử tư vấn.

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| POST | `/api/tu-van/bo-do` | Công khai/khách; có giới hạn tần suất |
| POST | `/api/tu-van/bo-do/kiem-tra` | Tính lại phương án khách đã chỉnh, không ghi đơn |
| POST | `/api/tu-van/bo-do/them-vao-gio` | Khách đăng nhập; gọi service giỏ hiện có |

**Nghiệm thu backend bắt buộc:** Danh mục/giá/cọc/khả dụng đúng, model trả sai không lọt, AI lỗi vẫn có phương án dự phòng hoặc thông báo không tìm được bộ phù hợp, thêm giỏ không tạo giữ chỗ.

**Nghiệm thu tích hợp AI thật:** Cần cấu hình provider/model và ít nhất một luồng gọi thành công cùng một luồng lỗi có fallback. Nếu chỉ chạy mock/quy tắc thì ghi đúng trạng thái đó, chưa đánh dấu đã kiểm chứng gọi AI thật. Không cần đổi Entities để nối adapter khi có cấu hình.

### 10.A. Thành phần phải bàn giao — Kim Xuyến

- [ ] `Services/Interfaces/ITuVanAIService.cs`
- [ ] `Services/TuVanAIService.cs`
- [ ] `Services/Interfaces/IGoiYBoDoService.cs`
- [ ] `Services/GoiYBoDoService.cs`
- [ ] `Integrations/AI/IAIProvider.cs`
- [ ] `Integrations/AI/AIProviderAdapter.cs`
- [ ] `Controllers/TuVanController.cs`
- [ ] `Models/DTOs/TuVan/`
- [ ] `Configuration/TuVanOptions.cs`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 10.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| TuVanBoDoRequest | diemDen/moTa, soNguoi, gioNhan?, gioTra?, nganSach?, loaiNganSach, nhuCau[] | Số người dương có giới hạn; cặp giờ đầy đủ; ngân sách >=0; loại TienThue hoặc TongBanDau được xác định rõ. |
| AiCandidate (nội bộ) | ID/tên/danh mục/sức chứa/thông số công khai, số lượng khả dụng nếu có ngày, giá tham khảo xác minh | Không email/SĐT, giá nhập, thông tin NCC hoặc lịch sử tiền. |
| AiSelection (nội bộ) | danh sách {maSanPham, soLuong, lyDo} | Schema chặt, chỉ IDs trong candidate set; không nhận giá/tồn/ưu đãi do model quyết định. |
| TuVanBoDoResponse | nguồn AI/QuyTac, trạng thái, khoảng thuê, dòng đã xác minh, tiền thuê/cọc/tổng hoặc tham khảo/ngày, thời điểm kiểm tra, phần thiếu | Không có ngày thì tổng thuê toàn kỳ null và khả dụng ChuaKiemTra; gợi ý không giữ hàng. |
| ThemBoDoRequest | danh sách sản phẩm/số lượng khách chấp nhận, giờ thuê?, lựa chọn xử lý xung đột ngày giỏ | Khách từ JWT; toàn bộ dòng validate và thêm nguyên tử; không tin ID phiên gợi ý như quyền giữ kho. |


### 10.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TuVanAsync(dto, actorOptional) | Phương án đã xác minh hoặc cần thêm thông tin | Candidate query → adapter → kiểm tra/tính lại; fallback khi provider lỗi. |
| GoiYTheoQuyTacAsync(dto, candidates) | Cùng cấu trúc phương án | Dựa sức chứa/danh mục/ngân sách có thật; có thể trả không tìm được bộ đủ. |
| KiemTraVaTinhLaiBoDoAsync(dto, actorOptional) | Giá/cọc/khả dụng mới và lỗi từng dòng | Gọi báo giá/KhaDung chung; read-only, không tạo đơn/hold. |
| ThemBoDoVaoGioAsync(dto, actor) | Giỏ mới hoặc lỗi nguyên bộ | Gọi GioThueService hiện có, khóa giỏ, kiểm ngày và toàn bộ lựa chọn; không tạo GIU_CHO. |
| IAIProvider.GoiAsync(input, cancellationToken) | AiSelection hoặc lỗi kỹ thuật chuẩn hóa | Timeout/cancellation/giới hạn output; credential server, không thao tác SQL/đơn/tiền. |


### 10.D. Trình tự triển khai và tích hợp

1. Kim Xuyến chốt Day 1 cách cấu hình provider/model qua biến môi trường, timeout, số ứng viên và rate limit. Khi chưa có credential, mock/fallback chạy độc lập và ghi rõ chưa kiểm chứng AI thật.
2. Validate mô tả/ngân sách/số người; thiếu ngày thì vẫn tư vấn sơ bộ nhưng không tự gán 1 ngày để báo một tổng chắc chắn.
3. Truy candidate sản phẩm đang kinh doanh phù hợp nhu cầu; nếu có ngày thì gọi khả dụng theo lô và báo giá, hạn chế query N+1 và payload gửi model.
4. Gửi dữ liệu ứng viên như dữ liệu tham khảo; prompt không cấp công cụ sửa SQL/giá/đơn. Nội dung mô tả khách/sản phẩm là untrusted data, không thành chỉ thị bỏ kiểm tra server.
5. Parse output theo schema và giới hạn kích thước. Kiểm ID/số lượng/sức chứa/kinh doanh/ngân sách lại trên server; không dùng câu lý do model làm chứng minh đủ chỗ/đủ tiền.
6. Nếu output lỗi, ID lạ, timeout hay thiếu cấu hình, thử fallback quy tắc. Chỉ trả bộ đáp ứng thật; nếu không có thì nêu thiếu ngân sách/hàng/ngày, không bịa mã hoặc giảm cọc.
7. Tính tiền tách thuê/cọc, áp loại ngân sách rõ. Không có ngày: trả giá/ngày, cọc và các thông tin chưa thể chốt. Có ngày: snapshot giá là tham khảo tại giờ kiểm tra, recheck khi thêm/đặt.
8. Khi khách xác nhận thêm, kiểm toàn bộ lựa chọn và chủ giỏ dưới khóa. Ngày khác giỏ cũ trả xung đột để khách chọn rõ; không âm thầm thay lịch của món đã có.
9. Nếu giỏ hỗ trợ chưa có ngày, cho thêm theo contract cũ và báo chưa định giá/khả dụng; nếu repo bắt buộc ngày, trả thiếu ngày. Chốt một cách Day 1, hai API không được hiểu khác nhau.
10. Thêm vào giỏ thành công vẫn chưa giữ hàng; giao dịch tạo đơn Week 2 tiếp tục là nơi giữ kho/lượt mã. Log request ID, latency, lỗi và nguồn fallback, không mặc định lưu toàn bộ chat cá nhân.

### 10.E. Ví dụ contract

Ví dụ đầu vào đã có ngày:
```json
{"diemDen":"Cắm trại qua đêm","soNguoi":4,"gioNhan":"2026-10-10T01:00:00Z","gioTra":"2026-10-11T01:00:00Z","nganSach":800000,"loaiNganSach":"TienThue","nhuCau":["Lều đủ 4 người","Ưu tiên gọn nhẹ"]}
```
Dữ liệu ngày là fixture, chạy trước giờ nhận với đồng hồ phù hợp. Phương án phải trả giá thuê và cọc riêng; giá/khả dụng do service hiện có xác minh.

### 10.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| DAU_VAO_TU_VAN_KHONG_HOP_LE | 400 | Số người/ngân sách/khoảng giờ không hợp lệ. |
| BO_DO_KHONG_CON_PHU_HOP | 409 | Khi kiểm tra/thêm, sản phẩm đã hết/ngừng hoặc ngân sách không còn đủ. |
| NGAY_GIO_KHAC_GIO_HIEN_TAI | 409 | Cần khách quyết định lịch chung trước khi thêm. |
| CAN_DANG_NHAP_DE_THEM_GIO | 401 | Guest chỉ tư vấn/kiểm tra, không tạo giỏ cho tài khoản tùy ý. |
| VUOT_GIOI_HAN_TU_VAN | 429 | Theo giới hạn đã cấu hình; có hướng dẫn thời điểm thử lại nếu hỗ trợ. |


### 10.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T7-A01 | Nhu cầu 4 người, model gợi ý 1 lều sức chứa 2 | Server không khẳng định đủ chỗ; bổ sung bộ hợp lệ hoặc nêu thiếu. |
| W5-T7-A02 | Model trả sản phẩm ID ngoài candidate, lượng -1 và giá tự bịa | Không hiện dòng/giá sai; fallback hoặc response lỗi nghiệp vụ rõ. |
| W5-T7-A03 | Ngân sách thuê 600.000, cọc 1.000.000 | So thuê với 600.000; response vẫn hiện tổng ban đầu gồm cọc. |
| W5-T7-A04 | Cùng ngân sách 600.000 nhưng loại TongBanDau | Chỉ chấp nhận nếu thuê+cọc <=600.000; không tự bỏ cọc. |
| W5-T7-A05 | Chưa nhập ngày thuê | Không khẳng định còn hàng hay tổng thuê toàn chuyến; trả tham khảo/ngày và thiếu ngày. |
| W5-T7-A06 | Provider timeout/JSON sai/không có khóa | API có fallback hoặc trạng thái không tìm được bộ, không gắn nhãn AI thật sai. |
| W5-T7-A07 | Một trong 3 dòng đã hết hàng lúc thêm giỏ | Không thêm dở dang 2 dòng; trả lỗi để khách chọn lại. |
| W5-T7-A08 | Giỏ đang lịch A, gợi ý lịch B | 409 yêu cầu lựa chọn lịch, giỏ cũ chưa đổi. |
| W5-T7-A09 | Thêm bộ vào giỏ thành công | Không tăng GIU_CHO, không tạo DON_THUE, không giữ lượt khuyến mãi. |


**Đóng W5-T7:** Kim Xuyến bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 11. W5-T8 — Hoàn thiện thông báo và xử lý gửi (Kiện Minh)

### 11.0. Phạm vi, quy tắc nghiệp vụ và API

**Phạm vi:** Phần thông báo UC26 đã bắt đầu ở Tuần 3–4; không triển khai toàn bộ màn quản trị chính sách/nhật ký UC26.

**Service/Controller:** Mở rộng `IThongBaoService` + `ThongBaoService`; mới `IGuiThongBaoService` + `GuiThongBaoService`, adapter kênh gửi; mở rộng `ThongBaoController`, tạo `Admin/ThongBaoController`.

**Method chính:** `TaoTheoSuKienAsync`, `LayCuaToiAsync`, `DemChuaDocAsync`, `DanhDauDaDocAsync`, `DanhDauTatCaDaDocAsync`, `XuLyHangChoAsync`, `ThuLaiAsync`, `LayThongBaoGuiLoiAsync`.

#### Nguồn sự kiện và dữ liệu người nhận

- [ ] Bổ sung sự kiện còn thiếu: xác nhận đơn, sẵn sàng nhận, sắp trả, quá hạn, nhận trả theo đợt, phí/thu bổ sung, kết quả hoàn, hoàn tất và mời đánh giá.
- [ ] Sự kiện nào Tuần 3–4 đã ghi thì tái sử dụng, không gắn thêm một producer thứ hai tạo bản sao cùng sự kiện.
- [ ] Nhắc sắp trả/quá hạn theo mốc chính sách gắn với đơn; sau khi đã trả hết thì không gửi nhắc trả còn đồ. Mời đánh giá chỉ khi đơn hoàn tất và còn sản phẩm được đánh giá.
- [ ] Người nhận trong ứng dụng là `ma_tai_khoan` đúng của khách. Kênh email theo đơn dùng `email_lien_he` đã lưu lúc đặt theo quy tắc của dự án; không gửi theo một email tùy ý truyền vào endpoint đọc thông báo.
- [ ] Một sự kiện cần nhiều kênh thì lưu từng bản ghi theo người nhận + kênh; `ma_su_kien` ổn định theo loại, đối tượng, lần/đợt hoặc mốc nhắc, có độ dài phù hợp cột.
- [ ] Chống lặp bằng transaction/khóa trên nguồn sự kiện hoặc cơ chế khóa database chung cho khóa sự kiện; kiểm tra tồn tại đơn thuần ngoài transaction là chưa đủ vì ERD chưa có unique tổ hợp này.
- [ ] Lưu thông báo/hàng chờ cùng transaction nghiệp vụ; gửi ra ngoài sau commit. Gửi lỗi không được rollback việc nhận tiền, trả hàng hoặc đổi trạng thái đơn đã thành công.

#### Gửi, thử lại và phục hồi

- [ ] Chọn bản ghi chờ, chuyển trạng thái xử lý bằng cập nhật có điều kiện trước khi gửi; hai worker không tự nhận cùng bản ghi cùng lúc. Tuần này ưu tiên một worker gửi được cấu hình rõ ràng, nhưng vẫn bảo vệ trạng thái ở database.
- [ ] Tăng số lần thử, ghi lần bắt đầu/kết quả trong nhật ký; gửi thành công mới ghi `thoi_diem_gui`. Lỗi ghi `loi_gui_gan_nhat`, trạng thái phù hợp và lịch thử lại có giới hạn.
- [ ] Quy tắc số lần tối đa và thời gian chờ tăng dần lấy từ cấu hình ứng dụng; căn cứ lần thử gần nhất từ nhật ký hiện có. Không dùng giờ gửi thành công giả để lưu giờ thử hoặc tự thêm cột retry.
- [ ] Dừng/khởi động lại ứng dụng không làm mất bản ghi chờ gửi. Bản đang gửi dở được đối chiếu từ nhật ký/provider, không tự gắn thành đã gửi hoặc lập một bản thông báo mới.
- [ ] Nếu provider hỗ trợ mã chống gửi lặp, dùng khóa sự kiện ổn định; nếu mất phản hồi và chưa biết đã gửi hay chưa, cần đối chiếu/xử lý trạng thái chưa rõ trước khi thử lại. Không tuyên bố email được gửi đúng một lần tuyệt đối khi provider không hỗ trợ bảo đảm đó.
- [ ] Khi quá giới hạn thử, giữ trạng thái lỗi để quản trị viên thấy và thao tác thử lại có kiểm soát; không có vòng lặp gửi vô hạn.
- [ ] Nội dung thông báo lấy từ mẫu/cấu hình và dữ liệu thật; không để khách tự chọn người nhận/nội dung cho worker gửi qua endpoint công khai.
- [ ] Kênh trong ứng dụng coi là sẵn có khi bản ghi được commit; đã đọc là trạng thái riêng, không biến “chưa đọc” thành “gửi thất bại”.

#### API và tích hợp

| Method | Endpoint đề xuất | Quyền |
|---|---|---|
| GET | `/api/thong-bao` | Tài khoản đăng nhập, chỉ của mình; mở rộng API cũ |
| GET | `/api/thong-bao/chua-doc/dem` | Tài khoản đăng nhập |
| POST | `/api/thong-bao/{id}/da-doc` | Chủ thông báo, thao tác lặp không tạo sự kiện mới |
| POST | `/api/thong-bao/da-doc-tat-ca` | Chỉ thông báo thuộc tài khoản hiện tại |
| GET | `/api/admin/thong-bao/gui-loi` | Quản trị viên |
| POST | `/api/admin/thong-bao/{id}/thu-lai` | Quản trị viên, kiểm tra điều kiện gửi lại |

Job nhắc lịch/worker gửi chỉ gọi service; không viết lại nghiệp vụ trong job. Chọn kênh email theo cấu hình của nhóm, không tự thêm SMS/push khi chưa có nhu cầu hoặc nguồn tích hợp.

**Nghiệm thu:** Chạy lại job không tạo cùng thông báo mốc nhắc; đợt trả thứ hai vẫn có sự kiện riêng; gửi lỗi không ảnh hưởng kết quả nghiệp vụ; quyền đánh dấu đã đọc được kiểm tra; thử lại có giới hạn và đọc được lỗi cần xử lý.

### 11.A. Thành phần phải bàn giao — Kiện Minh

- [ ] `Services/ThongBaoService.cs (mở rộng từ Week 3)`
- [ ] `Services/Interfaces/IGuiThongBaoService.cs`
- [ ] `Services/GuiThongBaoService.cs`
- [ ] `Integrations/Notifications/ (adapter)`
- [ ] `Controllers/ThongBaoController.cs (mở rộng)`
- [ ] `Controllers/Admin/ThongBaoController.cs`
- [ ] `Jobs/ThongBaoJob.cs`
- [ ] `Models/DTOs/ThongBao/`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 11.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| SuKienThongBaoCommand (nội bộ) | event key, loại, đơn/chứng từ, tài khoản nhận, kênh, dữ liệu mẫu | Key <=100 ký tự theo ERD; một sự kiện/kênh/tài khoản một bản logic, tạo dưới khóa nguồn. |
| LocThongBaoRequest | trạng thái đọc?, loại?, trang, soMoiTrang | Khách không được truyền người nhận khác; lỗi gửi nội bộ dùng route admin. |
| ThongBaoResponse | ID, tiêu đề/nội dung an toàn, đơn liên quan, giờ tạo/đọc | Thao tác đã đọc độc lập với trạng thái gửi email. |
| GuiThongBaoResult (nội bộ) | thành công/thất bại chắc chắn/chưa rõ, mã provider nếu có, lỗi đã lọc | Không ghi thoi_diem_gui khi mới bắt đầu thử; attempt dùng NHAT_KY_THAO_TAC và dữ liệu sẵn có. |
| ThuLaiRequest | lý do | Chỉ admin, kiểm tra trạng thái và số lần; không cho thay email/nội dung tùy ý tại action retry. |


### 11.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| TaoTheoSuKienAsync(command) | Bản mới hoặc có sẵn | Cùng transaction nghiệp vụ; source lock bảo vệ (tài khoản,key,kênh) vì không có unique tổ hợp. |
| LayCuaToiAsync / DemChuaDocAsync(actor, filter?) | Trang/count cùng scope | Dùng lại API Week 3, không tạo controller trùng route. |
| DanhDauDaDocAsync / DanhDauTatCaDaDocAsync(actor, id?) | Số dòng cập nhật/thời điểm đọc | UPDATE chủ sở hữu, chỉ chưa đọc; giữ mốc đọc đầu. |
| XuLyHangChoAsync(batchSize, cancellationToken) | Kết quả batch | Claim có điều kiện + audit attempt, commit rồi gọi provider, ghi kết quả sau. |
| ThuLaiAsync(id, dto, actor) | Kết quả enqueue/đối chiếu | Admin, khóa dòng, chưa rõ thì query provider/can thiệp trước khi retry. |
| LayThongBaoGuiLoiAsync(filter, actor) | Trang lỗi + attempts đã lọc | Không trả credential hoặc payload email nhạy cảm ngoài cần thiết. |


### 11.D. Trình tự triển khai và tích hợp

1. Kiện Minh tiếp nhận hợp đồng IThongBaoService từ Thanh Tùng; LayCuaToiAsync là tên rút gọn đề xuất cho LayThongBaoCuaToiAsync, giữ một implementation và không làm hỏng bên gọi cũ. Chỉ một producer mỗi sự kiện. Ghi bảng mapping sự kiện→chủ tạo→mẫu→người nhận→key/kênh trong docs tích hợp.
2. Key theo nguồn ổn định: giao dịch thành công dùng ID giao dịch; nhận trả dùng ID phiếu; quá hạn dùng đơn+mốc; sẵn sàng lại dùng chuyển trạng thái thật; không lấy giờ mỗi lần retry làm key mới.
3. Tạo record THONG_BAO cùng transaction nghiệp vụ; in-app và email là hai kênh riêng. Email theo đơn dùng địa chỉ liên hệ snapshot của đơn, tránh gửi sang input tùy ý từ public API.
4. Tuần này ưu tiên một worker cấu hình rõ; vẫn claim bằng cập nhật trạng thái có điều kiện để hai worker không cùng gửi. Trước mạng, tăng số lần và audit thời điểm bắt đầu attempt, commit.
5. ERD không có next_retry_at/claimed_at. Tính lần thử kế từ cấu hình và thời điểm attempt trong nhật ký hiện có; trạng thái/ghi chú lỗi dùng đúng quy ước, không nhét giờ thử vào thoi_diem_gui thành công.
6. Thành công mới ghi thoi_diem_gui. Thất bại chắc chắn lưu lỗi đã lọc, số lần và lịch retry tăng dần có trần; retry không tạo record thông báo mới.
7. Provider đã nhận nhưng mất phản hồi: nếu hỗ trợ idempotency dùng key ổn định và query; nếu không, giữ chưa rõ/chờ admin cân nhắc thay vì tự gửi lại và hứa đúng một lần tuyệt đối.
8. Restart xử lý record chờ và các record đang xử lý dở từ audit/provider; không reset mọi trạng thái về chờ làm gửi lại hàng loạt.
9. Trước tạo nhắc sắp trả/quá hạn, đọc lại nghĩa vụ còn nợ và chính sách của đơn; đã trả hết không nhắc còn đồ. Mời đánh giá chỉ sau HoanTat, còn sản phẩm đủ quyền đánh giá.
10. Đọc/đã đọc dùng scope chủ sở hữu; route admin lỗi chỉ admin. Mọi lỗi gửi không đảo tiền hoặc thao tác nghiệp vụ đã commit.

### 11.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| THONG_BAO_NGOAI_PHAM_VI | 404 | ID không thuộc tài khoản hiện tại. |
| SU_KIEN_VUOT_DO_DAI | 400 | Key/nội dung vượt cấu hình/độ dài cột, cần chuẩn hóa key ổn định. |
| THONG_BAO_DANG_XU_LY | 409 | Worker đang giữ hoặc kết quả chưa rõ; không gửi cạnh tranh. |
| GUI_CHUA_RO_KET_QUA | 409 | Cần đối chiếu/provider hoặc quyết định admin trước retry. |
| VUOT_SO_LAN_THU | 409 | Hết ngưỡng tự động; giữ record lỗi để xử lý có kiểm soát. |


### 11.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T8-A01 | Hai producer cùng event key/kênh/tài khoản | Chỉ một record logic nhờ khóa nguồn, không dựa vào unique không tồn tại. |
| W5-T8-A02 | Hai worker claim cùng record | Chỉ một người thắng quyền gửi trong lần đó. |
| W5-T8-A03 | Email lỗi khi phiếu nhận trả đã chốt | Phiếu/thiết bị giữ kết quả đúng; record lỗi chờ retry, không rollback nghiệp vụ. |
| W5-T8-A04 | Provider nhận email rồi ứng dụng chết trước ghi success | Không tự giả success hoặc sinh record mới; đối chiếu theo khả năng provider, ghi rõ chưa chắc có gửi trùng. |
| W5-T8-A05 | Restart còn 5 record pending và 1 processing dở | Không mất record; processing được xử lý theo attempt/audit, không blind retry toàn bộ. |
| W5-T8-A06 | Khách A đánh dấu đọc ID B hoặc gọi đọc tất cả | B không bị cập nhật; count chưa đọc của A đúng. |
| W5-T8-A07 | Khách đã trả đủ, job chạy lại mốc quá hạn | Không tạo nhắc trả còn đồ mới. |
| W5-T8-A08 | Admin retry record lỗi | Giữ event key/ID; có lý do và attempt mới, không đổi người nhận tùy ý. |


**Đóng W5-T8:** Kiện Minh bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 12. Ví dụ nghiệp vụ để nhóm thống nhất cách làm

### 12.1 Bảo trì và khả dụng

Kho có 5 lều đạt kiểm tra, trong đó L003 bị hỏng sau một lượt thuê. Nhận trả đã tạo phiếu bảo trì cho L003.

- Mở module bảo trì phải thấy phiếu đó; không tạo thêm một phiếu đang mở thứ hai.
- L003 chưa tính khả dụng dù đã tới ngày dự kiến sửa xong.
- Nhân viên cập nhật sửa xong, người có quyền kiểm tra và xác nhận đạt; L003 trở lại sẵn sàng.
- Số có thể nhận đặt còn phải trừ các cam kết khác trong khoảng khách chọn, không mặc định đủ 5 chỉ vì cả 5 có trạng thái sẵn sàng.

### 12.2 Giáng cấp không đổi lịch sử

L003 nhập từ dòng phiếu PN01 thuộc sản phẩm A, đã từng cho thuê 150.000đ/ngày. Sau sử dụng, cửa hàng muốn chuyển sang sản phẩm B giá 100.000đ/ngày.

- Đề nghị có sản phẩm A/B, tình trạng, bằng chứng và tác động tới lịch đã cam kết.
- Sau khi đủ điều kiện và được duyệt, `ma_san_pham_hien_tai` thành B; nguồn nhập vẫn là dòng PN01 ban đầu.
- Lượt thuê mới dùng giá/cọc của B. Đơn thuê cũ vẫn 150.000đ/ngày theo snapshot; đánh giá của đơn cũ vẫn gắn A.
- Nếu A đang có cam kết cần L003 mà chưa thay thế được, chưa áp dụng giáng cấp.

### 12.3 Điều chỉnh giá nhập đã chốt

PN01 ghi nhập 3 lều, đơn giá 1.200.000đ, tổng gốc 3.600.000đ. Có căn cứ giá đúng là 1.100.000đ/chiếc.

- Phiếu điều chỉnh ghi giá trước/giá sau, phạm vi đủ 3 chiếc và chênh lệch `3 × (1.100.000 - 1.200.000) = -300.000đ`.
- Sau duyệt, hiển thị gốc 3.600.000đ, điều chỉnh -300.000đ, hiệu lực 3.300.000đ.
- PN01 và giá nhập gốc lưu trên các thiết bị không bị ghi đè; số thiết bị vẫn là 3.
- Nếu sửa tiếp, lấy giá hiệu lực mới làm căn cứ trước; không cộng lại cùng phần -300.000đ lần nữa.

### 12.4 Đánh giá và thông báo

Khách A có một đơn hoàn tất với sản phẩm X. Khách chấm 4 sao, đánh giá được hiển thị.

- Không tạo thêm đánh giá X trong chính đơn đó bằng một request khác hoặc dòng trùng sản phẩm.
- Nếu quản trị viên ẩn có lý do, phần tổng hợp công khai không tính đánh giá đó; không sửa số sao 4 thành một số khác.
- Thông báo mời đánh giá của cùng sự kiện hoàn tất không gửi lặp vô hạn; khách đánh giá rồi thì các lần nhắc sau phải kiểm tra lại điều kiện.

### 12.5 AI kiểm tra ngân sách và dữ liệu

Khách chọn 4 người, thuê 2 ngày. Một phương án được xác minh gồm 1 lều giá 150.000đ/ngày, cọc 500.000đ và 4 ghế giá 20.000đ/ghế/ngày, cọc 100.000đ/ghế.

- Tiền thuê: `1 × 150.000 × 2 + 4 × 20.000 × 2 = 460.000đ`.
- Tiền cọc: `500.000 + 4 × 100.000 = 900.000đ`.
- Tổng ban đầu: 1.360.000đ. Nếu ngân sách tiền thuê là 500.000đ thì đạt phần tiền thuê; nếu ngân sách tổng ban đầu là 500.000đ thì không đạt.
- Nếu chỉ còn 2 ghế trong khoảng thuê, không trả nguyên phương án 4 ghế là đủ hàng; phải tính phương án khác hoặc báo thiếu.
- Mô hình có nói giá khác thì response vẫn dùng giá server tính. Sau khi khách chọn thêm vào giỏ, kiểm tra lại theo dữ liệu lúc thao tác.

## 13. Hợp đồng giữa các người và thứ tự tích hợp

| Bên cung cấp | Bên sử dụng | Hợp đồng cần bàn giao | Mốc |
|---|---|---|---|
| Thanh Tùng | Cả nhóm | Kiểm tra trạng thái/quyền hiện tại, danh sách nhân viên còn làm việc, helper lịch sử hiện có | Interface/quy tắc Day 1; dùng được Day 2 |
| Tuấn Kiệt | Minh Tú và luồng nhập/nhận trả | Service tạo/tiếp tục bảo trì; điều kiện kết thúc; trạng thái thực tế sau kiểm tra | Interface Day 1; luồng chính Day 2–3 |
| Minh Tú | Tuấn Kiệt | Lập đề nghị vòng đời, kiểm tra ảnh hưởng và duyệt/áp dụng; không lặp logic cập nhật thiết bị | Interface Day 1; dùng được Day 3 |
| Minh Tú | Kim Xuyến | Query sản phẩm/khả dụng theo lô, thời điểm kiểm tra và cảnh báo không đủ số lượng | Chốt Day 1; dùng bản service sẵn có từ đầu tuần |
| Kiện Minh | Kim Xuyến | Điểm/số lượt đánh giá thật để bổ sung thông tin gợi ý nếu dùng | Cuối Day 2 |
| Kiện Minh | Cả nhóm | Interface tạo thông báo theo sự kiện/transaction, quy tắc người nhận/kênh và thử lại | Chốt Day 1; DB/in-app Day 2, worker Day 3–4 |
| Kim Xuyến | Chủ giỏ/báo giá hiện có | DTO bộ đồ, thời gian chung, tính lại giá và thêm nhiều dòng nguyên tử | Chốt Day 1; tích hợp Day 3 |
| Minh Tú | Phần báo cáo Tuần 6 | Quy ước giá trị gốc/điều chỉnh/hiệu lực và loại hồ sơ bị loại khỏi khai thác | Tài liệu + response mẫu cuối tuần |

**Cách tránh phụ thuộc vòng:**

- `VongDoiThietBiService` lập đề nghị qua `DieuChinhKhoService`. Service điều chỉnh đọc dữ liệu bảo trì/lịch để kiểm tra, không gọi ngược service vòng đời.
- `BaoTriService` ghi tình trạng/phiếu của hành động bảo trì; dùng khả dụng để phân tích ảnh hưởng. `KhaDungService` đọc dữ liệu, không gọi ngược service ghi bảo trì/điều chỉnh.
- AI chỉ gọi service đọc, báo giá và thêm giỏ sau hành động rõ ràng của khách; các service thuê đồ không phải gọi AI mới chạy được.
- Thông báo nhận dữ liệu sự kiện đã xác minh; worker chỉ gửi bản ghi đã lưu, không tự thực hiện nghiệp vụ tạo đơn/hoàn tiền/bảo trì.

## 14. Lịch thực hiện trong 5 ngày

Day 1–5 là ngày làm việc, chưa gắn ngày lịch cụ thể. Day 5 dành cho nghiệm thu và sửa lỗi tích hợp.

| Người | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|---|---|---|---|---|---|
| **Thanh Tùng** | Chốt quyền hiện tại và DTO nhân sự; API tra cứu | Tạo/sửa nhân viên, khóa/mở khóa | Đổi vai trò, nghỉ việc, bảo vệ quản trị cuối cùng | Kiểm tra JWT cũ trên API của các module, tích hợp DI | Chạy kiểm tra quyền toàn luồng, tổng hợp nghiệm thu |
| **Kiện Minh** | Chốt DTO đánh giá; nhận bàn giao thông báo | Tạo/xem đánh giá, tổng điểm; hoàn thiện API in-app | Kiểm duyệt, lọc sản phẩm theo điểm; worker gửi cơ bản | Nhắc lịch, retry/phục hồi và lỗi gửi; tích hợp mời đánh giá | Kiểm tra gửi lặp, quyền, điểm tổng hợp và sửa lỗi |
| **Minh Tú** | Chốt loại điều chỉnh/JSON trước-sau; API kho | Đối chiếu kiểm kê, lập/sửa/gửi duyệt | Duyệt/áp dụng nguyên tử và liên kết vòng đời | Sửa sai nhập, giá trị hiệu lực, kiểm tra lịch/khả dụng/cạnh tranh | Kiểm tra chứng từ gốc, tồn hiệu lực và hồi quy |
| **Kim Xuyến** | Chốt request/response, nguồn danh mục và adapter | Gợi ý theo quy tắc, báo giá/cọc/khả dụng | Nối AI khi có cấu hình; xác minh output; thêm bộ vào giỏ | Timeout/lỗi/giới hạn tần suất; kiểm tra ngân sách và giỏ có sẵn | Demo AI/dự phòng, ghi đúng mức tích hợp đã kiểm chứng |
| **Tuấn Kiệt** | Tiếp nhận phiếu bảo trì cũ; chốt interface vòng đời | Lập/tiếp tục phiếu, phân công và cập nhật tiến độ | Kiểm tra/hoàn thành/không đạt, lịch sử | Đề nghị giáng cấp/ngừng sử dụng qua service Minh Tú; kiểm tra ảnh hưởng | Demo bảo trì/vòng đời và sửa lỗi |

**Mốc bàn giao nhóm:**

- **Cuối Day 1:** Có interface, DTO, quyền, route và người sở hữu file rõ ràng; chốt cấu hình AI/email sẽ dùng hoặc ghi rõ chưa có.
- **Cuối Day 2:** Chạy được CRUD nhân sự cơ bản, đánh giá, phiếu bảo trì, nháp điều chỉnh, gợi ý dự phòng và thông báo in-app.
- **Cuối Day 3:** Bảo trì hoàn thành cập nhật kho đúng; có duyệt điều chỉnh; bộ đồ đưa vào giỏ qua API thật; quyền thay đổi có hiệu lực.
- **Cuối Day 4:** Chạy các luồng liên module, retry/cạnh tranh và các tình huống không được phép; tách rõ kết quả mock với tích hợp ngoài thực tế.
- **Cuối Day 5:** Hoàn thành nghiệm thu bắt buộc, có response mẫu/tài liệu giao frontend và danh sách phần còn lại Tuần 6.

Không chờ API ngoài mới làm tư vấn/gửi thông báo: interface, quy tắc, validation, database và mock có thể làm song song. Tuy nhiên chưa kiểm chứng provider thật thì không ghi đã hoàn thành tích hợp thật.

## 15. W5-T9 — Tích hợp và nghiệm thu (cả nhóm, Thanh Tùng điều phối)

### 15.0. Phạm vi, quy tắc nghiệp vụ và API

#### Luồng demo bắt buộc

1. **Nhân sự và quyền:** Tạo nhân viên → đăng nhập → thao tác đúng quyền → quản trị viên hạ quyền/khóa/nghỉ việc → request dùng JWT cũ bị chặn đúng điều kiện, lịch sử không mất.
2. **Bảo trì tới cho thuê lại:** Nhận trả đồ hỏng từ Tuần 4 → tiếp tục phiếu bảo trì đã có → xử lý/kiểm tra đạt → thiết bị trở lại nguồn khả dụng → kiểm tra gán cho đơn hợp lệ.
3. **Giáng cấp có chứng từ:** Đề nghị đổi sản phẩm → xem tác động lịch → xử lý cam kết nếu cần → duyệt → sản phẩm hiện tại đổi, nguồn nhập/đơn cũ giữ nguyên.
4. **Sửa sai nhập/kiểm kê:** Đối chiếu → lập điều chỉnh có bằng chứng → duyệt/áp dụng → giá trị hiệu lực/danh sách thiết bị đúng, không sửa phiếu nhập gốc.
5. **Khách sau thuê:** Đơn hoàn tất → thông báo mời đánh giá → khách đánh giá → điểm sản phẩm cập nhật → quản trị viên ẩn/khôi phục có lý do.
6. **Tư vấn tới giỏ:** Nhập nhu cầu/ngày/ngân sách → nhận bộ đồ từ AI hoặc dự phòng → kiểm tra giá/cọc/khả dụng → khách chỉnh lựa chọn → thêm giỏ → tạo đơn vẫn theo luồng Tuần 2.

#### Checklist với kết quả mong đợi

| # | Tình huống | Kết quả bắt buộc | Người kiểm tra chính |
|---|---|---|---|
| 1 | Tạo nhân viên trùng email/SĐT, kể cả đồng thời | Không tạo hồ sơ dở dang/trùng; transaction nhất quán | Thanh Tùng |
| 2 | Hạ quyền/khóa/nghỉ việc rồi dùng JWT cũ | Không giữ được quyền vận hành cũ; chứng từ còn nguyên | Thanh Tùng và chủ API |
| 3 | Hai quản trị viên cùng thao tác làm mất quyền quản trị cuối cùng | Chặn tình huống hệ thống không còn quản trị viên hoạt động | Thanh Tùng |
| 4 | Đổi tên nhân viên | Snapshot tên trên chứng từ cũ không đổi | Thanh Tùng |
| 5 | Khóa khách có đơn đang thuê/chờ hoàn tiền | Cửa hàng vẫn xử lý nghĩa vụ hiện hữu của đơn | Thanh Tùng |
| 6 | Mở lại phiếu bảo trì từ nhận trả | Tiếp tục phiếu cũ; không tạo thêm phiếu đang mở | Tuấn Kiệt |
| 7 | Hai request tạo bảo trì cho cùng chiếc | Tối đa một phiếu mở; trạng thái thiết bị nhất quán | Tuấn Kiệt |
| 8 | Đến ngày dự kiến sửa xong nhưng chưa xác nhận đạt | Thiết bị vẫn không khả dụng | Tuấn Kiệt, Minh Tú |
| 9 | Xác nhận hoàn thành lặp hoặc chiếc đang ở khách | Không chuyển sai trạng thái/không ghi lịch sử hai lần | Tuấn Kiệt |
| 10 | Giáng cấp chiếc làm thiếu lịch đã gán hoặc đơn chưa gán | Chặn áp dụng cho đến khi giải quyết cam kết hợp lệ | Minh Tú, Tuấn Kiệt |
| 11 | Giáng cấp thành công | Đổi sản phẩm hiện tại; nguồn nhập, đơn và đánh giá cũ giữ nguyên | Minh Tú, Tuấn Kiệt, Kiện Minh |
| 12 | Kiểm kê không thấy chiếc đang thuê | Không tự coi là thiếu mất ở kho hoặc tạo chiếc khác bù | Minh Tú |
| 13 | Duyệt điều chỉnh đồng thời hoặc bấm lại | Chỉ áp dụng một lần; không tăng/giảm hay ghi chênh lệch hai lần | Minh Tú |
| 14 | Snapshot trước đã thay đổi trước lúc duyệt | 409, không ghi đè lên trạng thái mới | Minh Tú |
| 15 | Sai giá nhập đã chốt | Gốc/điều chỉnh/hiệu lực hiển thị đúng; số thiết bị không đổi | Minh Tú |
| 16 | Bổ sung thiết bị thiếu mà không có nguồn nhập xác minh được | Bị chặn, không tạo nguồn nhập giả | Minh Tú |
| 17 | Khách chưa hoàn tất đơn hoặc đổi ID dòng đơn của người khác | Không đánh giá được | Kiện Minh |
| 18 | Hai đánh giá cùng sản phẩm trong một đơn, kể cả hai dòng trùng sản phẩm | Chỉ một đánh giá hợp lệ theo quy tắc nghiệp vụ | Kiện Minh |
| 19 | Ẩn/khôi phục một đánh giá | Điểm, số lượt, phân bố sao và bộ lọc sản phẩm cùng cập nhật; không sửa sao | Kiện Minh |
| 20 | Chưa có ngày thuê khi tư vấn | Chỉ giá tham khảo, không khẳng định còn đồ/tổng theo số ngày tự bịa | Kim Xuyến |
| 21 | AI trả mã lạ, giá sai, số lượng âm hoặc quá khả dụng | Không đưa dữ liệu sai vào kết quả/giỏ | Kim Xuyến, Minh Tú |
| 22 | Cùng số tiền nhưng hai loại ngân sách: tiền thuê và tổng ban đầu | Kết luận phù hợp ngân sách đúng, cọc tách rõ | Kim Xuyến |
| 23 | AI timeout/không có khóa/JSON sai | Dự phòng hoặc báo không có phương án; giỏ/đặt đơn bình thường vẫn dùng được | Kim Xuyến |
| 24 | Một dòng của bộ đồ không hợp lệ hoặc ngày khác giỏ hiện tại | Không thêm dở dang/không âm thầm đổi ngày giỏ | Kim Xuyến |
| 25 | AI gợi ý đúng lúc xem nhưng hết hàng lúc thêm/đặt | Kiểm tra lại và báo thay đổi, không cam kết bằng dữ liệu cũ | Kim Xuyến, Minh Tú |
| 26 | Job thông báo chạy lại/hai worker cùng nhận việc | Không tạo trùng bản ghi sự kiện, không cùng xử lý một bản ghi | Kiện Minh |
| 27 | Mất phản hồi gửi email hoặc khởi động lại khi đang gửi | Không tự báo thành công/gửi vô hạn; có đối chiếu và trạng thái chờ xử lý | Kiện Minh |
| 28 | Người dùng đổi ID đánh dấu thông báo người khác đã đọc | Bị chặn; chỉ thay đổi dữ liệu của mình | Kiện Minh |
| 29 | Gửi email thất bại sau nhận trả/thanh toán thành công | Nghiệp vụ đã commit vẫn đúng; lỗi gửi có thể thử lại | Kiện Minh |
| 30 | Các API thuê, trả, đối soát Tuần 2–4 sau tích hợp | Vẫn chạy; khả dụng, snapshot và số tiền cũ không bị thay đổi sai | Cả nhóm |

Các ca quyền, transaction và cạnh tranh kiểm tra bằng database thật trong môi trường phát triển. Ca AI/email dùng mock để chủ động tạo lỗi; nếu có cấu hình provider thật thì bổ sung kiểm tra kết nối và một luồng thực tế phù hợp.

### 15.A. Thành phần phải bàn giao — Thanh Tùng

- [ ] `docs/contracts/week5.md (đề xuất)`
- [ ] `docs/verification/week5.md (đề xuất)`
- [ ] `Configuration/ (đăng ký adapter và options hiện có)`
- [ ] `Models/DTOs/DonThue/ (liên kết đánh giá/thông báo nếu cần)`


Danh sách trên mô tả đường dẫn tương đối trong repo đề xuất. Mỗi interface/DTO được người phụ trách gửi cho bên tích hợp trước khi implementation hoàn tất.

### 15.B. Hợp đồng DTO

| DTO / phần dữ liệu | Trường phải có hoặc phải trả | Validation / nguồn chuẩn |
| --- | --- | --- |
| BangBanGiaoContract | service, owner, DTO/interface, route, role, bên dùng, ngày chốt, thay đổi tương thích | Là hồ sơ làm việc, không bảng database. |
| KetQuaTichHopNgoai | adapter, môi trường, cấu hình đã che, ca success/fail, nguồn AI/QuyTac hoặc email mock/thật | Chưa có credential phải ghi Blocked hoặc mock rõ, không đánh dấu đã chạy thật. |
| BaoCaoNghiemThu | mã ca, điều kiện seed, expected/actual, Pass/Fail/Blocked, chủ sửa, bằng chứng | Thanh Tùng tổng hợp, chủ service tự xác nhận phần mình. |


### 15.C. Hợp đồng từng method

| Method và input | Output nghiệp vụ | Đọc / ghi / ranh giới |
| --- | --- | --- |
| Rà DI/interface (công việc) | Tất cả controller resolve đúng service | Không tạo hai implementation tính khả dụng/điểm/giá hiệu lực khác nhau. |
| Chạy chuỗi tích hợp (công việc) | Hồ sơ ca kho/tài khoản/khách/adapter | Mỗi failure chỉ rõ nguồn chứng từ, không quy chung lỗi tích hợp. |
| Kiểm tra permission matrix (công việc) | Khách A/B, staff, admin, tài khoản khóa và token cũ | Đặc biệt role thay đổi tác động các action duyệt Week 3–4. |
| Chốt bàn giao Week 6 (công việc) | Query/helper có thể dùng cho báo cáo | Giá trị nhập hiệu lực, chi phí bảo trì và dữ liệu trạng thái có định nghĩa rõ. |


### 15.D. Trình tự triển khai và tích hợp

1. Day 1 gửi interface giữa vòng đời/bảo trì/kho/điều chỉnh và thông báo; thống nhất chủ file chia sẻ để merge theo thứ tự, không làm hai đường cập nhật một thiết bị.
2. Chạy luồng trả hỏng→bảo trì→kiểm tra đạt→khả dụng và nhánh không đạt→đề nghị ngừng→duyệt; kiểm cảnh báo các lịch tương lai ở cả hai nhánh.
3. Chạy sai nhập→điều chỉnh giá lần 1/lần 2→giáng cấp→đọc kho/lịch sử; đối chiếu gốc, delta và hiệu lực bằng số seed cố định.
4. Chạy HoanTat→mời đánh giá→đánh giá→ẩn/khôi phục→điểm tổng; một lần thuê không tạo hai đánh giá cùng sản phẩm.
5. Chạy AI hợp lệ/lỗi/mã bịa→fallback→thêm giỏ và xung đột ngày, xác nhận không có giữ chỗ trước tạo đơn.
6. Chạy khóa/hạ role khi token cũ còn hạn; quyền duyệt nhập/mất/phí/điều chỉnh phải bị chặn đúng trên toàn backend.
7. Chạy lỗi provider/restart worker với record bền vững, ghi rõ phần thật và phần mock. Không lấy mock success để kết luận tích hợp AI/email thật.
8. Gửi Week 6 định nghĩa nguồn báo cáo, quyền và các hạn chế còn lại; việc chưa đạt phải có owner và điều kiện mở chặn.

### 15.F. Mã lỗi đề xuất

| Mã lỗi | HTTP | Khi nào / dữ liệu cần trả |
| --- | --- | --- |
| CONTRACT_KHONG_KHOP | Nghiệm thu | Hai module dùng khác DTO/ý nghĩa trạng thái hoặc nguồn giá; chặn merge cho luồng liên quan. |
| TICH_HOP_THAT_CHUA_KIEM_CHUNG | Nghiệm thu | Adapter chưa có ca thật hoặc thiếu cấu hình; ghi riêng, không giả hoàn tất. |


### 15.G. Ca kiểm tra riêng của task

| Mã ca | Dữ liệu / hành động | Kết quả phải quan sát được |
| --- | --- | --- |
| W5-T9-A01 | Bảo trì hoàn thành rồi mở lại trang kho và báo giá | Một trạng thái nhất quán; không cần chờ job riêng để hết bảo trì. |
| W5-T9-A02 | Hai lần sửa giá + một lần giáng cấp | Kho hiện tại theo nhóm mới; lịch sử mua và giá trị hiệu lực khớp chuỗi điều chỉnh. |
| W5-T9-A03 | Hạ role admin khi đang giữ JWT cũ | Mọi action duyệt nhạy cảm Week 3–5 đều xét quyền mới. |
| W5-T9-A04 | AI/email chỉ cấu hình mock | Biên bản ghi mock, các luồng backend/fallback có thể Pass nhưng tích hợp thật còn Blocked. |
| W5-T9-A05 | Mỗi ca lỗi được sửa | Rerun ca bị ảnh hưởng và luồng phụ thuộc, không tự đánh dấu lại tất cả ca khi chưa có bằng chứng. |


**Đóng W5-T9:** Thanh Tùng bàn giao các file trên, contract được bên dùng xác nhận, ca lỗi/đồng thời phù hợp có kết quả và API chạy qua middleware chung. Ghi Pass/Fail/Blocked kèm dữ liệu/bằng chứng; không chỉ đánh dấu đã viết xong class.


## 16. Hồ sơ bàn giao và công việc giữ cho Tuần 6

**Mỗi người bàn giao:**

- Interface/Service/Controller/DTO hoàn chỉnh của module, danh sách DI và cấu hình cần thiết; build/tích hợp được với dự án.
- Bảng endpoint, request/response mẫu, phân quyền và lỗi nghiệp vụ để frontend sử dụng.
- Dữ liệu demo và thứ tự gọi API; kết quả kiểm tra các ca mình phụ trách, không chỉ luồng thành công.
- Quy tắc transaction/khóa/chống lặp của các action quan trọng; không có nhiều service cùng ghi một nghiệp vụ theo hai công thức khác nhau.
- Ghi rõ tích hợp nào đang mock, tích hợp nào đã chạy provider thật và phần nào còn chưa kiểm chứng.

**Tiếp tục ở Tuần 6 theo roadmap:** quản lý khuyến mãi đầy đủ, báo cáo hoạt động/doanh thu/nhập hàng, quản trị chính sách, tra cứu nhật ký tổng hợp, hoàn thiện hệ thống và triển khai. Các hợp đồng dữ liệu điều chỉnh, giá trị hiệu lực, điểm đánh giá và trạng thái gửi phải sẵn sàng để tuần sau sử dụng.

## 17. Câu giao việc ngắn cho từng người

- **Thanh Tùng:** Làm quản trị tài khoản/nhân viên, khóa/mở khóa, đổi vai trò/nghỉ việc, kiểm tra quyền hiện tại và tích hợp chung.
- **Kiện Minh:** Làm đánh giá sản phẩm/kiểm duyệt/điểm tổng hợp; hoàn thiện thông báo, nhắc lịch, hàng chờ gửi và thử lại.
- **Minh Tú:** Làm theo dõi kho, đối chiếu kiểm kê, chứng từ điều chỉnh, duyệt/áp dụng và cập nhật khả dụng/giá trị hiệu lực.
- **Kim Xuyến:** Làm tư vấn bộ đồ qua adapter AI và quy tắc dự phòng, xác minh dữ liệu, báo giá/cọc và thêm lựa chọn vào giỏ.
- **Tuấn Kiệt:** Làm bảo trì đầy đủ và kiểm tra hoàn thành; hồ sơ vòng đời, đề nghị giáng cấp/ngừng sử dụng qua quy trình điều chỉnh của Minh Tú.

**Điểm kết thúc Tuần 5:** Các chức năng quản trị, kho/vòng đời và hỗ trợ khách hàng nối được với quy trình thuê đã có; dữ liệu lịch sử được giữ, quyền có hiệu lực và các tích hợp ngoài được ghi đúng mức đã kiểm chứng.
