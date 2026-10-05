# GearGo — Đặc tả chi tiết nghiệp vụ

## 1. Tổng quan và phạm vi

GearGo là hệ thống cho thuê đồ cắm trại và du lịch của một cửa hàng. Khách tìm đồ theo thời gian cần thuê, đặt thuê trực tuyến, thanh toán, đến cửa hàng nhận và trả đồ. Nhân viên quản lý nhập hàng, chuẩn bị thiết bị, bàn giao, kiểm tra đồ trả và đối soát tiền cọc.

Phạm vi gồm một cửa hàng, một kho; các sản phẩm như lều, bàn, ghế, đèn, bếp, túi ngủ và balô. Nhà cung cấp bán thiết bị cho cửa hàng; cửa hàng sở hữu thiết bị và cho khách thuê. Nhà cung cấp không phải người đăng đồ cho thuê và không cần tài khoản truy cập hệ thống.

**Quy trình vận hành:**

1. Quản lý nhà cung cấp, danh mục và sản phẩm; lập và xác nhận phiếu nhập hàng để bổ sung thiết bị.
2. Khách chọn thời gian, sản phẩm, số lượng; xem báo giá và tạo đơn giữ chỗ.
3. Khách thanh toán tiền thuê trả trước và tiền cọc; cửa hàng xác nhận đơn.
4. Nhân viên chuẩn bị, chọn thiết bị cụ thể và bàn giao tại cửa hàng.
5. Khách trả đồ; nhân viên kiểm tra, ghi nhận phụ phí nếu có và đối soát.
6. Cửa hàng hoàn cọc hoặc thu thêm; thiết bị được đưa về trạng thái sẵn sàng hoặc chuyển bảo trì.

Không bao gồm giao hàng tận nơi, nhiều chi nhánh, sàn cho nhiều chủ đồ đăng thuê, kế toán đầy đủ và quản lý công nợ nhà cung cấp. Tư vấn AI và thông báo tự động hỗ trợ quy trình thuê.

## 2. Tác nhân và quyền nghiệp vụ

| Tác nhân | Quyền thực hiện |
|---|---|
| Khách vãng lai | Xem danh mục, tìm kiếm, xem giá và khả dụng, dùng tư vấn AI, đăng ký và đăng nhập. |
| Khách hàng | Quản lý hồ sơ, giỏ thuê, đặt thuê, thanh toán, xem và hủy đơn của mình theo chính sách, nhận thông báo và đánh giá. |
| Nhân viên | Tra cứu đơn, chuẩn bị và bàn giao, nhận trả, lập phụ phí, đối soát trong quyền được cấp, quản lý tình trạng thiết bị; xem nhà cung cấp, lập phiếu nhập nháp và xem báo cáo công việc. |
| Quản trị viên | Có các quyền vận hành của nhân viên; quản lý sản phẩm, nhà cung cấp, nhân viên, khuyến mãi và chính sách; xác nhận nhập kho, duyệt điều chỉnh, xử lý ngoại lệ và xem báo cáo tổng hợp. |

Khách chỉ được xem và thao tác dữ liệu của mình. Nhân viên không được tự cấp quyền, thay đổi chính sách hoặc sửa chứng từ đã chốt. Tài khoản bị khóa không được tạo giao dịch mới; các đơn đang thuê vẫn phải được cửa hàng tiếp tục xử lý.

## 3. Các thực thể nghiệp vụ

Tên thực thể và thông tin nghiệp vụ được ghi bằng tiếng Việt. Danh sách dưới đây mô tả đối tượng cần quản lý, không quy định cách thiết kế cơ sở dữ liệu.

| Thực thể | Ý nghĩa và thông tin chính |
|---|---|
| Tài khoản | Thông tin đăng nhập, vai trò, trạng thái hoạt động. |
| Khách hàng | Họ tên, số điện thoại, email, địa chỉ, thông tin cá nhân và lịch sử thuê. |
| Nhân viên | Mã nhân viên, họ tên, liên hệ, vai trò và trạng thái làm việc. |
| Danh mục sản phẩm | Tên nhóm đồ, danh mục cha nếu có, mô tả, thứ tự và trạng thái hiển thị. |
| Sản phẩm | Mẫu đồ cho thuê: mã, tên, danh mục, thương hiệu, mô tả, sức chứa hoặc kích thước, giá thuê mỗi ngày, mức cọc mỗi thiết bị, giá trị bồi thường, hình ảnh và trạng thái kinh doanh. |
| Thiết bị | Từng vật phẩm thực tế thuộc một sản phẩm: mã riêng, nguồn nhập, ngày nhập, giá nhập, tình trạng, phụ kiện đi kèm, số lần cho thuê và trạng thái sử dụng. |
| Nhà cung cấp | Mã, tên, người liên hệ, số điện thoại, email, địa chỉ, mã số thuế nếu có, ghi chú và trạng thái hợp tác. |
| Phiếu nhập hàng | Chứng từ nhập thiết bị: mã phiếu, nhà cung cấp, ngày lập, ngày nhập thực tế, người lập, người xác nhận, số chứng từ của nhà cung cấp nếu có, tổng tiền, trạng thái và ghi chú. |
| Chi tiết phiếu nhập | Từng dòng hàng của phiếu: sản phẩm, số lượng nhập được chấp nhận, đơn giá nhập, thành tiền, tình trạng và ghi chú. Danh sách thiết bị nhận về được gắn với dòng tương ứng. |
| Giỏ thuê; Chi tiết giỏ thuê | Thời gian thuê dự kiến, sản phẩm, số lượng, mã giảm giá và báo giá tạm tính. |
| Giữ chỗ | Sản phẩm, số lượng, khoảng thuê, đơn liên quan và thời điểm hết hạn thanh toán. |
| Đơn thuê | Mã đơn, khách hàng, thông tin người nhận, giờ nhận và trả dự kiến, tiền thuê, giảm giá, tiền cọc, trạng thái, hạn giữ chỗ và chính sách áp dụng. |
| Chi tiết đơn thuê | Sản phẩm, số lượng, số ngày tính tiền, đơn giá, tiền thuê, mức cọc và giá trị bồi thường tại thời điểm đặt. |
| Phân công thiết bị | Thiết bị cụ thể được chọn cho từng dòng đơn, lịch sử thay thế, người thực hiện và thời gian. |
| Phiếu bàn giao; Chi tiết bàn giao | Đơn thuê, nhân viên, thời điểm giao, xác nhận của khách; từng thiết bị, phụ kiện, tình trạng, ảnh và số lượng thực giao. |
| Phiếu nhận trả; Chi tiết nhận trả | Đơn thuê, nhân viên, thời điểm nhận; thiết bị được trả, phụ kiện, tình trạng sau thuê, ảnh, ghi chú và phần còn thiếu. |
| Phụ phí | Loại phí, đơn và thiết bị liên quan, số tiền, lý do, bằng chứng, người lập, người duyệt và trạng thái duyệt. |
| Thanh toán | Khoản tiền thuê, cọc hoặc thu bổ sung: số tiền, mục đích, phương thức, mã giao dịch, thời điểm và kết quả. |
| Hoàn tiền | Khoản hoàn cọc hoặc hoàn do hủy, giao dịch thu gốc, số tiền, lý do, người xử lý và kết quả. |
| Đối soát tiền cọc | Tổng cọc đã thu, phụ phí được duyệt, số cần hoàn hoặc thu thêm, người chốt và thời điểm. |
| Phiếu bảo trì | Thiết bị, lỗi, mức độ, ngày bắt đầu, ngày dự kiến và thực tế hoàn thành, chi phí, kết quả, người xử lý và đơn liên quan nếu có. |
| Phiếu điều chỉnh kho | Thiết bị, loại điều chỉnh, lý do, chứng từ liên quan, tình trạng trước và sau, người lập và người duyệt. |
| Khuyến mãi; Lượt sử dụng khuyến mãi | Mã giảm, điều kiện, thời hạn, giới hạn sử dụng và các đơn đã áp dụng. |
| Đánh giá | Khách hàng, sản phẩm, đơn đã hoàn tất, số sao, nội dung, ảnh và trạng thái hiển thị. |
| Thông báo | Người nhận, nội dung, sự kiện liên quan, thời điểm, kênh gửi và tình trạng gửi hoặc đọc. |
| Lịch sử trạng thái đơn; Lịch sử tình trạng thiết bị; Nhật ký thao tác | Đối tượng thay đổi, nội dung trước và sau, người thực hiện, thời gian và lý do. |

