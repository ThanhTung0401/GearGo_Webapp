# GearGo — Đặc tả Chi tiết 10 Phân hệ Nghiệp vụ Use Case (UC1.1 - UC10.4)

> **Tài liệu chuẩn hóa nghiệp vụ hệ thống GearGo (102 Use Cases)**  
> Đối chiếu và hiện thực hóa tương ứng 71 Sequence Diagram và hệ thống UI/UX Impeccable.
> Bản đặc tả đầy đủ 100% không rút gọn: Tác nhân, Tóm tắt, Dòng sự kiện chính/phụ, Tiền/Hậu điều kiện, Quy tắc nghiệp vụ và Quan hệ UML.

---

## PHÂN HỆ 1: QUẢN LÝ TÀI KHOẢN VÀ NHÂN VIÊN
*Đăng ký, xác thực, phân quyền và quản trị người dùng.*

### UC1.1 – Đăng ký tài khoản

- **Use Case ID:** `UC1.1`
- **Tên Use Case:** Đăng ký tài khoản
- **Tác nhân:** Khách vãng lai
- **Tóm tắt:** Tạo tài khoản khách hàng để sử dụng các chức năng đặt thuê và theo dõi giao dịch.
- **Dòng sự kiện chính:**
  1. Mở đăng ký. Hệ thống hiển thị biểu mẫu và trường bắt buộc.
  2. Nhập thông tin cá nhân. Hệ thống giữ dữ liệu đang nhập; hiển thị hướng dẫn xác thực.
  3. Nhập mật khẩu và gửi đăng ký. Hệ thống kiểm tra tính hợp lệ và thông tin định danh duy nhất.
  4. Chờ kết quả. Hệ thống tạo tài khoản vai trò khách hàng và hồ sơ tương ứng trong cùng lần ghi nhận.
  5. Chọn đăng nhập sau khi thành công. Hệ thống hiển thị kết quả; chuyển đến UC1.2, không tự cấp quyền nội bộ.
- **Dòng sự kiện phụ:**
  - 3.1. Thông tin sai hoặc mật khẩu không khớp.
    - 3.1.1. Báo lỗi tại trường; giữ dữ liệu không nhạy cảm và quay lại bước 2.
  - 4.1. Một yêu cầu khác vừa đăng ký cùng email.
    - 4.1.1. Từ chối tạo trùng; không để hồ sơ mồ côi; khách đổi thông tin.
  - 4.2. Lỗi lưu dữ liệu.
    - 4.2.1. Không công bố tài khoản thành công; khôi phục toàn bộ lần tạo để thử lại an toàn.
- **Tiền điều kiện:** Khách chưa có tài khoản với email hoặc số điện thoại đăng ký.
- **Hậu điều kiện:** Tài khoản, hồ sơ khách hàng; kết quả đăng ký. Không ghi mật khẩu rõ vào nhật ký. Tài khoản khách hàng và hồ sơ được tạo đầy đủ; nếu thất bại thì không để hồ sơ hoặc tài khoản dở dang.
- **Quy tắc liên quan:** Đăng ký công khai không cấp vai trò nhân viên hoặc quản trị viên.

---

### UC1.2 – Đăng nhập

- **Use Case ID:** `UC1.2`
- **Tên Use Case:** Đăng nhập
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Xác thực tài khoản và mở phiên truy cập đúng vai trò được cấp.
- **Dòng sự kiện chính:**
  1. Mở trang đăng nhập. Hệ thống hiển thị trường xác thực và liên kết khôi phục.
  2. Nhập thông tin và gửi. Hệ thống kiểm tra giới hạn thử sai và trạng thái tài khoản.
  3. Chờ xác thực. Hệ thống đối chiếu mật khẩu với dữ liệu bảo vệ đã lưu.
  4. Chờ chuyển trang. Hệ thống tạo phiên gắn với người dùng và quyền hiện hành.
  5. Mở chức năng được phép. Hệ thống hiển thị khu vực khách hàng, nhân viên hoặc quản trị theo quyền.
- **Dòng sự kiện phụ:**
  - 2.1. Sai tài khoản hoặc mật khẩu.
    - 2.1.1. Không tạo phiên; ghi số lần thất bại và phản hồi không tiết lộ mật khẩu.
  - 2.2. Tài khoản khóa hoặc vượt giới hạn thử sai.
    - 2.2.1. Từ chối đăng nhập theo chính sách; không bỏ qua vì mật khẩu đúng.
  - 5.1. Mở đường dẫn ngoài quyền.
    - 5.1.1. Từ chối tại hệ thống dù người dùng nhập URL trực tiếp.
- **Tiền điều kiện:** Tài khoản đã tồn tại, chưa có phiên đăng nhập hợp lệ cho lần truy cập này.
- **Hậu điều kiện:** Phiên đăng nhập và thông tin vai trò; dấu vết đăng nhập cần thiết. Người dùng có phiên truy cập hợp lệ; thất bại thì không được cấp phiên.
- **Quy tắc liên quan:** Các vai trò trên sơ đồ thể hiện loại người dùng; đăng nhập không yêu cầu đã có phiên từ trước.
- **Quan hệ UML:** UC1.2 «include» → UC1.2.1

---

### UC1.3 – Đăng xuất

- **Use Case ID:** `UC1.3`
- **Tên Use Case:** Đăng xuất
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Kết thúc phiên truy cập hiện tại để người khác không tiếp tục sử dụng phiên đó.
- **Dòng sự kiện chính:**
  1. Chọn đăng xuất. Hệ thống tiếp nhận yêu cầu kết thúc phiên hiện tại.
  2. Chờ xử lý. Hệ thống vô hiệu phiên và thông tin truy cập tương ứng.
  3. Xem màn hình sau đăng xuất. Hệ thống chuyển về khu vực công khai.
  4. Mở lại chức năng riêng nếu cần. Hệ thống yêu cầu đăng nhập mới trước khi trả dữ liệu bảo vệ.
- **Dòng sự kiện phụ:**
  - 2.1. Phiên đã hết hạn.
    - 2.1.1. Xem như đã đăng xuất, đưa về trang công khai.
  - 4.1. Dùng nút quay lại hoặc gọi lại yêu cầu cũ.
    - 4.1.1. Kiểm tra phiên; không cho đọc hoặc sửa dữ liệu riêng.
  - 2.2. Mất kết nối trước khi biết kết quả.
    - 2.2.1. Hiển thị lỗi kết nối; kiểm tra lại trạng thái phiên khi kết nối phục hồi.
- **Tiền điều kiện:** Người dùng đang có phiên đăng nhập.
- **Hậu điều kiện:** Phiên hiện tại không còn hiệu lực; dữ liệu nghiệp vụ được giữ. Phiên hiện tại kết thúc; đơn thuê và giao dịch đang xử lý vẫn được giữ nguyên.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR01 BR02 BR05.

---

### UC1.4 – Khôi phục mật khẩu

- **Use Case ID:** `UC1.4`
- **Tên Use Case:** Khôi phục mật khẩu
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Cho chủ tài khoản lấy lại quyền truy cập sau khi xác minh qua kênh đã đăng ký.
- **Dòng sự kiện chính:**
  1. Chọn quên mật khẩu, nhập kênh liên hệ. Hệ thống tiếp nhận yêu cầu và kiểm soát số lần yêu cầu.
  2. Gửi yêu cầu khôi phục. Hệ thống tạo mã có hạn, gửi qua kênh xác minh phù hợp.
  3. Mở liên kết hoặc nhập mã nhận được. Hệ thống kiểm tra tính hợp lệ của yêu cầu.
  4. Nhập và xác nhận mật khẩu mới. Hệ thống kiểm tra mật khẩu và quyền sở hữu yêu cầu một lần nữa.
  5. Xác nhận đổi mật khẩu. Hệ thống lưu mật khẩu mới dạng băm và vô hiệu mã vừa dùng.
  6. Đăng nhập lại. Hệ thống xử lý bằng UC1.2 với mật khẩu mới.
- **Dòng sự kiện phụ:**
  - 2.1. Không có tài khoản hoặc không gửi được mã.
    - 2.1.1. Không đổi mật khẩu; phản hồi trung tính, cho yêu cầu lại có giới hạn.
  - 3.1. Mã sai, hết hạn hoặc đã dùng.
    - 3.1.1. Từ chối thay đổi; cần tạo yêu cầu khôi phục mới.
  - 4.1. Mật khẩu không đạt hoặc xác nhận không khớp.
    - 4.1.1. Giữ yêu cầu còn hạn, cho nhập lại.
  - 5.1. Gửi lặp cùng mã.
    - 5.1.1. Chỉ lần đầu hợp lệ được thay đổi mật khẩu.
- **Tiền điều kiện:** Người dùng có tài khoản và có thể xác minh quyền sở hữu qua kênh đã đăng ký.
- **Hậu điều kiện:** Mật khẩu mới đã được bảo vệ; yêu cầu khôi phục mất hiệu lực sau sử dụng. Mật khẩu được thay đổi khi xác minh thành công; mã đã dùng không thể dùng lại.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR01 BR02 BR22.
- **Quan hệ UML:** UC1.4 «include» → UC1.4.1

---

### UC1.5 – Xem thông tin cá nhân

- **Use Case ID:** `UC1.5`
- **Tên Use Case:** Xem thông tin cá nhân
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Cho phép người dùng xem hồ sơ của mình.
- **Dòng sự kiện chính:**
  1. Người dùng chọn hồ sơ cá nhân.
  2. Hệ thống xác định tài khoản đang đăng nhập và hiển thị họ tên, thông tin liên hệ.
  3. Người dùng xem thông tin; có thể chọn cập nhật hồ sơ.
- **Dòng sự kiện phụ:**
  - 2.1. Phiên hết hạn.
    - 2.1.1. Yêu cầu đăng nhập lại; chưa cung cấp dữ liệu hồ sơ.
  - 2.2. Yêu cầu hồ sơ của người khác.
    - 2.2.1. Từ chối truy cập; kết thúc Use Case.
- **Tiền điều kiện:** Người dùng đã đăng nhập.
- **Hậu điều kiện:** Người dùng xem được hồ sơ thuộc quyền của mình; dữ liệu không thay đổi.

---

### UC1.6 – Cập nhật thông tin cá nhân

- **Use Case ID:** `UC1.6`
- **Tên Use Case:** Cập nhật thông tin cá nhân
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Cho phép người dùng sửa thông tin cá nhân và liên hệ.
- **Dòng sự kiện chính:**
  1. Người dùng chọn chỉnh sửa hồ sơ.
  2. Hệ thống hiển thị các trường thông tin được phép thay đổi. Hệ thống chỉ cho sửa họ tên, thông tin liên hệ và địa chỉ thuộc hồ sơ của người đang đăng nhập; vai trò, quyền và trạng thái làm việc không được tự thay đổi. Thông tin đã chốt trên chứng từ cũ được giữ nguyên.
  3. Người dùng cập nhật thông tin và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu bắt buộc, định dạng và thông tin liên hệ trùng.
  5. Hệ thống lưu thông tin mới, hiển thị kết quả cập nhật.
- **Dòng sự kiện phụ:**
  - 3.1. Người dùng hủy chỉnh sửa.
    - 3.1.1. Giữ thông tin cũ; kết thúc Use Case.
  - 4.1. Dữ liệu thiếu, sai định dạng hoặc trùng tài khoản khác.
    - 4.1.1. Thông báo trường cần sửa; quay lại bước 3.
  - 5.1. Lưu không thành công.
    - 5.1.1. Thông báo lỗi và giữ dữ liệu nhập để người dùng thử lại; chưa ghi nhận cập nhật thành công.
  - 4.2. Thay email hoặc số điện thoại dùng để đăng nhập/khôi phục. Hệ thống yêu cầu xác minh thông tin mới; chỉ thay thông tin xác thực sau khi xác minh thành công.
  - 4.3. Yêu cầu sửa vai trò, quyền hoặc trạng thái làm việc. Hệ thống từ chối các trường ngoài quyền tự cập nhật.
- **Tiền điều kiện:** Người dùng đã đăng nhập và mở hồ sơ của mình.
- **Hậu điều kiện:** Hồ sơ được cập nhật khi thành công; dữ liệu trên chứng từ đã chốt được giữ nguyên.

---

### UC1.7 – Tạo tài khoản nhân viên

- **Use Case ID:** `UC1.7`
- **Tên Use Case:** Tạo tài khoản nhân viên
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên bổ sung nhân viên sử dụng hệ thống.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn thêm nhân viên.
  2. Hệ thống hiển thị biểu mẫu thông tin nhân viên và tài khoản.
  3. Quản trị viên nhập họ tên, thông tin liên hệ, thông tin tài khoản và quyền được phép cấp; chọn lưu.
  4. Hệ thống kiểm tra thông tin bắt buộc, định dạng và tài khoản trùng.
  5. Hệ thống tạo hồ sơ, tài khoản tương ứng và ghi nhật ký.
  6. Hệ thống thông báo thành công, hiển thị nhân viên trong danh sách.
- **Dòng sự kiện phụ:**
  - 3.1. Quản trị viên hủy thao tác.
    - 3.1.1. Không tạo nhân viên; kết thúc Use Case.
  - 4.1. Thông tin không hợp lệ hoặc trùng tài khoản.
    - 4.1.1. Chỉ rõ lỗi; quay lại bước 3.
  - 4.2. Quyền được chọn vượt thẩm quyền người cấp.
    - 4.2.1. Từ chối cấp quyền; yêu cầu chọn lại ở bước 3.
  - 5.1. Không lưu được đầy đủ hồ sơ và tài khoản.
    - 5.1.1. Hủy phần ghi dở dang; thông báo chưa tạo thành công.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý nhân viên.
- **Hậu điều kiện:** Hồ sơ nhân viên và tài khoản được tạo đầy đủ khi thành công; thất bại không để dữ liệu dở dang.
- **Quan hệ UML:** UC1.7 «include» → UC1.7.1

---

### UC1.8 – Cập nhật thông tin nhân viên

- **Use Case ID:** `UC1.8`
- **Tên Use Case:** Cập nhật thông tin nhân viên
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên sửa hồ sơ nhân viên.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn nhân viên cần cập nhật.
  2. Hệ thống hiển thị thông tin hiện tại và các trường được phép sửa.
  3. Quản trị viên cập nhật thông tin và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu, quyền sửa và thông tin liên hệ trùng.
  5. Hệ thống lưu thay đổi, ghi nhật ký và hiển thị hồ sơ mới.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy chỉnh sửa.
    - 3.1.1. Giữ hồ sơ cũ; kết thúc Use Case.
  - 4.1. Dữ liệu không hợp lệ hoặc bị trùng.
    - 4.1.1. Thông báo lỗi; quay lại bước 3.
  - 4.2. Hồ sơ đã được người khác cập nhật.
    - 4.2.1. Hiển thị dữ liệu mới nhất, yêu cầu kiểm tra lại trước khi lưu.
- **Tiền điều kiện:** Quản trị viên có quyền quản lý nhân viên; hồ sơ cần sửa tồn tại.
- **Hậu điều kiện:** Hồ sơ được cập nhật; thông tin người lập và người duyệt trên chứng từ cũ vẫn được truy vết.

---

### UC1.9 – Tra cứu nhân viên

- **Use Case ID:** `UC1.9`
- **Tên Use Case:** Tra cứu nhân viên
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tìm và xem thông tin nhân viên.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở danh sách nhân viên.
  2. Hệ thống hiển thị danh sách và các tiêu chí tìm kiếm.
  3. Quản trị viên nhập từ khóa hoặc chọn bộ lọc.
  4. Hệ thống hiển thị kết quả phù hợp.
  5. Quản trị viên chọn nhân viên; hệ thống hiển thị hồ sơ, tài khoản và quyền hiện tại.
- **Dòng sự kiện phụ:**
  - 4.1. Không có nhân viên phù hợp.
    - 4.1.1. Hiển thị danh sách rỗng; cho phép đổi điều kiện tại bước 3.
  - 5.1. Hồ sơ không còn truy cập được.
    - 5.1.1. Thông báo và quay về danh sách.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền xem nhân viên.
- **Hậu điều kiện:** Thông tin nhân viên được cung cấp đúng quyền; không thay đổi dữ liệu.

---

### UC1.10 – Phân quyền nhân viên

- **Use Case ID:** `UC1.10`
- **Tên Use Case:** Phân quyền nhân viên
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên xác định phạm vi chức năng nhân viên được sử dụng.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn nhân viên và mở phần phân quyền.
  2. Hệ thống hiển thị quyền hiện tại và các quyền người thao tác được phép cấp.
  3. Quản trị viên chọn quyền mới và xác nhận.
  4. Hệ thống kiểm tra thẩm quyền, cập nhật quyền và ghi người thực hiện, thời điểm.
  5. Hệ thống thông báo kết quả; áp dụng quyền mới khi kiểm tra truy cập.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy thay đổi.
    - 3.1.1. Giữ bộ quyền hiện tại; kết thúc Use Case.
  - 4.1. Cấp quyền vượt thẩm quyền hoặc phiên không còn hợp lệ.
    - 4.1.1. Từ chối cập nhật; không thay đổi quyền.
  - 4.2. Lưu thất bại.
    - 4.2.1. Giữ bộ quyền cũ và thông báo chưa cập nhật.
- **Tiền điều kiện:** Người thao tác có quyền phân quyền; tài khoản nhân viên tồn tại.
- **Hậu điều kiện:** Quyền được cập nhật có kiểm soát; nhân viên không thể tự cấp thêm quyền.

---

### UC1.11 – Khóa và mở khóa tài khoản

- **Use Case ID:** `UC1.11`
- **Tên Use Case:** Khóa và mở khóa tài khoản
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Kiểm soát trạng thái truy cập tài khoản mà vẫn bảo toàn các nghĩa vụ đang có.
- **Dòng sự kiện chính:**
  1. Tìm tài khoản. Hệ thống hiển thị danh sách phù hợp trong phạm vi quản trị.
  2. Chọn tài khoản cần xử lý. Hệ thống hiển thị trạng thái và cảnh báo giao dịch đang có.
  3. Chọn khóa hoặc mở khóa, nhập lý do. Hệ thống kiểm tra quyền và tính hợp lệ của thao tác.
  4. Xác nhận quyết định. Hệ thống đổi trạng thái và áp dụng quyền truy cập mới.
  5. Xem kết quả. Hệ thống lưu nhật ký; giữ đơn thuê, chứng từ và khoản tiền đang xử lý.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy xác nhận.
    - 3.1.1. Giữ trạng thái cũ.
  - 4.1. Tài khoản đã có trạng thái đích.
    - 4.1.1. Trả hiện trạng, không tạo thay đổi lặp.
  - 4.2. Tài khoản bị khóa nhưng còn đơn đang thuê.
    - 4.2.1. Cửa hàng tiếp tục giao nhận và quyết toán theo quyền; không xóa nghĩa vụ.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập; tài khoản cần xử lý tồn tại.
- **Hậu điều kiện:** Trạng thái tài khoản và lịch sử xử lý; không phát sinh giao dịch thuê mới cho tài khoản khóa. Trạng thái truy cập được cập nhật; đơn đang thuê và nghĩa vụ tài chính của khách vẫn được cửa hàng xử lý.
- **Quy tắc liên quan:** Khóa tài khoản không xóa lịch sử và không làm phát sinh giao dịch mới cho tài khoản bị khóa.

---

### UC1.12 – Đổi mật khẩu

- **Use Case ID:** `UC1.12`
- **Tên Use Case:** Đổi mật khẩu
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Đổi mật khẩu trong phạm vi quyền của người sử dụng.
- **Dòng sự kiện chính:**
  1. Người dùng mở đổi mật khẩu, nhập mật khẩu hiện tại và mật khẩu mới hai lần.
  2. Hệ thống xác minh mật khẩu hiện tại và kiểm tra yêu cầu mật khẩu mới.
  3. Người dùng xác nhận; hệ thống lưu mật khẩu được bảo vệ, không ghi mật khẩu vào nhật ký.
  4. Hệ thống thông báo thành công, yêu cầu đăng nhập lại bằng mật khẩu mới.
- **Dòng sự kiện phụ:**
  - 2.1. Mật khẩu hiện tại sai: từ chối, giới hạn thử sai; cho nhập lại.
  - 2.2. Mật khẩu mới không đạt hoặc xác nhận không khớp: nêu trường sai, chưa thay mật khẩu.
  - 3.1. Lỗi lưu hoặc người dùng hủy: giữ mật khẩu cũ.
- **Tiền điều kiện:** Người dùng đã đăng nhập và tài khoản hoạt động.
- **Hậu điều kiện:** Mật khẩu được đổi khi thành công; hồ sơ và quyền không thay đổi.

---

### UC1.13 – Tra cứu tài khoản khách hàng

- **Use Case ID:** `UC1.13`
- **Tên Use Case:** Tra cứu tài khoản khách hàng
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Tra cứu tài khoản khách hàng trong phạm vi quyền của người sử dụng.
- **Dòng sự kiện chính:**
  1. Quản trị viên tìm theo tên, email, số điện thoại hoặc trạng thái tài khoản.
  2. Hệ thống trả danh sách đúng bộ lọc, không hiển thị mật khẩu.
  3. Quản trị viên mở hồ sơ, xem thông tin liên hệ, trạng thái và đơn/nghĩa vụ liên quan trong quyền.
  4. Nếu cần khóa/mở khóa, chuyển UC1.11; tra cứu không tự thay dữ liệu.
