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

export function EquipmentForm({ app, equipment, onClose }: { app: ReturnType<typeof useApp>; equipment: ReturnType<typeof useApp>["equipment"][number]; onClose: () => void }) {
  const [form, setForm] = useState(equipment);
  const [accessories, setAccessories] = useState((equipment.includedAccessories ?? []).join(", "));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const product = app.products.find((item) => item.id === form.productId);
  const sourceReceipt = app.importReceipts.find((item) => item.id === form.importReceiptId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (app.realApi || isRealApiEnabled()) {
      const equipId = Number(equipment.id);
      if (Number.isNaN(equipId)) {
        return setError("ID thiết bị không hợp lệ.");
      }
      if (form.equipmentStatus === "Đang thuê" && equipment.equipmentStatus !== "Đang thuê") {
        return setError("Không thể chuyển trực tiếp sang trạng thái 'Đang thuê'; trạng thái này chỉ cập nhật qua luồng bàn giao đơn.");
      }

      setLoading(true);
      try {
        // Mọi thay đổi tình trạng/trạng thái ở Real API đều phải đi qua Bảo trì, Đề nghị ngừng sử dụng (UC6.14) hoặc Điều chỉnh kho
        if (form.equipmentStatus === "Đang bảo trì" && equipment.equipmentStatus !== "Đang bảo trì") {
          await equipmentApi.lapPhieuBaoTri({
            maThietBi: equipId,
            loaiXuLy: "SuaChua",
            moTaLoi: form.note?.trim() || form.condition?.trim() || "Chuyển bảo trì từ quản lý thiết bị",
          });
        } else if (form.equipmentStatus === "Ngừng sử dụng" && equipment.equipmentStatus !== "Ngừng sử dụng") {
          await equipmentApi.deNghiNgungSuDung(equipId, {
            lyDo: form.note?.trim() || form.condition?.trim() || "Ngừng sử dụng thiết bị từ quản lý thiết bị",
            tinhTrangMoi: form.condition?.trim() || undefined,
          });
        } else {
          const created = await inventoryApi.lapPhieu({
            loaiDieuChinh: "KiemKeSaiLech",
            lyDo: form.note?.trim() || `Cập nhật hồ sơ thiết bị (${form.equipmentStatus})`,
            chiTiet: [
              {
                maThietBi: equipId,
                giaTriDeNghiSau: {
                  trangThaiSuDung: mapEquipmentStatusToBackend(form.equipmentStatus),
                  tinhTrang: form.condition.trim() || undefined,
                },
                ghiChu: form.note?.trim() || (accessories.trim() ? `Phụ kiện: ${accessories.trim()}` : undefined),
              },
            ],
          });
          await inventoryApi.guiDuyet(created.maPhieuDieuChinh);
          await inventoryApi.duyetVaApDung(created.maPhieuDieuChinh);
        }
        await app.refreshEquipment?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái thiết bị lên máy chủ.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const result = app.saveEquipment({ ...form, includedAccessories: accessories.split(",").map((item) => item.trim()).filter(Boolean) });
    if (!result.ok) return setError(result.message);
    onClose();
  };

  return <FormModal title={`Cập nhật thiết bị ${equipment.displayCode ?? equipment.id}`} description="Nguồn nhập và giá nhập được khóa; chỉ tình trạng vận hành, phụ kiện và ghi chú được cập nhật." onClose={onClose}>
    <form onSubmit={handleSubmit} className="grid gap-4 mt-5">
      <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.8rem" }}><strong>{product?.name}</strong><br />Nguồn nhập: {sourceReceipt?.displayCode ?? form.importReceiptId} / {form.importReceiptLineId ?? "chưa có mã dòng"} · Giá nhập: {fmt(form.importPrice)} · Ngày nhập: {form.importDate}</div>
      <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label style={labelStyle}>Tình trạng<input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} style={fieldStyle} /></label>
        <label style={labelStyle}>Trạng thái sử dụng<select value={form.equipmentStatus} onChange={(e) => setForm({ ...form, equipmentStatus: e.target.value as typeof form.equipmentStatus })} style={fieldStyle}>{["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label style={labelStyle}>Phụ kiện đi kèm<input value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder="Túi đựng, cọc, dây chằng" style={fieldStyle} /></label>
      <label style={labelStyle}>Ghi chú<textarea rows={3} value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} style={fieldStyle} /></label>
      {error && <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8 }}>{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

