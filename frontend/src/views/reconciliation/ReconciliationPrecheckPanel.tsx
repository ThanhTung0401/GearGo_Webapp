import type { XemTruocDoiSoatBackend } from "../../services/api";
import { fmt, type AssignedEquipment, type Surcharge } from "../../store";

interface ReconciliationPrecheckPanelProps {
  realApi: boolean;
  previewBackend: XemTruocDoiSoatBackend | null;
  isBlocked: boolean;
  isOrderCompleted: boolean;
  debtEquipment: AssignedEquipment[];
  pendingSurcharges: Surcharge[];
  disputedSurcharges: Surcharge[];
  reconBusy: boolean;
  onApproveSurcharge: (ps: Surcharge) => void;
  onRejectSurcharge: (ps: Surcharge) => void;
}

/**
 * Thanh tiến trình 3 bước UC5.4 và khối kiểm tra tiền điều kiện (Dòng sự kiện phụ 1.1).
 */
export function ReconciliationPrecheckPanel({
  realApi,
  previewBackend,
  isBlocked,
  isOrderCompleted,
  debtEquipment,
  pendingSurcharges,
  disputedSurcharges,
  reconBusy,
  onApproveSurcharge,
  onRejectSurcharge,
}: ReconciliationPrecheckPanelProps) {
  return (
    <>
      {/* ─── Thanh tiến trình 3 bước UC5.4 ─────────────────────────────────── */}
      <div className="reconcile-step-flow recon-step-flow">
        <div className={`reconcile-step-item ${isBlocked ? "active" : "completed"}`}>
          <span className="reconcile-step-badge">{isBlocked ? "1" : "✓"}</span>
          <span>1. Kiểm tra thiết bị & Phụ phí</span>
        </div>
        <span className="recon-step-arrow">→</span>
        {/* Bước 2 active khi đủ tiền điều kiện và chưa khóa; completed khi đơn đã hoàn tất */}
        <div className={`reconcile-step-item ${!isBlocked && !isOrderCompleted ? "active" : isOrderCompleted ? "completed" : ""}`}>
          <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "2"}</span>
          <span>2. Bảng đối soát & Xác nhận</span>
        </div>
        <span className="recon-step-arrow">→</span>
        <div className={`reconcile-step-item ${isOrderCompleted ? "active completed" : ""}`}>
          <span className="reconcile-step-badge">{isOrderCompleted ? "✓" : "3"}</span>
          <span>3. Quyết toán tiền & Khóa đối soát</span>
        </div>
      </div>

      {/* ─── DÒNG SỰ KIỆN PHỤ 1.1: CẢNH BÁO CHƯA ĐỦ ĐIỀU KIỆN ──────────────── */}
      {isBlocked ? (
        <div className="recon-blocker-box">
          <div className="flex items-center gap-2 mb-2">
            <span className="recon-blocker-icon">⛔</span>
            <strong className="recon-blocker-title">
              Chưa cho phép chốt đối soát (Dòng sự kiện phụ 1.1)
            </strong>
          </div>
          <p className="recon-blocker-desc">
            Đơn hàng chưa thỏa mãn tiền điều kiện. Hệ thống yêu cầu giải quyết dứt điểm các mục còn tồn đọng sau đây trước khi đối soát:
          </p>

          <div className="flex flex-col gap-2">
            {realApi && previewBackend && previewBackend.vuongMac.length > 0 && (
              <div className="recon-blocker-item">
                <strong className="recon-blocker-item-title">Kiểm tra điều kiện từ máy chủ:</strong>
                <ul className="recon-blocker-list">
                  {previewBackend.vuongMac.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {debtEquipment.length > 0 && (
              <div className="recon-blocker-item-row">
                <div>
                  <strong className="recon-blocker-item-heading">
                    Thiết bị chưa nhận trả / chưa có kết luận: {debtEquipment.length} thiết bị
                  </strong>
                  <div className="recon-muted-xs">
                    Mã: {debtEquipment.map((d) => d.equipmentDisplayCode || d.equipmentId).join(", ")}
                  </div>
                </div>
                <span className="recon-pill-danger">
                  Cần lập Phiếu nhận trả
                </span>
              </div>
            )}

            {pendingSurcharges.map((ps) => (
              <div key={ps.id} className="recon-blocker-item-row">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="recon-pill-warning-sm">Phụ phí chờ duyệt</span>
                    <strong className="recon-surcharge-name">{ps.type} ({ps.equipmentId})</strong>
                    <span className="recon-mono-danger">+{fmt(ps.amount)}</span>
                  </div>
                  <div className="recon-muted-xs">Lý do: {ps.reason} · Người đề xuất: {ps.createdBy}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={reconBusy}
                    onClick={() => onApproveSurcharge(ps)}
                    className="recon-btn-approve-inline"
                  >
                    ✓ Duyệt phụ phí
                  </button>
                  <button
                    type="button"
                    disabled={reconBusy}
                    onClick={() => onRejectSurcharge(ps)}
                    className="recon-btn-reject-inline"
                  >
                    ✕ Từ chối
                  </button>
                </div>
              </div>
            ))}

            {disputedSurcharges.map((ds) => (
              <div key={ds.id} className="recon-blocker-item-row">
                <div>
                  <strong className="recon-dispute-title">Phụ phí đang tranh chấp: {ds.type} ({fmt(ds.amount)})</strong>
                  <div className="recon-muted-xs">Khách hàng phản hồi: {ds.customerResponse || "Chưa đồng thuận mức phí"}</div>
                </div>
                <span className="recon-pill-warning">
                  Cần thương lượng xong
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="recon-ready-box">
          <span className="recon-ready-icon">✓</span>
          <div className="recon-ready-text">
            <strong>Đủ điều kiện đối soát (Tiền điều kiện đạt):</strong> 100% thiết bị đã kết luận nhận trả; toàn bộ phụ phí đã được duyệt/xử lý.
          </div>
        </div>
      )}
    </>
  );
}
