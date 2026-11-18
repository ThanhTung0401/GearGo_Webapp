import type { XemTruocHuyBackend } from "../../../../services/api";
import { fmt, Order } from "../../../../store";

interface OrderNoShowModalProps {
  order: Order;
  noShowPreview: XemTruocHuyBackend | null;
  noShowNote: string;
  setNoShowNote: (v: string) => void;
  noShowError: string;
  noShowSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

// Modal ghi nhận khách không đến nhận đồ (UC4.5 No-Show)
export function OrderNoShowModal({
  order,
  noShowPreview,
  noShowNote,
  setNoShowNote,
  noShowError,
  noShowSubmitting,
  onClose,
  onSubmit,
}: OrderNoShowModalProps) {
  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-460">
        <h3 className="so-modal-title-danger">
          Ghi nhận khách không đến nhận (No-Show)
        </h3>
        <p className="so-modal-desc-dark">
          Đơn <strong>#{order.displayCode || order.id}</strong> — {order.customerName} ({order.customerPhone})
        </p>
        {noShowPreview && (
          <div className="so-preview-warn">
            <div>Nhánh chính sách: <strong>{noShowPreview.nhanhChinhSach}</strong></div>
            <div>
              Dự kiến giữ lại: <strong>{fmt(noShowPreview.tienThueGiuLai)}</strong> · Dự kiến hoàn:{" "}
              <strong>{fmt(noShowPreview.tongHoan)}</strong>
            </div>
            {noShowPreview.canhBao?.length > 0 && (
              <div className="so-preview-warn-alert">{noShowPreview.canhBao.join(" | ")}</div>
            )}
          </div>
        )}
        <textarea
          rows={3}
          value={noShowNote}
          onChange={(e) => setNoShowNote(e.target.value)}
          placeholder="Ghi chú số lần gọi nhắc / lý do khách không đến..."
          className="so-textarea"
        />
        {noShowError && (
          <div role="alert" className="so-form-error">
            {noShowError}
          </div>
        )}
        {/* Cho phép nhóm nút modal No-Show xuống dòng trên mobile 390px */}
        <div className="flex justify-end gap-2 flex-wrap">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Hủy
          </button>
          <button
            type="button"
            disabled={noShowSubmitting || !noShowNote.trim()}
            onClick={() => void onSubmit()}
            className="btn btn-danger btn-sm"
          >
            {noShowSubmitting ? "Đang ghi nhận..." : "Xác nhận ghi nhận No-Show"}
          </button>
        </div>
      </div>
    </div>
  );
}
