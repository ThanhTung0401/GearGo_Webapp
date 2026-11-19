import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { equipmentApi } from "../../../services/api";
import { fmt, MaintenanceReceipt } from "../../../store";

interface AcceptMaintenanceModalProps {
  app: ReturnType<typeof useApp>;
  acceptingMaintenance: MaintenanceReceipt;
  repairOutcome: "Hoàn tất" | "Không thể sửa";
  setRepairOutcome: (v: "Hoàn tất" | "Không thể sửa") => void;
  actualRepairCost: number;
  setActualRepairCost: (v: number) => void;
  repairOutcomeNote: string;
  setRepairOutcomeNote: (v: string) => void;
  setEquipBusy: (v: boolean) => void;
  setEquipError: (v: string | null) => void;
  setEquipSuccess: (v: string | null) => void;
  onClose: () => void;
}

// UC6.13: Modal nghiệm thu bảo trì (đạt chuẩn về kho Sẵn sàng hoặc chuyển Ngừng sử dụng)
export function AcceptMaintenanceModal({
  app,
  acceptingMaintenance,
  repairOutcome,
  setRepairOutcome,
  actualRepairCost,
  setActualRepairCost,
  repairOutcomeNote,
  setRepairOutcomeNote,
  setEquipBusy,
  setEquipError,
  setEquipSuccess,
  onClose,
}: AcceptMaintenanceModalProps) {
  // Xác nhận kết quả nghiệm thu bảo trì trên backend hoặc mock store
  const handleConfirmAccept = async () => {
    setEquipError(null);
    setEquipSuccess(null);

    if (app.realApi || isRealApiEnabled()) {
      setEquipBusy(true);
      try {
        const maintIdNum =
          Number(acceptingMaintenance.id) || parseInt(acceptingMaintenance.id.replace(/\D/g, ""), 10);
        if (!maintIdNum) {
          throw new Error("Không tìm thấy mã phiếu bảo trì hợp lệ.");
        }
        if (repairOutcome === "Hoàn tất") {
          await equipmentApi.xacNhanHoanThanh(maintIdNum, {
            ketQuaKiemTra: repairOutcomeNote || "Đạt chuẩn kỹ thuật",
            chiPhi: actualRepairCost,
            lyDo: repairOutcomeNote || "Nghiệm thu đạt chuẩn, đưa về kho Sẵn sàng",
          });
        } else {
          await equipmentApi.ketThucKhongDat(maintIdNum, {
            ketQuaKiemTra: repairOutcomeNote || "Không thể sửa",
            chiPhi: actualRepairCost,
            lyDo: repairOutcomeNote || "Hư hỏng nặng không thể phục hồi",
          });
        }
        await app.refreshEquipment?.();
        setEquipSuccess(`Đã nghiệm thu phiếu bảo trì ${acceptingMaintenance.id}.`);
        onClose();
      } catch (err) {
        setEquipError(err instanceof Error ? err.message : "Lỗi nghiệm thu phiếu bảo trì trên máy chủ.");
      } finally {
        setEquipBusy(false);
      }
      return;
    }

    app.updateMaintenanceStatus(
      acceptingMaintenance.id,
      repairOutcome,
      actualRepairCost,
      repairOutcomeNote
    );
    setEquipSuccess(`Đã nghiệm thu phiếu bảo trì ${acceptingMaintenance.id}.`);
    onClose();
  };

  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-480">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="so-modal-tag is-green">UC6.13: NGHIỆM THU BẢO TRÌ</span>
            <h3 className="so-modal-title-md">Nghiệm thu phiếu: {acceptingMaintenance.id}</h3>
          </div>
          <button type="button" onClick={onClose} className="so-modal-close-sm">✕</button>
        </div>

        <div className="so-info-box">
          <div>Thiết bị: <strong className="so-td-mono-plain">{acceptingMaintenance.equipmentId}</strong></div>
          <div>Lỗi ban đầu: <strong>{acceptingMaintenance.issueDescription}</strong></div>
          <div>Dự tính: <strong>{fmt(acceptingMaintenance.estimatedCost)}</strong></div>
        </div>

        <div className="so-field-group">
          <label className="so-field-label">Chi phí sửa chữa thực tế (đ):</label>
          <input
            type="number"
            value={actualRepairCost}
            onChange={(e) => setActualRepairCost(Number(e.target.value))}
            className="so-input-mono-bold"
          />
        </div>

        <div className="so-field-group-md">
          <label className="so-field-label-bold">Kết quả nghiệm thu:</label>
          <div className="flex flex-col gap-2">
            <label className="so-radio-label">
              <input
                type="radio"
                name="repairOutcome"
                checked={repairOutcome === "Hoàn tất"}
                onChange={() => setRepairOutcome("Hoàn tất")}
                className="so-radio-forest"
              />
              <span>✓ <strong>Đạt chuẩn</strong> — Thiết bị hoạt động tốt, đưa về kho <strong>Sẵn sàng</strong></span>
            </label>
            <label className="so-radio-label">
              <input
                type="radio"
                name="repairOutcome"
                checked={repairOutcome === "Không thể sửa"}
                onChange={() => setRepairOutcome("Không thể sửa")}
                className="so-radio-danger"
              />
              <span className="so-text-danger">✕ <strong>Không thể sửa</strong> — Hư hỏng nặng, chuyển sang <strong>Ngừng sử dụng</strong></span>
            </label>
          </div>
        </div>

        <div className="so-field-group-lg">
          <label className="so-field-label">Ghi chú nghiệm thu:</label>
          <input
            value={repairOutcomeNote}
            onChange={(e) => setRepairOutcomeNote(e.target.value)}
            className="so-input"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="so-btn-cancel-md">Hủy</button>
          <button
            type="button"
            onClick={() => void handleConfirmAccept()}
            /* Đổi màu nút xác nhận theo kết quả nghiệm thu (Đạt chuẩn vs Không thể sửa) */
            className={`so-btn-confirm-outcome ${repairOutcome === "Hoàn tất" ? "is-forest" : "is-danger"}`}
          >
            ✓ Xác nhận nghiệm thu
          </button>
        </div>
      </div>
    </div>
  );
}
