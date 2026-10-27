import { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  fmt, statusColors, type Category, type Product, type Supplier, type Promotion, type ImportReceipt,
  type StaffAccount, type StockAdjustmentReceipt, type StockAdjustmentLine, type EquipmentStatus, type Order,
  type Equipment, type Surcharge
} from "../store";
import Icon, { type IconName } from "../components/Icon";
import DashboardLayout from "../layouts/DashboardLayout";
import { CustomersTab, ReviewsTab, PoliciesTab, NotificationsTab, AdjustmentsTab, AuditLogTab } from "./AdminExtendedTabs";
import ReconciliationSheet from "./ReconciliationSheet";
import EquipmentLifecycleModal from "../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../components/InventoryAuditModal";
import SupplierProfileModal from "../components/SupplierProfileModal";
import GoodsReceivingModal from "../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../components/ImportAdjustmentModal";
import PromotionDetailModal from "../components/PromotionDetailModal";

type AdminTab =
  | "dashboard"
  | "categories"
  | "products"
  | "equipment"
  | "inventory"
  | "stock-adjust"
  | "staff"
  | "customers"
  | "reviews"
  | "suppliers"
  | "promotions"
  | "policies"
  | "notifications"
  | "adjustments"
  | "reports"
  | "audit-log";

function FormModal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="btn btn-ghost btn-sm text-lg leading-none">×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

const fieldStyle = { width: "100%", border: "1px solid var(--color-bone)", borderRadius: "10px", padding: "10px 14px", background: "white", fontSize: "0.9rem" };
const labelStyle = { display: "grid", gap: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" };

function FormActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-footer mt-4">
      <button type="button" onClick={onClose} className="btn btn-secondary btn-md">Hủy</button>
      <button type="submit" className="btn btn-primary btn-md">Lưu dữ liệu</button>
    </div>
  );
}

function CategoryForm({ app, category, onClose }: { app: ReturnType<typeof useApp>; category?: Category; onClose: () => void }) {
  const [form, setForm] = useState<Category>(category ?? { id: "", parentId: null, name: "", description: "", displayOrder: app.categories.length + 1, status: "active" });
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = app.saveCategory(form);
    if (!result.ok) return setError(result.message);
    onClose();
  };
  return <FormModal title={category ? "Sửa danh mục" : "Thêm danh mục"} description="Dữ liệu được lưu thật và dùng chung cho sản phẩm, kho và trang khách." onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Tên danh mục<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldStyle} /></label>
        <label style={labelStyle}>Danh mục cha<select value={form.parentId ?? ""} onChange={(e) => setForm({ ...form, parentId: e.target.value || null })} style={fieldStyle}><option value="">Không có</option>{app.categories.filter((item) => item.id !== form.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label style={labelStyle}>Thứ tự hiển thị<input type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} style={fieldStyle} /></label>
        <label style={labelStyle}>Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Category["status"] })} style={fieldStyle}><option value="active">Hoạt động</option><option value="inactive">Tạm ẩn</option></select></label>
      </div>
      <label style={labelStyle}>Mô tả<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={fieldStyle} /></label>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: "10px 12px", borderRadius: 8, fontSize: "0.8rem" }}>{error}</div>}
      <FormActions onClose={onClose} />
    </form>
  </FormModal>;
}

