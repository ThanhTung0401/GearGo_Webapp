# Kế hoạch sửa CRUD cốt lõi và đồng bộ dữ liệu GearGo theo ERD

## 1. Mục tiêu

Thay toàn bộ CRUD “mô phỏng báo thành công” hiện tại bằng CRUD thật trên global state và `localStorage`, đồng thời đưa các module quản trị cốt lõi về đúng cấu trúc và quan hệ trong `erd.txt`:

- Danh mục sản phẩm.
- Sản phẩm và hình ảnh sản phẩm.
- Thiết bị.
- Nhà cung cấp.
- Phiếu nhập và chi tiết phiếu nhập.
- Khuyến mãi, phạm vi áp dụng và lượt sử dụng.

Dữ liệu sau khi thêm/sửa phải lập tức xuất hiện nhất quán ở khu vực quản trị, trang khách, giỏ thuê, phiếu nhập và các bộ chọn liên quan. Không còn form dùng chung chỉ nhận “tên/mã + ghi chú” rồi không cập nhật state.

## 2. Hiện trạng và nguyên nhân lỗi

- `CrudDialog` trong `src/views/AdminView.tsx` chỉ giữ state nội bộ, không gọi action trong `AppContext`.
- `AppState` không có action thêm/sửa danh mục, sản phẩm, NCC hoặc khuyến mãi.
- Danh mục đang được suy ra bằng `new Set(products.map(product.category))`; không có thực thể `DANH_MUC_SAN_PHAM`, không có danh mục cha, mô tả, thứ tự hay trạng thái.
- `Product` dùng chuỗi `category` thay vì khóa ngoại `categoryId`; thiếu mã hiển thị, kích thước, thông số và danh sách ảnh theo ERD.
- Nhà cung cấp và khuyến mãi đang hard-code ngay trong component, không persist và không liên kết với phiếu nhập/checkout.
- Phiếu nhập hiện chỉ tạo một draft mẫu cố định, chưa cho người dùng nhập NCC, sản phẩm, số lượng, đơn giá nhập, tình trạng và mã thiết bị.
- Checkout đang kiểm tra riêng chuỗi `CAMPGO10` thay vì đọc dữ liệu khuyến mãi.
- `localStorage` chưa có `schemaVersion` và không có migration, nên thay đổi model dễ làm dữ liệu cũ lỗi hoặc mất quan hệ.

## 3. Phạm vi và nguyên tắc

### Trong phạm vi

- CRUD thật cho sáu nhóm dữ liệu cốt lõi nêu trên.
- Form đầy đủ trường ERD và validation nghiệp vụ.
- Migration dữ liệu demo hiện tại sang schema mới.
- Đồng bộ dữ liệu giữa ba vai trò và sau reload.
- Cập nhật các màn hình khách/nhân viên đang đọc model cũ.
- Sửa các lỗi phát hiện được do quan hệ dữ liệu cũ trong phạm vi này.

### Ngoài phạm vi lần này

- Xây mới toàn bộ UI cho mọi bảng ERD như tài khoản, chính sách, bảo trì, điều chỉnh kho, nhật ký và thông báo.
- Backend hoặc database thật.
- Upload file thật; ảnh sản phẩm tiếp tục dùng URL và preview trong browser demo.
- Xóa cứng dữ liệu đã được chứng từ tham chiếu.

### Quy tắc bảo toàn lịch sử

- Đơn thuê cũ giữ snapshot tên sản phẩm, đơn giá thuê, cọc và bồi thường tại lúc đặt.
- Phiếu nhập đã xác nhận giữ snapshot tên NCC, tên sản phẩm và đơn giá nhập tại lúc nhập.
- Sửa sản phẩm/NCC sau này không ghi đè snapshot của đơn hoặc chứng từ cũ.
- Thực thể đã có tham chiếu chỉ được chuyển trạng thái ngừng/ẩn, không xóa cứng.

## 4. Model dữ liệu mới trong `src/store.ts`

