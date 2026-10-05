import { useState } from "react";
import { useApp } from "../App";
import {
  fmt, statusColors, type Category, type Product, type Supplier, type Promotion, type ImportReceipt,
  type StaffAccount, type StockAdjustmentReceipt, type StockAdjustmentLine, type EquipmentStatus
} from "../store";
import Icon, { type IconName } from "../components/Icon";

type AdminTab = "dashboard" | "categories" | "products" | "equipment" | "inventory" | "stock-adjust" | "staff" | "suppliers" | "promotions" | "reports";

function FormModal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(23,46,35,0.58)", display: "grid", placeItems: "center", padding: "20px" }}>
      <div style={{ width: "min(100%, 760px)", maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: "16px", padding: "22px", boxShadow: "0 18px 48px rgba(23,46,35,0.24)" }}>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 style={{ fontSize: "1.15rem", color: "var(--color-bark)", marginBottom: "5px" }}>{title}</h2>
            <p style={{ color: "#6B7280", fontSize: "0.8rem", lineHeight: 1.5 }}>{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" style={{ border: "none", background: "transparent", color: "#6B7280", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const fieldStyle = { width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "10px 12px", background: "white" };
const labelStyle = { display: "grid", gap: "6px", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" };

function FormActions({ onClose }: { onClose: () => void }) {
  return <div className="flex gap-2 mt-5"><button type="button" onClick={onClose} style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "10px", background: "white", cursor: "pointer", fontWeight: 600 }}>Hủy</button><button type="submit" style={{ flex: 1, border: "none", borderRadius: "8px", padding: "10px", background: "var(--color-forest)", color: "white", cursor: "pointer", fontWeight: 700 }}>Lưu dữ liệu</button></div>;
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
  const set = <K extends keyof Promotion>(key: K, value: Promotion[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "productIds" | "categoryIds", id: string) => set(key, form[key].includes(id) ? form[key].filter((item) => item !== id) : [...form[key], id]);
  return <FormModal title={promotion ? "Sửa khuyến mãi" : "Tạo mã giảm"} description="Khuyến mãi chỉ giảm tiền thuê đủ điều kiện, không giảm tiền cọc." onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); const result = app.savePromotion(form); if (!result.ok) return setError(result.message); onClose(); }} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Mã giảm giá<input value={form.code} onChange={(e) => set("code", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Tên chương trình<input value={form.name} onChange={(e) => set("name", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Loại giảm<select value={form.discountType} onChange={(e) => set("discountType", e.target.value as Promotion["discountType"])} style={fieldStyle}><option value="percentage">Phần trăm</option><option value="fixed">Số tiền cố định</option></select></label>
        <label style={labelStyle}>Giá trị giảm<input type="number" min="0" value={form.discountValue} onChange={(e) => set("discountValue", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Mức giảm tối đa<input type="number" min="0" value={form.maxDiscount ?? ""} onChange={(e) => set("maxDiscount", e.target.value ? Number(e.target.value) : null)} style={fieldStyle} /></label>
        <label style={labelStyle}>Tiền thuê tối thiểu<input type="number" min="0" value={form.minimumRental} onChange={(e) => set("minimumRental", Number(e.target.value))} style={fieldStyle} /></label>
        <label style={labelStyle}>Bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Kết thúc<input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Giới hạn tổng lượt<input type="number" min="1" value={form.totalUsageLimit ?? ""} onChange={(e) => set("totalUsageLimit", e.target.value ? Number(e.target.value) : null)} style={fieldStyle} /></label>
        <label style={labelStyle}>Giới hạn mỗi khách<input type="number" min="1" value={form.perCustomerLimit ?? ""} onChange={(e) => set("perCustomerLimit", e.target.value ? Number(e.target.value) : null)} style={fieldStyle} /></label>
        <label style={labelStyle}>Phạm vi<select value={form.scope} onChange={(e) => set("scope", e.target.value as Promotion["scope"])} style={fieldStyle}><option value="all">Tất cả sản phẩm</option><option value="categories">Theo danh mục</option><option value="products">Theo sản phẩm</option></select></label>
        <label style={labelStyle}>Trạng thái<select value={form.status} onChange={(e) => set("status", e.target.value as Promotion["status"])} style={fieldStyle}><option value="active">Hoạt động</option><option value="inactive">Tạm dừng</option></select></label>
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
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs: { key: AdminTab; label: string; icon: IconName }[] = [
    { key: "dashboard", label: "Tổng quan", icon: "grid" },
    { key: "categories", label: "Danh mục", icon: "tag" },
    { key: "products", label: "Sản phẩm", icon: "tent" },
    { key: "equipment", label: "Thiết bị", icon: "tool" },
    { key: "inventory", label: "Phiếu nhập", icon: "package" },
    { key: "stock-adjust", label: "Điều chỉnh kho", icon: "settings" },
    { key: "staff", label: "Nhân viên", icon: "users" },
    { key: "suppliers", label: "Nhà cung cấp", icon: "truck" },
    { key: "promotions", label: "Khuyến mãi", icon: "tag" },
    { key: "reports", label: "Báo cáo", icon: "chart" },
  ];

  return (
    <div className="internal-shell">
      <button className={`drawer-backdrop ${menuOpen ? "is-open" : ""}`} aria-label="Đóng menu quản trị" onClick={() => setMenuOpen(false)} />
      <aside className={`internal-nav ${menuOpen ? "is-open" : ""}`} aria-label="Điều hướng quản trị">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setMenuOpen(false); }}
            style={{ minHeight: 44, padding: "11px 12px", border: "none", borderRadius: "9px", background: tab === t.key ? "var(--color-forest)" : "transparent", color: tab === t.key ? "white" : "var(--color-bark)", fontWeight: tab === t.key ? 700 : 500, cursor: "pointer", fontSize: "0.84rem", textAlign: "left", whiteSpace: "nowrap" }}
          ><span className="icon-label"><Icon name={t.icon} size={18} /> {t.label}</span></button>
        ))}
      </aside>

      <div className="internal-content">
        <div className="internal-topbar">
          <div>
            <div style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: 2 }}>Không gian quản trị</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-bark)" }}>{tabs.find((item) => item.key === tab)?.label}</div>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Thông báo" style={{ width: 42, height: 42, display: "grid", placeItems: "center", border: "1px solid var(--color-bone)", borderRadius: 9, background: "white", color: "var(--color-bark)" }}><Icon name="bell" size={18} /></button>
            <button className="internal-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Mở menu quản trị" style={{ width: 42, height: 42, placeItems: "center", border: "1px solid var(--color-bone)", borderRadius: 9, background: "white" }}><Icon name="menu" /></button>
          </div>
        </div>
        {tab === "dashboard" && <DashboardTab app={app} />}
        {tab === "categories" && <CategoriesTab app={app} />}
        {tab === "products" && <ProductsTab app={app} />}
        {tab === "equipment" && <EquipmentTab app={app} />}
        {tab === "inventory" && <InventoryTab app={app} />}
        {tab === "stock-adjust" && <StockAdjustTab app={app} />}
        {tab === "staff" && <StaffAccountsTab app={app} />}
        {tab === "suppliers" && <SuppliersTab app={app} />}
        {tab === "promotions" && <PromotionsTab app={app} />}
        {tab === "reports" && <ReportsTab app={app} />}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab({ app }: { app: ReturnType<typeof useApp> }) {
  const pendingSurcharges = app.orders.flatMap((order) =>
    order.surcharges
      .filter((surcharge) => surcharge.status === "Chờ duyệt")
      .map((surcharge) => ({ order, surcharge }))
  );
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: "18px" }}>Tổng quan hệ thống</h2>
      <div className="responsive-kpi-grid grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {([
          { label: "Doanh thu tháng 12", value: "14.200.000đ", sub: "+18% tháng trước", icon: "wallet", color: "var(--color-forest)" },
          { label: "Đơn đang xử lý", value: app.orders.filter((o) => !["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn"].includes(o.status)).length.toString(), sub: "Chưa hoàn tất", icon: "clipboard", color: "var(--color-amber)" },
          { label: "Thiết bị đang thuê", value: app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length.toString(), sub: `/ ${app.equipment.length} tổng cộng`, icon: "tent", color: "#1D4ED8" },
          { label: "Cọc đang giữ", value: fmt(app.orders.filter((o) => o.status === "Đang thuê").reduce((s, o) => s + o.depositTotal, 0)), sub: "Không phải doanh thu", icon: "shield", color: "#9CA3AF" },
        ] as { label: string; value: string; sub: string; icon: IconName; color: string }[]).map((k) => (
          <div key={k.label} style={{ background: "white", borderRadius: "12px", padding: "16px", border: "1px solid var(--color-bone)" }}>
            <div style={{ color: k.color, marginBottom: "6px" }}><Icon name={k.icon} size={22} /></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 700, color: k.color, marginBottom: "2px" }}>{k.value}</div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)", marginBottom: "2px" }}>{k.label}</div>
            <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden", marginBottom: "18px" }}>
        <div className="flex justify-between items-center" style={{ background: "var(--color-parchment)", padding: "12px 16px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)" }}>Phụ phí chờ phê duyệt</div>
            <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Nhân viên chỉ lập đề xuất; quản trị viên quyết định duyệt hoặc từ chối.</div>
          </div>
          <span style={{ background: pendingSurcharges.length ? "#FEF3C7" : "#DCFCE7", color: pendingSurcharges.length ? "#B45309" : "#15803D", borderRadius: "999px", padding: "4px 10px", fontWeight: 700, fontSize: "0.75rem" }}>{pendingSurcharges.length}</span>
        </div>
        {pendingSurcharges.length === 0 ? (
          <div style={{ padding: "18px", textAlign: "center", color: "#6B7280", fontSize: "0.84rem" }}>Không có phụ phí đang chờ duyệt.</div>
        ) : pendingSurcharges.map(({ order, surcharge }) => (
          <div key={surcharge.id} className="flex items-center gap-3 flex-wrap" style={{ padding: "12px 16px", borderTop: "1px solid var(--color-bone)" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem" }}>{surcharge.type} · {surcharge.equipmentId}</div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{order.id} · {order.customerName} · {surcharge.reason}</div>
            </div>
            <strong style={{ color: "#B91C1C" }}>+{fmt(surcharge.amount)}</strong>
            <button onClick={() => app.rejectSurcharge(order.id, surcharge.id)} style={{ border: "1px solid #FECACA", background: "white", color: "#B91C1C", borderRadius: "7px", padding: "7px 11px", cursor: "pointer", fontWeight: 600 }}>Từ chối</button>
            <button onClick={() => app.approveSurcharge(order.id, surcharge.id)} style={{ border: "none", background: "var(--color-forest)", color: "white", borderRadius: "7px", padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>Duyệt phụ phí</button>
          </div>
        ))}
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

      {/* Status flow */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "18px", marginTop: "18px" }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)", marginBottom: "12px" }}>Luồng trạng thái đơn thuê</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].map((s, i, arr) => {
            const sc = statusColors[s] || { bg: "#F3F4F6", text: "#374151" };
            const cnt = app.orders.filter((o) => o.status === s).length;
            return (
              <div key={s} className="flex items-center gap-2">
                <div style={{ background: sc.bg, borderRadius: "8px", padding: "7px 12px", textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: sc.text }}>{cnt}</div>
                  <div style={{ fontSize: "0.66rem", color: sc.text, fontWeight: 600, whiteSpace: "nowrap" }}>{s}</div>
                </div>
                {i < arr.length - 1 && <span style={{ color: "var(--color-bone)", fontSize: "1.1rem" }}>→</span>}
              </div>
            );
          })}
        </div>
      </div>
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