- **Dòng sự kiện phụ:**
  - 2.1. Không có kết quả: hiển thị rỗng, cho đổi bộ lọc.
  - 3.1. Không đủ quyền: từ chối phần dữ liệu hạn chế.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý tài khoản khách hàng.
- **Hậu điều kiện:** Tài khoản được tra cứu; không sửa hồ sơ, quyền hoặc chứng từ.

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 1
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC1.2.1 – Xác thực tài khoản

- **Use Case ID:** `UC1.2.1`
- **Tên Use Case:** Xác thực tài khoản
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC1.2.
- **Dòng sự kiện chính:**
  1. Hệ thống nhận thông tin đăng nhập.
  2. Kiểm tra trạng thái tài khoản, giới hạn thử sai và đối chiếu mật khẩu.
  3. Trả kết quả xác thực cho UC1.2.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC1.2; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Có kết quả xác thực; chỉ tài khoản hợp lệ được tiếp tục tạo phiên.

---

### UC1.4.1 – Gửi mã xác minh khôi phục

- **Use Case ID:** `UC1.4.1`
- **Tên Use Case:** Gửi mã xác minh khôi phục
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC1.4.
- **Dòng sự kiện chính:**
  1. Tiếp nhận kênh liên hệ đã đăng ký.
  2. Tạo mã xác minh có thời hạn và giới hạn số lần yêu cầu.
  3. Gửi mã hoặc liên kết qua kênh xác minh.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC1.4; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Yêu cầu khôi phục và mã có hạn được ghi nhận; mật khẩu chưa thay đổi.

---

### UC1.7.1 – Gán quyền ban đầu cho nhân viên

- **Use Case ID:** `UC1.7.1`
- **Tên Use Case:** Gán quyền ban đầu cho nhân viên
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC1.7.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn quyền ban đầu trong phạm vi được cấp.
  2. Hệ thống kiểm tra quyền được chọn.
  3. Ghi quyền cùng lần tạo tài khoản nhân viên.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC1.7; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Tài khoản mới nhận đúng quyền ban đầu; không cấp vượt thẩm quyền.

---

## PHÂN HỆ 2: TRA CỨU VÀ TƯ VẤN DỤNG CỤ
*Khám phá sản phẩm, kiểm tra khả dụng tồn kho và trợ lý tư vấn AI.*

### UC2.1 – Tìm kiếm và lọc sản phẩm

- **Use Case ID:** `UC2.1`
- **Tên Use Case:** Tìm kiếm và lọc sản phẩm
- **Tác nhân:** Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Giúp người dùng tìm dụng cụ phù hợp.
- **Dòng sự kiện chính:**
  1. Người dùng mở danh sách sản phẩm.
  2. Hệ thống hiển thị sản phẩm đang công bố và các bộ lọc.
  3. Người dùng nhập tên, chọn danh mục hoặc tiêu chí lọc.
  4. Hệ thống kiểm tra tiêu chí và hiển thị sản phẩm phù hợp cùng giá tham khảo.
  5. Người dùng chọn sản phẩm để xem chi tiết.
- **Dòng sự kiện phụ:**
  - 4.1. Không có kết quả.
    - 4.1.1. Thông báo danh sách rỗng; quay lại bước 3 để đổi tiêu chí.
  - 4.2. Tiêu chí không hợp lệ.
    - 4.2.1. Thông báo điều kiện cần sửa; quay lại bước 3.
- **Tiền điều kiện:** Người dùng truy cập danh mục sản phẩm.
- **Hậu điều kiện:** Danh sách sản phẩm phù hợp được hiển thị; chưa giữ chỗ hoặc tạo đơn.
- **Quy tắc liên quan:** Chưa chọn lịch thuê thì không khẳng định khả dụng.

---

### UC2.2 – Xem chi tiết sản phẩm

- **Use Case ID:** `UC2.2`
- **Tên Use Case:** Xem chi tiết sản phẩm
- **Tác nhân:** Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Cung cấp thông tin để người dùng lựa chọn dụng cụ.
- **Dòng sự kiện chính:**
  1. Người dùng chọn sản phẩm.
  2. Hệ thống hiển thị hình ảnh, thông số, phụ kiện, giá thuê, tiền cọc, chính sách và đánh giá đã công bố.
  3. Người dùng xem thông tin và có thể chọn kiểm tra khả dụng theo lịch thuê.
  - Nếu chưa chọn giờ nhận/trả, hệ thống chỉ hiển thị giá tham khảo và yêu cầu chọn lịch để biết khả dụng; không cam kết giữ đồ.
- **Dòng sự kiện phụ:**
  - 2.1. Sản phẩm không còn công khai.
    - 2.1.1. Thông báo không thể xem hoặc ngừng nhận đơn; không cho đặt mới.
  - 2.2. Không tải được nội dung.
    - 2.2.1. Thông báo lỗi và cho phép thử lại; không hiển thị thông tin giả định.
- **Tiền điều kiện:** Sản phẩm được xác định và người dùng có quyền xem.
- **Hậu điều kiện:** Người dùng xem được thông tin sản phẩm; chưa phát sinh đơn thuê.
- **Quan hệ UML:** UC2.3 «extend» → UC2.2 tại EP2.2-LICH khi người dùng chọn lịch thuê để kiểm tra

---

### UC2.3 – Kiểm tra khả dụng

- **Use Case ID:** `UC2.3`
- **Tên Use Case:** Kiểm tra khả dụng
- **Tác nhân:** Khách vãng lai, Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Xác định có đủ thiết bị của sản phẩm để phục vụ xuyên suốt khoảng thuê được hỏi hay không.
- **Dòng sự kiện chính:**
  1. Nhập sản phẩm, số lượng và lịch thuê. Hệ thống kiểm tra điều kiện thời gian và sản phẩm.
  2. Yêu cầu kiểm tra. Hệ thống xác định các vật phẩm có thể phục vụ khoảng thuê.
  3. Hệ thống đối chiếu các cam kết chồng lịch; không trừ hai lần giữ chỗ và phân công của cùng một đơn.
  4. Hệ thống loại thiết bị bảo trì, thất lạc, ngừng sử dụng và thiết bị quá hạn chưa giải quyết.
  5. Xem số lượng có thể thuê. Hệ thống trả kết luận đủ hoặc thiếu cho toàn bộ khoảng thuê và thời điểm kiểm tra.
  6. Điều chỉnh yêu cầu nếu cần. Hệ thống cho đổi lịch hoặc số lượng; chưa ghi giữ chỗ.
- **Dòng sự kiện phụ:**
  - 1.1. Nhận không trước trả hoặc số lượng sai.
    - 1.1.1. Không tính; yêu cầu sửa dữ liệu.
  - 5.1. Không đủ số lượng.
    - 5.1.1. Trả số tối đa hiện có; không tự thay ngày hoặc sản phẩm.
  - 3.1. Dữ liệu thay đổi ngay sau kiểm tra.
    - 3.1.1. Kết quả chỉ tham khảo; UC3.2 phải kiểm tra lại khi tạo giữ chỗ.
  - Không đủ lượng xuyên suốt lịch thuê: hiển thị số lượng còn nhận đặt và gợi ý giảm số lượng, đổi lịch hoặc sản phẩm; không tự thay lựa chọn của khách.
- **Tiền điều kiện:** Sản phẩm và số lượng cần kiểm tra được xác định.
- **Hậu điều kiện:** Kết quả khả dụng theo thời điểm và lịch được hỏi; không thay đổi tồn kho. Có kết quả khả dụng tại thời điểm kiểm tra; riêng thao tác này không giữ chỗ.
- **Quy tắc liên quan:** Giữ chỗ và phân công cho cùng một lượng thuê không được trừ hai lần. Tạo đơn phải kiểm tra lại và giữ chỗ nhất quán.
- **Quan hệ UML:** UC3.1 «include» → UC2.3; UC3.2 «include» → UC2.3; UC2.3 «extend» → UC2.2 tại EP2.2-LICH khi người dùng chọn lịch thuê để kiểm tra

---

### UC2.4 – Nhận tư vấn bộ dụng cụ bằng AI

- **Use Case ID:** `UC2.4`
- **Tên Use Case:** Nhận tư vấn bộ dụng cụ bằng AI
- **Tác nhân:** Khách vãng lai, Khách hàng, Dịch vụ AI
- **Tóm tắt:** Đề xuất bộ dụng cụ phù hợp chuyến đi dựa trên sản phẩm cửa hàng thực sự kinh doanh.
- **Dòng sự kiện chính:**
  1. Nhập nhu cầu tư vấn. Hệ thống kiểm tra dữ liệu và xác định sản phẩm có thể đề xuất.
  2. Gửi yêu cầu tư vấn. Hệ thống chuyển thông tin cần thiết và danh mục phù hợp tới dịch vụ AI.
  3. Chờ gợi ý. Hệ thống nhận danh sách sản phẩm, số lượng và lý do chọn.
  4. Xem bộ đồ đề xuất. Hệ thống GearGo đối chiếu sản phẩm, giá và khả dụng; loại hoặc đánh dấu đề xuất không hợp lệ.
  5. Chỉnh bộ đồ theo nhu cầu. Hệ thống cập nhật ước tính tiền thuê, cọc và tổng cần chuẩn bị.
  6. Chọn thêm vào giỏ. Hệ thống yêu cầu đăng nhập nếu cần; chuyển lựa chọn sang UC3.1, chưa tạo đơn.
  - Báo giá gợi ý trình bày tiền thuê, giảm dự kiến, tiền cọc và tổng cần chuẩn bị riêng; GearGo đối chiếu sản phẩm đang kinh doanh và khả dụng theo lịch trước khi đưa lựa chọn vào giỏ.
- **Dòng sự kiện phụ:**
  - 2.1. Dịch vụ AI lỗi hoặc quá thời gian.
    - 2.1.1. Thông báo chưa tư vấn được; cho tìm sản phẩm hoặc chọn bộ có sẵn.
  - 4.1. AI đề xuất sản phẩm không bán hoặc đã hết lịch.
    - 4.1.1. Không cho đưa đề xuất sai vào giỏ như hàng khả dụng; yêu cầu chọn lại.
  - 4.2. Chưa có lịch cụ thể.
    - 4.2.1. Hiển thị tham khảo, không cam kết giá cuối cùng hay tồn.
  - Gợi ý có sản phẩm không kinh doanh, số lượng không hợp lệ hoặc thiếu khả dụng: loại dòng sai, nêu lý do và cho chọn lại.
  - Khách vãng lai muốn thêm bộ gợi ý vào giỏ: yêu cầu đăng nhập rồi quay lại lựa chọn; chưa đăng nhập thì chưa lưu giỏ thuê cá nhân.
- **Tiền điều kiện:** Có dữ liệu sản phẩm công khai để đối chiếu đề xuất.
- **Hậu điều kiện:** Bộ gợi ý có thể chỉnh sửa; AI không tự tạo đơn, thu tiền hoặc quyết định phụ phí. Có đề xuất để khách tham khảo; AI không tự tạo đơn, giữ chỗ, thu tiền hay quyết định phụ phí.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR04 BR06 BR21.
- **Quan hệ UML:** UC2.4 «include» → UC2.4.1; UC2.4.2 «extend» → UC2.4 tại EP2.4-GIO khi khách hàng đồng ý dùng bộ gợi ý

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 2
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC2.4.1 – Yêu cầu gợi ý từ dịch vụ AI

- **Use Case ID:** `UC2.4.1`
- **Tên Use Case:** Yêu cầu gợi ý từ dịch vụ AI
- **Tác nhân:** Khách vãng lai, Khách hàng, Dịch vụ AI
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC2.4.
- **Dòng sự kiện chính:**
  1. Tiếp nhận nhu cầu và danh sách sản phẩm được phép đề xuất.
  2. Gửi thông tin cần thiết tới dịch vụ AI.
  3. Nhận bộ gợi ý, số lượng và lý do để GearGo kiểm tra lại.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC2.4; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Có phản hồi để GearGo kiểm tra giá và khả dụng; AI không tự tạo đơn.

---

### UC2.4.2 – Đưa bộ gợi ý vào giỏ thuê

- **Use Case ID:** `UC2.4.2`
- **Tên Use Case:** Đưa bộ gợi ý vào giỏ thuê
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC2.4.
- **Dòng sự kiện chính:**
  1. Khách hàng chọn bộ gợi ý muốn thuê.
  2. GearGo chuyển lựa chọn sang UC3.1.
  3. Giỏ thuê nhận sản phẩm và số lượng; kiểm tra lại lịch thuê.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC2.4; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Khách hàng đồng ý dùng bộ gợi ý. Khách hàng đã đăng nhập; sản phẩm, số lượng và lịch được kiểm tra lại trước khi lưu giỏ.
- **Hậu điều kiện:** Giỏ thuê được cập nhật; chưa tạo đơn hoặc giữ chỗ.

---

## PHÂN HỆ 3: QUẢN LÝ ĐẶT THUÊ
*Giỏ hàng, chính sách giá, khuyến mãi, tạo đơn và giữ chỗ thiết bị.*

### UC3.1 – Quản lý giỏ thuê và báo giá

- **Use Case ID:** `UC3.1`
- **Tên Use Case:** Quản lý giỏ thuê và báo giá
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Lập danh sách dụng cụ cần thuê và biết rõ tiền thuê, giảm giá, cọc trước khi đặt đơn.
- **Dòng sự kiện chính:**
  1. Mở giỏ hoặc thêm sản phẩm. Hệ thống hiển thị các dòng và lịch hiện có.
  2. Thêm, xóa hoặc đổi số lượng, lịch. Hệ thống kiểm tra dữ liệu từng dòng và điều kiện lịch chung.
  3. Yêu cầu cập nhật báo giá. Hệ thống thực hiện UC2.3 cho các dòng cần thuê; báo rõ dòng thiếu.
  4. Nhập mã ưu đãi nếu có. Hệ thống kiểm tra mã và xác định phần tiền thuê đủ điều kiện.
  5. Xem báo giá. Hệ thống tính số ngày, tiền từng dòng, giảm giá, cọc và tổng thanh toán.
  6. Xác nhận tiếp tục đặt thuê. Hệ thống lưu giỏ hợp lệ và chuyển UC3.2; chưa giữ thiết bị hoặc lượt mã.
- **Dòng sự kiện phụ:**
  - 2.1. Dòng hàng ngừng kinh doanh hoặc thiếu khả dụng.
    - 2.1.1. Đánh dấu dòng lỗi, chặn đặt tới khi khách sửa hoặc bỏ dòng.
  - 4.1. Mã không hợp lệ hoặc hết lượt.
    - 4.1.1. Nêu lý do; bỏ mã hoặc chọn mã khác rồi tính lại.
  - 5.1. Đổi lịch hoặc số lượng sau khi áp mã.
    - 5.1.1. Tính lại toàn bộ giá và điều kiện mã; không giữ báo giá cũ.
  - 6.1. Chỉ lưu giỏ để xem sau.
    - 6.1.1. Giỏ tồn tại nhưng không có cam kết còn hàng.
- **Tiền điều kiện:** Khách đã đăng nhập; sản phẩm được chọn thuộc phạm vi kinh doanh.
- **Hậu điều kiện:** Giỏ hợp lệ và báo giá gồm từng khoản; không tạo chứng từ thu hoặc giữ chỗ. Giỏ và báo giá được cập nhật; chưa giữ thiết bị hoặc giữ lượt khuyến mãi.
- **Quy tắc liên quan:** Tiền thuê tính theo ngày 24 giờ làm tròn lên, tối thiểu một ngày. Giảm giá không áp dụng tiền cọc.
- **Quan hệ UML:** UC3.1 «include» → UC3.1.1; UC3.1.2 «extend» → UC3.1 tại EP3.1-UUDAI khi khách nhập mã khuyến mãi; UC3.1 «include» → UC2.3

---

### UC3.2 – Tạo đơn thuê và giữ chỗ

- **Use Case ID:** `UC3.2`
- **Tên Use Case:** Tạo đơn thuê và giữ chỗ
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Tạo cam kết giữ đủ toàn bộ đơn trong thời hạn chờ thanh toán.
- **Dòng sự kiện chính:**
  1. Chọn đặt thuê từ giỏ. Hệ thống kiểm tra tài khoản, quyền sở hữu và tải dữ liệu giỏ.
  2. Nhập hoặc xác nhận người nhận và lịch. Hệ thống hiển thị báo giá cùng điều kiện thuê, hủy, cọc.
  3. Xác nhận đặt đơn. Hệ thống thực hiện UC2.3; kiểm tra giá, mã ưu đãi và tổng tiền tại thời điểm đặt.
  4. Chấp nhận báo giá nếu có thay đổi. Hệ thống xác lập toàn bộ giữ chỗ và lượt ưu đãi trong một lần ghi nhận có kiểm soát đồng thời.
  5. Chờ kết quả tạo đơn. Hệ thống lưu đơn Chờ thanh toán, chi tiết giá và chính sách đã chốt, mã đơn và hạn giữ.
  6. Mở thanh toán. Hệ thống hiển thị tổng cần trả và thời gian còn lại; chuyển UC5.1.
- **Dòng sự kiện phụ:**
  - 3.1. Giá hoặc điều kiện ưu đãi thay đổi.
    - 3.1.1. Hiển thị báo giá mới; chưa tạo cam kết nếu khách chưa đồng ý.
  - 3.2. Một dòng thiếu hoặc khách khác vừa giữ phần cuối.
    - 3.2.1. Không tạo đơn một phần; trả kết quả thiếu để sửa giỏ.
  - 4.1. Lỗi ghi dữ liệu hoặc gửi yêu cầu lặp.
    - 4.1.1. Không để giữ chỗ mồ côi; lần lặp của yêu cầu thành công trả lại đúng đơn cũ.
  - 6.1. Hết 15 phút chưa thu hợp lệ.
    - 6.1.1. Chuyển Hết hạn, giải phóng lượng giữ và lượt ưu đãi đang giữ.
- **Tiền điều kiện:** Khách đã đăng nhập, tài khoản hoạt động, giỏ có sản phẩm và lịch thuê hợp lệ.
- **Hậu điều kiện:** Đơn, chi tiết giá, giữ chỗ, hạn thanh toán và lượt mã tạm giữ được ghi nhận đồng bộ. Đơn chờ thanh toán và giữ chỗ được tạo nhất quán; nếu không thành công thì không phát sinh cam kết thuê.
- **Quy tắc liên quan:** Hết 15 phút chưa thanh toán hợp lệ thì tự hết hạn, giải phóng số lượng và lượt khuyến mãi đang giữ.
- **Quan hệ UML:** UC3.2 «include» → UC3.2.1; UC3.2.2 «extend» → UC3.2 tại EP3.2-GIA khi giá hoặc ưu đãi thay đổi trước khi tạo đơn; UC3.2 «include» → UC2.3

---

### UC3.3 – Theo dõi đơn thuê

- **Use Case ID:** `UC3.3`
- **Tên Use Case:** Theo dõi đơn thuê
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Theo dõi tiến trình và nghĩa vụ của các đơn thuộc khách hàng hiện tại.
- **Dòng sự kiện chính:**
  1. Mở đơn của tôi. Hệ thống lấy các đơn của tài khoản hiện tại.
  2. Lọc danh sách. Hệ thống trả các đơn phù hợp và trạng thái gần nhất.
  3. Chọn một đơn. Hệ thống kiểm tra sở hữu rồi hiển thị lịch, dòng hàng và tổng tiền.
  4. Mở phần thanh toán, giao nhận hoặc lịch sử. Hệ thống hiển thị dữ liệu liên quan của đúng đơn.
  5. Chọn thao tác tiếp theo. Hệ thống chỉ cho thanh toán, hủy hoặc đánh giá nếu thỏa điều kiện tương ứng.
  - Chi tiết đơn cho xem tiền thuê/cọc đã thu, từng phiếu bàn giao và nhận trả theo đợt, thiết bị còn nợ, phụ phí cùng trạng thái duyệt, bảng đối soát, khoản thu thêm/hoàn và lịch sử xử lý. Chứng từ được xem trong phạm vi đơn thuộc sở hữu khách.
- **Dòng sự kiện phụ:**
  - 2.1. Chưa có đơn phù hợp.
    - 2.1.1. Hiển thị rỗng, cho bỏ bộ lọc.
  - 3.1. Nhập mã đơn người khác.
    - 3.1.1. Từ chối, không tiết lộ chi tiết khách hoặc tiền.
  - 5.1. Trạng thái thay đổi khi đang xem.
    - 5.1.1. Tải lại trạng thái và kiểm tra điều kiện trước thao tác mới.
- **Tiền điều kiện:** Khách đã đăng nhập.
- **Hậu điều kiện:** Danh sách và chi tiết đơn đúng quyền; bản thân việc xem không đổi trạng thái. Khách biết tiến độ và nghĩa vụ của đơn; thao tác xem không thay đổi trạng thái.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR01 BR05 BR22.

---

### UC3.4 – Hủy đơn thuê

