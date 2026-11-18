import Icon from "../../../../components/Icon";
import { type AuditLogEntryWithRef } from "../../../../services/mappers/reviewNotifAuditMapper";

interface AuditEventDetailModalProps {
  selectedEvent: AuditLogEntryWithRef;
  onClose: () => void;
  onOpenRelatedDoc: (targetEntity: string, targetId: string, log: AuditLogEntryWithRef) => void;
}

/**
 * Modal hiển thị chi tiết biến động sự kiện kiểm toán (UC10.4 Bước 4),
 * bao gồm dữ liệu trước/sau và nút điều hướng sang chứng từ đối chiếu.
 */
export function AuditEventDetailModal({
  selectedEvent,
  onClose,
  onOpenRelatedDoc,
}: AuditEventDetailModalProps) {
  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal-dialog is-lg max-w-[640px]">
        <div className="adm-modal-header-clean">
          <div>
            <h3 className="adm-card-title">
              Chi tiết sự kiện truy vết (Audit Event #{selectedEvent.id})
            </h3>
            <div className="adm-hint-text">Thời điểm: {selectedEvent.timestamp}</div>
          </div>
          <button type="button" onClick={onClose} className="adm-btn-ghost">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="adm-modal-body-scroll text-[0.85rem]">
          <div className="adm-grid-2 mb-4">
            <div className="adm-card--parchment">
              <div className="adm-hint-text">Người thực hiện:</div>
              <strong className="text-[var(--color-bark)]">{selectedEvent.actor}</strong>
              <div className="text-[0.72rem] text-[var(--color-forest)] mt-0.5">Vai trò: {selectedEvent.role}</div>
            </div>

            <div className="adm-card--parchment">
              <div className="adm-hint-text">Đối tượng biến động:</div>
              <strong className="adm-cell-mono">{selectedEvent.targetEntity}: {selectedEvent.targetId}</strong>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    const ev = selectedEvent;
                    onClose();
                    onOpenRelatedDoc(ev.targetEntity, ev.targetId, ev);
                  }}
                  className="btn btn-secondary btn-sm adm-btn-xs text-[0.7rem]"
                >
                  Mở chứng từ đối chiếu (UC10.4.2)
                </button>
              </div>
            </div>
          </div>

          <div className="adm-card--soft p-3.5">
            <div className="text-[0.75rem] text-[#6B7280] font-bold mb-1">HÀNH ĐỘNG & NỘI DUNG BIẾN ĐỘNG:</div>
            <div className="font-semibold text-[var(--color-forest)] mb-1.5">{selectedEvent.action}</div>
            <div className="text-[#374151] leading-relaxed">{selectedEvent.detail}</div>
            {selectedEvent.lyDo && (
              <div className="mt-2 text-[0.78rem] text-[#4B5563]">
                <strong>Lý do ghi nhận:</strong> {selectedEvent.lyDo}
              </div>
            )}
          </div>

          {(selectedEvent.duLieuTruoc || selectedEvent.duLieuSau) && (
            <div className="adm-grid-2 mt-3">
              {selectedEvent.duLieuTruoc && (
                <div className="adm-audit-diff-before">
                  <div className="font-bold text-[#991B1B] mb-1">Dữ liệu trước</div>
                  <pre className="adm-audit-pre">{selectedEvent.duLieuTruoc}</pre>
                </div>
              )}
              {selectedEvent.duLieuSau && (
                <div className="adm-audit-diff-after">
                  <div className="font-bold text-[#166534] mb-1">Dữ liệu sau</div>
                  <pre className="adm-audit-pre">{selectedEvent.duLieuSau}</pre>
                </div>
              )}
            </div>
          )}

          <div className="adm-audit-seal-note">
            🔒 Nhật ký kiểm toán được niêm phong bất biến. Chức năng tra cứu chỉ hỗ trợ đọc (Read-only) và không cung cấp thao tác sửa/xóa theo chuẩn an toàn thông tin (UC10.4 Dòng phụ 4.2).
          </div>
        </div>

        <div className="adm-modal-footer-clean">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
}
