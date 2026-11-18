import type { XemTruocHuyBackend } from "../../../../services/api/orderApi";
import { fmt, type Order } from "../../../../store";

interface StoreCancelOrderModalProps {
  order: Order;
  preview: XemTruocHuyBackend | null;
  reason: string;
  onReasonChange: (value: string) => void;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modal xem trước hoàn tiền và xác nhận cửa hàng chủ động hủy đơn (UC3.4).
 */
export function StoreCancelOrderModal({
  order,
  preview,
  reason,
  onReasonChange,
  loading,
  error,
  onConfirm,
  onClose,
}: StoreCancelOrderModalProps) {
  return (
    <div role="dialog" aria-modal="true" className="adm-modal-overlay">
      <div className="adm-modal-dialog is-md p-5.5">
        <div className="modal-header flex justify-between items-center mb-3 p-0 border-0">
          <h3 className="modal-title font-bold text-base text-bark">
            Cửa hàng hủy đơn {order.id} (UC3.4)
          </h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm text-lg">×</button>
        </div>

        <div className="modal-body grid gap-3 p-0">
          {loading && !preview && (
            <div className="adm-loading-text mb-0">Đang tính toán hoàn tiền và kiểm tra điều kiện hủy...</div>
          )}

          {preview && (
            <div className="adm-card--parchment text-[0.8rem] grid gap-1">
              <div>Trạng thái hiện tại: <strong>{preview.trangThaiHienTai}</strong></div>
              <div>Tiền thuê đã thu: <strong>{fmt(preview.tienThueDaThu)}</strong> · Tiền cọc đã thu: <strong>{fmt(preview.tienCocDaThu)}</strong></div>
              <div>Hoàn tiền thuê: <strong>{fmt(preview.tienThueHoan)}</strong> · Hoàn tiền cọc: <strong>{fmt(preview.tienCocHoan)}</strong></div>
              <div>Tổng hoàn dự kiến cho khách: <strong className="text-[var(--color-forest)]">{fmt(preview.tongHoan)}</strong></div>
              {!preview.coTheHuy && (
                <div className="text-[#B91C1C] font-semibold">Không thể hủy: {preview.lyDoKhongTheHuy}</div>
              )}
              {preview.canhBao?.length > 0 && (
                <div className="text-[#B45309]">{preview.canhBao.join(" · ")}</div>
              )}
            </div>
          )}

          <label className="adm-label">
            Lý do cửa hàng hủy đơn (bắt buộc)
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ví dụ: Thiết bị gặp sự cố kỹ thuật đột xuất trước giờ bàn giao..."
              className="adm-field"
            />
          </label>

          {error && (
            <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-0">
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button type="button" disabled={loading} onClick={onClose} className="btn btn-secondary btn-md adm-btn-flex">
              Đóng
            </button>
            <button
              type="button"
              disabled={loading || (preview !== null && !preview.coTheHuy)}
              onClick={onConfirm}
              className="btn btn-primary btn-md adm-btn-flex adm-btn-danger-solid"
            >
              {loading ? "Đang xử lý..." : "Xác nhận cửa hàng hủy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
