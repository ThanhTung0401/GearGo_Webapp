import type { StaffAccount } from "../../../store";

const INITIAL_PERMISSION_KEYS = [
  "Quản lý kho thiết bị",
  "Bàn giao & Nhận trả",
  "Lập phụ phí & Đối soát",
  "Xem báo cáo doanh thu",
  "Quản lý khuyến mãi",
];

interface StaffAccountModalProps {
  editingStaff: StaffAccount;
  isNew: boolean;
  submitting: boolean;
  modalError: string;
  onChange: (next: StaffAccount) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/**
 * Modal thêm mới hoặc cập nhật thông tin tài khoản nhân viên (UC1.7, UC1.8).
 */
export function StaffAccountModal({
  editingStaff,
  isNew,
  submitting,
  modalError,
  onChange,
  onSubmit,
  onClose,
}: StaffAccountModalProps) {
  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-container is-520">
        <div className="modal-header">
          <h3 className="modal-title">
            {isNew ? "Thêm tài khoản nhân viên mới (UC1.7)" : `Cập nhật thông tin ${editingStaff.name} (UC1.8)`}
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-lg">×</button>
        </div>
        <form onSubmit={onSubmit} className="modal-body flex flex-col gap-3.5">
          <div className="adm-grid-2">
            <div>
              <label className="adm-label--block">Mã nhân viên</label>
              <input
                disabled={!isNew}
                value={editingStaff.id}
                onChange={(e) => onChange({ ...editingStaff, id: e.target.value })}
                className={`adm-field adm-field--compact ${isNew ? "" : "adm-field--readonly-muted"}`}
              />
            </div>
            <div>
              <label className="adm-label--block">Tên đăng nhập</label>
              <input
                required
                value={editingStaff.username}
                onChange={(e) => onChange({ ...editingStaff, username: e.target.value })}
                className="adm-field adm-field--compact"
              />
            </div>
          </div>

          <div>
            <label className="adm-label--block">Họ và tên</label>
            <input
              required
              placeholder="VD: Trần Văn Bình"
              value={editingStaff.name}
              onChange={(e) => onChange({ ...editingStaff, name: e.target.value })}
              className="adm-field adm-field--compact"
            />
          </div>

          <div className="adm-grid-2">
            <div>
              <label className="adm-label--block">Số điện thoại</label>
              <input
                required
                type="tel"
                placeholder="0909..."
                value={editingStaff.phone}
                onChange={(e) => onChange({ ...editingStaff, phone: e.target.value })}
                className="adm-field adm-field--compact"
              />
            </div>
            <div>
              <label className="adm-label--block">Email</label>
              <input
                required
                type="email"
                placeholder="binh.tv@geargo.vn"
                value={editingStaff.email}
                onChange={(e) => onChange({ ...editingStaff, email: e.target.value })}
                className="adm-field adm-field--compact"
              />
            </div>
          </div>

          <div>
            <label className="adm-label--block">Vai trò</label>
            <select
              value={editingStaff.role}
              onChange={(e) => onChange({ ...editingStaff, role: e.target.value as StaffAccount["role"] })}
              className="adm-field adm-field--compact"
            >
              <option value="Nhân viên kho">Nhân viên kho</option>
              <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
              <option value="Quản trị viên">Quản trị viên</option>
            </select>
          </div>

          {/* Mật khẩu khởi tạo ban đầu (UC1.7) */}
          {isNew && (
            <div>
              <label className="adm-label--block">Mật khẩu khởi tạo *</label>
              <input
                required
                value={editingStaff.password || "GearGo@2026"}
                onChange={(e) => onChange({ ...editingStaff, password: e.target.value })}
                className="adm-field adm-field--compact adm-field--mono"
              />
              <span className="adm-hint-text">Mật khẩu tạm thời cấp cho nhân viên đăng nhập lần đầu.</span>
            </div>
          )}

          {/* Gán quyền nghiệp vụ ban đầu (UC1.7.1) */}
          {isNew && (
            <div className="adm-card--soft">
              <label className="adm-label--block mb-1.5">
                Gán quyền nghiệp vụ ban đầu (UC1.7.1):
              </label>
              <div className="flex flex-col gap-2">
                {INITIAL_PERMISSION_KEYS.map((pKey) => {
                  const isChecked = (editingStaff.permissions || []).includes(pKey);
                  return (
                    <label key={pKey} className="adm-checkbox-row">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          // Cập nhật mảng quyền đã chọn theo trạng thái checkbox
                          const cur = editingStaff.permissions || [];
                          const next = e.target.checked ? [...cur, pKey] : cur.filter((x) => x !== pKey);
                          onChange({ ...editingStaff, permissions: next });
                        }}
                      />
                      <span>{pKey}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-0">{modalError}</div>}

          <div className="flex gap-2 mt-2">
            <button type="button" disabled={submitting} onClick={onClose} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-md adm-btn-flex">
              {submitting ? "Đang lưu..." : "Lưu nhân viên"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
