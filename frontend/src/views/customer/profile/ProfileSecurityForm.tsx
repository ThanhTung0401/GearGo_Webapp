import type { FormEvent } from "react";

interface ProfileSecurityFormProps {
  oldPassword: string;
  setOldPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  passwordError: string;
  passwordMsg: string;
  passwordSaving: boolean;
  onSubmit: (e: FormEvent) => Promise<void>;
}

/**
 * Form đổi mật khẩu tài khoản bảo mật cho khách hàng (UC1.12).
 */
export function ProfileSecurityForm({
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
  passwordMsg,
  passwordSaving,
  onSubmit,
}: ProfileSecurityFormProps) {
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="card-panel max-w-lg">
      <h2 className="font-display font-bold text-lg text-bark mb-2">Đổi mật khẩu tài khoản</h2>
      <p className="text-xs text-gray-500 mb-4">Mật khẩu mới cần dài tối thiểu 6 ký tự để bảo mật tài khoản thuê thiết bị.</p>

      <div className="form-group mb-3">
        <label className="form-label">Mật khẩu hiện tại *</label>
        <input
          required
          type="password"
          placeholder="••••••••"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-group mb-3">
        <label className="form-label">Mật khẩu mới *</label>
        <input
          required
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-group mb-4">
        <label className="form-label">Xác nhận mật khẩu mới *</label>
        <input
          required
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="form-input"
        />
      </div>

      {passwordError && (
        <div className="form-error-msg mb-3">{passwordError}</div>
      )}

      {/* Dùng .cp-alert-success thay cho .badge để tránh white-space: nowrap (unlayered trong surfaces.css) gây tràn form và viewport */}
      {passwordMsg && (
        <div className="cp-alert-success text-center font-bold">
          {passwordMsg}
        </div>
      )}

      <button type="submit" disabled={passwordSaving} className="btn btn-primary btn-md">
        {passwordSaving ? "Đang cập nhật..." : "Cập nhật mật khẩu mới"}
      </button>
    </form>
  );
}
