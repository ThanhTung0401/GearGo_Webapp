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

export function ImportReceiptForm({ app, receipt, onClose }: { app: ReturnType<typeof useApp>; receipt?: ImportReceipt; onClose: () => void }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const initialSupplier = app.suppliers.find((item) => item.cooperationStatus === "active");
  const [form, setForm] = useState<ImportReceipt>(() =>
    receipt
      ? { ...receipt, expectedAt: receipt.expectedAt ? receipt.expectedAt.slice(0, 10) : "" }
      : {
          id: "",
          displayCode: `PN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-3)}`,
          supplierId: initialSupplier?.id ?? "",
          supplierName: initialSupplier?.name ?? "",
          supplierDocumentNumber: "",
          expectedAt: "",
          note: "",
          status: "Nháp",
          createdAt: new Date().toLocaleString("vi-VN"),
          createdBy: app.currentUser?.name ?? "Nhân viên kho",
          lines: [{ id: "", productId: app.products[0]?.id ?? "", quantity: 1, unitPrice: 0, equipmentCodes: [""], receivingCondition: "Mới", note: "" }],
        }
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const updateLine = (index: number, patch: Partial<ImportReceipt["lines"][number]>) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) }));
  const setQuantity = (index: number, quantity: number) => {
    const line = form.lines[index];
    const codes = Array.from({ length: Math.max(0, quantity) }, (_, codeIndex) => line.equipmentCodes[codeIndex] ?? "");
    updateLine(index, { quantity, equipmentCodes: codes });
  };
  const total = form.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (isRealApi) {
      const supplierIdNum = Number(form.supplierId);
      if (!form.supplierId || Number.isNaN(supplierIdNum)) {
        return setError("Vui lòng chọn nhà cung cấp hợp lệ.");
      }
      if (form.lines.length === 0) {
        return setError("Phiếu nhập phải có ít nhất 1 dòng sản phẩm.");
      }
      for (const line of form.lines) {
        if (!line.productId || Number.isNaN(Number(line.productId))) {
          return setError("Mỗi dòng nhập phải chọn sản phẩm hợp lệ.");
        }
        if (Number(line.quantity) < 1 || Number(line.unitPrice) < 0) {
          return setError("Số lượng phải >= 1 và đơn giá nhập không được âm.");
        }
      }

      setLoading(true);
      try {
        const expectedIso = form.expectedAt ? new Date(`${form.expectedAt}T00:00:00Z`).toISOString() : undefined;
        if (receipt) {
          const receiptId = Number(receipt.id);
          if (Number.isNaN(receiptId)) {
            setError("ID phiếu nhập không hợp lệ.");
            return;
          }
          await importReceiptApi.capNhatPhieu(receiptId, {
            maNhaCungCap: supplierIdNum,
            ngayNhapDuKien: expectedIso,
            soChungTuNhaCungCap: form.supplierDocumentNumber?.trim() || undefined,
            ghiChu: form.note?.trim() || undefined,
          });
          // Đồng bộ các dòng chi tiết: xóa dòng bỏ, cập nhật dòng cũ, thêm dòng mới
          const oldIds = new Set(receipt.lines.map((l) => l.id ?? "").filter((id) => /^\d+$/.test(id)));
          const keptIds = new Set(form.lines.map((l) => l.id ?? "").filter((id) => /^\d+$/.test(id)));
          for (const oldId of oldIds) {
            if (!keptIds.has(oldId)) {
              await importReceiptApi.xoaDong(receiptId, Number(oldId));
            }
          }
          for (const line of form.lines) {
            const dongReq = {
              maSanPham: Number(line.productId),
              soLuong: Number(line.quantity),
              donGiaNhap: Number(line.unitPrice),
              tinhTrangKhiNhap: line.receivingCondition?.trim() || "Mới",
              ghiChu: line.note?.trim() || undefined,
            };
            const lineIdStr = line.id ?? "";
            if (/^\d+$/.test(lineIdStr)) {
              await importReceiptApi.suaDong(receiptId, Number(lineIdStr), dongReq);
            } else {
              await importReceiptApi.themDong(receiptId, dongReq);
            }
          }
        } else {
          const created = await importReceiptApi.taoPhieu({
            maNhaCungCap: supplierIdNum,
            ngayNhapDuKien: expectedIso,
            soChungTuNhaCungCap: form.supplierDocumentNumber?.trim() || undefined,
            ghiChu: form.note?.trim() || undefined,
          });
          for (const line of form.lines) {
            await importReceiptApi.themDong(created.maPhieuNhap, {
              maSanPham: Number(line.productId),
              soLuong: Number(line.quantity),
              donGiaNhap: Number(line.unitPrice),
              tinhTrangKhiNhap: line.receivingCondition?.trim() || "Mới",
              ghiChu: line.note?.trim() || undefined,
            });
          }
        }
        await app.refreshImportReceipts?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể lưu phiếu nhập lên máy chủ.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const supplier = app.suppliers.find((item) => item.id === form.supplierId);
    const normalized = { ...form, supplierName: supplier?.name ?? "", lines: form.lines.map((line) => ({ ...line, id: line.id || `LINE-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, equipmentCodes: line.equipmentCodes.map((code) => code.trim().toUpperCase()) })) };
    const result = app.saveImportReceipt(normalized);
    if (!result.ok) return setError(result.message);
    onClose();
  };

  return <FormModal title={receipt ? "Sửa phiếu nhập nháp" : "Tạo phiếu nhập nháp"} description="Lưu nháp không tăng kho. Chỉ khi xác nhận hợp lệ, hệ thống mới tạo thiết bị." onClose={onClose}>
    <form onSubmit={handleSubmit} className="grid gap-4 mt-5">
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Mã phiếu nhập<input value={isRealApi && !receipt ? "(Tự sinh khi lưu)" : (form.displayCode ?? form.id)} disabled={isRealApi} onChange={(e) => setForm({ ...form, displayCode: e.target.value })} style={{ ...fieldStyle, background: isRealApi ? "var(--color-parchment)" : "white" }} /></label>
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
        {isRealApi ? (
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#4B5563" }}>
            Mã định danh thiết bị sẽ được máy chủ tự động cấp phát cho {line.quantity} đơn vị khi xác nhận nhập kho.
          </div>
        ) : (
          <label style={{ ...labelStyle, marginTop: 10 }}>Mã thiết bị ({line.equipmentCodes.length}/{line.quantity})<div className="flex flex-wrap gap-2">{line.equipmentCodes.map((code, codeIndex) => <input key={codeIndex} value={code} onChange={(e) => updateLine(index, { equipmentCodes: line.equipmentCodes.map((item, itemIndex) => itemIndex === codeIndex ? e.target.value : item) })} placeholder={`Mã ${codeIndex + 1}`} style={{ ...fieldStyle, width: 120 }} />)}</div></label>
        )}
        <div className="responsive-two-column grid gap-3 mt-3" style={{ gridTemplateColumns: "1fr 2fr" }}><label style={labelStyle}>Tình trạng khi nhập<input value={line.receivingCondition ?? ""} onChange={(e) => updateLine(index, { receivingCondition: e.target.value })} style={fieldStyle} /></label><label style={labelStyle}>Ghi chú dòng<input value={line.note ?? ""} onChange={(e) => updateLine(index, { note: e.target.value })} style={fieldStyle} /></label></div>
        <div className="flex justify-between items-center mt-3"><span style={{ fontSize: "0.8rem" }}>Thành tiền: <strong>{fmt(line.quantity * line.unitPrice)}</strong></span>{form.lines.length > 1 && <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) })} style={{ border: 0, background: "transparent", color: "#B91C1C", cursor: "pointer" }}>Xóa dòng</button>}</div>
      </div>)}
      <div className="flex justify-between" style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 13, fontWeight: 800 }}><span>Tổng phiếu nhập</span><span>{fmt(total)}</span></div>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