// ─── Products Tab ─────────────────────────────────────────────────────────────
function ProductsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [action, setAction] = useState<Product | "new" | null>(null);
  const detail = sel ? app.products.find((p) => p.id === sel) : null;
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý sản phẩm</h2>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm sản phẩm</button>
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
              {app.products.map((p, i) => {
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
              {["Mã", "Sản phẩm hiện tại", "Nguồn nhập gốc", "Ngày nhập", "Điều kiện", "Trạng thái", "Lần thuê", ""].map((h) => (
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
                  <td style={{ padding: "9px 12px" }}><button onClick={() => setEditing(e)} style={{ border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", background: "white", cursor: "pointer", fontSize: "0.72rem" }}>Sửa</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <EquipmentForm app={app} equipment={editing} onClose={() => setEditing(null)} />}
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

// ─── Inventory Tab ────────────────────────────────────────────────────────────
function InventoryTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [selectedId, setSelectedId] = useState<string | null>(app.importReceipts[0]?.id ?? null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<ImportReceipt | "new" | null>(null);
  const selected = app.importReceipts.find((receipt) => receipt.id === selectedId);

  const receiptTotal = (receipt: typeof app.importReceipts[number]) =>
    receipt.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const confirmReceipt = (receiptId: string) => {
    const error = app.confirmImportReceipt(receiptId);
    setMessage(error ? { type: "error", text: error } : { type: "success", text: "Đã xác nhận nhập kho. Thiết bị mới đã chuyển sang trạng thái Sẵn sàng." });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Phiếu nhập hàng</h2>
          <p style={{ color: "#6B7280", fontSize: "0.8rem" }}>Phiếu nháp không làm thay đổi tồn kho cho đến khi được xác nhận.</p>
        </div>
        <button onClick={() => setEditing("new")} style={{ background: "var(--color-forest)", color: "white", padding: "9px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Tạo phiếu nháp</button>
      </div>
      {message && (
        <div role="status" style={{ background: message.type === "success" ? "#DCFCE7" : "#FEE2E2", color: message.type === "success" ? "#15803D" : "#B91C1C", border: `1px solid ${message.type === "success" ? "#A7F3D0" : "#FECACA"}`, borderRadius: "9px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.82rem" }}>{message.text}</div>
      )}
      <div className="responsive-two-column grid gap-5" style={{ gridTemplateColumns: "minmax(280px, 0.8fr) minmax(0, 1.4fr)" }}>
        <div className="flex flex-col gap-3">
          {app.importReceipts.slice().reverse().map((receipt) => {
            const quantity = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
            return (
              <button key={receipt.id} onClick={() => { setSelectedId(receipt.id); setMessage(null); }} style={{ background: "white", borderRadius: "10px", padding: "14px 16px", border: `1px solid ${selectedId === receipt.id ? "var(--color-forest)" : "var(--color-bone)"}`, display: "block", cursor: "pointer", textAlign: "left" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{receipt.displayCode ?? receipt.id}</span>
                  <span style={{ background: receipt.status === "Đã nhập kho" ? "#DCFCE7" : "#FEF3C7", color: receipt.status === "Đã nhập kho" ? "#15803D" : "#B45309", padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600 }}>{receipt.status}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.86rem" }}>{receipt.supplierName}</div>
                <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: "3px" }}>{receipt.lines.length} loại · {quantity} thiết bị · {receipt.createdBy}</div>
                <div style={{ fontWeight: 700, marginTop: "8px" }}>{fmt(receiptTotal(receipt))}</div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: "14px", overflow: "hidden", alignSelf: "start" }}>
            <div className="flex justify-between items-start" style={{ background: "var(--color-parchment)", padding: "16px 18px" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontWeight: 700 }}>{selected.displayCode ?? selected.id}</div>
                <div style={{ fontWeight: 700 }}>{selected.supplierName}</div>
                <div style={{ color: "#6B7280", fontSize: "0.72rem" }}>Lập lúc {selected.createdAt} · {selected.createdBy}</div>
              </div>
              <span style={{ background: selected.status === "Đã nhập kho" ? "#DCFCE7" : "#FEF3C7", color: selected.status === "Đã nhập kho" ? "#15803D" : "#B45309", borderRadius: "999px", padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700 }}>{selected.status}</span>
            </div>
            <div className="responsive-table">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                <thead><tr style={{ color: "#6B7280", fontSize: "0.72rem" }}>
                  {["Sản phẩm", "SL", "Đơn giá", "Mã thiết bị", "Thành tiền"].map((heading) => <th key={heading} style={{ textAlign: heading === "Sản phẩm" || heading === "Mã thiết bị" ? "left" : "right", padding: "10px 14px" }}>{heading}</th>)}
                </tr></thead>
                <tbody>{selected.lines.map((line) => {
                  const product = app.products.find((item) => item.id === line.productId);
                  return (
                    <tr key={line.productId} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{product?.name}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>{line.quantity}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>{fmt(line.unitPrice)}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.72rem", color: "#6B7280" }}>{line.equipmentCodes.join(", ")}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(line.quantity * line.unitPrice)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div style={{ padding: "16px 18px", borderTop: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between" style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "12px" }}><span>Tổng phiếu nhập</span><span style={{ color: "var(--color-forest)" }}>{fmt(receiptTotal(selected))}</span></div>
              {selected.status === "Nháp" ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(selected)} style={{ flex: 1, background: "white", color: "var(--color-forest)", border: "1px solid var(--color-forest)", borderRadius: "9px", padding: "11px", cursor: "pointer", fontWeight: 700 }}>Sửa nháp</button>
                  <button onClick={() => { const reason = window.prompt("Lý do hủy phiếu nhập:"); if (!reason) return; const result = app.cancelImportReceipt(selected.id, reason); setMessage(result.ok ? { type: "success", text: "Đã hủy phiếu nháp. Kho không thay đổi." } : { type: "error", text: result.message }); }} style={{ background: "white", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: "9px", padding: "11px", cursor: "pointer", fontWeight: 700 }}>Hủy</button>
                  <button onClick={() => confirmReceipt(selected.id)} style={{ flex: 1.4, background: "var(--color-forest)", color: "white", border: "none", borderRadius: "9px", padding: "11px", cursor: "pointer", fontWeight: 700 }}>Xác nhận nhập kho</button>
                </div>
              ) : (
                <div style={{ background: selected.status === "Đã hủy" ? "#F3F4F6" : "#DCFCE7", color: selected.status === "Đã hủy" ? "#6B7280" : "#15803D", borderRadius: "8px", padding: "10px", fontSize: "0.8rem", textAlign: "center", fontWeight: 600 }}>{selected.status === "Đã hủy" ? "Phiếu đã hủy, kho không thay đổi." : `Đã nhập kho lúc ${selected.confirmedAt}. Phiếu được khóa chỉnh sửa.`}</div>
              )}
            </div>
          </div>
        )}
      </div>
      {editing && <ImportReceiptForm app={app} receipt={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
function SuppliersTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [action, setAction] = useState<Supplier | "new" | null>(null);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Nhà cung cấp</h2>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Thêm</button>
      </div>
      <div className="flex flex-col gap-3">
        {app.suppliers.map((s) => {
          const receipts = app.importReceipts.filter((receipt) => receipt.supplierId === s.id || receipt.supplierId === s.displayCode);
          const total = receipts.filter((receipt) => receipt.status === "Đã nhập kho").reduce((sum, receipt) => sum + receipt.lines.reduce((lineSum, line) => lineSum + line.quantity * line.unitPrice, 0), 0);
          return <div key={s.id} style={{ background: "white", borderRadius: "10px", padding: "16px 20px", border: "1px solid var(--color-bone)", display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ width: 44, height: 44, color: "var(--color-forest)", background: "var(--color-parchment)", borderRadius: "10px", display: "grid", placeItems: "center" }}><Icon name="truck" size={21} /></div>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-moss)" }}>{s.displayCode}</span>
                <span style={{ background: s.cooperationStatus === "active" ? "#DCFCE7" : "#F3F4F6", color: s.cooperationStatus === "active" ? "#15803D" : "#6B7280", padding: "1px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>{s.cooperationStatus === "active" ? "Đang hợp tác" : "Ngừng hợp tác"}</span>
              </div>
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>{s.contactPerson} · {s.phone} · {receipts.length} phiếu nhập</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Tổng nhập</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(total)}</div>
              <button onClick={() => setAction(s)} style={{ marginTop: 5, border: "1px solid var(--color-bone)", borderRadius: 6, background: "white", padding: "4px 8px", cursor: "pointer", fontSize: "0.72rem" }}>Sửa</button>
            </div>
          </div>
        })}
      </div>
      {action && <SupplierForm app={app} supplier={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
    </div>
  );
}

// ─── Promotions ───────────────────────────────────────────────────────────────
function PromotionsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [action, setAction] = useState<Promotion | "new" | null>(null);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý khuyến mãi</h2>
        <button onClick={() => setAction("new")} style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>+ Tạo mã giảm</button>
      </div>
      <div className="flex flex-col gap-3">
        {app.promotions.map((p) => (
          <div key={p.id} style={{ background: "white", borderRadius: "10px", padding: "14px 18px", border: "1px solid var(--color-bone)", display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "10px 14px", textAlign: "center", minWidth: 110 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", letterSpacing: "0.05em" }}>{p.code}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-amber)", fontWeight: 600 }}>{p.discountType === "percentage" ? `Giảm ${p.discountValue}%` : `Giảm ${fmt(p.discountValue)}`}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "2px" }}>{p.name} · Tối thiểu: {fmt(p.minimumRental)} · Phạm vi: {p.scope === "all" ? "Tất cả" : p.scope === "products" ? "Theo sản phẩm" : "Theo danh mục"}</div>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Hết hạn: {new Date(p.endsAt).toLocaleDateString("vi-VN")} · Đã dùng: {p.usedCount}/{p.totalUsageLimit ?? "∞"} lượt</div>
              <div style={{ background: "var(--color-bone)", borderRadius: "3px", height: "4px", marginTop: "5px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--color-forest)", width: `${p.totalUsageLimit ? Math.min(100, p.usedCount / p.totalUsageLimit * 100) : 0}%` }} />
              </div>
            </div>
            <div><span style={{ background: p.status === "active" ? "#DCFCE7" : "#F3F4F6", color: p.status === "active" ? "#15803D" : "#6B7280", padding: "4px 10px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 600 }}>{p.status === "active" ? "Hoạt động" : "Tạm dừng"}</span><button onClick={() => setAction(p)} style={{ display: "block", marginTop: 7, border: "1px solid var(--color-bone)", borderRadius: 6, background: "white", padding: "4px 8px", cursor: "pointer", fontSize: "0.72rem" }}>Sửa</button></div>
          </div>
        ))}
      </div>
      {action && <PromotionForm app={app} promotion={action === "new" ? undefined : action} onClose={() => setAction(null)} />}
    </div>
  );
}

// ─── Stock Adjustments (UC20 & UC22) ──────────────────────────────────────────
function StockAdjustTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [showModal, setShowModal] = useState(false);
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
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Điều chỉnh kho sau kiểm kê (UC20 & UC22)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Lập phiếu điều chỉnh khi phát hiện chênh lệch, mất mát hoặc hư hỏng thiết bị trong các đợt kiểm kê định kỳ.
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ background: "var(--color-forest)", color: "white", padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          + Lập phiếu điều chỉnh
        </button>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã phiếu", "Ngày lập", "Người lập", "Lý do chung", "Thiết bị điều chỉnh", "Trạng thái cũ → Mới"].map((h) => (
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
    </div>
  );
}

// ─── Staff Accounts (UC23) ────────────────────────────────────────────────────
function StaffAccountsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const handleToggle = (staff: StaffAccount) => {
    if (staff.role === "Quản trị viên") {
      alert("Không thể khóa tài khoản Quản trị viên hệ thống.");
      return;
    }

    if (staff.status === "active") {
      const reason = window.prompt("Nhập lý do khóa tài khoản nhân viên (VD: Nghỉ việc, Tạm ngưng công tác...):", "Nghỉ việc");
      if (reason !== null) {
        app.toggleStaffLock(staff.id, reason);
      }
    } else {
      if (window.confirm(`Mở khóa tài khoản cho nhân viên ${staff.name}?`)) {
        app.toggleStaffLock(staff.id);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Quản lý tài khoản nhân viên (UC23)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Phân quyền tài khoản nhân viên kho và nhân viên chăm sóc khách hàng; khóa tài khoản khi nghỉ việc.
          </p>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã NV", "Họ và tên", "Tên đăng nhập", "Vai trò", "Số điện thoại", "Email", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {app.staffAccounts.map((s, i) => (
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
                  {s.role !== "Quản trị viên" && (
                    <button onClick={() => handleToggle(s)}
                      style={{
                        background: s.status === "active" ? "white" : "var(--color-forest)",
                        color: s.status === "active" ? "#DC2626" : "white",
                        border: `1px solid ${s.status === "active" ? "#FECACA" : "var(--color-forest)"}`,
                        borderRadius: 6, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700
                      }}>
                      {s.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports (UC25 - 4 Trụ Cột Báo Cáo Tài Chính Chuẩn) ────────────────────────
function ReportsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [reportSubTab, setReportSubTab] = useState<"operational" | "revenue" | "cashflow" | "inventory">("operational");

  // Tính toán số liệu thực tế từ store
  const totalCompletedOrders = app.orders.filter((o) => o.status === "Hoàn tất");
  const pureRentalRevenue = totalCompletedOrders.reduce((sum, o) => sum + (o.rental - o.discount), 0);
  const approvedSurcharges = app.orders.flatMap((o) => o.surcharges.filter((s) => s.status === "Đã duyệt"));
  const surchargeRevenue = approvedSurcharges.reduce((sum, s) => sum + s.amount, 0);
  const cancellationFees = app.orders.filter((o) => o.status === "Khách hủy").reduce((sum, o) => sum + (o.cancellationFee || 0), 0);
  const currentHeldDeposit = app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status)).reduce((sum, o) => sum + o.depositTotal, 0);

  // Dòng tiền
  const totalCashInflow = app.orders.reduce((sum, o) => {
    const initPay = o.paidAt ? (o.rental - o.discount + o.depositTotal) : 0;
    const extraPay = o.transactions.filter((t) => t.type === "Thu thêm" && t.status === "Thành công").reduce((s, t) => s + t.amount, 0);
    return sum + initPay + extraPay;
  }, 0);

  const totalCashOutflow = app.orders.reduce((sum, o) => {
    const refundRefund = o.transactions.filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công").reduce((s, t) => s + t.amount, 0);
    return sum + refundRefund;
  }, 0);

  const netCashflow = totalCashInflow - totalCashOutflow;

  // Nhập kho
  const totalImportAssetValue = app.importReceipts.filter((r) => r.status === "Đã nhập kho").reduce((sum, r) => sum + r.lines.reduce((ls, l) => ls + l.quantity * l.unitPrice, 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Báo cáo & Phân tích chuyên sâu (UC25)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Hệ thống 4 báo cáo tách biệt, tuân thủ nghiêm ngặt nguyên tắc kế toán tài chính.
          </p>
        </div>
      </div>

      {/* Sub tabs điều hướng 4 báo cáo */}
      <div className="flex gap-2 mb-6 border-b border-bone pb-3 flex-wrap">
        {[
          { key: "operational" as const, label: "1. Vận hành kho", icon: "tool" as IconName },
          { key: "revenue" as const, label: "2. Doanh thu thuần (Không tính cọc)", icon: "chart" as IconName },
          { key: "cashflow" as const, label: "3. Dòng tiền thực tế (Cashflow)", icon: "wallet" as IconName },
          { key: "inventory" as const, label: "4. Nhập kho & Tài sản", icon: "package" as IconName },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setReportSubTab(tab.key)}
            style={{
              background: reportSubTab === tab.key ? "var(--color-forest)" : "white",
              color: reportSubTab === tab.key ? "white" : "var(--color-bark)",
              border: `1px solid ${reportSubTab === tab.key ? "var(--color-forest)" : "var(--color-bone)"}`,
              borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem"
            }}>
            <span className="icon-label"><Icon name={tab.icon} size={16} /> {tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Báo cáo 1: Vận hành kho ────────────────────────────────────────── */}
      {reportSubTab === "operational" && (
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
                    <div style={{ width: `${(rentedEquip / totalEquip) * 100}%`, background: "#1D4ED8" }} title="Đang thuê" />
                    <div style={{ width: `${(availEquip / totalEquip) * 100}%`, background: "#15803D" }} title="Sẵn sàng" />
                    <div style={{ width: `${(maintEquip / totalEquip) * 100}%`, background: "#F59E0B" }} title="Bảo trì" />
                    <div style={{ width: `${(lostEquip / totalEquip) * 100}%`, background: "#EF4444" }} title="Hỏng/Mất" />
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
      )}

      {/* ─── Báo cáo 2: Doanh thu thuần (Không tính cọc) ─────────────────────── */}
      {reportSubTab === "revenue" && (
        <div>
          {/* Alert chuẩn kế toán */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 18px", marginBottom: 20, color: "#1E40AF", fontSize: "0.85rem" }}>
            <strong>💡 NGUYÊN TẮC KẾ TOÁN BẤT DI BẤT DỊCH:</strong> Tiền cọc là khoản nợ phải trả lại cho khách sau khi hoàn tất thuê đồ. Tiền cọc <strong>tuyệt đối không được tính vào doanh thu</strong> kinh doanh của GearGo.
          </div>

          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>Doanh thu tiền thuê thuần</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 4 }}>
                {fmt(pureRentalRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4 }}>Từ các đơn thuê đã hoàn tất (sau voucher)</div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>Doanh thu phụ phí giữ lại</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#D97706", marginTop: 4 }}>
                +{fmt(surchargeRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4 }}>Bồi thường hư hỏng, quá hạn, vệ sinh đã duyệt</div>
            </div>

            <div style={{ background: "var(--color-forest)", borderRadius: 12, padding: 18, color: "white" }}>
              <div style={{ fontSize: "0.78rem", opacity: 0.85, fontWeight: 600 }}>TỔNG DOANH THU THUẦN</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
                {fmt(pureRentalRevenue + surchargeRevenue)}
              </div>
              <div style={{ fontSize: "0.72rem", opacity: 0.8, marginTop: 4 }}>Thuê thuần + Phụ phí giữ lại</div>
            </div>
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                Doanh thu phân bổ theo danh mục sản phẩm
              </h3>
              {app.categories.map((c) => {
                const catProds = app.products.filter((p) => p.category === c.name || p.categoryId === c.id).map((p) => p.id);
                const catRev = totalCompletedOrders.flatMap((o) => o.items).filter((it) => catProds.includes(it.productId)).reduce((s, it) => s + it.pricePerDay * it.qty * it.days, 0);
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

            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                Thu nhập khác (Trình bày riêng)
              </h3>
              <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>Phí phạt hủy đơn giữ lại (UC07)</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 700, color: "var(--color-bark)", marginTop: 2 }}>
                  {fmt(cancellationFees)}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#9CA3AF", marginTop: 4 }}>Thu từ khách hủy đơn sát giờ (&lt;48h)</div>
              </div>
              <div style={{ background: "#FFFBEB", borderRadius: 8, padding: 14, border: "1px solid #FDE68A" }}>
                <div style={{ fontSize: "0.78rem", color: "#92400E" }}>Tiền cọc đang tạm giữ trong các đơn mở</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 700, color: "#B45309", marginTop: 2 }}>
                  {fmt(currentHeldDeposit)}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#B45309", marginTop: 4 }}>Sẽ hoàn trả cho khách sau khi đối soát</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Báo cáo 3: Dòng tiền thực tế (Cashflow) ────────────────────────── */}
      {reportSubTab === "cashflow" && (
        <div>
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.78rem", color: "#15803D", fontWeight: 700 }}>↑ DÒNG TIỀN VÀO (INFLOW)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", fontWeight: 800, color: "#15803D", marginTop: 4 }}>
                +{fmt(totalCashInflow)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Thanh toán ban đầu (thuê + cọc) + Thu thêm</div>
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
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>Lượng tiền thực tế còn lại trong tài khoản</div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
              Chi tiết giao dịch dòng tiền (Money Transactions)
            </h3>
            <div className="responsive-table" style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                    {["Mã GD", "Loại giao dịch", "Đơn hàng", "Số tiền", "Trạng thái", "Ngày hoàn tất"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {app.orders.flatMap((o) => o.transactions.map((t) => ({ ...t, orderId: o.id }))).map((t, idx) => (
                    <tr key={`${t.id}-${idx}`} style={{ borderTop: "1px solid var(--color-bone)", fontSize: "0.8rem" }}>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{t.id}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 600 }}>{t.type}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)" }}>{t.orderId}</td>
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

      {/* ─── Báo cáo 4: Nhập kho & Tài sản ──────────────────────────────────── */}
      {reportSubTab === "inventory" && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
              Tổng tài sản nhập kho theo Nhà cung cấp
            </h3>
            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>Tổng giá trị thiết bị đã nhập kho:</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", fontWeight: 800, color: "var(--color-forest)" }}>
                {fmt(totalImportAssetValue)}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {app.suppliers.map((s) => {
                const receipts = app.importReceipts.filter((r) => r.status === "Đã nhập kho" && (r.supplierId === s.id || r.supplierId === s.displayCode));
                const supVal = receipts.reduce((sum, r) => sum + r.lines.reduce((ls, l) => ls + l.quantity * l.unitPrice, 0), 0);
                return (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#F9FAFB", borderRadius: 8 }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem" }}>{s.name}</strong>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{receipts.length} phiếu nhập đã duyệt</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(supVal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

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
      )}
    </div>
  );
}

