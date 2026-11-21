interface Props {
  isStaffPortal: boolean;
  onFill: (account: string, password: string) => void;
}

export default function QuickLoginPanel({ isStaffPortal, onFill }: Props) {
  return (
    <div className="auth-quick-login">
      <div className="auth-quick-login-title">
        {isStaffPortal ? "💡 Chọn nhanh tài khoản nội bộ (Staff Portal):" : "💡 Chọn nhanh tài khoản khách hàng:"}
      </div>
      {isStaffPortal ? (
        <div className="auth-quick-login-grid">
          <button
            type="button"
            onClick={() => onFill("admin@geargo.vn", "GearGo@2026")}
            className="auth-quick-btn auth-quick-btn--amber"
          >
            <div className="auth-quick-btn-role">👑 Quản trị viên</div>
            <div className="auth-quick-btn-cred">admin@geargo.vn / GearGo@2026</div>
          </button>
          <button
            type="button"
            onClick={() => onFill("staff@geargo.vn", "GearGo@2026")}
            className="auth-quick-btn auth-quick-btn--indigo"
          >
            <div className="auth-quick-btn-role">🧑‍💼 Nhân viên 1</div>
            <div className="auth-quick-btn-cred">staff@geargo.vn / GearGo@2026</div>
          </button>
          <button
            type="button"
            onClick={() => onFill("tuan.staff@geargo.vn", "GearGo@2026")}
            className="auth-quick-btn auth-quick-btn--green"
          >
            <div className="auth-quick-btn-role">🧑‍💼 Nhân viên 2</div>
            <div className="auth-quick-btn-cred">tuan.staff@geargo.vn / GearGo@2026</div>
          </button>
        </div>
      ) : (
        <div className="auth-quick-login-grid">
          <button
            type="button"
            onClick={() => onFill("customer@geargo.vn", "GearGo@2026")}
            className="auth-quick-btn auth-quick-btn--green"
          >
            <div className="auth-quick-btn-role">🏕️ Khách hàng 1</div>
            <div className="auth-quick-btn-cred">customer@geargo.vn / GearGo@2026</div>
          </button>
          <button
            type="button"
            onClick={() => onFill("quang.kh@geargo.vn", "GearGo@2026")}
            className="auth-quick-btn auth-quick-btn--indigo"
          >
            <div className="auth-quick-btn-role">🏕️ Khách hàng 2</div>
            <div className="auth-quick-btn-cred">quang.kh@geargo.vn / GearGo@2026</div>
          </button>
        </div>
      )}
    </div>
  );
}
