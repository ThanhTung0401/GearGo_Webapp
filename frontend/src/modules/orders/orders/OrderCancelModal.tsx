import { fmt, type Order } from "../../../store";
import type { XemTruocHuyBackend } from "../../../services/api";

interface OrderCancelModalProps {
  realApi: boolean;
  cancellingOrder: Order;
  cancelPreview: XemTruocHuyBackend | null;
  localCancellationQuote: { fee: number; refund: number } | null;
  cancelPreviewLoading: boolean;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  cancelSubmitting: boolean;
  actionError: string;
  onClose: () => void;
  handleConfirmCancel: () => Promise<void>;
}

/**
 * Modal xác nhận hủy đơn thuê kèm bảng dự toán phí giữ lại và hoàn tiền theo chính sách BR22 (UC3.4).
 */
export function OrderCancelModal({
  realApi,
  cancellingOrder,
  cancelPreview,
  localCancellationQuote,
  cancelPreviewLoading,
  cancelReason,
  setCancelReason,
  cancelSubmitting,
  actionError,
  onClose,
  handleConfirmCancel,
}: OrderCancelModalProps) {
  return (
    <div className="modal-overlay cp-modal-overlay cp-modal-overlay--dim">
      <div className="modal-container max-w-md cp-modal-box cp-modal-box--md">
        <div className="modal-header flex justify-between items-center mb-3">
          <h2 className="modal-title font-bold text-base text-bark cp-cancel-title">
            Xác nhận hủy đơn thuê #{cancellingOrder.displayCode || cancellingOrder.id}? (UC3.4)
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm cp-modal-close cp-modal-close--lg">✕</button>
        </div>

        <div className="modal-body text-xs">
          <div className="cp-cancel-policy-box">
            <strong>📌 Chính sách hủy đơn tiêu chuẩn (BR22):</strong>
            <ul className="cp-cancel-policy-list">
              <li>Trước &gt;48h: Miễn phí 100% · Hoàn toàn bộ tiền thuê + cọc.</li>
              <li>24h – 48h: Giữ 30% tiền thuê · Hoàn 70% tiền thuê + 100% cọc.</li>
              <li>Dưới &lt;24h: Giữ 100% tiền thuê · Hoàn 100% tiền cọc bảo đảm.</li>
              <li>Chưa thanh toán: Hủy miễn phí ngay lập tức.</li>
            </ul>
          </div>

          {cancelPreviewLoading ? (
            <div className="cp-cancel-loading">
              Đang tính toán dự toán hoàn tiền từ máy chủ...
            </div>
          ) : realApi && cancelPreview && cancellingOrder.status !== "Chờ thanh toán" ? (
            <div className="cp-cancel-quote-box">
              <div className="cp-cancel-quote-heading">
                Bảng dự tính hoàn tiền & phí giữ lại ({cancelPreview.nhanhChinhSach}):
              </div>
              {!cancelPreview.coTheHuy && cancelPreview.lyDoKhongTheHuy && (
                <div className="cp-cancel-blocked">{cancelPreview.lyDoKhongTheHuy}</div>
              )}
              <div className="flex justify-between py-1 text-gray-600">
                <span>Tiền thuê đã thu:</span>
                <span className="font-mono">{fmt(cancelPreview.tienThueDaThu)}</span>
              </div>
              <div className="flex justify-between py-1 text-red-600">
                <span>Phí hủy giữ lại ({Math.round((cancelPreview.tyLeGiuLai ?? 0) * 100)}%):</span>
                <strong className="font-mono">−{fmt(cancelPreview.tienThueGiuLai)}</strong>
              </div>
              <div className="flex justify-between py-1 text-gray-600">
                <span>Tiền thuê được hoàn:</span>
                <span className="font-mono">{fmt(cancelPreview.tienThueHoan)}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-600">
                <span>Tiền cọc hoàn trả 100%:</span>
                <span className="font-mono">{fmt(cancelPreview.tienCocHoan)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-forest cp-cancel-quote-total">
                <span>Tổng tiền thực tế hoàn trả cho bạn:</span>
                <span className="font-mono text-base">{fmt(cancelPreview.tongHoan)}</span>
              </div>
              {cancelPreview.canhBao && (
                <div className="cp-cancel-warning">{cancelPreview.canhBao}</div>
              )}
            </div>
          ) : (
            <div className="cp-cancel-quote-box">
              <div className="cp-cancel-quote-heading">
                Bảng dự tính hoàn tiền & phí giữ lại:
              </div>
              <div className="flex justify-between py-1 text-gray-600">
                <span>Tiền thuê ban đầu:</span>
                <span className="font-mono">{fmt(cancellingOrder.rental - cancellingOrder.discount)}</span>
              </div>
              <div className="flex justify-between py-1 text-red-600">
                <span>Phí hủy giữ lại (theo quy chế):</span>
                <strong className="font-mono">−{fmt(localCancellationQuote?.fee ?? 0)}</strong>
              </div>
              <div className="flex justify-between py-1 text-gray-600">
                <span>Tiền thuê được hoàn:</span>
                <span className="font-mono">{fmt(Math.max(0, cancellingOrder.rental - cancellingOrder.discount - (localCancellationQuote?.fee ?? 0)))}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-600">
                <span>Tiền cọc hoàn trả 100%:</span>
                <span className="font-mono">{fmt(cancellingOrder.depositTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-forest cp-cancel-quote-total">
                <span>Tổng tiền thực tế hoàn trả cho bạn:</span>
                <span className="font-mono text-base">{fmt(localCancellationQuote?.refund ?? 0)}</span>
              </div>
            </div>
          )}

          {actionError && (
            <div role="alert" className="cp-alert-error cp-alert-error--sm">
              {actionError}
            </div>
          )}

          <div className="form-group mb-4">
            <label className="form-label cp-cancel-reason-label">Lý do hủy đơn *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Vui lòng nhập lý do hủy đơn của bạn..."
              rows={2}
              className="form-textarea cp-cancel-reason-textarea"
            />
          </div>
        </div>

        {/* Cho phép nút footer modal hủy đơn xuống dòng gọn trên mobile 390px */}
        <div className="modal-footer flex gap-2 justify-end flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm cp-btn-cancel-close"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!cancelReason.trim() || cancelSubmitting || cancelPreviewLoading || (Boolean(cancelPreview) && !cancelPreview?.coTheHuy)}
            onClick={() => void handleConfirmCancel()}
            className="btn btn-danger btn-sm cp-btn-cancel-submit"
          >
            {cancelSubmitting ? "Đang xử lý hủy..." : "Xác nhận hủy đơn thuê"}
          </button>
        </div>
      </div>
    </div>
  );
}
