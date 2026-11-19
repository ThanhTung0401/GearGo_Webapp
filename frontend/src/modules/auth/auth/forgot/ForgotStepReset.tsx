import type { FormEvent } from "react";
import Icon from "../../../../components/Icon";

interface ForgotStepResetProps {
  contact: string;
  newPass: string;
  setNewPass: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  err: string;
  clearErr: () => void;
  loading: boolean;
  onSubmit: (e: FormEvent) => Promise<void>;
}

/**
 * Bước 3 khôi phục mật khẩu: nhập và xác nhận mật khẩu mới hai lần (UC1.4).
 */
export function ForgotStepReset({
  contact,
  newPass,
  setNewPass,
  confirm,
  setConfirm,
  err,
  clearErr,
  loading,
  onSubmit,
}: ForgotStepResetProps) {
  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Icon name="shield" size={26} />
          </div>
          <h1 className="auth-title">Đặt mật khẩu mới</h1>
          <p className="auth-subtitle">Xác minh thành công cho {contact}. Nhập mật khẩu mới an toàn.</p>
        </div>

        <div className="auth-card">
          <form onSubmit={(e) => void onSubmit(e)} className="auth-form">
            <div className="form-group">
              <label className="form-label">Mật khẩu mới *</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  clearErr();
                }}
                placeholder="Tối thiểu 6 ký tự"
                className={`form-input ${err ? "form-input-error" : ""}`}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu mới *</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clearErr();
                }}
                placeholder="Nhập lại mật khẩu mới"
                className={`form-input ${err ? "form-input-error" : ""}`}
              />
            </div>

            {err && <div className="form-error-msg">{err}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full mt-2">
              {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