### 4.1 `Category` — ánh xạ `DANH_MUC_SAN_PHAM`

```ts
interface Category {
  id: string;                 // khóa chính browser-side
  parentId: string | null;
  name: string;
  description: string;
  displayOrder: number;
  status: "active" | "inactive";
}
```

Validation:

- Tên bắt buộc và không trùng trong cùng danh mục cha.
- Không cho chọn chính nó hoặc hậu duệ làm danh mục cha.
- `displayOrder >= 0`.
- Không xóa cứng danh mục đang có sản phẩm hoặc danh mục con.
- Danh mục inactive không được chọn cho sản phẩm mới đang kinh doanh.

### 4.2 `Product` — ánh xạ `SAN_PHAM`

```ts
interface Product {
  id: string;
  categoryId: string;
  displayCode: string;
  name: string;
  brand: string;
  description: string;
  capacity: number | null;
  dimensions: string;
  specifications: Record<string, string>;
  pricePerDay: number;
  depositPerUnit: number;
  compensationValue: number;
  businessStatus: "active" | "inactive";
}
```

- Đổi toàn bộ chỗ dùng `category` sang lookup `categoryId`.
- Đổi `deposit` thành `depositPerUnit`, `compensation` thành `compensationValue`, `status` thành `businessStatus`.
- `displayCode` là mã nghiệp vụ duy nhất, ví dụ `SP-L001`; `id` là khóa nội bộ ổn định trong browser.
- Ba trường tiền là số nguyên VND, không âm và không được bỏ trống.
- Giá nhập không nằm trong sản phẩm; giá nhập chỉ nằm ở chi tiết phiếu nhập/thiết bị.

### 4.3 `ProductImage` — ánh xạ `HINH_ANH_SAN_PHAM`

```ts
interface ProductImage {
  id: string;
  productId: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}
```

- Mỗi sản phẩm tối đa một ảnh chính.
- Form cho thêm nhiều URL, xem preview, chọn ảnh chính, đổi thứ tự và xóa ảnh chưa dùng.
- Helper `getPrimaryProductImage(productId)` thay cho `product.image` ở landing, danh sách, chi tiết, giỏ và admin.

### 4.4 `Equipment` — ánh xạ `THIET_BI`

Mở rộng model hiện có:

```ts
interface Equipment {
  id: string;
  importReceiptLineId: string;
  currentProductId: string;
  displayCode: string;
  importedAt: string;
  importPrice: number;
  condition: string;
  includedAccessories: string[];
  usageStatus: EquipmentStatus;
  note: string;
  rentCount: number; // số liệu demo dẫn xuất/đếm
}
```

- Sản phẩm nguồn nhập được suy ra qua `importReceiptLineId`, không dùng `originalProductId` làm nguồn sự thật song song.
- Chuyển loại chỉ đổi `currentProductId`; dòng phiếu nhập và giá nhập giữ nguyên.
- Mã thiết bị duy nhất.
- Thiết bị của phiếu đã xác nhận không được sửa giá nhập trực tiếp.

### 4.5 `Supplier` — ánh xạ `NHA_CUNG_CAP`

```ts
interface Supplier {
  id: string;
  displayCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  note: string;
  cooperationStatus: "active" | "inactive";
}
```

- Mã NCC, email và số điện thoại được validate; mã NCC phải duy nhất.
- NCC đã có phiếu nhập chỉ được ngừng hợp tác, không xóa cứng.

### 4.6 Phiếu nhập — ánh xạ `PHIEU_NHAP_HANG` và `CHI_TIET_PHIEU_NHAP`

```ts
interface ImportReceipt {
  id: string;
  displayCode: string;
  supplierId: string;
  createdById: string;
  confirmedById?: string;
  supplierDocumentNumber: string;
  createdAt: string;
  expectedAt: string;
  receivedAt?: string;
  confirmedAt?: string;
  supplierSnapshot?: SupplierSnapshot;
  createdByNameSnapshot: string;
  confirmedByNameSnapshot?: string;
  status: "draft" | "confirmed" | "cancelled";
  cancelReason?: string;
  note: string;
  lines: ImportReceiptLine[];
}

interface ImportReceiptLine {
  id: string;
  productId: string;
  productNameSnapshot?: string;
  quantity: number;
  unitImportPrice: number;
  receivingCondition: string;
  note: string;
  equipmentCodes: string[];
}
```