**Phân biệt sản phẩm và thiết bị:** “Lều 4 người” là một sản phẩm; năm chiếc lều mang mã L001–L005 là năm thiết bị. Phiếu nhập mua thêm thiết bị thuộc sản phẩm đó. Khách đặt theo sản phẩm và số lượng; nhân viên chọn mã thiết bị cụ thể khi chuẩn bị đơn.

## 4. Use case khách hàng

### UC01 — Đăng ký, đăng nhập và khôi phục mật khẩu

- **Tác nhân:** Khách vãng lai, người có tài khoản.
- **Cách hoạt động:** Khách đăng ký bằng họ tên, email, số điện thoại, mật khẩu và xác nhận mật khẩu. Hệ thống kiểm tra thông tin, tạo tài khoản khách hàng. Người dùng đăng nhập bằng email hoặc số điện thoại. Khi quên mật khẩu, người dùng xác minh quyền sở hữu tài khoản trước khi đặt mật khẩu mới.
- **Điều kiện và ngoại lệ:** Email, số điện thoại không trùng tài khoản khác; mật khẩu phải đáp ứng yêu cầu được thông báo. Đăng nhập sai nhiều lần bị hạn chế tạm thời. Yêu cầu khôi phục chỉ dùng một lần và có thời hạn. Đăng ký công khai không được tạo tài khoản nhân viên hoặc quản trị viên.
- **Kết quả:** Tài khoản được tạo, đăng nhập thành công hoặc mật khẩu được thay đổi.

### UC02 — Quản lý hồ sơ và theo dõi đơn thuê

- **Tác nhân:** Khách hàng đã đăng nhập.
- **Cách hoạt động:** Khách xem, sửa thông tin cá nhân; tìm đơn theo mã, thời gian và trạng thái; mở chi tiết để xem đồ đã đặt, khoản đã thu, lịch nhận trả, biên bản, phụ phí, hoàn tiền và lịch sử xử lý.
- **Điều kiện và ngoại lệ:** Thông tin liên hệ mới phải hợp lệ và không trùng tài khoản khác. Đổi hồ sơ không tự thay đổi thông tin đã ghi trên đơn cũ. Chỉ hiện thao tác phù hợp trạng thái đơn.
- **Kết quả:** Hồ sơ được cập nhật; khách theo dõi được tiến độ và nghĩa vụ thanh toán của mình.

### UC03 — Tìm kiếm, xem sản phẩm và kiểm tra khả dụng

- **Tác nhân:** Khách vãng lai, khách hàng.
- **Cách hoạt động:** Người dùng chọn giờ nhận, giờ trả; tìm theo tên, danh mục, thương hiệu, sức chứa, khoảng giá hoặc đánh giá. Hệ thống hiển thị sản phẩm, ảnh, thông số, giá thuê, mức cọc, điều kiện thuê và số lượng còn nhận đặt trong khoảng đã chọn.
- **Điều kiện và ngoại lệ:** Giờ trả phải sau giờ nhận; không tạo lượt thuê bắt đầu trong quá khứ. Chưa chọn thời gian thì chỉ hiển thị giá tham khảo, không khẳng định còn đồ. Thiếu số lượng thì gợi ý giảm số lượng, đổi thời gian hoặc sản phẩm khác.
- **Kết quả:** Khách xác định được sản phẩm phù hợp. Khả dụng lúc xem chưa phải cam kết giữ đồ.

### UC04 — Quản lý giỏ thuê và xem báo giá

- **Tác nhân:** Khách hàng.
- **Cách hoạt động:** Khách thêm hoặc xóa sản phẩm, đổi số lượng, chọn thời gian chung cho đơn và nhập mã giảm giá. Mỗi lần thay đổi, hệ thống kiểm tra lại điều kiện thuê và tính tiền từng dòng, tổng tiền thuê, giảm giá, tiền cọc và tổng cần thanh toán ban đầu.
- **Điều kiện và ngoại lệ:** Số lượng là số nguyên dương. Tất cả sản phẩm trong một đơn dùng cùng thời gian nhận và trả. Sản phẩm ngừng kinh doanh hoặc không đủ khả dụng phải được xử lý trước khi tạo đơn. Giỏ thuê không giữ hàng.
- **Kết quả:** Có báo giá tạm tính để khách kiểm tra và xác nhận.