- **Use Case ID:** `UC3.4`
- **Tên Use Case:** Hủy đơn thuê
- **Tác nhân:** Khách hàng, Quản trị viên
- **Tóm tắt:** Kết thúc đơn chưa bàn giao theo đúng quyền và xác định khoản giữ lại hoặc phải hoàn.
- **Dòng sự kiện chính:**
  1. Mở đơn, chọn hủy. Hệ thống kiểm tra quyền và trạng thái chưa bàn giao.
  2. Nhập lý do. Hệ thống xác định bên chịu trách nhiệm, thời gian trước giờ nhận và khoản đã thu.
  3. Xem dự tính hoàn và phí giữ lại. Hệ thống tính theo chính sách đơn; trình bày tiền thuê và cọc riêng.
  4. Xác nhận hủy. Hệ thống kiểm tra lại trạng thái để tránh xung đột với bàn giao; ghi lý do và trạng thái hủy.
  5. Chờ xử lý. Hệ thống giải phóng lịch; xử lý lượt mã theo tình trạng thanh toán; tạo yêu cầu hoàn nếu có.
  6. Theo dõi kết quả hoàn. Hệ thống hiển thị hủy đơn và hoàn tiền là hai kết quả riêng; UC5.6 thực hiện khoản hoàn.
  - Kết quả hủy lưu rõ Khách hủy hoặc Cửa hàng hủy, người thực hiện, bên chịu trách nhiệm, tiền thuê giữ lại và cọc phải hoàn. Bước 5 chỉ tạo yêu cầu hoàn; nhân viên đủ quyền hoặc quản trị viên thực hiện UC5.6 và theo dõi kết quả riêng.
- **Dòng sự kiện phụ:**
  - 1.1. Đơn đã bàn giao.
    - 1.1.1. Từ chối hủy; xử lý nhận trả và đối soát theo quy trình.
  - 3.1. Khách chưa đồng ý số tiền giữ lại.
    - 3.1.1. Giữ nguyên đơn; có thể yêu cầu cửa hàng giải thích.
  - 4.1. Đơn đã hủy hoặc hết hạn trước yêu cầu.
    - 4.1.1. Không giải phóng hoặc lập hoàn trùng; hiển thị kết quả hiện tại.
  - 6.1. Khoản hoàn đang chờ hoặc thất bại.
    - 6.1.1. Đơn vẫn đã hủy, nhưng nghĩa vụ hoàn chưa được coi là xong.
  - Khách không đến nhận: nhân viên ghi thời điểm và kết quả liên hệ; chuyển quản trị viên quyết định theo chính sách của đơn. Chưa bàn giao thì không chuyển Đang thuê hoặc tự coi đã giao đồ.
- **Tiền điều kiện:** Đơn chưa bàn giao; khách sở hữu đơn hoặc quản trị viên có quyền hủy phía cửa hàng.
- **Hậu điều kiện:** Trạng thái hủy, lịch sử, phần phí giữ lại và yêu cầu hoàn có căn cứ. Đơn bị hủy có căn cứ, lịch được giải phóng; nghĩa vụ hoàn tiền tồn tại cho đến khi xử lý xong.
- **Quy tắc liên quan:** Chưa thanh toán hủy miễn phí. Trên 48 giờ hoàn toàn bộ; 24–48 giờ và dưới 24 giờ giữ tiền thuê theo chính sách đã lưu. Cọc trước bàn giao hoàn toàn bộ; cửa hàng không cung cấp được đồ hoàn toàn bộ khoản đã thu.
- **Quan hệ UML:** UC5.6 «extend» → UC3.4 tại EP3.4-HOAN khi có khoản đã thu phải hoàn khi hủy

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 3
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC3.1.1 – Tính báo giá thuê

- **Use Case ID:** `UC3.1.1`
- **Tên Use Case:** Tính báo giá thuê
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC3.1.
- **Dòng sự kiện chính:**
  1. Nhận lịch thuê, sản phẩm và số lượng.
  2. Tính ngày thuê, tiền thuê, tiền cọc và ưu đãi đã xác minh.
  3. Hiển thị tổng tiền với tiền thuê và tiền cọc tách riêng.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC3.1; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Báo giá được tính theo dữ liệu hiện tại; chưa giữ chỗ.

---

### UC3.1.2 – Áp dụng mã khuyến mãi

- **Use Case ID:** `UC3.1.2`
- **Tên Use Case:** Áp dụng mã khuyến mãi
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC3.1.
- **Dòng sự kiện chính:**
  1. Khách nhập mã khuyến mãi.
  2. Kiểm tra hiệu lực, phạm vi và giới hạn sử dụng.
  3. Tính giảm giá trên tiền thuê đủ điều kiện và trả báo giá mới.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC3.1; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Khách nhập mã khuyến mãi.
- **Hậu điều kiện:** Ưu đãi hợp lệ được phản ánh trong báo giá; không giảm tiền cọc.

---

### UC3.2.1 – Lưu giá và chính sách của đơn

- **Use Case ID:** `UC3.2.1`
- **Tên Use Case:** Lưu giá và chính sách của đơn
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC3.2.
- **Dòng sự kiện chính:**
  1. Đối chiếu báo giá đã được khách chấp nhận.
  2. Ghi giá, cọc, chính sách hủy và ưu đãi tại thời điểm tạo.
  3. Lưu đồng bộ với đơn, giữ chỗ và hạn thanh toán.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC3.2; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Đơn giữ bản giá và chính sách đã chốt; thất bại không để đơn dở dang.

---

### UC3.2.2 – Chấp nhận báo giá thay đổi

- **Use Case ID:** `UC3.2.2`
- **Tên Use Case:** Chấp nhận báo giá thay đổi
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC3.2.
- **Dòng sự kiện chính:**
  1. Hệ thống hiển thị các khoản thay đổi.
  2. Khách xem và xác nhận báo giá mới.
  3. Hệ thống kiểm tra lại trước khi tiếp tục tạo đơn.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC3.2; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Giá hoặc ưu đãi thay đổi trước khi tạo đơn.
- **Hậu điều kiện:** Chỉ tiếp tục khi khách đồng ý; chưa đồng ý thì không tạo giữ chỗ.

---

## PHÂN HỆ 4: QUẢN LÝ GIAO NHẬN
*Soạn hàng, phân công thiết bị vật lý, bàn giao, nhận trả và xử lý quá hạn.*

### UC4.1 – Chuẩn bị và phân công thiết bị

- **Use Case ID:** `UC4.1`
- **Tên Use Case:** Chuẩn bị và phân công thiết bị
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Chuẩn bị đúng từng vật phẩm để phục vụ đơn đã xác nhận.
- **Dòng sự kiện chính:**
  1. Tìm đơn theo mã, khách hoặc lịch nhận. Hệ thống hiển thị yêu cầu và tiền đã xác nhận.
  2. Nhận chuẩn bị đơn. Hệ thống chuyển Đang chuẩn bị, lưu người thực hiện.
  3. Chọn mã thiết bị cho từng dòng. Hệ thống kiểm tra đúng sản phẩm, tình trạng và lịch từng mã.
  4. Kiểm tra thực tế phụ kiện và khả năng dùng. Hệ thống ghi kết quả chuẩn bị, đánh dấu vật phẩm cần thay nếu không đạt.
  5. Xác nhận đủ bộ. Hệ thống kiểm tra đủ số lượng và không còn mã xung đột rồi lưu phân công.
  6. Chọn sẵn sàng nhận. Hệ thống chuyển Sẵn sàng nhận và tạo thông báo cho khách.
- **Dòng sự kiện phụ:**
  - 3.1. Thiết bị hỏng hoặc chưa trả từ đơn trước: Loại khỏi lựa chọn và yêu cầu thay mã cùng sản phẩm đủ điều kiện.
  - 5.1. Không đủ thiết bị thay thế: Giữ Đang chuẩn bị, cảnh báo quản trị giải quyết với khách.
  - 5.2. Đổi phân công đã lưu: Hủy lịch phân công cũ có dấu vết, lập lịch mới; không trừ thêm một lần giữ chỗ.
  - 6.1. Gửi thông báo lỗi: Đơn vẫn Sẵn sàng nhận; ghi nhận để gửi lại.
  - Lưu ý: Thiết bị đã phân công không đạt: nhân viên chọn mã thay cùng sản phẩm, đủ phụ kiện và không xung đột lịch; lưu mã cũ/mới, thời điểm, người làm và lý do. Không đủ mã thay thì báo quản trị viên giải quyết với khách, không tự giảm lượng hoặc đổi sản phẩm.
- **Tiền điều kiện:** Đơn đã xác nhận thanh toán, chưa bàn giao và chưa hủy.
- **Hậu điều kiện:** Phân công thiết bị và kết quả chuẩn bị; trạng thái Sẵn sàng nhận khi đủ điều kiện. Đơn sẵn sàng nhận với đủ mã thiết bị hợp lệ hoặc tiếp tục chờ chuẩn bị nếu chưa đáp ứng.
- **Quy tắc liên quan:** Không tự đổi sản phẩm hoặc giảm số lượng khách đã thanh toán.

---

### UC4.2 – Bàn giao thiết bị

- **Use Case ID:** `UC4.2`
- **Tên Use Case:** Bàn giao thiết bị
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Chốt việc khách đã nhận đủ bộ thiết bị và ghi bằng chứng tình trạng trước thuê.
- **Dòng sự kiện chính:**
  1. Tra mã hoặc quét QR. Hệ thống hiển thị đơn và kiểm tra Sẵn sàng nhận, khoản thu, giờ nhận.
  2. Đối chiếu người nhận. Hệ thống cho ghi kết quả xác minh theo thông tin đơn.
  3. Kiểm tra cùng khách từng thiết bị và phụ kiện. Hệ thống hiển thị danh sách phân công; ghi tình trạng trước thuê và ảnh.
  4. Ghi nhận khách đồng ý nhận đủ đồ. Hệ thống hoàn thiện phiếu bàn giao nháp.
  5. Chọn chốt bàn giao. Hệ thống kiểm tra lần cuối trạng thái, đầy đủ vật phẩm và quyền chốt.
  6. Xem phiếu đã chốt. Hệ thống lưu chứng từ, thời gian, nhân viên; chuyển thiết bị và đơn sang Đang thuê.
- **Dòng sự kiện phụ:**
  - 1.1. Người nhận không khớp hoặc chưa đủ tiền: Chưa bàn giao; yêu cầu giải quyết căn cứ hợp lệ.
  - 3.1. Thiếu thiết bị hoặc khách không đồng ý tình trạng: Quay về xử lý chuẩn bị; không chốt giao thiếu.
  - 1.2. Khách nhận sớm: Chỉ tiếp tục sau kiểm tra lịch và chấp thuận của cửa hàng.
  - 5.1. Đã chốt hoặc hai người cùng chốt: Chỉ một phiếu bàn giao hiệu lực; trả kết quả đã lưu.
  - Lưu ý: Khách nhận sớm: chỉ bàn giao khi thiết bị đã kiểm tra, đủ tiền, không ảnh hưởng lịch khác và cửa hàng chấp thuận; không tự sửa giá hoặc lịch đã chốt. Khách chưa đồng ý tình trạng thì giữ phiếu chưa chốt và kiểm tra/thay thiết bị.
- **Tiền điều kiện:** Đơn sẵn sàng nhận; đã thu đủ tiền thuê và cọc; thời điểm nhận hợp lệ.
- **Hậu điều kiện:** Phiếu bàn giao chốt đủ một lần; bằng chứng trước thuê và trạng thái Đang thuê. Có chứng từ cho đúng thiết bị thực giao; đơn đang thuê. Thất bại thì chưa ghi nhận giao thành công.
- **Quy tắc liên quan:** Bàn giao đủ một lần cho một đơn; QR chỉ hỗ trợ tìm đơn. Khách xác nhận trực tiếp với nhân viên, không giả định khách có thao tác chốt trên hệ thống.

---

### UC4.3 – Nhận trả và kiểm tra thiết bị

- **Use Case ID:** `UC4.3`
- **Tên Use Case:** Nhận trả và kiểm tra thiết bị
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Ghi nhận chính xác phần đã trả, tình trạng từng vật phẩm và phần nghĩa vụ còn lại.
- **Dòng sự kiện chính:**
  1. Nhân viên hoặc quản trị viên tra cứu đơn đang thuê; hệ thống hiển thị thiết bị đã giao, các đợt đã trả và phần còn nợ.
  2. Chọn mã thiết bị khách thực trả lần này; hệ thống kiểm tra thuộc đơn và chưa có kết luận trả ở đợt trước.
  3. Hệ thống xác định số thứ tự đợt và mã phiếu PNT theo mã đơn và số đợt; nhân viên ghi thời điểm thực trả, phụ kiện, tình trạng và ảnh của từng thiết bị.
  4. Kiểm tra thực tế và xác nhận phiếu; hệ thống lưu đúng một lần, chuyển đồ đạt kiểm tra về Sẵn sàng, đồ cần xử lý sang bảo trì. Thiết bị được kết luận mất không được ghi như đã về kho.
  5. Tại EP4.3-MOTPHAN, nếu còn thiết bị chưa trả/chưa có kết luận mất hợp lệ, ghi phiếu chưa phải đợt cuối; giữ Đang thuê với nhãn Trả một phần và hiển thị danh sách còn nợ.
  6. Tại EP4.3-PHUPHI, nếu có căn cứ phí, nhân viên lập UC5.2; phí trễ tính riêng từng mã theo thời điểm thực trả hoặc kết luận mất được duyệt.
  7. Nếu mọi thiết bị đã trả hoặc có kết luận mất được duyệt, đánh dấu đợt cuối, chuyển Đã nhận trả; khi hồ sơ kiểm tra đầy đủ, chuyển Chờ đối soát.
  8. Hệ thống cung cấp lịch sử từng đợt cho nhân viên/quản trị viên; khách xem qua UC3.3. Chưa hoàn tất đơn nếu còn nghĩa vụ thiết bị hoặc tài chính.
- **Dòng sự kiện phụ:**
  - 2.1. Mã sai đơn hoặc đã trả: từ chối dòng và yêu cầu chọn lại; không tăng lượng tại kho lần hai.
  - 3.1. Khách trả một phần: Thực hiện UC4.3.2 tại EP4.3-MOTPHAN, phần còn nợ tiếp tục được theo dõi và tính trễ khi quá hạn.
  - 3.2. Khách báo mất: Lập biên bản, bằng chứng và phụ phí bồi thường; quản trị viên duyệt kết luận mất trước khi kết thúc nghĩa vụ trả mã đó.
  - 4.1. Gửi xác nhận lặp: trả kết quả phiếu đã lưu, không tạo đợt hoặc ghi nhận thiết bị lần hai.
  - 4.2. Lỗi lưu: không lưu phiếu và trạng thái thiết bị dở dang; cho thử lại sau khi kiểm tra.
  - 6.1. Tranh chấp phí: giữ chờ kết luận phí; không đảo việc đã nhận đồ thực tế, không chốt đối soát cuối cùng.
- **Tiền điều kiện:** Đơn đang thuê, đã có phiếu bàn giao và còn thiết bị chưa có kết luận nhận trả.
- **Hậu điều kiện:** Phiếu nhận trả, kết quả từng vật phẩm và danh sách nghĩa vụ còn lại. Kết quả từng thiết bị được lưu có bằng chứng; phần chưa trả vẫn được theo dõi, đơn chưa tự hoàn tất.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR11 BR12 BR13 BR14 BR22.
- **Quan hệ UML:** UC4.3.2 «extend» → UC4.3 tại EP4.3-MOTPHAN khi khách chỉ trả một phần thiết bị; UC5.2 «extend» → UC4.3 tại EP4.3-PHUPHI khi có căn cứ phụ phí khi nhận trả

---

### UC4.4 – Xử lý đơn quá hạn

- **Use Case ID:** `UC4.4`
- **Tên Use Case:** Xử lý đơn quá hạn
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Xử lý việc chưa nhận lại thiết bị đúng hạn và giảm ảnh hưởng tới các đơn kế tiếp.
- **Dòng sự kiện chính:**
  1. Mở danh sách quá hạn hoặc thông báo. Hệ thống hiển thị mã còn thiếu, thời gian trễ và phí dự kiến.
  2. Mở chi tiết đơn. Hệ thống đối chiếu các lần trả trước và phần còn phải thu hồi.
  3. Liên hệ khách, ghi kết quả. Hệ thống lưu lịch sử xử lý và dự kiến trả do khách cung cấp.
  4. Kiểm tra ảnh hưởng lịch kế tiếp. Hệ thống liệt kê đơn bị ảnh hưởng và mã thay thế có thể dùng.
  5. Phối hợp nhận trả hoặc xử lý mất. Hệ thống cập nhật căn cứ thực tế qua UC4.3 hoặc kết luận mất được duyệt.
  6. Xem kết quả xử lý. Hệ thống tính mốc dừng trễ theo từng mã; bỏ nhãn khi hết nghĩa vụ quá hạn.
- **Dòng sự kiện phụ:**
  - 3.1. Không liên hệ được.
    - 3.1.1. Giữ theo dõi và ghi lần liên hệ; không coi thiết bị sẵn sàng.
  - 4.1. Không có thiết bị thay thế.
    - 4.1.1. Chuyển quản trị viên giải quyết cam kết với khách kế tiếp.
  - 5.1. Mất được xác nhận hợp lệ.
    - 5.1.1. Dừng trễ tại thời điểm kết luận mất được duyệt, giữ hồ sơ bồi thường.
  - 6.1. Một phần đã trả, phần khác còn thiếu.
    - 6.1.1. Chỉ tiếp tục tính dự kiến trên phần chưa giải quyết.
  - Thiết bị được kết luận mất: chỉ dừng phí trễ tại thời điểm kết luận được duyệt; chuyển Thất lạc, lưu biên bản và bồi thường. Không đưa mã mất về khả dụng.
- **Tiền điều kiện:** Đơn còn thiết bị chưa trả và đã quá giờ trả dự kiến, chưa có kết luận mất hợp lệ.
- **Hậu điều kiện:** Lịch sử xử lý quá hạn, các cam kết bị ảnh hưởng và căn cứ phụ phí. Đơn có thông tin xử lý quá hạn và ảnh hưởng lịch; thiết bị chưa thu hồi không được tính sẵn sàng.
- **Quy tắc liên quan:** Quá hạn là nhãn của đơn đang thuê. Hệ thống tự phát hiện nhưng nhân viên xử lý nghiệp vụ.

---

### UC4.5 – Tra cứu đơn thuê cho vận hành

- **Use Case ID:** `UC4.5`
- **Tên Use Case:** Tra cứu đơn thuê cho vận hành
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Tra cứu đơn thuê cho vận hành trong phạm vi quyền của người sử dụng.
- **Dòng sự kiện chính:**
  1. Người dùng tìm theo mã/QR, khách hàng, số điện thoại, giờ nhận/trả hoặc trạng thái.
  2. Hệ thống trả danh sách trong phạm vi quyền, gồm đơn chờ thanh toán, chuẩn bị, đang thuê, hủy, hết hạn và hoàn tất.
  3. Mở đơn; hệ thống hiển thị lịch, thiết bị phân công, giao nhận từng đợt, tiền/phụ phí và lịch sử theo quyền.
  4. Chọn chuẩn bị, bàn giao, nhận trả, đối soát hoặc ghi nhận khách không đến; hệ thống kiểm tra quyền và điều kiện UC đích.
- **Dòng sự kiện phụ:**
  - 2.1. Không có đơn: cho đổi điều kiện.
  - 3.1. Mã/QR không hợp lệ hoặc ngoài quyền: không cung cấp dữ liệu.
  - 4.1. Trạng thái vừa đổi hoặc không đủ quyền: từ chối thao tác, tải trạng thái mới.
  - 4.2. Khách không đến nhận: lưu thời điểm và kết quả liên hệ, chuyển quản trị viên xử lý UC3.4 theo chính sách; không tự bàn giao.
- **Tiền điều kiện:** Nhân viên/quản trị viên đã đăng nhập và có quyền tra cứu đơn phục vụ công việc.
- **Hậu điều kiện:** Đơn được tra cứu đúng quyền; chỉ UC nghiệp vụ đích mới thay trạng thái.

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 4
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC4.3.1 – Ghi nhận trả một phần

- **Use Case ID:** `UC4.3.1`
- **Tên Use Case:** Ghi nhận trả một phần
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC4.3.
- **Dòng sự kiện chính:**
  1. Nhân viên xác nhận các mã khách thực trả.
  2. Ghi rõ các mã còn thiếu.
  3. Lưu phiếu nhận trả phần thực nhận và giữ đơn đang thuê cho phần còn lại.
  4. Lưu số đợt, phiếu và danh sách còn nợ; giữ nhãn Trả một phần cho đến khi toàn bộ nghĩa vụ trả đã có kết luận. Không hoàn cọc cuối cùng chỉ vì đã nhận một phần đồ.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC4.3; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Khách chỉ trả một phần thiết bị.
- **Hậu điều kiện:** Không hoàn tất đơn khi còn thiết bị chưa giải quyết.

---

## PHÂN HỆ 5: QUẢN LÝ THANH TOÁN VÀ TIỀN CỌC
*Thanh toán đặt cọc trực tuyến, phụ phí hỏng hóc/trả trễ, đối soát và hoàn cọc.*

### UC5.1 – Thanh toán và xác nhận đơn

