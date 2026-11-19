import type { FormEvent } from "react";
import Icon from "../../../../components/Icon";

interface ForgotStepInputProps {
  contact: string;
  setContact: (v: string) => void;
  err: string;
  clearErr: () => void;
  loading: boolean;
  onSubmit: (e: FormEvent) => Promise<void>;
  onBackToLogin: () => void;
}

/**
 * Bước 1 khôi phục mật khẩu: nhập email hoặc số điện thoại để nhận mã OTP (UC1.4).
 */
export function ForgotStepInput({
  contact,
  setContact,
  err,
  clearErr,
  loading,
  onSubmit,
  onBackToLogin,
}: ForgotStepInputProps) {
  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Icon name="arrow-up" size={26} />
          </div>
          <h1 className="auth-title">Khôi phục mật khẩu</h1>
          <p className="auth-subtitle">Nhập email hoặc số điện thoại để nhận mã xác minh OTP</p>
        </div>

        <div className="auth-card">
          <form onSubmit={(e) => void onSubmit(e)} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email hoặc số điện thoại *</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  clearErr();
                }}
                placeholder="VD: an.nguyen@gmail.com hoặc 0901234567"
                className={`form-input ${err ? "form-input-error" : ""}`}
              />
              {err && <div className="form-error-msg">{err}</div>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full mt-2">
              {loading ? "Đang gửi mã OTP..." : "Gửi mã OTP xác minh →"}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={onBackToLogin}
                className="auth-link text-sm"
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
