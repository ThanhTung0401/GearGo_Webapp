import { useApp } from "../../../context/AppContext";
import { equipmentApi } from "../../../services/api";
import { MaintenanceReceipt } from "../../../store";

interface MaintenanceActionModalsProps {
  app: ReturnType<typeof useApp>;
  equipBusy: boolean;
  setEquipBusy: (v: boolean) => void;
  setEquipError: (v: string | null) => void;
  setEquipSuccess: (v: string | null) => void;
  assignMaintTarget: MaintenanceReceipt | null;
  setAssignMaintTarget: (v: MaintenanceReceipt | null) => void;
  assignHandlerId: number;
  setAssignHandlerId: (v: number) => void;
  assignReason: string;
  setAssignReason: (v: string) => void;
  progressMaintTarget: MaintenanceReceipt | null;
  setProgressMaintTarget: (v: MaintenanceReceipt | null) => void;
  progressCost: number;
  setProgressCost: (v: number) => void;
  progressNote: string;
  setProgressNote: (v: string) => void;
}

// UC6.12: Hai modal thao tác bảo trì (Phân công kỹ thuật viên & Cập nhật tiến độ sửa chữa)
export function MaintenanceActionModals({
  app,
  equipBusy,
  setEquipBusy,
  setEquipError,
  setEquipSuccess,
  assignMaintTarget,
  setAssignMaintTarget,
  assignHandlerId,
  setAssignHandlerId,
  assignReason,
  setAssignReason,
  progressMaintTarget,
  setProgressMaintTarget,
  progressCost,
  setProgressCost,
  progressNote,
  setProgressNote,
}: MaintenanceActionModalsProps) {
  return (
    <>
      {/* UC6.12: Modal Phân công xử lý bảo trì */}
      {assignMaintTarget && (
        <div className="so-modal-overlay">
          <div className="so-modal-card-440">
            <h3 className="so-modal-title-10">Phân công xử lý phiếu {assignMaintTarget.id}</h3>
            <label className="so-field-label">Nhân viên phụ trách xử lý:</label>
            {app.staffAccounts.length > 0 ? (
              <select
                value={assignHandlerId}
                onChange={(e) => setAssignHandlerId(Number(e.target.value))}
                className="so-input-mb10"
              >
                {app.staffAccounts
                  .filter((s) => s.status !== "locked")
                  .map((s) => {
                    const numId = Number(s.id) || parseInt(s.id.replace(/\D/g, ""), 10);
                    return (
                      <option key={s.id} value={numId || 1}>
                        {s.name} ({s.role}) — #{s.id}
                      </option>
                    );
                  })}
              </select>
            ) : (
              <input
                type="number"
                min={1}
                value={assignHandlerId}
                onChange={(e) => setAssignHandlerId(Number(e.target.value))}
                className="so-input-mb10"
              />
            )}
            <label className="so-field-label">Ghi chú / Lý do:</label>
            <input
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="Giao kỹ thuật viên kiểm tra..."
              className="so-input-mb14-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignMaintTarget(null)} className="so-btn-cancel-modal">
                Hủy
              </button>
              <button
                type="button"
                disabled={equipBusy}
                onClick={async () => {
                  setEquipBusy(true);
                  setEquipError(null);
                  try {
                    const maintIdNum =
                      Number(assignMaintTarget.id) || parseInt(assignMaintTarget.id.replace(/\D/g, ""), 10);
                    await equipmentApi.phanCongXuLy(maintIdNum, {
                      maNguoiXuLy: assignHandlerId,
                      lyDo: assignReason.trim() || undefined,
                    });
                    await app.refreshEquipment?.();
                    setEquipSuccess(`Đã phân công xử lý phiếu ${assignMaintTarget.id}.`);
                    setAssignMaintTarget(null);
                  } catch (err) {
                    setEquipError(err instanceof Error ? err.message : "Không thể phân công xử lý.");
                  } finally {
                    setEquipBusy(false);
                  }
                }}
                className="so-btn-primary-modal"
              >
                {equipBusy ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC6.12: Modal Cập nhật tiến độ bảo trì */}
      {progressMaintTarget && (
        <div className="so-modal-overlay">
          <div className="so-modal-card-440">
            <h3 className="so-modal-title-10">Cập nhật tiến độ phiếu {progressMaintTarget.id}</h3>
            <label className="so-field-label">Kết quả / Tiến độ xử lý:</label>
            <textarea
              rows={3}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="Đã thay khóa kéo và vệ sinh..."
              className="so-input-mb10"
            />
            <label className="so-field-label">Chi phí phát sinh (đ):</label>
            <input
              type="number"
              min={0}
              value={progressCost}
              onChange={(e) => setProgressCost(Number(e.target.value))}
              className="so-input-mb14-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setProgressMaintTarget(null)} className="so-btn-cancel-modal">
                Hủy
              </button>
              <button
                type="button"
                disabled={equipBusy}
                onClick={async () => {
                  setEquipBusy(true);
                  setEquipError(null);
                  try {
                    const maintIdNum =
                      Number(progressMaintTarget.id) || parseInt(progressMaintTarget.id.replace(/\D/g, ""), 10);
                    await equipmentApi.capNhatTienDo(maintIdNum, {
                      ketQua: progressNote.trim() || undefined,
                      chiPhi: progressCost,
                    });
                    await app.refreshEquipment?.();
                    setEquipSuccess(`Đã cập nhật tiến độ phiếu ${progressMaintTarget.id}.`);
                    setProgressMaintTarget(null);
                  } catch (err) {
                    setEquipError(err instanceof Error ? err.message : "Không thể cập nhật tiến độ.");
                  } finally {
                    setEquipBusy(false);
                  }
                }}
                className="so-btn-amber-modal"
              >
                {equipBusy ? "Đang lưu..." : "Lưu tiến độ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
