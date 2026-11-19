# Đặc tả chính xác Thành phần giao diện (7 cột) & Biến cố (3 cột)
# Đối chiếu trực tiếp từ frontend/src/modules/**/*.tsx

PER_UC_SPECS = {
    "UC1.1": (
        [
            ("1", "hoTenInput", "Input (text)", "Nhập họ và tên khách hàng", "String", "Rỗng", "RegisterView.tsx, bắt buộc"),
            ("2", "emailInput", "Input (email)", "Nhập địa chỉ email đăng ký", "Email", "Rỗng", "Validate định dạng email"),
            ("3", "soDienThoaiInput", "Input (tel)", "Nhập số điện thoại liên hệ", "String (10 số)", "Rỗng", "Kiểm tra SĐT hợp lệ"),
            ("4", "matKhauInput", "Input (password)", "Nhập mật khẩu tài khoản", "String (>= 6)", "Rỗng", "Hỗ trợ nút ẩn/hiện"),
            ("5", "xacNhanMatKhauInput", "Input (password)", "Nhập lại mật khẩu xác nhận", "String", "Rỗng", "Phải khớp matKhauInput"),
            ("6", "agreeTermsCheckbox", "Checkbox", "Đồng ý điều khoản sử dụng", "Boolean", "false", "Bắt buộc tick trước khi gửi"),
            ("7", "submitRegisterBtn", "Button (submit)", "Gửi yêu cầu tạo tài khoản", "Null", "Kích hoạt", "Gọi POST /api/auth/dang-ky"),
        ],
        [
            ("1", "onSubmit form.auth-form", "Kiểm tra mật khẩu khớp và checkbox điều khoản. Gọi authApi.dangKy(), hiển thị thông báo xác thực hoặc chuyển về Đăng nhập."),
            ("2", "onClick nút Quay về đăng nhập", "Chuyển state page sang 'login'."),
        ],
    ),
    "UC1.3": (
        [
            ("1", "logoutHeaderBtn", "Button", "Nút 'Thoát' trên PublicHeader / WorkspaceView", "Null", "Hiển thị khi đã login", "Phân biệt rõ trạng thái đăng nhập"),
        ],
        [
            ("1", "onClick nút Thoát", "Gọi app.logout(), xóa JWT token trong localStorage, reset user state về null và chuyển về LandingView."),
        ],
    ),
    "UC1.8": (
        [
            ("1", "maNhanVienDisplay", "Input (disabled)", "Hiển thị mã nhân viên (VD: NV-001)", "String", "Theo dòng chọn", "StaffAccountModal.tsx"),
            ("2", "tenDangNhapInput", "Input (text)", "Tên đăng nhập nhân viên", "String", "Theo dòng chọn", "Cho phép cập nhật hoặc giữ nguyên"),
            ("3", "hoTenInput", "Input (text)", "Họ và tên nhân viên", "String", "Theo dòng chọn", "Bắt buộc nhập"),
            ("4", "soDienThoaiInput", "Input (tel)", "Số điện thoại nhân viên", "String", "Theo dòng chọn", "Validate 10 số"),
            ("5", "emailInput", "Input (email)", "Email công việc nhân viên", "Email", "Theo dòng chọn", "Duy nhất trong hệ thống"),
            ("6", "vaiTroSelect", "Select", "Chọn vai trò nhân sự (Quản trị viên, Thủ kho...)", "Enum VaiTro", "Theo dòng chọn", "Đồng bộ phân quyền RBAC"),
            ("7", "saveStaffBtn", "Button (submit)", "Nút 'Lưu nhân viên'", "Null", "Kích hoạt", "Gọi PUT /api/nhan-vien/{id}"),
        ],
        [
            ("1", "onClick nút Sửa trên dòng nhân viên", "Mở StaffAccountModal ở chế độ chỉnh sửa và đổ dữ liệu nhân viên vào form."),
            ("2", "onClick nút Lưu nhân viên", "Gọi staffApi.capNhatNhanVien(), đóng modal và làm mới StaffAccountsTable."),
        ],
    ),
    "UC1.9": (
        [
            ("1", "searchTermInput", "Input (search)", "Tìm theo tên, mã NV, username...", "String", "Rỗng", "StaffAccountsTab.tsx"),
            ("2", "roleFilterSelect", "Select", "Lọc nhân viên theo vai trò", "All | VaiTro", "Tất cả", "Cập nhật danh sách tức thì"),
            ("3", "statusFilterSelect", "Select", "Lọc theo trạng thái làm việc", "All | Active | Locked", "Tất cả", "Lọc phía client/API"),
            ("4", "staffTable", "Table", "Bảng danh sách nhân viên khớp điều kiện", "Array<Staff>", "[]", "StaffAccountsTable.tsx"),
        ],
        [
            ("1", "onChange searchTermInput / bộ lọc", "Gọi useStaffAccounts lọc danh sách và gọi GET /api/nhan-vien."),
        ],
    ),
    "UC1.11": (
        [
            ("1", "lockUnlockActionBtn", "Button", "Nút Khóa / Mở khóa trên từng dòng nhân viên", "Null", "Kích hoạt", "StaffAccountsTable.tsx"),
            ("2", "reasonInput", "Input (text)", "Nhập lý do khóa tài khoản (trong modal xác nhận)", "String", "Rỗng", "StaffStatusModals.tsx"),
            ("3", "confirmLockBtn", "Button", "Xác nhận khóa/mở khóa tài khoản", "Null", "Kích hoạt", "Gọi PATCH trạng thái"),
        ],
        [
            ("1", "onClick nút Khóa / Mở khóa", "Mở StaffStatusModals xác nhận lý do khóa hoặc mở khóa ngay."),
            ("2", "onConfirm trong modal", "Gọi API cập nhật trạng thái tài khoản và làm mới bảng."),
        ],
    ),
    "UC4.1": (
        [
            ("1", "prepQueueList", "List<Button>", "Danh sách đơn cần chuẩn bị (HandoverQueueList)", "Array<Order>", "[]", "Click để chọn đơn bên phải"),
            ("2", "startPrepBtn", "Button", "Nút 'Nhận soạn hàng →' (handleStartPreparation)", "Null", "Hiện khi Đã xác nhận", "HandoverPrepPanel.tsx"),
            ("3", "serialSelect", "Select", "Dropdown '-- Chọn mã thiết bị sẵn sàng --'", "Array<Equipment>", "Rỗng", "Chỉ liệt kê serial khả dụng"),
            ("4", "reportShortageBtn", "Button", "Nút 'Báo thiếu hàng cho QTV'", "Null", "Kích hoạt", "Mở modal báo thiếu hàng"),
            ("5", "completePrepBtn", "Button", "Nút 'Hoàn tất chuẩn bị & Chuyển Sẵn sàng nhận'", "Null", "Disabled nếu chưa đủ serial", "Chuyển bước sang UC4.2"),
        ],
        [
            ("1", "onClick chọn đơn trong HandoverQueueList", "Nạp thông tin đơn và danh sách serial khả dụng vào HandoverPrepPanel."),
            ("2", "onChange serialSelect", "Gán mã thiết bị vật lý cho từng món trong đơn."),
            ("3", "onClick completePrepBtn", "Gọi handleCompletePreparation(), cập nhật trạng thái đơn sang Sẵn sàng nhận."),
        ],
    ),
    "UC4.2": (
        [
            ("1", "handoverSubTabBtn", "Button", "Sub-tab '2. Tiếp khách & Bàn giao (UC4.2)'", "Tab", "Tab 1", "HandoverTab.tsx"),
            ("2", "checklistCheckboxes", "Checkbox[]", "Checklist kiểm tra phụ kiện & tình trạng trước giao", "Boolean[]", "false", "HandoverChecklistPanel.tsx"),
            ("3", "captureEvidenceBtn", "Button", "Nút chụp ảnh bằng chứng thiết bị tại quầy", "Null", "Kích hoạt", "Lưu ảnh minh chứng bàn giao"),
            ("4", "completeHandoverBtn", "Button", "Nút 'Xác nhận bàn giao thiết bị'", "Null", "Kích hoạt", "Gọi handleCompleteHandover()"),
            ("5", "handoverRecordModal", "Modal", "Biên bản bàn giao (HandoverRecordModal)", "Boolean", "Đóng", "Hỗ trợ in biên bản window.print()"),
        ],
        [
            ("1", "onClick sub-tab '2. Tiếp khách & Bàn giao'", "Hiển thị danh sách đơn đã chuẩn bị xong chờ khách nhận."),
            ("2", "onClick completeHandoverBtn", "Gọi API bàn giao đơn, chuyển trạng thái sang 'Đang thuê' và mở HandoverRecordModal."),
        ],
    ),
    "UC4.3": (
        [
            ("1", "returnQueueList", "List<Button>", "Danh sách đơn đang thuê / quá hạn (ReturnQueuePanel)", "Array<Order>", "[]", "Click chọn đơn cần nhận trả"),
            ("2", "conditionToggleBtns", "Group Button", "Chọn tình trạng từng thiết bị: Nguyên vẹn / Hư hỏng / Mất", "Enum", "Nguyên vẹn", "ReturnInspectionForm.tsx"),
            ("3", "compensationInput", "Input (number)", "Mức bồi thường / ghi chú hư hỏng từng thiết bị", "Number >= 0", "0", "Tự động gợi ý theo giá trị TB"),
            ("4", "createReceiptBtn", "Button", "Nút 'Lập biên bản nhận trả'", "Null", "Kích hoạt", "Gọi onCreateReceipt()"),
        ],
        [
            ("1", "onClick chọn đơn trong ReturnQueuePanel", "Tải danh sách thiết bị đã giao vào ReturnInspectionForm."),
            ("2", "onClick conditionToggleBtns", "Gọi onConditionChange() cập nhật tình trạng và tính tiền bồi thường dự kiến."),
            ("3", "onClick createReceiptBtn", "Gửi kết quả kiểm tra, cập nhật trạng thái thiết bị về kho hoặc bảo trì."),
        ],
    ),
    "UC4.4": (
        [
            ("1", "overdueBanner", "Alert Banner", "Cảnh báo 'ĐƠN THUÊ QUÁ HẠN: Trễ X ngày'", "Object", "Hiện khi quá hạn", "ReturnOverdueBanner.tsx"),
            ("2", "contactLogBtn", "Button", "Nút 'Nhật ký gọi' mở ReturnContactModal", "Null", "Kích hoạt", "Ghi nhận lịch sử liên hệ khách"),
            ("3", "applyOverdueFeeBtn", "Button", "Nút '+ Lập phụ phí trễ'", "Null", "Kích hoạt", "Tính phạt 150% đơn giá/ngày"),
        ],
        [
            ("1", "onClick contactLogBtn", "Mở ReturnContactModal để lưu lịch sử gọi nhắc trả đồ."),
            ("2", "onClick applyOverdueFeeBtn", "Gọi onApplyOverdueFee() tạo phụ phí trễ hạn tự động theo chính sách."),
        ],
    ),
    "UC5.2": (
        [
            ("1", "surchargeTypeSelect", "Select", "Chọn loại phụ phí (Hư hỏng, Trễ hạn, Vệ sinh...)", "Enum", "Hư hỏng", "ReturnSurchargePanel.tsx"),
            ("2", "surchargeAmountInput", "Input (number)", "Số tiền phụ phí đề xuất", "Number > 0", "0", "Đơn vị VNĐ"),
            ("3", "surchargeNoteInput", "Textarea", "Mô tả chi tiết lý do lập phụ phí", "String", "Rỗng", "Bắt buộc nhập"),
            ("4", "submitSurchargeBtn", "Button", "Nút lập khoản phụ phí mới", "Null", "Kích hoạt", "Gọi POST /api/phu-phi"),
        ],
        [
            ("1", "onClick submitSurchargeBtn", "Gửi yêu cầu lập phụ phí vào đơn thuê và cập nhật bảng đối soát."),
        ],
    ),
    "UC5.3": (
        [
            ("1", "disputeListPanel", "Panel", "UC5.3 Trung tâm xử lý tranh chấp & Duyệt phụ phí", "Array<Dispute>", "[]", "DisputeCenterPanel.tsx"),
            ("2", "resolveBtn", "Button", "Nút 'Xem chứng cứ & Kết luận (UC5.3)'", "Null", "Kích hoạt", "DashboardTab.tsx"),
            ("3", "decisionSelect", "Select / Radio", "Quyết định duyệt giữ nguyên, giảm mức hoặc hủy phụ phí", "Enum", "Chấp nhận", "ResolveSurchargeModal.tsx"),
        ],
        [
            ("1", "onClick nút Xem chứng cứ & Kết luận (UC5.3)", "Mở ResolveSurchargeModal hiển thị bằng chứng bàn giao/nhận trả và khiếu nại."),
            ("2", "onConfirm quyết định", "Gọi API chốt kết quả tranh chấp và cập nhật số tiền đối soát."),
        ],
    ),
    "UC5.4": (
        [
            ("1", "reconcileBtn", "Button", "Nút 'Đối soát' trên bảng Đơn thuê", "Null", "Hiện khi Chờ đối soát", "OrdersTable.tsx"),
            ("2", "reconciliationSummary", "Card", "Bảng tổng hợp tiền cọc, tổng phụ phí và số dư chênh lệch", "Object", "Tính từ API", "ReconciliationSummaryCard.tsx"),
            ("3", "finalizeBtn", "Button", "Nút 'Chốt đối soát & Hoàn tất đơn'", "Null", "Kích hoạt", "ReconciliationSheet.tsx"),
        ],
        [
            ("1", "onClick nút Đối soát", "Mở ReconciliationSheet hiển thị đầy đủ cọc, phụ phí đã duyệt và số tiền hoàn/thu thêm."),
            ("2", "onClick finalizeBtn", "Gọi API chốt đối soát và chuyển trạng thái đơn sang 'Hoàn tất'."),
        ],
    ),
    "UC5.5": (
        [
            ("1", "collectModal", "Modal", "Modal Thu tiền bổ sung (CollectSurchargeModal)", "Boolean", "Đóng", "Hiện khi phụ phí > tiền cọc"),
            ("2", "amountDueText", "Text", "Số tiền thiếu cần khách thanh toán thêm", "Number", "Tính tự động", "VNĐ"),
            ("3", "confirmCollectBtn", "Button", "Nút xác nhận đã thu tiền bổ sung", "Null", "Kích hoạt", "Gọi API thanh toán bổ sung"),
        ],
        [
            ("1", "onClick mở CollectSurchargeModal", "Hiển thị số tiền cần thu thêm và phương thức thanh toán."),
            ("2", "onClick confirmCollectBtn", "Ghi nhận giao dịch thu bổ sung và mở khóa chốt hoàn tất đơn."),
        ],
    ),
    "UC5.6": (
        [
            ("1", "refundModal", "Modal", "Modal Thực hiện hoàn tiền cọc (RefundDepositModal)", "Boolean", "Đóng", "Hiện khi tiền cọc > phụ phí"),
            ("2", "refundAmountText", "Text", "Số tiền cọc dư hoàn trả cho khách", "Number", "Tính tự động", "VNĐ"),
            ("3", "confirmRefundBtn", "Button", "Nút xác nhận đã hoàn tiền", "Null", "Kích hoạt", "Gọi API hoàn tiền cọc"),
        ],
        [
            ("1", "onClick mở RefundDepositModal", "Hiển thị số tiền hoàn lại và thông tin chuyển khoản khách."),
            ("2", "onClick confirmRefundBtn", "Ghi nhận giao dịch hoàn cọc và cập nhật trạng thái hoàn tất."),
        ],
    ),
    "UC5.7": (
        [
            ("1", "adjustmentsTable", "Table", "Bảng danh sách điều chỉnh tài chính sau chốt", "Array", "[]", "FinancialAdjustmentsTable.tsx"),
            ("2", "openAdjustModalBtn", "Button", "Nút tạo bút toán điều chỉnh sau chốt", "Null", "Kích hoạt", "AdjustmentsTab.tsx"),
            ("3", "adjustModal", "Modal", "Form nhập số tiền bù trừ và lý do bắt buộc", "Boolean", "Đóng", "FinancialAdjustmentModal.tsx"),
        ],
        [
            ("1", "onClick openAdjustModalBtn", "Mở FinancialAdjustmentModal để nhập mã đơn, số tiền điều chỉnh và lý do."),
            ("2", "onSubmit form điều chỉnh", "Gọi API lưu bút toán bù trừ sau chốt và ghi nhận Audit Log."),
        ],
    ),
    "UC6.2": (
        [
            ("1", "catNameInput", "Input (text)", "Tên danh mục sản phẩm", "String", "Theo dòng chọn", "CategoryForm.tsx"),
            ("2", "catDescInput", "Textarea", "Mô tả danh mục", "String", "Theo dòng chọn", "Không bắt buộc"),
            ("3", "saveCatBtn", "Button (submit)", "Nút lưu cập nhật danh mục", "Null", "Kích hoạt", "CategoriesTab.tsx"),
        ],
        [
            ("1", "onClick nút 'Sửa' trên card danh mục", "Gọi setAction(c.category) mở modal CategoryForm."),
            ("2", "onSubmit CategoryForm", "Gọi PUT /api/danh-muc/{id} và làm mới danh sách."),
        ],
    ),
    "UC6.3": (
        [
            ("1", "searchCategoryInput", "Input (search)", "Tìm kiếm danh mục theo tên/mã", "String", "Rỗng", "CategoriesTab.tsx"),
            ("2", "categoryGrid", "Grid<Card>", "Danh sách thẻ danh mục kèm số lượng sản phẩm", "Array<Category>", "[]", "Hiển thị trạng thái hoạt động"),
        ],
        [
            ("1", "onChange searchCategoryInput", "Lọc danh sách danh mục hiển thị theo từ khóa."),
        ],
    ),
    "UC6.4": (
        [
            ("1", "toggleCatStatusBtn", "Button", "Nút 'Ẩn' / 'Hiện' trên card danh mục", "Null", "'Ẩn' (khi active)", "CategoriesTab.tsx"),
        ],
        [
            ("1", "onClick nút Ẩn / Hiện", "Gọi catalogApi.adminDoiTrangThaiDanhMuc(catId, 'TamAn' | 'HienThi') và làm mới danh mục."),
        ],
    ),
    "UC6.8": (
        [
            ("1", "productRowClick", "Table Row (<tr>)", "Click dòng sản phẩm để mở adm-detail-panel bên phải", "String | null", "null", "ProductsTab.tsx"),
            ("2", "statusSelect", "Select", "Dropdown 'Trạng thái KD' (Đang kinh doanh / Tạm ngưng / Ngừng kinh doanh)", "DangKinhDoanh | TamNgung | NgungKinhDoanh", "Theo sản phẩm", "Chỉ hiện khi đã chọn detail"),
        ],
        [
            ("1", "onClick vào dòng sản phẩm", "Set state sel = p.id để hiển thị bảng chi tiết và dropdown Trạng thái KD."),
            ("2", "onChange statusSelect", "Gọi catalogApi.adminDoiTrangThaiSanPham(prodId, val) và gọi refreshCatalog()."),
        ],
    ),
    "UC6.11": (
        [
            ("1", "stockAdjustTable", "Table", "Danh sách phiếu đề nghị điều chỉnh kho", "Array", "[]", "StockAdjustTable.tsx"),
            ("2", "checkImpactBtn", "Button", "Nút kiểm tra ảnh hưởng lịch thuê", "Null", "Kích hoạt", "onCheckImpact(sa)"),
            ("3", "approveRejectBtns", "Button[]", "Nút Duyệt / Từ chối phiếu điều chỉnh", "Null", "Hiện khi Chờ duyệt", "StockAdjustModals.tsx"),
        ],
        [
            ("1", "onClick checkImpactBtn", "Kiểm tra các đơn đặt tương lai có bị thiếu thiết bị nếu giảm kho."),
            ("2", "onClick Duyệt", "Gọi API duyệt phiếu điều chỉnh và cập nhật tồn kho thực tế."),
        ],
    ),
    "UC6.12": (
        [
            ("1", "maintSubTab", "Button", "Sub-tab 'Phiếu bảo trì & sửa chữa'", "Tab", "Tab 2", "WarehouseMaintenanceTab.tsx"),
            ("2", "openCreateMaintBtn", "Button", "Nút '+ Tạo phiếu bảo trì (UC6.12)'", "Null", "Kích hoạt", "MaintenanceSubTab.tsx"),
            ("3", "equipSelect", "Select", "Chọn thiết bị cần bảo trì", "Array<Equipment>", "Thiết bị đầu", "CreateMaintenanceModal.tsx"),
            ("4", "issueDescInput", "Textarea", "Mô tả lỗi / hư hỏng chi tiết", "String", "Rỗng", "Bắt buộc nhập"),
            ("5", "estCostInput", "Input (number)", "Chi phí bảo trì dự tính (VNĐ)", "Number >= 0", "150000", "Không âm"),
        ],
        [
            ("1", "onClick openCreateMaintBtn", "Mở CreateMaintenanceModal."),
            ("2", "onClick 'Tạo phiếu bảo trì'", "Gọi handleCreate(), tạo phiếu mới và đổi trạng thái thiết bị sang Đang bảo trì."),
        ],
    ),
    "UC6.13": (
        [
            ("1", "acceptMaintBtn", "Button", "Nút 'Nghiệm thu →' trên dòng phiếu bảo trì", "Null", "Kích hoạt", "MaintenanceSubTab.tsx"),
            ("2", "acceptModal", "Modal", "Modal Nghiệm thu bảo trì (AcceptMaintenanceModal)", "Boolean", "Đóng", "Nhập chi phí thực tế & kết quả"),
            ("3", "confirmAcceptBtn", "Button", "Nút xác nhận nghiệm thu đạt chuẩn", "Null", "Kích hoạt", "handleConfirmAccept()"),
        ],
        [
            ("1", "onClick acceptMaintBtn", "Mở AcceptMaintenanceModal."),
            ("2", "onClick confirmAcceptBtn", "Hoàn tất phiếu bảo trì và đưa thiết bị trở lại trạng thái 'Sẵn sàng'."),
        ],
    ),
    "UC6.14": (
        [
            ("1", "editEquipBtn", "Button", "Nút 'Sửa' trên dòng thiết bị (EquipmentLifecycleTab)", "Null", "Kích hoạt", "Mở modal cập nhật vòng đời"),
            ("2", "statusSelect", "Select", "Chọn trạng thái thiết bị (chọn 'Ngừng sử dụng')", "Enum", "Theo thiết bị", "Loại khỏi kho cho thuê"),
        ],
        [
            ("1", "onClick editEquipBtn", "Mở modal chỉnh sửa trạng thái vòng đời thiết bị."),
            ("2", "onSave chọn 'Ngừng sử dụng'", "Gọi API cập nhật trạng thái thiết bị sang Ngừng sử dụng."),
        ],
    ),
    "UC6.15": (
        [
            ("1", "transferEquipBtn", "Button", "Nút 'Điều chuyển' trong InventorySubTab", "Null", "Kích hoạt", "InventorySubTab.tsx"),
            ("2", "targetProductSelect", "Select", "Chọn sản phẩm đích muốn điều chuyển tới", "Array<Product>", "Rỗng", "Chỉ chọn sản phẩm hợp lệ"),
            ("3", "confirmTransferBtn", "Button", "Nút xác nhận điều chuyển thiết bị", "Null", "Kích hoạt", "handleTransfer()"),
        ],
        [
            ("1", "onClick transferEquipBtn", "Mở modal điều chuyển thiết bị sang sản phẩm khác."),
            ("2", "onClick confirmTransferBtn", "Gọi API cập nhật mã sản phẩm sở hữu cho serial thiết bị."),
        ],
    ),
    "UC7.2": (
        [
            ("1", "editSupplierBtn", "Button", "Nút 'Sửa' trên thẻ Nhà cung cấp", "Null", "Kích hoạt", "SuppliersTab.tsx"),
            ("2", "supplierForm", "Modal Form", "Form cập nhật tên, người liên hệ, SĐT, email, địa chỉ NCC", "Object", "Theo NCC chọn", "SupplierForm.tsx"),
        ],
        [
            ("1", "onClick editSupplierBtn", "Gọi setAction(s) mở SupplierForm ở chế độ cập nhật."),
            ("2", "onSubmit SupplierForm", "Gọi PUT /api/nha-cung-cap/{id} và làm mới danh sách."),
        ],
    ),
    "UC7.4": (
        [
            ("1", "coopStatusFilter", "Select", "Lọc theo tình trạng hợp tác", "All | Active | Stopped", "Tất cả", "SuppliersTab.tsx"),
            ("2", "toggleCoopBtn", "Button", "Nút Ngừng hợp tác / Hợp tác lại", "Null", "Kích hoạt", "Cập nhật trạng thái NCC"),
        ],
        [
            ("1", "onClick toggleCoopBtn", "Gọi API đổi tình trạng hợp tác của nhà cung cấp."),
        ],
    ),
    "UC7.6": (
        [
            ("1", "editReceiptBtn", "Button", "Nút 'Sửa phiếu' trên chi tiết phiếu nhập nháp", "Null", "Hiện khi Nháp", "InventoryReceiptDetail.tsx"),
            ("2", "receiptFormModal", "Modal Form", "Form chỉnh sửa NCC, ngày nhập, thêm/bớt dòng hàng", "Object", "Theo phiếu", "ImportReceiptForm.tsx"),
        ],
        [
            ("1", "onClick editReceiptBtn", "Mở ImportReceiptForm nạp sẵn dữ liệu phiếu nháp."),
            ("2", "onSubmit lưu sửa", "Gọi PUT /api/phieu-nhap/{id}."),
        ],
    ),
    "UC7.7": (
        [
            ("1", "confirmImportBtn", "Button", "Nút 'Xác nhận nhập kho' trên InventoryReceiptDetail", "Null", "Hiện khi Nháp", "InventoryTab.tsx"),
        ],
        [
            ("1", "onClick confirmImportBtn", "Gọi API xác nhận nhập kho, tự động sinh mã serial thiết bị mới vào kho."),
        ],
    ),
    "UC7.8": (
        [
            ("1", "receiptToolbar", "Toolbar", "Thanh tìm kiếm mã phiếu & lọc trạng thái (Nháp/Đã xác nhận)", "String/Enum", "Tất cả", "InventoryToolbar.tsx"),
            ("2", "receiptList", "List<Button>", "Danh sách phiếu nhập bên trái", "Array<Receipt>", "[]", "Click để xem InventoryReceiptDetail"),
        ],
        [
            ("1", "onChange tìm kiếm/bộ lọc", "Lọc danh sách phiếu nhập theo điều kiện."),
            ("2", "onClick chọn phiếu", "Hiển thị đầy đủ dòng hàng và tổng tiền bên InventoryReceiptDetail."),
        ],
    ),
    "UC7.10": (
        [
            ("1", "discrepancyBtn", "Button", "Nút 'Xử lý sai lệch' / 'Điều chỉnh' trên phiếu nhập", "Null", "Kích hoạt", "InventoryActionModals.tsx"),
            ("2", "discrepancyModal", "Modal", "Form ghi nhận số lượng thực nhận, hàng lỗi và hướng xử lý", "Boolean", "Đóng", "Lập bản điều chỉnh phiếu nhập"),
        ],
        [
            ("1", "onClick discrepancyBtn", "Mở modal ghi nhận sai lệch phiếu nhập."),
            ("2", "onSubmit xử lý sai lệch", "Gọi API lập bản điều chỉnh phiếu nhập và cập nhật tồn kho."),
        ],
    ),
    "UC9.1": (
        [
            ("1", "reviewsSection", "Panel", "Danh sách sản phẩm từ đơn đã hoàn tất (ProfileReviewsSection)", "Array", "[]", "ProfileView.tsx -> Tab Đánh giá"),
            ("2", "ratingStars", "StarPicker", "Chọn số sao đánh giá (1 - 5 sao)", "Number (1..5)", "5", "ReviewComposerForm.tsx"),
            ("3", "commentTextarea", "Textarea", "Nhập nhận xét chi tiết trải nghiệm thuê", "String", "Rỗng", "Bắt buộc nhập"),
            ("4", "submitReviewBtn", "Button (submit)", "Nút 'Gửi đánh giá'", "Null", "Kích hoạt", "Gọi POST /api/danh-gia"),
        ],
        [
            ("1", "onClick mở form viết đánh giá", "Hiển thị ReviewComposerForm cho sản phẩm chưa đánh giá."),
            ("2", "onClick submitReviewBtn", "Gửi đánh giá lên hệ thống thông qua danhGiaApi."),
        ],
    ),
    "UC1.2": (
        [
            ("1", "accountInput", "Input (text)", "Nhập Email, SĐT hoặc Tên đăng nhập", "String", "Rỗng", "LoginView.tsx, autoFocus"),
            ("2", "pass", "Input (password/text)", "Nhập mật khẩu tài khoản", "String (>= 6)", "Rỗng", "Đổi type theo showPass"),
            ("3", "showPass toggle", "Button", "Ẩn/hiện ký tự mật khẩu", "Boolean", "false", "Nằm trong .auth-pwd-wrapper"),
            ("4", "Quên mật khẩu?", "Button", "Chuyển sang ForgotPasswordView", "Null", "Kích hoạt", "app.setPage('forgot-password')"),
            ("5", "Đăng nhập hệ thống", "Button (submit)", "Gửi biểu mẫu xác thực đăng nhập", "Null", "Kích hoạt", "Gọi POST /api/auth/dang-nhap"),
            ("6", "lockedAccount alert", "Alert Box", "Hiển thị thông báo khóa tài khoản", "Object | null", "null", "Hiện khi lỗi TAI_KHOAN_BI_KHOA"),
        ],
        [
            ("1", "onSubmit form.auth-form", "Kiểm tra failedAttempts, gọi authApi.dangNhap(), lưu JWT token và điều hướng."),
            ("2", "onClick fillQuickAccount", "Tự điền tài khoản mẫu kiểm thử nhanh."),
        ],
    ),
    "UC1.4": (
        [
            ("1", "contact (ForgotStepInput)", "Input (text)", "Nhập Email hoặc SĐT đã đăng ký", "String", "Rỗng", "ForgotPasswordView.tsx"),
            ("2", "otp (ForgotStepOtp)", "Input (OTP)", "Nhập mã OTP 6 chữ số", "String (6)", "Rỗng", "Có nút handleResendOtp"),
            ("3", "newPass & confirm (ForgotStepReset)", "Input (password)", "Nhập mật khẩu mới và xác nhận", "String (>= 6)", "Rỗng", "Phải khớp nhau"),
        ],
        [
            ("1", "onSubmit handleSubmitContact", "Gọi API gửi mã xác minh OTP qua email/SĐT."),
            ("2", "onSubmit handleVerifyOtp", "Xác thực OTP trước khi qua bước đặt lại mật khẩu."),
            ("3", "onSubmit handleResetPassword", "Cập nhật mật khẩu mới và quay về LoginView."),
        ],
    ),
    "UC1.5": (
        [
            ("1", "profileLoadingBanner", "Text / Skeleton", "Hiển thị trạng thái đang tải hồ sơ cá nhân", "Boolean", "false", "ProfileView.tsx"),
            ("2", "profileReadonlyInfo", "Input / Card", "Hiển thị họ tên, email, SĐT, địa chỉ hiện tại", "Object", "Từ API profile", "ProfileInfoForm.tsx"),
        ],
        [
            ("1", "Mở tab 'Tài khoản' (ProfileView)", "Gọi API GET /api/auth/ho-so để tải thông tin cá nhân mới nhất."),
        ],
    ),
    "UC1.6": (
        [
            ("1", "hoTen & diaChi Inputs", "Input (text)", "Chỉnh sửa họ tên, số điện thoại, địa chỉ", "String", "Theo hồ sơ", "ProfileInfoForm.tsx"),
            ("2", "saveProfileBtn", "Button (submit)", "Nút 'Lưu thay đổi'", "Null", "Disabled khi profileSaving", "Gọi PUT /api/auth/ho-so"),
        ],
        [
            ("1", "onSubmit ProfileInfoForm", "Validate dữ liệu, gọi API cập nhật hồ sơ và hiển thị 'Đã lưu hồ sơ thành công'."),
        ],
    ),
    "UC1.7": (
        [
            ("1", "openAddStaffBtn", "Button", "Nút '+ Thêm nhân viên mới'", "Null", "Kích hoạt", "StaffAccountsTab.tsx"),
            ("2", "staffAccountModal", "Modal Form", "Nhập họ tên, SĐT, email, username, mật khẩu & vai trò", "Object", "Rỗng", "StaffAccountModal.tsx"),
        ],
        [
            ("1", "onClick openAddStaffBtn", "Mở StaffAccountModal ở chế độ tạo mới."),
            ("2", "onSubmit tạo nhân viên", "Gọi POST /api/nhan-vien và làm mới bảng nhân viên."),
        ],
    ),
    "UC1.10": (
        [
            ("1", "permissionMatrix", "Table / Checkbox[]", "Ma trận quyền theo phân hệ của nhân viên/vai trò", "Record<string, bool>", "Theo DB", "StaffPermissionsModal.tsx / PermissionsTab"),
            ("2", "savePermBtn", "Button", "Lưu thay đổi phân quyền RBAC", "Null", "Kích hoạt", "Đồng bộ xuống SQL Server"),
        ],
        [
            ("1", "onChange checkbox quyền & onClick Lưu", "Gọi API cập nhật quyền RBAC và tăng permission_version."),
        ],
    ),
    "UC1.12": (
        [
            ("1", "currentPassInput", "Input (password)", "Nhập mật khẩu hiện tại", "String", "Rỗng", "ProfileSecurityForm.tsx"),
            ("2", "newPassInput & confirmInput", "Input (password)", "Nhập mật khẩu mới & xác nhận", "String (>= 6)", "Rỗng", "Bắt buộc khớp nhau"),
            ("3", "changePassBtn", "Button (submit)", "Nút cập nhật mật khẩu mới", "Null", "Disabled khi passwordSaving", "Gọi POST đổi mật khẩu"),
        ],
        [
            ("1", "onSubmit ProfileSecurityForm", "Validate mật khẩu cũ/mới và gọi API đổi mật khẩu."),
        ],
    ),
    "UC1.13": (
        [
            ("1", "customerSearchInput", "Input (search)", "Tìm khách hàng theo tên, email, SĐT", "String", "Rỗng", "CustomersTab.tsx"),
            ("2", "customersTable", "Table", "Bảng danh sách khách hàng (CustomersTable)", "Array<Customer>", "[]", "Có nút Khóa / Mở khóa"),
            ("3", "customerLockModal", "Modal", "Modal xác nhận khóa/mở khóa (CustomerModals)", "Boolean", "Đóng", "handleConfirmLock / handleUnlockCustomer"),
        ],
        [
            ("1", "onChange customerSearchInput", "Gọi API tra cứu khách hàng và cập nhật CustomersTable."),
            ("2", "onClick Khóa / Mở khóa", "Gọi handleConfirmLock() hoặc handleUnlockCustomer()."),
        ],
    ),
    "UC2.1": (
        [
            ("1", "searchInput", "Input (search)", "Ô 'Tìm tên, thương hiệu...'", "String", "Rỗng", "ProductFiltersBar.tsx"),
            ("2", "categoryFilter & priceFilter", "Select / Chips", "Bộ lọc theo danh mục và khoảng giá", "String/Range", "Tất cả", "Có nút 'Xóa bộ lọc'"),
            ("3", "productGrid", "Grid<ProductCard>", "Lưới thẻ sản phẩm hiển thị giá/ngày, cọc", "Array<Product>", "[]", "ProductsView.tsx"),
        ],
        [
            ("1", "onChange searchInput / bộ lọc", "Lọc danh sách sản phẩm và hiển thị số lượng sản phẩm phù hợp."),
            ("2", "onQuickRent trên ProductCard", "Gọi handleAddToCartRealAware(id, 1, false)."),
        ],
    ),
    "UC2.2": (
        [
            ("1", "backToListBtn", "Button", "Nút 'Quay lại danh sách'", "Null", "Kích hoạt", "ProductDetailView.tsx"),
            ("2", "productInfoAndSpecs", "Panel", "Hình ảnh, giá thuê/ngày, mức cọc, bồi thường, sức chứa", "Object", "Theo sản phẩm", "Kèm ProductDetailTabs"),
            ("3", "productDetailReviews", "Panel", "Danh sách đánh giá đã duyệt (ProductDetailReviews)", "Array<Review>", "[]", "Hiển thị điểm sao trung bình"),
        ],
        [
            ("1", "onClick vào sản phẩm ở ProductsView", "Tải chi tiết sản phẩm và các đánh giá liên quan."),
            ("2", "onClick backToListBtn", "Gọi app.setPage('products') quay lại danh sách."),
        ],
    ),
    "UC2.3": (
        [
            ("1", "dateStart & dateEnd Inputs", "Input (date)", "Chọn ngày nhận và ngày trả thiết bị", "Date String", "Hôm nay + 2 ngày", "ProductDetailView / LandingHeroBooking"),
            ("2", "qtyStepper", "Input / Button", "Chọn số lượng cần thuê", "Number >= 1", "1", "Giới hạn theo tồn khả dụng"),
            ("3", "addToCartBtn", "Button", "Nút 'Thêm vào giỏ thuê'", "Null", "Kích hoạt", "handleAddToCartRealAware(id, qty, true)"),
        ],
        [
            ("1", "onChange ngày nhận/trả", "Kiểm tra số lượng thiết bị khả dụng trong khoảng ngày đã chọn."),
            ("2", "onClick addToCartBtn", "Thêm sản phẩm với số lượng & khoảng ngày vào giỏ thuê."),
        ],
    ),
    "UC2.4": (
        [
            ("1", "aiPresetChips", "Group Button", "Mẫu kịch bản có sẵn (AIAdvisorPresets)", "Array<Preset>", "[]", "AIAdvisorView.tsx"),
            ("2", "tripPromptForm", "Form", "Nhập số người, địa điểm, loại hình chuyến đi (AIAdvisorForm)", "Object", "Mặc định", "handleStartAIAnalysis"),
            ("3", "aiResultItems", "List", "Danh sách bộ dụng cụ AI đề xuất (AIAdvisorItemsList)", "Array<Item>", "[]", "Cho phép tăng/giảm SL, xóa, thêm"),
            ("4", "addAllToCartBtn", "Button", "Nút 'Thêm tất cả vào giỏ thuê'", "Null", "Kích hoạt", "handleAddAllToCart"),
        ],
        [
            ("1", "onSelectPreset / onStartAnalysis", "Gọi dịch vụ AI gợi ý combo thiết bị cắm trại từ danh mục thực tế."),
            ("2", "onClick addAllToCartBtn", "Đưa toàn bộ combo gợi ý vào giỏ thuê."),
        ],
    ),
    "UC3.1": (
        [
            ("1", "cartScheduleBar", "DatePicker Bar", "Điều chỉnh ngày nhận/trả chung cho giỏ (CartScheduleBar)", "Object", "Theo giỏ", "onScheduleChange"),
            ("2", "cartItemRows", "List<CartItemRow>", "Từng sản phẩm trong giỏ, nút +/- số lượng & xóa", "Array<CartItem>", "[]", "CartView.tsx"),
            ("3", "promoCodeInput", "Input / Button", "Ô nhập & áp dụng mã khuyến mãi", "String", "Rỗng", "Tính lại báo giá thuê"),
            ("4", "cartSummaryPanel", "Summary Card", "Tổng tiền thuê, giảm giá, cọc & Tổng thanh toán ban đầu", "Object", "Tính tự động", "CartSummaryPanel.tsx"),
        ],
        [
            ("1", "onQtyDelta / onRemove / onScheduleChange", "Gọi vm.handleQtyDelta / handleScheduleChange cập nhật lại báo giá."),
            ("2", "onProceedToCheckout", "Điều hướng sang CheckoutView để xác nhận đặt thuê."),
        ],
    ),
    "UC3.2": (
        [
            ("1", "receiverSection", "Form", "Nhập thông tin người nhận, SĐT, email (CheckoutReceiverSection)", "Object", "Từ hồ sơ KH", "CheckoutView.tsx"),
            ("2", "checkoutSummary", "Card", "Tóm tắt sản phẩm, tiền thuê, cọc, chính sách (CheckoutOrderSummary)", "Object", "Theo giỏ", "Hiển thị điều khoản"),
            ("3", "quoteChangedModal", "Modal", "Cảnh báo báo giá thay đổi (CheckoutQuoteModal)", "Boolean", "Đóng", "onAcceptNewQuote"),
            ("4", "confirmOrderBtn", "Button", "Nút xác nhận tạo đơn & giữ chỗ", "Null", "Kích hoạt", "vm.handleConfirm()"),
        ],
        [
            ("1", "onClick confirmOrderBtn", "Gọi POST /api/don-thue tạo đơn, sinh giữ chỗ và chuyển sang OrderConfirmedView."),
        ],
    ),
    "UC3.3": (
        [
            ("1", "orderStatusFilter", "Tabs / Chips", "Lọc đơn thuê của tôi theo trạng thái", "String", "Tất cả", "MyOrdersView.tsx"),
            ("2", "orderCardsList", "List<OrderCardItem>", "Danh sách đơn thuê kèm mã đơn, lịch thuê, tổng tiền", "Array<Order>", "[]", "Click để chọn xem chi tiết"),
            ("3", "orderDetailPanel", "Panel", "Chi tiết thiết bị, thanh toán, phụ phí (OrderDetailPanel)", "Object", "Theo đơn chọn", "Kèm OrderSurchargesBlock"),
        ],
        [
            ("1", "onSelect(id) chọn đơn", "Gọi vm.handleSelectOrder(id) tải chi tiết lịch sử & phụ phí đơn."),
            ("2", "onExtraPay / onCheckExtraPayStatus", "Thanh toán hoặc kiểm tra trạng thái thanh toán phụ phí phát sinh."),
        ],
    ),
    "UC3.4": (
        [
            ("1", "openCancelBtn", "Button", "Nút 'Hủy đơn' trên OrderDetailPanel", "Null", "Hiện khi ChoThanhToan/DaXacNhan", "MyOrdersView.tsx"),
            ("2", "cancelReasonInput", "Textarea / Radio", "Chọn/nhập lý do hủy đơn trong OrderCancelModal", "String", "Rỗng", "OrderCancelModal.tsx"),
            ("3", "confirmCancelBtn", "Button", "Nút xác nhận hủy đơn thuê", "Null", "Kích hoạt", "handleConfirmCancel()"),
        ],
        [
            ("1", "onClick openCancelBtn", "Gọi vm.handleOpenCancel() mở OrderCancelModal."),
            ("2", "onClick confirmCancelBtn", "Gọi POST /api/don-thue/{id}/huy, giải phóng giữ chỗ và tính hoàn tiền theo chính sách."),
        ],
    ),
    "UC4.5": (
        [
            ("1", "shiftFilterChips", "Group Button", "Bộ lọc ca trực: Tất cả, Cần giao hôm nay, Cần thu, Quá hạn, Trả 1 phần", "Enum", "Tất cả", "OrdersTab.tsx"),
            ("2", "searchOrderInput", "Input (search)", "Ô 'Tìm mã đơn, tên khách, SĐT...'", "String", "Rỗng", "OrdersTable.tsx"),
            ("3", "ordersTable", "Table", "Bảng đơn thuê vận hành (nút Chuẩn bị / Nhận trả / Đối soát / Hồ sơ)", "Array<Order>", "[]", "Mở OrderDetailModal (UC4.5)"),
        ],
        [
            ("1", "onChange bộ lọc / từ khóa", "Lọc danh sách đơn vận hành trong ca trực."),
            ("2", "onClick Hồ sơ / mã đơn", "Mở OrderDetailModal xem toàn diện hồ sơ vận hành đơn hàng."),
        ],
    ),
    "UC5.1": (
        [
            ("1", "qrPaymentBox", "Card / QR", "Mã QR thanh toán và thông tin số tiền cần thanh toán (OrderConfirmedQrBox)", "Object", "Theo đơn vừa tạo", "OrderConfirmedView.tsx"),
            ("2", "itemsAndReceipt", "Panel", "Chi tiết món thuê & biên lai tạm (OrderConfirmedItemsAndReceipt)", "Object", "Theo đơn", "Hiển thị cọc & tiền thuê"),
            ("3", "payBtns", "Button[]", "Nút mô phỏng thanh toán thành công/thất bại & Kiểm tra cổng", "Null", "Kích hoạt", "handlePay(true/false) & handleCheckGateway"),
        ],
        [
            ("1", "onClick handlePay(true)", "Gọi API xác nhận thanh toán đơn, cập nhật trạng thái đơn sang 'Đã xác nhận'."),
            ("2", "onClick handleCheckGateway", "Truy vấn trạng thái giao dịch từ cổng thanh toán."),
        ],
    ),
    "UC6.1": (
        [
            ("1", "openAddCatBtn", "Button", "Nút '+ Thêm danh mục'", "Null", "Kích hoạt", "CategoriesTab.tsx"),
            ("2", "categoryFormModal", "Modal Form", "Nhập tên danh mục, mô tả & thứ tự hiển thị (CategoryForm)", "Object", "Rỗng", "Bắt buộc tên danh mục"),
        ],
        [
            ("1", "onClick openAddCatBtn", "Mở CategoryForm ở chế độ thêm mới."),
            ("2", "onSubmit CategoryForm", "Gọi POST /api/danh-muc và cập nhật lưới danh mục."),
        ],
    ),
    "UC6.5": (
        [
            ("1", "openAddProdBtn", "Button", "Nút '+ Thêm sản phẩm'", "Null", "Kích hoạt", "ProductsTab.tsx"),
            ("2", "productFormModal", "Modal Form", "Nhập tên, thương hiệu, danh mục, giá thuê/ngày, cọc, bồi thường", "Object", "Rỗng", "ProductForm.tsx"),
        ],
        [
            ("1", "onClick openAddProdBtn", "Mở ProductForm ở chế độ thêm sản phẩm mới."),
            ("2", "onSubmit ProductForm", "Gọi POST /api/san-pham và làm mới bảng sản phẩm."),
        ],
    ),
    "UC6.6": (
        [
            ("1", "editProdBtn", "Button", "Nút 'Sửa' trên dòng sản phẩm", "Null", "Kích hoạt", "ProductsTab.tsx"),
            ("2", "productEditModal", "Modal Form", "Chỉnh sửa thông tin giá thuê, cọc, bồi thường, mô tả (ProductForm)", "Object", "Theo dòng chọn", "setAction(p)"),
        ],
        [
            ("1", "onClick editProdBtn", "Nạp thông tin sản phẩm chọn vào ProductForm."),
            ("2", "onSubmit ProductForm", "Gọi PUT /api/san-pham/{id} và cập nhật bảng."),
        ],
    ),
    "UC6.7": (
        [
            ("1", "searchProductInput", "Input (search)", "Ô 'Tìm tên sản phẩm...'", "String", "Rỗng", "ProductsTab.tsx"),
            ("2", "categoryFilterSelect", "Select", "Dropdown 'Lọc theo danh mục'", "All | Category", "Tất cả", "Lọc theo danh mục"),
            ("3", "productsTable", "Table", "Bảng sản phẩm (Mã, Sản phẩm, Danh mục, Giá/ngày, Cọc, Bồi thường, Khả dụng)", "Array<Product>", "[]", "Click dòng để mở detail panel"),
        ],
        [
            ("1", "onChange searchProductInput / categoryFilterSelect", "Lọc tức thì danh sách sản phẩm khớp từ khóa và danh mục."),
            ("2", "onClick dòng sản phẩm", "Set state sel = p.id để hiển thị bảng chi tiết bên phải."),
        ],
    ),
    "UC6.9": (
        [
            ("1", "statusChips", "Group Button", "Lọc trạng thái: Tất cả, Sẵn sàng, Đang thuê, Đang bảo trì, Thất lạc, Ngừng sử dụng", "Enum[]", "Tất cả", "EquipmentLifecycleTab.tsx"),
            ("2", "equipmentTable", "Table", "Bảng thiết bị (Mã serial, sản phẩm, tình trạng, lịch sử sử dụng)", "Array<Equipment>", "[]", "Xem lịch sử qua EquipScheduleModal"),
        ],
        [
            ("1", "onClick chip trạng thái", "Lọc danh sách thiết bị vật lý theo vòng đời hiện tại."),
            ("2", "onClick Xem lịch sử / lịch trình", "Mở EquipScheduleModal xem chi tiết các đơn & phiếu bảo trì liên quan."),
        ],
    ),
    "UC6.10": (
        [
            ("1", "openAuditBtn", "Button", "Nút mở kiểm kê định kỳ/đột xuất (onOpenAuditModal)", "Null", "Kích hoạt", "StockAdjustTable.tsx"),
            ("2", "openManualAdjustBtn", "Button", "Nút tạo đề nghị điều chỉnh thủ công (onOpenManualModal)", "Null", "Kích hoạt", "StockAdjustTab.tsx"),
            ("3", "stockAdjustModal", "Modal Form", "Chọn thiết bị, số lượng/trạng thái sau kiểm kê và lý do (StockAdjustModals)", "Object", "Đóng", "Gửi phiếu chờ duyệt"),
        ],
        [
            ("1", "onClick openAuditBtn / openManualAdjustBtn", "Mở form lập phiếu kiểm kê và đề nghị điều chỉnh kho."),
            ("2", "onSubmit phiếu điều chỉnh", "Gọi API tạo phiếu ở trạng thái 'Chờ duyệt' (UC6.11 sẽ duyệt)."),
        ],
    ),
    "UC7.1": (
        [
            ("1", "openAddNccBtn", "Button", "Nút '+ Thêm NCC mới'", "Null", "Kích hoạt", "SuppliersTab.tsx"),
            ("2", "supplierFormModal", "Modal Form", "Nhập tên NCC, người liên hệ, SĐT, email, địa chỉ (SupplierForm)", "Object", "Rỗng", "Bắt buộc tên & SĐT"),
        ],
        [
            ("1", "onClick openAddNccBtn", "Gọi setAction('new') mở SupplierForm."),
            ("2", "onSubmit SupplierForm", "Gọi POST /api/nha-cung-cap thêm đối tác mới."),
        ],
    ),
    "UC7.3": (
        [
            ("1", "searchNccInput", "Input (search)", "Ô 'Tìm theo mã NCC, tên, SĐT...'", "String", "Rỗng", "SuppliersTab.tsx"),
            ("2", "coopStatusSelect", "Select", "Dropdown 'Lọc theo tình trạng hợp tác'", "All | Active | Stopped", "Tất cả", "Lọc đối tác"),
            ("3", "supplierCards", "List<Card>", "Danh sách thẻ NCC kèm nút Hồ sơ & Sửa", "Array<Supplier>", "[]", "setSelectedSupplierProfile"),
        ],
        [
            ("1", "onChange searchNccInput / coopStatusSelect", "Lọc danh sách nhà cung cấp khớp điều kiện."),
        ],
    ),
    "UC7.5": (
        [
            ("1", "openCreateImportBtn", "Button", "Nút '+ Tạo phiếu nhập'", "Null", "Kích hoạt", "InventoryToolbar.tsx"),
            ("2", "importReceiptForm", "Modal Form", "Chọn NCC, số chứng từ, ngày nhập dự kiến & các dòng sản phẩm (ImportReceiptForm)", "Object", "Mặc định", "Tự tính tổng tiền nhập"),
        ],
        [
            ("1", "onClick openCreateImportBtn", "Mở ImportReceiptForm lập phiếu nhập ở trạng thái Nháp."),
            ("2", "onSubmit lưu nháp", "Gọi POST /api/phieu-nhap lưu nháp (chưa cộng tồn kho)."),
        ],
    ),
    "UC7.9": (
        [
            ("1", "cancelDraftReceiptBtn", "Button", "Nút 'Hủy phiếu nháp' trên InventoryReceiptDetail", "Null", "Hiện khi Nháp", "InventoryTab.tsx"),
            ("2", "confirmCancelModal", "Modal", "Xác nhận lý do hủy phiếu nhập nháp (InventoryActionModals)", "Boolean", "Đóng", "Không làm ảnh hưởng kho"),
        ],
        [
            ("1", "onClick cancelDraftReceiptBtn", "Mở hộp thoại xác nhận hủy phiếu nháp."),
            ("2", "onConfirm hủy", "Gọi API chuyển trạng thái phiếu nhập sang 'Đã hủy'."),
        ],
    ),
    "UC8.1": (
        [
            ("1", "policyCurrentForm", "Form", "Cấu hình mức cọc mặc định, phí trễ hạn (%), tỷ lệ phạt hủy đơn (PolicyCurrentForm)", "Object", "Theo phiên bản", "PoliciesTab.tsx"),
            ("2", "reviewSaveBtn", "Button", "Nút xem trước & lưu phiên bản chính sách mới (handleOpenReview)", "Null", "Kích hoạt", "Mở PolicyModals xác nhận"),
            ("3", "policyHistoryTable", "Table", "Bảng lịch sử các phiên bản chính sách (PolicyHistoryTable)", "Array<Policy>", "[]", "Ghi nhận ngày hiệu lực"),
        ],
        [
            ("1", "onClick reviewSaveBtn", "Kiểm tra tham số hợp lệ và mở modal đối chiếu thay đổi."),
            ("2", "onConfirm handleConfirmSave", "Gọi API tạo phiên bản chính sách mới vào DB."),
        ],
    ),
    "UC8.2": (
        [
            ("1", "openAddPromoBtn", "Button", "Nút '+ Tạo khuyến mãi'", "Null", "Kích hoạt", "PromotionsTab.tsx"),
            ("2", "promotionForm", "Modal Form", "Nhập mã code, loại giảm (% / tiền), ngày bắt đầu/kết thúc, giới hạn lượt", "Object", "Rỗng", "PromotionForm.tsx"),
        ],
        [
            ("1", "onClick openAddPromoBtn", "Mở PromotionForm tạo mã ưu đãi mới."),
            ("2", "onSubmit lưu khuyến mãi", "Gọi POST /api/khuyen-mai và làm mới PromotionsList."),
        ],
    ),
    "UC8.3": (
        [
            ("1", "editPromoBtn", "Button", "Nút 'Sửa' trên dòng khuyến mãi", "Null", "Kích hoạt", "PromotionsList.tsx"),
            ("2", "promotionEditModal", "Modal Form", "Chỉnh sửa thông tin, mức giảm, hạn dùng khuyến mãi (PromotionForm)", "Object", "Theo dòng chọn", "Kiểm tra ưu đãi đã chốt"),
        ],
        [
            ("1", "onClick editPromoBtn", "Mở PromotionForm nạp dữ liệu khuyến mãi cần sửa."),
            ("2", "onSubmit cập nhật", "Gọi PUT /api/khuyen-mai/{id}."),
        ],
    ),
    "UC8.4": (
        [
            ("1", "searchPromoInput", "Input (search)", "Ô 'Tìm kiếm theo mã code...'", "String", "Rỗng", "PromotionsList.tsx"),
            ("2", "promotionsTable", "Table", "Bảng khuyến mãi (Mã code, mức giảm, lượt dùng, thời hạn, trạng thái)", "Array<Promotion>", "[]", "PromotionsTab.tsx"),
        ],
        [
            ("1", "onChange searchPromoInput", "Lọc và hiển thị các chương trình khuyến mãi khớp mã code."),
        ],
    ),
    "UC8.5": (
        [
            ("1", "stopPromoBtn", "Button", "Nút Ngừng / Tạm dừng khuyến mãi (onToggleStatus)", "Null", "Kích hoạt", "PromotionsTab.tsx"),
            ("2", "pauseModal", "Modal", "Xác nhận ngừng/tạm dừng chương trình (PromotionModals)", "Boolean", "Đóng", "handlePauseSubmit"),
        ],
        [
            ("1", "onClick stopPromoBtn", "Gọi handleToggleStatus(p) hoặc mở PromotionModals xác nhận."),
            ("2", "onSubmit handlePauseSubmit", "Gọi API chuyển trạng thái khuyến mãi sang Ngừng áp dụng."),
        ],
    ),
    "UC9.2": (
        [
            ("1", "reviewsFilterBar", "Filter Bar", "Lọc đánh giá theo số sao, trạng thái duyệt (ReviewsFilterAndList)", "Enum", "Tất cả", "ReviewsTab.tsx"),
            ("2", "moderationActions", "Button[]", "Nút Duyệt / Khôi phục (onRestore) & Ẩn / Trả lời đánh giá", "Null", "Kích hoạt", "Mở ReviewModerationModals"),
        ],
        [
            ("1", "onClick Duyệt / Ẩn / Trả lời", "Gọi handleRestoreReview, handleConfirmHide hoặc handleConfirmReply."),
        ],
    ),
    "UC9.3": (
        [
            ("1", "notifHeaderBtn", "Button", "Nút 'Thông báo' kèm badge số chưa đọc trên Header", "Number", "0", "Customer / Workspace"),
            ("2", "notifListPanel", "Panel", "Danh sách thông báo đơn hàng, nhắc trả, khuyến mãi", "Array<Notification>", "[]", "Hỗ trợ đánh dấu đã đọc"),
        ],
        [
            ("1", "onClick thông báo", "Đánh dấu đã đọc và điều hướng đến chứng từ/đơn thuê liên quan."),
        ],
    ),
    "UC9.4": (
        [
            ("1", "broadcastForm", "Form", "Soạn tiêu đề, nội dung, kênh gửi & nhóm người nhận (NotificationBroadcastForm)", "Object", "Mặc định", "NotificationsTab.tsx"),
            ("2", "failedQueuePanel", "Panel", "Hàng đợi gửi lỗi & nút gửi lại (NotificationFailedQueue)", "Array", "[]", "onConfirmRetry"),
            ("3", "historyPanel", "Panel", "Lịch sử thông báo hệ thống đã phát hành (NotificationHistoryPanel)", "Array", "[]", "Theo dõi trạng thái gửi"),
        ],
        [
            ("1", "onSubmit vm.handleSend", "Gọi POST /api/thong-bao phát hành thông báo hàng loạt."),
            ("2", "onClick handleConfirmRetry", "Thử gửi lại các thông báo đang lỗi trong hàng đợi."),
        ],
    ),
    "UC10.1": (
        [
            ("1", "dateRangeFilter", "Date Inputs", "Chọn khoảng thời gian thống kê vận hành", "DateRange", "Tháng hiện tại", "StaffReportsTab.tsx / OperationsReportsSection"),
            ("2", "opsKpiAndTable", "KPI & Chart", "Số liệu đơn giao/trả, tỷ lệ sử dụng thiết bị, đơn quá hạn", "Object", "Từ API", "Xuất CSV qua handleExportCsv"),
        ],
        [
            ("1", "onChange khoảng ngày", "Gọi API báo cáo vận hành và cập nhật KPI / biểu đồ."),
        ],
    ),
    "UC10.2": (
        [
            ("1", "revenueSection", "Panel", "Báo cáo doanh thu thuần (RevenueReportsSection)", "Object", "Từ API", "ReportsTab.tsx"),
            ("2", "cashflowSection", "Panel", "Báo cáo dòng tiền thực thu - tiền cọc giữ - hoàn cọc (CashflowReportsSection)", "Object", "Từ API", "Phân biệt Doanh thu vs Dòng tiền"),
            ("3", "exportCsvBtn", "Button", "Nút xuất báo cáo CSV (handleExportCsv)", "Null", "Kích hoạt", "Xuất dữ liệu báo cáo"),
        ],
        [
            ("1", "onChange kỳ báo cáo", "Gọi API báo cáo tài chính phân tách Doanh thu và Dòng tiền cọc."),
            ("2", "onClick exportCsvBtn", "Gọi reports.handleExportCsv() tải file CSV."),
        ],
    ),
    "UC10.3": (
        [
            ("1", "importReportSection", "Panel", "Bảng tổng hợp phiếu nhập & tổng chi phí nhập theo NCC (ReportsImportSection)", "Array", "[]", "ReportsTab.tsx"),
            ("2", "drilldownModal", "Modal", "Xem chi tiết danh sách phiếu nhập kho trong kỳ (ReportsDrilldownModals)", "Boolean", "Đóng", "Click dòng để drill-down"),
        ],
        [
            ("1", "onClick chọn NCC/kỳ báo cáo", "Hiển thị chi tiết các phiếu nhập và thiết bị đã nhập trong kỳ."),
        ],
    ),
    "UC10.4": (
        [
            ("1", "auditFilterInputs", "Filter Bar", "Lọc theo người thực hiện, hành động, đối tượng, ngày", "Object", "Tất cả", "AuditLogTab.tsx"),
            ("2", "auditLogTable", "Table", "Bảng nhật ký kiểm toán hệ thống (AuditLogTable)", "Array<AuditLog>", "[]", "Hỗ trợ handleExportCsv"),
            ("3", "relatedDocModal", "Modal", "Mở chứng từ liên quan trực tiếp từ dòng nhật ký (AuditRelatedDocModal)", "Boolean", "Đóng", "handleOpenRelatedDoc"),
        ],
        [
            ("1", "onChange bộ lọc", "Gọi API GET /api/nhat-ky lọc lịch sử thao tác."),
            ("2", "onClick mở chứng từ", "Gọi vm.handleOpenRelatedDoc() mở AuditRelatedDocModal hoặc AuditEventDetailModal."),
        ],
    ),
}
