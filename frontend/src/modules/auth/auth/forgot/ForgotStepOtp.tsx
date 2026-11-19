import type { FormEvent } from "react";
import Icon from "../../../../components/Icon";

interface ForgotStepOtpProps {
  contact: string;
  otp: string;
  setOtp: (v: string) => void;
  err: string;
  clearErr: () => void;
  loading: boolean;
  onSubmit: (e: FormEvent) => Promise<void>;
  onResendOtp: () => Promise<void>;
  onChangeContact: () => void;
}

/**
 * Bước 2 khôi phục mật khẩu: nhập và xác minh mã OTP 6 chữ số (UC1.4 / UC15).
 */
export function ForgotStepOtp({
  contact,
  otp,
  setOtp,
  err,
  clearErr,
  loading,
  onSubmit,
  onResendOtp,
  onChangeContact,
}: ForgotStepOtpProps) {
  return (
    <div className="auth-page">
      <div className="auth-wrapper text-center">
        <div className="auth-card text-center">
          <div className="auth-icon-badge auth-icon-badge--moss">
            <Icon name="shield" size={26} />
          </div>
          <h2 className="auth-title">Nhập mã xác minh OTP</h2>
          <p className="auth-subtitle mb-4">
            Mã OTP gồm 6 chữ số đã được gửi đến <strong>{contact}</strong>.
          </p>
          <div className="policy-banner text-xs mb-4">
            💡 Mã thử nghiệm demo: <strong>123456</strong> (hoặc mã 6 số trong email gửi đến)
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="auth-form">
            <div className="form-group mb-4">
              <label className="form-label">Mã OTP (6 số)</label>
              <input
                autoFocus
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  clearErr();
                }}
                placeholder="123456"
                className={`form-input auth-otp-input ${err ? "form-input-error" : ""}`}
              />
              {err && <div className="form-error-msg">{err}</div>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full mb-3">
              {loading ? "Đang xác minh..." : "Xác minh mã OTP →"}
            </button>

            <div className="flex justify-between items-center text-xs text-gray-500">
              <button
                type="button"
                onClick={() => void onResendOtp()}
                className="auth-link text-xs"
              >
                Gửi lại mã OTP
              </button>
              <button
                type="button"
                onClick={onChangeContact}
                className="auth-link text-xs"
              >
                Đổi email / SĐT
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