function ProductForm({ app, product, onClose }: { app: ReturnType<typeof useApp>; product?: Product; onClose: () => void }) {
  const [form, setForm] = useState<Product>(product ?? {
    id: "", displayCode: "", categoryId: app.categories.find((item) => item.status === "active")?.id, category: "", name: "", brand: "", description: "", capacity: "", dimensions: "", specifications: {}, pricePerDay: 0, deposit: 0, compensation: 0, image: "", images: [], status: "active", rating: 0, reviews: 0,
  });
  const [specText, setSpecText] = useState(Object.entries(form.specifications ?? {}).map(([key, value]) => `${key}: ${value}`).join("\n"));
  const [imageText, setImageText] = useState((form.images?.length ? form.images : [form.image]).filter(Boolean).join("\n"));
  const [error, setError] = useState("");
  const set = <K extends keyof Product>(key: K, value: Product[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const specifications = Object.fromEntries(specText.split("\n").map((line) => line.split(":")).filter((parts) => parts.length >= 2).map(([key, ...value]) => [key.trim(), value.join(":").trim()]));
    const images = imageText.split("\n").map((url) => url.trim()).filter(Boolean);
    const result = app.saveProduct({ ...form, specifications, images, image: images[0] ?? "" });
    if (!result.ok) return setError(result.message);
    onClose();
  };
  return <FormModal title={product ? "Sửa sản phẩm" : "Thêm sản phẩm"} description="Giá thuê, cọc và bồi thường là ba giá trị riêng theo ERD. Giá nhập chỉ được ghi ở phiếu nhập." onClose={onClose}>
    <form onSubmit={submit} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Mã sản phẩm<input value={form.displayCode ?? ""} onChange={(e) => set("displayCode", e.target.value)} placeholder="SP-L001" style={fieldStyle} /></label>
        <label style={labelStyle}>Danh mục<select value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value)} style={fieldStyle}><option value="">Chọn danh mục</option>{app.categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status === "inactive" ? " (tạm ẩn)" : ""}</option>)}</select></label>
        <label style={labelStyle}>Tên sản phẩm<input value={form.name} onChange={(e) => set("name", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Thương hiệu<input value={form.brand} onChange={(e) => set("brand", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Sức chứa<input value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="4 người" style={fieldStyle} /></label>
        <label style={labelStyle}>Kích thước<input value={form.dimensions ?? ""} onChange={(e) => set("dimensions", e.target.value)} placeholder="210 × 240 × 130 cm" style={fieldStyle} /></label>
        <label style={labelStyle}>Giá thuê/ngày (đ)<input type="number" min="0" value={form.pricePerDay} onChange={(e) => set("pricePerDay", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Mức cọc/thiết bị (đ)<input type="number" min="0" value={form.deposit} onChange={(e) => set("deposit", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Giá trị bồi thường (đ)<input type="number" min="0" value={form.compensation} onChange={(e) => set("compensation", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Trạng thái<select value={form.status} onChange={(e) => set("status", e.target.value as Product["status"])} style={fieldStyle}><option value="active">Đang kinh doanh</option><option value="inactive">Tạm dừng</option></select></label>
      </div>
      <label style={labelStyle}>Mô tả<textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} style={fieldStyle} /></label>
      <label style={labelStyle}>Thông số kỹ thuật <span style={{ color: "#6B7280", fontWeight: 400 }}>Mỗi dòng theo mẫu: Chống nước: IPX4</span><textarea rows={3} value={specText} onChange={(e) => setSpecText(e.target.value)} style={fieldStyle} /></label>
      <label style={labelStyle}>URL hình ảnh <span style={{ color: "#6B7280", fontWeight: 400 }}>Mỗi dòng một URL; dòng đầu là ảnh chính.</span><textarea rows={3} value={imageText} onChange={(e) => setImageText(e.target.value)} placeholder="https://..." style={fieldStyle} /></label>
      {imageText.split("\n")[0]?.trim() && <img src={imageText.split("\n")[0].trim()} alt="Xem trước sản phẩm" style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid var(--color-bone)" }} />}
      <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.8rem" }}>Giá thuê: <strong>{fmt(form.pricePerDay)}</strong> · Cọc: <strong>{fmt(form.deposit)}</strong> · Bồi thường: <strong>{fmt(form.compensation)}</strong></div>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: "10px 12px", borderRadius: 8, fontSize: "0.8rem" }}>{error}</div>}
      <FormActions onClose={onClose} />
    </form>
  </FormModal>;
}

function SupplierForm({ app, supplier, onClose }: { app: ReturnType<typeof useApp>; supplier?: Supplier; onClose: () => void }) {
  const [form, setForm] = useState<Supplier>(supplier ?? { id: "", displayCode: "", name: "", contactPerson: "", phone: "", email: "", address: "", taxCode: "", note: "", cooperationStatus: "active" });
  const [error, setError] = useState("");
  const set = <K extends keyof Supplier>(key: K, value: Supplier[K]) => setForm((current) => ({ ...current, [key]: value }));
  return <FormModal title={supplier ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"} description="Thông tin này được dùng để lập phiếu nhập và lưu snapshot khi xác nhận." onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); const result = app.saveSupplier(form); if (!result.ok) return setError(result.message); onClose(); }} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Mã nhà cung cấp<input value={form.displayCode} onChange={(e) => set("displayCode", e.target.value)} placeholder="NCC001" style={fieldStyle} /></label>
        <label style={labelStyle}>Tên nhà cung cấp<input value={form.name} onChange={(e) => set("name", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Người liên hệ<input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Số điện thoại<input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Email<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Mã số thuế<input value={form.taxCode} onChange={(e) => set("taxCode", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Trạng thái<select value={form.cooperationStatus} onChange={(e) => set("cooperationStatus", e.target.value as Supplier["cooperationStatus"])} style={fieldStyle}><option value="active">Đang hợp tác</option><option value="inactive">Ngừng hợp tác</option></select></label>
      </div>
      <label style={labelStyle}>Địa chỉ<textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} style={fieldStyle} /></label>
      <label style={labelStyle}>Ghi chú<textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} style={fieldStyle} /></label>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{error}</div>}
      <FormActions onClose={onClose} />
    </form>
  </FormModal>;
}

function PromotionForm({ app, promotion, onClose }: { app: ReturnType<typeof useApp>; promotion?: Promotion; onClose: () => void }) {
  const [form, setForm] = useState<Promotion>(promotion ?? { id: "", code: "", name: "", discountType: "percentage", discountValue: 10, maxDiscount: null, minimumRental: 0, scope: "all", productIds: [], categoryIds: [], startsAt: new Date().toISOString().slice(0, 16), endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16), totalUsageLimit: null, perCustomerLimit: 1, usedCount: 0, status: "active" });
  const [error, setError] = useState("");
  const isCodeLocked = !!promotion && promotion.usedCount > 0;

  const set = <K extends keyof Promotion>(key: K, value: Promotion[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "productIds" | "categoryIds", id: string) => set(key, form[key].includes(id) ? form[key].filter((item) => item !== id) : [...form[key], id]);

  // Tính thử mức giảm cho đơn hàng 1.000.000 đ
  const testSubtotal = 1000000;
  const simulatedDiscount = form.discountType === "percentage"
    ? Math.min((testSubtotal * (Number(form.discountValue) || 0)) / 100, form.maxDiscount ? Number(form.maxDiscount) : Infinity)
    : Math.min(testSubtotal, Number(form.discountValue) || 0);

  return <FormModal title={promotion ? "Sửa khuyến mãi" : "Tạo mã giảm"} description="Khuyến mãi chỉ giảm tiền thuê đủ điều kiện, không giảm tiền cọc." onClose={onClose}>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!form.code.trim()) return setError("Mã khuyến mãi không được để trống");
      if (new Date(form.endsAt) <= new Date(form.startsAt)) {
        return setError("Thời gian kết thúc phải diễn ra sau thời gian bắt đầu");
      }
      const result = app.savePromotion(form);
      if (!result.ok) return setError(result.message);
      onClose();
    }} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>
          <div className="flex items-center justify-between">
            <span>Mã giảm giá (In hoa)</span>
            {isCodeLocked && <span style={{ fontSize: "0.7rem", color: "#B45309", fontWeight: 700 }}>🔒 Đã khóa (UC8.3)</span>}
          </div>
          <input
            value={form.code}
            disabled={isCodeLocked}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="VD: HELLO2026"
            style={{ ...fieldStyle, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", background: isCodeLocked ? "var(--color-parchment)" : "white" }}
          />
          {isCodeLocked && (
            <div style={{ fontSize: "0.72rem", color: "#92400E" }}>
              Mã đã có {promotion.usedCount} lượt dùng thực tế, không thể sửa mã để bảo toàn chứng từ lịch sử.
            </div>
          )}
        </label>
        <label style={labelStyle}>Tên chương trình<input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Khuyến mãi Hè Rực Rỡ" style={fieldStyle} /></label>
        <label style={labelStyle}>Loại giảm<select value={form.discountType} onChange={(e) => set("discountType", e.target.value as Promotion["discountType"])} style={fieldStyle}><option value="percentage">Phần trăm (%)</option><option value="fixed">Số tiền cố định (VNĐ)</option></select></label>
        <label style={labelStyle}>Giá trị giảm {form.discountType === "percentage" ? "(%)" : "(VNĐ)"}<input type="number" min="0" max={form.discountType === "percentage" ? 100 : undefined} value={form.discountValue} onChange={(e) => set("discountValue", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Mức giảm tối đa (VNĐ, để trống nếu không giới hạn)<input type="number" min="0" value={form.maxDiscount ?? ""} onChange={(e) => set("maxDiscount", e.target.value ? Number(e.target.value) : null)} placeholder="Không giới hạn" style={fieldStyle} /></label>
        <label style={labelStyle}>Tiền thuê tối thiểu (VNĐ)<input type="number" min="0" value={form.minimumRental} onChange={(e) => set("minimumRental", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Thời gian bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Thời gian kết thúc<input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Giới hạn tổng lượt dùng (Để trống = Vô hạn)<input type="number" min="1" value={form.totalUsageLimit ?? ""} onChange={(e) => set("totalUsageLimit", e.target.value ? Number(e.target.value) : null)} placeholder="Không giới hạn" style={fieldStyle} /></label>
        <label style={labelStyle}>Giới hạn mỗi khách hàng (lượt)<input type="number" min="1" value={form.perCustomerLimit ?? ""} onChange={(e) => set("perCustomerLimit", e.target.value ? Number(e.target.value) : null)} style={fieldStyle} /></label>
        <label style={labelStyle}>Phạm vi áp dụng<select value={form.scope} onChange={(e) => set("scope", e.target.value as Promotion["scope"])} style={fieldStyle}><option value="all">Toàn bộ sản phẩm</option><option value="categories">Theo danh mục sản phẩm</option><option value="products">Theo sản phẩm chỉ định</option></select></label>
        <label style={labelStyle}>Trạng thái hoạt động<select value={form.status} onChange={(e) => set("status", e.target.value as Promotion["status"])} style={fieldStyle}><option value="active">Hoạt động (Active)</option><option value="inactive">Tạm dừng (Inactive)</option></select></label>
      </div>

      {/* Demo tính giảm giá trực quan */}
      <div style={{ background: "var(--color-cream)", border: "1px dashed var(--color-moss)", borderRadius: 10, padding: "10px 14px", fontSize: "0.8rem", color: "var(--color-forest)" }}>
        <strong>💡 Mô phỏng tính giảm giá (UC8.2):</strong> Với đơn hàng có tiền thuê hợp lệ <strong>{fmt(testSubtotal)}</strong>:
        <span style={{ display: "inline-block", marginLeft: 8, padding: "2px 8px", background: "white", borderRadius: 6, fontWeight: 700, color: "#047857" }}>
          Được giảm: -{fmt(simulatedDiscount)}
        </span>
        <span style={{ display: "inline-block", marginLeft: 8, color: "#6B7280" }}>
          (Còn lại tiền thuê: {fmt(testSubtotal - simulatedDiscount)} · Tiền cọc giữ nguyên không giảm)
        </span>
      </div>

      {form.scope === "categories" && <div><div style={{ ...labelStyle, marginBottom: 8 }}>Danh mục áp dụng</div><div className="flex flex-wrap gap-2">{app.categories.map((item) => <label key={item.id} className="icon-label" style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.78rem" }}><input type="checkbox" checked={form.categoryIds.includes(item.id)} onChange={() => toggle("categoryIds", item.id)} />{item.name}</label>)}</div></div>}
      {form.scope === "products" && <div><div style={{ ...labelStyle, marginBottom: 8 }}>Sản phẩm áp dụng</div><div className="flex flex-wrap gap-2">{app.products.map((item) => <label key={item.id} className="icon-label" style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.78rem" }}><input type="checkbox" checked={form.productIds.includes(item.id)} onChange={() => toggle("productIds", item.id)} />{item.name}</label>)}</div></div>}
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{error}</div>}
      <FormActions onClose={onClose} />
    </form>
  </FormModal>;
}

function ImportReceiptForm({ app, receipt, onClose }: { app: ReturnType<typeof useApp>; receipt?: ImportReceipt; onClose: () => void }) {
  const initialSupplier = app.suppliers.find((item) => item.cooperationStatus === "active");
  const [form, setForm] = useState<ImportReceipt>(receipt ?? {
    id: "", displayCode: `PN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-3)}`, supplierId: initialSupplier?.id ?? "", supplierName: initialSupplier?.name ?? "", supplierDocumentNumber: "", expectedAt: "", note: "", status: "Nháp", createdAt: new Date().toLocaleString("vi-VN"), createdBy: "NV Mai",
    lines: [{ id: "", productId: app.products[0]?.id ?? "", quantity: 1, unitPrice: 0, equipmentCodes: [""], receivingCondition: "Mới", note: "" }],
  });
  const [error, setError] = useState("");
  const updateLine = (index: number, patch: Partial<ImportReceipt["lines"][number]>) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) }));
  const setQuantity = (index: number, quantity: number) => {
    const line = form.lines[index];
    const codes = Array.from({ length: Math.max(0, quantity) }, (_, codeIndex) => line.equipmentCodes[codeIndex] ?? "");
    updateLine(index, { quantity, equipmentCodes: codes });
  };
  const total = form.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return <FormModal title={receipt ? "Sửa phiếu nhập nháp" : "Tạo phiếu nhập nháp"} description="Lưu nháp không tăng kho. Chỉ khi xác nhận hợp lệ, hệ thống mới tạo thiết bị." onClose={onClose}>
    <form onSubmit={(event) => {
      event.preventDefault();
      const supplier = app.suppliers.find((item) => item.id === form.supplierId);
      const normalized = { ...form, supplierName: supplier?.name ?? "", lines: form.lines.map((line) => ({ ...line, id: line.id || `LINE-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, equipmentCodes: line.equipmentCodes.map((code) => code.trim().toUpperCase()) })) };
      const result = app.saveImportReceipt(normalized);
      if (!result.ok) return setError(result.message);
      onClose();
    }} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Mã phiếu nhập<input value={form.displayCode ?? form.id} onChange={(e) => setForm({ ...form, displayCode: e.target.value })} style={fieldStyle} /></label>
        <label style={labelStyle}>Nhà cung cấp<select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} style={fieldStyle}><option value="">Chọn nhà cung cấp</option>{app.suppliers.filter((item) => item.cooperationStatus === "active" || item.id === form.supplierId).map((item) => <option key={item.id} value={item.id}>{item.displayCode} · {item.name}</option>)}</select></label>
        <label style={labelStyle}>Số chứng từ NCC<input value={form.supplierDocumentNumber ?? ""} onChange={(e) => setForm({ ...form, supplierDocumentNumber: e.target.value })} style={fieldStyle} /></label>
        <label style={labelStyle}>Ngày nhập dự kiến<input type="date" value={form.expectedAt ?? ""} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} style={fieldStyle} /></label>
      </div>
      <label style={labelStyle}>Ghi chú phiếu<textarea rows={2} value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} style={fieldStyle} /></label>
      <div className="flex justify-between items-center"><strong style={{ color: "var(--color-bark)" }}>Chi tiết nhập hàng</strong><button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, { id: "", productId: app.products[0]?.id ?? "", quantity: 1, unitPrice: 0, equipmentCodes: [""], receivingCondition: "Mới", note: "" }] })} style={{ border: "1px solid var(--color-bone)", borderRadius: 8, background: "white", padding: "7px 10px", cursor: "pointer", fontWeight: 600 }}>+ Thêm dòng</button></div>
      {form.lines.map((line, index) => <div key={line.id || index} style={{ border: "1px solid var(--color-bone)", borderRadius: 12, padding: 14, background: "var(--color-cream)" }}>
        <div className="responsive-two-column grid gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
          <label style={labelStyle}>Sản phẩm<select value={line.productId} onChange={(e) => updateLine(index, { productId: e.target.value })} style={fieldStyle}>{app.products.map((item) => <option key={item.id} value={item.id}>{item.displayCode ?? item.id} · {item.name}</option>)}</select></label>
          <label style={labelStyle}>Số lượng<input type="number" min="1" value={line.quantity} onChange={(e) => setQuantity(index, Number(e.target.value))} style={fieldStyle} /></label>
          <label style={labelStyle}>Đơn giá nhập<input type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} style={fieldStyle} /></label>
        </div>
        <label style={{ ...labelStyle, marginTop: 10 }}>Mã thiết bị ({line.equipmentCodes.length}/{line.quantity})<div className="flex flex-wrap gap-2">{line.equipmentCodes.map((code, codeIndex) => <input key={codeIndex} value={code} onChange={(e) => updateLine(index, { equipmentCodes: line.equipmentCodes.map((item, itemIndex) => itemIndex === codeIndex ? e.target.value : item) })} placeholder={`Mã ${codeIndex + 1}`} style={{ ...fieldStyle, width: 120 }} />)}</div></label>
        <div className="responsive-two-column grid gap-3 mt-3" style={{ gridTemplateColumns: "1fr 2fr" }}><label style={labelStyle}>Tình trạng khi nhập<input value={line.receivingCondition ?? ""} onChange={(e) => updateLine(index, { receivingCondition: e.target.value })} style={fieldStyle} /></label><label style={labelStyle}>Ghi chú dòng<input value={line.note ?? ""} onChange={(e) => updateLine(index, { note: e.target.value })} style={fieldStyle} /></label></div>
        <div className="flex justify-between items-center mt-3"><span style={{ fontSize: "0.8rem" }}>Thành tiền: <strong>{fmt(line.quantity * line.unitPrice)}</strong></span>{form.lines.length > 1 && <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) })} style={{ border: 0, background: "transparent", color: "#B91C1C", cursor: "pointer" }}>Xóa dòng</button>}</div>
      </div>)}
      <div className="flex justify-between" style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 13, fontWeight: 800 }}><span>Tổng phiếu nhập</span><span>{fmt(total)}</span></div>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{error}</div>}
      <FormActions onClose={onClose} />
    </form>
  </FormModal>;
}

function EquipmentForm({ app, equipment, onClose }: { app: ReturnType<typeof useApp>; equipment: ReturnType<typeof useApp>["equipment"][number]; onClose: () => void }) {
  const [form, setForm] = useState(equipment);
  const [accessories, setAccessories] = useState((equipment.includedAccessories ?? []).join(", "));
  const [error, setError] = useState("");
  const product = app.products.find((item) => item.id === form.productId);
  const sourceReceipt = app.importReceipts.find((item) => item.id === form.importReceiptId);
  return <FormModal title={`Cập nhật thiết bị ${equipment.displayCode ?? equipment.id}`} description="Nguồn nhập và giá nhập được khóa; chỉ tình trạng vận hành, phụ kiện và ghi chú được cập nhật." onClose={onClose}>
    <form onSubmit={(event) => {
      event.preventDefault();
      const result = app.saveEquipment({ ...form, includedAccessories: accessories.split(",").map((item) => item.trim()).filter(Boolean) });
      if (!result.ok) return setError(result.message);
      onClose();
    }} className="grid gap-4 mt-5">
      <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.8rem" }}><strong>{product?.name}</strong><br />Nguồn nhập: {sourceReceipt?.displayCode ?? form.importReceiptId} / {form.importReceiptLineId ?? "chưa có mã dòng"} · Giá nhập: {fmt(form.importPrice)} · Ngày nhập: {form.importDate}</div>
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Tình trạng<input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} style={fieldStyle} /></label>
        <label style={labelStyle}>Trạng thái sử dụng<select value={form.equipmentStatus} onChange={(e) => setForm({ ...form, equipmentStatus: e.target.value as typeof form.equipmentStatus })} style={fieldStyle}>{["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label style={labelStyle}>Phụ kiện đi kèm<input value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder="Túi đựng, cọc, dây chằng" style={fieldStyle} /></label>
      <label style={labelStyle}>Ghi chú<textarea rows={3} value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} style={fieldStyle} /></label>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{error}</div>}
      <FormActions onClose={onClose} />
    </form>
  </FormModal>;
}

export default function AdminView() {
  const app = useApp();
  const [tab, setTab] = useState<AdminTab>("dashboard");

  const tabs: { key: AdminTab; label: string; icon: IconName }[] = [
    { key: "dashboard", label: "Tổng quan", icon: "grid" },
    { key: "categories", label: "Danh mục", icon: "tag" },
    { key: "products", label: "Sản phẩm", icon: "tent" },
    { key: "equipment", label: "Thiết bị", icon: "tool" },
    { key: "inventory", label: "Phiếu nhập", icon: "package" },
    { key: "stock-adjust", label: "Điều chỉnh kho", icon: "settings" },
    { key: "staff", label: "Nhân viên", icon: "users" },
    { key: "customers", label: "Khách hàng", icon: "user" },
    { key: "reviews", label: "Đánh giá", icon: "sparkles" },
    { key: "suppliers", label: "Nhà cung cấp", icon: "truck" },
    { key: "promotions", label: "Khuyến mãi", icon: "tag" },
    { key: "policies", label: "Chính sách thuê", icon: "shield" },
    { key: "notifications", label: "Thông báo HT", icon: "bell" },
    { key: "adjustments", label: "Bù trừ tài chính", icon: "wallet" },
    { key: "reports", label: "Báo cáo", icon: "chart" },
    { key: "audit-log", label: "Audit Log", icon: "clipboard" },
  ];

  const currentTab = tabs.find((item) => item.key === tab);

  return (
    <DashboardLayout
      title={currentTab?.label || "Tổng quan"}
      subtitle="Không gian quản trị GearGo"
      navItems={tabs}
      activeKey={tab}
      onSelectNav={(key) => setTab(key as AdminTab)}
      brandSubtitle="Cổng quản trị viên"
    >
      {tab === "dashboard" && <DashboardTab app={app} />}
      {tab === "categories" && <CategoriesTab app={app} />}
      {tab === "products" && <ProductsTab app={app} />}
      {tab === "equipment" && <EquipmentTab app={app} />}
      {tab === "inventory" && <InventoryTab app={app} />}
      {tab === "stock-adjust" && <StockAdjustTab app={app} />}
      {tab === "staff" && <StaffAccountsTab app={app} />}
      {tab === "customers" && <CustomersTab app={app} />}
      {tab === "reviews" && <ReviewsTab app={app} />}
      {tab === "suppliers" && <SuppliersTab app={app} />}
      {tab === "promotions" && <PromotionsTab app={app} />}
      {tab === "policies" && <PoliciesTab app={app} />}
      {tab === "notifications" && <NotificationsTab app={app} />}
      {tab === "adjustments" && <AdjustmentsTab app={app} />}
      {tab === "reports" && <ReportsTab app={app} />}
      {tab === "audit-log" && <AuditLogTab app={app} />}
    </DashboardLayout>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [adminSelectedOrder, setAdminSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>("Chờ đối soát");
  // UC5.3: Xử lý tranh chấp phụ phí
  const [resolvingSurcharge, setResolvingSurcharge] = useState<{ order: Order; surcharge: Surcharge } | null>(null);
  const [resolutionType, setResolutionType] = useState<"approved" | "rejected" | "adjusted">("approved");
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0);
  const [resolutionReason, setResolutionReason] = useState("");

  const pendingSurcharges = app.orders.flatMap((order) =>
    order.surcharges
      .filter((surcharge) => surcharge.status === "Chờ duyệt" || surcharge.status === "Tranh chấp")
      .map((surcharge) => ({ order, surcharge }))
  );
  return (
    <div>
      <h2 className="admin-title text-xl mb-4">Tổng quan hệ thống</h2>
      <div className="admin-stats-grid">
        {([
          { label: "Doanh thu tháng 12", value: "14.200.000đ", sub: "+18% tháng trước", icon: "wallet", color: "var(--color-forest)" },
          { label: "Đơn đang xử lý", value: app.orders.filter((o) => !["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn"].includes(o.status)).length.toString(), sub: "Chưa hoàn tất", icon: "clipboard", color: "var(--color-amber)" },
          { label: "Thiết bị đang thuê", value: app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length.toString(), sub: `/ ${app.equipment.length} tổng cộng`, icon: "tent", color: "#1D4ED8" },
          { label: "Cọc đang giữ", value: fmt(app.orders.filter((o) => o.status === "Đang thuê").reduce((s, o) => s + o.depositTotal, 0)), sub: "Không phải doanh thu", icon: "shield", color: "#6B7280" },
        ] as { label: string; value: string; sub: string; icon: IconName; color: string }[]).map((k) => (
          <div key={k.label} className="kpi-card">
            <div style={{ color: k.color }}><Icon name={k.icon} size={22} /></div>
            <div className="kpi-value" style={{ color: k.color, fontSize: "1.3rem" }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* UC5.3: Trung tâm xử lý tranh chấp & Duyệt phụ phí */}
      <div className="card-panel p-0 overflow-hidden mb-5">
        <div className="flex justify-between items-center bg-parchment p-3 px-4 border-b border-bone">
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "0.72rem", background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                UC5.3
              </span>
              <strong className="text-sm text-bark">Trung tâm xử lý tranh chấp & Duyệt phụ phí</strong>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Đối chiếu chứng cứ bàn giao (BBBG) vs nhận trả (PNT), xem phản hồi khiếu nại của khách để kết luận mức phí hợp lệ.
            </div>
          </div>
          <span className={`badge ${pendingSurcharges.length ? "badge-warning" : "badge-success"}`}>
            {pendingSurcharges.length} khoản cần xử lý
          </span>
        </div>
        {pendingSurcharges.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">✓ Tất cả phụ phí đã được duyệt hoặc xử lý tranh chấp xong.</div>
        ) : pendingSurcharges.map(({ order, surcharge }) => {
          const isDisputed = surcharge.status === "Tranh chấp";
          return (
            <div key={surcharge.id} className="flex items-center gap-3 flex-wrap p-3 px-4 border-t border-bone" style={{ background: isDisputed ? "#FFFBEB" : "white" }}>
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{surcharge.type} · {surcharge.equipmentId}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontWeight: 700,
                    background: isDisputed ? "#FEE2E2" : "#FEF3C7",
                    color: isDisputed ? "#DC2626" : "#B45309",
                  }}>
                    {isDisputed ? "⚠️ Khách đang khiếu nại" : "Chờ duyệt"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Đơn {order.id} · Khách: {order.customerName} ({order.customerPhone}) · Lý do: {surcharge.reason}
                </div>
                {surcharge.customerResponse && (
                  <div style={{ fontSize: "0.74rem", color: "#B45309", marginTop: 2 }}>
                    <strong>Ý kiến khách:</strong> "{surcharge.customerResponse}"
                  </div>
                )}
              </div>
              <strong className="text-red-600 font-mono">+{fmt(surcharge.amount)}</strong>
              <button
                type="button"
                onClick={() => {
                  setResolvingSurcharge({ order, surcharge });
                  setResolutionType("approved");
                  setAdjustedAmount(surcharge.amount);
                  setResolutionReason("");
                }}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700 }}
              >
                ⚖️ Xem chứng cứ & Kết luận (UC5.3)
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <div style={{ background: "var(--color-parchment)", padding: "12px 16px", fontWeight: 700, fontSize: "0.88rem", color: "var(--color-bark)" }}>Đơn thuê gần đây</div>
          {app.orders.slice(-5).reverse().map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <div key={o.id} style={{ padding: "11px 16px", borderBottom: "1px solid var(--color-bone)", display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{o.customerName}</div>
                  <div style={{ fontSize: "0.7rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{o.id}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 600 }}>{fmt(o.rental - o.discount + o.depositTotal)}</div>
                  <span style={{ background: sc.bg, color: sc.text, padding: "1px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>{o.status}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <div style={{ background: "var(--color-parchment)", padding: "12px 16px", fontWeight: 700, fontSize: "0.88rem", color: "var(--color-bark)" }}>Khả dụng thiết bị</div>
          {app.products.map((p) => {
            const avail = app.getAvailable(p.id);
            const total = app.equipment.filter((e) => e.productId === p.id && e.equipmentStatus === "Sẵn sàng").length;
            return (
              <div key={p.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-bone)" }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700, color: avail > 1 ? "var(--color-forest)" : "#DC2626" }}>{avail} / {total}</span>
                </div>
                <div style={{ background: "var(--color-bone)", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: avail / total > 0.5 ? "var(--color-forest)" : avail > 0 ? "var(--color-amber)" : "#EF4444", width: total > 0 ? `${(avail / total) * 100}%` : "0%", transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status flow & Đối soát cọc (UC5.4 cho Quản trị viên) */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "18px", marginTop: "18px" }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-bark)", margin: 0 }}>
              Luồng trạng thái đơn thuê & Giám sát đối soát (UC5.4)
            </h3>
            <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Click vào một trạng thái để xem danh sách đơn hoặc thực hiện đối soát cọc</div>
          </div>
          {statusFilter && (
            <button onClick={() => setStatusFilter(null)} style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#6B7280", cursor: "pointer", textDecoration: "underline" }}>
              Bỏ chọn lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].map((s, i, arr) => {
            const sc = statusColors[s] || { bg: "#F3F4F6", text: "#374151" };
            const cnt = app.orders.filter((o) => o.status === s).length;
            const isSelected = statusFilter === s;
            return (
              <div key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter(isSelected ? null : s)}
                  style={{
                    background: isSelected ? "var(--color-forest)" : sc.bg,
                    borderRadius: "8px",
                    padding: "7px 12px",
                    textAlign: "center",
                    minWidth: 80,
                    border: isSelected ? "2px solid var(--color-forest)" : "1px solid transparent",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 2px 8px rgba(24,61,45,0.2)" : "none",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: isSelected ? "white" : sc.text }}>{cnt}</div>
                  <div style={{ fontSize: "0.66rem", color: isSelected ? "white" : sc.text, fontWeight: 600, whiteSpace: "nowrap" }}>{s}</div>
                </button>
                {i < arr.length - 1 && <span style={{ color: "var(--color-bone)", fontSize: "1.1rem" }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* Danh sách đơn theo trạng thái đang chọn */}
        {statusFilter && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--color-bone)" }}>
            <div className="flex justify-between items-center mb-2">
              <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>
                Danh sách đơn: {statusFilter} ({app.orders.filter((o) => o.status === statusFilter).length} đơn)
              </strong>
            </div>

            <div className="flex flex-col gap-2">
              {app.orders.filter((o) => o.status === statusFilter).length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#9CA3AF", fontSize: "0.8rem", background: "#F9FAFB", borderRadius: 8 }}>
                  Không có đơn hàng nào ở trạng thái {statusFilter}.
                </div>
              ) : (
                app.orders.filter((o) => o.status === statusFilter).map((o) => (
                  <div key={o.id} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "0.88rem" }}>{o.id}</strong>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{o.customerName}</span>
                        <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>({o.customerPhone})</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 2 }}>
                        Tiền thuê: {fmt(o.rental - o.discount)} · Tiền cọc: {fmt(o.depositTotal)} · Hẹn trả: {o.returnTime}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(o.status === "Chờ đối soát" || o.status === "Hoàn tất") && (
                        <button
                          type="button"
                          onClick={() => setAdminSelectedOrder(o)}
                          style={{
                            background: o.status === "Chờ đối soát" ? "var(--color-forest)" : "white",
                            color: o.status === "Chờ đối soát" ? "white" : "var(--color-bark)",
                            border: `1px solid ${o.status === "Chờ đối soát" ? "var(--color-forest)" : "var(--color-bone)"}`,
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {o.status === "Chờ đối soát" ? "📝 Mở bảng đối soát (UC5.4)" : "🔍 Xem đối soát đã khóa"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Quản trị viên xử lý kết luận tranh chấp & duyệt phụ phí (UC5.3) */}
      {resolvingSurcharge && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div className="modal-header flex justify-between items-center mb-4 pb-3 border-b border-bone">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC5.3: DUYỆT & XỬ LÝ TRANH CHẤP PHỤ PHÍ
                </span>
                <h3 className="modal-title font-bold text-lg text-bark mt-1">
                  Hồ sơ xử lý phụ phí: {resolvingSurcharge.surcharge.type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResolvingSurcharge(null)}
                className="btn btn-ghost btn-sm text-xl"
                style={{ border: "none", background: "none", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            {/* Thông tin căn cứ đề xuất & Đơn hàng */}
            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: "0.82rem" }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>Đơn hàng: <strong>{resolvingSurcharge.order.id}</strong></div>
                <div>Khách hàng: <strong>{resolvingSurcharge.order.customerName}</strong> ({resolvingSurcharge.order.customerPhone})</div>
                <div>Thiết bị liên quan: <strong className="font-mono text-forest">{resolvingSurcharge.surcharge.equipmentId}</strong></div>
                <div>Người lập đề xuất: <strong>{resolvingSurcharge.surcharge.createdBy}</strong></div>
              </div>
              <div style={{ paddingTop: 8, borderTop: "1px dashed var(--color-bone)" }}>
                Lý do lập phí ban đầu: <em className="text-gray-700">"{resolvingSurcharge.surcharge.reason}"</em>
              </div>
            </div>

            {/* Đối chiếu chứng cứ 2 chiều (Dòng chính 2 UC5.3) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
                🔍 Đối chiếu chứng cứ trước và sau thuê (Dòng 2 UC5.3):
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Cột 1: Trước thuê (BBBG - UC4.2) */}
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, fontSize: "0.78rem" }}>
                  <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: 4 }}>
                    📋 Lúc bàn giao (BBBG - UC4.2)
                  </div>
                  <div>Thời gian: {resolvingSurcharge.order.handoverRecord?.handoverAt || resolvingSurcharge.order.pickupTime}</div>
                  <div>Nhân viên giao: {resolvingSurcharge.order.handoverRecord?.staffName || "Cửa hàng"}</div>
                  <div>
                    Tình trạng: {
                      resolvingSurcharge.order.handoverRecord?.items.find((i) => i.equipmentId === resolvingSurcharge.surcharge.equipmentId)?.condition || "Tốt, hoạt động bình thường"
                    }
                  </div>
                  <div style={{ marginTop: 4, color: "#4B5563" }}>
                    Ghi chú giao: {resolvingSurcharge.order.handoverRecord?.initialNotes || "Không có ghi nhận lỗi"}
                  </div>
                </div>

                {/* Cột 2: Sau thuê (PNT - UC4.3) */}
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12, fontSize: "0.78rem" }}>
                  <div style={{ fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>
                    📦 Lúc nhận trả (PNT - UC4.3)
                  </div>
                  <div>Thời gian: {resolvingSurcharge.order.returnedAt || "Đã nhận trả"}</div>
                  <div>
                    Tình trạng: {
                      resolvingSurcharge.order.returnReceipts?.flatMap((r) => r.items).find((i) => i.equipmentId === resolvingSurcharge.surcharge.equipmentId)?.condition || resolvingSurcharge.surcharge.type
                    }
                  </div>
                  <div style={{ marginTop: 4, color: "#991B1B" }}>
                    Tổn thất ghi nhận: {resolvingSurcharge.surcharge.reason}
                  </div>
                </div>
              </div>
            </div>

            {/* Xem phản hồi khiếu nại của khách (Dòng chính 3 UC5.3) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
                🗣️ Phản hồi khiếu nại của khách hàng (Dòng 3 UC5.3):
              </div>
              {resolvingSurcharge.surcharge.customerResponse ? (
                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: 12, fontSize: "0.82rem", color: "#92400E" }}>
                  <strong>Khách hàng phản hồi:</strong> "{resolvingSurcharge.surcharge.customerResponse}"
                </div>
              ) : (
                <div style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.78rem", color: "#6B7280" }}>
                  ℹ️ Khách hàng chưa có khiếu nại (Khoản phí đang ở trạng thái chờ duyệt thông thường).
                </div>
              )}
            </div>

            {/* Form kết luận & quyết định của Quản trị viên (Dòng chính 4 & 5 UC5.3) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const finalAmt = resolutionType === "rejected" ? 0 : resolutionType === "adjusted" ? adjustedAmount : resolvingSurcharge.surcharge.amount;
                app.resolveDisputedSurcharge(
                  resolvingSurcharge.order.id,
                  resolvingSurcharge.surcharge.id,
                  resolutionType,
                  finalAmt,
                  resolutionReason || (resolutionType === "approved" ? "Quản trị viên chấp thuận mức phí đề xuất" : resolutionType === "adjusted" ? `Đã thương lượng giảm phí còn ${fmt(adjustedAmount)}` : "Bác bỏ do không đủ căn cứ thu")
                );
                setResolvingSurcharge(null);
              }}
              style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 10, padding: 16 }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>
                ⚖️ Quyết định xử lý & Mức phí phê duyệt vào đối soát:
              </div>

              <div className="flex flex-col gap-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "0.82rem" }}>
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionType === "approved"}
                    onChange={() => setResolutionType("approved")}
                  />
                  <span>
                    <strong>1. Chấp thuận mức đề xuất:</strong> Giữ nguyên {fmt(resolvingSurcharge.surcharge.amount)}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "0.82rem" }}>
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionType === "adjusted"}
                    onChange={() => {
                      setResolutionType("adjusted");
                      if (adjustedAmount === 0) setAdjustedAmount(Math.round(resolvingSurcharge.surcharge.amount / 2));
                    }}
                  />
                  <span>
                    <strong>2. Thỏa thuận giảm phí (Điều chỉnh có căn cứ):</strong>
                  </span>
                </label>

                {resolutionType === "adjusted" && (
                  <div style={{ marginLeft: 24, marginTop: 4 }}>
                    <label style={{ fontSize: "0.78rem", color: "#4B5563", display: "block", marginBottom: 3 }}>
                      Số tiền sau điều chỉnh thỏa thuận (đ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={resolvingSurcharge.surcharge.amount}
                      value={adjustedAmount}
                      onChange={(e) => setAdjustedAmount(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: "6px 10px", width: 180, borderRadius: 6, border: "1px solid var(--color-bone)", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "0.82rem" }}>
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionType === "rejected"}
                    onChange={() => setResolutionType("rejected")}
                  />
                  <span>
                    <strong>3. Bác bỏ phụ phí (Quy về 0đ - Dòng phụ 4.1):</strong> Không có căn cứ thu hoặc thuộc hao mòn cho phép
                  </span>
                </label>
              </div>

              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  Ghi chú kết luận & Căn cứ xử lý (Lưu vết kiểm toán):
                </label>
                <textarea
                  rows={2}
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="Ghi nhận thỏa thuận qua điện thoại với khách, trích xuất hình ảnh kiểm tra..."
                  className="form-textarea"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.8rem" }}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingSurcharge(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  ✓ Xác nhận kết luận & Cập nhật đưa vào đối soát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đối soát dành cho Quản trị viên (UC5.4) */}
      {adminSelectedOrder && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ maxWidth: 860, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
            <ReconciliationSheet
              order={adminSelectedOrder}
              app={app}
              userRole="admin"
              onClose={() => setAdminSelectedOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [action, setAction] = useState<Category | "new" | null>(null);
  const [message, setMessage] = useState("");
  const catData = [...app.categories].sort((a, b) => a.displayOrder - b.displayOrder).map((category) => ({
    category,
    products: app.products.filter((p) => p.categoryId === category.id),
    equipment: app.equipment.filter((e) => app.products.find((p) => p.id === e.productId)?.categoryId === category.id),
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý danh mục</h2>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm danh mục</button>
      </div>
      {message && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.82rem" }}>{message}</div>}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {catData.map((c) => {
          const avail = c.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
          return (
            <div key={c.category.id} style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden", opacity: c.category.status === "inactive" ? 0.62 : 1 }}>
              <div style={{ background: "var(--color-forest)", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,.14)", color: "white", display: "grid", placeItems: "center" }}><Icon name="tag" size={22} /></span>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "1.1rem", fontWeight: 700 }}>{c.category.name}</div>
                  <div style={{ color: "var(--color-sage)", fontSize: "0.75rem" }}>{c.products.length} sản phẩm · {c.equipment.length} thiết bị</div>
                </div>
              </div>
              <div style={{ padding: "14px 18px" }}>
                {c.products.map((p) => (
                  <div key={p.id} className="flex justify-between items-center py-2" style={{ borderBottom: "1px dashed var(--color-bone)", fontSize: "0.82rem" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>{p.brand}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-forest)" }}>{fmt(p.pricePerDay)}/ngày</div>
                      <span style={{ background: p.status === "active" ? "#DCFCE7" : "#F3F4F6", color: p.status === "active" ? "#15803D" : "#6B7280", padding: "1px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>{p.status === "active" ? "Đang kinh doanh" : "Tạm dừng"}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-3" style={{ fontSize: "0.78rem" }}>
                  <span style={{ color: "#9CA3AF" }}>Thiết bị sẵn sàng</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: avail > 0 ? "var(--color-forest)" : "#EF4444" }}>{avail} / {c.equipment.length}</span>
                </div>
              </div>
              <div style={{ padding: "0 18px 14px", display: "flex", gap: "6px" }}>
                <button onClick={() => setAction(c.category)} style={{ flex: 1, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Sửa</button>
                <button onClick={() => { const result = app.setCategoryStatus(c.category.id, c.category.status === "active" ? "inactive" : "active"); setMessage(result.ok ? "" : result.message); }} style={{ flex: 1, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px", fontSize: "0.75rem", cursor: "pointer" }}>{c.category.status === "active" ? "Ẩn" : "Hiện"}</button>
              </div>
            </div>
          );
        })}
      </div>
      {action && <CategoryForm app={app} category={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
    </div>
  );
}

// ─── Products Tab (UC6.7: Tìm kiếm & Lọc danh mục) ──────────────────────────
function ProductsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [action, setAction] = useState<Product | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Tất cả");

  const categories = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.category)))];
  const filteredProducts = app.products.filter((p) => {
    const matchCat = catFilter === "Tất cả" || p.category === catFilter;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.displayCode ?? p.id).toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const detail = sel ? app.products.find((p) => p.id === sel) : null;
  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý sản phẩm</h2>
          <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>Tra cứu, quản lý danh mục và thông tin niêm yết thiết bị cắm trại.</p>
        </div>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm sản phẩm</button>
      </div>

      {/* UC6.7: Thanh tìm kiếm từ khóa & Bộ lọc danh mục */}
      <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
        <input
          type="text"
          placeholder="🔍 Tìm tên sản phẩm, mã, thương hiệu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.85rem" }}
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          aria-label="Lọc theo danh mục"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.85rem", background: "white", minWidth: 160 }}
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>
          Tìm thấy <strong>{filteredProducts.length}</strong> / {app.products.length} sản phẩm
        </span>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: detail ? "1fr 360px" : "1fr" }}>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                {["Mã", "Sản phẩm", "Danh mục", "Giá/ngày", "Cọc", "Bồi thường", "Khả dụng", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, i) => {
                const avail = app.getAvailable(p.id);
                const total = app.equipment.filter((e) => e.productId === p.id).length;
                return (
                  <tr key={p.id} onClick={() => setSel(sel === p.id ? null : p.id)}
                    style={{ borderTop: "1px solid var(--color-bone)", background: sel === p.id ? "#F0FDF4" : i % 2 === 0 ? "white" : "var(--color-cream)", cursor: "pointer" }}
                  >
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-moss)" }}>{p.displayCode ?? p.id}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{p.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{p.brand}</div>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.8rem", color: "#6B7280" }}>{p.category}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 600 }}>{fmt(p.pricePerDay)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{fmt(p.deposit)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{fmt(p.compensation)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                      <span style={{ color: avail > 1 ? "var(--color-forest)" : "#EF4444", fontWeight: 700 }}>{avail}</span>/{total}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <button onClick={(event) => { event.stopPropagation(); setAction(p); }} style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: "5px", padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer" }}>Sửa</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {detail && (
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "18px", alignSelf: "start" }}>
            <div className="flex justify-between items-start mb-3">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-bark)" }}>{detail.name}</h3>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>×</button>
            </div>
            <img src={detail.image} alt={detail.name} style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: "8px", marginBottom: "10px", background: "var(--color-parchment)" }} />
            {[["Mã hiển thị", detail.displayCode ?? detail.id], ["Thương hiệu", detail.brand], ["Danh mục", detail.category], ["Sức chứa", detail.capacity || "—"], ["Kích thước", detail.dimensions || "—"], ["Giá thuê/ngày", fmt(detail.pricePerDay)], ["Mức cọc/thiết bị", fmt(detail.deposit)], ["Giá trị bồi thường", fmt(detail.compensation)], ["Đánh giá", `${detail.rating}★ (${detail.reviews})`]].map(([k, v]) => (
              <div key={k} className="flex justify-between" style={{ fontSize: "0.82rem", borderBottom: "1px dashed var(--color-bone)", padding: "5px 0" }}>
                <span style={{ color: "#9CA3AF" }}>{k}</span>
                <span style={{ fontWeight: 600, fontFamily: k.includes("Giá") || k.includes("Cọc") || k.includes("Bồi") ? "var(--font-mono)" : "inherit" }}>{v}</span>
              </div>
            ))}
            <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: "8px" }}>Số lượng thiết bị chỉ thay đổi qua phiếu nhập hàng.</p>
          </div>
        )}
      </div>
      {action && <ProductForm app={app} product={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
    </div>
  );
}

// ─── Equipment Tab (list + transfer) ─────────────────────────────────────────
function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [view, setView] = useState<"list" | "transfer">("list");
  const [filterProduct, setFilterProduct] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [editing, setEditing] = useState<ReturnType<typeof useApp>["equipment"][number] | null>(null);
  const [viewingLifecycle, setViewingLifecycle] = useState<Equipment | null>(null);

  const statusStyle: Record<string, { bg: string; text: string }> = {
    "Sẵn sàng": { bg: "#DCFCE7", text: "#15803D" },
    "Đang thuê": { bg: "#DBEAFE", text: "#1D4ED8" },
    "Đang bảo trì": { bg: "#FEF3C7", text: "#B45309" },
    "Thất lạc": { bg: "#FEE2E2", text: "#DC2626" },
    "Ngừng sử dụng": { bg: "#F3F4F6", text: "#6B7280" },
  };

  const productNames = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.name)))];
  const statuses = ["Tất cả", "Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"];

  const filtered = app.equipment.filter((e) => {
    const pname = app.products.find((p) => p.id === e.productId)?.name || "";
    return (filterProduct === "Tất cả" || pname === filterProduct) &&
      (filterStatus === "Tất cả" || e.equipmentStatus === filterStatus);
  });

  if (view === "transfer") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontWeight: 600 }}>← Quay lại</button>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Chuyển loại sản phẩm cho thuê</h2>
        </div>
        <TransferPanel app={app} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý thiết bị</h2>
        <button onClick={() => setView("transfer")}
          style={{ background: "var(--color-amber)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
        >
          🔄 Chuyển loại thiết bị
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
        >
          {productNames.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
        >
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          {["Sẵn sàng", "Đang thuê", "Đang bảo trì"].map((s) => {
            const cnt = app.equipment.filter((e) => e.equipmentStatus === s).length;
            const st = statusStyle[s];
            return <div key={s} style={{ background: st.bg, color: st.text, padding: "5px 12px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600 }}>{s}: {cnt}</div>;
          })}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã", "Sản phẩm hiện tại", "Nguồn nhập gốc", "Ngày nhập", "Điều kiện", "Trạng thái", "Lần thuê", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const p = app.products.find((pr) => pr.id === e.productId);
              const origP = app.products.find((pr) => pr.id === e.originalProductId);
              const moved = e.productId !== e.originalProductId;
              const st = statusStyle[e.equipmentStatus] || { bg: "#F3F4F6", text: "#374151" };
              return (
                <tr key={e.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                  <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-forest)" }}>{e.id}</td>
                  <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>
                    <div style={{ fontWeight: 600 }}>{p?.name}</div>
                    {moved && <div style={{ fontSize: "0.68rem", color: "var(--color-amber)" }}>↳ Chuyển từ {origP?.name}</div>}
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: "0.75rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{e.importReceiptId}</td>
                  <td style={{ padding: "9px 12px", fontSize: "0.75rem", color: "#6B7280", fontFamily: "var(--font-mono)" }}>{e.importDate}</td>
                  <td style={{ padding: "9px 12px", fontSize: "0.8rem" }}>{e.condition}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ background: st.bg, color: st.text, padding: "2px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 600 }}>{e.equipmentStatus}</span>
                  </td>
                  <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", textAlign: "center" }}>{e.rentCount}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <div className="flex gap-1">
                      <button onClick={() => setViewingLifecycle(e)} style={{ border: "1px solid var(--color-forest)", color: "var(--color-forest)", borderRadius: 6, padding: "4px 8px", background: "white", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>🔍 Sổ đời</button>
                      <button onClick={() => setEditing(e)} style={{ border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", background: "white", cursor: "pointer", fontSize: "0.72rem" }}>Sửa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <EquipmentForm app={app} equipment={editing} onClose={() => setEditing(null)} />}
      {viewingLifecycle && <EquipmentLifecycleModal equipment={viewingLifecycle} app={app} onClose={() => setViewingLifecycle(null)} />}
    </div>
  );
}

function TransferPanel({ app }: { app: ReturnType<typeof useApp> }) {
  const [equipId, setEquipId] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const eq = app.equipment.find((e) => e.id === equipId);
  const currentProduct = eq ? app.products.find((p) => p.id === eq.productId) : null;
  const origProduct = eq ? app.products.find((p) => p.id === eq.originalProductId) : null;
  const targetProduct = app.products.find((p) => p.id === targetProductId);

  const canTransfer = eq && eq.equipmentStatus === "Sẵn sàng" && targetProductId && targetProductId !== eq.productId && reason.length > 0;

  const handleTransfer = () => {
    if (!canTransfer || !eq) return;
    const result = app.transferEquipment(eq.id, targetProductId);
    if (!result.ok) return setError(result.message);
    setError("");
    setDone(true);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: "8px" }}>Chuyển loại sản phẩm cho thuê của thiết bị</h2>
      <p style={{ fontSize: "0.85rem", color: "#6B7280", marginBottom: "20px" }}>
        Cho phép chuyển thiết bị đã cũ sang sản phẩm cho thuê rẻ hơn (VD: Tiêu chuẩn → Tiết kiệm). Lịch sử nhập kho gốc được giữ nguyên.
      </p>

      {done ? (
        <div style={{ background: "#DCFCE7", borderRadius: "12px", padding: "24px", border: "1px solid #A7F3D0", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>✅</div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-forest)", marginBottom: "8px" }}>Đã chuyển thành công!</h3>
          <p style={{ fontSize: "0.88rem", color: "#15803D", marginBottom: "4px" }}>Thiết bị <strong>{equipId}</strong> nay thuộc <strong>{targetProduct?.name}</strong>.</p>
          <p style={{ fontSize: "0.78rem", color: "#15803D" }}>Khả dụng của hai sản phẩm đã được cập nhật. Trở lại xem danh sách sản phẩm hoặc thiết bị.</p>
          <button onClick={() => { setDone(false); setEquipId(""); setTargetProductId(""); setReason(""); }}
            style={{ marginTop: "14px", background: "var(--color-forest)", color: "white", padding: "10px 22px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Chuyển thiết bị khác
          </button>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "20px" }}>
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>1. Chọn mã thiết bị</label>
              <select value={equipId} onChange={(e) => { setEquipId(e.target.value); setDone(false); }}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.88rem", background: "white" }}
              >
                <option value="">-- Chọn thiết bị sẵn sàng --</option>
                {app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").map((e) => {
                  const pname = app.products.find((p) => p.id === e.productId)?.name || e.productId;
                  return <option key={e.id} value={e.id}>{e.id} — {pname} — {e.condition}</option>;
                })}
              </select>
            </div>

            {eq && (
              <div style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "12px 16px", fontSize: "0.82rem" }}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: "#9CA3AF" }}>Sản phẩm hiện tại</span>
                  <span style={{ fontWeight: 600 }}>{currentProduct?.name}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span style={{ color: "#9CA3AF" }}>Nguồn nhập ban đầu</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{origProduct?.name} · {eq.importReceiptId}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#9CA3AF" }}>Điều kiện</span>
                  <span>{eq.condition} · {eq.rentCount} lần thuê</span>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>2. Chọn sản phẩm mới</label>
              <select value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.88rem", background: "white" }}
                disabled={!eq}
              >
                <option value="">-- Chọn sản phẩm đích --</option>
                {app.products.filter((p) => p.id !== eq?.productId && p.status === "active").map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {fmt(p.pricePerDay)}/ngày</option>
                ))}
              </select>
            </div>

            {eq && targetProduct && targetProduct.pricePerDay > (currentProduct?.pricePerDay || 0) && (
              <div style={{ background: "#FEE2E2", borderRadius: "8px", padding: "10px 14px", fontSize: "0.8rem", color: "#DC2626", border: "1px solid #FECACA" }}>
                ⚠ Sản phẩm đích có giá cao hơn sản phẩm hiện tại. Thường chỉ chuyển từ tiêu chuẩn xuống tiết kiệm.
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>3. Lý do chuyển loại</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                placeholder="VD: Thiết bị đã qua 20+ lần thuê, độ mòn đáng kể, chuyển về sản phẩm Tiết kiệm"
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.85rem", resize: "none" }}
              />
            </div>

            {/* Impact preview */}
            {eq && targetProduct && (
              <div style={{ background: "#EFF6FF", borderRadius: "8px", padding: "12px 16px", fontSize: "0.82rem", color: "#1E40AF" }}>
                <strong>Ảnh hưởng:</strong>
                <div className="flex flex-col gap-1 mt-1">
                  <div>· Sản phẩm <strong>{currentProduct?.name}</strong>: khả dụng {app.getAvailable(eq.productId)} → {app.getAvailable(eq.productId) - 1} chiếc</div>
                  <div>· Sản phẩm <strong>{targetProduct.name}</strong>: khả dụng {app.getAvailable(targetProductId)} → {app.getAvailable(targetProductId) + 1} chiếc</div>
                  <div>· Lịch sử nhập kho ({eq.importReceiptId}) được giữ nguyên</div>
                </div>
              </div>
            )}

          {error && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", borderRadius: 8, padding: 10, fontSize: "0.8rem" }}>{error}</div>}
          <button
              disabled={!canTransfer}
              onClick={handleTransfer}
              style={{ background: canTransfer ? "var(--color-forest)" : "#9CA3AF", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: canTransfer ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.95rem" }}
            >
              ✓ Xác nhận chuyển loại thiết bị
            </button>
            {!canTransfer && equipId && <p style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Thiếu sản phẩm đích hoặc lý do. Chỉ chuyển được thiết bị đang Sẵn sàng.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Tab (UC7.8: Bộ lọc NCC, Trạng thái & Khoảng ngày) ───────────
function InventoryTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [selectedId, setSelectedId] = useState<string | null>(app.importReceipts[0]?.id ?? null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<ImportReceipt | "new" | null>(null);
  const [inspectingReceipt, setInspectingReceipt] = useState<ImportReceipt | null>(null);
  const [adjustingReceipt, setAdjustingReceipt] = useState<ImportReceipt | null>(null);

  // State UC7.8: Lọc Nhà cung cấp, Trạng thái, Khoảng ngày
  const [supplierFilter, setSupplierFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const supplierOptions = ["Tất cả", ...Array.from(new Set(app.suppliers.map((s) => s.name)))];
  const statusOptions = ["Tất cả", "Nháp", "Đã nhập kho", "Đã hủy"];

  const filteredReceipts = app.importReceipts.slice().reverse().filter((receipt) => {
    const matchSupplier = supplierFilter === "Tất cả" || receipt.supplierName === supplierFilter;
    const matchStatus = statusFilter === "Tất cả" || receipt.status === statusFilter;
    const matchSearch =
      (receipt.displayCode ?? receipt.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.createdBy.toLowerCase().includes(searchQuery.toLowerCase());

    let matchDate = true;
    if (fromDate && receipt.createdAt < fromDate) matchDate = false;
    if (toDate && receipt.createdAt > toDate + " 23:59:59") matchDate = false;

    return matchSupplier && matchStatus && matchSearch && matchDate;
  });

  const selected = app.importReceipts.find((receipt) => receipt.id === selectedId);

  const receiptTotal = (receipt: typeof app.importReceipts[number]) =>
    receipt.lines.reduce((sum, line) => {
      // Nếu đã kiểm nhận, chỉ tính tiền cho hàng được chấp nhận (đạt + lỗi nhận sửa)
      const billedQty = line.acceptedQty !== undefined || line.damagedQty !== undefined
        ? ((line.acceptedQty ?? 0) + (line.damagedQty ?? 0))
        : line.quantity;
      return sum + billedQty * line.unitPrice;
    }, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Phiếu nhập hàng</h2>
          <p style={{ color: "#6B7280", fontSize: "0.8rem" }}>Phiếu nháp không làm thay đổi tồn kho cho đến khi được kiểm nhận và xác nhận (UC7.7).</p>
        </div>
        <button onClick={() => setEditing("new")} style={{ background: "var(--color-forest)", color: "white", padding: "9px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Tạo phiếu nháp</button>
      </div>
      {message && (
        <div role="status" style={{ background: message.type === "success" ? "#DCFCE7" : "#FEE2E2", color: message.type === "success" ? "#15803D" : "#B91C1C", border: `1px solid ${message.type === "success" ? "#A7F3D0" : "#FECACA"}`, borderRadius: "9px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.82rem" }}>{message.text}</div>
      )}

      {/* UC7.8: Bộ lọc Nhà cung cấp, Trạng thái & Khoảng ngày */}
      <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
        <input
          type="text"
          placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem" }}
        />
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          aria-label="Lọc theo nhà cung cấp"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
        >
          {supplierOptions.map((s) => <option key={s} value={s}>{s === "Tất cả" ? "Tất cả NCC" : s}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái phiếu"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
        >
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Từ:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "6px 8px", fontSize: "0.78rem" }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Đến:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "6px 8px", fontSize: "0.78rem" }}
          />
        </div>
        {(supplierFilter !== "Tất cả" || statusFilter !== "Tất cả" || fromDate || toDate || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSupplierFilter("Tất cả");
              setStatusFilter("Tất cả");
              setFromDate("");
              setToDate("");
              setSearchQuery("");
            }}
            style={{ background: "none", border: "none", color: "#DC2626", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      <div className="responsive-two-column grid gap-5" style={{ gridTemplateColumns: "minmax(280px, 0.8fr) minmax(0, 1.4fr)" }}>
        <div className="flex flex-col gap-3">
          {filteredReceipts.map((receipt) => {
            const quantity = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
            return (
              <button key={receipt.id} onClick={() => { setSelectedId(receipt.id); setMessage(null); }} style={{ background: "white", borderRadius: "10px", padding: "14px 16px", border: `1px solid ${selectedId === receipt.id ? "var(--color-forest)" : "var(--color-bone)"}`, display: "block", cursor: "pointer", textAlign: "left" }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{receipt.displayCode ?? receipt.id}</span>
                  <span style={{
                    background: receipt.status === "Đã nhập kho" ? "#DCFCE7" : receipt.status === "Đã hủy" ? "#F3F4F6" : "#FEF3C7",
                    color: receipt.status === "Đã nhập kho" ? "#15803D" : receipt.status === "Đã hủy" ? "#6B7280" : "#B45309",
                    padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600
                  }}>
                    {receipt.status}
                  </span>
                  {receipt.adjustments && receipt.adjustments.length > 0 && (
                    <span style={{ background: "#FEF3C7", color: "#D97706", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                      ⚡ {receipt.adjustments.filter((a) => a.status === "Chờ duyệt").length > 0 ? "Chờ duyệt điều chỉnh" : "Đã có điều chỉnh"}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.86rem" }}>{receipt.supplierName}</div>
                <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: "3px" }}>{receipt.lines.length} loại · {quantity} thiết bị · {receipt.createdBy}</div>
                <div style={{ fontWeight: 700, marginTop: "8px" }}>{fmt(receiptTotal(receipt))}</div>
              </button>
            );
          })}
          {filteredReceipts.length === 0 && (
            <div style={{ background: "white", borderRadius: 10, padding: 24, textAlign: "center", color: "#9CA3AF", border: "1px dashed var(--color-bone)" }}>
              Không tìm thấy phiếu nhập nào phù hợp tiêu chí lọc.
            </div>
          )}
        </div>

        {selected && (
          <div style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: "14px", overflow: "hidden", alignSelf: "start" }}>
            <div className="flex justify-between items-start" style={{ background: "var(--color-parchment)", padding: "16px 18px" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontWeight: 700 }}>{selected.displayCode ?? selected.id}</div>
                <div style={{ fontWeight: 700 }}>{selected.supplierName}</div>
                <div style={{ color: "#6B7280", fontSize: "0.72rem" }}>Lập lúc {selected.createdAt} · {selected.createdBy}</div>
                {selected.supplierDocumentNumber && (
                  <div style={{ color: "#4B5563", fontSize: "0.72rem" }}>Số chứng từ NCC: <strong>{selected.supplierDocumentNumber}</strong></div>
                )}
              </div>
              <span style={{
                background: selected.status === "Đã nhập kho" ? "#DCFCE7" : selected.status === "Đã hủy" ? "#F3F4F6" : "#FEF3C7",
                color: selected.status === "Đã nhập kho" ? "#15803D" : selected.status === "Đã hủy" ? "#6B7280" : "#B45309",
                borderRadius: "999px", padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700
              }}>
                {selected.status}
              </span>
            </div>
            <div className="responsive-table">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                <thead><tr style={{ color: "#6B7280", fontSize: "0.72rem" }}>
                  {["Sản phẩm", "Số lượng", "Đơn giá", "Kiểm nhận / Phân loại", "Thành tiền"].map((heading) => <th key={heading} style={{ textAlign: heading === "Sản phẩm" || heading === "Kiểm nhận / Phân loại" ? "left" : "right", padding: "10px 14px" }}>{heading}</th>)}
                </tr></thead>
                <tbody>{selected.lines.map((line) => {
                  const product = app.products.find((item) => item.id === line.productId);
                  const isZeroPrice = line.unitPrice === 0;
                  const hasInspection = line.acceptedQty !== undefined || line.damagedQty !== undefined || line.rejectedQty !== undefined;
                  const acceptedCount = line.acceptedQty ?? line.quantity;
                  const damagedCount = line.damagedQty ?? 0;
                  const rejectedCount = line.rejectedQty ?? 0;
                  const billedCount = (line.acceptedQty !== undefined || line.damagedQty !== undefined) ? (acceptedCount + damagedCount) : line.quantity;

                  return (
                    <tr key={line.productId} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600 }}>{product?.name}</div>
                        {isZeroPrice && (
                          <div style={{ fontSize: "0.7rem", color: "#D97706", marginTop: 2, background: "#FEF3C7", padding: "1px 6px", borderRadius: 4, display: "inline-block" }}>
                            🎁 Hàng tặng/KM: {line.priceZeroReason || "Quà tặng kèm đơn"}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>{line.quantity}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>{isZeroPrice ? "0 đ (Tặng)" : fmt(line.unitPrice)}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.72rem" }}>
                        {hasInspection ? (
                          <div className="flex flex-col gap-1">
                            <span style={{ color: "#15803D", fontWeight: 600 }}>✓ Đạt: {acceptedCount} thiết bị {line.acceptedCodes && line.acceptedCodes.length > 0 ? `(${line.acceptedCodes.join(", ")})` : ""}</span>
                            {damagedCount > 0 && (
                              <span style={{ color: "#B45309", fontWeight: 600 }}>⚠️ Lỗi nhận sửa: {damagedCount} ({line.damageNotes || "Chờ bảo trì"})</span>
                            )}
                            {rejectedCount > 0 && (
                              <span style={{ color: "#DC2626", fontWeight: 600 }}>✕ Từ chối trả NCC: {rejectedCount} ({line.rejectionReason || "Không đạt"})</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#6B7280" }}>Mã dự kiến: {line.equipmentCodes.join(", ") || "Chưa tạo mã"}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                        {fmt(billedCount * line.unitPrice)}
                        {rejectedCount > 0 && (
                          <div style={{ fontSize: "0.68rem", color: "#DC2626", fontWeight: 400 }}>- Đã trừ {rejectedCount} cái từ chối</div>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div style={{ padding: "16px 18px", borderTop: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between" style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "12px" }}>
                <span>Tổng tiền thanh toán</span>
                <span style={{ color: "var(--color-forest)" }}>{fmt(receiptTotal(selected))}</span>
              </div>

              {selected.status === "Nháp" ? (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setEditing(selected)} style={{ flex: 1, minWidth: 100, background: "white", color: "var(--color-forest)", border: "1px solid var(--color-forest)", borderRadius: "9px", padding: "11px", cursor: "pointer", fontWeight: 700 }}>
                    ✏️ Sửa nháp (UC7.6)
                  </button>
                  <button onClick={() => {
                    const reason = window.prompt("Lý do hủy phiếu nhập (bắt buộc theo UC7.9):");
                    if (!reason || !reason.trim()) return;
                    const result = app.cancelImportReceipt(selected.id, reason.trim());
                    setMessage(result.ok ? { type: "success", text: "Đã hủy phiếu nháp thành công. Kho không thay đổi." } : { type: "error", text: result.message });
                  }} style={{ background: "white", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: "9px", padding: "11px 16px", cursor: "pointer", fontWeight: 700 }}>
                    ✕ Hủy nháp (UC7.9)
                  </button>
                  <button onClick={() => setInspectingReceipt(selected)} style={{ flex: 1.6, minWidth: 200, background: "var(--color-forest)", color: "white", border: "none", borderRadius: "9px", padding: "11px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)" }}>
                    📦 Kiểm nhận & Chốt kho (UC7.7)
                  </button>
                </div>
              ) : selected.status === "Đã hủy" ? (
                <div style={{ background: "#F3F4F6", color: "#6B7280", borderRadius: "8px", padding: "10px", fontSize: "0.8rem", textAlign: "center", fontWeight: 600 }}>
                  Phiếu đã hủy lúc {selected.cancelledAt ?? "trước đó"}. Lý do: {selected.cancelReason ?? "Không có"}. Tồn kho không thay đổi.
                </div>
              ) : (
                <div>
                  <div style={{ background: "#DCFCE7", color: "#15803D", borderRadius: "8px", padding: "10px 14px", fontSize: "0.8rem", fontWeight: 600, marginBottom: "12px" }}>
                    ✓ Đã nhập kho lúc {selected.confirmedAt}. Người kiểm: {selected.inspectedBy ?? selected.createdBy}. Phiếu gốc đã được khóa chỉnh sửa.
                  </div>

                  {/* UC7.10: Xử lý sai lệch sau chốt */}
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2" style={{ borderTop: "1px dashed var(--color-bone)", paddingTop: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)" }}>Xử lý sai lệch phiếu nhập sau chốt (UC7.10)</span>
                      <p style={{ fontSize: "0.72rem", color: "#6B7280", margin: 0 }}>Ghi nhận sai sót số lượng, mã thiết bị hoặc giá vốn. Quản trị viên duyệt an toàn lịch thuê.</p>
                    </div>
                    <button
                      onClick={() => setAdjustingReceipt(selected)}
                      style={{ background: "#F59E0B", color: "white", border: "none", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}
                    >
                      ⚡ Đề nghị điều chỉnh
                    </button>
                  </div>

                  {selected.adjustments && selected.adjustments.length > 0 && (
                    <div style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "10px", marginTop: "8px", border: "1px solid var(--color-bone)" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px", color: "#374151" }}>Lịch sử đề nghị điều chỉnh ({selected.adjustments.length}):</div>
                      <div className="flex flex-col gap-2">
                        {selected.adjustments.map((adj) => (
                          <div key={adj.id} style={{ background: "white", padding: "9px 12px", borderRadius: "6px", fontSize: "0.76rem", border: "1px solid var(--color-bone)" }}>
                            <div className="flex justify-between items-center mb-1">
                              <span style={{ fontWeight: 700, color: "var(--color-forest)" }}>{adj.type}</span>
                              <span style={{
                                background: adj.status === "Đã duyệt" ? "#DCFCE7" : adj.status === "Từ chối" ? "#FEE2E2" : "#FEF3C7",
                                color: adj.status === "Đã duyệt" ? "#15803D" : adj.status === "Từ chối" ? "#DC2626" : "#B45309",
                                padding: "2px 7px", borderRadius: "4px", fontWeight: 700, fontSize: "0.68rem"
                              }}>
                                {adj.status}
                              </span>
                            </div>
                            <div style={{ color: "#374151" }}>
                              Giá trị: <span style={{ textDecoration: "line-through", color: "#9CA3AF" }}>{adj.previousValue}</span> → <strong>{adj.newValue}</strong>
                            </div>
                            <div style={{ color: "#6B7280", marginTop: "2px" }}>
                              Lý do: <em>{adj.reason}</em> (Người lập: {adj.createdBy} lúc {adj.createdAt})
                            </div>
                            {adj.evidence && (
                              <div style={{ color: "#6B7280", fontSize: "0.7rem", marginTop: "1px" }}>Chứng từ kèm: {adj.evidence}</div>
                            )}

                            {adj.status === "Chờ duyệt" && (
                              <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: "1px dashed var(--color-bone)" }}>
                                <button
                                  onClick={() => {
                                    const res = app.approveImportAdjustment(selected.id, adj.id, "Quản trị viên");
                                    setMessage(res.ok ? { type: "success", text: "Đã duyệt và áp dụng điều chỉnh phiếu nhập thành công (UC7.10)!" } : { type: "error", text: res.message });
                                  }}
                                  style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: "5px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                                >
                                  ✓ Duyệt (UC7.10)
                                </button>
                                <button
                                  onClick={() => {
                                    const res = app.rejectImportAdjustment(selected.id, adj.id, "Không đủ căn cứ chứng từ");
                                    setMessage(res.ok ? { type: "success", text: "Đã từ chối đề nghị điều chỉnh." } : { type: "error", text: res.message });
                                  }}
                                  style={{ background: "white", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "5px", padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                                >
                                  ✕ Từ chối
                                </button>
                              </div>
                            )}
                            {adj.status === "Đã duyệt" && (
                              <div style={{ fontSize: "0.7rem", color: "#15803D", marginTop: "4px", fontWeight: 600 }}>
                                ✓ Đã duyệt bởi {adj.reviewedBy} lúc {adj.reviewedAt}
                              </div>
                            )}
                            {adj.status === "Từ chối" && (
                              <div style={{ fontSize: "0.7rem", color: "#DC2626", marginTop: "4px", fontWeight: 600 }}>
                                ✕ Từ chối bởi {adj.reviewedBy}: {adj.reviewNotes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editing && <ImportReceiptForm app={app} receipt={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}

      {/* UC7.7: Modal kiểm nhận hàng thực tế tại kho */}
      {inspectingReceipt && (
        <GoodsReceivingModal
          receipt={inspectingReceipt}
          app={app}
          onClose={() => setInspectingReceipt(null)}
          onSuccess={() => {
            setInspectingReceipt(null);
            setMessage({ type: "success", text: "Đã hoàn tất kiểm nhận hàng và nhập kho thành công (UC7.7)!" });
          }}
        />
      )}

      {/* UC7.10: Modal lập đề nghị điều chỉnh sau chốt */}
      {adjustingReceipt && (
        <ImportAdjustmentModal
          receipt={adjustingReceipt}
          app={app}
          onClose={() => setAdjustingReceipt(null)}
          onSuccess={() => {
            setAdjustingReceipt(null);
            setMessage({ type: "success", text: "Đã gửi đề nghị điều chỉnh phiếu nhập sau chốt thành công. Đang ở trạng thái Chờ duyệt (UC7.10)." });
          }}
        />
      )}
    </div>
  );
}

// ─── Suppliers (UC7.1 - UC7.4) ────────────────────────────────────────────────
function SuppliersTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [action, setAction] = useState<Supplier | "new" | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedSupplierProfile, setSelectedSupplierProfile] = useState<Supplier | null>(null);

  const filteredSuppliers = app.suppliers.filter((s) => {
    const matchStatus = statusFilter === "all" || s.cooperationStatus === statusFilter;
    const query = supplierSearch.toLowerCase().trim();
    const matchSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.displayCode.toLowerCase().includes(query) ||
      s.contactPerson.toLowerCase().includes(query) ||
      s.phone.includes(query) ||
      (s.taxCode && s.taxCode.includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query));
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Nhà cung cấp</h2>
          <p style={{ color: "#6B7280", fontSize: "0.8rem" }}>Quản lý đối tác cung ứng thiết bị và theo dõi hồ sơ lịch sử nhập hàng (UC7.1 - UC7.4).</p>
        </div>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm NCC mới</button>
      </div>

      {/* Thanh công cụ tìm kiếm và lọc trạng thái (UC7.3 & UC7.4) */}
      <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
        <input
          type="text"
          placeholder="🔍 Tìm theo mã NCC, tên công ty, người liên hệ, SĐT, MST..."
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.82rem" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          aria-label="Lọc theo tình trạng hợp tác"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.82rem", background: "white" }}
        >
          <option value="all">Tất cả trạng thái ({app.suppliers.length})</option>
          <option value="active">Đang hợp tác ({app.suppliers.filter((s) => s.cooperationStatus === "active").length})</option>
          <option value="inactive">Ngừng hợp tác ({app.suppliers.filter((s) => s.cooperationStatus === "inactive").length})</option>
        </select>
        {(supplierSearch || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSupplierSearch("");
              setStatusFilter("all");
            }}
            style={{ background: "none", border: "none", color: "#DC2626", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {filteredSuppliers.map((s) => {
          const receipts = app.importReceipts.filter((receipt) => receipt.supplierId === s.id || receipt.supplierId === s.displayCode);
          const confirmedReceipts = receipts.filter((receipt) => receipt.status === "Đã nhập kho");
          const total = confirmedReceipts.reduce((sum, receipt) => sum + receipt.lines.reduce((lineSum, line) => lineSum + line.quantity * line.unitPrice, 0), 0);
          return (
            <div key={s.id} style={{ background: "white", borderRadius: "10px", padding: "16px 20px", border: "1px solid var(--color-bone)", display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{ width: 44, height: 44, color: "var(--color-forest)", background: "var(--color-parchment)", borderRadius: "10px", display: "grid", placeItems: "center" }}>
                <Icon name="truck" size={21} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-moss)", fontWeight: 700 }}>{s.displayCode}</span>
                  <span style={{ background: s.cooperationStatus === "active" ? "#DCFCE7" : "#F3F4F6", color: s.cooperationStatus === "active" ? "#15803D" : "#6B7280", padding: "1px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>
                    {s.cooperationStatus === "active" ? "Đang hợp tác" : "Ngừng hợp tác"}
                  </span>
                  {s.statusReason && (
                    <span style={{ fontSize: "0.7rem", color: "#9CA3AF", fontStyle: "italic" }}>
                      ({s.statusReason})
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{s.name}</div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                  {s.contactPerson} · 📞 {s.phone} · {receipts.length} phiếu ({confirmedReceipts.length} đã chốt)
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Tổng lũy kế đã chốt</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.95rem" }}>{fmt(total)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSupplierProfile(s)}
                    style={{ border: "1px solid var(--color-forest)", borderRadius: 6, background: "var(--color-forest)", color: "white", padding: "5px 10px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                  >
                    👁 Hồ sơ NCC (UC7.3)
                  </button>
                  <button
                    onClick={() => setAction(s)}
                    style={{ border: "1px solid var(--color-bone)", borderRadius: 6, background: "white", padding: "5px 10px", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Sửa
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredSuppliers.length === 0 && (
          <div style={{ background: "white", borderRadius: 10, padding: 32, textAlign: "center", color: "#9CA3AF", border: "1px dashed var(--color-bone)" }}>
            Không tìm thấy nhà cung cấp nào phù hợp.
          </div>
        )}
      </div>

      {action && <SupplierForm app={app} supplier={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
      {selectedSupplierProfile && (
        <SupplierProfileModal
          supplier={selectedSupplierProfile}
          app={app}
          onClose={() => setSelectedSupplierProfile(null)}
          onOpenReceipt={(receiptId) => {
            setSelectedSupplierProfile(null);
            // Có thể mở xem chi tiết phiếu nếu cần
          }}
        />
      )}
    </div>
  );
}

// ─── Promotions (UC8.2 - UC8.5) ───────────────────────────────────────────────
function PromotionsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [action, setAction] = useState<Promotion | "new" | null>(null);
  const [promoSearch, setPromoSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "percentage" | "fixed">("all");
  const [selectedPromoDetail, setSelectedPromoDetail] = useState<Promotion | null>(null);

  // Modal tạm dừng chương trình (UC8.5)
  const [stoppingPromo, setStoppingPromo] = useState<Promotion | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [stopError, setStopError] = useState("");

  const now = new Date();

  // Lọc danh sách khuyến mãi đa chiều (UC8.4)
  const filteredPromotions = app.promotions.filter((p) => {
    const isExpired = new Date(p.endsAt) < now;
    if (statusFilter === "active" && (p.status !== "active" || isExpired)) return false;
    if (statusFilter === "inactive" && (p.status !== "inactive" || isExpired)) return false;
    if (statusFilter === "expired" && !isExpired) return false;
    if (typeFilter !== "all" && p.discountType !== typeFilter) return false;
    if (promoSearch.trim()) {
      const q = promoSearch.toLowerCase();
      const matchCode = p.code.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      return matchCode || matchName;
    }
    return true;
  });

  const handlePauseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingPromo) return;
    if (!stopReason.trim()) {
      return setStopError("Bắt buộc phải nhập lý do tạm dừng chương trình (UC8.5)!");
    }
    const res = app.pausePromotion(stoppingPromo.id, stopReason.trim());
    if (!res.ok) {
      return setStopError(res.message);
    }
    setStoppingPromo(null);
    setStopReason("");
    setStopError("");
  };

  const handleToggleStatus = (p: Promotion) => {
    const isExpired = new Date(p.endsAt) < now;
    if (p.status === "active") {
      // Mở modal nhập lý do tạm dừng
      setStoppingPromo(p);
      setStopReason("");
      setStopError("");
    } else {
      // Kích hoạt lại
      if (isExpired) {
        return alert("Chương trình đã quá hạn thời gian hiệu lực, không thể kích hoạt lại (UC8.5)!");
      }
      const res = app.resumePromotion(p.id);
      if (!res.ok) alert(res.message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý chính sách khuyến mãi (UC8.2 - UC8.5)</h2>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: 0 }}>
            Kiểm soát mã giảm giá, giới hạn ngân sách, theo dõi doanh thu và tra cứu đơn áp dụng thực tế.
          </p>
        </div>
        <button
          onClick={() => setAction("new")}
          style={{ background: "var(--color-forest)", color: "white", padding: "9px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
        >
          <span>+</span> Tạo mã giảm mới (UC8.2)
        </button>
      </div>

      {/* Bộ lọc và thanh tra cứu (UC8.4) */}
      <div style={{ background: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--color-bone)", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            type="text"
            value={promoSearch}
            onChange={(e) => setPromoSearch(e.target.value)}
            placeholder="🔍 Tìm kiếm theo mã code hoặc tên chương trình..."
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", background: "white" }}
          >
            <option value="all">Tất cả ({app.promotions.length})</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm dừng</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>Loại giảm:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", background: "white" }}
          >
            <option value="all">Tất cả hình thức</option>
            <option value="percentage">Phần trăm (%)</option>
            <option value="fixed">Số tiền cố định (VNĐ)</option>
          </select>
        </div>
      </div>

      {/* Danh sách khuyến mãi */}
      {filteredPromotions.length === 0 ? (
        <div style={{ background: "white", borderRadius: 10, padding: 36, textAlign: "center", border: "1px dashed var(--color-bone)" }}>
          <p style={{ color: "#6B7280", margin: 0 }}>Không tìm thấy chương trình khuyến mãi nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredPromotions.map((p) => {
            const isExpired = new Date(p.endsAt) < now;
            const usagePercent = p.totalUsageLimit ? Math.min(100, (p.usedCount / p.totalUsageLimit) * 100) : 0;
            const isFull = p.totalUsageLimit !== null && p.usedCount >= p.totalUsageLimit;

            return (
              <div
                key={p.id}
                style={{
                  background: "white",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  border: isExpired ? "1px dashed #D1D5DB" : "1px solid var(--color-bone)",
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  opacity: isExpired || p.status === "inactive" ? 0.85 : 1,
                }}
              >
                {/* Badge mã code */}
                <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "12px 16px", textAlign: "center", minWidth: 125, border: "1px solid var(--color-bone)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--color-forest)", letterSpacing: "0.06em", fontSize: "1rem" }}>
                    {p.code}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#D97706", fontWeight: 700, marginTop: 2 }}>
                    {p.discountType === "percentage" ? `Giảm ${p.discountValue}%` : `Giảm ${fmt(p.discountValue)}`}
                  </div>
                  {p.maxDiscount && (
                    <div style={{ fontSize: "0.68rem", color: "#6B7280" }}>
                      Tối đa {fmt(p.maxDiscount)}
                    </div>
                  )}
                </div>

                {/* Thông tin chương trình */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <strong style={{ fontSize: "0.95rem", color: "var(--color-bark)" }}>{p.name}</strong>
                    {isExpired ? (
                      <span style={{ background: "#FEE2E2", color: "#B91C1C", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Đã hết hạn</span>
                    ) : p.status === "inactive" ? (
                      <span style={{ background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Tạm dừng</span>
                    ) : isFull ? (
                      <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Hết lượt</span>
                    ) : (
                      <span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Đang hiệu lực</span>
                    )}
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#4B5563", marginBottom: 4 }}>
                    Đơn tối thiểu: <strong>{fmt(p.minimumRental)}</strong> · Phạm vi:{" "}
                    <strong>{p.scope === "all" ? "Tất cả thiết bị" : p.scope === "products" ? `Theo sản phẩm (${p.productIds.length})` : `Theo danh mục (${p.categoryIds.length})`}</strong>
                  </div>

                  <div style={{ fontSize: "0.74rem", color: "#6B7280" }}>
                    Hiệu lực: {new Date(p.startsAt).toLocaleDateString("vi-VN")} → {new Date(p.endsAt).toLocaleDateString("vi-VN")} · Đã dùng: <strong>{p.usedCount}</strong> / {p.totalUsageLimit ?? "∞"} lượt
                  </div>

                  {/* Thanh tiến độ sử dụng lượt */}
                  {p.totalUsageLimit && (
                    <div style={{ background: "var(--color-bone)", borderRadius: "4px", height: "6px", marginTop: "6px", overflow: "hidden", maxWidth: 300 }}>
                      <div style={{ height: "100%", background: usagePercent >= 90 ? "#EF4444" : "var(--color-forest)", width: `${usagePercent}%`, transition: "width 0.3s ease" }} />
                    </div>
                  )}

                  {/* Lý do tạm dừng nếu có */}
                  {p.status === "inactive" && p.stopReason && (
                    <div style={{ marginTop: 6, fontSize: "0.74rem", color: "#92400E", background: "#FEF3C7", padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>
                      ⚠️ Lý do tạm dừng: {p.stopReason}
                    </div>
                  )}
                </div>

                {/* Các nút hành động */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", minWidth: 150 }}>
                  {/* Nút xem chi tiết & đơn áp dụng (UC8.4) */}
                  <button
                    onClick={() => setSelectedPromoDetail(p)}
                    style={{
                      background: "white",
                      border: "1px solid var(--color-forest)",
                      color: "var(--color-forest)",
                      borderRadius: 6,
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    👁 Xem đơn áp dụng (UC8.4)
                  </button>

                  <div style={{ display: "flex", gap: 6 }}>
                    {/* Nút sửa */}
                    <button
                      onClick={() => setAction(p)}
                      style={{
                        flex: 1,
                        border: "1px solid var(--color-bone)",
                        borderRadius: 6,
                        background: "white",
                        padding: "5px 8px",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      ✏️ Sửa (UC8.3)
                    </button>

                    {/* Nút tạm dừng / kích hoạt lại (UC8.5) */}
                    <button
                      onClick={() => handleToggleStatus(p)}
                      style={{
                        flex: 1,
                        border: "1px solid",
                        borderColor: p.status === "active" ? "#F59E0B" : "#10B981",
                        background: p.status === "active" ? "#FFFBEB" : "#ECFDF5",
                        color: p.status === "active" ? "#B45309" : "#047857",
                        borderRadius: 6,
                        padding: "5px 8px",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {p.status === "active" ? "⏸ Tạm dừng" : "▶ Kích hoạt"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form tạo/sửa khuyến mãi (UC8.2 & UC8.3) */}
      {action && (
        <PromotionForm
          app={app}
          promotion={action === "new" ? undefined : action}
          onClose={() => setAction(null)}
        />
      )}

      {/* Modal tra cứu chi tiết và thống kê doanh thu / đơn hàng áp dụng (UC8.4) */}
      {selectedPromoDetail && (
        <PromotionDetailModal
          promotion={selectedPromoDetail}
          app={app}
          onClose={() => setSelectedPromoDetail(null)}
          onEdit={() => {
            setAction(selectedPromoDetail);
            setSelectedPromoDetail(null);
          }}
          onToggleStatus={() => {
            handleToggleStatus(selectedPromoDetail);
            // Cập nhật lại modal detail
            const updated = app.promotions.find((item) => item.id === selectedPromoDetail.id);
            if (updated) setSelectedPromoDetail(updated);
          }}
        />
      )}

      {/* Modal xác nhận lý do tạm dừng chương trình (UC8.5) */}
      {stoppingPromo && (
        <FormModal
          title={`Tạm dừng khuyến mãi: ${stoppingPromo.code}`}
          description="Bắt buộc nhập lý do tạm dừng để ghi nhận Audit Log theo đúng quy tắc UC8.5."
          onClose={() => setStoppingPromo(null)}
        >
          <form onSubmit={handlePauseSubmit} className="grid gap-4 mt-4">
            <label style={labelStyle}>
              Lý do tạm dừng chương trình (Bắt buộc)
              <textarea
                rows={3}
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                placeholder="VD: Hết ngân sách chiến dịch tháng này / Phát hiện gian lận lạm dụng mã / Tạm dừng theo chỉ đạo của ban giám đốc..."
                style={fieldStyle}
              />
            </label>
            {stopError && (
              <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8, fontSize: "0.85rem" }}>
                {stopError}
              </div>
            )}
            <div className="modal-footer mt-2" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setStoppingPromo(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-bone)", background: "white", cursor: "pointer" }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#D97706", color: "white", fontWeight: 700, cursor: "pointer" }}
              >
                ⏸ Xác nhận tạm dừng (UC8.5)
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
}

// ─── Stock Adjustments (UC6.10 & UC6.11) ──────────────────────────────────────────
function StockAdjustTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedEquipId, setSelectedEquipId] = useState("");
  const [newStatus, setNewStatus] = useState<EquipmentStatus>("Thất lạc");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const currentEquip = app.equipment.find((e) => e.id === selectedEquipId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipId) return alert("Vui lòng chọn mã thiết bị.");
    if (!reason.trim()) return alert("Vui lòng nhập lý do điều chỉnh kho.");

    const res = app.createStockAdjustment({
      reason: reason.trim(),
      createdBy: "Quản trị viên",
      lines: [
        {
          equipmentId: selectedEquipId,
          previousStatus: currentEquip?.equipmentStatus || "Sẵn sàng",
          newStatus,
          reason: notes.trim() || reason.trim(),
        },
      ],
      autoApprove: true, // Khi Admin tự lập phiếu thì tự động duyệt
    });

    if (res.ok) {
      setShowModal(false);
      setSelectedEquipId("");
      setReason("");
      setNotes("");
      alert(`Đã lập phiếu điều chỉnh ${res.data.id} và cập nhật trạng thái kho!`);
    } else {
      alert(res.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Kiểm kê & Điều chỉnh kho (UC6.10 & UC6.11)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Tách biệt tài sản khách đang thuê, lập phiếu đề nghị điều chỉnh chờ duyệt và kiểm tra xung đột đơn tương lai trước khi duyệt kho.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAuditModal(true)}
            style={{ background: "var(--color-amber)", color: "white", padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
            📋 Kiểm kê kho (UC6.10)
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ background: "var(--color-forest)", color: "white", padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
            + Lập phiếu thủ công
          </button>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã phiếu", "Ngày lập", "Người lập", "Lý do chung", "Thiết bị điều chỉnh", "Trạng thái cũ → Mới", "Tình trạng", "Phê duyệt", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {app.stockAdjustments.map((sa, i) => (
              <tr key={sa.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>
                  {sa.id}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.8rem", color: "#6B7280" }}>{sa.createdAt}</td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", fontWeight: 600 }}>{sa.createdBy}</td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "var(--color-bark)" }}>{sa.reason}</td>
                <td style={{ padding: "11px 14px", fontSize: "0.8rem" }}>
                  {sa.lines.map((l) => (
                    <div key={l.equipmentId}>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{l.equipmentId}</strong>
                      {l.reason && <span style={{ fontSize: "0.72rem", color: "#6B7280" }}> ({l.reason})</span>}
                    </div>
                  ))}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.8rem" }}>
                  {sa.lines.map((l) => (
                    <div key={l.equipmentId} className="flex items-center gap-1">
                      <span style={{ color: "#6B7280" }}>{l.previousStatus}</span>
                      <span>→</span>
                      <strong style={{ color: l.newStatus === "Ngừng sử dụng" ? "#DC2626" : l.newStatus === "Thất lạc" ? "#B91C1C" : "var(--color-forest)" }}>
                        {l.newStatus}
                      </strong>
                    </div>
                  ))}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{
                    background: sa.status === "Chờ duyệt" ? "#FEF3C7" : sa.status === "Từ chối" ? "#FEE2E2" : "#DCFCE7",
                    color: sa.status === "Chờ duyệt" ? "#B45309" : sa.status === "Từ chối" ? "#DC2626" : "#15803D",
                    padding: "3px 8px",
                    borderRadius: 8,
                    fontSize: "0.72rem",
                    fontWeight: 700
                  }}>
                    {sa.status || "Đã duyệt"}
                  </span>
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.75rem", color: "#6B7280" }}>
                  {sa.approvedBy ? `${sa.approvedBy}` : sa.status === "Chờ duyệt" ? "Chưa duyệt" : "Tự động"}
                  {sa.approvedAt && <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{sa.approvedAt}</div>}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  {sa.status === "Chờ duyệt" ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const res = app.approveStockAdjustment(sa.id);
                          if (res.ok) alert("Đã phê duyệt điều chỉnh kho thành công! Kho đã được cập nhật.");
                          else alert(res.message);
                        }}
                        style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 700 }}
                      >
                        ✓ Duyệt (UC6.11)
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Bạn có chắc chắn muốn từ chối đề nghị điều chỉnh kho này?")) {
                            const res = app.rejectStockAdjustment(sa.id);
                            if (res.ok) alert("Đã từ chối phiếu điều chỉnh!");
                            else alert(res.message);
                          }
                        }}
                        style={{ background: "white", border: "1px solid #DC2626", color: "#DC2626", borderRadius: 6, padding: "5px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Đã chốt</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <FormModal title="Lập phiếu điều chỉnh kho sau kiểm kê" description="Cập nhật trực tiếp số lượng và trạng thái khả dụng của thiết bị trong kho." onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
            <label style={labelStyle}>
              Thiết bị cần điều chỉnh:
              <select value={selectedEquipId} onChange={(e) => setSelectedEquipId(e.target.value)} style={fieldStyle}>
                <option value="">-- Chọn thiết bị trong kho --</option>
                {app.equipment.map((e) => {
                  const p = app.products.find((pr) => pr.id === e.productId);
                  return (
                    <option key={e.id} value={e.id}>
                      {e.id} — {p?.name} (Hiện tại: {e.equipmentStatus})
                    </option>
                  );
                })}
              </select>
            </label>

            {currentEquip && (
              <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10, fontSize: "0.8rem" }}>
                Trạng thái hiện tại: <strong>{currentEquip.equipmentStatus}</strong> · Tình trạng: <strong>{currentEquip.condition}</strong>
              </div>
            )}

            <label style={labelStyle}>
              Trạng thái mới sau điều chỉnh:
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as EquipmentStatus)} style={fieldStyle}>
                <option value="Sẵn sàng">Sẵn sàng (Tìm thấy lại sau thất lạc)</option>
                <option value="Đang bảo trì">Đang bảo trì (Phát hiện hư hỏng lúc kiểm kho)</option>
                <option value="Thất lạc">Thất lạc (Mất mát kiểm kê chưa rõ nguyên nhân)</option>
                <option value="Ngừng sử dụng">Ngừng sử dụng (Hỏng hoàn toàn, không thể sửa)</option>
              </select>
            </label>

            <label style={labelStyle}>
              Lý do kiểm kê / đợt kiểm kê:
              <input placeholder="VD: Kiểm kê kho định kỳ Quý 4/2024" value={reason} onChange={(e) => setReason(e.target.value)} style={fieldStyle} />
            </label>

            <label style={labelStyle}>
              Ghi chú chi tiết nguyên nhân:
              <textarea placeholder="Mô tả nguyên nhân sai lệch..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={fieldStyle} />
            </label>

            <FormActions onClose={() => setShowModal(false)} />
          </form>
        </FormModal>
      )}

      {showAuditModal && <InventoryAuditModal app={app} onClose={() => setShowAuditModal(false)} />}
    </div>
  );
}

// ─── Staff Accounts (UC1.7 - UC1.11) ──────────────────────────────────────────
function StaffAccountsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [permStaff, setPermStaff] = useState<StaffAccount | null>(null);
  const [lockModalStaff, setLockModalStaff] = useState<StaffAccount | null>(null);
  const [lockReason, setLockReason] = useState("Nghỉ việc từ " + new Date().toLocaleDateString("vi-VN"));
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");

  const filtered = app.staffAccounts.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || s.role === roleFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const handleOpenAdd = () => {
    const nextNum = app.staffAccounts.length + 1;
    const newId = `NV-00${nextNum}`;
    setEditingStaff({
      id: newId,
      username: `nv_${nextNum}`,
      name: "",
      password: "GearGo@2026",
      role: "Nhân viên kho",
      phone: "",
      email: "",
      status: "active",
      permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"],
      createdAt: new Date().toLocaleDateString("vi-VN"),
    });
    setIsNew(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    app.saveStaffAccount(editingStaff);
    setEditingStaff(null);
  };

  const handleSavePermissions = (perms: string[]) => {
    if (!permStaff) return;
    app.saveStaffAccount({ ...permStaff, permissions: perms });
    setPermStaff(null);
  };

  const handleConfirmLock = () => {
    if (!lockModalStaff) return;
    app.toggleStaffLock(lockModalStaff.id, lockReason);
    setLockModalStaff(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Quản lý tài khoản & Phân quyền nhân viên (UC1.7, UC1.8, UC1.9, UC1.10, UC1.11)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Tạo tài khoản, cập nhật thông tin liên hệ, phân quyền theo nhóm nghiệp vụ và khóa tài khoản khi nghỉ việc.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn btn-primary btn-md"
        >
          + Thêm nhân viên mới
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm (UC1.9) */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div style={{ position: "relative", minWidth: 260 }}>
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="Quản trị viên">Quản trị viên</option>
          <option value="Nhân viên kho">Nhân viên kho</option>
          <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đang bị khóa</option>
        </select>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã NV", "Họ và tên", "Tên đăng nhập", "Vai trò & Nhóm quyền", "Số điện thoại", "Email", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>
                  {s.id}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{s.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Tạo ngày: {s.createdAt}</div>
                </td>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                  @{s.username}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ background: s.role === "Quản trị viên" ? "#FEF3C7" : "#E0E7FF", color: s.role === "Quản trị viên" ? "#B45309" : "#3730A3", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                    {s.role}
                  </span>
                  {s.permissions && s.permissions.length > 0 && (
                    <div style={{ fontSize: "0.68rem", color: "#6B7280", marginTop: 3 }}>
                      {s.permissions.join(", ")}
                    </div>
                  )}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "#4B5563" }}>{s.phone}</td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "#4B5563" }}>{s.email}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div>
                    <span style={{
                      background: s.status === "active" ? "#DCFCE7" : "#FEE2E2",
                      color: s.status === "active" ? "#15803D" : "#DC2626",
                      padding: "3px 8px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700
                    }}>
                      {s.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                    {s.lockedReason && (
                      <div style={{ fontSize: "0.68rem", color: "#B91C1C", marginTop: 2 }}>{s.lockedReason}</div>
                    )}
                  </div>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => { setEditingStaff({ ...s }); setIsNew(false); }}
                      style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => setPermStaff({ ...s })}
                      style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      Phân quyền
                    </button>
                    {s.role !== "Quản trị viên" && (
                      <button
                        onClick={() => {
                          if (s.status === "active") {
                            setLockModalStaff(s);
                          } else {
                            app.toggleStaffLock(s.id);
                          }
                        }}
                        style={{
                          background: s.status === "active" ? "white" : "var(--color-forest)",
                          color: s.status === "active" ? "#DC2626" : "white",
                          border: `1px solid ${s.status === "active" ? "#FECACA" : "var(--color-forest)"}`,
                          borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600
                        }}
                      >
                        {s.status === "active" ? "Khóa" : "Mở"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa nhân viên (UC1.7, UC1.8) */}
      {editingStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{isNew ? "Thêm tài khoản nhân viên mới (UC1.7)" : `Cập nhật thông tin ${editingStaff.name} (UC1.8)`}</h3>
              <button onClick={() => setEditingStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={handleSaveStaff} className="modal-body flex flex-col gap-3.5">
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mã nhân viên</label>
                  <input
                    disabled={!isNew}
                    value={editingStaff.id}
                    onChange={(e) => setEditingStaff({ ...editingStaff, id: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem", background: isNew ? "white" : "#F3F4F6" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Tên đăng nhập</label>
                  <input
                    required
                    value={editingStaff.username}
                    onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Họ và tên</label>
                <input
                  required
                  placeholder="VD: Trần Văn Bình"
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                />
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Số điện thoại</label>
                  <input
                    required
                    type="tel"
                    placeholder="0909..."
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Email</label>
                  <input
                    required
                    type="email"
                    placeholder="binh.tv@geargo.vn"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Vai trò</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem", background: "white" }}
                >
                  <option value="Nhân viên kho">Nhân viên kho</option>
                  <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
                  <option value="Quản trị viên">Quản trị viên</option>
                </select>
              </div>

              {/* Mật khẩu khởi tạo ban đầu (UC1.7) */}
              {isNew && (
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mật khẩu khởi tạo *</label>
                  <input
                    required
                    value={editingStaff.password || "GearGo@2026"}
                    onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>Mật khẩu tạm thời cấp cho nhân viên đăng nhập lần đầu.</span>
                </div>
              )}

              {/* Gán quyền nghiệp vụ ban đầu (UC1.7.1) */}
              {isNew && (
                <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>
                    Gán quyền nghiệp vụ ban đầu (UC1.7.1):
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      "Quản lý kho thiết bị",
                      "Bàn giao & Nhận trả",
                      "Lập phụ phí & Đối soát",
                      "Xem báo cáo doanh thu",
                      "Quản lý khuyến mãi"
                    ].map((pKey) => {
                      const isChecked = (editingStaff.permissions || []).includes(pKey);
                      return (
                        <label key={pKey} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const cur = editingStaff.permissions || [];
                              const next = e.target.checked ? [...cur, pKey] : cur.filter((x) => x !== pKey);
                              setEditingStaff({ ...editingStaff, permissions: next });
                            }}
                          />
                          <span>{pKey}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setEditingStaff(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>Lưu nhân viên</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phân quyền chi tiết (UC1.10) */}
      {permStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cấu hình phân quyền: {permStaff.name} (UC1.10)</h3>
              <button onClick={() => setPermStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 14 }}>
                Chọn các quyền nghiệp vụ cho phép tài khoản <strong>@{permStaff.username}</strong> thực hiện:
              </p>
              <div className="flex flex-col gap-2.5 mb-5">
                {[
                  { key: "Quản lý kho thiết bị", desc: "Xem danh sách thiết bị, quét barcode, kiểm kê và lập phiếu bảo trì" },
                  { key: "Bàn giao & Nhận trả", desc: "Thực hiện biên bản BBBG, checklist phụ kiện và nghiệm thu trả đồ" },
                  { key: "Lập phụ phí & Đối soát", desc: "Đề xuất phụ phí bồi thường và lập phiếu thu/chi hoàn cọc" },
                  { key: "Xem báo cáo doanh thu", desc: "Xem 4 trụ cột báo cáo tài chính và xuất dữ liệu thống kê" },
                  { key: "Quản lý khuyến mãi", desc: "Tạo và tạm dừng các mã voucher giảm giá" },
                ].map((p) => {
                  const currentPerms = permStaff.permissions || [];
                  const isChecked = currentPerms.includes(p.key);
                  return (
                    <label key={p.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, background: isChecked ? "#EFF6FF" : "#F9FAFB", border: `1px solid ${isChecked ? "#BFDBFE" : "#E5E7EB"}`, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...currentPerms, p.key]
                            : currentPerms.filter((k) => k !== p.key);
                          setPermStaff({ ...permStaff, permissions: next });
                        }}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>{p.key}</strong>
                        <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{p.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPermStaff(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button onClick={() => handleSavePermissions(permStaff.permissions || [])} className="btn btn-primary btn-md" style={{ flex: 1 }}>Lưu quyền hạn</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Khóa Nhân viên (UC1.11) */}
      {lockModalStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Khóa tài khoản {lockModalStaff.name} (UC1.11)</h3>
              <button onClick={() => setLockModalStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: 12 }}>
                Tài khoản bị khóa sẽ không thể đăng nhập vào hệ thống vận hành. Nhập lý do khóa:
              </p>
              <textarea
                rows={3}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", marginBottom: 14 }}
              />
              <div className="flex gap-2">
                <button onClick={() => setLockModalStaff(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button onClick={handleConfirmLock} className="btn btn-md" style={{ flex: 1, background: "#DC2626", color: "white", border: 0 }}>Xác nhận khóa</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports (UC25, UC10.1 - UC10.3 Chuẩn Nghiệp Vụ) ──────────────────────────
function ReportsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [reportSubTab, setReportSubTab] = useState<"operational" | "revenue" | "cashflow" | "inventory">("operational");
  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState("2024-12-31");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // State cho Drill-down cấu thành số liệu (UC10.1 bước 4 & UC10.2 bước 5)
  const [drilldownData, setDrilldownData] = useState<{
    title: string;
    subtitle: string;
    type: "orders" | "equipment" | "damage";
    items: any[];
  } | null>(null);

  // State xem chứng từ phiếu nhập kho đối chiếu trực tiếp (UC10.3 bước 6)
  const [viewingReceipt, setViewingReceipt] = useState<ImportReceipt | null>(null);

  // Kiểm tra ngày hợp lệ (UC10.1.1 & Dòng sự kiện phụ 2.1: Ngày kết thúc trước bắt đầu)
  const isDateInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  // Hàm chuẩn hóa & kiểm tra ngày nằm trong kỳ báo cáo (UC10.1.1)
  const isWithinRange = (dateStr?: string) => {
    if (!dateStr) return true;
    let d: Date;
    const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    } else {
      d = new Date(dateStr.replace(" ", "T"));
    }
    if (isNaN(d.getTime())) return true;
    const start = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const end = toDate ? new Date(toDate + "T23:59:59") : null;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  // ── 1. Dữ liệu Báo cáo Vận hành (UC10.1) ──────────────────────────────────
  // Đơn cần giao theo giờ dự kiến trong kỳ
  const ordersToPickup = app.orders.filter(
    (o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status) && isWithinRange(o.pickupTime)
  );
  // Đơn cần nhận trả theo giờ dự kiến trong kỳ
  const ordersToReturn = app.orders.filter(
    (o) => o.status === "Đang thuê" && isWithinRange(o.returnTime)
  );
  // Đơn quá hạn tại thời điểm tổng hợp (quá hạn so với giờ hiện tại)
  const now = new Date();
  const overdueOrders = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const retD = new Date(o.returnTime.replace(" ", "T"));
    return !isNaN(retD.getTime()) && retD < now;
  });
  // Đơn chờ đối soát theo trạng thái hiện tại
  const pendingReconcileOrders = app.orders.filter((o) => o.status === "Chờ đối soát");
  // Lượt thuê đã bàn giao trong kỳ
  const handedOverOrders = app.orders.filter((o) => o.handedOverAt && isWithinRange(o.handedOverAt));
  // Số lần hỏng có kết luận theo thiết bị
  const damageRecords = app.orders.flatMap((o) =>
    (o.returnReceipts || []).flatMap((r) =>
      r.items
        .filter((it) => it.condition !== "Bình thường" && it.condition !== "Cần vệ sinh")
        .map((it) => ({
          ...it,
          orderId: o.id,
          customerName: o.customerName,
          returnedAt: r.returnedAt,
          staffName: r.staffName,
        }))
    )
  );

  // ── 2. Dữ liệu Báo cáo Doanh thu & Dòng tiền (UC10.2, UC10.2.1) ───────────
  // Chỉ tính đơn Hoàn tất theo ngày hoàn tất
  const completedOrders = app.orders.filter(
    (o) => o.status === "Hoàn tất" && isWithinRange(o.reconciledAt || o.returnedAt || o.createdAt)
  );
  const pureRentalRevenue = completedOrders.reduce((sum, o) => sum + (o.rental - o.discount), 0);
  const approvedSurcharges = app.orders.flatMap((o) =>
    o.surcharges.filter((s) => s.status === "Đã duyệt" && isWithinRange(s.reviewedAt || o.createdAt))
  );
  const surchargeRevenue = approvedSurcharges.reduce((sum, s) => sum + s.amount, 0);
  const cancellationFees = app.orders
    .filter((o) => o.status === "Khách hủy" && isWithinRange(o.createdAt))
    .reduce((sum, o) => sum + (o.cancellationFee || 0), 0);
  const currentHeldDeposit = app.orders
    .filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status))
    .reduce((sum, o) => sum + o.depositTotal, 0);

  // Tỷ lệ hủy đơn: (Khách hủy + Cửa hàng hủy) / (Tổng đơn tạo - Đơn hết hạn) (Quy tắc UC10.2)
  const createdInPeriod = app.orders.filter((o) => isWithinRange(o.createdAt));
  const canceledCount = createdInPeriod.filter((o) => o.status === "Khách hủy" || o.status === "Cửa hàng hủy").length;
  const expiredCount = createdInPeriod.filter((o) => o.status === "Hết hạn").length;
  const validDenominator = createdInPeriod.length - expiredCount;
  const cancellationRate = validDenominator > 0 ? ((canceledCount / validDenominator) * 100).toFixed(1) : "0.0";

  // Khách quay lại: Khách có ít nhất 2 lượt thuê hoàn tất tính đến hiện tại (Quy tắc UC10.2)
  const customerCompletedCounts: Record<string, number> = {};
  app.orders
    .filter((o) => o.status === "Hoàn tất")
    .forEach((o) => {
      customerCompletedCounts[o.customerPhone] = (customerCompletedCounts[o.customerPhone] || 0) + 1;
    });
  const returningCustomersCount = Object.values(customerCompletedCounts).filter((cnt) => cnt >= 2).length;

  // Dòng tiền thực tế
  const inRangeTransactions = app.orders
    .flatMap((o) => o.transactions.map((t) => ({ ...t, orderId: o.id, customerName: o.customerName })))
    .filter((t) => isWithinRange(t.completedAt || t.createdAt));
  const totalCashInflow = inRangeTransactions
    .filter((t) => (t.type === "Thanh toán ban đầu" || t.type === "Thu thêm") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const totalCashOutflow = inRangeTransactions
    .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const netCashflow = totalCashInflow - totalCashOutflow;

  // ── 3. Dữ liệu Báo cáo Nhập kho (UC10.3) ──────────────────────────────────
  const inRangeImports = app.importReceipts.filter(
    (r) =>
      r.status === "Đã nhập kho" &&
      isWithinRange(r.confirmedAt || r.receivedAt || r.createdAt) &&
      (supplierFilter === "all" || r.supplierId === supplierFilter || r.supplierName === supplierFilter)
  );
  const totalImportAssetValue = inRangeImports.reduce(
    (sum, r) => sum + r.lines.reduce((ls, l) => ls + l.quantity * l.unitPrice, 0),
    0
  );

  return (
    <div>
      {/* Tiêu đề & Bộ chọn kỳ báo cáo (UC10.1, UC10.1.1) */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Báo cáo & Phân tích chuyên sâu (UC10.1 - UC10.3)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Hệ thống 4 báo cáo tách biệt, tuân thủ nghiêm ngặt nguyên tắc kế toán tài chính và hỗ trợ truy vết cấu thành.
          </p>
        </div>

        {/* Bộ lọc khoảng ngày & Xuất file */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-bone rounded-lg p-1.5 px-3 text-xs shadow-xs">
            <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>Kỳ báo cáo:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "3px 6px", fontSize: "0.78rem" }}
            />
            <span>→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "3px 6px", fontSize: "0.78rem" }}
            />
          </div>
          <button
            onClick={() => alert(`Đã tạo và tải file Báo_Cáo_GearGo_${reportSubTab.toUpperCase()}.xlsx thành công!`)}
            className="btn btn-secondary btn-sm"
          >
            <span className="icon-label"><Icon name="chart" size={14} /> Xuất Excel/PDF</span>
          </button>
        </div>
      </div>

      {/* Cảnh báo ngày không hợp lệ (Dòng sự kiện phụ 2.1) */}
      {isDateInvalid && (
        <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#B91C1C", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Lỗi kỳ báo cáo:</strong> Ngày kết thúc ({toDate}) không được nhỏ hơn ngày bắt đầu ({fromDate}). Vui lòng điều chỉnh lại bộ lọc để cập nhật dữ liệu.
        </div>
      )}

      {/* Sub-tabs điều hướng 4 báo cáo */}
      <div className="flex gap-2 mb-6 border-b border-bone pb-3 flex-wrap">
        {[
          { key: "operational" as const, label: "1. Vận hành kho (UC10.1)", icon: "tool" as IconName },
          { key: "revenue" as const, label: "2. Doanh thu thuần (UC10.2)", icon: "chart" as IconName },
          { key: "cashflow" as const, label: "3. Dòng tiền thực tế (UC10.2.1)", icon: "wallet" as IconName },
          { key: "inventory" as const, label: "4. Nhập kho & Tài sản (UC10.3)", icon: "package" as IconName },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportSubTab(tab.key)}
            style={{
              background: reportSubTab === tab.key ? "var(--color-forest)" : "white",
              color: reportSubTab === tab.key ? "white" : "var(--color-bark)",
              border: `1px solid ${reportSubTab === tab.key ? "var(--color-forest)" : "var(--color-bone)"}`,
              borderRadius: 8,
              padding: "9px 16px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            <span className="icon-label"><Icon name={tab.icon} size={16} /> {tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── BÁO CÁO 1: VẬN HÀNH KHO (UC10.1 & UC10.1.1) ─────────────────────── */}
      {reportSubTab === "operational" && (
        <div>
          {/* Lưới 6 chỉ tiêu vận hành trọng yếu (Click để Drill-down - Bước 4 UC10.1) */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn cần giao trong kỳ", subtitle: `Có ${ordersToPickup.length} đơn có giờ nhận dự kiến trong kỳ ${fromDate} → ${toDate}`, type: "orders", items: ordersToPickup })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer", transition: "transform 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn cần giao trong kỳ</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {ordersToPickup.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-amber)", marginTop: 4 }}>🔍 Nhấn để xem danh sách</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn cần nhận trả trong kỳ", subtitle: `Có ${ordersToReturn.length} đơn có hạn trả dự kiến trong kỳ`, type: "orders", items: ordersToReturn })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn cần nhận trả trong kỳ</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#2563EB", marginTop: 2 }}>
                {ordersToReturn.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-amber)", marginTop: 4 }}>🔍 Nhấn để xem danh sách</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn quá hạn tại thời điểm tổng hợp", subtitle: `Đơn quá giờ trả dự kiến nhưng chưa trả đủ thiết bị`, type: "orders", items: overdueOrders })}
              style={{ background: overdueOrders.length > 0 ? "#FEF2F2" : "white", borderRadius: 10, padding: 14, border: `1px solid ${overdueOrders.length > 0 ? "#F87171" : "var(--color-bone)"}`, cursor: "pointer" }}
            >
              <div style={{ fontSize: "0.75rem", color: overdueOrders.length > 0 ? "#B91C1C" : "#6B7280", fontWeight: 600 }}>Đơn quá hạn hiện tại</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: overdueOrders.length > 0 ? "#DC2626" : "var(--color-bark)", marginTop: 2 }}>
                {overdueOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: overdueOrders.length > 0 ? "#DC2626" : "#9CA3AF", marginTop: 4 }}>Cần gọi điện xử lý ngay</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn chờ đối soát cọc", subtitle: `Thiết bị đã nhận trả xong, đang chờ thủ quỹ hoàn/thu cọc`, type: "orders", items: pendingReconcileOrders })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn chờ đối soát cọc</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#D97706", marginTop: 2 }}>
                {pendingReconcileOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-amber)", marginTop: 4 }}>🔍 Nhấn để xem danh sách</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Danh sách lượt thuê đã bàn giao thành công", subtitle: `Các đơn đã giao thiết bị cho khách trong kỳ`, type: "orders", items: handedOverOrders })}
              style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Lượt thuê đã bàn giao</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {handedOverOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Tổng lượt giao trong kỳ</div>
            </div>

            <div
              onClick={() => setDrilldownData({ title: "Chi tiết các trường hợp thiết bị hư hỏng/mất mát", subtitle: `Danh sách biên bản nhận trả ghi nhận thiết bị hỏng có kết luận`, type: "damage", items: damageRecords })}
              style={{ background: damageRecords.length > 0 ? "#FFFBEB" : "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", cursor: "pointer" }}
            >
              <div style={{ fontSize: "0.75rem", color: "#92400E", fontWeight: 600 }}>Lần hỏng có kết luận</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#B45309", marginTop: 2 }}>
                {damageRecords.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#B45309", marginTop: 4 }}>🔍 Chi tiết từng biên bản</div>
            </div>
          </div>

          {/* Công suất kho và Top thiết bị */}
          <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 14, fontSize: "1rem" }}>
                Hiệu suất sử dụng thiết bị (Công suất kho)
              </h3>
              {(() => {
                const totalEquip = app.equipment.length;
                const rentedEquip = app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length;
                const availEquip = app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
                const maintEquip = app.equipment.filter((e) => e.equipmentStatus === "Đang bảo trì").length;
                const lostEquip = app.equipment.filter((e) => e.equipmentStatus === "Thất lạc" || e.equipmentStatus === "Ngừng sử dụng").length;
                const rate = totalEquip > 0 ? Math.round((rentedEquip / totalEquip) * 100) : 0;

                return (
                  <div>
                    <div className="flex items-end gap-3 mb-4">
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "2.5rem", fontWeight: 800, color: "var(--color-forest)", lineHeight: 1 }}>{rate}%</span>
                      <span style={{ fontSize: "0.85rem", color: "#6B7280" }}>công suất thiết bị đang cho thuê thực tế</span>
                    </div>
                    <div style={{ height: 12, background: "#E5E7EB", borderRadius: 6, overflow: "hidden", display: "flex", marginBottom: 16 }}>
                      <div style={{ width: `${totalEquip > 0 ? (rentedEquip / totalEquip) * 100 : 0}%`, background: "#1D4ED8" }} title="Đang thuê" />
                      <div style={{ width: `${totalEquip > 0 ? (availEquip / totalEquip) * 100 : 0}%`, background: "#15803D" }} title="Sẵn sàng" />
                      <div style={{ width: `${totalEquip > 0 ? (maintEquip / totalEquip) * 100 : 0}%`, background: "#F59E0B" }} title="Bảo trì" />
                      <div style={{ width: `${totalEquip > 0 ? (lostEquip / totalEquip) * 100 : 0}%`, background: "#EF4444" }} title="Hỏng/Mất" />
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, 1fr)", fontSize: "0.82rem" }}>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D4ED8" }} /> Đang thuê: <strong>{rentedEquip}</strong></div>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#15803D" }} /> Sẵn sàng: <strong>{availEquip}</strong></div>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} /> Đang bảo dưỡng: <strong>{maintEquip}</strong></div>
                      <div className="flex items-center gap-2"><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} /> Thất lạc/Ngừng dùng: <strong>{lostEquip}</strong></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 14, fontSize: "1rem" }}>
                Top thiết bị có số lượt thuê cao nhất
              </h3>
              <div className="flex flex-col gap-2">
                {[...app.equipment].sort((a, b) => b.rentCount - a.rentCount).slice(0, 5).map((e, idx) => {
                  const prod = app.products.find((p) => p.id === e.productId);
                  return (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-parchment)", borderRadius: 8 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-amber)", width: 18 }}>#{idx + 1}</span>
                        <div>
                          <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{e.id}</strong> — {prod?.name}
                          <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{e.condition} · Nhập {e.importDate}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-bark)" }}>{e.rentCount} lần thuê</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── BÁO CÁO 2: DOANH THU THUẦN (UC10.2 & UC10.2.1) ─────────────────── */}
      {reportSubTab === "revenue" && (
        <div>
          {/* Alert nguyên tắc kế toán bất di bất dịch */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 18px", marginBottom: 20, color: "#1E40AF", fontSize: "0.85rem" }}>
            <strong>💡 NGUYÊN TẮC KẾ TOÁN BẤT DI BẤT DỊCH (UC10.2):</strong> Tiền cọc là khoản nợ phải trả lại cho khách sau khi đối soát xong. Tiền cọc <strong>tuyệt đối không được tính vào doanh thu</strong> kinh doanh của GearGo.
          </div>

          {/* 3 Thẻ Doanh thu cốt lõi */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div
              onClick={() => setDrilldownData({ title: "Danh sách đơn thuê hoàn tất cấu thành doanh thu", subtitle: `Các đơn đã thanh toán và quyết toán hoàn tất trong kỳ`, type: "orders", items: completedOrders })}
              style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)", cursor: "pointer" }}
              className="hover:border-forest"
            >
              <div style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>Doanh thu tiền thuê thuần</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 4 }}>
                {fmt(pureRentalRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-amber)", marginTop: 4 }}>Từ {completedOrders.length} đơn hoàn tất trong kỳ 🔍</div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>Doanh thu phụ phí giữ lại</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#D97706", marginTop: 4 }}>
                +{fmt(surchargeRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4 }}>{approvedSurcharges.length} khoản bồi thường/quá hạn đã duyệt</div>
            </div>

            <div style={{ background: "var(--color-forest)", borderRadius: 12, padding: 18, color: "white" }}>
              <div style={{ fontSize: "0.78rem", opacity: 0.85, fontWeight: 600 }}>TỔNG DOANH THU THUẦN</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
                {fmt(pureRentalRevenue + surchargeRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", opacity: 0.8, marginTop: 4 }}>Thuê thuần + Phụ phí được giữ lại</div>
            </div>
          </div>

          {/* Phân bổ danh mục & Chỉ số mở rộng (Tỷ lệ hủy & Khách quay lại) */}
          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                Doanh thu phân bổ theo danh mục sản phẩm trong kỳ
              </h3>
              {app.categories.map((c) => {
                const catProds = app.products.filter((p) => p.category === c.name || p.categoryId === c.id).map((p) => p.id);
                const catRev = completedOrders.flatMap((o) => o.items).filter((it) => catProds.includes(it.productId)).reduce((s, it) => s + it.pricePerDay * it.qty * it.days, 0);
                const percent = pureRentalRevenue > 0 ? Math.round((catRev / pureRentalRevenue) * 100) : 0;

                return (
                  <div key={c.id} style={{ marginBottom: 12 }}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(catRev)} ({percent}%)</span>
                    </div>
                    <div style={{ height: 8, background: "var(--color-parchment)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "var(--color-forest)", width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              {/* Chỉ tiêu theo quy tắc UC10.2: Tỷ lệ hủy đơn & Khách quay lại */}
              <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
                <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10, fontSize: "0.9rem" }}>
                  Chỉ số chuyển đổi & Chăm sóc khách hàng (UC10.2)
                </h3>
                <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Tỷ lệ hủy đơn (BR22)</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color: "#DC2626", marginTop: 2 }}>
                      {cancellationRate}%
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>{canceledCount} hủy / {validDenominator} đơn tạo</div>
                  </div>

                  <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Khách quay lại (≥2 lần)</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                      {returningCustomersCount}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>Khách có ≥2 đơn hoàn tất</div>
                  </div>
                </div>
              </div>

              {/* Thu nhập khác & Cọc đang giữ */}
              <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
                <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Thu nhập khác: Phí hủy đơn giữ lại (UC07)</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 700, color: "var(--color-bark)", marginTop: 2 }}>
                    {fmt(cancellationFees)}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>Thu từ khách hủy sát giờ hẹn (&lt;48h)</div>
                </div>

                <div style={{ background: "#FFFBEB", borderRadius: 8, padding: 12, border: "1px solid #FDE68A" }}>
                  <div style={{ fontSize: "0.75rem", color: "#92400E", fontWeight: 600 }}>Tiền cọc đang tạm giữ trong các đơn mở</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 700, color: "#B45309", marginTop: 2 }}>
                    {fmt(currentHeldDeposit)}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#B45309" }}>Nợ phải hoàn trả khách sau khi đối soát</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── BÁO CÁO 3: DÒNG TIỀN THỰC TẾ (UC10.2.1 CASHFLOW) ────────────────── */}
      {reportSubTab === "cashflow" && (
        <div>
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#15803D", fontWeight: 700 }}>↑ DÒNG TIỀN VÀO (INFLOW)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#15803D", marginTop: 4 }}>
                +{fmt(totalCashInflow)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Tiền thuê + Cọc ban đầu + Thu thêm phụ phí</div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#DC2626", fontWeight: 700 }}>↓ DÒNG TIỀN RA (OUTFLOW)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#DC2626", marginTop: 4 }}>
                −{fmt(totalCashOutflow)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Hoàn cọc đối soát + Hoàn tiền hủy đơn</div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--color-bark)", fontWeight: 700 }}>DÒNG TIỀN RÒNG (NET CASHFLOW)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: netCashflow >= 0 ? "var(--color-forest)" : "#DC2626", marginTop: 4 }}>
                {netCashflow >= 0 ? "+" : ""}{fmt(netCashflow)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Lượng tiền thực tế chênh lệch trong tài khoản</div>
            </div>
          </div>

          {/* Bảng đối chiếu chênh lệch Doanh thu vs Dòng tiền (Bước 6 UC10.2) */}
          <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)", marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", fontSize: "0.95rem", marginBottom: 8 }}>
              Bảng đối chiếu chênh lệch: Doanh thu thuần vs Dòng tiền thực tế (UC10.2 - Bước 6)
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 12 }}>
              Giải thích nguyên nhân chênh lệch giữa Doanh thu ghi nhận trên đơn hoàn tất và Dòng tiền ra vào tài khoản ngân hàng trong kỳ.
            </p>
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, fontSize: "0.82rem" }}>
              <div className="flex justify-between py-1 border-b border-bone">
                <span>(A) Tổng doanh thu thuần ghi nhận (Thuê + Phụ phí giữ lại):</span>
                <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(pureRentalRevenue + surchargeRevenue)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-bone">
                <span>(B) Dòng tiền ròng thực tế qua tài khoản (Net Cashflow):</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{fmt(netCashflow)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-bone" style={{ color: "#B45309" }}>
                <span>(+) Tiền cọc khách hàng đang tạm giữ trong các đơn mở (Chưa hoàn):</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>+{fmt(currentHeldDeposit)}</strong>
              </div>
              <div className="flex justify-between py-1" style={{ color: "#4B5563" }}>
                <span>(+) Khoản thu nhập từ phí hủy đơn:</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>+{fmt(cancellationFees)}</strong>
              </div>
            </div>
          </div>

          {/* Chi tiết từng giao dịch */}
          <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
              Chi tiết giao dịch dòng tiền trong kỳ ({inRangeTransactions.length} giao dịch)
            </h3>
            <div className="responsive-table" style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                    {["Mã GD", "Loại giao dịch", "Đơn hàng", "Khách hàng", "Số tiền", "Trạng thái", "Ngày hoàn tất"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inRangeTransactions.map((t, idx) => (
                    <tr key={`${t.id}-${idx}`} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{t.id}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 600 }}>{t.type}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)" }}>{t.orderId}</td>
                      <td style={{ padding: "9px 12px" }}>{t.customerName}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: t.type === "Thanh toán ban đầu" || t.type === "Thu thêm" ? "#15803D" : "#DC2626" }}>
                        {t.type === "Thanh toán ban đầu" || t.type === "Thu thêm" ? "+" : "−"}{fmt(t.amount)}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ background: t.status === "Thành công" ? "#DCFCE7" : "#FEE2E2", color: t.status === "Thành công" ? "#15803D" : "#DC2626", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", color: "#6B7280" }}>{t.completedAt || t.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── BÁO CÁO 4: NHẬP KHO & TÀI SẢN (UC10.3) ─────────────────────────── */}
      {reportSubTab === "inventory" && (
        <div>
          {/* Lọc nhà cung cấp & Tổng tài sản */}
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Lọc theo Nhà cung cấp:</span>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "6px 12px", fontSize: "0.82rem", background: "white" }}
              >
                <option value="all">Tất cả nhà cung cấp</option>
                {app.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </div>
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: "6px 14px", border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}>
              Tổng giá trị nhập kho: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(totalImportAssetValue)}</strong>
            </div>
          </div>

          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            {/* Chi tiết từng phiếu nhập (UC10.3 bước 3 & 4) */}
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                Danh sách chứng từ nhập kho thực tế (UC10.3)
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 12 }}>
                Chỉ tính các phiếu đã hoàn tất nhập kho theo biên bản kiểm định. Nhấn nút "Mở chứng từ" để đối chiếu vật phẩm.
              </p>
              <div className="responsive-table" style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                      {["Mã phiếu", "Nhà cung cấp", "Ngày xác nhận", "Số dòng", "Tổng giá trị", "Thao tác"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inRangeImports.map((r) => {
                      const totalVal = r.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
                      return (
                        <tr key={r.id} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                          <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{r.id}</td>
                          <td style={{ padding: "8px 10px" }}>{r.supplierName}</td>
                          <td style={{ padding: "8px 10px", color: "#6B7280" }}>{r.confirmedAt || r.createdAt}</td>
                          <td style={{ padding: "8px 10px" }}>{r.lines.length} sản phẩm</td>
                          <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(totalVal)}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <button
                              onClick={() => setViewingReceipt(r)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                            >
                              🔍 Mở chứng từ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Thiết bị khấu hao & Chuyển loại */}
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                Thiết bị khấu hao & Chuyển loại (Giáng cấp)
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 14 }}>
                Danh sách thiết bị đã qua nhiều lần sử dụng và được chuyển sang dòng sản phẩm Tiết kiệm (khấu hao tài sản).
              </p>
              {(() => {
                const movedEquips = app.equipment.filter((e) => e.productId !== e.originalProductId);
                if (movedEquips.length === 0) {
                  return (
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 14, textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
                      Chưa có thiết bị nào được giáng cấp loại.
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col gap-2">
                    {movedEquips.map((e) => {
                      const curr = app.products.find((p) => p.id === e.productId);
                      const orig = app.products.find((p) => p.id === e.originalProductId);
                      return (
                        <div key={e.id} style={{ background: "#FFF7ED", border: "1px solid #FFEDD5", borderRadius: 8, padding: "10px 12px" }}>
                          <div className="flex justify-between">
                            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{e.id}</strong>
                            <span style={{ fontSize: "0.72rem", color: "#C2410C", fontWeight: 700 }}>Đã thuê {e.rentCount} lần</span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#4B5563", marginTop: 2 }}>
                            Gốc: <strong>{orig?.name}</strong> → Hiện tại: <strong>{curr?.name}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DRILL-DOWN CẤU THÀNH CHỈ TIÊU (UC10.1 Bước 4 & UC10.2 Bước 5) ─── */}
      {drilldownData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 800, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  {drilldownData.title}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>{drilldownData.subtitle}</div>
              </div>
              <button onClick={() => setDrilldownData(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {drilldownData.items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6B7280", fontSize: "0.85rem" }}>
                  Không có bản ghi nào cấu thành chỉ tiêu trong kỳ đã chọn.
                </div>
              ) : drilldownData.type === "orders" ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Mã đơn</th>
                      <th style={{ padding: "8px 12px" }}>Khách hàng</th>
                      <th style={{ padding: "8px 12px" }}>Trạng thái</th>
                      <th style={{ padding: "8px 12px" }}>Ngày hẹn lấy</th>
                      <th style={{ padding: "8px 12px" }}>Ngày hẹn trả</th>
                      <th style={{ padding: "8px 12px" }}>Tiền thuê</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.items.map((o: Order) => (
                      <tr key={o.id} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{o.id}</td>
                        <td style={{ padding: "8px 12px" }}>{o.customerName} ({o.customerPhone})</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 4, background: "#F3F4F6", fontWeight: 700 }}>{o.status}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{o.pickupTime}</td>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{o.returnTime}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(o.rental - o.discount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Mã đơn</th>
                      <th style={{ padding: "8px 12px" }}>Mã thiết bị</th>
                      <th style={{ padding: "8px 12px" }}>Tình trạng khi trả</th>
                      <th style={{ padding: "8px 12px" }}>Phụ phí bồi thường</th>
                      <th style={{ padding: "8px 12px" }}>Nhân viên kết luận</th>
                      <th style={{ padding: "8px 12px" }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.items.map((dm: any, i: number) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{dm.orderId}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{dm.equipmentId}</td>
                        <td style={{ padding: "8px 12px", color: "#DC2626", fontWeight: 600 }}>{dm.condition}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#D97706" }}>{fmt(dm.surchargeAmount || 0)}</td>
                        <td style={{ padding: "8px 12px" }}>{dm.staffName}</td>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{dm.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setDrilldownData(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XEM CHỨNG TỪ PHIẾU NHẬP KHO ĐỐI CHIẾU (UC10.3 Bước 6) ──────── */}
      {viewingReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 720, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  Chứng từ phiếu nhập kho — {viewingReceipt.id}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Nhà cung cấp: {viewingReceipt.supplierName} · Xác nhận: {viewingReceipt.confirmedAt || viewingReceipt.createdAt}</div>
              </div>
              <button onClick={() => setViewingReceipt(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px" }}>Sản phẩm</th>
                    <th style={{ padding: "8px 10px" }}>Số lượng</th>
                    <th style={{ padding: "8px 10px" }}>Đơn giá</th>
                    <th style={{ padding: "8px 10px" }}>Thành tiền</th>
                    <th style={{ padding: "8px 10px" }}>Mã thiết bị sinh ra</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingReceipt.lines.map((l, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid var(--color-bone)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{l.productNameSnapshot || l.productId}</td>
                      <td style={{ padding: "8px 10px" }}>{l.quantity}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{fmt(l.unitPrice)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(l.quantity * l.unitPrice)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-amber)" }}>
                        {l.equipmentCodes.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, fontSize: "0.8rem" }}>
                <div><strong>Người tạo:</strong> {viewingReceipt.createdBy} · <strong>Trạng thái:</strong> {viewingReceipt.status}</div>
                {viewingReceipt.note && <div style={{ marginTop: 4 }}><strong>Ghi chú:</strong> {viewingReceipt.note}</div>}
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewingReceipt(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