### UC05 — Tạo đơn và giữ chỗ

- **Tác nhân:** Khách hàng có giỏ hợp lệ.
- **Cách hoạt động:**
  1. Khách kiểm tra thông tin nhận đồ, lịch thuê, giá và chính sách; xác nhận đặt thuê.
  2. Hệ thống kiểm tra lại toàn bộ số lượng, giá và điều kiện khuyến mãi. Nếu báo giá thay đổi, yêu cầu khách chấp nhận giá mới.
  3. Nếu đủ đồ, tạo đơn **Chờ thanh toán**, lưu giá và chính sách áp dụng, giữ số lượng trong **15 phút** và hiển thị hạn thanh toán.
- **Ngoại lệ:** Hai khách cùng đặt lượng đồ cuối cùng thì chỉ nhận những đơn nằm trong khả năng phục vụ. Nếu một dòng thiếu hàng, không tạo đơn giữ chỗ một phần. Hết hạn chưa thanh toán hợp lệ thì chuyển **Hết hạn**, trả lại khả dụng.
- **Kết quả:** Đơn có mã tra cứu và thời hạn thanh toán rõ ràng.

### UC06 — Thanh toán và xác nhận đơn

- **Tác nhân:** Khách hàng; hệ thống ghi nhận kết quả thanh toán.
- **Điều kiện:** Đơn đang chờ thanh toán, còn hạn giữ chỗ.
- **Cách hoạt động:** Khách thanh toán toàn bộ tiền thuê sau giảm giá và tiền cọc. Hệ thống kiểm tra đúng đơn, đúng số tiền và kết quả thu; ghi nhận riêng phần tiền thuê và phần cọc. Khi khoản thu hợp lệ và khả dụng vẫn được bảo đảm, đơn chuyển **Đã xác nhận** và khách nhận thông báo.
- **Ngoại lệ:** Thanh toán thất bại có thể thử lại trong thời gian còn giữ chỗ. Chưa rõ kết quả thì hiển thị đang kiểm tra, tránh yêu cầu khách trả lần nữa ngay. Kết quả báo lại nhiều lần chỉ ghi nhận một lần. Tiền đến sau khi đơn đã hết hạn hoặc bị hủy không tự khôi phục đơn; chuyển xử lý hoàn tiền. Thu trùng hoặc sai số tiền phải được đối chiếu trước khi xử lý tiếp.
- **Kết quả:** Có giao dịch được ghi nhận, đơn được xác nhận hoặc khoản tiền cần xử lý được theo dõi.

### UC07 — Hủy đơn và hoàn tiền

- **Tác nhân:** Khách hàng với đơn của mình; quản trị viên khi cửa hàng hủy hoặc giải quyết ngoại lệ.
- **Điều kiện:** Chưa bàn giao thiết bị. Đơn đang thuê phải xử lý nhận trả, không hủy để bỏ qua nghĩa vụ trả đồ.
- **Cách hoạt động:** Khách chọn hủy, xem chính sách và số tiền dự kiến được hoàn, nhập lý do rồi xác nhận. Hệ thống ghi người hủy, thời điểm, lý do, phí giữ lại; giải phóng lịch và lập yêu cầu hoàn tiền nếu có. Nhân viên được phân quyền hoặc quản trị viên theo dõi kết quả hoàn.
- **Chính sách:** Chưa thanh toán được hủy miễn phí; trước giờ nhận trên 48 giờ hoàn toàn bộ; từ 24 đến 48 giờ khấu trừ tiền thuê theo tỷ lệ cấu hình; dưới 24 giờ áp dụng mức giữ lại tiền thuê đã công bố. Cọc bảo đảm được hoàn toàn bộ khi chưa bàn giao. Cửa hàng hủy do không cung cấp được đồ phải hoàn toàn bộ khoản đã thu.
- **Ngoại lệ:** Hoàn tiền thất bại giữ trạng thái chờ xử lý, không báo đã hoàn. Khách không đến nhận phải được nhân viên ghi nhận và quản trị viên xử lý theo chính sách đã công bố, không tự coi là đã bàn giao.
- **Kết quả:** Đơn **Khách hủy** hoặc **Cửa hàng hủy**; tình trạng hoàn tiền được theo dõi riêng đến khi giải quyết xong.

### UC08 — Đánh giá sản phẩm

- **Tác nhân:** Khách hàng có đơn đã hoàn tất.
- **Cách hoạt động:** Khách chọn sản phẩm đã thuê trong đơn, chấm từ 1 đến 5 sao, viết nhận xét và thêm ảnh nếu muốn. Hệ thống hiển thị đánh giá hợp lệ trên sản phẩm.
- **Điều kiện và ngoại lệ:** Mỗi khách chỉ có một đánh giá cho mỗi sản phẩm trong mỗi đơn hoàn tất. Không đánh giá thay khách khác hoặc sản phẩm không có trong đơn. Quản trị viên được ẩn nội dung vi phạm và ghi lý do, không sửa điểm của khách.
- **Kết quả:** Có đánh giá gắn với lượt thuê thực tế.

### UC09 — Nhận tư vấn bộ đồ bằng AI

- **Tác nhân:** Khách vãng lai, khách hàng.
- **Cách hoạt động:** Người dùng nhập điểm đến, số người, thời gian, ngân sách và nhu cầu. Hệ thống gợi ý sản phẩm, số lượng, lý do chọn và chi phí dự kiến. Khách chỉnh sửa bộ đồ rồi thêm vào giỏ để tiếp tục đặt thuê thông thường.
- **Điều kiện và ngoại lệ:** Chỉ đề xuất sản phẩm cửa hàng có kinh doanh. Giá và khả dụng phải đối chiếu dữ liệu cửa hàng; chưa có ngày cụ thể thì không cam kết còn hàng. Nêu riêng tiền thuê và cọc để khách hiểu ngân sách cần chuẩn bị. Khi không tư vấn được, cho phép tìm đồ và chọn bộ gợi ý có sẵn.
- **Kết quả:** Có bộ đồ tham khảo. Tư vấn không tự tạo đơn, thu tiền, giữ chỗ hoặc quyết định phụ phí.

## 5. Use case vận hành cho thuê