- **Use Case ID:** `UC5.1`
- **Tên Use Case:** Thanh toán và xác nhận đơn
- **Tác nhân:** Khách hàng, Dịch vụ thanh toán
- **Tóm tắt:** Ghi nhận đúng khoản thu ban đầu và xác nhận đơn còn giữ chỗ hợp lệ.
- **Dòng sự kiện chính:**
  1. Chọn thanh toán đơn. Hệ thống kiểm tra quyền, hạn giữ và tổng tiền cần thu.
  2. Chọn phương thức, xác nhận trả tiền. Hệ thống tạo yêu cầu thanh toán gắn mã đơn và số tiền đúng.
  3. Khách hàng thực hiện thanh toán tại dịch vụ ngoài. Dịch vụ xử lý giao dịch và gửi kết quả về GearGo.
  4. GearGo xác minh nguồn kết quả, mã giao dịch, số tiền và trạng thái đơn trước khi thông báo kết quả cho khách.
  5. Xem xác nhận thanh toán. Hệ thống ghi khoản thu một lần, tách thuê/cọc; chuyển Đã xác nhận nếu còn hợp lệ.
  6. Mở chi tiết đơn. Hệ thống hiển thị tiền đã thu, trạng thái, lượt ưu đãi đã dùng và thông báo.
- **Dòng sự kiện phụ:**
  - 3.1. Thất bại rõ ràng khi còn hạn: Cho thử lại; không ghi tiền đã thu.
  - 4.1. Chưa rõ kết quả hoặc khách đóng trang thanh toán: Giữ đang kiểm tra, đối chiếu cổng; không lập tức yêu cầu trả lần nữa.
  - 4.2. Kết quả gửi lại cùng mã giao dịch: Trả kết quả đã ghi, không thu hoặc dùng mã ưu đãi lần hai.
  - 4.3. Sai số tiền, thu trùng hoặc nguồn kết quả không hợp lệ: Chuyển đối chiếu; không xác nhận đơn từ dữ liệu sai.
  - 5.1. Tiền đến sau khi đơn hết hạn hoặc hủy: Ghi tiền thực nhận và yêu cầu hoàn; không phục hồi giữ chỗ.
- **Tiền điều kiện:** Đơn chờ thanh toán của khách, còn hạn giữ chỗ.
- **Hậu điều kiện:** Giao dịch thu, phân bổ thuê/cọc, kết quả xác nhận hoặc hồ sơ xử lý khoản bất thường. Khoản thu hợp lệ được lưu và đơn được xác nhận; khoản bất thường được theo dõi để xử lý.
- **Quy tắc liên quan:** Cọc được quản lý riêng với tiền thuê. Dịch vụ thanh toán là vai trò tích hợp tổng quát, chưa chỉ định nhà cung cấp. Kênh hỗ trợ trong phạm vi: thanh toán trực tuyến qua dịch vụ ngoài; thu bổ sung tại cửa hàng bằng tiền mặt hoặc chuyển khoản đã xác minh; hoàn qua dịch vụ thanh toán hoặc chuyển khoản có chứng từ. Không ghi thành công từ ảnh chuyển tiền hoặc thao tác gửi yêu cầu đơn thuần; tiền mặt có người nhận và chứng từ, chuyển khoản/cổng có mã tham chiếu và kết quả đối chiếu.

---

### UC5.2 – Lập phụ phí

- **Use Case ID:** `UC5.2`
- **Tên Use Case:** Lập phụ phí
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Lập khoản phát sinh có căn cứ và đưa đến đúng cấp được duyệt.
- **Dòng sự kiện chính:**
  1. Mở đơn, chọn lập phụ phí. Hệ thống hiển thị tình trạng, thời gian và chính sách đã chốt.
  2. Chọn vật phẩm và loại phí. Hệ thống tính mức gợi ý từ căn cứ liên quan.
  3. Bổ sung ảnh, lý do và điều chỉnh số tiền nếu có căn cứ. Hệ thống kiểm tra dữ liệu, trùng tổn thất và phạm vi tính phí.
  4. Gửi khoản phí. Hệ thống xác định thẩm quyền: xác nhận trong quyền hoặc chuyển Chờ duyệt.
  5. Thông báo khoản phát sinh cho khách. Hệ thống ghi trạng thái phí và phản hồi khách nếu có.
  6. Chuyển hồ sơ xử lý tiếp. Hệ thống chỉ phí đã duyệt được dùng ở UC5.4; khoản tranh chấp chuyển UC5.3.
- **Dòng sự kiện phụ:**
  - 3.1. Chỉ là hao mòn thông thường: Không lập phí trái chính sách; lưu kết quả kiểm tra nếu cần.
  - 3.2. Đã tính mất thiết bị lại nhập thêm phí sửa cùng tổn thất: Từ chối phần chồng lặp, yêu cầu sửa căn cứ.
  - 4.1. Vượt ngưỡng quyền hạn hoặc là ngoại lệ: Giữ Chờ duyệt, không tự đưa vào đối soát.
  - 5.1. Khách không đồng ý: Ghi tranh chấp và chuyển quản trị viên; chưa chốt khoản đang tranh chấp.
- **Tiền điều kiện:** Có đơn, căn cứ trả trễ hoặc kết quả kiểm tra thiết bị; người lập có quyền.
- **Hậu điều kiện:** Hồ sơ phụ phí, căn cứ, số tiền và trạng thái duyệt rõ ràng. Có phụ phí với căn cứ và trạng thái rõ ràng; chỉ khoản được duyệt mới được tính vào đối soát.
- **Quy tắc liên quan:** Không thu phí hao mòn thông thường được chính sách cho phép.
- **Quan hệ UML:** UC5.2 «extend» → UC4.3 tại EP4.3-PHUPHI khi có căn cứ phụ phí khi nhận trả

---

### UC5.3 – Duyệt và xử lý tranh chấp phụ phí

- **Use Case ID:** `UC5.3`
- **Tên Use Case:** Duyệt và xử lý tranh chấp phụ phí
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Ra quyết định có căn cứ đối với phụ phí vượt quyền hoặc có tranh chấp.
- **Dòng sự kiện chính:**
  1. Mở hồ sơ cần xử lý. Hệ thống hiển thị số tiền, chính sách và người lập.
  2. Xem chứng cứ trước và sau thuê. Hệ thống cung cấp phiếu, ảnh và mốc thời gian liên quan.
  3. Xem phản hồi khách, yêu cầu bổ sung nếu cần. Hệ thống lưu trao đổi gắn đúng khoản phí.
  4. Chọn kết luận và mức phí hợp lệ. Hệ thống kiểm tra giới hạn chính sách và xung đột với khoản đã chốt.
  5. Xác nhận quyết định. Hệ thống lưu người duyệt, thời điểm, lý do và số tiền được chấp nhận.
  6. Xem kết quả thông báo. Hệ thống cập nhật điều kiện đưa vào đối soát và báo cho người liên quan.
- **Dòng sự kiện phụ:**
  - 3.1. Chứng cứ chưa đủ: Trả yêu cầu bổ sung; giữ khoản phí chưa đủ điều kiện đối soát.
  - 4.1. Không có căn cứ thu: Từ chối, số phí tính vào đối soát bằng không; vẫn lưu lịch sử.
  - 4.2. Đối soát đã chốt: Không sửa ngược khoản gốc; chuyển UC5.7 để điều chỉnh có dấu vết.
- **Tiền điều kiện:** Có phụ phí chờ duyệt, vượt ngưỡng hoặc có tranh chấp.
- **Hậu điều kiện:** Kết luận duyệt cùng dấu vết xử lý tranh chấp; số tiền đủ điều kiện đối soát. Phụ phí có kết luận được lưu hoặc tiếp tục chờ bổ sung; người lập và người duyệt được truy vết.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR13 BR14 BR17 BR22.

---

### UC5.4 – Đối soát cọc và hoàn tất đơn

- **Use Case ID:** `UC5.4`
- **Tên Use Case:** Đối soát cọc và hoàn tất đơn
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Xác định và giải quyết phần cọc phải hoàn hoặc tiền thiếu trước khi kết thúc đơn.
- **Dòng sự kiện chính:**
  1. Mở đối soát của đơn. Hệ thống kiểm tra thiết bị và kết luận phụ phí.
  2. Yêu cầu tổng hợp. Hệ thống tính cọc, phí và các khoản đã thực hiện; hiển thị chênh lệch còn lại.
  3. Đối chiếu chi tiết từng khoản. Hệ thống cho truy về giao dịch thu, phiếu phí và phiếu nhận trả.
  4. Xác nhận bảng đối soát. Hệ thống lưu căn cứ, số phải hoàn hoặc phải thu; giữ Chờ đối soát.
  5. Thực hiện nghĩa vụ tiền nếu có. Hệ thống tại EP5.4-THU gọi UC5.5 khi phải thu thêm hoặc tại EP5.4-HOAN gọi UC5.6 khi phải hoàn; không gọi cả hai cho cùng số chênh lệch.
  6. Yêu cầu chốt sau khi giao dịch hoàn thành. Hệ thống kiểm tra lại không còn thiết bị, phí hoặc tiền chưa xử lý.
  7. Xem kết quả chốt. Hệ thống khóa đối soát và chuyển Hoàn tất; lưu thời điểm để báo cáo.
  - Lưu ý: Bảng đối soát hiển thị cọc thực thu, phí đã duyệt, khoản đã thu bổ sung/hoàn trước đó, căn cứ điều chỉnh và số còn phải thu hoặc hoàn. Tính số dư từ nghĩa vụ hợp lệ trừ tiền đã xử lý; không cộng cọc vào doanh thu hoặc xử lý lại khoản đã hoàn.
- **Dòng sự kiện phụ:**
  - 1.1. Còn đồ thiếu, phí chưa duyệt hoặc tranh chấp: Chưa cho chốt; nêu rõ mục cần giải quyết.
  - 5.1. Chênh lệch bằng không: Bỏ qua giao dịch tiền, chuyển kiểm tra bước 6.
  - 5.2. Thu bổ sung chưa đủ hoặc hoàn chưa thành công: Giữ Chờ đối soát; không chuyển Hoàn tất.
  - 6.1. Gửi yêu cầu chốt lặp hoặc dữ liệu vừa thay đổi: Đối chiếu lại; chỉ có một kết quả chốt hợp lệ.
- **Tiền điều kiện:** Tất cả thiết bị đã có kết luận nhận trả hoặc mất hợp lệ; phụ phí đã có kết luận.
- **Hậu điều kiện:** Đối soát có chứng từ gốc, nghĩa vụ đã xử lý và trạng thái kết thúc; không thu tiền thuê lần hai. Đơn hoàn tất khi giao nhận và tài chính đã kết thúc; nếu chưa đủ điều kiện thì giữ chờ đối soát.
- **Quy tắc liên quan:** Không thu lại tiền thuê đã thanh toán. Hoàn cọc = max(cọc − phụ phí, 0); thu thêm = max(phụ phí − cọc, 0), có đối chiếu khoản đã thực hiện để tránh xử lý lặp.
- **Quan hệ UML:** UC5.5 «extend» → UC5.4 tại EP5.4-THU khi còn phải thu thêm; UC5.6 «extend» → UC5.4 tại EP5.4-HOAN khi còn phải hoàn tiền

---

### UC5.5 – Thu tiền bổ sung

- **Use Case ID:** `UC5.5`
- **Tên Use Case:** Thu tiền bổ sung
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Ghi nhận khoản tiền khách nộp thêm để thanh toán phần thiếu đã xác định.
- **Dòng sự kiện chính:**
  1. Mở đối soát đang thiếu tiền. Hệ thống hiển thị nghĩa vụ và các khoản đã ghi trước đó.
  2. Chọn ghi khoản bổ sung. Hệ thống hiển thị số còn phải thu, không gồm tiền thuê đã trả.
  3. Đối chiếu tiền thực nhận và chứng từ. Hệ thống kiểm tra số tiền, người nộp và tham chiếu giao dịch.
  4. Xác nhận đã nhận tiền. Hệ thống ghi khoản thu một lần vào đúng đơn và đối soát.
  5. Xem số dư nghĩa vụ. Hệ thống tính lại số còn thiếu và báo kết quả về UC5.4.
  6. Tiếp tục chốt nếu đủ điều kiện. Hệ thống UC5.4 kiểm tra toàn bộ nghĩa vụ trước khi hoàn tất.
- **Dòng sự kiện phụ:**
  - 3.1. Khách chỉ cung cấp ảnh nhưng chưa xác minh có tiền.
    - 3.1.1. Giữ chờ kiểm tra, không đánh dấu đã thu.
  - 3.2. Số tiền không khớp hoặc nộp thiếu.
    - 3.2.1. Ghi nhận đúng tiền thực đã xác minh theo xử lý đối chiếu; giữ phần thiếu, không chốt đơn.
  - 4.1. Mã giao dịch đã dùng.
    - 4.1.1. Không ghi thu lần hai; hiển thị chứng từ đã có.
- **Tiền điều kiện:** Có nghĩa vụ thu thêm hợp lệ từ đối soát; người thao tác được phân quyền.
- **Hậu điều kiện:** Khoản thu bổ sung và số nghĩa vụ còn lại, liên kết đối soát. Khoản bổ sung được ghi đúng một lần theo tiền thực nhận; chốt đơn chỉ khi hết nghĩa vụ.
- **Quy tắc liên quan:** Đây là thao tác nghiệp vụ của nhân viên; không giả định có màn hình thanh toán bổ sung trực tuyến cho khách nếu chưa thiết kế. Kênh hỗ trợ trong phạm vi: thanh toán trực tuyến qua dịch vụ ngoài; thu bổ sung tại cửa hàng bằng tiền mặt hoặc chuyển khoản đã xác minh; hoàn qua dịch vụ thanh toán hoặc chuyển khoản có chứng từ. Không ghi thành công từ ảnh chuyển tiền hoặc thao tác gửi yêu cầu đơn thuần; tiền mặt có người nhận và chứng từ, chuyển khoản/cổng có mã tham chiếu và kết quả đối chiếu.
- **Quan hệ UML:** UC5.5 «extend» → UC5.4 tại EP5.4-THU khi còn phải thu thêm

---

### UC5.6 – Thực hiện hoàn tiền

- **Use Case ID:** `UC5.6`
- **Tên Use Case:** Thực hiện hoàn tiền
- **Tác nhân:** Nhân viên, Quản trị viên, Dịch vụ thanh toán
- **Tóm tắt:** Hoàn đúng số tiền còn phải trả cho khách, có xác nhận giao dịch thực tế.
- **Dòng sự kiện chính:**
  1. Mở yêu cầu hoàn. Hệ thống hiển thị lý do, khoản thu gốc, tổng được hoàn và phần đã hoàn.
  2. Kiểm tra thông tin nhận và số tiền. Hệ thống đối chiếu quyền xử lý, giới hạn và yêu cầu đang chạy.
  3. Xác nhận thực hiện. Hệ thống gửi yêu cầu qua dịch vụ thanh toán hoặc ghi nghiệp vụ chuyển khoản theo kênh được dùng.
  4. Theo dõi kết quả. Hệ thống kiểm tra kết quả thực tế hoặc chứng từ xác minh, không dựa riêng màn hình gửi thành công.
  5. Xác nhận kết quả đã kiểm tra. Hệ thống lưu giao dịch hoàn một lần với mã tham chiếu và thời điểm.
  6. Xem nghĩa vụ còn lại. Hệ thống cập nhật yêu cầu hoàn, đối soát liên quan và thông báo cho khách.
  - Lưu ý: Yêu cầu hoàn do hủy và yêu cầu hoàn cọc có căn cứ riêng; nhân viên chỉ xử lý trong quyền được cấp. Hủy đơn hoàn thành không đồng nghĩa giao dịch hoàn đã thành công; yêu cầu tiếp tục Chờ xử lý nếu tiền chưa được xác minh hoàn.
- **Dòng sự kiện phụ:**
  - 2.1. Vượt số còn phải hoàn hoặc sai người nhận: Chặn gửi; yêu cầu chỉnh thông tin.
  - 3.1. Mất kết nối, quá thời gian hoặc kết quả chưa rõ: Giữ Chờ xử lý và tra cứu giao dịch cũ trước khi gửi lại.
  - 4.1. Kết quả xác nhận thất bại: Không tăng số đã hoàn; giữ nghĩa vụ để xử lý tiếp.
  - 5.1. Thông báo lặp hoặc nhân viên bấm lại: Nhận diện cùng giao dịch, không tạo lần chuyển tiền thứ hai.
- **Tiền điều kiện:** Có yêu cầu hoàn hợp lệ, khoản thu gốc và số tiền còn được hoàn; nhân viên đủ quyền hoặc quản trị viên thực hiện.
- **Hậu điều kiện:** Giao dịch hoàn đã xác minh; số còn phải hoàn và trạng thái liên quan. Hoàn tiền thành công được lưu có chứng từ; yêu cầu chưa thành công vẫn còn nghĩa vụ.
- **Quy tắc liên quan:** Hoàn do hủy đơn và hoàn cọc dùng cùng chức năng, khác căn cứ tính. Dịch vụ thanh toán chỉ tham gia nhánh hoàn qua tích hợp. Kênh hỗ trợ trong phạm vi: thanh toán trực tuyến qua dịch vụ ngoài; thu bổ sung tại cửa hàng bằng tiền mặt hoặc chuyển khoản đã xác minh; hoàn qua dịch vụ thanh toán hoặc chuyển khoản có chứng từ. Không ghi thành công từ ảnh chuyển tiền hoặc thao tác gửi yêu cầu đơn thuần; tiền mặt có người nhận và chứng từ, chuyển khoản/cổng có mã tham chiếu và kết quả đối chiếu.
- **Quan hệ UML:** UC5.6 «extend» → UC5.4 tại EP5.4-HOAN khi còn phải hoàn tiền; UC5.6 «extend» → UC3.4 tại EP3.4-HOAN khi có khoản đã thu phải hoàn khi hủy

---

### UC5.7 – Điều chỉnh tài chính sau chốt

- **Use Case ID:** `UC5.7`
- **Tên Use Case:** Điều chỉnh tài chính sau chốt
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Sửa sai tài chính bằng hồ sơ điều chỉnh liên kết chứng từ gốc.
- **Dòng sự kiện chính:**
  1. Mở hồ sơ đã chốt. Hệ thống hiển thị bản gốc và chuỗi điều chỉnh trước đó.
  2. Nhập nội dung sai và số liệu đề nghị. Hệ thống kiểm tra căn cứ, quyền và khả năng tính trùng.
  3. Yêu cầu tính chênh lệch. Hệ thống tính số còn phải thu hoặc hoàn theo kết quả đúng và tiền thực tế.
  4. Duyệt điều chỉnh. Hệ thống lưu bản điều chỉnh mới, liên kết gốc và người phê duyệt.
  5. Thực hiện thu hoặc hoàn chênh lệch. Hệ thống theo dõi UC5.5 hoặc UC5.6 khi có nghĩa vụ tiền phù hợp.
  6. Xem kết quả xử lý. Hệ thống chốt bản điều chỉnh khi tiền đã giải quyết; bản gốc vẫn được giữ.
- **Dòng sự kiện phụ:**
  - 2.1. Thiếu chứng cứ hoặc khoản đã sửa ở bản khác.
    - 2.1.1. Không lập nghĩa vụ trùng; yêu cầu kiểm tra chuỗi điều chỉnh.
  - 4.1. Không duyệt.
    - 4.1.1. Lưu kết luận từ chối, không thay số liệu đã chốt.
  - 5.1. Giao dịch chênh lệch chưa thành công.
    - 5.1.1. Giữ điều chỉnh Chờ xử lý; không xóa lịch sử hoặc giả ghi đã trả.
- **Tiền điều kiện:** Có đối soát hoặc phụ phí đã chốt và bằng chứng cần điều chỉnh.
- **Hậu điều kiện:** Hồ sơ điều chỉnh, chênh lệch và giao dịch liên quan; dữ liệu trước/sau truy vết được. Có hồ sơ điều chỉnh truy được nguồn gốc và phần chênh lệch đã hoặc chưa giải quyết.
- **Quy tắc liên quan:** Không ghi đè hoặc xóa chứng từ gốc để sửa số liệu.

---

## PHÂN HỆ 6: QUẢN LÝ SẢN PHẨM VÀ THIẾT BỊ
*Danh mục sản phẩm, vòng đời thiết bị (Serial/Barcode), kiểm kê kho và bảo trì.*

### UC6.1 – Thêm danh mục sản phẩm

- **Use Case ID:** `UC6.1`
- **Tên Use Case:** Thêm danh mục sản phẩm
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tạo danh mục sản phẩm mới.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở chức năng quản lý danh mục sản phẩm và chọn thêm mới.
  2. Hệ thống hiển thị biểu mẫu.
  3. Quản trị viên nhập tên, mô tả và danh mục cha và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu bắt buộc, tính hợp lệ và thông tin trùng.
  5. Hệ thống lưu danh mục sản phẩm, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy thao tác.
    - 3.1.1. Không tạo dữ liệu; kết thúc Use Case.
  - 4.1. Thiếu thông tin, sai định dạng hoặc trùng mã.
    - 4.1.1. Thông báo trường cần sửa; quay lại bước 3.
  - 5.1. Lỗi lưu dữ liệu.
    - 5.1.1. Không ghi nhận tạo thành công; giữ thông tin nhập để thử lại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý danh mục sản phẩm.
- **Hậu điều kiện:** Danh mục sản phẩm được tạo khi hợp lệ; không có bản ghi dở dang khi thất bại.
- **Quy tắc liên quan:** Danh mục cha phải tồn tại; không tạo quan hệ cha con vòng lặp.
- **Quan hệ UML:** UC6.1 «include» → UC6.1.1