- Tổng tiền luôn được tính từ `quantity * unitImportPrice`, không nhập tay.
- Draft được thêm/sửa/xóa dòng và hủy.
- Xác nhận chỉ thành công khi có NCC active, ít nhất một dòng, số lượng dương, đơn giá hợp lệ và số mã thiết bị đúng bằng số lượng.
- Mã thiết bị phải duy nhất trên toàn kho và trong chính phiếu.
- Xác nhận là thao tác nguyên tử: cập nhật snapshot, trạng thái phiếu và tạo toàn bộ thiết bị một lần; gọi lại không tạo trùng.
- Phiếu confirmed/cancelled chỉ đọc, không sửa trực tiếp.

### 4.7 Khuyến mãi — ánh xạ `KHUYEN_MAI` và bảng phạm vi

```ts
interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount: number | null;
  minimumRental: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  totalUsageLimit: number | null;
  perCustomerLimit: number | null;
  status: "active" | "inactive";
}

interface PromotionUsage {
  id: string;
  promotionId: string;
  orderId: string;
  reservedAt: string;
  expiresAt?: string;
  usedAt?: string;
  releasedAt?: string;
  discountAmount: number;
  status: "reserved" | "used" | "released";
}
```

- Code duy nhất, chuẩn hóa uppercase.
- Ngày kết thúc phải sau ngày bắt đầu.
- Giảm phần trăm từ 0–100; giảm cố định dương.
- Khuyến mãi chỉ giảm tiền thuê đủ điều kiện, không giảm cọc.
- Checkout gọi helper `evaluatePromotion` trên state, không hard-code `CAMPGO10`.
- Hết hạn/hủy đơn chờ thanh toán giải phóng lượt; thanh toán thành công chuyển lượt thành used.

### 4.8 Đánh giá và số liệu rating

- `rating` và `reviews` không còn là trường chỉnh sửa trong form sản phẩm vì không tồn tại trong `SAN_PHAM`.
- Giữ dữ liệu đánh giá ở collection riêng; UI tính tổng số và điểm trung bình bằng helper.
- Migration tạo dữ liệu tổng hợp tương thích cho seed hiện tại hoặc giữ một `ratingSummary` read-only cho demo, nhưng không cho admin sửa như thuộc tính sản phẩm.

## 5. Global state và domain actions trong `src/App.tsx`

Mở rộng `AppState` bằng các collection:

- `categories`
- `products`
- `productImages`
- `equipment`
- `suppliers`
- `importReceipts`
- `promotions`
- `promotionUsages`

Thêm action có kết quả thống nhất:

```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string>; message: string };
```

Actions:

- `createCategory`, `updateCategory`, `setCategoryStatus`.
- `createProduct`, `updateProduct`, `setProductStatus`.
- `replaceProductImages`.
- `createSupplier`, `updateSupplier`, `setSupplierStatus`.
- `createImportReceipt`, `updateImportReceipt`, `cancelImportReceipt`, `confirmImportReceipt`.
- `updateEquipment`, `transferEquipment`.
- `createPromotion`, `updatePromotion`, `setPromotionStatus`, `evaluatePromotion`.

Nguyên tắc:

- Validation domain nằm trong action/helper, không chỉ ở UI.
- Action không mutate array/object tại chỗ.
- ID nội bộ sinh bằng helper duy nhất; mã hiển thị do form nhập hoặc gợi ý, luôn kiểm tra unique.
- Action trả lỗi theo field để form hiển thị đúng vị trí.
- Sau action thành công, mọi view đọc cùng global state và cập nhật ngay.

## 6. Migration và persistence

### Schema mới

