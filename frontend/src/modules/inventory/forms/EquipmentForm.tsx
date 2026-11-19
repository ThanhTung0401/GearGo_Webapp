import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { equipmentApi } from "../../../services/api/equipmentApi";
import { inventoryApi } from "../../../services/api/inventoryApi";

import { mapEquipmentStatusToBackend } from "../../../services/mappers/catalogEquipmentMapper";
import { fmt } from "../../../store";

import { FormModal, FormActions } from "./FormModal";

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
      <div className="adm-card--parchment text-xs"><strong>{product?.name}</strong><br />Nguồn nhập: {sourceReceipt?.displayCode ?? form.importReceiptId} / {form.importReceiptLineId ?? "chưa có mã dòng"} · Giá nhập: {fmt(form.importPrice)} · Ngày nhập: {form.importDate}</div>
      <div className="responsive-two-column adm-grid-2">
        <label className="adm-label">Tình trạng<input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="adm-field" /></label>
        <label className="adm-label">Trạng thái sử dụng<select value={form.equipmentStatus} onChange={(e) => setForm({ ...form, equipmentStatus: e.target.value as typeof form.equipmentStatus })} className="adm-field">{["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="adm-label">Phụ kiện đi kèm<input value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder="Túi đựng, cọc, dây chằng" className="adm-field" /></label>
      <label className="adm-label">Ghi chú<textarea rows={3} value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} className="adm-field" /></label>
      {error && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