---

### UC6.2 – Cập nhật danh mục sản phẩm

- **Use Case ID:** `UC6.2`
- **Tên Use Case:** Cập nhật danh mục sản phẩm
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên chỉnh sửa danh mục sản phẩm.
- **Dòng sự kiện chính:**
  1. Quản trị viên tìm và chọn danh mục sản phẩm.
  2. Hệ thống hiển thị thông tin hiện tại.
  3. Quản trị viên sửa tên, mô tả và danh mục cha và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu, quyền và thay đổi phát sinh từ lần mở biểu mẫu.
  5. Hệ thống lưu thay đổi, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy sửa.
    - 3.1.1. Giữ dữ liệu cũ; kết thúc Use Case.
  - 4.1. Thông tin không hợp lệ hoặc trùng mã.
    - 4.1.1. Thông báo lỗi; quay lại bước 3.
  - 4.2. Đối tượng vừa được người khác cập nhật.
    - 4.2.1. Yêu cầu tải lại dữ liệu và kiểm tra trước khi lưu.
  - 5.1. Lưu thất bại.
    - 5.1.1. Thông báo chưa cập nhật; không ghi nhận thay đổi dở dang.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý danh mục sản phẩm. Đối tượng cần sửa tồn tại.
- **Hậu điều kiện:** Thông tin danh mục sản phẩm được cập nhật; chứng từ đã chốt và lịch sử liên quan được bảo toàn.
- **Quy tắc liên quan:** Không cho danh mục làm cha của chính nó hoặc tạo vòng lặp; việc ẩn danh mục cần bảo đảm quản lý được các sản phẩm liên quan.

---

### UC6.3 – Tra cứu danh mục sản phẩm

- **Use Case ID:** `UC6.3`
- **Tên Use Case:** Tra cứu danh mục sản phẩm
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tìm và xem danh mục sản phẩm.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở danh sách danh mục sản phẩm.
  2. Hệ thống hiển thị danh sách và bộ lọc.
  3. Quản trị viên nhập từ khóa hoặc chọn trạng thái cần tìm.
  4. Hệ thống trả các kết quả phù hợp.
  5. Quản trị viên chọn một kết quả; hệ thống hiển thị chi tiết và thông tin liên quan.
- **Dòng sự kiện phụ:**
  - 4.1. Không có kết quả.
    - 4.1.1. Hiển thị danh sách rỗng; cho phép đổi điều kiện tại bước 3.
  - 5.1. Đối tượng không tồn tại hoặc ngoài quyền.
    - 5.1.1. Thông báo không thể truy cập; quay về danh sách.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý danh mục sản phẩm.
- **Hậu điều kiện:** Thông tin danh mục sản phẩm được cung cấp đúng quyền; dữ liệu không thay đổi.

---

### UC6.4 – Thay đổi trạng thái danh mục

- **Use Case ID:** `UC6.4`
- **Tên Use Case:** Thay đổi trạng thái danh mục
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên quản lý tình trạng sử dụng của danh mục sản phẩm.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn danh mục sản phẩm.
  2. Hệ thống hiển thị trạng thái và thông tin liên quan.
  3. Quản trị viên chọn trạng thái mới, nhập lý do khi cần và xác nhận.
  4. Hệ thống kiểm tra điều kiện thay đổi và quyền thao tác.
  5. Hệ thống cập nhật trạng thái, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy xác nhận.
    - 3.1.1. Giữ trạng thái hiện tại; kết thúc Use Case.
  - 4.1. Trạng thái đã giống yêu cầu.
    - 4.1.1. Hiển thị hiện trạng; không ghi thay đổi trùng.
  - 4.2. Không đáp ứng điều kiện thay đổi.
    - 4.2.1. Thông báo lý do; giữ trạng thái hiện tại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý danh mục sản phẩm. Đối tượng cần xử lý tồn tại.
- **Hậu điều kiện:** Trạng thái danh mục sản phẩm được cập nhật khi hợp lệ; lịch sử vẫn được lưu.
- **Quy tắc liên quan:** Không cho danh mục làm cha của chính nó hoặc tạo vòng lặp; việc ẩn danh mục cần bảo đảm quản lý được các sản phẩm liên quan.

---

### UC6.5 – Thêm sản phẩm

- **Use Case ID:** `UC6.5`
- **Tên Use Case:** Thêm sản phẩm
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tạo sản phẩm mới.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở chức năng quản lý sản phẩm và chọn thêm mới.
  2. Hệ thống hiển thị biểu mẫu.
  3. Quản trị viên nhập mã, tên, danh mục, mô tả, hình ảnh, giá thuê và tiền cọc và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu bắt buộc, tính hợp lệ và thông tin trùng.
  5. Hệ thống lưu sản phẩm, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy thao tác.
    - 3.1.1. Không tạo dữ liệu; kết thúc Use Case.
  - 4.1. Thiếu thông tin, sai định dạng hoặc trùng mã.
    - 4.1.1. Thông báo trường cần sửa; quay lại bước 3.
  - 5.1. Lỗi lưu dữ liệu.
    - 5.1.1. Không ghi nhận tạo thành công; giữ thông tin nhập để thử lại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý sản phẩm.
- **Hậu điều kiện:** Sản phẩm được tạo khi hợp lệ; không có bản ghi dở dang khi thất bại.
- **Quan hệ UML:** UC6.5 «include» → UC6.5.1

---

### UC6.6 – Cập nhật sản phẩm

- **Use Case ID:** `UC6.6`
- **Tên Use Case:** Cập nhật sản phẩm
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên chỉnh sửa sản phẩm.
- **Dòng sự kiện chính:**
  1. Quản trị viên tìm và chọn sản phẩm.
  2. Hệ thống hiển thị thông tin hiện tại.
  3. Quản trị viên sửa mã, tên, danh mục, mô tả, hình ảnh, giá thuê và tiền cọc và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu, quyền và thay đổi phát sinh từ lần mở biểu mẫu.
  5. Hệ thống lưu thay đổi, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy sửa.
    - 3.1.1. Giữ dữ liệu cũ; kết thúc Use Case.
  - 4.1. Thông tin không hợp lệ hoặc trùng mã.
    - 4.1.1. Thông báo lỗi; quay lại bước 3.
  - 4.2. Đối tượng vừa được người khác cập nhật.
    - 4.2.1. Yêu cầu tải lại dữ liệu và kiểm tra trước khi lưu.
  - 5.1. Lưu thất bại.
    - 5.1.1. Thông báo chưa cập nhật; không ghi nhận thay đổi dở dang.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý sản phẩm. Đối tượng cần sửa tồn tại.
- **Hậu điều kiện:** Thông tin sản phẩm được cập nhật; chứng từ đã chốt và lịch sử liên quan được bảo toàn.
- **Quy tắc liên quan:** Giá và chính sách mới không sửa giá đã chốt của đơn cũ. Ngừng kinh doanh không xóa thiết bị và các nghĩa vụ thuê đang tồn tại; thiết bị thực tế được ghi tăng qua nhập kho.

---

### UC6.7 – Tra cứu sản phẩm

- **Use Case ID:** `UC6.7`
- **Tên Use Case:** Tra cứu sản phẩm
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tìm và xem sản phẩm.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở danh sách sản phẩm.
  2. Hệ thống hiển thị danh sách và bộ lọc.
  3. Quản trị viên nhập từ khóa hoặc chọn trạng thái cần tìm.
  4. Hệ thống trả các kết quả phù hợp.
  5. Quản trị viên chọn một kết quả; hệ thống hiển thị chi tiết và thông tin liên quan.
- **Dòng sự kiện phụ:**
  - 4.1. Không có kết quả.
    - 4.1.1. Hiển thị danh sách rỗng; cho phép đổi điều kiện tại bước 3.
  - 5.1. Đối tượng không tồn tại hoặc ngoài quyền.
    - 5.1.1. Thông báo không thể truy cập; quay về danh sách.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý sản phẩm.
- **Hậu điều kiện:** Thông tin sản phẩm được cung cấp đúng quyền; dữ liệu không thay đổi.

---

### UC6.8 – Thay đổi trạng thái kinh doanh sản phẩm

- **Use Case ID:** `UC6.8`
- **Tên Use Case:** Thay đổi trạng thái kinh doanh sản phẩm
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên quản lý tình trạng sử dụng của sản phẩm.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn sản phẩm.
  2. Hệ thống hiển thị trạng thái và thông tin liên quan.
  3. Quản trị viên chọn trạng thái mới, nhập lý do khi cần và xác nhận.
  4. Hệ thống kiểm tra điều kiện thay đổi và quyền thao tác.
  5. Hệ thống cập nhật trạng thái, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy xác nhận.
    - 3.1.1. Giữ trạng thái hiện tại; kết thúc Use Case.
  - 4.1. Trạng thái đã giống yêu cầu.
    - 4.1.1. Hiển thị hiện trạng; không ghi thay đổi trùng.
  - 4.2. Không đáp ứng điều kiện thay đổi.
    - 4.2.1. Thông báo lý do; giữ trạng thái hiện tại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý sản phẩm. Đối tượng cần xử lý tồn tại.
- **Hậu điều kiện:** Trạng thái sản phẩm được cập nhật khi hợp lệ; lịch sử vẫn được lưu.
- **Quy tắc liên quan:** Giá và chính sách mới không sửa giá đã chốt của đơn cũ. Ngừng kinh doanh không xóa thiết bị và các nghĩa vụ thuê đang tồn tại; thiết bị thực tế được ghi tăng qua nhập kho.

---

### UC6.9 – Tra cứu thiết bị và lịch sử sử dụng

- **Use Case ID:** `UC6.9`
- **Tên Use Case:** Tra cứu thiết bị và lịch sử sử dụng
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Tra cứu vòng đời từng vật phẩm để phục vụ giao nhận, kiểm kê và bảo trì.
- **Dòng sự kiện chính:**
  1. Mở danh sách thiết bị. Hệ thống hiển thị bộ lọc và dữ liệu trong quyền.
  2. Nhập điều kiện tra cứu. Hệ thống trả danh sách mã phù hợp.
  3. Chọn một vật phẩm. Hệ thống hiển thị sản phẩm, nguồn nhập và tình trạng thực tế.
  4. Mở lịch sử hoặc lịch phân công. Hệ thống hiển thị phiếu nhập, giao nhận, bảo trì và các lần biến động.
  5. Mở chứng từ liên quan. Hệ thống kiểm tra quyền riêng của chứng từ trước khi hiển thị.
  - Chi tiết thiết bị phân biệt sản phẩm hiện tại với dòng nhập nguồn; cho xem lịch sử điều chuyển, mã sản phẩm trước/sau và lý do, không ghi đè nguồn nhập ban đầu.
- **Dòng sự kiện phụ:**
  - 2.1. Không có kết quả.
    - 2.1.1. Hiển thị rỗng, không tự tạo vật phẩm.
  - 3.1. Mã không tồn tại.
    - 3.1.1. Thông báo không tìm được hồ sơ.
  - 5.1. Chứng từ ngoài quyền.
    - 5.1.1. Không cung cấp phần dữ liệu bị hạn chế; việc đã xem thiết bị không tự cấp quyền tài chính.
- **Tiền điều kiện:** Người dùng nội bộ đã đăng nhập và có quyền tra cứu.
- **Hậu điều kiện:** Hồ sơ vòng đời thiết bị; tra cứu không thay trạng thái hoặc cam kết. Người dùng truy được vòng đời vật phẩm; thao tác xem không đổi trạng thái.
- **Quy tắc liên quan:** Thiết bị sẵn sàng về tình trạng vẫn có thể đã được phân công cho lịch tương lai.

---

### UC6.10 – Kiểm kê và đề nghị điều chỉnh kho

- **Use Case ID:** `UC6.10`
- **Tên Use Case:** Kiểm kê và đề nghị điều chỉnh kho
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Đối chiếu từng thiết bị giữa hồ sơ và thực tế, lập đề nghị sửa sai có bằng chứng.
- **Dòng sự kiện chính:**
  1. Chọn phạm vi và bắt đầu kiểm kê. Hệ thống lấy danh sách cùng trạng thái tại thời điểm đối chiếu.
  2. Đối chiếu từng mã thực tế. Hệ thống cho ghi nhận kết quả, tách thiết bị đang thuê khỏi đồ phải có tại kho.
  3. Ghi phần chênh lệch. Hệ thống lưu mã, tình trạng hồ sơ, tình trạng thực tế và chứng cứ.
  4. Kiểm tra lại biến động trong lúc kiểm kê. Hệ thống hiển thị giao nhận mới để tránh coi biến động hợp lệ là sai lệch.
  5. Gửi kết quả. Hệ thống lưu biên bản; có sai lệch thì tạo đề nghị Chờ duyệt.
  6. Theo dõi xử lý. Hệ thống hiển thị kết quả UC6.11; đề nghị chưa duyệt không tác động kho.
- **Dòng sự kiện phụ:**
  - 2.1. Thiết bị vắng vì đang thuê hợp lệ.
    - 2.1.1. Đánh dấu đã đối chiếu, không lập mất kho.
  - 3.1. Không rõ nguyên nhân.
    - 3.1.1. Giữ chờ xác minh, không tự ghi giảm số thiết bị.
  - 5.1. Không có sai lệch.
    - 5.1.1. Lưu kiểm kê, không tạo phiếu điều chỉnh rỗng.
- **Tiền điều kiện:** Có danh sách thiết bị tại thời điểm kiểm kê; người thực hiện có quyền.
- **Hậu điều kiện:** Biên bản kiểm kê và phiếu đề nghị điều chỉnh khi có căn cứ. Có kết quả kiểm kê và đề nghị điều chỉnh nếu cần; chưa thay đổi kho từ phiếu chưa duyệt.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR04 BR18 BR22.
- **Quan hệ UML:** UC6.10 «include» → UC6.10.1

---

### UC6.11 – Duyệt điều chỉnh kho

- **Use Case ID:** `UC6.11`
- **Tên Use Case:** Duyệt điều chỉnh kho
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Phê duyệt thay đổi kho đúng căn cứ và bảo vệ các cam kết thuê liên quan.
- **Dòng sự kiện chính:**
  1. Mở phiếu điều chỉnh. Hệ thống hiển thị nội dung, người lập và bằng chứng.
  2. Kiểm tra từng thiết bị. Hệ thống đối chiếu tình trạng hiện tại và chứng từ nguồn.
  3. Kiểm tra ảnh hưởng lịch thuê. Hệ thống hiển thị cam kết cần giải quyết trước khi điều chỉnh.
  4. Chọn quyết định và nhập lý do. Hệ thống kiểm tra thẩm quyền và điều kiện áp dụng.
  5. Xác nhận duyệt nếu hợp lệ. Hệ thống cập nhật đúng phạm vi phiếu cùng lịch sử trước/sau một lần.
  6. Xem kết quả. Hệ thống thông báo người lập và cho tra cứu dấu vết.
- **Dòng sự kiện phụ:**
  - 2.1. Thiết bị đang ở khách hoặc có lịch chưa được xử lý.
    - 2.1.1. Chặn giảm hoặc loại bỏ, yêu cầu thu hồi/thay thế hợp lệ.
  - 4.1. Chưa đủ chứng cứ.
    - 4.1.1. Trả bổ sung hoặc từ chối; dữ liệu kho giữ nguyên.
  - 5.1. Phiếu đã duyệt hoặc bị thay đổi.
    - 5.1.1. Không áp dụng lại; tải kết quả mới nhất.
- **Tiền điều kiện:** Có phiếu điều chỉnh chờ duyệt và bằng chứng đối chiếu.
- **Hậu điều kiện:** Kết luận duyệt và biến động thiết bị có truy vết; không thay thế chứng từ nhập/giao nhận. Kho được điều chỉnh có căn cứ hoặc giữ nguyên khi chưa duyệt.
- **Quy tắc liên quan:** Mua hàng mới dùng phiếu nhập; nhận đồ thuê về dùng phiếu nhận trả, không thay bằng điều chỉnh để bỏ qua chứng từ.
- **Quan hệ UML:** UC6.11 «include» → UC6.11.1

---

### UC6.12 – Lập và theo dõi bảo trì

- **Use Case ID:** `UC6.12`
- **Tên Use Case:** Lập và theo dõi bảo trì
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Đưa thiết bị cần xử lý ra khỏi khả dụng và theo dõi công việc bảo trì.
- **Dòng sự kiện chính:**
  1. Chọn thiết bị cần xử lý. Hệ thống hiển thị tình trạng và phiếu bảo trì đang mở.
  2. Nhập lỗi, bằng chứng, thời gian. Hệ thống kiểm tra dữ liệu và khả năng trùng sự việc.
  3. Xác nhận lập phiếu. Hệ thống lưu phiếu, chuyển bảo trì và loại khỏi khả dụng chắc chắn.
  4. Kiểm tra cảnh báo lịch. Hệ thống hiển thị các đơn tương lai cần thay vật phẩm.
  5. Cập nhật công việc, chi phí và tiến độ. Hệ thống lưu các lần xử lý theo thời gian.
  6. Gửi kết quả đề nghị nghiệm thu. Hệ thống chuyển xử lý UC6.13, chưa tự đưa thiết bị về Sẵn sàng.
- **Dòng sự kiện phụ:**
  - 1.1. Thiết bị vẫn ở khách.
    - 1.1.1. Chưa ghi đã vào sửa tại kho; thực hiện nhận trả hoặc thu hồi trước.
  - 2.1. Đã có phiếu cùng sự việc.
    - 2.1.1. Mở phiếu hiện có thay vì tạo trùng.
  - 4.1. Ảnh hưởng đơn xác nhận.
    - 4.1.1. Yêu cầu xử lý thay thế, không tự xóa cam kết.
  - 6.1. Đến ngày dự kiến nhưng chưa nghiệm thu.
    - 6.1.1. Giữ bảo trì, không tự tăng khả dụng.
- **Tiền điều kiện:** Thiết bị tồn tại và có nhu cầu vệ sinh hoặc sửa chữa.
- **Hậu điều kiện:** Phiếu bảo trì, lịch sử công việc và cảnh báo lịch bị ảnh hưởng. Có hồ sơ bảo trì và trạng thái phù hợp; chưa tự đưa lại thiết bị vào cho thuê theo ngày dự kiến.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR04 BR18 BR20 BR22. Thay đổi trạng thái phải có phiếu/căn cứ và quyền tương ứng; không cho tự chuyển Sẵn sàng khi đang thuê, chưa kiểm tra xong hoặc còn phiếu bảo trì chưa nghiệm thu.
- **Quan hệ UML:** UC6.12 «include» → UC6.12.1

---

### UC6.13 – Nghiệm thu bảo trì

- **Use Case ID:** `UC6.13`
- **Tên Use Case:** Nghiệm thu bảo trì
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Xác nhận thiết bị sau xử lý đã đủ điều kiện phục vụ trở lại.
- **Dòng sự kiện chính:**
  1. Mở phiếu cần nghiệm thu. Hệ thống hiển thị lỗi, công việc và chi phí đã ghi.
  2. Kiểm tra thực tế vật phẩm. Hệ thống cho ghi kết quả từng nội dung kiểm tra.
  3. Nhập kết luận và ghi chú. Hệ thống kiểm tra đầy đủ căn cứ nghiệm thu.
  4. Xác nhận đạt. Hệ thống đóng phiếu, lưu người và thời điểm, cập nhật Sẵn sàng.
  5. Xem khả năng bố trí tiếp. Hệ thống đối chiếu lịch đã cam kết; Sẵn sàng không xóa lịch phân công.
- **Dòng sự kiện phụ:**
  - 3.1. Chưa đạt.
    - 3.1.1. Giữ bảo trì và ghi công việc cần bổ sung.
  - 3.2. Không thể sửa.
    - 3.2.1. Đề nghị quản trị xử lý UC6.14; không đánh dấu đạt.
  - 4.1. Phiếu đã đóng.
    - 4.1.1. Không tạo nghiệm thu hoặc tăng khả dụng lần hai.
- **Tiền điều kiện:** Thiết bị có phiếu bảo trì và kết quả xử lý để kiểm tra.
- **Hậu điều kiện:** Kết luận nghiệm thu và tình trạng vật phẩm, giữ toàn bộ lịch sử bảo trì. Thiết bị chỉ trở lại phục vụ sau nghiệm thu đạt; lịch sử bảo trì vẫn được giữ.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR04 BR18 BR22.

---

### UC6.14 – Ngừng sử dụng thiết bị

- **Use Case ID:** `UC6.14`
- **Tên Use Case:** Ngừng sử dụng thiết bị
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Loại thiết bị không còn phục vụ khỏi kinh doanh và bảo toàn lịch sử.
- **Dòng sự kiện chính:**
  1. Mở thiết bị, chọn ngừng sử dụng. Hệ thống hiển thị vòng đời và tình trạng hiện tại.
  2. Nhập lý do và chứng cứ. Hệ thống kiểm tra căn cứ, thẩm quyền quản trị.
  3. Xem ảnh hưởng. Hệ thống liệt kê đơn đang thuê và phân công tương lai.
  4. Hoàn tất xử lý cam kết, xác nhận. Hệ thống kiểm tra lại điều kiện trước khi đổi trạng thái.
  5. Xem kết quả. Hệ thống lưu Ngừng sử dụng, loại khỏi khả dụng và giữ mã cùng lịch sử.