- Đổi storage key thành `geargo-demo-state-v2` hoặc lưu object có `schemaVersion: 2`.
- `PersistedStateV2` chứa toàn bộ collection mới.
- Không parse rồi cast thẳng; kiểm tra tối thiểu shape/version trước khi sử dụng.

### Migration V1 → V2

- Sinh `Category` từ các chuỗi category duy nhất hiện tại và map product sang `categoryId`.
- Chuyển `Product.id` cũ thành `displayCode` mặc định nếu chưa có mã riêng; giữ `id` cũ làm khóa ổn định để không gãy cart/order/equipment.
- Chuyển `capacity` chuỗi sang số khi có thể; phần không parse được đưa vào specifications.
- Tách `image` thành một `ProductImage` chính.
- Đổi ba trường giá sang tên mới mà không đổi giá trị.
- Seed `Supplier` từ các NCC đang hiển thị và map phiếu nhập hiện có.
- Mỗi dòng phiếu nhập được cấp `id`; thiết bị hiện tại được map về dòng nhập tương ứng khi xác định được.
- Seed promotions hiện có, bao gồm `CAMPGO10`.
- Giữ order snapshots và cart reference nguyên vẹn.
- Nếu một collection lỗi, fallback collection đó về seed và hiển thị cảnh báo dữ liệu demo; không âm thầm làm crash toàn app.

### Reset

- Reset xóa cả V1 và V2, khôi phục seed V2 đầy đủ.

## 7. UI quản trị trong `src/views/AdminView.tsx`

Tách file lớn thành các module để tránh tiếp tục dồn logic:

- `src/views/admin/CategoriesTab.tsx`
- `src/views/admin/ProductsTab.tsx`
- `src/views/admin/EquipmentTab.tsx`
- `src/views/admin/ImportReceiptsTab.tsx`
- `src/views/admin/SuppliersTab.tsx`
- `src/views/admin/PromotionsTab.tsx`
- `src/components/forms/CategoryForm.tsx`
- `src/components/forms/ProductForm.tsx`
- `src/components/forms/SupplierForm.tsx`
- `src/components/forms/ImportReceiptForm.tsx`
- `src/components/forms/PromotionForm.tsx`

### Danh mục

Form thêm/sửa có:

- Danh mục cha.
- Tên.
- Mô tả.
- Thứ tự hiển thị.
- Trạng thái.

Danh sách đọc từ `app.categories`, hiển thị cây cha/con, số sản phẩm và số thiết bị. Nút Ẩn/Hiện gọi action thật. Khi không thể ngừng danh mục, modal giải thích quan hệ đang chặn.

### Sản phẩm

Form thêm/sửa có đầy đủ:

- Mã sản phẩm hiển thị.
- Danh mục.
- Tên sản phẩm.
- Thương hiệu.
- Mô tả.
- Sức chứa dạng số.
- Kích thước.
- Danh sách thông số key/value.
- Giá thuê mỗi ngày.
- Mức cọc mỗi thiết bị.
- Giá trị bồi thường.
- Trạng thái kinh doanh.
- Danh sách URL ảnh, ảnh chính và thứ tự.

Các trường tiền dùng input number nhưng lưu number, hiển thị preview định dạng VND. Submit thành công đóng drawer/modal, toast kết quả và chọn đúng sản phẩm vừa tạo/sửa. Sản phẩm active xuất hiện ngay ở landing/danh sách khách.

### Thiết bị

- Hiển thị mã thiết bị, sản phẩm hiện tại, dòng/phiếu nhập nguồn, giá nhập, ngày nhập, tình trạng, phụ kiện, trạng thái và ghi chú.
- Cho sửa tình trạng, phụ kiện, trạng thái và ghi chú theo validation.
- Chuyển loại giữ nguyên `importReceiptLineId` và `importPrice`.
- Không cho sửa trực tiếp nguồn nhập hoặc giá nhập của thiết bị đã xác nhận.

### Nhà cung cấp