### UC10 — Tra cứu và chuẩn bị đơn

- **Tác nhân:** Nhân viên, quản trị viên.
- **Điều kiện:** Đơn đã xác nhận thanh toán.
- **Cách hoạt động:** Nhân viên tìm đơn theo mã, khách hàng, số điện thoại, thời gian hoặc trạng thái; chuyển **Đang chuẩn bị**. Chọn từng mã thiết bị đúng sản phẩm và số lượng, kiểm tra tình trạng, phụ kiện và lịch thuê. Khi đủ đồ, chuyển **Sẵn sàng nhận** và thông báo khách.
- **Ngoại lệ:** Thiết bị hỏng hoặc đang bị giữ quá hạn phải được thay bằng thiết bị cùng sản phẩm, đủ điều kiện và không trùng lịch. Nếu không đủ đồ, cảnh báo nhân viên và chuyển quản trị viên xử lý với khách; không tự thay sản phẩm hoặc giảm số lượng đã thanh toán.
- **Kết quả:** Có danh sách thiết bị cụ thể sẵn sàng giao cho đơn.

### UC11 — Bàn giao thiết bị

- **Tác nhân:** Nhân viên, khách hàng xác nhận nhận đồ.
- **Điều kiện:** Đơn sẵn sàng nhận, đủ tiền thuê và cọc, đến thời gian nhận hợp lệ.
- **Cách hoạt động:** Nhân viên tra mã đơn hoặc quét mã QR nếu có, đối chiếu người nhận; kiểm tra từng thiết bị và phụ kiện cùng khách. Lập phiếu bàn giao gồm mã thiết bị, số lượng, tình trạng trước thuê, ảnh, thời gian thực tế và nhân viên. Khách xác nhận, nhân viên chốt phiếu, đơn chuyển **Đang thuê**.
- **Ngoại lệ:** Mã QR chỉ hỗ trợ tìm đơn, không thay việc kiểm tra người nhận. Thiếu đồ hoặc khách chưa đồng ý tình trạng thì chưa chốt; thay thiết bị hoặc chuyển xử lý thiếu hàng. Phạm vi này chốt bàn giao đủ một lần, không giao thiếu rồi vẫn thu đủ tiền như đơn ban đầu. Nhận sớm phải kiểm tra khả dụng và được cửa hàng chấp thuận trước.
- **Kết quả:** Ghi nhận chính xác thiết bị khách đã nhận, tình trạng ban đầu và thời điểm bắt đầu sử dụng thực tế.

### UC12 — Nhận trả và kiểm tra thiết bị

- **Tác nhân:** Nhân viên; khách hàng trả đồ.
- **Điều kiện:** Đơn đang thuê và đã có phiếu bàn giao.
- **Cách hoạt động:**
  1. Tra cứu đơn, đối chiếu thiết bị và phụ kiện đã giao.
  2. Ghi thời điểm trả thực tế của từng thiết bị; kiểm tra và phân loại: bình thường, cần vệ sinh, hỏng nhẹ, hỏng nặng, thiếu phụ kiện hoặc mất thiết bị.
  3. Lập phiếu nhận trả, lưu ảnh và ghi chú; chuyển đồ đạt kiểm tra về sẵn sàng, đồ cần xử lý sang bảo trì hoặc ngừng sử dụng.
  4. Khi mọi thiết bị đã có kết luận, chuyển đơn **Đã nhận trả**, sau đó **Chờ đối soát**.
- **Ngoại lệ:** Khách trả thiếu thì ghi nhận phần đã trả và phần còn phải trả; đơn tiếp tục đang thuê, có nhãn trả một phần. Thiết bị chưa trả không được coi là đã về kho. Nếu xác nhận mất, phải có biên bản, phụ phí bồi thường được duyệt và kết luận xử lý thay cho nghĩa vụ trả thiết bị đó. Không ghi nhận cùng một thiết bị được trả hai lần.
- **Kết quả:** Có bằng chứng sau thuê và kết luận cho từng thiết bị; không hoàn tất đơn khi còn đồ chưa có hướng xử lý.

### UC13 — Quản lý đơn quá hạn

- **Tác nhân:** Hệ thống, nhân viên.
- **Cách hoạt động:** Khi đã quá giờ trả mà còn thiết bị chưa trả và chưa có kết luận mất, hệ thống gắn nhãn **Quá hạn**, nhắc khách, hiển thị phụ phí trễ dự kiến và cảnh báo nhân viên. Nếu ảnh hưởng lịch thuê kế tiếp, nêu rõ đơn bị ảnh hưởng để nhân viên tìm đồ thay thế hoặc liên hệ khách.
- **Điều kiện và ngoại lệ:** Quá hạn là nhãn theo dõi của đơn đang thuê. Không tự coi thiết bị là sẵn sàng chỉ vì đã đến giờ trả dự kiến. Khoản trễ chỉ được chốt theo thời gian thực trả hoặc thời điểm xử lý mất được duyệt.
- **Kết quả:** Nhân viên biết đơn cần xử lý và nguy cơ thiếu đồ cho lịch tiếp theo.

### UC14 — Lập và duyệt phụ phí

- **Tác nhân:** Nhân viên lập; quản trị viên duyệt khoản vượt quyền hoặc ngoại lệ.
- **Cách hoạt động:** Từ kết quả nhận trả, chọn loại phí: trả trễ, vệ sinh đặc biệt, hư hỏng, mất phụ kiện, mất thiết bị hoặc điều chỉnh khác. Hệ thống tính gợi ý theo chính sách của đơn. Nhân viên kiểm tra số tiền, bổ sung lý do và bằng chứng; gửi duyệt nếu vượt ngưỡng quyền hạn và thông báo khách.
- **Điều kiện và ngoại lệ:** Tình trạng bất thường phải có ghi chú và ảnh bằng chứng. Không tính cả mất thiết bị và sửa chữa cho cùng một tổn thất; không thu phí cho hao mòn thông thường được chính sách cho phép. Phí bị từ chối không đưa vào đối soát. Khách không đồng ý thì giữ chờ xử lý, chuyển quản trị viên và ghi kết quả giải quyết.
- **Kết quả:** Có danh sách phụ phí hợp lệ, truy được nguyên nhân, người lập và người duyệt.

### UC15 — Đối soát cọc và hoàn tất đơn

