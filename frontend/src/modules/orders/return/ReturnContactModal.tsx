import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import type { NhatKyLienHeQuaHanBackend } from "../../../services/api";
import type { Order } from "../../../store";
import type { ContactOutcome } from "./returnTypes";

interface ReturnContactModalProps {
  app: ReturnType<typeof useApp>;
  order: Order;
  contactNotice: string | null;
  contactLogsBackend: NhatKyLienHeQuaHanBackend[];
  contactOutcome: ContactOutcome;
  setContactOutcome: (v: ContactOutcome) => void;
  newExpectedTime: string;
  setNewExpectedTime: (v: string) => void;
  contactNote: string;
  setContactNote: (v: string) => void;
  returnBusy: boolean;
  onSaveContactLog: () => Promise<void>;
  onClose: () => void;
}

// Modal xem lịch sử cuộc gọi và ghi nhận liên hệ mới cho đơn quá hạn (UC4.4)
export function ReturnContactModal({
  app,
  order,
  contactNotice,
  contactLogsBackend,
  contactOutcome,
  setContactOutcome,
  newExpectedTime,
  setNewExpectedTime,
  contactNote,
  setContactNote,
  returnBusy,
  onSaveContactLog,
  onClose,
}: ReturnContactModalProps) {
  const useBackend = app.realApi || isRealApiEnabled();
  const logCount = (useBackend ? contactLogsBackend.length : order.contactLogs?.length) || 0;

  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-620">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="so-modal-tag is-pill is-red">XỬ LÝ ĐƠN QUÁ HẠN (UC4.4)</span>
            <h3 className="so-modal-title-sm">
              Nhật ký liên hệ đơn {order.displayCode || order.id}
            </h3>
            <div className="so-modal-sub-dark">
              Khách hàng: <strong>{order.customerName}</strong>{" "}
              {order.customerPhone ? `(${order.customerPhone})` : ""}
            </div>
          </div>
          <button onClick={onClose} className="so-modal-close-sm">✕</button>
        </div>

        {contactNotice && <div className="so-alert-success-sm">{contactNotice}</div>}

        {/* Lịch sử các cuộc gọi trước */}
        <div className="so-field-group-lg">
          <strong className="so-receipt-section-label">
            Lịch sử các lần liên hệ ({logCount} lần):
          </strong>
          <div className="flex flex-col gap-2 mt-2 so-contact-log-list">
            {logCount === 0 ? (
              <div className="so-contact-log-empty">
                Chưa có lịch sử liên hệ nào. Vui lòng ghi lại kết quả cuộc gọi bên dưới.
              </div>
            ) : useBackend ? (
              contactLogsBackend.map((log) => (
                <div key={log.maNhatKyLienHe} className="so-contact-log-card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="so-contact-log-actor">
                      {log.tenNguoiLienHe} · {new Date(log.thoiDiemLienHe).toLocaleString("vi-VN")}
                    </span>
                    <span className="so-contact-log-outcome">{log.ketQua}</span>
                  </div>
                  <div className="so-contact-log-note">{log.noiDung}</div>
                  {log.henTraMoi && (
                    <div className="so-contact-log-expected">
                      Khách hẹn trả mới: <strong>{new Date(log.henTraMoi).toLocaleString("vi-VN")}</strong>
                    </div>
                  )}
                </div>
              ))
            ) : (
              order.contactLogs?.map((log) => (
                <div key={log.id} className="so-contact-log-card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="so-contact-log-actor">
                      {log.staffName} · {log.contactedAt}
                    </span>
                    <span className="so-contact-log-outcome">{log.outcome}</span>
                  </div>
                  <div className="so-contact-log-note">{log.note}</div>
                  {log.newExpectedTime && (
                    <div className="so-contact-log-expected">
                      Khách hẹn trả mới: <strong>{log.newExpectedTime}</strong>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Form ghi nhận lần gọi mới */}
        <div className="so-contact-form-box">
          <strong className="so-contact-form-title">+ Ghi nhận cuộc gọi mới trong ca trực:</strong>
          <div className="so-modal-grid-2-tight">
            <div>
              <label className="so-field-label-muted">Kết quả liên hệ *</label>
              <select
                value={contactOutcome}
                onChange={(e) => setContactOutcome(e.target.value as ContactOutcome)}
                className="so-input-contact"
              >
                <option value="Hẹn giờ trả mới">Khách hẹn giờ trả mới</option>
                <option value="Xin gia hạn thêm">Khách xin gia hạn thuê thêm</option>
                <option value="Không nghe máy">Không nghe máy / Thuê bao</option>
                <option value="Khách báo mất">Khách báo mất thiết bị</option>
              </select>
            </div>
            <div>
              <label className="so-field-label-muted">Hạn hẹn mới (nếu có)</label>
              <input
                type={useBackend ? "datetime-local" : "text"}
                placeholder="VD: 18:00 ngày mai"
                value={newExpectedTime}
                onChange={(e) => setNewExpectedTime(e.target.value)}
                className="so-input-contact"
              />
            </div>
          </div>
          <label className="so-field-label-muted">Ghi chú nội dung cuộc gọi *</label>
          <textarea
            placeholder="Ghi rõ lý do trễ, cam kết của khách..."
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            rows={2}
            className="so-textarea-contact"
          />
          <button
            type="button"
            disabled={returnBusy}
            onClick={() => void onSaveContactLog()}
            className="so-btn-primary-contact"
          >
            {returnBusy ? "Đang lưu..." : "Lưu vào lịch sử liên hệ"}
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="so-btn-cancel-close">Đóng</button>
        </div>
      </div>
    </div>
  );
}