- Thay array hard-code bằng `app.suppliers`.
- Form đủ mã, tên, liên hệ, điện thoại, email, địa chỉ, mã số thuế, ghi chú, trạng thái hợp tác.
- Detail hiển thị lịch sử phiếu nhập lấy từ quan hệ `supplierId`.

### Phiếu nhập

- Nút “Tạo phiếu nháp” mở form rỗng thật, không tạo mẫu cố định.
- Form header chọn NCC, số chứng từ, ngày dự kiến, ghi chú.
- Bảng dòng cho thêm sản phẩm, số lượng, đơn giá nhập, tình trạng, ghi chú và mã thiết bị.
- Tổng từng dòng và tổng phiếu cập nhật realtime.
- Có lưu nháp, sửa nháp, hủy nháp với xác nhận và xác nhận nhập kho.
- Hiển thị lỗi trùng/thiếu mã thiết bị ngay tại dòng.

### Khuyến mãi

- Thay array hard-code bằng `app.promotions`.
- Form đầy đủ loại giảm, giá trị, mức tối đa, tiền thuê tối thiểu, phạm vi, sản phẩm/danh mục, thời gian, giới hạn và trạng thái.
- List hiển thị lượt reserved/used từ `promotionUsages`.
- Sửa code đã dùng cần bị chặn hoặc tạo khuyến mãi mới; không làm sai đơn cũ.

## 8. Cập nhật các view đang dùng model cũ

### `src/views/LandingView.tsx` và `src/views/ProductsView.tsx`

- Lookup tên danh mục từ `categoryId`.
- Dùng helper ảnh chính.
- Chỉ hiển thị category/product active.
- Giá thuê, cọc và bồi thường đọc từ field mới.
- Filter danh mục dùng ID, không dùng chuỗi tên.
- Sản phẩm mới active hiển thị ngay; inactive biến mất khỏi catalog nhưng vẫn truy được từ đơn cũ.

### `src/views/CustomerPortal.tsx`

- Giỏ và checkout dùng field giá mới.
- Áp mã qua `evaluatePromotion`.
- Hiển thị lỗi cụ thể: không tồn tại, chưa bắt đầu, hết hạn, sai phạm vi, chưa đạt tối thiểu, hết lượt.
- Khi tạo đơn, copy snapshot giá/tên vào order item.

### `src/views/StaffView.tsx`

- Lookup sản phẩm/thiết bị theo model mới.
- Bộ chọn thiết bị chỉ dùng equipment có `currentProductId` đúng sản phẩm và trạng thái hợp lệ.
- Nguồn nhập được truy qua receipt line thay vì `originalProductId`.

## 9. Validation và lỗi cần xử lý

- Duplicate mã hiển thị cho sản phẩm, thiết bị, NCC, phiếu nhập, khuyến mãi.
- Giá trị tiền rỗng, âm, NaN hoặc vượt giới hạn số an toàn.
- Số lượng phiếu nhập bằng 0/âm.
- Danh mục cha tạo vòng lặp.
- Product trỏ category không tồn tại/inactive.
- Ảnh URL sai hoặc không có ảnh chính; cho fallback ảnh mặc định nhưng báo validation mềm.
- NCC inactive được giữ ở phiếu cũ nhưng không được chọn cho phiếu mới.
- Confirm phiếu nhập lặp lại.
- Chuyển thiết bị đang thuê/đã phân công hoặc làm thiếu cam kết.
- Promotion ngày sai, phạm vi rỗng, phần trăm >100, hết lượt hoặc không đủ điều kiện.
- Dữ liệu localStorage cũ/không hợp lệ.
- Form bấm submit nhiều lần: disable trong lúc xử lý và action idempotent với nghiệp vụ nhạy cảm.

## 10. Trình tự triển khai

