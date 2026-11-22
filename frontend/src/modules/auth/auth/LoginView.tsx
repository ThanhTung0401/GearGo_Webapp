import Icon from "../../../components/Icon";
import { useLoginView } from "./useLoginView";
import QuickLoginPanel from "./QuickLoginPanel";

export interface LoginViewProps {
  /** Phân tách 2 cổng đăng nhập độc lập: /login (khách hàng) và /staff/login (nhân viên & quản trị) */
  portal?: "customer" | "staff";
}

// ─── Đăng nhập (LoginView - UC1.2, UC1.2.1) ───────────────────────────────────
export function LoginView({ portal = "customer" }: LoginViewProps) {
  const vm = useLoginView(portal);

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Icon name={vm.isStaffPortal ? "shield" : "tent"} size={26} />
          </div>
          <h1 className="auth-title">
            {vm.isStaffPortal ? "Đăng nhập Nhân viên (Staff)" : "Đăng nhập GearGo"}
          </h1>
          <p className="auth-subtitle">
            {vm.isStaffPortal
              ? "Cổng vận hành & quản trị nội bộ cửa hàng GearGo"
              : "Trải nghiệm dịch vụ thuê thiết bị dã ngoại hàng đầu"}
          </p>
        </div>

        <div className="auth-card">
          {vm.lockedAccount && (
            <div className="auth-locked-alert">
              <div className="auth-locked-alert-title">
                <span>🔒</span> Tài khoản của bạn hiện đang bị khóa!
              </div>
              <p className="auth-locked-alert-reason">
                <strong>Lý do:</strong> {vm.lockedAccount.reason}
              </p>
              <div className="auth-locked-alert-support">
                Vui lòng liên hệ Hotline <strong>1900 6868</strong> hoặc gửi email tới <strong>support@geargo.vn</strong> để được nhân viên hỗ trợ đối soát và mở khóa.
              </div>
            </div>
          )}

          <form onSubmit={vm.submit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email hoặc Số điện thoại *</label>
              <input
                type="text"
                autoFocus
                value={vm.accountInput}
                onChange={(e) => {
                  vm.setAccountInput(e.target.value);
                  vm.resetFeedback();
                }}
                placeholder={vm.isStaffPortal ? "VD: staff@geargo.vn hoặc 0901000002" : "VD: customer@geargo.vn hoặc 0901000003"}
                className={`form-input ${vm.err ? "form-input-error" : ""}`}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu *</label>
              <div className="auth-pwd-wrapper">
                <input
                  type={vm.showPass ? "text" : "password"}
                  value={vm.pass}
                  onChange={(e) => {
                    vm.setPass(e.target.value);
                    vm.resetFeedback();
                  }}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`form-input ${vm.err ? "form-input-error" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => vm.setShowPass(!vm.showPass)}
                  className="auth-pwd-toggle"
                >
                  {vm.showPass ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            {vm.err && (
              <div className="form-error-msg">
                <div>{vm.err}</div>
                {vm.wrongPortalHint === "staff" && (
                  <button
                    type="button"
                    onClick={() => vm.app.setPage("staff-login")}
                    className="auth-link text-xs font-bold mt-1 underline"
                  >
                    Chuyển tới cổng Nhân viên (/staff/login) →
                  </button>
                )}
                {vm.wrongPortalHint === "customer" && (
                  <button
                    type="button"
                    onClick={() => vm.app.setPage("login")}
                    className="auth-link text-xs font-bold mt-1 underline"
                  >
                    Chuyển tới cổng Khách hàng (/login) →
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => vm.app.setPage("forgot-password")}
                className="auth-link text-xs font-semibold"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button type="submit" disabled={vm.isSubmitting} className="btn btn-primary btn-lg btn-full mt-2">
              {vm.isSubmitting
                ? "Đang xác thực..."
                : vm.isStaffPortal
                ? "Đăng nhập cổng Staff →"
                : "Đăng nhập hệ thống →"}
            </button>

            {!vm.isStaffPortal ? (
              <p className="text-center text-sm text-gray-500 mt-2">
                Chưa có tài khoản?{" "}
                <button type="button" onClick={() => vm.app.setPage("register")} className="auth-link">
                  Đăng ký ngay
                </button>
              </p>
            ) : (
              <p className="text-center text-sm text-gray-500 mt-2">
                Bạn là khách thuê đồ?{" "}
                <button type="button" onClick={() => vm.app.setPage("login")} className="auth-link">
                  Về trang đăng nhập khách
                </button>
              </p>
            )}
          </form>

          <QuickLoginPanel isStaffPortal={vm.isStaffPortal} onFill={vm.fillQuickAccount} />

          {!vm.isStaffPortal && (
            <div className="text-center mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => vm.app.setPage("staff-login")}
                className="text-xs font-semibold text-gray-500 hover:text-[var(--color-forest)] cursor-pointer"
              >
                Cổng nội bộ nhân viên (/staff/login) →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