- **Tác nhân:** Nhân viên trong quyền được cấp, quản trị viên.
- **Điều kiện:** Tất cả thiết bị đã kiểm tra hoặc được xác nhận mất và xử lý bồi thường; phụ phí đã có kết luận.
- **Cách hoạt động:** Hệ thống tổng hợp tiền thuê đã thanh toán, tiền cọc đã thu và phụ phí được duyệt. Nhân viên xác nhận bảng đối soát; lập hoàn cọc nếu còn dư hoặc thu bổ sung nếu cọc không đủ. Sau khi giao dịch cần thiết thành công, chốt đối soát và chuyển **Hoàn tất**.
- **Ngoại lệ:** Tiền thuê đã trả trước không thu lại khi trả đồ. Nếu chưa thu đủ phần bổ sung, hoàn tiền thất bại hoặc còn tranh chấp, đơn tiếp tục chờ đối soát. Bấm xác nhận nhiều lần không tạo nhiều khoản thu hoặc hoàn. Điều chỉnh sau khi chốt phải ghi thành khoản điều chỉnh riêng có phê duyệt.
- **Kết quả:** Đơn hết nghĩa vụ giao nhận và tài chính, khách có bảng đối soát cuối cùng và được đánh giá sản phẩm.

### UC16 — Bảo trì và quản lý vòng đời thiết bị

- **Tác nhân:** Nhân viên, quản trị viên.
- **Cách hoạt động:** Khi phát hiện đồ cần vệ sinh hoặc sửa chữa, lập phiếu bảo trì ghi lỗi, mức độ, ngày bắt đầu, dự kiến hoàn thành và đơn liên quan nếu có. Thiết bị được loại khỏi số có thể cho thuê. Người xử lý cập nhật chi phí, kết quả; sau kiểm tra đạt thì xác nhận hoàn thành và đưa về sẵn sàng.
- **Ngoại lệ:** Thiết bị đã gán cho đơn tương lai phải được cảnh báo để thay thế. Ngày dự kiến sửa xong chưa đủ để cam kết cho thuê lại. Nếu không thể sửa, quản trị viên xác nhận ngừng sử dụng hoặc thanh lý; không xóa thiết bị và lịch sử cũ.
- **Kết quả:** Tình trạng, chi phí xử lý và lịch sử vòng đời thiết bị được theo dõi.

## 6. Use case nhà cung cấp và nhập hàng

### UC17 — Quản lý nhà cung cấp

- **Tác nhân:** Quản trị viên quản lý; nhân viên tra cứu khi nhập hàng.
- **Cách hoạt động:** Tạo nhà cung cấp với mã riêng, tên, liên hệ, địa chỉ và thông tin bổ sung; tìm kiếm, cập nhật hoặc chuyển trạng thái ngừng hợp tác. Mở hồ sơ để xem các phiếu nhập, sản phẩm từng nhập, thời điểm, số lượng và tổng giá trị nhập đã xác nhận.
- **Điều kiện và ngoại lệ:** Tên và ít nhất một cách liên hệ phải có; mã nhà cung cấp không trùng. Cảnh báo thông tin có khả năng trùng để kiểm tra. Nhà cung cấp đã có chứng từ chỉ được ngừng hợp tác, không xóa lịch sử. Nhà cung cấp ngừng hợp tác không được chọn cho phiếu mới hoặc xác nhận phiếu nháp cũ.
- **Kết quả:** Có danh sách nguồn mua thiết bị và lịch sử giao dịch với từng nguồn.

### UC18 — Lập và sửa phiếu nhập hàng

- **Tác nhân:** Nhân viên, quản trị viên.
- **Điều kiện:** Nhà cung cấp còn hợp tác; sản phẩm đã được khai báo. Sản phẩm mới phải được tạo trước khi thêm dòng nhập.
- **Cách hoạt động:**
  1. Người lập chọn nhà cung cấp, ngày nhập dự kiến hoặc thực tế, chứng từ kèm theo và ghi chú. Hệ thống tạo mã phiếu, ghi người lập và trạng thái **Nháp**.
  2. Thêm từng **Chi tiết phiếu nhập** gồm sản phẩm, số lượng dự kiến nhận, đơn giá nhập và ghi chú tình trạng. Hệ thống tính thành tiền từng dòng và tổng phiếu.
  3. Lưu nháp; người lập được thêm, sửa, xóa dòng hoặc hủy phiếu khi chưa xác nhận. Quản trị viên được kiểm tra và sửa phiếu nháp.
- **Điều kiện và ngoại lệ:** Phiếu phải có ít nhất một dòng để xác nhận. Số lượng là số nguyên dương, đơn giá không âm; giá bằng 0 cần lý do. Dòng cùng sản phẩm, cùng giá và cùng tình trạng được gộp; khác giá hoặc tình trạng thì tách dòng. Không tự thay đơn giá nhập thành giá thuê.
- **Kết quả:** Có phiếu nháp để kiểm tra trước khi nhập kho. Lưu nháp không tăng số lượng thiết bị hoặc khả dụng.

### UC19 — Kiểm tra hàng và xác nhận nhập kho

- **Tác nhân:** Nhân viên kiểm tra; quản trị viên xác nhận.
- **Điều kiện:** Phiếu nháp hợp lệ, nhà cung cấp còn hợp tác, hàng đã được giao và kiểm tra thực tế.
- **Cách hoạt động:**
  1. Đối chiếu hàng nhận với phiếu và chứng từ nhà cung cấp; ghi nhận số lượng, chất lượng, phụ kiện, hàng thiếu hoặc bị từ chối.
  2. Sửa chi tiết theo **số lượng thực tế được cửa hàng chấp nhận nhập**; chốt đơn giá và tổng tiền. Hàng chưa giao hoặc bị từ chối không đưa vào số lượng nhập đã xác nhận.
  3. Ghi danh sách thiết bị: mỗi vật phẩm có một mã riêng, sản phẩm, giá nhập, ngày nhập, tình trạng và chi tiết phiếu nhập nguồn. Số mã thiết bị của mỗi dòng phải bằng số lượng nhập dòng đó.
  4. Quản trị viên kiểm tra và xác nhận. Phiếu chuyển **Đã nhập kho**, lưu người và thời điểm xác nhận; toàn bộ thiết bị được ghi nhận vào kho một lần.
  5. Thiết bị đạt yêu cầu chuyển sẵn sàng. Thiết bị có lỗi nhưng cửa hàng vẫn chấp nhận nhận về được ghi đang bảo trì, kèm phiếu xử lý, chưa cho thuê.
