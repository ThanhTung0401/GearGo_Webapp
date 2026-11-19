import type { StaffAccount } from "../../../store";
import type { QuyenCatalogResponse } from "../../../features/permissions";

const MOCK_PERMISSION_DESCRIPTIONS = [
  { key: "Quản lý kho thiết bị", desc: "Xem danh sách thiết bị, quét barcode, kiểm kê và lập phiếu bảo trì" },
  { key: "Bàn giao & Nhận trả", desc: "Thực hiện biên bản BBBG, checklist phụ kiện và nghiệm thu trả đồ" },
  { key: "Lập phụ phí & Đối soát", desc: "Đề xuất phụ phí bồi thường và lập phiếu thu/chi hoàn cọc" },
  { key: "Xem báo cáo doanh thu", desc: "Xem 4 trụ cột báo cáo tài chính và xuất dữ liệu thống kê" },
  { key: "Quản lý khuyến mãi", desc: "Tạo và tạm dừng các mã voucher giảm giá" },
];

interface StaffPermissionsModalProps {
  isRealApi: boolean;
  permStaff: StaffAccount;
  permRoleName: "NhanVien" | "QuanTriVien";
  permCatalog: QuyenCatalogResponse[];
  permLoading: boolean;
  submitting: boolean;
  modalError: string;
  onSwitchRole: (role: "NhanVien" | "QuanTriVien") => void;
  onChangeStaff: (next: StaffAccount) => void;
  onSave: (perms: string[]) => void;
  onClose: () => void;
}

/**
 * Modal cấu hình vai trò và quyền hạn chi tiết cho tài khoản nhân viên (UC1.10).
 */
export function StaffPermissionsModal({
  isRealApi,
  permStaff,
  permRoleName,
  permCatalog,
  permLoading,
  submitting,
  modalError,
  onSwitchRole,
  onChangeStaff,
  onSave,
  onClose,
}: StaffPermissionsModalProps) {
  // Bật/tắt một mã quyền trong danh sách quyền hiện tại của nhân viên
  const togglePermKey = (key: string, checked: boolean) => {
    const currentPerms = permStaff.permissions || [];
    const next = checked ? [...currentPerms, key] : currentPerms.filter((k) => k !== key);
    onChangeStaff({ ...permStaff, permissions: next });
  };

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-container is-560">
        <div className="modal-header">
          <h3 className="modal-title">Cấu hình phân quyền: {permStaff.name} (UC1.10)</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-lg">×</button>
        </div>
        <div className="modal-body">
          <p className="adm-page-subtitle--compact text-[#6B7280] mb-3">
            Chọn vai trò và các quyền nghiệp vụ cho tài khoản <strong>@{permStaff.username}</strong>:
          </p>
          {isRealApi && (
            <div className="mb-3">
              <label className="adm-label--sub">Vai trò tài khoản</label>
              <select
                value={permRoleName}
                onChange={(e) => onSwitchRole(e.target.value as "NhanVien" | "QuanTriVien")}
                className="adm-field"
              >
                <option value="NhanVien">Nhân viên vận hành (NhanVien)</option>
                <option value="QuanTriVien">Quản trị viên (QuanTriVien)</option>
              </select>
            </div>
          )}

          {permLoading ? (
            <div className="adm-loading-text py-3">Đang tải danh sách quyền từ máy chủ...</div>
          ) : isRealApi && permRoleName === "QuanTriVien" ? (
            <div className="adm-alert is-info adm-alert--block mb-3.5">
              <strong>Quản trị viên (QuanTriVien)</strong> mặc định có toàn bộ quyền hạn trong hệ thống.
            </div>
          ) : isRealApi && permCatalog.length > 0 ? (
            <div className="flex flex-col gap-3 mb-5">
              {permCatalog.map((group) => (
                <div key={group.nhom} className="adm-card--soft p-2.5">
                  <div className="adm-label--sub mb-1.5">{group.nhom}</div>
                  <div className="flex flex-col gap-1.5">
                    {group.quyen.map((q) => {
                      const isChecked = (permStaff.permissions || []).includes(q.ma);
                      return (
                        <label key={q.ma} className="adm-checkbox-row">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => togglePermKey(q.ma, e.target.checked)}
                          />
                          <span>{q.tenHienThi}</span>
                          <span className="ml-auto text-[0.7rem] text-[#9CA3AF] adm-cell-mono">{q.ma}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 mb-5">
              {MOCK_PERMISSION_DESCRIPTIONS.map((p) => {
                const isChecked = (permStaff.permissions || []).includes(p.key);
                return (
                  /* Đánh dấu nổi bật thẻ quyền hạn khi đang được chọn */
                  <label key={p.key} className={`adm-checkbox-card ${isChecked ? "is-checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => togglePermKey(p.key, e.target.checked)}
                    />
                    <div>
                      <strong className="adm-cell-title">{p.key}</strong>
                      <div className="adm-hint-text">{p.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-3">{modalError}</div>}
          <div className="flex gap-2">
            <button disabled={submitting} onClick={onClose} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
            <button
              disabled={submitting || permLoading}
              onClick={() => onSave(permStaff.permissions || [])}
              className="btn btn-primary btn-md adm-btn-flex"
            >
              {submitting ? "Đang lưu..." : "Lưu quyền hạn"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
