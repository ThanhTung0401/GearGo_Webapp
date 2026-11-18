import { useApp } from "../../../../context/AppContext";
import { isRealApiEnabled } from "../../../../services/apiClient";
import { fmt, MaintenanceReceipt } from "../../../../store";

interface MaintenanceSubTabProps {
  app: ReturnType<typeof useApp>;
  equipBusy: boolean;
  onOpenCreateModal: () => void;
  onOpenAssignModal: (m: MaintenanceReceipt) => void;
  onOpenProgressModal: (m: MaintenanceReceipt) => void;
  onSendCheck: (m: MaintenanceReceipt) => Promise<void>;
  onOpenAcceptModal: (m: MaintenanceReceipt) => void;
}

// Sub-tab Quản lý phiếu bảo trì, phân công kỹ thuật và nghiệm thu (UC6.12 & UC6.13)
export function MaintenanceSubTab({
  app,
  equipBusy,
  onOpenCreateModal,
  onOpenAssignModal,
  onOpenProgressModal,
  onSendCheck,
  onOpenAcceptModal,
}: MaintenanceSubTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="so-section-title">
            Hồ sơ bảo trì & sửa chữa thiết bị
          </h3>
          <p className="so-section-sub">
            Ghi nhận các thiết bị hư hỏng, ước tính kinh phí và nghiệm thu đưa về kho Sẵn sàng.
          </p>
        </div>
        <button type="button" onClick={onOpenCreateModal} className="so-btn-primary">
          + Tạo phiếu bảo trì (UC6.12)
        </button>
      </div>

      <div className="responsive-table so-table-card">
        <table className="so-table so-zebra-table">
          <thead>
            <tr>
              {["Mã phiếu", "Mã thiết bị", "Mô tả lỗi / Hư hỏng", "Đơn liên quan", "Ngày tạo", "Dự tính", "Thực tế", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {app.maintenanceReceipts.map((m) => {
              const matchedEquip = app.equipment.find(
                (eq) => eq.id === m.equipmentId || eq.displayCode === m.equipmentId
              );
              const equipDisplay = matchedEquip?.displayCode || m.equipmentId;
              /* Ánh xạ trạng thái phiếu bảo trì sang modifier CSS hữu hạn */
              const maintStatusMod =
                m.status === "Hoàn tất"
                  ? "is-done"
                  : m.status === "Đang bảo dưỡng"
                  ? "is-progress"
                  : m.status === "Không thể sửa"
                  ? "is-unfixable"
                  : "is-pending";
              return (
                <tr key={m.id}>
                  <td className="so-td-mono-md">{m.id}</td>
                  <td className="so-td-mono-dark">{equipDisplay}</td>
                  <td>
                    <div>{m.issueDescription}</div>
                    {m.note && <div className="so-maint-note">{m.note}</div>}
                  </td>
                  <td className="so-td-mono-gray">{m.orderId || "—"}</td>
                  <td className="so-td-muted-sm">{m.createdAt}</td>
                  <td className="so-td-cost">{fmt(m.estimatedCost)}</td>
                  <td className={`so-td-actual-cost ${m.actualCost ? "has-cost" : ""}`}>
                    {m.actualCost !== undefined ? fmt(m.actualCost) : "—"}
                  </td>
                  <td>
                    <span className={`so-status-badge ${maintStatusMod}`}>{m.status}</span>
                  </td>
                  <td>
                    {m.status !== "Hoàn tất" && m.status !== "Không thể sửa" ? (
                      <div className="flex gap-1 flex-wrap">
                        {(app.realApi || isRealApiEnabled()) && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenAssignModal(m)}
                              className="so-btn-info-pad"
                            >
                              Phân công
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenProgressModal(m)}
                              className="so-btn-amber-pill"
                            >
                              Tiến độ
                            </button>
                            <button
                              type="button"
                              disabled={equipBusy}
                              onClick={() => void onSendCheck(m)}
                              className="so-btn-purple-sm"
                            >
                              Gửi KT
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenAcceptModal(m)}
                          className="so-btn-primary-sm"
                        >
                          Nghiệm thu →
                        </button>
                      </div>
                    ) : (
                      <span className="so-muted-sm">Đã chốt</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
