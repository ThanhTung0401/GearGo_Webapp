import { useEffect, useMemo, useState } from "react";
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
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // FN6-01: chỉ cho chọn thiết bị "Sẵn sàng" và không đang vướng phiếu bảo trì mở
  const openMaintEquipIds = useMemo(() => {
    const openStatuses = new Set(["Mới tạo", "Đang xử lý", "Đã phân công", "Đã gửi kiểm tra"]);
    return new Set(
      app.maintenanceReceipts
        .filter((m) => openStatuses.has(m.status))
        .map((m) => m.equipmentId)
    );
  }, [app.maintenanceReceipts]);

  const eligibleEquip = useMemo(
    () => app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng" && !openMaintEquipIds.has(e.id)),
    [app.equipment, openMaintEquipIds]
  );

  // FN6-01: auto-select thiết bị hợp lệ đầu tiên khi danh sách load xong
  useEffect(() => {
    if (!createMaintEquipId && eligibleEquip.length > 0) {
      setCreateMaintEquipId(eligibleEquip[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleEquip.length]);

  // Gửi tạo phiếu bảo trì lên máy chủ hoặc lưu vào mock store
  const handleCreate = async () => {
    if (submitting) return;
    const selectedEquip = app.equipment.find((eq) => eq.id === createMaintEquipId);
    const now = new Date().toLocaleString("vi-VN");
    setEquipError(null);
    setEquipSuccess(null);
    setLocalError(null);

    // FN6-01: validate thiết bị hợp lệ trước khi gọi API
    if (!selectedEquip) {
      setLocalError("Vui lòng chọn thiết bị cần bảo trì.");
      return;
    }
    if (selectedEquip.equipmentStatus !== "Sẵn sàng") {
      setLocalError(`Thiết bị ${selectedEquip.displayCode || selectedEquip.id} đang ${selectedEquip.equipmentStatus}, không thể lập phiếu bảo trì mới.`);
      return;
    }
    if (openMaintEquipIds.has(selectedEquip.id)) {
      setLocalError(`Thiết bị ${selectedEquip.displayCode || selectedEquip.id} đã có phiếu bảo trì đang xử lý.`);
      return;
    }

    if (app.realApi || isRealApiEnabled()) {
      setSubmitting(true);
      setEquipBusy(true);
      try {
        const equipIdNum =
          Number(selectedEquip?.id ?? createMaintEquipId) || parseInt(createMaintEquipId.replace(/\D/g, ""), 10);
        // Hỗ trợ tìm mã đơn hiển thị (ORD-..., DT-...) hoặc ID số trực tiếp
        const trimmedOrder = createMaintOrderId.trim();
        const matchedOrder = trimmedOrder
          ? app.orders.find(
              (o) =>
                o.id === trimmedOrder ||
                (o.displayCode || "").toLowerCase() === trimmedOrder.toLowerCase()
            )
          : undefined;
        const orderIdNum = matchedOrder
          ? Number(matchedOrder.backendId ?? matchedOrder.id)
          : trimmedOrder && !isNaN(Number(trimmedOrder))
            ? Number(trimmedOrder)
            : undefined;
        if (!equipIdNum) {
          throw new Error("Không xác định được mã thiết bị hợp lệ.");
        }
        const moTaDayDu = createMaintNote.trim()
          ? `${createMaintIssue.trim()} (${createMaintNote.trim()})`
          : createMaintIssue.trim();
        // FN6-07: truyền ChiPhi dự tính lên backend
        const res = await equipmentApi.lapPhieuBaoTri({
          maThietBi: equipIdNum,
          maDonThue: orderIdNum,
          loaiXuLy: "SuaChua",
          moTaLoi: moTaDayDu,
          mucDo: "Nhe",
          chiPhiUocTinh: createMaintCost > 0 ? createMaintCost : undefined,
        });
        await app.refreshEquipment?.();
        setEquipSuccess(
          `Đã tạo phiếu bảo trì ${res?.maPhieuBaoTri ? `BT-${res.maPhieuBaoTri}` : ""} trên máy chủ.`
        );
        setCreateMaintIssue("");
        setCreateMaintNote("");
        onClose();
      } catch (err) {
        // FN6-01: hiển thị lỗi trong modal thay vì alert banner toàn cục
        setLocalError(err instanceof Error ? err.message : "Lỗi lập phiếu bảo trì trên máy chủ.");
      } finally {
        setSubmitting(false);
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

        {/* FN6-01: thông báo lỗi cục bộ của modal */}
        {localError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError}
          </div>
        )}

        <div className="so-field-group">
          <label className="so-field-label">Thiết bị cần bảo trì:</label>
          {eligibleEquip.length === 0 ? (
            <div className="text-sm text-gray-600 italic">
              Không có thiết bị ở trạng thái "Sẵn sàng" để lập phiếu bảo trì.
            </div>
          ) : (
            <select
              value={createMaintEquipId}
              onChange={(e) => setCreateMaintEquipId(e.target.value)}
              className="so-input"
            >
              {/* FN6-01: chỉ liệt kê thiết bị Sẵn sàng và không bị vướng phiếu bảo trì mở */}
              {eligibleEquip.map((e) => {
                const p = app.products.find((prod) => prod.id === e.productId);
                return (
                  <option key={e.id} value={e.id}>
                    {e.displayCode || e.id} - {p?.name} (Hiện tại: {e.equipmentStatus})
                  </option>
                );
              })}
            </select>
          )}
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
              min={0}
              step={1000}
              value={createMaintCost}
              onChange={(e) => setCreateMaintCost(Math.max(0, Number(e.target.value) || 0))}
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
            disabled={submitting || !createMaintEquipId || !createMaintIssue.trim() || eligibleEquip.length === 0}
            onClick={() => void handleCreate()}
            className="so-btn-primary-md"
          >
            {submitting ? "Đang tạo..." : "✓ Tạo phiếu bảo trì"}
          </button>
        </div>
      </div>
    </div>
  );
}
