import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { equipmentApi } from "../../../services/api";

interface CreateMaintenanceModalProps {
  app: ReturnType<typeof useApp>;
  createMaintEquipId: string;
  setCreateMaintEquipId: (v: string) => void;
  createMaintIssue: string;
  setCreateMaintIssue: (v: string) => void;
  createMaintCost: number;
  setCreateMaintCost: (v: number) => void;
  createMaintOrderId: string;
  setCreateMaintOrderId: (v: string) => void;
  createMaintNote: string;
  setCreateMaintNote: (v: string) => void;
  setEquipBusy: (v: boolean) => void;
  setEquipError: (v: string | null) => void;
  setEquipSuccess: (v: string | null) => void;
  onClose: () => void;
}

// UC6.12: Modal lập phiếu bảo trì / sửa chữa thiết bị mới
export function CreateMaintenanceModal({
  app,
  createMaintEquipId,
  setCreateMaintEquipId,
  createMaintIssue,
  setCreateMaintIssue,
  createMaintCost,
  setCreateMaintCost,
  createMaintOrderId,
  setCreateMaintOrderId,
  createMaintNote,
  setCreateMaintNote,
  setEquipBusy,
  setEquipError,
  setEquipSuccess,
  onClose,
}: CreateMaintenanceModalProps) {
  // Gửi tạo phiếu bảo trì lên máy chủ hoặc lưu vào mock store
  const handleCreate = async () => {
    const selectedEquip = app.equipment.find((eq) => eq.id === createMaintEquipId);
    const now = new Date().toLocaleString("vi-VN");
    setEquipError(null);
    setEquipSuccess(null);

    if (app.realApi || isRealApiEnabled()) {
      setEquipBusy(true);
      try {
        const equipIdNum =
          Number(selectedEquip?.id ?? createMaintEquipId) || parseInt(createMaintEquipId.replace(/\D/g, ""), 10);
        const orderIdNum =
          createMaintOrderId && !isNaN(Number(createMaintOrderId)) ? Number(createMaintOrderId) : undefined;
        if (!equipIdNum) {
          throw new Error("Không xác định được mã thiết bị hợp lệ.");
        }
        const moTaDayDu = createMaintNote.trim()
          ? `${createMaintIssue.trim()} (${createMaintNote.trim()})`
          : createMaintIssue.trim();
        const res = await equipmentApi.lapPhieuBaoTri({
          maThietBi: equipIdNum,
          maDonThue: orderIdNum,
          loaiXuLy: "SuaChua",
          moTaLoi: moTaDayDu,
          mucDo: "Nhe",
        });
        await app.refreshEquipment?.();
        setEquipSuccess(
          `Đã tạo phiếu bảo trì ${res?.maPhieuBaoTri ? `BT-${res.maPhieuBaoTri}` : ""} trên máy chủ.`
        );
        setCreateMaintIssue("");
        setCreateMaintNote("");
        onClose();
      } catch (err) {
        setEquipError(err instanceof Error ? err.message : "Lỗi lập phiếu bảo trì trên máy chủ.");
      } finally {
        setEquipBusy(false);
      }
      return;
    }

    app.saveMaintenanceReceipt({
      id: `BT-${Date.now().toString().slice(-6)}`,
      equipmentId: createMaintEquipId,
      issueDescription: createMaintIssue.trim(),
      estimatedCost: createMaintCost,
      orderId: createMaintOrderId.trim() || undefined,
      createdAt: now,
      status: "Đang bảo dưỡng",
      note: createMaintNote.trim(),
    });
    setEquipSuccess("Đã tạo phiếu bảo trì.");
    setCreateMaintIssue("");
    setCreateMaintNote("");
    onClose();
  };

  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-500">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="so-modal-tag is-amber">UC6.12: TẠO PHIẾU BẢO TRÌ</span>
            <h3 className="so-modal-title-md">Lập phiếu sửa chữa thiết bị</h3>
          </div>
          <button type="button" onClick={onClose} className="so-modal-close-sm">✕</button>
        </div>

        <div className="so-field-group">
          <label className="so-field-label">Thiết bị cần bảo trì:</label>
          <select
            value={createMaintEquipId}
            onChange={(e) => setCreateMaintEquipId(e.target.value)}
            className="so-input"
          >
            {app.equipment
              .filter((e) => e.equipmentStatus !== "Ngừng sử dụng")
              .map((e) => {
                const p = app.products.find((prod) => prod.id === e.productId);
                return (
                  <option key={e.id} value={e.id}>
                    {e.displayCode || e.id} - {p?.name} (Hiện tại: {e.equipmentStatus})
                  </option>
                );
              })}
          </select>
        </div>

        <div className="so-field-group">
          <label className="so-field-label">Mô tả lỗi / Hư hỏng chi tiết:</label>
          <textarea
            rows={3}
            placeholder="Ví dụ: Rách đường chỉ may bạt nóc 10cm, chốt khoá bị kẹt..."
            value={createMaintIssue}
            onChange={(e) => setCreateMaintIssue(e.target.value)}
            className="so-textarea-v"
          />
        </div>

        <div className="so-modal-grid-2">
          <div>
            <label className="so-field-label">Chi phí dự tính (đ):</label>
            <input
              type="number"
              value={createMaintCost}
              onChange={(e) => setCreateMaintCost(Number(e.target.value))}
              className="so-input-mono"
            />
          </div>
          <div>
            <label className="so-field-label">Đơn liên quan (nếu có):</label>
            <input
              placeholder="Ví dụ: ORD-001"
              value={createMaintOrderId}
              onChange={(e) => setCreateMaintOrderId(e.target.value)}
              className="so-input-mono"
            />
          </div>
        </div>

        <div className="so-field-group-lg">
          <label className="so-field-label">Ghi chú điều phối:</label>
          <input
            placeholder="Ví dụ: Gửi sang xưởng sửa chữa lều Q8..."
            value={createMaintNote}
            onChange={(e) => setCreateMaintNote(e.target.value)}
            className="so-input"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="so-btn-cancel-md">Hủy</button>
          <button
            type="button"
            disabled={!createMaintEquipId || !createMaintIssue.trim()}
            onClick={() => void handleCreate()}
            className="so-btn-primary-md"
          >
            ✓ Tạo phiếu bảo trì
          </button>
        </div>
      </div>
    </div>
  );
}