- **Dòng sự kiện phụ:**
  - 3.1. Vật phẩm chưa thu hồi từ khách.
    - 3.1.1. Không dùng ngừng sử dụng để xóa nghĩa vụ trả hoặc mất.
  - 3.2. Lịch tương lai chưa thay được đồ.
    - 3.2.1. Chặn xác nhận cho tới khi xử lý cam kết.
  - 4.1. Đã ngừng dùng.
    - 4.1.1. Trả hiện trạng, không tạo biến động lặp.
- **Tiền điều kiện:** Thiết bị có căn cứ loại khỏi kinh doanh; quản trị viên có quyền.
- **Hậu điều kiện:** Trạng thái ngừng dùng và nhật ký; không xóa nguồn nhập, giao nhận hoặc bảo trì. Thiết bị ngừng phục vụ; mã, nguồn nhập, giao nhận và lịch sử vẫn được lưu.
- **Quy tắc liên quan:** Không mở rộng sang nghiệp vụ kế toán bán thanh lý ngoài phạm vi báo cáo.

---

### UC6.15 – Điều chuyển thiết bị sang sản phẩm khác

- **Use Case ID:** `UC6.15`
- **Tên Use Case:** Điều chuyển thiết bị sang sản phẩm khác
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Điều chuyển thiết bị sang sản phẩm khác trong phạm vi quyền của người sử dụng.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn thiết bị, xem sản phẩm hiện tại, nguồn nhập, tình trạng và lịch phân công.
  2. Chọn sản phẩm đích, nhập lý do và căn cứ tình trạng; hệ thống đối chiếu tính phù hợp.
  3. Hệ thống kiểm tra thiết bị đang thuê và các đơn đã cam kết; hiển thị đơn bị ảnh hưởng.
  4. Nếu có phân công bị ảnh hưởng, giải quyết thay mã cùng sản phẩm đã cam kết trước; chưa xử lý thì chưa cho điều chuyển.
  5. Quản trị viên xác nhận; hệ thống đổi sản phẩm hiện tại, lưu trước/sau, người thực hiện, thời điểm và lý do một lần.
  6. Giữ nguyên mã thiết bị, dòng nhập nguồn, giá nhập và lịch sử; cập nhật khả dụng theo sản phẩm hiện tại, không sửa giá/chính sách đơn cũ.
- **Dòng sự kiện phụ:**
  - 2.1. Sản phẩm đích sai loại hoặc ngừng kinh doanh: từ chối, yêu cầu chọn lại.
  - 3.1. Thiết bị đang thuê/chưa thu hồi hoặc lịch chưa thay thế: chặn điều chuyển.
  - 5.1. Dữ liệu vừa đổi hoặc yêu cầu lặp: đối chiếu lại; không tạo lịch sử trùng.
  - 5.2. Lỗi lưu: giữ sản phẩm cũ và dữ liệu lịch sử.
- **Tiền điều kiện:** Quản trị viên có quyền; thiết bị và sản phẩm đích tồn tại, sản phẩm đích phù hợp loại thiết bị.
- **Hậu điều kiện:** Thiết bị thuộc sản phẩm hiện tại mới có lịch sử điều chuyển; nguồn nhập và chứng từ cũ không đổi.

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 6
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC6.1.1 – Kiểm tra cấu trúc danh mục

- **Use Case ID:** `UC6.1.1`
- **Tên Use Case:** Kiểm tra cấu trúc danh mục
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC6.1.
- **Dòng sự kiện chính:**
  1. Kiểm tra danh mục cha nếu có.
  2. Đối chiếu cấu trúc và mã định danh.
  3. Cho phép lưu khi cấu trúc hợp lệ.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC6.1; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Không tạo quan hệ danh mục vòng lặp hoặc tham chiếu cha không tồn tại.

---

### UC6.5.1 – Kiểm tra danh mục giá thuê và cọc

- **Use Case ID:** `UC6.5.1`
- **Tên Use Case:** Kiểm tra danh mục giá thuê và cọc
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC6.5.
- **Dòng sự kiện chính:**
  1. Đối chiếu danh mục và mã sản phẩm.
  2. Kiểm tra các giá trị giá thuê, cọc và thông tin bắt buộc.
  3. Trả lỗi cụ thể hoặc cho phép lưu sản phẩm.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC6.5; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Chỉ sản phẩm có dữ liệu hợp lệ được lưu.

---

### UC6.10.1 – Đối chiếu kiểm kê thực tế

- **Use Case ID:** `UC6.10.1`
- **Tên Use Case:** Đối chiếu kiểm kê thực tế
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC6.10.
- **Dòng sự kiện chính:**
  1. Nhân viên ghi thiết bị và tình trạng thực kiểm.
  2. Đối chiếu số liệu hệ thống với bằng chứng thực tế.
  3. Lập đề nghị giải quyết chênh lệch nếu có.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC6.10; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Có kết quả kiểm kê; chưa tự điều chỉnh tồn kho khi chưa được duyệt.

---

### UC6.11.1 – Kiểm tra ảnh hưởng lịch thuê

- **Use Case ID:** `UC6.11.1`
- **Tên Use Case:** Kiểm tra ảnh hưởng lịch thuê
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC6.11.
- **Dòng sự kiện chính:**
  1. Xem đề nghị điều chỉnh và thiết bị liên quan.
  2. Kiểm tra đơn đang thuê và lịch đã cam kết.
  3. Chỉ duyệt khi tác động đã được giải quyết hợp lệ.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC6.11; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Không làm mất thiết bị đang thuê hoặc phá vỡ cam kết chưa được xử lý.

---

### UC6.12.1 – Loại thiết bị bảo trì khỏi khả dụng

- **Use Case ID:** `UC6.12.1`
- **Tên Use Case:** Loại thiết bị bảo trì khỏi khả dụng
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC6.12.
- **Dòng sự kiện chính:**
  1. Xác định mã thiết bị cần bảo trì.
  2. Đối chiếu nghĩa vụ thuê liên quan và xử lý trước khi chuyển trạng thái.
  3. Ghi trạng thái bảo trì để thiết bị không được phân công mới.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC6.12; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Thiết bị bảo trì không tính là sẵn sàng; ngày dự kiến xong chưa bảo đảm khả dụng.

---

## PHÂN HỆ 7: QUẢN LÝ NHÀ CUNG CẤP VÀ NHẬP HÀNG
*Quản lý đối tác cung ứng, phiếu nhập kho, kiểm định hàng hóa và kích hoạt thiết bị.*

### UC7.1 – Thêm nhà cung cấp

- **Use Case ID:** `UC7.1`
- **Tên Use Case:** Thêm nhà cung cấp
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tạo nhà cung cấp mới.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở chức năng quản lý nhà cung cấp và chọn thêm mới.
  2. Hệ thống hiển thị biểu mẫu.
  3. Quản trị viên nhập mã, tên và thông tin liên hệ và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu bắt buộc, tính hợp lệ và thông tin trùng.
  5. Hệ thống lưu nhà cung cấp, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy thao tác.
    - 3.1.1. Không tạo dữ liệu; kết thúc Use Case.
  - 4.1. Thiếu thông tin, sai định dạng hoặc trùng mã.
    - 4.1.1. Thông báo trường cần sửa; quay lại bước 3.
  - 5.1. Lỗi lưu dữ liệu.
    - 5.1.1. Không ghi nhận tạo thành công; giữ thông tin nhập để thử lại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý nhà cung cấp.
- **Hậu điều kiện:** Nhà cung cấp được tạo khi hợp lệ; không có bản ghi dở dang khi thất bại.

---

### UC7.2 – Cập nhật nhà cung cấp

- **Use Case ID:** `UC7.2`
- **Tên Use Case:** Cập nhật nhà cung cấp
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên chỉnh sửa nhà cung cấp.
- **Dòng sự kiện chính:**
  1. Quản trị viên tìm và chọn nhà cung cấp.
  2. Hệ thống hiển thị thông tin hiện tại.
  3. Quản trị viên sửa mã, tên và thông tin liên hệ và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu, quyền và thay đổi phát sinh từ lần mở biểu mẫu.
  5. Hệ thống lưu thay đổi, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy sửa.
    - 3.1.1. Giữ dữ liệu cũ; kết thúc Use Case.
  - 4.1. Thông tin không hợp lệ hoặc trùng mã.
    - 4.1.1. Thông báo lỗi; quay lại bước 3.
  - 4.2. Đối tượng vừa được người khác cập nhật.
    - 4.2.1. Yêu cầu tải lại dữ liệu và kiểm tra trước khi lưu.
  - 5.1. Lưu thất bại.
    - 5.1.1. Thông báo chưa cập nhật; không ghi nhận thay đổi dở dang.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý nhà cung cấp. Đối tượng cần sửa tồn tại.
- **Hậu điều kiện:** Thông tin nhà cung cấp được cập nhật; chứng từ đã chốt và lịch sử liên quan được bảo toàn.
- **Quy tắc liên quan:** Nhà cung cấp ngừng hợp tác không được dùng lập hoặc xác nhận phiếu nhập mới; lịch sử phiếu đã xác nhận được giữ nguyên.

---

### UC7.3 – Tra cứu nhà cung cấp

- **Use Case ID:** `UC7.3`
- **Tên Use Case:** Tra cứu nhà cung cấp
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Cho phép nhân viên và quản trị viên tìm và xem nhà cung cấp theo quyền được cấp.
- **Dòng sự kiện chính:**
  1. Người thao tác mở danh sách nhà cung cấp.
  2. Hệ thống hiển thị danh sách và bộ lọc.
  3. Người thao tác nhập từ khóa hoặc chọn trạng thái cần tìm.
  4. Hệ thống trả các kết quả phù hợp.
  5. Người thao tác chọn một kết quả; hệ thống hiển thị chi tiết và thông tin liên quan.
  - Hồ sơ nhà cung cấp hiển thị phiếu nhập đã xác nhận, sản phẩm từng nhập, thời điểm, số thiết bị chấp nhận và tổng giá trị; cho mở chứng từ theo quyền. Phiếu nháp/hủy không cộng như hàng thực nhập.
- **Dòng sự kiện phụ:**
  - 4.1. Không có kết quả.
    - 4.1.1. Hiển thị danh sách rỗng; cho phép đổi điều kiện tại bước 3.
  - 5.1. Đối tượng không tồn tại hoặc ngoài quyền.
    - 5.1.1. Thông báo không thể truy cập; quay về danh sách.
- **Tiền điều kiện:** Nhân viên hoặc quản trị viên đã đăng nhập và có quyền tra cứu nhà cung cấp.
- **Hậu điều kiện:** Thông tin nhà cung cấp được cung cấp đúng quyền; dữ liệu không thay đổi.

---

### UC7.4 – Thay đổi tình trạng hợp tác

- **Use Case ID:** `UC7.4`
- **Tên Use Case:** Thay đổi tình trạng hợp tác
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên quản lý tình trạng sử dụng của nhà cung cấp.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn nhà cung cấp.
  2. Hệ thống hiển thị trạng thái và thông tin liên quan.
  3. Quản trị viên chọn trạng thái mới, nhập lý do khi cần và xác nhận.
  4. Hệ thống kiểm tra điều kiện thay đổi và quyền thao tác.
  5. Hệ thống cập nhật trạng thái, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy xác nhận.
    - 3.1.1. Giữ trạng thái hiện tại; kết thúc Use Case.
  - 4.1. Trạng thái đã giống yêu cầu.
    - 4.1.1. Hiển thị hiện trạng; không ghi thay đổi trùng.
  - 4.2. Không đáp ứng điều kiện thay đổi.
    - 4.2.1. Thông báo lý do; giữ trạng thái hiện tại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý nhà cung cấp. Đối tượng cần xử lý tồn tại.
- **Hậu điều kiện:** Trạng thái nhà cung cấp được cập nhật khi hợp lệ; lịch sử vẫn được lưu.
- **Quy tắc liên quan:** Nhà cung cấp ngừng hợp tác không được dùng lập hoặc xác nhận phiếu nhập mới; lịch sử phiếu đã xác nhận được giữ nguyên.

---

### UC7.5 – Lập phiếu nhập nháp

- **Use Case ID:** `UC7.5`
- **Tên Use Case:** Lập phiếu nhập nháp
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Ghi nhận hàng dự kiến mua từ nhà cung cấp.
- **Dòng sự kiện chính:**
  1. Người thao tác chọn lập phiếu nhập.
  2. Hệ thống hiển thị biểu mẫu và danh sách nhà cung cấp, sản phẩm được sử dụng.
  3. Người thao tác chọn nhà cung cấp, nhập sản phẩm, số lượng và đơn giá.
  4. Hệ thống kiểm tra dữ liệu, tính thành tiền và tổng giá trị phiếu.
  5. Người thao tác chọn lưu nháp; hệ thống lưu phiếu, người lập và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 4.1. Số lượng, đơn giá không hợp lệ hoặc nhà cung cấp ngừng hợp tác.
    - 4.1.1. Thông báo lỗi; quay lại bước 3.
  - 5.1. Hủy trước khi lưu.
    - 5.1.1. Không tạo phiếu; kết thúc Use Case.
  - 5.2. Lưu thất bại.
    - 5.2.1. Không tạo dữ liệu dở dang; thông báo để thử lại.
- **Tiền điều kiện:** Người thao tác có quyền lập phiếu nhập; nhà cung cấp còn hợp tác và sản phẩm đã được khai báo.
- **Hậu điều kiện:** Phiếu nhập ở trạng thái nháp; chưa ghi tăng thiết bị hoặc khả dụng.
- **Quy tắc liên quan:** Dòng cùng sản phẩm, đơn giá và tình trạng được gộp; khác đơn giá hoặc tình trạng thì tách dòng. Số lượng nguyên dương, đơn giá không âm; giá 0 phải có lý do. Giá nhập không tự thay thành giá thuê.
- **Quan hệ UML:** UC7.5 «include» → UC7.5.1

---

### UC7.6 – Sửa phiếu nhập nháp

- **Use Case ID:** `UC7.6`
- **Tên Use Case:** Sửa phiếu nhập nháp
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Điều chỉnh thông tin hàng dự kiến nhập trước khi xác nhận.
- **Dòng sự kiện chính:**
  1. Người thao tác mở phiếu nhập và chọn sửa.
  2. Hệ thống hiển thị nhà cung cấp và các dòng sản phẩm.
  3. Người thao tác cập nhật thông tin, thêm hoặc xóa dòng và chọn lưu.
  4. Hệ thống kiểm tra trạng thái phiếu, dữ liệu, nhà cung cấp và tính lại tổng tiền.
  5. Hệ thống lưu phiên bản sửa, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy chỉnh sửa.
    - 3.1.1. Giữ bản nháp cũ; kết thúc Use Case.
  - 4.1. Phiếu đã xác nhận hoặc bị hủy.
    - 4.1.1. Từ chối sửa; tải lại trạng thái hiện tại.
  - 4.2. Dữ liệu không hợp lệ.
    - 4.2.1. Thông báo lỗi; quay lại bước 3.
- **Tiền điều kiện:** Người thao tác có quyền sửa; phiếu nhập tồn tại và còn nháp.
- **Hậu điều kiện:** Phiếu nháp được cập nhật; tồn kho chưa thay đổi.

---

### UC7.7 – Kiểm tra và xác nhận nhập kho

- **Use Case ID:** `UC7.7`
- **Tên Use Case:** Kiểm tra và xác nhận nhập kho
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Xác nhận thiết bị cửa hàng thực sự nhận và tạo mã quản lý đúng một lần.
- **Dòng sự kiện chính:**
  1. Nhân viên mở phiếu và hàng thực nhận. Hệ thống hiển thị kế hoạch, chứng từ và dòng dự kiến.
  2. Nhân viên kiểm tra số lượng, chất lượng. Hệ thống ghi phần chấp nhận, từ chối và chênh lệch.
  3. Nhân viên xác định mã vật phẩm và tình trạng. Hệ thống kiểm tra trùng mã, đủ thông tin và số lượng khớp.
  4. Quản trị xem hồ sơ kiểm nhận. Hệ thống hiển thị tổng tiền theo lượng chấp nhận và cảnh báo nguồn cung.
  5. Quản trị xác nhận nhập. Hệ thống trong cùng lần ghi nhận: chốt phiếu, tạo đủ thiết bị và nguồn nhập; không ghi một phần.
  6. Xem kết quả nhập. Hệ thống hàng đạt thành Sẵn sàng; hàng lỗi được nhận chuyển bảo trì; phần bị từ chối không tạo thiết bị.
- **Dòng sự kiện phụ:**
  - 2.1. Giao thiếu, thừa hoặc có hàng lỗi.
    - 2.1.1. Ghi rõ quyết định nhận; nhiều đợt lập phiếu riêng.
  - 3.1. Mã trùng, thiếu dữ liệu hoặc nguồn ngừng hợp tác.
    - 3.1.1. Chặn xác nhận đến khi sửa hợp lệ.
  - 5.1. Lỗi giữa lúc tạo thiết bị.
    - 5.1.1. Không chốt phiếu hoặc tăng một phần kho; phục hồi để thực hiện lại an toàn.
  - 5.2. Gửi lặp xác nhận.
    - 5.2.1. Trả kết quả phiếu đã nhập, không sinh bộ mã mới.
- **Tiền điều kiện:** Có phiếu nhập nháp hợp lệ và hàng thực tế; nhà cung cấp đang hoạt động. Nhân viên có quyền kiểm nhận; chỉ quản trị viên có quyền xác nhận chốt nhập và tạo thiết bị trong phạm vi này.
- **Hậu điều kiện:** Phiếu Đã nhập kho, đủ vật phẩm thực nhận, giá và nguồn nhập; kho tăng đúng một lần. Phiếu đã xác nhận và thiết bị thực nhận được ghi nhận đúng một lần.
- **Quy tắc liên quan:** Chỉ hàng chấp nhận mới vào kho; hàng lỗi được nhận để xử lý phải ở trạng thái bảo trì. Giao nhiều đợt lập phiếu riêng cho từng đợt.
- **Quan hệ UML:** UC7.7 «include» → UC7.7.1; UC7.7.2 «extend» → UC7.7 tại EP7.7-HANGLOI khi có hàng không đạt khi kiểm tra nhập

---

### UC7.8 – Tra cứu phiếu nhập

- **Use Case ID:** `UC7.8`
- **Tên Use Case:** Tra cứu phiếu nhập
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Cho phép nhân sự cửa hàng tìm và xem chứng từ nhập hàng.
- **Dòng sự kiện chính:**
  1. Người thao tác mở danh sách phiếu nhập.
  2. Hệ thống hiển thị tiêu chí tìm theo mã, nhà cung cấp, thời gian và trạng thái.
  3. Người thao tác nhập điều kiện; hệ thống hiển thị kết quả.
  4. Người thao tác chọn phiếu; hệ thống hiển thị dòng hàng, giá trị, người thực hiện và lịch sử liên quan.
- **Dòng sự kiện phụ:**
  - 3.1. Không có phiếu phù hợp.
    - 3.1.1. Hiển thị danh sách rỗng; cho phép đổi bộ lọc.
  - 4.1. Phiếu không tồn tại hoặc ngoài quyền.
    - 4.1.1. Từ chối mở; quay về danh sách.
- **Tiền điều kiện:** Người thao tác có quyền tra cứu phiếu nhập.
- **Hậu điều kiện:** Phiếu được tra cứu đúng quyền; không thay đổi dữ liệu kho.

---

### UC7.9 – Hủy phiếu nhập nháp

- **Use Case ID:** `UC7.9`
- **Tên Use Case:** Hủy phiếu nhập nháp
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Loại bỏ yêu cầu nhập hàng chưa thực hiện.
- **Dòng sự kiện chính:**
  1. Người thao tác mở phiếu và chọn hủy.
  2. Hệ thống hiển thị thông tin phiếu và yêu cầu xác nhận.
  3. Người thao tác nhập lý do và xác nhận hủy.
  4. Hệ thống kiểm tra lại trạng thái, ghi nhận hủy và người thực hiện.
  5. Hệ thống hiển thị phiếu đã hủy.
- **Dòng sự kiện phụ:**
  - 3.1. Không xác nhận.
    - 3.1.1. Giữ phiếu nháp; kết thúc Use Case.
  - 4.1. Phiếu đã xác nhận nhập kho.
    - 4.1.1. Từ chối hủy nháp; hướng dẫn dùng xử lý sai lệch khi cần.
  - 4.2. Phiếu đã bị hủy.
    - 4.2.1. Trả trạng thái hiện có; không hủy lặp.
- **Tiền điều kiện:** Người thao tác có quyền hủy; phiếu còn ở trạng thái nháp.
- **Hậu điều kiện:** Phiếu nháp được đánh dấu hủy; tồn kho không thay đổi và lịch sử được giữ.

---

### UC7.10 – Xử lý sai lệch phiếu nhập