1. Thêm model, seed và helper domain mới trong `store.ts`/file domain riêng.
2. Viết migration V1 → V2 và persistence có version.
3. Mở rộng `AppState` và cài action CRUD/validation.
4. Chuyển category/product/image trước; cập nhật landing, catalog, cart và order snapshot.
5. Chuyển supplier và import receipt; cập nhật equipment/source lookup.
6. Chuyển promotion và checkout khỏi mã hard-code.
7. Thay `CrudDialog` bằng form chuyên biệt, tách `AdminView` thành các tab/module.
8. Bổ sung confirm modal, field errors, toast và empty state.
9. Chạy migration với dữ liệu V1 mẫu và kiểm tra reset.
10. Build và chạy toàn bộ acceptance scenarios.

## 11. Verification và acceptance scenarios

### Kiểm tra tự động/tĩnh

- `pnpm build` phải thành công.
- `git diff --check` không có lỗi.
- TypeScript bắt mọi nơi còn đọc field cũ (`category`, `deposit`, `compensation`, `image`, static supplier/promo arrays).
- Search xác nhận không còn `CrudDialog` chung và không còn hard-code `promoCode === "CAMPGO10"`.

### Kịch bản danh mục/sản phẩm

1. Thêm danh mục “Bàn ghế”, reload, danh mục vẫn còn.
2. Thêm sản phẩm có mã, giá thuê, cọc, bồi thường, thông số và hai ảnh.
3. Sản phẩm active xuất hiện ngay ở trang khách đúng danh mục, ảnh và ba mức tiền.
4. Sửa giá thuê; catalog/giỏ mới dùng giá mới nhưng đơn cũ giữ snapshot cũ.
5. Chuyển sản phẩm inactive; catalog ẩn sản phẩm, admin và đơn cũ vẫn truy cập được.
6. Thử mã trùng, giá âm, thiếu category và thấy lỗi đúng field.

### Kịch bản NCC/phiếu nhập/thiết bị

1. Thêm NCC đầy đủ, reload, NCC vẫn còn và chọn được trong phiếu nhập.
2. Tạo draft với hai dòng sản phẩm, đơn giá nhập và mã thiết bị; tổng tiền đúng.
3. Lưu draft không làm tăng kho.
4. Confirm thiếu/trùng mã bị chặn tại dòng.
5. Confirm hợp lệ tạo đúng số thiết bị một lần, lưu nguồn dòng nhập và giá nhập.
6. Sửa NCC sau confirm không đổi snapshot NCC trên phiếu cũ.
7. Chuyển loại thiết bị chỉ đổi sản phẩm hiện tại, không đổi nguồn nhập và giá nhập.

### Kịch bản khuyến mãi

1. Tạo mã giảm phần trăm cho một category và giới hạn lượt.
2. Sản phẩm ngoài phạm vi bị từ chối.
3. Đơn đủ điều kiện chỉ giảm tiền thuê, không giảm cọc.
4. Đơn chờ thanh toán giữ lượt; hết hạn/hủy giải phóng lượt; thanh toán thành công ghi used.
5. Reload không mất promotion usages.

### Kịch bản migration/reset

1. Nạp state V1 hiện tại và mở app không crash.
2. Product/cart/order/equipment cũ vẫn liên kết đúng sau migration.
3. Reload giữ toàn bộ thay đổi CRUD.
4. Reset khôi phục seed V2 và xóa dữ liệu cũ.

## 12. Tiêu chí hoàn tất

- Mọi nút thêm/sửa/ẩn trong các module cốt lõi đều thay đổi global state thật.
- Form sản phẩm có đầy đủ giá thuê/ngày, cọc/thiết bị và giá trị bồi thường như ERD.
- Không còn dữ liệu NCC/khuyến mãi nằm hard-code trong component.
- Category và Product dùng quan hệ khóa, không liên kết bằng chuỗi tên.
- Phiếu nhập và thiết bị bảo toàn nguồn nhập, giá nhập và snapshot.
- Thay đổi hiển thị nhất quán giữa admin, nhân viên và khách sau thao tác và sau reload.
- Dữ liệu đơn/chứng từ cũ không bị sửa ngược khi master data thay đổi.
- Build thành công và các acceptance scenarios trên đều đạt.