- **Ngoại lệ:** Trùng mã thiết bị, thiếu thông tin hoặc số lượng không khớp thì không xác nhận. Một phiếu không được xác nhận hai lần hoặc chỉ tăng kho một phần do lỗi xử lý. Nhà cung cấp giao nhiều đợt thì mỗi đợt nhận lập một phiếu riêng; có thể dùng chung số chứng từ tham chiếu và ghi rõ đợt để tránh nhập trùng.
- **Kết quả:** Tổng số thiết bị tăng theo hàng thực nhận; số sẵn sàng tăng chỉ theo thiết bị đạt kiểm tra. Truy ngược được từng thiết bị về lần nhập và nhà cung cấp.

### UC20 — Tra cứu, hủy nháp và xử lý sai lệch phiếu nhập

- **Tác nhân:** Nhân viên, quản trị viên theo quyền.
- **Cách hoạt động:** Tìm phiếu theo mã, nhà cung cấp, thời gian, người lập hoặc trạng thái; xem tổng tiền, từng dòng và thiết bị đã nhập. Phiếu nháp không dùng được chuyển **Đã hủy**, ghi lý do và không tác động kho.
- **Phiếu đã xác nhận:** Không sửa trực tiếp số lượng, giá hoặc xóa phiếu. Nếu sai, người phát hiện lập yêu cầu điều chỉnh tham chiếu phiếu và thiết bị bị ảnh hưởng; quản trị viên kiểm tra, duyệt và lưu giá trị trước, sau cùng lý do. Chỉ điều chỉnh giá trị khi sai giá; thay đổi số thiết bị phải có căn cứ kiểm kê và danh sách cụ thể.
- **Ngoại lệ:** Không giảm loại bỏ thiết bị đang cho khách thuê, chưa thu hồi hoặc đang có lịch đã cam kết mà chưa xử lý thay thế. Đổi tên nhà cung cấp hoặc sản phẩm về sau không làm thay đổi nội dung chứng từ đã chốt. Không biến hủy phiếu nháp thành thao tác đảo một phiếu đã nhập kho.
- **Kết quả:** Chứng từ lịch sử được giữ nguyên; sai lệch được sửa có căn cứ và không làm mất dấu thiết bị. Quy trình trả hàng và công nợ nhà cung cấp không thuộc phạm vi này.

## 7. Use case quản trị và hỗ trợ

### UC21 — Quản lý danh mục và sản phẩm

- **Tác nhân:** Quản trị viên.
- **Cách hoạt động:** Tạo và sửa danh mục, sắp xếp hoặc ẩn danh mục; quản lý sản phẩm với tên, thông số, ảnh, giá thuê, mức cọc, giá trị bồi thường và trạng thái kinh doanh. Có thể tạm ngừng nhận đơn mới cho sản phẩm.
- **Điều kiện và ngoại lệ:** Mã sản phẩm không trùng; giá và mức cọc không âm. Sản phẩm hoặc danh mục có giao dịch không bị xóa lịch sử. Đổi giá chỉ tác động báo giá mới, không sửa đơn đã tạo. Sản phẩm có đơn đã xác nhận vẫn phải được phục vụ hoặc xử lý hủy theo chính sách. Không nhập số lượng kho tùy ý tại phần sửa sản phẩm; mua thêm phải qua phiếu nhập.
- **Kết quả:** Danh mục và thông tin cho thuê được cập nhật, độc lập với số thiết bị thực tế.

### UC22 — Theo dõi và kiểm kê kho

- **Tác nhân:** Nhân viên kiểm tra; quản trị viên duyệt điều chỉnh.
- **Cách hoạt động:** Xem thiết bị theo sản phẩm, tình trạng, nguồn nhập và lịch sử sử dụng; xem khả dụng theo khoảng thuê. Khi kiểm kê, đối chiếu số thiết bị tại kho, đang thuê, bảo trì hoặc ngừng sử dụng với thực tế. Sai lệch được lập phiếu điều chỉnh kho, nêu thiết bị, nguyên nhân và bằng chứng để duyệt.
- **Điều kiện và ngoại lệ:** Nhập hàng mua mới dùng phiếu nhập; nhận lại đồ khách thuê dùng phiếu nhận trả, không lập phiếu nhập mua hàng lần nữa. Thiết bị đang giữ cho đơn và thiết bị đã gán có thể là cùng một lượng cam kết, không trừ kho hai lần. Mọi điều chỉnh ảnh hưởng đơn tương lai phải cảnh báo và xử lý lịch liên quan.
- **Kết quả:** Có số liệu kho đáng tin cậy và nguyên nhân cho mỗi biến động.

### UC23 — Quản lý tài khoản và nhân viên

- **Tác nhân:** Quản trị viên.
- **Cách hoạt động:** Tạo tài khoản nhân viên, sửa hồ sơ và vai trò; tìm người dùng, khóa hoặc mở khóa tài khoản, ghi lý do. Khi nhân viên nghỉ việc, ngừng quyền truy cập của tài khoản.
- **Điều kiện và ngoại lệ:** Không xóa người đã lập chứng từ hoặc xử lý đơn. Phiếu cũ vẫn thể hiện tên người lập và người xác nhận tại thời điểm phát sinh. Việc khóa tài khoản khách không làm biến mất đơn thuê hoặc khoản tiền đang xử lý.
- **Kết quả:** Người dùng có đúng quyền; chứng từ cũ vẫn truy được người chịu trách nhiệm.

### UC24 — Quản lý và áp dụng khuyến mãi

- **Tác nhân:** Quản trị viên cấu hình; khách áp dụng khi đặt thuê.
- **Cách hoạt động:** Tạo mã giảm theo phần trăm hoặc số tiền, thời hạn, giá trị thuê tối thiểu, phạm vi sản phẩm hoặc danh mục, số lượt tổng, giới hạn mỗi khách và mức giảm tối đa. Hệ thống kiểm tra mã khi nhập, khi tạo đơn và khi xác nhận thanh toán.
- **Điều kiện và ngoại lệ:** Mỗi đơn dùng tối đa một mã trong phạm vi cơ bản. Giảm trên tiền thuê của phần hàng đủ điều kiện, không giảm cọc và không vượt tiền thuê đó. Lượt được tạm giữ cùng đơn chờ thanh toán; hết hạn hoặc hủy trước thanh toán thì trả lại lượt. Sau thanh toán thành công, lượt được ghi nhận đã dùng; hủy sau đó không tự phục hồi lượt.
- **Kết quả:** Giảm giá được lưu rõ trên đơn; tổng lượt không vượt giới hạn khi nhiều khách đặt cùng lúc.

