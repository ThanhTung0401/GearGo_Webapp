Hãy **thiết kế lại toàn bộ giao diện GearGo** trong file Figma hiện tại thành một website cho thuê dụng cụ cắm trại và du lịch, có prototype bấm thử được. Giao diện cũ chưa đạt yêu cầu; hãy rà soát và thiết kế lại đồng bộ các trang, điều hướng và trạng thái.

Dùng `GearGo_Dac_Ta_Nghiep_Vu.md` làm nguồn quy tắc nghiệp vụ và `ERD.docx làm nguồn cấu trúc dữ liệu. Hai file workflow còn lại là hướng dẫn quy trình tham khảo. Khi có điểm khác nhau, ưu tiên đặc tả và ERD GearGo.

Đây là **bản thiết kế và mô phỏng tương tác**, chưa cần backend, AI thật hay cổng thanh toán thật. Dùng dữ liệu mẫu nhất quán và ghi rõ các thao tác thanh toán/AI là mô phỏng. Không dừng lại ở dashboard tĩnh: các nút chính phải dẫn đến màn hình tiếp theo hoặc làm thay đổi trạng thái trong prototype. Không cần hỏi lại; tự dùng các mặc định dưới đây.

## 1. Người dùng và nguyên tắc nghiệp vụ

Thiết kế cho ba vai trò: **Khách hàng, Nhân viên, Quản trị viên**. Có nút chuyển vai trò dành riêng cho người xem prototype để kiểm tra cùng một hệ thống. Khi đổi vai trò, dữ liệu đơn thuê, sản phẩm và thiết bị phải nhất quán.

Khách hàng xem và đặt **sản phẩm cùng số lượng**. Nhân viên chọn mã thiết bị cụ thể khi chuẩn bị đơn. Không cho khách đặt mã thiết bị riêng.

Thiết bị khác rõ về chất lượng hoặc giá thuê phải thuộc **sản phẩm cho thuê riêng** nhưng có thể nằm chung một danh mục. Ví dụ: “Lều 4 người – Tiêu chuẩn” và “Lều 4 người – Tiết kiệm”. Giá thuê và tiền cọc nằm ở sản phẩm; giá nhập là thông tin nội bộ, không hiển thị cho khách.

Nếu chuyển thiết bị từ sản phẩm tiêu chuẩn sang tiết kiệm, thay đổi sản phẩm cho thuê hiện tại của thiết bị, giữ nguyên nguồn nhập ban đầu. Chặn thao tác nếu thiết bị đang thuê, đã được phân công hoặc việc chuyển làm thiếu số lượng đã cam kết cho đơn khác.

## 2. Phong cách và cấu trúc giao diện

Tạo phong cách thương hiệu GearGo gợi cảm giác **ngoài trời, đáng tin và thân thiện**, dùng xanh rừng, màu kem sáng và một màu nhấn ấm. Bố cục thoáng, chữ dễ đọc, hình ảnh cắm trại thật hoặc gần thực tế. Thiết kế responsive cho desktop và mobile.

Tạo bộ component dùng chung: thanh điều hướng, nút chính/phụ, ô nhập ngày giờ, thẻ sản phẩm, nhãn trạng thái, bộ chọn số lượng, bảng dữ liệu, thông báo, hộp xác nhận và menu vai trò. Dùng Auto Layout và component variants. Tránh trang nào cũng nhồi thẻ thống kê; ưu tiên thứ bậc thông tin rõ và thao tác dễ tìm.

## 3. Các màn hình khách hàng

### Trang chủ / landing page

Khách chưa đăng nhập vẫn xem được sản phẩm.

- Header: logo GearGo; menu “Thuê đồ”, “Danh mục”, “Cách thuê”, “Tư vấn AI”; biểu tượng giỏ; nút “Đăng nhập” và nút “Đăng ký”.
- Hero: tiêu đề ngắn giới thiệu dịch vụ thuê đồ cắm trại; nút “Khám phá sản phẩm” và “Tư vấn bộ đồ”.
- Hiển thị một thanh chọn giờ nhận và giờ trả để khách có thể kiểm tra khả dụng, nhưng cho phép khách xem danh mục sản phẩm trước khi nhập ngày.
- Các mục phía dưới: danh mục phổ biến, sản phẩm nổi bật, cách thuê gồm 3–4 bước, chính sách nhận/trả và khu vực câu hỏi thường gặp.
- Nội dung phải dễ hiểu; không đưa dashboard quản trị lên trang khách hàng.

### Đăng nhập, đăng ký và khôi phục mật khẩu

Thiết kế riêng ba màn hình, cùng phong cách thương hiệu:

- **Đăng nhập:** email hoặc số điện thoại, mật khẩu, nút hiện/ẩn mật khẩu, “Quên mật khẩu?”, “Đăng nhập”, liên kết sang đăng ký.
- **Đăng ký:** họ tên, email, số điện thoại, mật khẩu, xác nhận mật khẩu, đồng ý điều khoản, nút “Tạo tài khoản”.
- **Khôi phục mật khẩu:** nhập email hoặc số điện thoại, màn hình xác nhận đã gửi hướng dẫn và màn hình đặt mật khẩu mới.
- Có trạng thái lỗi rõ ràng cho email sai định dạng, mật khẩu không khớp, thiếu trường và tài khoản không hợp lệ. Không yêu cầu khách nhập vai trò; đăng ký công khai chỉ tạo tài khoản khách hàng.

### Danh sách và tìm kiếm sản phẩm

- Tìm theo tên; lọc theo danh mục, thương hiệu, sức chứa và khoảng giá; có sắp xếp.
- Mỗi thẻ sản phẩm có ảnh, tên, thông số chính, giá thuê/ngày, tiền cọc và đánh giá nếu có.
- Sau khi khách chọn ngày giờ nhận/trả, hiển thị số lượng còn nhận đặt trong khoảng đó **riêng cho từng sản phẩm**.
- Trước khi chọn ngày, chỉ ghi “Giá tham khảo” và không hứa còn hàng.
- Thêm bộ lọc hoặc nhãn chất lượng dễ hiểu, ví dụ “Tiêu chuẩn” và “Tiết kiệm”. Không dùng tình trạng xấu đến mức không đủ điều kiện cho thuê để tạo sản phẩm giá rẻ.

### Trang chi tiết sản phẩm

Hiển thị ảnh, tên, mô tả, thông số, tình trạng/chất lượng được cam kết, giá/ngày, mức cọc mỗi thiết bị, chính sách liên quan, ngày thuê và số lượng.

Có bộ chọn số lượng và nút “Thêm vào giỏ”. Nếu không đủ số lượng thì báo số còn nhận đặt và gợi ý đổi ngày, giảm số lượng hoặc chọn loại khác. Không hiển thị mã kho nội bộ hay giá nhập thiết bị.

Dữ liệu mẫu:

- Lều 4 người – Tiêu chuẩn: 150.000đ/chiếc/ngày; còn 2 chiếc cho khoảng ngày đã chọn.
- Lều 4 người – Tiết kiệm: 100.000đ/chiếc/ngày; còn 1 chiếc.
- Đèn cắm trại LED: 40.000đ/chiếc/ngày; còn 4 chiếc.

### Giỏ thuê và thanh toán

- Giỏ hiển thị sản phẩm, số lượng, ngày nhận/trả, số ngày tính tiền, giá thuê, tiền cọc và nút tăng/giảm/xóa.
- Cho nhập mã giảm giá mẫu `CAMPGO10`.
- Tách rõ tiền thuê, giảm giá, tiền cọc và tổng cần thanh toán ban đầu.
- Giỏ không giữ thiết bị. Khi khách tạo đơn, kiểm tra lại khả dụng.
- Trang xác nhận đơn cho khách kiểm tra người nhận, số điện thoại, giờ nhận/trả, sản phẩm và chính sách.
- Sau khi đặt, tạo trạng thái **Chờ thanh toán** và thời hạn giữ chỗ 15 phút. Có nút “Giả lập thanh toán thành công”; chỉ khi bấm nút đó mới chuyển thành **Đã xác nhận**. Nếu hết hạn, đơn chuyển **Hết hạn** và số lượng được trả lại.
- Không kết nối hoặc giả vờ kết nối cổng thanh toán thật.

### Đơn hàng, hồ sơ và đánh giá

- Trang “Đơn thuê của tôi” có tìm kiếm và lọc theo trạng thái.
- Chi tiết đơn hiển thị lịch thuê, số tiền, trạng thái, lịch sử thay đổi, thiết bị đã bàn giao/trả khi đã phát sinh.
- Cho hủy đơn theo chính sách nếu chưa bàn giao; phải hiện khoản dự kiến được hoàn/giữ lại trước khi xác nhận.
- Chỉ cho gửi đánh giá khi đơn hoàn tất; gắn đánh giá với sản phẩm khách thực sự thuê.
- Trang hồ sơ cho sửa thông tin cá nhân và đăng xuất.

### Tư vấn AI

Tạo trang hoặc hộp chat tư vấn mẫu để khách nhập điểm đến, số người, lịch trình và nhu cầu. Hiện câu trả lời demo đề xuất sản phẩm, số lượng, lý do và chi phí dự kiến; có nút đưa lựa chọn vào giỏ. Ghi rõ đây là tư vấn mô phỏng. AI không tự tạo đơn, giữ chỗ hay quyết định khả dụng.

## 4. Các màn hình nhân viên

Tạo khu vực riêng sau khi chuyển vai trò, với menu: Tổng quan, Đơn thuê, Chuẩn bị và bàn giao, Nhận trả, Thiết bị.

### Tổng quan và danh sách đơn

Hiện các đơn cần chuẩn bị, sắp nhận, đang thuê, quá hạn, chờ đối soát. Có tìm kiếm theo mã đơn, tên hoặc số điện thoại và lọc trạng thái. Khi mở đơn, thấy sản phẩm, số lượng, lịch thuê và thông tin cần xử lý.

### Chuẩn bị và bàn giao

Cho nhân viên chọn từng mã thiết bị sẵn sàng, đúng sản phẩm khách đã đặt, đủ số lượng và không trùng lịch. Hiện tình trạng và phụ kiện trước thuê. Có thể đổi thiết bị trong lúc chuẩn bị nếu chiếc đã chọn không đạt, nhưng phải vẫn cùng sản phẩm và đủ số lượng.

Khi nhân viên xác nhận bàn giao đủ, tạo phiếu bàn giao, lưu các mã thiết bị và chuyển đơn sang **Đang thuê**. Trước khi chốt, hiện bước xác nhận đối chiếu với khách.

### Nhận trả và phụ phí

Cho nhân viên nhận từng thiết bị theo mã. Có thể trả một phần: nếu khách đặt 2 lều và mới trả 1, đơn vẫn **Đang thuê**, hiển thị chiếc còn thiếu và tiếp tục theo dõi quá hạn nếu cần.

Cho chọn kết luận bình thường, cần vệ sinh, hỏng nhẹ, hỏng nặng, thiếu phụ kiện hoặc mất thiết bị; thêm ghi chú và ảnh minh chứng mẫu. Tạo phụ phí đề xuất, ghi lý do và trạng thái duyệt. Không cho tính phí hư hỏng do hao mòn thông thường; phí chưa được duyệt không cộng vào đối soát.

Khi đủ thiết bị đã trả hoặc có kết luận mất hợp lệ, chuyển đơn sang **Chờ đối soát**. Hiện cọc đã thu, phụ phí đã duyệt, số tiền hoàn hoặc thu thêm. Có nút giả lập hoàn tiền/thu thêm; chỉ sau khi giải quyết xong mới chuyển **Hoàn tất**.

### Quản lý thiết bị

Bảng thiết bị có mã, sản phẩm cho thuê hiện tại, nguồn nhập ban đầu, ngày nhập, tình trạng, trạng thái sử dụng và lịch phân công. Có bộ lọc theo sản phẩm và trạng thái. Không để lẫn giá nhập với giá thuê khách hàng nhìn thấy.

## 5. Các màn hình quản trị viên

Tạo khu vực quản trị với menu: Tổng quan, Danh mục, Sản phẩm, Thiết bị, Phiếu nhập, Nhà cung cấp, Khuyến mãi, Báo cáo.

- **Danh mục và sản phẩm:** CRUD phù hợp, trạng thái kinh doanh, ảnh, thông số, giá/ngày, mức cọc và giá trị bồi thường. Ví dụ hai sản phẩm lều có thể cùng thuộc danh mục “Lều” nhưng khác chất lượng và giá.
- **Chuyển loại thiết bị:** tìm thiết bị theo mã; hiển thị sản phẩm hiện tại và nguồn nhập; chọn sản phẩm cho thuê mới; nhập lý do; xem ảnh hưởng đến khả dụng; kiểm tra đơn đang thuê/đã giữ chỗ/đã phân công; yêu cầu xác nhận. Cập nhật số lượng của hai sản phẩm trên giao diện khách sau khi chuyển. Giữ nguyên chứng từ nhập ban đầu.
- **Phiếu nhập:** lập nháp, thêm sản phẩm/số lượng/đơn giá nhập, nhập mã thiết bị; chỉ khi quản trị viên xác nhận phiếu mới tăng kho. Hiển thị trạng thái Nháp, Đã nhập kho, Đã hủy.
- **Nhà cung cấp:** danh sách, chi tiết và lịch sử phiếu nhập.
- **Khuyến mãi:** mã, phạm vi, thời gian, giới hạn lượt và số lượt đã dùng.
- **Báo cáo:** đơn thuê, doanh thu tiền thuê, phụ phí được duyệt, tiền cọc đang giữ và hoàn tiền phải trình bày tách biệt. Cọc đang giữ không được tính là doanh thu.

## 6. Prototype tương tác phải có

Tạo liên kết prototype cho luồng sau và đảm bảo ba vai trò xem chung dữ liệu:

1. Khách xem sản phẩm trước, chọn ngày nhận/trả và xem lượng còn của hai loại lều.
2. Đặt 2 lều tiêu chuẩn; giỏ và tổng tiền cập nhật.
3. Tạo đơn Chờ thanh toán, giả lập thanh toán và thấy đơn Đã xác nhận.
4. Chuyển sang Nhân viên, thấy đúng đơn đó, gán hai mã lều và bàn giao.
5. Nhận trả một chiếc; đơn vẫn Đang thuê và còn một chiếc chưa trả.
6. Nhận chiếc còn lại, thêm phụ phí mẫu, duyệt phí, đối soát và giả lập hoàn cọc.
7. Chuyển sang Quản trị viên, chuyển một lều đủ điều kiện từ tiêu chuẩn sang tiết kiệm; trở lại danh sách khách và thấy lượng còn mỗi loại cập nhật.
8. Có thao tác đặt lại dữ liệu demo để chạy lại kịch bản.

Trong mỗi bước, hiện trạng thái trước và sau thao tác cùng một lời giải thích ngắn về thay đổi tiền, đơn hoặc số lượng. Các trạng thái nên dùng tên tiếng Việt thống nhất: **Chờ thanh toán, Đã xác nhận, Đang chuẩn bị, Sẵn sàng nhận, Đang thuê, Đã nhận trả, Chờ đối soát, Hoàn tất, Hết hạn, Khách hủy, Cửa hàng hủy**.

## 7. Bàn giao thiết kế

Tạo đầy đủ frame desktop và mobile cho các màn hình chính; đặt tên frame theo vai trò và chức năng. Dùng component tái sử dụng và nối prototype từ trang chủ đến đặt hàng, vận hành, trả hàng và quản trị. Rà soát các trạng thái rỗng, lỗi, đang tải, thành công và hết hàng; không để nút quan trọng bị bỏ trống hoặc dẫn sai trang.