- **Use Case ID:** `UC7.10`
- **Tên Use Case:** Xử lý sai lệch phiếu nhập
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Điều chỉnh sai lệch phiếu đã nhập mà giữ nguyên chứng từ gốc và căn cứ thay đổi.
- **Dòng sự kiện chính:**
  1. Người phát hiện mở phiếu, lập đề nghị. Hệ thống hiển thị bản gốc và các lần điều chỉnh trước.
  2. Nhập nội dung sai, đề nghị đúng, lý do và bằng chứng. Hệ thống xác định điều chỉnh giá hay ảnh hưởng vật phẩm.
  3. Gửi yêu cầu. Hệ thống lưu Chờ duyệt; chưa sửa kho hoặc số liệu chốt.
  4. Quản trị kiểm tra chứng từ và cam kết. Hệ thống cảnh báo thiết bị đang thuê, quá hạn hoặc có lịch tương lai.
  5. Quản trị duyệt khi đủ căn cứ. Hệ thống lưu bản điều chỉnh và áp dụng phạm vi được duyệt một lần.
  6. Xem kết quả. Hệ thống giữ phiếu gốc, hiển thị trước/sau và cập nhật báo cáo có tách điều chỉnh.
- **Dòng sự kiện phụ:**
  - 2.1. Chỉ sai giá.
    - 2.1.1. Điều chỉnh giá trị có căn cứ; không tự thay số thiết bị.
  - 4.1. Đang thuê hoặc lịch cam kết chưa xử lý.
    - 4.1.1. Không giảm/loại thiết bị; yêu cầu giải quyết trước.
  - 4.2. Bằng chứng không đủ.
    - 4.2.1. Trả bổ sung hoặc từ chối, giữ dữ liệu gốc.
  - 5.1. Yêu cầu đã được áp dụng.
    - 5.1.1. Không điều chỉnh lần nữa.
- **Tiền điều kiện:** Có phiếu đã xác nhận và bằng chứng sai lệch. Nhân viên được lập đề nghị; quản trị viên duyệt và áp dụng điều chỉnh. Bị từ chối thì giữ phiếu và kho gốc, lưu lý do.
- **Hậu điều kiện:** Yêu cầu cùng quyết định duyệt, bản điều chỉnh và dấu vết liên kết chứng từ gốc. Yêu cầu có kết quả rõ ràng; phiếu gốc và lịch sử điều chỉnh được bảo toàn.
- **Quy tắc liên quan:** Không sửa âm thầm phiếu đã chốt; không tự hồi tố giá trị vào đơn thuê cũ.
- **Quan hệ UML:** UC7.10 «include» → UC7.10.1

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 7
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC7.5.1 – Kiểm tra nhà cung cấp và tính tiền nhập

- **Use Case ID:** `UC7.5.1`
- **Tên Use Case:** Kiểm tra nhà cung cấp và tính tiền nhập
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC7.5.
- **Dòng sự kiện chính:**
  1. Kiểm tra nhà cung cấp còn hợp tác và sản phẩm cần nhập.
  2. Kiểm tra số lượng, đơn giá và các dòng phiếu.
  3. Tính tổng tiền và lưu phiếu nháp.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC7.5; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Phiếu nháp có nguồn cung hợp lệ; chưa tăng tồn kho.

---

### UC7.7.1 – Tạo mã và ghi nhận thiết bị một lần

- **Use Case ID:** `UC7.7.1`
- **Tên Use Case:** Tạo mã và ghi nhận thiết bị một lần
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC7.7.
- **Dòng sự kiện chính:**
  1. Lấy lượng hàng thực được chấp nhận sau kiểm tra.
  2. Tạo mã thiết bị duy nhất cho lượng chấp nhận.
  3. Ghi thiết bị và chứng từ trong cùng lần xác nhận; chống ghi nhận lặp.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC7.7; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Quản trị viên đã yêu cầu xác nhận nhập; hệ thống tự tạo mã và ghi nhận kho theo lượng được chấp nhận. Nhân viên kiểm nhận không tự tăng kho.
- **Hậu điều kiện:** Chỉ lượng thực được nhận vào kho; không sinh thiết bị trùng.

---

### UC7.7.2 – Xử lý hàng nhập bị lỗi

- **Use Case ID:** `UC7.7.2`
- **Tên Use Case:** Xử lý hàng nhập bị lỗi
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC7.7.
- **Dòng sự kiện chính:**
  1. Nhân viên ghi lỗi và bằng chứng của phần hàng không đạt.
  2. Quản trị viên quyết định nhận để bảo trì hoặc từ chối.
  3. Ghi phần được nhận đúng trạng thái; phần từ chối không tăng kho.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC7.7; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Có hàng không đạt khi kiểm tra nhập.
- **Hậu điều kiện:** Hàng lỗi được phân loại; không đưa hàng cần bảo trì vào trạng thái sẵn sàng.

---

### UC7.10.1 – Lập bản điều chỉnh phiếu nhập

- **Use Case ID:** `UC7.10.1`
- **Tên Use Case:** Lập bản điều chỉnh phiếu nhập
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC7.10.
- **Dòng sự kiện chính:**
  1. Đối chiếu phiếu đã xác nhận với bằng chứng sai lệch.
  2. Ghi giá trị trước và sau, lý do, người đề nghị và quyết định.
  3. Áp dụng bản điều chỉnh hợp lệ, giữ liên kết phiếu gốc.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC7.10; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Phiếu gốc không bị sửa âm thầm; tác động điều chỉnh được ghi nhận có lịch sử.

---

## PHÂN HỆ 8: QUẢN LÝ CHÍNH SÁCH VÀ KHUYẾN MÃI
*Cấu hình quy định thuê mượn, phiên bản chính sách và các chiến dịch ưu đãi.*

### UC8.1 – Cấu hình chính sách

- **Use Case ID:** `UC8.1`
- **Tên Use Case:** Cấu hình chính sách
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Thiết lập quy tắc kinh doanh có phiên bản để các đơn áp dụng nhất quán.
- **Dòng sự kiện chính:**
  1. Mở chính sách. Hệ thống hiển thị cấu hình hiện hành và lịch sử phiên bản.
  2. Chọn nhóm, nhập thay đổi. Hệ thống kiểm tra miền giá trị và các trường phụ thuộc.
  3. Chọn thời điểm áp dụng. Hệ thống đối chiếu các mốc và cảnh báo điều kiện chồng lấn.
  4. Xem lại tác động. Hệ thống hiển thị nội dung cũ/mới; nêu phạm vi đơn mới áp dụng.
  5. Xác nhận lưu. Hệ thống tạo phiên bản có người và thời gian thay đổi.
  6. Mở đơn đã có nếu cần đối chiếu. Hệ thống hiển thị chính sách gắn với đơn, không lấy bản mới để tính hồi tố.
  - Chính sách bao gồm hạn giữ chỗ, giờ nhận/trả, hệ số phí trễ, bồi thường và phụ kiện, ngưỡng duyệt phí, mốc hủy và lịch nhắc khách. Hiển thị giá trị trước/sau, ngày hiệu lực và đơn vị; thay đổi chỉ áp dụng đơn mới, giữ chính sách đã lưu trên đơn cũ.
- **Dòng sự kiện phụ:**
  - 2.1. Giá trị âm hoặc khoảng hủy mâu thuẫn.
    - 2.1.1. Chặn lưu, chỉ rõ điều kiện cần sửa.
  - 5.1. Hai người sửa cùng cấu hình.
    - 5.1.1. Yêu cầu đối chiếu phiên bản hiện tại trước khi ghi đè.
  - 6.1. Đơn cũ đang xử lý.
    - 6.1.1. Giữ quy tắc đã lưu của đơn; ngoại lệ phải xử lý có căn cứ riêng.
- **Tiền điều kiện:** Quản trị viên có quyền cấu hình.
- **Hậu điều kiện:** Phiên bản chính sách cùng thời điểm hiệu lực và nhật ký. Chính sách mới sẵn sàng áp dụng đúng thời điểm; các đơn cũ giữ căn cứ tính đã ghi nhận.
- **Quy tắc liên quan:** Không tự đặt tỷ lệ hủy hoặc mức phạt cố định khi yêu cầu nghiệp vụ chưa quy định con số.
- **Quan hệ UML:** UC8.1 «include» → UC8.1.1

---

### UC8.2 – Thêm khuyến mãi

- **Use Case ID:** `UC8.2`
- **Tên Use Case:** Thêm khuyến mãi
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tạo khuyến mãi mới.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở chức năng quản lý khuyến mãi và chọn thêm mới.
  2. Hệ thống hiển thị biểu mẫu.
  3. Quản trị viên nhập mã, nội dung ưu đãi, thời gian, phạm vi áp dụng và giới hạn sử dụng và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu bắt buộc, tính hợp lệ và thông tin trùng.
  5. Hệ thống lưu khuyến mãi, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy thao tác.
    - 3.1.1. Không tạo dữ liệu; kết thúc Use Case.
  - 4.1. Thiếu thông tin, sai định dạng hoặc trùng mã.
    - 4.1.1. Thông báo trường cần sửa; quay lại bước 3.
  - 5.1. Lỗi lưu dữ liệu.
    - 5.1.1. Không ghi nhận tạo thành công; giữ thông tin nhập để thử lại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý khuyến mãi.
- **Hậu điều kiện:** Khuyến mãi được tạo khi hợp lệ; không có bản ghi dở dang khi thất bại.
- **Quy tắc liên quan:** Mã phần trăm hoặc số tiền có thời hạn, tiền thuê tối thiểu, phạm vi sản phẩm/danh mục, số lượt tổng và mỗi khách, mức giảm tối đa. Một mã/đơn; chỉ giảm phần tiền thuê đủ điều kiện, không giảm cọc hoặc vượt tiền thuê. Lượt giữ khi tạo đơn, dùng khi thu thành công, giải phóng khi hết hạn/hủy trước thanh toán; hủy sau thanh toán không tự trả lượt. Sửa cấu hình không hồi tố giá và điều kiện trên đơn đã chốt.
- **Quan hệ UML:** UC8.2 «include» → UC8.2.1

---

### UC8.3 – Cập nhật khuyến mãi

- **Use Case ID:** `UC8.3`
- **Tên Use Case:** Cập nhật khuyến mãi
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên chỉnh sửa khuyến mãi.
- **Dòng sự kiện chính:**
  1. Quản trị viên tìm và chọn khuyến mãi.
  2. Hệ thống hiển thị thông tin hiện tại.
  3. Quản trị viên sửa mã, nội dung ưu đãi, thời gian, phạm vi áp dụng và giới hạn sử dụng và chọn lưu.
  4. Hệ thống kiểm tra dữ liệu, quyền và thay đổi phát sinh từ lần mở biểu mẫu.
  5. Hệ thống lưu thay đổi, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy sửa.
    - 3.1.1. Giữ dữ liệu cũ; kết thúc Use Case.
  - 4.1. Thông tin không hợp lệ hoặc trùng mã.
    - 4.1.1. Thông báo lỗi; quay lại bước 3.
  - 4.2. Đối tượng vừa được người khác cập nhật.
    - 4.2.1. Yêu cầu tải lại dữ liệu và kiểm tra trước khi lưu.
  - 5.1. Lưu thất bại.
    - 5.1.1. Thông báo chưa cập nhật; không ghi nhận thay đổi dở dang.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý khuyến mãi. Đối tượng cần sửa tồn tại.
- **Hậu điều kiện:** Thông tin khuyến mãi được cập nhật; chứng từ đã chốt và lịch sử liên quan được bảo toàn.
- **Quy tắc liên quan:** Mỗi đơn chỉ áp dụng một ưu đãi hợp lệ vào tiền thuê; không giảm tiền cọc. Thay đổi không sửa mức giảm đã chốt trên đơn trước đó. Ngừng chương trình không tự kích hoạt lại chương trình hết hạn. Mã phần trăm hoặc số tiền có thời hạn, tiền thuê tối thiểu, phạm vi sản phẩm/danh mục, số lượt tổng và mỗi khách, mức giảm tối đa. Một mã/đơn; chỉ giảm phần tiền thuê đủ điều kiện, không giảm cọc hoặc vượt tiền thuê. Lượt giữ khi tạo đơn, dùng khi thu thành công, giải phóng khi hết hạn/hủy trước thanh toán; hủy sau thanh toán không tự trả lượt. Sửa cấu hình không hồi tố giá và điều kiện trên đơn đã chốt.
- **Quan hệ UML:** UC8.3 «include» → UC8.3.1

---

### UC8.4 – Tra cứu khuyến mãi

- **Use Case ID:** `UC8.4`
- **Tên Use Case:** Tra cứu khuyến mãi
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên tìm và xem khuyến mãi.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở danh sách khuyến mãi.
  2. Hệ thống hiển thị danh sách và bộ lọc.
  3. Quản trị viên nhập từ khóa hoặc chọn trạng thái cần tìm.
  4. Hệ thống trả các kết quả phù hợp.
  5. Quản trị viên chọn một kết quả; hệ thống hiển thị chi tiết và thông tin liên quan.
- **Dòng sự kiện phụ:**
  - 4.1. Không có kết quả.
    - 4.1.1. Hiển thị danh sách rỗng; cho phép đổi điều kiện tại bước 3.
  - 5.1. Đối tượng không tồn tại hoặc ngoài quyền.
    - 5.1.1. Thông báo không thể truy cập; quay về danh sách.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý khuyến mãi.
- **Hậu điều kiện:** Thông tin khuyến mãi được cung cấp đúng quyền; dữ liệu không thay đổi.

---

### UC8.5 – Ngừng chương trình khuyến mãi

- **Use Case ID:** `UC8.5`
- **Tên Use Case:** Ngừng chương trình khuyến mãi
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên quản lý tình trạng sử dụng của khuyến mãi.
- **Dòng sự kiện chính:**
  1. Quản trị viên chọn khuyến mãi.
  2. Hệ thống hiển thị trạng thái và thông tin liên quan.
  3. Quản trị viên chọn ngừng chương trình, nhập lý do và xác nhận.
  4. Hệ thống kiểm tra điều kiện thay đổi và quyền thao tác.
  5. Hệ thống cập nhật trạng thái, ghi nhật ký và hiển thị kết quả.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy xác nhận.
    - 3.1.1. Giữ trạng thái hiện tại; kết thúc Use Case.
  - 4.1. Trạng thái đã giống yêu cầu.
    - 4.1.1. Hiển thị hiện trạng; không ghi thay đổi trùng.
  - 4.2. Không đáp ứng điều kiện thay đổi.
    - 4.2.1. Thông báo lý do; giữ trạng thái hiện tại.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và có quyền quản lý khuyến mãi. Đối tượng cần xử lý tồn tại.
- **Hậu điều kiện:** Trạng thái khuyến mãi được cập nhật khi hợp lệ; lịch sử vẫn được lưu.
- **Quy tắc liên quan:** Mỗi đơn chỉ áp dụng một ưu đãi hợp lệ vào tiền thuê; không giảm tiền cọc. Thay đổi không sửa mức giảm đã chốt trên đơn trước đó. Ngừng chương trình không tự kích hoạt lại chương trình hết hạn.

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 8
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC8.1.1 – Kiểm tra và ghi phiên bản chính sách

- **Use Case ID:** `UC8.1.1`
- **Tên Use Case:** Kiểm tra và ghi phiên bản chính sách
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC8.1.
- **Dòng sự kiện chính:**
  1. Đối chiếu phiên bản hiện hành và thời điểm áp dụng.
  2. Kiểm tra giá trị cấu hình và thay đổi đồng thời.
  3. Lưu phiên bản mới và nhật ký; đơn cũ giữ chính sách đã chốt.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC8.1; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Có phiên bản có hiệu lực rõ ràng; không tính hồi tố cho đơn cũ.

---

### UC8.2.1 – Kiểm tra điều kiện khuyến mãi

- **Use Case ID:** `UC8.2.1`
- **Tên Use Case:** Kiểm tra điều kiện khuyến mãi
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC8.2.
- **Dòng sự kiện chính:**
  1. Kiểm tra mã, thời hạn, phạm vi và giới hạn sử dụng.
  2. Đối chiếu điều kiện giảm trên tiền thuê.
  3. Cho phép tạo chương trình khi dữ liệu hợp lệ.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC8.2; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Khuyến mãi hợp lệ được tạo; không giảm tiền cọc.

---

### UC8.3.1 – Kiểm tra ràng buộc ưu đãi đã chốt

- **Use Case ID:** `UC8.3.1`
- **Tên Use Case:** Kiểm tra ràng buộc ưu đãi đã chốt
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC8.3.
- **Dòng sự kiện chính:**
  1. Xem chương trình và các lượt đã áp dụng.
  2. Kiểm tra thay đổi đồng thời và ảnh hưởng tới đơn cũ.
  3. Lưu thay đổi chỉ trong phạm vi được phép.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC8.3; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Mức giảm đã chốt của đơn cũ được bảo toàn.

---

## PHÂN HỆ 9: QUẢN LÝ ĐÁNH GIÁ VÀ THÔNG BÁO
*Phản hồi khách hàng sau thuê, kiểm duyệt nội dung và hệ thống thông báo đa kênh.*

### UC9.1 – Gửi đánh giá sản phẩm

- **Use Case ID:** `UC9.1`
- **Tên Use Case:** Gửi đánh giá sản phẩm
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Ghi nhận phản hồi của khách đã hoàn tất trải nghiệm thuê đúng sản phẩm.
- **Dòng sự kiện chính:**
  1. Mở đơn hoàn tất, chọn đánh giá. Hệ thống hiển thị sản phẩm đủ điều kiện.
  2. Chọn sản phẩm, nhập điểm và nhận xét. Hệ thống kiểm tra dữ liệu, cho đính kèm ảnh nếu có.
  3. Gửi đánh giá. Hệ thống kiểm tra sở hữu, trạng thái đơn và bộ khách/đơn/sản phẩm duy nhất.
  4. Chờ lưu. Hệ thống ghi đánh giá hợp lệ gắn chứng từ thuê.
  5. Xem kết quả. Hệ thống hiển thị theo trạng thái kiểm duyệt; nội dung vi phạm có thể bị xử lý qua UC9.2.
- **Dòng sự kiện phụ:**
  - 1.1. Đơn chưa hoàn tất hoặc không thuộc khách.
    - 1.1.1. Từ chối gửi.
  - 2.1. Điểm ngoài 1–5 hoặc ảnh lỗi.
    - 2.1.1. Yêu cầu sửa; không ghi bản đánh giá dở dang.
  - 3.1. Đã có đánh giá cùng sản phẩm trong đơn.
    - 3.1.1. Không tạo thêm bản trùng dù bấm gửi nhiều lần.
- **Tiền điều kiện:** Khách đã đăng nhập và có đơn hoàn tất chứa sản phẩm cần đánh giá.
- **Hậu điều kiện:** Đánh giá, điểm và ảnh gắn đúng khách, đơn, sản phẩm. Đánh giá hợp lệ gắn đúng khách, sản phẩm và đơn thuê.
- **Quy tắc liên quan:** Việc công khai phụ thuộc trạng thái kiểm duyệt; không cho đánh giá sản phẩm chưa thuê. Mỗi khách có một đánh giá cho mỗi sản phẩm trong mỗi đơn hoàn tất; sao từ 1 đến 5. Quản trị viên được ẩn nội dung vi phạm kèm lý do, không sửa điểm hoặc viết thay khách.
- **Quan hệ UML:** UC9.1 «include» → UC9.1.1; UC9.1.2 «extend» → UC9.1 tại EP9.1-ANH khi khách chọn đính kèm ảnh

---

### UC9.2 – Kiểm duyệt đánh giá

- **Use Case ID:** `UC9.2`
- **Tên Use Case:** Kiểm duyệt đánh giá
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Xử lý nội dung đánh giá vi phạm mà không sửa lời hoặc điểm của khách.
- **Dòng sự kiện chính:**
  1. Mở danh sách đánh giá. Hệ thống hiển thị bộ lọc sản phẩm, thời gian và trạng thái.
  2. Chọn đánh giá cần xem xét. Hệ thống hiển thị nội dung gốc và căn cứ đủ điều kiện đánh giá.
  3. Chọn ẩn hoặc hiển thị, nhập lý do. Hệ thống kiểm tra quyền và nội dung lý do.
  4. Xác nhận quyết định. Hệ thống lưu trạng thái, người, thời điểm và lịch sử.
  5. Mở lại sản phẩm. Hệ thống hiển thị các đánh giá theo trạng thái công khai, không sửa nội dung gốc.
- **Dòng sự kiện phụ:**
  - 3.1. Chỉ vì điểm thấp mà không có vi phạm.
    - 3.1.1. Không có căn cứ ẩn; giữ đánh giá.
  - 3.2. Yêu cầu sửa điểm hoặc lời khách.
    - 3.2.1. Không cho sửa thay khách qua chức năng kiểm duyệt.
  - 4.1. Đã có trạng thái yêu cầu.
    - 4.1.1. Trả kết quả hiện tại; không lặp tác động.
- **Tiền điều kiện:** Có đánh giá cần xem xét; quản trị viên có quyền.
- **Hậu điều kiện:** Trạng thái công khai và nhật ký kiểm duyệt; bản gốc còn nguyên. Trạng thái hiển thị được cập nhật; nội dung gốc và lý do kiểm duyệt được lưu.
- **Quy tắc liên quan:** Điểm đánh giá thấp tự nó không phải lý do ẩn.
- **Quan hệ UML:** UC9.2 «include» → UC9.2.1

---

### UC9.3 – Xem thông báo