### UC25 — Xem báo cáo hoạt động, doanh thu và nhập hàng

- **Tác nhân:** Nhân viên xem báo cáo công việc; quản trị viên xem toàn bộ.
- **Cách hoạt động:** Chọn ngày hoặc khoảng thời gian để xem đơn cần giao, cần trả, quá hạn, chờ đối soát; số lượt thuê, sản phẩm thuê nhiều, thiết bị hay hỏng, tỷ lệ hủy và khách quay lại. Xem khoản thu tiền thuê, phụ phí, cọc đang giữ và khoản hoàn theo từng nhóm.
- **Báo cáo nhập hàng:** Lọc theo ngày nhập thực tế, nhà cung cấp và sản phẩm; tổng hợp số phiếu đã nhập, số thiết bị nhận, số lượng từng sản phẩm, tổng giá trị và lịch sử đơn giá. Phiếu nháp và đã hủy không được cộng; điều chỉnh được thể hiện riêng.
- **Quy tắc:** Báo cáo doanh thu thuê đã hoàn tất dùng ngày hoàn tất, tiền thuê sau giảm giá và phụ phí được duyệt; phí hủy giữ lại trình bày riêng. Báo cáo dòng tiền dùng ngày giao dịch thu hoặc hoàn thành công. Cọc đang giữ không phải doanh thu; tiền mua thiết bị không được tự trừ để gọi kết quả là lợi nhuận kế toán.
- **Kết quả:** Cửa hàng theo dõi được nhu cầu thuê, tiền cần xử lý và nguồn thiết bị đã mua.

### UC26 — Cấu hình chính sách, thông báo và tra cứu lịch sử

- **Tác nhân:** Quản trị viên cấu hình; hệ thống gửi thông báo; người có quyền xem lịch sử.
- **Cách hoạt động:** Cấu hình hạn giữ chỗ, giờ nhận trả, mức phí trễ, quy tắc bồi thường, ngưỡng duyệt phụ phí, chính sách hủy và mốc nhắc khách. Thông báo theo sự kiện xác nhận đơn, sẵn sàng nhận, sắp trả, quá hạn, phát sinh phụ phí, hoàn tiền và mời đánh giá.
- **Điều kiện và ngoại lệ:** Đổi chính sách chỉ áp dụng cho đơn mới; đơn đã tạo dùng chính sách đã lưu. Một sự kiện không gửi lặp vô hạn; gửi thất bại được theo dõi để thử lại, không làm đổi kết quả thanh toán hoặc mất đơn. Nhật ký lưu thay đổi giá, trạng thái đơn, thiết bị, nhập kho, phụ phí, hoàn tiền, tài khoản và cấu hình.
- **Kết quả:** Khách và nhân viên nhận thông tin cần thiết; tra được ai đã thay đổi nghiệp vụ, lúc nào và vì sao.

## 8. Quy tắc tính toán và trạng thái

### 8.1 Thời gian thuê và khả dụng

- Tất cả giờ nhận, trả và thời hạn hiển thị theo giờ Việt Nam. Một ngày tính tiền bằng 24 giờ; phần lẻ được làm tròn lên, tối thiểu một ngày.
- Hai lượt thuê trùng lịch nếu có thời gian sử dụng giao nhau. Lượt sau bắt đầu đúng lúc lượt trước kết thúc không trùng về lịch; thực tế chỉ bàn giao lại khi thiết bị đã được nhận và kiểm tra xong.
- Chỉ nhận đơn nếu có đủ số thiết bị phục vụ xuyên suốt khoảng thuê. Tính cả đơn chờ thanh toán còn hạn và các đơn đã xác nhận; thiết bị đã được gán không được tính như một lần giữ chỗ bổ sung.
- Thiết bị đang bảo trì, thất lạc, ngừng sử dụng hoặc trả quá hạn chưa có hướng xử lý không được tính sẵn sàng. Ngày sửa xong dự kiến và hàng chưa xác nhận nhập kho không tạo khả dụng chắc chắn.
- Nhập kho tăng thiết bị cửa hàng sở hữu. Bàn giao cho thuê không làm mất quyền sở hữu; nhận trả không phải mua thêm hàng.

**Ví dụ:** Cửa hàng có 5 lều đạt điều kiện. Có đơn giữ 3 lều trong khoảng khách mới muốn thuê thì còn tối đa 2 lều trong phần lịch trùng. Nếu một trong hai lều còn lại đang bảo trì thì chỉ có thể nhận thêm 1 lều. Sau khi xác nhận nhập 2 lều mới đạt kiểm tra, khả dụng có thể tăng thêm 2 từ thời điểm nhập, tùy các lịch đã cam kết.

### 8.2 Tiền thuê và cọc

| Khoản tính | Quy tắc |
|---|---|
| Số ngày thuê | Thời lượng từ giờ nhận đến giờ trả dự kiến chia 24 giờ, làm tròn lên, tối thiểu 1 ngày. |
| Tiền thuê từng dòng | Giá thuê mỗi ngày × Số ngày thuê × Số lượng. |
| Tiền thuê phải trả | Tổng tiền thuê các dòng − Giảm giá hợp lệ. |
| Tiền cọc | Tổng của mức cọc mỗi thiết bị × Số lượng từng dòng. |
| Thanh toán ban đầu | Toàn bộ tiền thuê phải trả + Toàn bộ tiền cọc. |
| Cọc hoàn khi kết thúc thuê | Phần dương của: Cọc đã thu − Tổng phụ phí đã duyệt. |
| Khách phải trả bổ sung | Phần dương của: Tổng phụ phí đã duyệt − Cọc đã thu. |

Mức cọc là số tiền cố định cho mỗi thiết bị của từng sản phẩm. Cọc bảo đảm được quản lý riêng với tiền thuê. Giá thuê, mức cọc, giá trị bồi thường và chính sách được giữ theo thời điểm khách tạo đơn; tiền dùng đơn vị đồng Việt Nam và làm tròn đến đồng khi phát sinh phần lẻ.

