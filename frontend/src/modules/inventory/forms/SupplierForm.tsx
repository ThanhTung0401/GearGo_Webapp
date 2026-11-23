import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { supplierApi } from "../../../services/api/supplierApi";

import { type Supplier } from "../../../store";

import { FormModal, FormActions } from "./FormModal";

export function toDatetimeLocalInput(val?: string): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// [SUP-02] Tao ma NCC goi y dang NCC + chu so dua tren so NCC hien co.
function suggestSupplierCode(suppliers: Supplier[]): string {
  const next = suppliers.length + 1;
  return `NCC${String(next).padStart(3, "0")}`;
}

export function SupplierForm({ app, supplier, onClose }: { app: ReturnType<typeof useApp>; supplier?: Supplier; onClose: () => void }) {
  const [form, setForm] = useState<Supplier>(
    supplier ?? {
      id: "",
      // [SUP-02] Tu sinh ma NCC goi y khi them moi de nguoi dung khong phai tu nghi.
      displayCode: suggestSupplierCode(app.suppliers),
      name: "", contactPerson: "", phone: "", email: "", address: "", taxCode: "", note: "", cooperationStatus: "active",
    }
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof Supplier>(key: K, value: Supplier[K]) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Tên nhà cung cấp không được để trống.");

    // [SUP-02] Validate client-side: bat buoc co SDT hoac Email, kiem tra regex neu co nhap.
    const phoneTrim = form.phone.trim();
    const emailTrim = form.email.trim();
    if (!phoneTrim && !emailTrim) {
      return setError("Vui lòng nhập ít nhất một trong hai: Số điện thoại hoặc Email để liên hệ nhà cung cấp.");
    }
    if (phoneTrim && !/^(\+84|0)\d{9,10}$/.test(phoneTrim)) {
      return setError("Số điện thoại không hợp lệ (10-11 chữ số, bắt đầu bằng 0 hoặc +84).");
    }
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      return setError("Định dạng Email nhà cung cấp không hợp lệ.");
    }

    if (app.realApi || isRealApiEnabled()) {
      setLoading(true);
      try {
        if (supplier) {
          const supplierId = Number(supplier.id);
          if (Number.isNaN(supplierId)) {
            setError("ID nhà cung cấp không hợp lệ.");
            return;
          }
          await supplierApi.capNhat(supplierId, {
            ten: form.name.trim(),
            nguoiLienHe: form.contactPerson.trim() || undefined,
            soDienThoai: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            diaChi: form.address.trim() || undefined,
            maSoThue: form.taxCode.trim() || undefined,
            ghiChu: form.note.trim() || undefined,
            lyDoThayDoi: "Cập nhật thông tin nhà cung cấp",
          });
          if (form.cooperationStatus !== supplier.cooperationStatus) {
            await supplierApi.doiTrangThaiHopTac(
              supplierId,
              form.cooperationStatus === "active" ? "DangHopTac" : "NgungHopTac",
              form.cooperationStatus === "active" ? "Kích hoạt hợp tác trở lại" : "Ngừng hợp tác từ hồ sơ NCC"
            );
          }
        } else {
          if (!form.displayCode.trim()) {
            setError("Mã nhà cung cấp không được để trống.");
            return;
          }
          await supplierApi.tao({
            maHienThi: form.displayCode.trim().toUpperCase(),
            ten: form.name.trim(),
            nguoiLienHe: form.contactPerson.trim() || undefined,
            soDienThoai: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            diaChi: form.address.trim() || undefined,
            maSoThue: form.taxCode.trim() || undefined,
            ghiChu: form.note.trim() || undefined,
          });
        }
        await app.refreshSuppliers?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể lưu nhà cung cấp lên máy chủ.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const result = app.saveSupplier(form);
    if (!result.ok) return setError(result.message);
    onClose();
  };

  return <FormModal title={supplier ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"} description="Thông tin này được dùng để lập phiếu nhập và lưu snapshot khi xác nhận." onClose={onClose}>
    <form onSubmit={handleSubmit} className="grid gap-4 mt-5">
      <div className="responsive-two-column adm-grid-2">
        {/* Khóa ô mã NCC khi đang sửa ở chế độ API thật */}
        <label className="adm-label">Mã nhà cung cấp<input value={form.displayCode} disabled={!!supplier && (app.realApi || isRealApiEnabled())} onChange={(e) => set("displayCode", e.target.value)} placeholder="NCC001" className={`adm-field ${supplier && (app.realApi || isRealApiEnabled()) ? "adm-field--readonly" : ""}`} /></label>
        <label className="adm-label">Tên nhà cung cấp<input value={form.name} onChange={(e) => set("name", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Người liên hệ<input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Số điện thoại<input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Email<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Mã số thuế<input value={form.taxCode} onChange={(e) => set("taxCode", e.target.value)} className="adm-field" /></label>
        <label className="adm-label">Trạng thái<select value={form.cooperationStatus} onChange={(e) => set("cooperationStatus", e.target.value as Supplier["cooperationStatus"])} className="adm-field"><option value="active">Đang hợp tác</option><option value="inactive">Ngừng hợp tác</option></select></label>
      </div>
      <label className="adm-label">Địa chỉ<textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} className="adm-field" /></label>
      <label className="adm-label">Ghi chú<textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} className="adm-field" /></label>
      {error && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

