import type { AppState } from "../../../context/AppContext";
import { fmt, type Order, type Surcharge } from "../../../store";
import { surchargeApi } from "../../../services/api";

interface OrderDisputeModalProps {
  app: AppState;
  detail: Order;
  disputeSurchargeTarget: Surcharge;
  setDisputeSurchargeTarget: (v: Surcharge | null) => void;
  disputeReason: string;
  setDisputeReason: (v: string) => void;
  disputeSubmitting: boolean;
  setDisputeSubmitting: (v: boolean) => void;
  actionError: string;
  setActionError: (v: string) => void;
  refreshOrderById: (id: string | number) => Promise<void>;
}

/**
 * Modal gửi khiếu nại mức phụ phí phát sinh lên Quản trị viên (UC5.2 Dòng 5.1).
 */
export function OrderDisputeModal({
  app,
  detail,
  disputeSurchargeTarget,
  setDisputeSurchargeTarget,
  disputeReason,
  setDisputeReason,
  disputeSubmitting,
  setDisputeSubmitting,
  actionError,
  setActionError,
  refreshOrderById,
}: OrderDisputeModalProps) {
  // Gửi tranh chấp phụ phí qua backend hoặc cập nhật mock store
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    if (!app.realApi) {
      app.disputeSurcharge(detail.id, disputeSurchargeTarget.id, disputeReason);
      setDisputeSurchargeTarget(null);
      setDisputeReason("");
      return;
    }
    setDisputeSubmitting(true);
    setActionError("");
    try {
      await surchargeApi.taoTranhChap(
        Number(disputeSurchargeTarget.backendId ?? disputeSurchargeTarget.id),
        disputeReason.trim()
      );
      await refreshOrderById(detail.id);
      setDisputeSurchargeTarget(null);
      setDisputeReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể gửi khiếu nại phụ phí.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay cp-modal-overlay cp-modal-overlay--dim">
      <div className="modal-container cp-modal-box cp-modal-box--500">
        <div className="modal-header flex justify-between items-center mb-3">
          <h3 className="modal-title font-bold text-base cp-dispute-title">
            ⚖️ Khiếu nại phụ phí phát sinh (Dòng 5.1)
          </h3>
          <button onClick={() => setDisputeSurchargeTarget(null)} className="btn btn-ghost btn-sm text-lg cp-modal-close">×</button>
        </div>
        <div className="text-xs text-gray-600 mb-4">
          Nếu bạn không đồng thuận với lý do hoặc mức phí nhân viên cửa hàng lập, bạn có quyền gửi phản hồi. Quản trị viên sẽ đối chiếu biên bản bàn giao, phiếu nhận trả và làm việc lại với bạn.
        </div>

        <div className="cp-dispute-summary">
          <div>Khoản phí: <strong>{disputeSurchargeTarget.type}</strong></div>
          <div>Thiết bị: <strong>{disputeSurchargeTarget.equipmentId}</strong></div>
          <div>Số tiền yêu cầu: <strong className="cp-dispute-amount">{fmt(disputeSurchargeTarget.amount)}</strong></div>
          <div className="cp-dispute-staff-reason">Lý do của nhân viên: <em>"{disputeSurchargeTarget.reason}"</em></div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          {actionError && (
            <div role="alert" className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {actionError}
            </div>
          )}
          <div className="form-group">
            <label className="form-label cp-dispute-label">
              Lý do bạn không đồng ý với mức phụ phí này: *
            </label>
            <textarea
              required
              rows={4}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Ví dụ: Vết trầy xước này đã có từ trước khi nhận đồ, tôi có chụp ảnh lưu lúc kiểm tra tại quầy..."
              className="form-textarea cp-dispute-textarea"
            />
          </div>

          {/* Cho phép nút khiếu nại xuống dòng gọn trong modal 390px */}
          <div className="flex gap-2 justify-end flex-wrap mt-2">
            <button
              type="button"
              onClick={() => setDisputeSurchargeTarget(null)}
              className="btn btn-secondary btn-sm"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={disputeSubmitting}
              className="btn btn-primary btn-sm cp-dispute-submit-btn"
            >
              {disputeSubmitting ? "Đang gửi khiếu nại..." : "Gửi khiếu nại (Chuyển Quản trị viên)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