**Ví dụ:** Khách thuê 2 lều, giá 100.000 đồng/lều/ngày trong 2 ngày; cọc 500.000 đồng/lều. Tiền thuê là 400.000 đồng, cọc 1.000.000 đồng; thanh toán ban đầu 1.400.000 đồng. Khi trả, nếu phụ phí được duyệt là 150.000 đồng thì hoàn cọc 850.000 đồng, không thu lại 400.000 đồng tiền thuê.

### 8.3 Phụ phí

| Loại | Cách xác định |
|---|---|
| Trả trễ | Số ngày trễ làm tròn lên × Giá thuê ngày đã lưu × Hệ số phí trễ; mặc định hệ số 150%. Tính riêng các thiết bị trả trễ. |
| Vệ sinh đặc biệt | Theo mức công bố, chỉ khi tình trạng vượt vệ sinh thông thường đã bao gồm trong dịch vụ. |
| Hư hỏng | Theo mức độ và tỷ lệ bồi thường đã công bố trên giá trị bồi thường của thiết bị; có kiểm tra và bằng chứng. |
| Mất phụ kiện | Theo bảng giá bồi thường phụ kiện áp dụng cho đơn. |
| Mất thiết bị | Theo giá trị bồi thường đã lưu trên đơn; không cộng thêm khoản sửa chữa cho chính thiết bị mất đó. |
| Điều chỉnh khác | Có lý do cụ thể và quản trị viên duyệt, không dùng để cộng phí tùy ý. |

Khách trả sớm không tự được giảm tiền thuê đã chốt. Nếu xác nhận mất thiết bị, phí trễ dừng tại thời điểm lập kết luận mất được duyệt, không tăng mãi sau khi đã xử lý bồi thường.

### 8.4 Tiền nhập hàng

- Thành tiền chi tiết phiếu nhập = Số lượng thực nhận được chấp nhận × Đơn giá nhập.
- Tổng tiền phiếu nhập = Tổng thành tiền các chi tiết.
- Đơn giá nhập là giá mua thực tế được chốt; phạm vi này không tách nghiệp vụ thuế, chiết khấu, phí vận chuyển hoặc công nợ thành quy trình riêng. Nếu có các khoản đó, đơn giá thực nhập phải được thống nhất trước khi xác nhận và ghi chú căn cứ.
- Giá nhập lưu theo từng lần nhập, không ghi đè giá của thiết bị nhập trước. Giá nhập, giá cho thuê và giá trị bồi thường là ba thông tin khác nhau.

**Ví dụ:** Nhập 3 lều giá 1.200.000 đồng/chiếc và 5 ghế giá 200.000 đồng/chiếc: phiếu có 2 chi tiết, tổng tiền 4.600.000 đồng. Khi xác nhận, ghi nhận 8 thiết bị có mã riêng. Nếu một ghế được chấp nhận nhập nhưng cần sửa, kho sở hữu tăng 8 thiết bị, số sẵn sàng tăng 7.

### 8.5 Trạng thái đơn thuê

| Trạng thái | Điều kiện chuyển tiếp |
|---|---|
| Chờ thanh toán | Thu đúng và đủ trong hạn thì sang Đã xác nhận; hết hạn sang Hết hạn; hủy hợp lệ sang trạng thái hủy tương ứng. |
| Đã xác nhận | Nhân viên bắt đầu xử lý thì sang Đang chuẩn bị; có thể hủy trước bàn giao theo chính sách. |
| Đang chuẩn bị | Gán đủ thiết bị đạt yêu cầu thì sang Sẵn sàng nhận; nếu không thể phục vụ thì xử lý hủy theo chính sách. |
| Sẵn sàng nhận | Chốt phiếu bàn giao thì sang Đang thuê; chưa bàn giao vẫn xử lý hủy theo chính sách. |
| Đang thuê | Giữ trạng thái nếu trả một phần; sang Đã nhận trả khi tất cả thiết bị đã có kết luận trả hoặc mất hợp lệ. Có thể gắn nhãn Quá hạn. |
| Đã nhận trả | Hồ sơ kiểm tra đủ thì sang Chờ đối soát. |
| Chờ đối soát | Giải quyết xong phụ phí, thu thêm hoặc hoàn cọc thì sang Hoàn tất. |
| Hoàn tất | Kết thúc quy trình thuê; sửa sai sau đó bằng điều chỉnh có phê duyệt. |
| Hết hạn; Khách hủy; Cửa hàng hủy | Không bàn giao hoặc tự khôi phục; khoản thu và hoàn còn tồn tại tiếp tục được xử lý riêng. |

Mỗi lần đổi trạng thái phải đúng điều kiện và lưu người thực hiện, thời điểm, lý do. Không dùng quyền quản trị để bỏ qua việc ghi nhận thiết bị hoặc nghĩa vụ tài chính.

### 8.6 Trạng thái phiếu nhập và thiết bị

| Đối tượng | Trạng thái và ý nghĩa |
|---|---|
| Phiếu nhập hàng — Nháp | Chưa tăng kho; được sửa, xác nhận hoặc hủy theo quyền. |
| Phiếu nhập hàng — Đã nhập kho | Đã ghi nhận thiết bị một lần; chỉ sửa sai bằng điều chỉnh có căn cứ. |
| Phiếu nhập hàng — Đã hủy | Chỉ xuất phát từ phiếu nháp; không tác động kho, không xác nhận tiếp. |
| Thiết bị — Sẵn sàng | Đạt kiểm tra; có thể bố trí cho đơn nếu không trùng lịch. |
| Thiết bị — Đang thuê | Đã giao và chưa nhận lại; không sẵn sàng tại cửa hàng. |
| Thiết bị — Đang bảo trì | Đang vệ sinh hoặc sửa chữa; chưa được cho thuê lại. |
| Thiết bị — Thất lạc | Đã xác nhận mất; giữ lịch sử, không tính khả dụng. |
| Thiết bị — Ngừng sử dụng | Đã loại khỏi kinh doanh hoặc thanh lý; giữ lịch sử. |

Việc **đã gán cho đơn tương lai** được thể hiện bằng lịch phân công, không thay thế tình trạng thực tế của thiết bị. Một thiết bị đang sẵn sàng vẫn có thể đã được đặt trước cho ngày khác.
