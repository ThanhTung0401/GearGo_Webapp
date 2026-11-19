import type { StaffAccount } from "../../../store";

interface StaffStatusModalsProps {
  lockModalStaff: StaffAccount | null;
  lockReason: string;
  onLockReasonChange: (value: string) => void;
  onConfirmLock: () => void;
  onCloseLock: () => void;
  resigningStaff: StaffAccount | null;
  resignDate: string;
  onResignDateChange: (value: string) => void;
  resignReason: string;
  onResignReasonChange: (value: string) => void;
  onConfirmResign: () => void;
  onCloseResign: () => void;
  submitting: boolean;
  modalError: string;
}

/**
 * Hai modal xác nhận thay đổi trạng thái làm việc nhân viên:
 * Khóa tài khoản (UC1.11) và Ghi nhận nghỉ việc (UC1.8).
 */
export function StaffStatusModals({
  lockModalStaff,
  lockReason,
  onLockReasonChange,
  onConfirmLock,
  onCloseLock,
  resigningStaff,
  resignDate,
  onResignDateChange,
  resignReason,
  onResignReasonChange,
  onConfirmResign,
  onCloseResign,
  submitting,
  modalError,
}: StaffStatusModalsProps) {
  return (
    <>
      {/* Modal Khóa Nhân viên (UC1.11) */}
      {lockModalStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-xs">
            <div className="modal-header">
              <h3 className="modal-title">Khóa tài khoản {lockModalStaff.name} (UC1.11)</h3>
              <button onClick={onCloseLock} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p className="text-[0.85rem] text-[#4B5563] mb-3">
                Tài khoản bị khóa sẽ không thể đăng nhập vào hệ thống vận hành. Nhập lý do khóa:
              </p>
              <textarea
                rows={3}
                value={lockReason}
                onChange={(e) => onLockReasonChange(e.target.value)}
                className="adm-field adm-field--compact mb-3.5"
              />
              {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-3">{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={onCloseLock} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button disabled={submitting} onClick={onConfirmLock} className="btn btn-md adm-btn-flex adm-btn-danger-solid">
                  {submitting ? "Đang khóa..." : "Xác nhận khóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận nghỉ việc (UC1.8) */}
      {resigningStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-sm">
            <div className="modal-header">
              <h3 className="modal-title">Ghi nhận nghỉ việc: {resigningStaff.name}</h3>
              <button onClick={onCloseResign} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body flex flex-col gap-3">
              <label className="adm-label">
                Ngày nghỉ việc
                <input
                  type="date"
                  value={resignDate}
                  onChange={(e) => onResignDateChange(e.target.value)}
                  className="adm-field"
                />
              </label>
              <label className="adm-label">
                Lý do nghỉ việc (Bắt buộc)
                <textarea
                  rows={3}
                  value={resignReason}
                  onChange={(e) => onResignReasonChange(e.target.value)}
                  className="adm-field"
                />
              </label>
              {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-0">{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={onCloseResign} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button disabled={submitting} onClick={onConfirmResign} className="btn btn-md adm-btn-flex adm-btn-crimson-solid">
                  {submitting ? "Đang xử lý..." : "Xác nhận nghỉ việc"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
