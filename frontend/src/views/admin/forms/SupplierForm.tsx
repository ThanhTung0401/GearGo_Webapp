import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { catalogApi, type HinhAnhSanPhamBackend } from "../../../services/api/catalogApi";
import { equipmentApi } from "../../../services/api/equipmentApi";
import { inventoryApi } from "../../../services/api/inventoryApi";
import { orderApi, type XemTruocHuyBackend } from "../../../services/api/orderApi";
import { warehouseApi, type PhanTichAnhHuongBackend } from "../../../services/api/warehouseApi";
import { supplierApi } from "../../../services/api/supplierApi";
import { importReceiptApi } from "../../../services/api/importReceiptApi";
import { promotionApi } from "../../../services/api/promotionApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { reportApi, type BaoCaoVanHanhBackend } from "../../../services/api/reportApi";
import { mapDieuChinhKhoToReceipt, mapEquipmentStatusToBackend } from "../../../services/mappers/catalogEquipmentMapper";
import {
  fmt, statusColors, type Category, type Product, type Supplier, type Promotion, type ImportReceipt,
  type StaffAccount, type StockAdjustmentReceipt, type StockAdjustmentLine, type EquipmentStatus, type Order,
  type Equipment, type Surcharge
} from "../../../store";
import Icon from "../../../components/Icon";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../components/ImportAdjustmentModal";
import PromotionDetailModal from "../../../components/PromotionDetailModal";
import { FormModal, FormActions, fieldStyle, labelStyle } from "./FormModal";

export function toDatetimeLocalInput(val?: string): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SupplierForm({ app, supplier, onClose }: { app: ReturnType<typeof useApp>; supplier?: Supplier; onClose: () => void }) {
  const [form, setForm] = useState<Supplier>(supplier ?? { id: "", displayCode: "", name: "", contactPerson: "", phone: "", email: "", address: "", taxCode: "", note: "", cooperationStatus: "active" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof Supplier>(key: K, value: Supplier[K]) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Tên nhà cung cấp không được để trống.");

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
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Mã nhà cung cấp<input value={form.displayCode} disabled={!!supplier && (app.realApi || isRealApiEnabled())} onChange={(e) => set("displayCode", e.target.value)} placeholder="NCC001" style={{ ...fieldStyle, background: supplier && (app.realApi || isRealApiEnabled()) ? "var(--color-parchment)" : "white" }} /></label>
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
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