- **Use Case ID:** `UC9.3`
- **Tên Use Case:** Xem thông báo
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Cho người dùng theo dõi thông báo nghiệp vụ thuộc quyền của mình.
- **Dòng sự kiện chính:**
  1. Mở thông báo. Hệ thống lấy danh sách của người nhận hiện tại.
  2. Lọc hoặc chọn thông báo. Hệ thống hiển thị nội dung, thời điểm và đối tượng liên quan.
  3. Mở xem chi tiết. Hệ thống ghi đã đọc, không thay trạng thái đơn hay khoản tiền.
  4. Mở đường dẫn tới đơn/chứng từ. Hệ thống kiểm tra quyền truy cập đích ở thời điểm mở.
  5. Quay về danh sách. Hệ thống cập nhật trạng thái đọc và giữ các thông báo còn lại.
- **Dòng sự kiện phụ:**
  - 1.1. Chưa có thông báo.
    - 1.1.1. Hiển thị rỗng.
  - 2.1. Thông báo hoặc đối tượng ngoài quyền.
    - 2.1.1. Từ chối dữ liệu bị hạn chế.
  - 4.1. Đối tượng thay trạng thái sau lúc phát thông báo.
    - 4.1.1. Hiển thị trạng thái hiện tại; nội dung cũ vẫn là dấu vết của sự kiện lúc gửi.
- **Tiền điều kiện:** Người dùng đăng nhập và có quyền nhận thông báo tương ứng.
- **Hậu điều kiện:** Thông tin đã đọc và điều hướng đúng quyền; không tạo lại sự kiện nghiệp vụ. Người dùng đọc được thông báo thuộc phạm vi của mình.
- **Quy tắc liên quan:** Đây là phần tiếp nhận thông báo của nhóm chức năng tương ứng tại Chương 2. Phát thông báo khi nghiệp vụ đổi trạng thái là cơ chế tự động; gửi lỗi không hủy giao dịch đã thành công.
- **Quan hệ UML:** UC9.3.1 «extend» → UC9.3 tại EP9.3-DICH khi người dùng mở liên kết đích trong thông báo

---

### UC9.4 – Quản lý nội dung và gửi thông báo

- **Use Case ID:** `UC9.4`
- **Tên Use Case:** Quản lý nội dung và gửi thông báo
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Cho phép quản trị viên quản lý nội dung thông báo nghiệp vụ và gửi tới người nhận phù hợp.
- **Dòng sự kiện chính:**
  1. Quản trị viên mở phần quản lý thông báo.
  2. Hệ thống hiển thị thông tin nghiệp vụ liên quan và phạm vi người nhận được phép chọn.
  3. Quản trị viên nhập hoặc cập nhật nội dung, chọn người nhận và yêu cầu xem trước.
  4. Hệ thống kiểm tra nội dung, quyền người nhận đối với thông tin được gửi và hiển thị bản xem trước.
  5. Quản trị viên xác nhận gửi; hệ thống lưu thông báo, người thực hiện và kết quả gửi theo từng người nhận.
  6. Hệ thống hiển thị kết quả để quản trị viên theo dõi. Người nhận có thể xem thông báo trong UC9.3.
- **Dòng sự kiện phụ:**
  - 3.1. Hủy soạn thông báo.
    - 3.1.1. Không gửi; kết thúc Use Case.
  - 4.1. Nội dung thiếu hoặc người nhận không phù hợp.
    - 4.1.1. Thông báo lỗi; quay lại bước 3.
  - 5.1. Gửi không thành công tới một số người nhận.
    - 5.1.1. Lưu tình trạng gửi và cho phép thử lại có kiểm soát; không gửi trùng phần đã thành công.
- **Tiền điều kiện:** Quản trị viên đã đăng nhập và được cấp quyền quản lý thông báo.
- **Hậu điều kiện:** Thông báo và kết quả gửi được lưu; giao dịch nghiệp vụ liên quan không bị thay đổi khi gửi lỗi.
- **Quy tắc liên quan:** Thông báo tự động vẫn được phát theo sự kiện nghiệp vụ. Nội dung thông báo không thay thế trạng thái hiện tại của đơn hoặc chứng từ. Thông báo tự động phát khi xác nhận đơn, sẵn sàng nhận, sắp trả, quá hạn, phát sinh phụ phí, hoàn tiền và mời đánh giá. UC9.4 là thao tác quản trị viên chủ động quản lý/gửi; cơ chế tự động không cần quản trị viên bấm gửi mỗi lần. Lỗi gửi không đảo giao dịch, thử lại có giới hạn và tránh lặp cùng sự kiện/người nhận.
- **Quan hệ UML:** UC9.4 «include» → UC9.4.1

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 9
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC9.1.1 – Kiểm tra điều kiện và trùng đánh giá

- **Use Case ID:** `UC9.1.1`
- **Tên Use Case:** Kiểm tra điều kiện và trùng đánh giá
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC9.1.
- **Dòng sự kiện chính:**
  1. Đối chiếu quyền sở hữu đơn và trạng thái hoàn tất.
  2. Kiểm tra sản phẩm khách đã thuê và bộ khách đơn sản phẩm.
  3. Chỉ cho ghi đánh giá mới khi đủ điều kiện và chưa trùng.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC9.1; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Không đánh giá sản phẩm chưa thuê hoặc tạo đánh giá lặp.

---

### UC9.1.2 – Đính kèm ảnh đánh giá

- **Use Case ID:** `UC9.1.2`
- **Tên Use Case:** Đính kèm ảnh đánh giá
- **Tác nhân:** Khách hàng
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC9.1.
- **Dòng sự kiện chính:**
  1. Khách chọn ảnh kèm nhận xét.
  2. Hệ thống kiểm tra định dạng và giới hạn cho phép.
  3. Lưu ảnh hợp lệ cùng đánh giá.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC9.1; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Khách chọn đính kèm ảnh.
- **Hậu điều kiện:** Ảnh hợp lệ gắn với đánh giá; đánh giá vẫn có thể gửi không kèm ảnh.

---

### UC9.2.1 – Ghi quyết định và lý do kiểm duyệt

- **Use Case ID:** `UC9.2.1`
- **Tên Use Case:** Ghi quyết định và lý do kiểm duyệt
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC9.2.
- **Dòng sự kiện chính:**
  1. Quản trị viên xác định quyết định ẩn hoặc hiện theo căn cứ.
  2. Ghi lý do, người xử lý và thời điểm.
  3. Cập nhật trạng thái công khai, giữ nội dung và điểm gốc.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC9.2; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Có dấu vết kiểm duyệt; điểm thấp tự nó không phải căn cứ ẩn.

---

### UC9.4.1 – Kiểm tra người nhận thông báo

- **Use Case ID:** `UC9.4.1`
- **Tên Use Case:** Kiểm tra người nhận thông báo
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC9.4.
- **Dòng sự kiện chính:**
  1. Đối chiếu phạm vi người nhận và nội dung nghiệp vụ.
  2. Kiểm tra quyền gửi và quyền của người nhận với nội dung liên quan.
  3. Chốt danh sách hợp lệ trước khi gửi.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC9.4; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Thông báo chỉ gửi trong phạm vi được phép.

---

### UC9.3.1 – Kiểm tra quyền truy cập đích thông báo

- **Use Case ID:** `UC9.3.1`
- **Tên Use Case:** Kiểm tra quyền truy cập đích thông báo
- **Tác nhân:** Khách hàng, Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC9.3.
- **Dòng sự kiện chính:**
  1. Người dùng chọn liên kết đơn hoặc chứng từ trong thông báo.
  2. Kiểm tra quyền hiện tại đối với đối tượng đích.
  3. Hiển thị dữ liệu được phép hoặc từ chối truy cập.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC9.3; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Người dùng mở liên kết đích trong thông báo.
- **Hậu điều kiện:** Thông báo cũ không cấp thêm quyền hoặc làm thay đổi trạng thái đơn.

---

## PHÂN HỆ 10: BÁO CÁO VÀ TRA CỨU LỊCH SỬ
*Báo cáo ca trực, phân tích doanh thu dòng tiền, báo cáo nhập kho và audit log truy vết.*

### UC10.1 – Xem báo cáo vận hành

- **Use Case ID:** `UC10.1`
- **Tên Use Case:** Xem báo cáo vận hành
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Theo dõi khối lượng công việc và tình trạng phục vụ trong phạm vi vận hành.
- **Dòng sự kiện chính:**
  1. Mở báo cáo vận hành. Hệ thống hiển thị bộ lọc và phạm vi dữ liệu được xem.
  2. Chọn khoảng ngày và điều kiện. Hệ thống kiểm tra ngày hợp lệ.
  3. Yêu cầu tổng hợp. Hệ thống tính chỉ tiêu trên dữ liệu giao nhận, đơn và thiết bị.
  4. Mở chỉ tiêu cần xem. Hệ thống trả danh sách đơn hoặc thiết bị cấu thành con số.
  5. Chuyển tới hồ sơ chi tiết. Hệ thống kiểm tra quyền đích và hiển thị thời điểm tổng hợp.
  - Chỉ tiêu gồm đơn cần giao/trả theo giờ dự kiến trong kỳ; quá hạn tại thời điểm tổng hợp; chờ đối soát theo trạng thái hiện tại; lượt thuê đã bàn giao; số lượng thuê theo sản phẩm; số lần hỏng có kết luận theo thiết bị. Báo cáo hiển thị kỳ, thời điểm lấy số liệu và danh sách cấu thành; nhân viên chỉ xem phần vận hành được cấp quyền.
- **Dòng sự kiện phụ:**
  - 2.1. Ngày kết thúc trước bắt đầu.
    - 2.1.1. Không chạy báo cáo; yêu cầu sửa.
  - 3.1. Không có phát sinh.
    - 3.1.1. Hiển thị 0 và bộ lọc rõ ràng.
  - 4.1. Nhân viên mở dữ liệu tài chính không có quyền.
    - 4.1.1. Từ chối phần ngoài phạm vi; không suy diễn quyền từ quyền xem báo cáo.
- **Tiền điều kiện:** Người dùng có quyền xem báo cáo vận hành.
- **Hậu điều kiện:** Các chỉ tiêu vận hành và danh sách đối chiếu; không thay đổi chứng từ. Báo cáo phản ánh dữ liệu vận hành theo bộ lọc; không làm thay đổi giao dịch.
- **Quy tắc liên quan:** Các quy tắc dùng chung áp dụng: BR01 BR11 BR12 BR22.
- **Quan hệ UML:** UC10.1 «include» → UC10.1.1

---

### UC10.2 – Xem báo cáo doanh thu và dòng tiền

- **Use Case ID:** `UC10.2`
- **Tên Use Case:** Xem báo cáo doanh thu và dòng tiền
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Phân biệt doanh thu đã hoàn tất với luồng tiền thu, cọc và hoàn trong kỳ.
- **Dòng sự kiện chính:**
  1. Mở báo cáo tài chính. Hệ thống kiểm tra quyền quản trị.
  2. Chọn kỳ và nhóm chỉ tiêu. Hệ thống xác định mốc ngày tính phù hợp từng loại.
  3. Yêu cầu tổng hợp doanh thu. Hệ thống lấy đơn Hoàn tất theo ngày hoàn tất, tiền thuê sau giảm và phụ phí duyệt; trình bày phí hủy riêng.
  4. Xem dòng tiền. Hệ thống lấy ngày giao dịch thu/hoàn thành công, tách thuê, cọc và khoản liên quan.
  5. Mở số liệu chi tiết. Hệ thống hiển thị đơn, giao dịch và điều chỉnh cấu thành.
  6. Đối chiếu chênh lệch. Hệ thống giải thích khác biệt do ngày ghi nhận và khoản đang xử lý.
- **Dòng sự kiện phụ:**
  - 2.1. Kỳ sai hoặc bộ lọc không hợp lệ.
    - 2.1.1. Yêu cầu chọn lại.
  - 3.1. Khoản thu/hoàn còn chờ.
    - 3.1.1. Tách khỏi kết quả giao dịch thành công.
  - 5.1. Có điều chỉnh sau chốt.
    - 5.1.1. Cho xem bản gốc và điều chỉnh theo kỳ ghi nhận, tránh cộng lại toàn bộ đơn.
  - 4.1. Cọc đang giữ.
    - 4.1.1. Không cộng vào doanh thu thuê.
- **Tiền điều kiện:** Quản trị viên có quyền xem tài chính.
- **Hậu điều kiện:** Báo cáo doanh thu, phí hủy và dòng tiền có mốc ngày, đối chiếu được giao dịch. Quản trị viên xem được doanh thu và dòng tiền với căn cứ thời gian rõ ràng.
- **Quy tắc liên quan:** Cọc không phải doanh thu. Không lấy doanh thu trừ toàn bộ tiền mua thiết bị để gọi là lợi nhuận kế toán. Tỷ lệ hủy = số đơn Khách hủy/Cửa hàng hủy chia tổng đơn được tạo trong kỳ, tách Hết hạn; mẫu số 0 hiển thị không có dữ liệu. Khách quay lại = số khách có ít nhất hai lượt thuê hoàn tất tính đến cuối kỳ và có lượt hoàn tất trong kỳ. Các chỉ tiêu tổng hợp khách/doanh thu thuộc quyền quản trị viên. Tách các chỉ tiêu này khỏi báo cáo vận hành nhân viên nếu không được cấp quyền.
- **Quan hệ UML:** UC10.2 «include» → UC10.2.1

---

### UC10.3 – Xem báo cáo nhập hàng

- **Use Case ID:** `UC10.3`
- **Tên Use Case:** Xem báo cáo nhập hàng
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Tổng hợp số lượng và giá trị thiết bị thực nhập theo chứng từ đã xác nhận.
- **Dòng sự kiện chính:**
  1. Mở báo cáo nhập hàng. Hệ thống kiểm tra quyền và hiển thị bộ lọc.
  2. Chọn kỳ, nguồn cung hoặc sản phẩm. Hệ thống xác định tập phiếu theo ngày nhập thực tế.
  3. Yêu cầu tổng hợp. Hệ thống tính số phiếu, thiết bị và tổng giá trị theo lượng chấp nhận.
  4. Mở chi tiết chỉ tiêu. Hệ thống hiển thị các dòng phiếu và lịch sử đơn giá.
  5. Xem điều chỉnh liên quan. Hệ thống tách bản gốc, chênh lệch và kỳ áp dụng.
  6. Mở chứng từ đối chiếu. Hệ thống cung cấp phiếu và danh sách vật phẩm được sinh.
- **Dòng sự kiện phụ:**
  - 2.1. Khoảng ngày không hợp lệ.
    - 2.1.1. Không tổng hợp, yêu cầu sửa.
  - 3.1. Có phiếu nháp/hủy trong kết quả tìm.
    - 3.1.1. Không cộng như hàng đã nhận.
  - 5.1. Điều chỉnh được gửi nhiều lần.
    - 5.1.1. Chỉ tính bản đã duyệt và áp dụng đúng một lần.
  - 3.2. Không có phiếu phù hợp.
    - 3.2.1. Hiển thị tổng bằng 0.
- **Tiền điều kiện:** Quản trị viên có quyền xem nhập hàng.
- **Hậu điều kiện:** Báo cáo nhập có thể truy ngược về phiếu và thiết bị; không chứng minh công nợ đã thanh toán. Có báo cáo nhập hàng truy ngược được về chứng từ.
- **Quy tắc liên quan:** Giá trị nhập dựa trên hàng thực nhận được chấp nhận; báo cáo này không mặc nhiên chứng minh đã thanh toán nhà cung cấp.

---

### UC10.4 – Tra cứu nhật ký và lịch sử

- **Use Case ID:** `UC10.4`
- **Tên Use Case:** Tra cứu nhật ký và lịch sử
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Truy vết người thực hiện, thời điểm và nội dung biến động để giải thích nghiệp vụ.
- **Dòng sự kiện chính:**
  1. Mở lịch sử hoặc nhật ký. Hệ thống hiển thị loại dữ liệu được phép truy cập.
  2. Nhập mã tham chiếu và thời gian. Hệ thống kiểm tra điều kiện lọc.
  3. Yêu cầu tra cứu. Hệ thống trả các sự kiện đúng quyền theo thứ tự thời gian.
  4. Mở một sự kiện. Hệ thống hiển thị người, thời điểm, dữ liệu thay đổi và lý do.
  5. Mở chứng từ liên quan. Hệ thống kiểm tra quyền đích; giữ thao tác tra cứu ở chế độ đọc.
  - Kết quả truy vết thể hiện người thực hiện, thời điểm, lý do, dữ liệu trước/sau, mã đơn/thiết bị/chứng từ và liên kết các lần điều chỉnh; chỉ hiển thị loại dữ liệu theo quyền. Nhật ký không cho sửa/xóa qua chức năng tra cứu.
- **Dòng sự kiện phụ:**
  - 2.1. Bộ lọc sai.
    - 2.1.1. Yêu cầu sửa; không chạy phạm vi không xác định.
  - 3.1. Không có kết quả.
    - 3.1.1. Hiển thị rỗng và cho đổi điều kiện.
  - 4.1. Sự kiện hoặc chứng từ ngoài quyền.
    - 4.1.1. Từ chối phần bị hạn chế.
  - 4.2. Yêu cầu sửa/xóa nhật ký.
    - 4.2.1. Không cung cấp thao tác thay đổi qua chức năng tra cứu.
- **Tiền điều kiện:** Người dùng có quyền tra cứu loại lịch sử tương ứng.
- **Hậu điều kiện:** Danh sách sự kiện cùng căn cứ truy vết; nhật ký và chứng từ không thay đổi. Lịch sử được tra cứu mà không thay đổi bản ghi.
- **Quy tắc liên quan:** Nhân viên chỉ xem lịch sử phục vụ công việc được phân quyền; quản trị viên xem nhật ký quản trị. Không cho sửa hoặc xóa nhật ký qua chức năng tra cứu.
- **Quan hệ UML:** UC10.4 «include» → UC10.4.1; UC10.4.2 «extend» → UC10.4 tại EP10.4-CHUNGTU khi người dùng chọn chứng từ liên quan

---

### Phụ lục: Các Use Case hỗ trợ Phân hệ 10
*Các hành vi hỗ trợ hoặc mở rộng điều kiện («include» / «extend»).*

### UC10.1.1 – Lọc dữ liệu báo cáo vận hành

- **Use Case ID:** `UC10.1.1`
- **Tên Use Case:** Lọc dữ liệu báo cáo vận hành
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC10.1.
- **Dòng sự kiện chính:**
  1. Nhận khoảng ngày và điều kiện xem.
  2. Kiểm tra khoảng thời gian và phạm vi quyền.
  3. Tổng hợp các chỉ tiêu phù hợp từ dữ liệu giao nhận và thiết bị.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC10.1; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Kết quả nằm trong phạm vi được phép; không thay đổi chứng từ.

---

### UC10.2.1 – Phân biệt doanh thu và dòng tiền

- **Use Case ID:** `UC10.2.1`
- **Tên Use Case:** Phân biệt doanh thu và dòng tiền
- **Tác nhân:** Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC10.2.
- **Dòng sự kiện chính:**
  1. Kiểm tra quyền xem tài chính và kỳ báo cáo.
  2. Tổng hợp doanh thu theo ngày hoàn tất và dòng tiền theo ngày giao dịch.
  3. Tách tiền cọc, khoản chờ, phí hủy và điều chỉnh theo căn cứ.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC10.2; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Báo cáo không cộng cọc vào doanh thu và không gọi toàn bộ thu trừ nhập hàng là lợi nhuận.

---

### UC10.4.1 – Kiểm tra quyền tra cứu nhật ký

- **Use Case ID:** `UC10.4.1`
- **Tên Use Case:** Kiểm tra quyền tra cứu nhật ký
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi bắt buộc được sử dụng trong UC10.4.
- **Dòng sự kiện chính:**
  1. Nhận bộ lọc hoặc mã tham chiếu.
  2. Đối chiếu phạm vi nhật ký người dùng được xem.
  3. Trả sự kiện đúng quyền theo thứ tự thời gian.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC10.4; người tham gia có quyền đối với dữ liệu và thao tác tương ứng.
- **Hậu điều kiện:** Nhân viên chỉ thấy lịch sử phục vụ công việc; không có quyền sửa hoặc xóa nhật ký.

---

### UC10.4.2 – Mở chứng từ liên quan từ nhật ký

- **Use Case ID:** `UC10.4.2`
- **Tên Use Case:** Mở chứng từ liên quan từ nhật ký
- **Tác nhân:** Nhân viên, Quản trị viên
- **Tóm tắt:** Hành vi có điều kiện mở rộng UC10.4.
- **Dòng sự kiện chính:**
  1. Người dùng chọn chứng từ được tham chiếu.
  2. Hệ thống kiểm tra quyền tại thời điểm truy cập.
  3. Hiển thị chứng từ ở chế độ tra cứu.
- **Dòng sự kiện phụ:**
  - Nếu dữ liệu, quyền hoặc thao tác không hợp lệ: thông báo lỗi, không ghi kết quả thành công và quay về UC cơ sở để sửa hoặc kết thúc. Lỗi lưu không được để dữ liệu ghi dở dang.
- **Tiền điều kiện:** Đang thực hiện UC10.4; người tham gia có quyền đối với dữ liệu và thao tác tương ứng. Người dùng chọn chứng từ liên quan.
- **Hậu điều kiện:** Chứng từ được xem đúng quyền; dữ liệu gốc không thay đổi.

---
